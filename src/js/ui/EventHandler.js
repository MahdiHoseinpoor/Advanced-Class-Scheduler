import DataParser from '../services/DataParser.js';
import ScheduleService from '../services/ScheduleService.js';
import { PRIORITIES } from '../constants.js';

export default class EventHandler {
    constructor(stateManager, uiManager) {
        this.state = stateManager;
        this.ui = uiManager;
        this.asPriorities = {}; 
    }

    bindEventListeners() {
        this.ui.dom.fileInput.addEventListener('change', this._handleFileSelect.bind(this));
        this.ui.dom.pasteBtn.addEventListener('click', this._handlePaste.bind(this));
        
        if(this.ui.dom.sidebarToggle) {
             this.ui.dom.sidebarToggle.addEventListener('click', () => this.ui.toggleSidebar());
        }

        this.ui.dom.newScheduleBtn.addEventListener('click', this._handleNewSchedule.bind(this));
        this.ui.dom.renameScheduleBtn.addEventListener('click', this._handleRenameSchedule.bind(this));
        this.ui.dom.deleteScheduleBtn.addEventListener('click', this._handleDeleteSchedule.bind(this));
        this.ui.dom.scheduleSelector.addEventListener('change', this._handleSwitchSchedule.bind(this));
        
        this.ui.dom.manualAddBtn.addEventListener('click', this._handleManualAdd.bind(this));
        
        this.ui.dom.tableBody.addEventListener('click', this._handleTableInteraction.bind(this));
        this.ui.dom.cardsContainer.addEventListener('click', this._handleTableInteraction.bind(this));
        
        this.ui.dom.selectedList.addEventListener('click', this._handleRemoveSelection.bind(this));
        
        this.ui.dom.genderSelector.addEventListener('change', this._handleGenderSelect.bind(this));
        this.ui.dom.viewCalendarBtn.addEventListener('click', () => this.ui.showVisualScheduleModal(this.state));
        
        document.querySelectorAll('.modal-backdrop').forEach(m => m.addEventListener('click', e => { 
            if (e.target === m) m.classList.remove('visible'); 
        }));
        document.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', () => {
            b.closest('.modal-backdrop').classList.remove('visible');
        }));

        this.ui.dom.searchInput.addEventListener('input', this._handleSearch.bind(this));

        if (this.ui.dom.autoSchedulerBtn) {
            this.ui.dom.autoSchedulerBtn.addEventListener('click', this._openAutoScheduler.bind(this));
        }

        this.ui.dom.asCourseList.addEventListener('click', this._handleASPriorityClick.bind(this));
        this.ui.dom.asGenerateBtn.addEventListener('click', this._handleGenerateSchedules.bind(this));
        
        if (this.ui.dom.asBackBtn) {
            this.ui.dom.asBackBtn.addEventListener('click', () => {
                this.ui.dom.asResultsView.classList.add('hidden');
                this.ui.dom.asSelectionView.classList.remove('hidden');
            });
        }

        // Professor Search Filter
        if (this.ui.dom.asProfSearch) {
            this.ui.dom.asProfSearch.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const items = this.ui.dom.asProfList.querySelectorAll('.prof-item');
                items.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    item.style.display = text.includes(term) ? 'flex' : 'none';
                });
            });
        }
    }

    _handleSearch(event) {
        this.state.filterClasses(event.target.value);
        this.ui.renderTableOnly(this.state);
    }

    _processData(dataText) {
        try {
            const parsedJson = JSON.parse(dataText);
            const classes = DataParser.parse(parsedJson);
            const removed = this.state.setAllClasses(classes);
            
            if (removed.length > 0) {
                alert(`بروزرسانی انجام شد. ${removed.length} کلاس از برنامه‌های قبلی حذف شدند.`);
            }
            
            this.ui.updateUI(this.state);
        } catch (error) {
            alert(`خطا: ${error.message}`);
        }
    }

    _handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        this.ui.dom.fileNameSpan.textContent = file.name;
        const reader = new FileReader();
        reader.onload = e => this._processData(e.target.result);
        reader.readAsText(file);
    }

    _handlePaste() {
        const text = this.ui.dom.pasteArea.value.trim();
        if (!text) return alert('متن خالی است');
        this._processData(text);
    }

    _handleNewSchedule() {
        const name = prompt(`نام برنامه:`, `برنامه ${Object.keys(this.state.schedules).length + 1}`);
        if (!name) return;
        this.state.createNewSchedule(name);
        this.ui.updateUI(this.state);
    }

    _handleRenameSchedule() {
        const schedule = this.state.getActiveSchedule();
        const newName = prompt('نام جدید:', schedule.name);
        if (newName) {
            this.state.renameActiveSchedule(newName);
            this.ui.updateUI(this.state);
        }
    }

    _handleDeleteSchedule() {
        if (confirm('آیا از حذف این برنامه مطمئن هستید؟')) {
            if (this.state.deleteActiveSchedule()) this.ui.updateUI(this.state);
            else alert('نمی‌توانید آخرین برنامه را حذف کنید.');
        }
    }
    
    _handleSwitchSchedule(event) {
        this.state.setActiveSchedule(event.target.value);
        this.ui.updateUI(this.state);
    }
    
    _handleGenderSelect(event) {
        this.state.setUserGender(event.target.value);
        this.ui.updateUI(this.state);
    }

    _handleManualAdd() {
        const id = this.ui.dom.manualAddInput.value.trim();
        if (id) {
            this._addSelection(id);
            this.ui.dom.manualAddInput.value = '';
            this.ui.updateUI(this.state);
        }
    }
    
    _handleTableInteraction(event) {
        const target = event.target.closest('tr, .card');
        if (!target || !target.dataset.id) return;
        
        const isCheckbox = event.target.type === 'checkbox';
        
        if (isCheckbox) {
             const classId = target.dataset.id;
             const isChecked = event.target.checked;
             if (isChecked) this._addSelection(classId);
             else this.state.removeClassFromActiveSchedule(classId);
             this.ui.updateUI(this.state);
             return;
        }
        
        if (target.classList.contains('disabled-row') || target.classList.contains('disabled')) {
            const cls = this.state.allClasses.find(c => c.id_group === target.dataset.id);
            const conflicts = ScheduleService.findConflicts(cls, this.state.getActiveSchedule().classes);
            if (conflicts.length) this.ui.showConflictModal(cls, conflicts);
        }
    }

    _handleRemoveSelection(event) {
        const btn = event.target.closest('.remove-icon-btn');
        if (btn) {
            this.state.removeClassFromActiveSchedule(btn.dataset.id);
            this.ui.updateUI(this.state);
        }
    }

    _addSelection(classId) {
        if (!this.state.userGender) return alert("لطفا ابتدا جنسیت خود را انتخاب کنید.");
        const cls = this.state.allClasses.find(c => c.id_group === classId);
        if (!cls) return alert("کد درس یافت نشد");
        
        if (!ScheduleService.isGenderCompatible(cls, this.state.userGender)) return alert("این درس با جنسیت شما سازگار نیست.");
        
        const conflicts = ScheduleService.findConflicts(cls, this.state.getActiveSchedule().classes);
        if (conflicts.length > 0) return this.ui.showConflictModal(cls, conflicts);
        
        this.state.addClassToActiveSchedule(classId);
    }

    _openAutoScheduler() {
        if (!this.state.allClasses.length) return alert("ابتدا فایل دروس را بارگذاری کنید.");
        if (!this.state.userGender) return alert("ابتدا جنسیت را مشخص کنید.");
        
        this.asPriorities = {};
        this.ui.initAutoSchedulerUI(this.state.allClasses, this.state.userGender);
    }

    _handleASPriorityClick(e) {
        if (e.target.classList.contains('p-pill')) {
            const row = e.target.closest('.course-row');
            const id = row.dataset.id;
            const newVal = e.target.dataset.val;

            row.querySelectorAll('.p-pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');

            this.asPriorities[id] = newVal;
            
            this._recalcASConflicts();
            this._recalcASUnits();
        }
    }

    _recalcASConflicts() {
        const mandatoryClasses = [];
        const otherClasses = [];

        this.state.allClasses.forEach(c => {
            const pri = this.asPriorities[c.id_group] || PRIORITIES.LOW;
            if (pri === PRIORITIES.MANDATORY) mandatoryClasses.push(c);
            else if (pri !== PRIORITIES.EXCLUDE) otherClasses.push(c);
        });

        const conflictIds = ScheduleService.checkUIConflicts(mandatoryClasses, otherClasses);
        this.ui.markASConflicts(conflictIds);
    }

    _recalcASUnits() {
        let total = 0;
        this.state.allClasses.forEach(c => {
            const pri = this.asPriorities[c.id_group] || PRIORITIES.LOW;
            if (pri === PRIORITIES.MANDATORY) total += c.units.total;
        });
        this.ui.updateUnitTracker(total);
    }

    _handleGenerateSchedules() {
        const minUnits = parseInt(this.ui.dom.asMinUnits.value) || 0;
        const maxUnits = parseInt(this.ui.dom.asMaxUnits.value) || 24;
        
        const timePreferences = {};
        this.ui.dom.asTimePrefs.querySelectorAll('.time-pref-row').forEach(row => {
            const day = row.dataset.day;
            const am = row.querySelector('input[value="am"]').checked;
            const pm = row.querySelector('input[value="pm"]').checked;
            timePreferences[day] = { am, pm };
        });

        const favoriteProfessors = [];
        this.ui.dom.asProfList.querySelectorAll('input:checked').forEach(cb => {
            favoriteProfessors.push(cb.value);
        });

        this.ui.dom.asGenerateBtn.textContent = 'در حال پردازش...';
        
        setTimeout(() => {
            try {
                const results = ScheduleService.generateSchedules(this.state.allClasses, {
                    priorities: this.asPriorities,
                    minUnits, 
                    maxUnits, 
                    timePreferences,
                    favoriteProfessors, 
                    userGender: this.state.userGender
                });
                
                this.ui.renderAutoScheduleResults(results, (res) => {
                    const name = res.type === 'compact' ? 'فشرده' : (res.type === 'preferred' ? 'محبوب' : 'متوازن');
                    this.state.createNewSchedule(`هوشمند (${name})`);
                    res.classes.forEach(c => this.state.addClassToActiveSchedule(c.id_group));
                    
                    document.getElementById('auto-scheduler-modal').classList.remove('visible');
                    this.ui.updateUI(this.state);
                });
            } catch (err) {
                alert(err.message);
            } finally {
                this.ui.dom.asGenerateBtn.textContent = 'شروع پردازش';
            }
        }, 50);
    }
}