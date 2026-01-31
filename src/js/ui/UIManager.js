import ScheduleService from '../services/ScheduleService.js';
import { CLASS_COLORS, PRIORITIES, ICONS } from '../constants.js';

export default class UIManager {
    constructor() {
        this.dom = {
            searchInput: document.getElementById('search-input'),
            tableBody: document.getElementById('classes-tbody'),
            cardsContainer: document.getElementById('mobile-cards-container'),
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
            
            autoSchedulerBtn: document.getElementById('auto-scheduler-btn'),
            asModal: document.getElementById('auto-scheduler-modal'),
            asSelectionView: document.getElementById('as-selection-view'),
            asResultsView: document.getElementById('as-results-view'),
            asCourseList: document.getElementById('as-course-list'),
            asTimePrefs: document.getElementById('as-time-prefs'),
            asProfList: document.getElementById('as-prof-list'), // New
            asProfSearch: document.getElementById('as-prof-search'), // New
            asGenerateBtn: document.getElementById('as-generate-btn'),
            asResultsContainer: document.getElementById('as-results-container'),
            asBackBtn: document.getElementById('as-back-btn'),
            asMinUnits: document.getElementById('as-min-units'),
            asMaxUnits: document.getElementById('as-max-units'),
            asCurrentUnits: document.getElementById('as-current-units'),
            
            sidebar: document.querySelector('.sidebar'),
            sidebarToggle: document.getElementById('sidebar-toggle'),
        };
        
        this.initIcons();
    }
    
    initIcons() {
        document.querySelectorAll('[data-icon]').forEach(el => {
            el.innerHTML = ICONS[el.dataset.icon] + (el.innerText ? ` <span>${el.innerText}</span>` : '');
        });
    }

    toggleSidebar() {
        this.dom.sidebar.classList.toggle('open');
    }

    updateUI(state) {
        if (state.userGender) {
            const inp = this.dom.genderSelector.querySelector(`input[value="${state.userGender}"]`);
            if (inp) inp.checked = true;
        }

        this.dom.scheduleSelector.innerHTML = '';
        Object.values(state.schedules).forEach(sch => {
            this.dom.scheduleSelector.add(new Option(sch.name, sch.id, false, sch.id === state.activeScheduleId));
        });

        const activeSchedule = state.getActiveSchedule();
        if (activeSchedule) {
            this._renderSelectedClasses(activeSchedule);
            this._renderClassesTable(state);
        }
    }
    
    renderTableOnly(state) {
        this._renderClassesTable(state);
    }

    _renderSelectedClasses(schedule) {
        const total = schedule.classes.reduce((sum, cls) => sum + cls.units.total, 0);
        this.dom.totalUnitsSpan.textContent = `${total} واحد`;
        this.dom.selectedList.innerHTML = '';
        
        schedule.classes.forEach(cls => {
            const li = document.createElement('div');
            li.className = 'selected-item';
            const warningIcon = cls.hasScheduleOverride ? `<span class="badge-warn" style="margin-left:5px" title="Auto-corrected">${ICONS.alert}</span>` : '';
            
            li.innerHTML = `
                <div>
                    <div style="font-weight:600">${cls.name} ${warningIcon}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary)">${cls.id_group}</div>
                </div>
                <button class="remove-icon-btn" data-id="${cls.id_group}">${ICONS.close}</button>
            `;
            this.dom.selectedList.appendChild(li);
        });
    }

