import DataParser from '../services/DataParser.js';
import ScheduleService from '../services/ScheduleService.js';

export default class EventHandler {
    constructor(stateManager, uiManager) {
        this.state = stateManager;
        this.ui = uiManager;
    }

    bindEventListeners() {
        this.ui.dom.fileInput.addEventListener('change', this._handleFileSelect.bind(this));
        this.ui.dom.pasteBtn.addEventListener('click', this._handlePaste.bind(this));
        this.ui.dom.newScheduleBtn.addEventListener('click', this._handleNewSchedule.bind(this));
        this.ui.dom.renameScheduleBtn.addEventListener('click', this._handleRenameSchedule.bind(this));
        this.ui.dom.deleteScheduleBtn.addEventListener('click', this._handleDeleteSchedule.bind(this));
        this.ui.dom.scheduleSelector.addEventListener('change', this._handleSwitchSchedule.bind(this));
        this.ui.dom.manualAddBtn.addEventListener('click', this._handleManualAdd.bind(this));
        this.ui.dom.tableBody.addEventListener('click', this._handleTableInteraction.bind(this));
        this.ui.dom.selectedList.addEventListener('click', this._handleRemoveSelection.bind(this));
        this.ui.dom.genderSelector.addEventListener('change', this._handleGenderSelect.bind(this));
        this.ui.dom.viewCalendarBtn.addEventListener('click', () => this.ui.showVisualScheduleModal(this.state));
        document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('visible'); }));
        document.querySelectorAll('.modal-close-btn').forEach(b => b.addEventListener('click', () => b.closest('.modal-overlay').classList.remove('visible')));
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab).classList.add('active');
            });
        });

        this.ui.dom.searchInput.addEventListener('input', this._handleSearch.bind(this));
    }

    _handleSearch(event) {
        const searchTerm = event.target.value;
        this.state.filterClasses(searchTerm);
        this.ui.renderTableOnly(this.state);
    }

    _processData(dataText) {
        try {
            const parsedJson = JSON.parse(dataText);
            const classes = DataParser.parse(parsedJson);
            const removedClassesInfo = this.state.setAllClasses(classes);
            if (removedClassesInfo.length > 0) {
                let alertMessage = 'برنامه‌های شما با داده‌های جدید به‌روزرسانی شد. کلاس‌های زیر به صورت خودکار حذف شدند:\n\n';
                removedClassesInfo.forEach(info => {
                    alertMessage += `• ${info.name} (${info.id_group}) از برنامه «${info.scheduleName}» چون ${info.reason}\n`;
                });
                alert(alertMessage);
            }
            
            this.ui.updateUI(this.state);
        } catch (error) {
            alert(`خطا در پردازش داده‌ها: ${error.message}`);
            console.error("Error during data processing:", error);
        }
    }

    _handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        this.ui.dom.fileNameSpan.textContent = `فایل: ${file.name}`;
        const reader = new FileReader();
        reader.onload = e => this._processData(e.target.result);
        reader.readAsText(file);
    }

    _handlePaste() {
        const text = this.ui.dom.pasteArea.value.trim();
        if (!text) {
            alert('لطفاً محتوای پاسخ را در کادر متنی بچسبانید.');
            return;
        }
        this._processData(text);
    }

    _handleNewSchedule() {
        const name = prompt(`یک نام برای برنامه جدید وارد کنید:`, `برنامه ${Object.keys(this.state.schedules).length + 1}`);
        if (!name) return;
        this.state.createNewSchedule(name);
        this.ui.updateUI(this.state);
    }

    _handleRenameSchedule() {
        const schedule = this.state.getActiveSchedule();
        if (!schedule) return;
        const newName = prompt('نام جدید برنامه را وارد کنید:', schedule.name);
        if (newName) {
            this.state.renameActiveSchedule(newName);
            this.ui.updateUI(this.state);
        }
    }

    _handleDeleteSchedule() {
        const schedule = this.state.getActiveSchedule();
        if (!schedule) return;
        if (confirm(`آیا از حذف برنامه «${schedule.name}» مطمئن هستید؟`)) {
            if (this.state.deleteActiveSchedule()) {
                this.ui.updateUI(this.state);
            } else {
                alert('امکان حذف آخرین برنامه وجود ندارد.');
            }
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
        if (!id || !this.state.activeScheduleId) return;

        this._addSelection(id);
        this.ui.dom.manualAddInput.value = '';
        this.ui.updateUI(this.state);
    }
    
    _handleTableInteraction(event) {
        const row = event.target.closest('tr');
        if (!row || !row.dataset.id) return;

        const classId = row.dataset.id;
        const classToCheck = this.state.allClasses.find(c => c.id_group === classId);
        if (!classToCheck) return;

        const activeSchedule = this.state.getActiveSchedule();
        const isSelected = activeSchedule.classes.some(sc => sc.id_group === classId);

        const isGenderInvalid = !ScheduleService.isGenderCompatible(classToCheck, this.state.userGender);
        const conflicts = ScheduleService.findConflicts(classToCheck, activeSchedule.classes);
        const hasConflict = !isSelected && conflicts.length > 0;
        const isDisabled = isGenderInvalid || hasConflict;

        if (isDisabled) {
            if (isGenderInvalid) {
                alert("امکان انتخاب این کلاس به دلیل محدودیت جنسیتی وجود ندارد.");
            } else if (hasConflict) {
                this.ui.showConflictModal(classToCheck, conflicts);
            }
        } else {
            if (isSelected) {
                this.state.removeClassFromActiveSchedule(classId);
            } else {
                this.state.addClassToActiveSchedule(classId);
            }
            this.ui.updateUI(this.state);
        }
    }

    _handleRemoveSelection(event) {
        if (event.target.classList.contains('remove-btn')) {
            this.state.removeClassFromActiveSchedule(event.target.dataset.id);
            this.ui.updateUI(this.state);
        }
    }

    _addSelection(classId) {
        if (!this.state.userGender) {
            alert("لطفاً ابتدا جنسیت خود را انتخاب کنید.");
            return;
        }
        if (this.state.allClasses.length === 0) {
            alert("لطفا ابتدا فایل داده های دروس را بارگذاری کنید.");
            return;
        }

        const classToAdd = this.state.allClasses.find(c => c.id_group === classId);
        if (!classToAdd) {
            alert("کلاسی با این کد یافت نشد.");
            return;
        }
        
        if (!ScheduleService.isGenderCompatible(classToAdd, this.state.userGender)) {
            alert("امکان افزودن این کلاس به دلیل محدودیت جنسیتی وجود ندارد.");
            return;
        }
        
        const conflicts = ScheduleService.findConflicts(classToAdd, this.state.getActiveSchedule().classes);
        if (conflicts.length > 0) {
            this.ui.showConflictModal(classToAdd, conflicts);
            return;
        }
        
        this.state.addClassToActiveSchedule(classId);
    }
}