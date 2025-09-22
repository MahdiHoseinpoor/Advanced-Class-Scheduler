import ScheduleService from '../services/ScheduleService.js';
import { HOUR_HEIGHT, CLASS_COLORS } from '../constants.js';

export default class UIManager {
    constructor() {
        this.dom = {
            searchInput: document.getElementById('search-input'),
            tableBody: document.getElementById('classes-tbody'),
            fileInput: document.getElementById('file-input'),
            fileNameSpan: document.getElementById('file-name'),
            pasteArea: document.getElementById('paste-area'),
            pasteBtn: document.getElementById('paste-btn'),
            selectedList: document.getElementById('selected-classes-list'),
            manualAddInput: document.getElementById('manual-add-input'),
            manualAddBtn: document.getElementById('manual-add-btn'),
            totalUnitsSpan: document.getElementById('total-units'),
            scheduleSelector: document.getElementById('schedule-selector'),
            newScheduleBtn: document.getElementById('new-schedule-btn'),
            renameScheduleBtn: document.getElementById('rename-schedule-btn'),
            deleteScheduleBtn: document.getElementById('delete-schedule-btn'),
            viewCalendarBtn: document.getElementById('view-calendar-btn'),
            genderSelector: document.getElementById('gender-selector'),
            conflictModal: document.getElementById('conflict-modal'),
            conflictDetails: document.getElementById('conflict-details'),
            visualScheduleModal: document.getElementById('visual-schedule-modal'),
            visualScheduleContainer: document.getElementById('visual-schedule-container'),
        };
    }
    
    updateUI(stateManager) {
        this._renderGenderSelector(stateManager.userGender);
        this._renderScheduleSelector(stateManager.schedules, stateManager.activeScheduleId);
        const activeSchedule = stateManager.getActiveSchedule();
        if (activeSchedule) {
            this._renderSelectedClasses(activeSchedule);
            // We now pass the entire stateManager to the render function
            this._renderClassesTable(stateManager);
        } else {
             this.dom.selectedList.innerHTML = '<p class="placeholder">یک برنامه را انتخاب کنید.</p>';
             this.dom.totalUnitsSpan.textContent = '';
             this.dom.tableBody.innerHTML = `<tr><td colspan="6" class="placeholder">برای شروع یک برنامه ایجاد کنید.</td></tr>`;
        }
    }
    
    renderTableOnly(stateManager) {
        this._renderClassesTable(stateManager);
    }

    _renderGenderSelector(userGender) {
        if (userGender) {
            const genderInput = this.dom.genderSelector.querySelector(`input[value="${userGender}"]`);
            if (genderInput) genderInput.checked = true;
        }
    }

    _renderScheduleSelector(schedules, activeScheduleId) {
        this.dom.scheduleSelector.innerHTML = '';
        for (const id in schedules) {
            const schedule = schedules[id];
            const option = new Option(schedule.name, id, false, id === activeScheduleId);
            this.dom.scheduleSelector.add(option);
        }
    }

    _renderSelectedClasses(schedule) {
        const total = schedule.classes.reduce((sum, cls) => sum + cls.units.total, 0);
        this.dom.totalUnitsSpan.textContent = `(مجموع واحدها: ${total})`;
        this.dom.selectedList.innerHTML = '';
        if (schedule.classes.length === 0) {
            this.dom.selectedList.innerHTML = '<p class="placeholder">کلاسی به این برنامه اضافه نشده است.</p>';
            return;
        }
        schedule.classes.forEach(cls => {
            const li = document.createElement('li');
            li.innerHTML = `<span><strong>${cls.name}</strong> (${cls.id_group})</span><button class="remove-btn" data-id="${cls.id_group}">حذف</button>`;
            this.dom.selectedList.appendChild(li);
        });
    }