    _renderClassesTable(state) {
        this.dom.tableBody.innerHTML = '';
        this.dom.cardsContainer.innerHTML = '';
        const activeSchedule = state.getActiveSchedule();
        
        if (!state.filteredClasses.length) {
            const msg = state.allClasses.length ? 'موردی یافت نشد' : 'داده‌ای بارگذاری نشده است';
            this.dom.tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-secondary)">${msg}</td></tr>`;
            this.dom.cardsContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-secondary)">${msg}</div>`;
            return;
        }
        
        const fragmentTr = document.createDocumentFragment();
        const fragmentCards = document.createDocumentFragment();

        state.filteredClasses.forEach(cls => {
            const isSelected = activeSchedule.classes.some(sc => sc.id_group === cls.id_group);
            const isGenderInvalid = !ScheduleService.isGenderCompatible(cls, state.userGender);
            const conflicts = !isSelected ? ScheduleService.findConflicts(cls, activeSchedule.classes) : [];
            const isDisabled = !isSelected && (conflicts.length > 0 || isGenderInvalid);

            const times = cls.schedule.class_times.map(t => `<span class="status-badge badge-time">${t.day} ${t.start_time}-${t.end_time}</span>`).join(' ') || '—';
            const exam = cls.schedule.exam ? `${cls.schedule.exam.date} ${cls.schedule.exam.start_time}` : '—';
            const badge = cls.hasScheduleOverride ? `<span class="status-badge badge-warn">${ICONS.magic} اصلاح شده</span>` : '';

            const tr = document.createElement('tr');
            if (isDisabled) tr.style.opacity = '0.5';
            tr.dataset.id = cls.id_group;
            tr.innerHTML = `
                <td><input type="checkbox" ${isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''} style="accent-color:var(--primary)"></td>
                <td style="font-family:monospace">${cls.id_group}</td>
                <td>
                    <div style="font-weight:500">${cls.name}</div>
                    ${badge}
                </td>
                <td>${cls.professor || '—'}</td>
                <td>${times}</td>
                <td>${exam}</td>
            `;
            fragmentTr.appendChild(tr);

            const card = document.createElement('div');
            card.className = `card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`;
            card.dataset.id = cls.id_group;
            card.innerHTML = `
                <div class="card-header">
                    <span>${cls.name}</span>
                    <input type="checkbox" ${isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''} style="transform:scale(1.2); accent-color:var(--primary)">
                </div>
                <div style="margin-bottom:0.5rem">
                     ${badge} <span style="font-family:monospace; font-size:0.8rem; background:#eee; padding:2px 4px; border-radius:4px">${cls.id_group}</span>
                </div>
                <div class="card-detail">${ICONS.search} <span style="margin-right:5px">${cls.professor || 'نامشخص'}</span></div>
                <div class="card-detail">${ICONS.calendar} <span style="margin-right:5px; line-height:1.6">${times.replace(/<[^>]*>/g, ' ')}</span></div>
                ${cls.hasScheduleOverride ? `<div style="font-size:0.75rem; color:var(--warning); margin-top:5px; background:rgba(255,149,0,0.1); padding:5px; border-radius:4px;">${cls.description}</div>` : ''}
            `;
            fragmentCards.appendChild(card);
        });

        this.dom.tableBody.appendChild(fragmentTr);
        this.dom.cardsContainer.appendChild(fragmentCards);
    }

    showConflictModal(cls, conflicts) {
        this.dom.conflictDetails.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:1rem; color:var(--danger)">
                ${ICONS.alert} <strong>تداخل زمانی شناسایی شد</strong>
            </div>
            <p>درس <strong>${cls.name}</strong> با موارد زیر تداخل دارد:</p>
            <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:0.5rem">
                ${conflicts.map(c => `
                    <li style="background:var(--background); padding:10px; border-radius:8px; border-right:3px solid var(--danger)">
                        <strong>${c.conflictingClass.name}</strong>
                        <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px">${c.reason}</div>
                    </li>
                `).join('')}
            </ul>`;
        this.dom.conflictModal.classList.add('visible');
    }

    showVisualScheduleModal(state) {
        const schedule = state.getActiveSchedule();
        if (!schedule) return;
        
        const DAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
        let html = '<div class="week-grid">';
        
        html += '<div style="display:flex; flex-direction:column; margin-top:40px">'; 
        for (let h = 7; h <= 20; h++) html += `<div class="grid-time-label">${h}:00</div>`;
        html += '</div>';

        DAYS.forEach(day => {
            html += `<div class="grid-day-col"><div class="grid-day-header">${day}</div>`;
            for (let h = 7; h < 20; h++) html += '<div class="grid-hour-line"></div>';
            
            schedule.classes.forEach((cls, i) => {
                const color = CLASS_COLORS[i % CLASS_COLORS.length];
                cls.schedule.class_times.forEach(t => {
                    if (t.day === day) {
                        const startM = ScheduleService.timeToMinutes(t.start_time);
                        const endM = ScheduleService.timeToMinutes(t.end_time);
                        const top = (startM - 420) + 40; 
                        const height = endM - startM;
                        
                        if (height > 0) {
                            html += `
                            <div class="class-entry" style="top:${top}px; height:${height}px; background:${color}; border-left: 4px solid rgba(0,0,0,0.2)">
                                <strong>${cls.name}</strong>
                                <div style="font-size:0.65rem; opacity:0.9">${t.start_time} - ${t.end_time}</div>
                            </div>`;
                        }
                    }
                });
            });
            html += '</div>';
        });
        html += '</div>';
        
        this.dom.visualScheduleContainer.innerHTML = html;
        this.dom.visualScheduleModal.classList.add('visible');
    }

    initAutoSchedulerUI(classes, gender) {
        if (!this.dom.asSelectionView || !this.dom.asResultsView) {
            console.error("Critical: DOM elements for AutoScheduler not found. Update index.html.");
            return;
        }

        // Reset Views
        this.dom.asSelectionView.classList.remove('hidden');
        this.dom.asResultsView.classList.add('hidden');
        
        // --- Time Prefs ---
        const timePrefsHtml = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه'].map(d => `
            <div class="time-pref-row" data-day="${d}">
                <div class="day-name">${d}</div>
                <label class="time-toggle"><input type="checkbox" value="am" checked> صبح</label>
                <label class="time-toggle"><input type="checkbox" value="pm" checked> عصر</label>
            </div>
        `).join('');
        this.dom.asTimePrefs.innerHTML = timePrefsHtml;

        const sorted = [...classes].sort((a, b) => a.name.localeCompare(b.name));
        const filtered = sorted.filter(c => ScheduleService.isGenderCompatible(c, gender));
        
        // --- Course List ---
        this.dom.asCourseList.innerHTML = filtered.map(c => {
            const times = c.schedule.class_times.map(t => `${t.day} ${t.start_time}`).join('، ');
            return `
            <div class="course-row" data-id="${c.id_group}" data-units="${c.units.total}">
                <div style="flex:1">
                    <div style="font-weight:600">${c.name}</div>
                    <div style="font-size:0.75rem; color:var(--text-secondary)">${c.professor} | ${times}</div>
                </div>
                <div class="priority-pills">
                    <button class="p-pill p-exclude" data-val="${PRIORITIES.EXCLUDE}" title="حذف">X</button>
                    <button class="p-pill p-low active" data-val="${PRIORITIES.LOW}" title="اولویت پایین">کم</button>
                    <button class="p-pill p-pref" data-val="${PRIORITIES.PREFERRED}" title="علاقه‌مند">زیاد</button>
                    <button class="p-pill p-mand" data-val="${PRIORITIES.MANDATORY}" title="الزامی">الزامی</button>
                </div>
                <div class="conflict-overlay">تداخل</div>
            </div>`;
        }).join('');

        // --- Professor List ---
        const uniqueProfs = [...new Set(filtered.map(c => c.professor).filter(p => p && p !== 'نامشخص'))].sort();
        this.dom.asProfList.innerHTML = uniqueProfs.map(p => `
            <label class="prof-item">
                <input type="checkbox" value="${p}" style="accent-color:var(--primary)">
                <span>${p}</span>
            </label>
        `).join('');

        this.updateUnitTracker(0);
        this.dom.asModal.classList.add('visible');
    }

    updateUnitTracker(count) {
        const max = parseInt(this.dom.asMaxUnits.value) || 20;
        this.dom.asCurrentUnits.textContent = `مجموع واحد انتخاب شده: ${count}`;
        this.dom.asCurrentUnits.style.color = count > max ? 'var(--danger)' : 'var(--text-secondary)';
    }

    markASConflicts(conflictIds) {
        this.dom.asCourseList.querySelectorAll('.course-row').forEach(row => {
            const id = row.dataset.id;
            const isConflict = conflictIds.has(id);
            if (isConflict) {
                row.classList.add('has-conflict');
                const mandBtn = row.querySelector(`.p-pill[data-val="${PRIORITIES.MANDATORY}"]`);
                if (mandBtn) mandBtn.disabled = true;
            } else {
                row.classList.remove('has-conflict');
                const mandBtn = row.querySelector(`.p-pill[data-val="${PRIORITIES.MANDATORY}"]`);
                if (mandBtn) mandBtn.disabled = false;
            }
        });
    }

    renderAutoScheduleResults(results, onSelect) {
        this.dom.asResultsContainer.innerHTML = '';
        
        const renderSection = (title, items) => {
            if (!items || items.length === 0) return '';
            return `
                <h4 style="grid-column:1/-1; margin:1rem 0 0.5rem 0; color:var(--primary); border-bottom:1px solid var(--border); padding-bottom:5px">${title}</h4>
                ${items.map((res, i) => `
                    <div class="result-item" data-idx="${i}">
                        <div class="score-badge">امتیاز: ${res.score.toFixed(0)}</div>
                        <h5 style="margin:0 0 10px 0;">برنامه ${i + 1}</h5>
                        <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:5px">${res.totalUnits} واحد</div>
                        <ul style="padding-right:15px; margin:0; font-size:0.8rem; color:var(--text-primary); max-height:100px; overflow-y:auto">
                            ${res.classes.map(c => `<li>${c.name}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            `;
        };

        let html = '';
        if (results.balanced.length === 0 && results.compact.length === 0 && results.preferred.length === 0) {
            html = '<div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-secondary)">نتیجه‌ای یافت نشد. لطفاً محدودیت‌ها را تغییر دهید.</div>';
        } else {
            html += renderSection('پیشنهاد متوازن', results.balanced);
            html += renderSection('برنامه فشرده (Compact)', results.compact);
            html += renderSection('اساتید محبوب', results.preferred);
        }

        this.dom.asResultsContainer.innerHTML = html;
        
        this.dom.asResultsContainer.querySelectorAll('.result-item').forEach(el => {
            el.addEventListener('click', () => {
                const sectionTitle = el.previousElementSibling?.tagName === 'H4' ? el.previousElementSibling.innerText : '';
                const idx = parseInt(el.dataset.idx);
                let selectedRes;
                if (sectionTitle.includes('فشرده')) selectedRes = results.compact[idx];
                else if (sectionTitle.includes('محبوب')) selectedRes = results.preferred[idx];
                else selectedRes = results.balanced[idx];
                
                if (selectedRes) onSelect(selectedRes);
            });
        });

        // Switch View
        this.dom.asSelectionView.classList.add('hidden');
        this.dom.asResultsView.classList.remove('hidden');
    }
}