    _renderClassesTable(stateManager) {
        this.dom.tableBody.innerHTML = '';
        const activeSchedule = stateManager.getActiveSchedule();

        if (stateManager.filteredClasses.length === 0) {
            const message = stateManager.allClasses.length > 0 ? 'کلاسی با این مشخصات یافت نشد.' : 'لطفاً یک فایل داده بارگذاری کنید.';
            this.dom.tableBody.innerHTML = `<tr><td colspan="6" class="placeholder">${message}</td></tr>`;
            return;
        }
        
        const fragment = document.createDocumentFragment();
        stateManager.filteredClasses.forEach(cls => {
            const isSelected = activeSchedule.classes.some(sc => sc.id_group === cls.id_group);
            const isGenderInvalid = !ScheduleService.isGenderCompatible(cls, stateManager.userGender);
            const hasConflict = !isSelected && ScheduleService.findConflicts(cls, activeSchedule.classes).length > 0;
            const isDisabled = !isSelected && (hasConflict || isGenderInvalid);

            const row = document.createElement('tr');
            row.dataset.id = cls.id_group;
            if (isDisabled) {
                row.classList.add('disabled-row');
                row.title = isGenderInvalid ? "محدودیت جنسیتی" : "تداخل زمانی";
            }
            const classTimes = cls.schedule.class_times.map(t => `${t.day} ${t.start_time}-${t.end_time}`).join('<br>') || '—';
            const examTime = cls.schedule.exam ? `${cls.schedule.exam.date} ساعت ${cls.schedule.exam.start_time}-${cls.schedule.exam.end_time}` : '—';
            
            row.innerHTML = `
                <td><input type="checkbox" data-id="${cls.id_group}" ${isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}></td>
                <td>${cls.id_group}</td><td>${cls.name}</td><td>${cls.professor || '—'}</td>
                <td>${classTimes}</td><td>${examTime}</td>
            `;
            fragment.appendChild(row);
        });
        this.dom.tableBody.appendChild(fragment);
    }
    showConflictModal(classInQuestion, conflicts) {
        let detailsHtml = `<p>درس <strong>${classInQuestion.name} (${classInQuestion.id_group})</strong> با موارد زیر تداخل دارد:</p><ul>`;
        conflicts.forEach(conflict => {
            detailsHtml += `<li><strong>${conflict.conflictingClass.name} (${conflict.conflictingClass.id_group})</strong><br><small>${conflict.reason}</small></li>`;
        });
        detailsHtml += '</ul>';
        this.dom.conflictDetails.innerHTML = detailsHtml;
        this.dom.conflictModal.classList.add('visible');
    }

    renderVisualCalendar(schedule) {
        const GRID_START_HOUR = 7, GRID_END_HOUR = 21, DAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
        let html = '<div class="time-labels">';
        for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) html += `<div class="time-label">${h}:00</div>`;
        html += '</div><div class="schedule-grid">';
        DAYS.forEach(day => {
            html += `<div class="day-column"><div class="day-header">${day}</div>`;
            for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) html += '<div class="hour-slot"></div>';
            html += '</div>';
        });
        html += '</div>';
        this.dom.visualScheduleContainer.innerHTML = html;
        const dayColumns = this.dom.visualScheduleContainer.querySelectorAll('.day-column');
        const timeToMinutes = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        
        schedule.classes.forEach((cls, i) => {
            const color = CLASS_COLORS[i % CLASS_COLORS.length];
            cls.schedule.class_times.forEach(time => {
                const dayIndex = DAYS.indexOf(time.day); if (dayIndex === -1) return;
                const startM = timeToMinutes(time.start_time), endM = timeToMinutes(time.end_time);
                const top = (startM - GRID_START_HOUR * 60) * (HOUR_HEIGHT / 60);
                const height = (endM - startM) * (HOUR_HEIGHT / 60);
                if (top < 0 || height <= 0) return;
                const block = document.createElement('div');
                block.className = 'class-block';
                Object.assign(block.style, { top: `${top}px`, height: `${height}px`, backgroundColor: color, borderColor: `color-mix(in srgb, ${color} 80%, black)` });
                block.innerHTML = `<strong>${cls.name}</strong>${time.start_time} - ${time.end_time}`;
                dayColumns[dayIndex].appendChild(block);
            });
        });
    }

    showVisualScheduleModal(stateManager) {
        const activeSchedule = stateManager.getActiveSchedule();
        if (activeSchedule) {
            this.renderVisualCalendar(activeSchedule);
            this.dom.visualScheduleModal.classList.add('visible');
        } else {
            alert("لطفاً ابتدا یک برنامه ایجاد یا انتخاب کنید.");
        }
    }
}