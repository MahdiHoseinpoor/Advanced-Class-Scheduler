// --- Application State ---
const appState = {
    allClasses: [],
    schedules: {},
    activeScheduleId: null,
    filteredClasses: [],
    classColors: {},
    userGender: null // 'male', 'female', or null
};
const CLASS_COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
const HOUR_HEIGHT = 60;

// --- DOM References ---
const fileInput = document.getElementById('file-input');
const fileNameSpan = document.getElementById('file-name');
const selectedList = document.getElementById('selected-classes-list');
const manualAddInput = document.getElementById('manual-add-input');
const manualAddBtn = document.getElementById('manual-add-btn');
const searchInput = document.getElementById('search-input');
const tableBody = document.getElementById('classes-tbody');
const totalUnitsSpan = document.getElementById('total-units');
const scheduleSelector = document.getElementById('schedule-selector');
const newScheduleBtn = document.getElementById('new-schedule-btn');
const renameScheduleBtn = document.getElementById('rename-schedule-btn');
const deleteScheduleBtn = document.getElementById('delete-schedule-btn');
const viewCalendarBtn = document.getElementById('view-calendar-btn');
const genderSelector = document.getElementById('gender-selector');
const pasteArea = document.getElementById('paste-area');
const pasteBtn = document.getElementById('paste-btn');

// Modal References
const conflictModal = document.getElementById('conflict-modal');
const conflictDetails = document.getElementById('conflict-details');
const visualScheduleModal = document.getElementById('visual-schedule-modal');
const visualScheduleContainer = document.getElementById('visual-schedule-container');

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', initializeApp);
fileInput.addEventListener('change', handleFileSelect);
pasteBtn.addEventListener('click', handlePaste);
manualAddBtn.addEventListener('click', handleManualAdd);
searchInput.addEventListener('input', handleSearch);
tableBody.addEventListener('click', handleTableInteraction);
selectedList.addEventListener('click', handleRemoveSelection);
scheduleSelector.addEventListener('change', handleSwitchSchedule);
newScheduleBtn.addEventListener('click', handleNewSchedule);
renameScheduleBtn.addEventListener('click', handleRenameSchedule);
deleteScheduleBtn.addEventListener('click', handleDeleteSchedule);
viewCalendarBtn.addEventListener('click', showVisualScheduleModal);
genderSelector.addEventListener('change', handleGenderSelect);

document.querySelectorAll('.modal-overlay').forEach(modal => modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('visible'); }));
document.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.remove('visible')));
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// --- Initialization ---
function initializeApp() {
    if (Object.keys(appState.schedules).length === 0) {
        const id = `schedule-${Date.now()}`;
        appState.schedules[id] = { id, name: 'برنامه ۱', classes: [] };
        appState.activeScheduleId = id;
    }
    updateUI();
}

// --- Data Loading ---
function processData(dataText) {
    try {
        const parsedJson = JSON.parse(dataText);
        appState.allClasses = parseClassData(parsedJson);
        appState.filteredClasses = [...appState.allClasses];
        updateUI();
    } catch (error) {
        alert(`خطا در پردازش داده‌ها: ${error.message}`);
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    fileNameSpan.textContent = `فایل: ${file.name}`;
    const reader = new FileReader();
    reader.onload = e => processData(e.target.result);
    reader.readAsText(file);
}

function handlePaste() {
    const text = pasteArea.value.trim();
    if (!text) {
        alert('لطفاً محتوای پاسخ را در کادر متنی بچسبانید.');
        return;
    }
    processData(text);
}

// --- Event Handlers & Core Logic ---
function handleManualAdd() {
    const id = manualAddInput.value.trim();
    if (!id || !appState.activeScheduleId) return;
    addSelection(id, true);
    manualAddInput.value = '';
}

function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    appState.filteredClasses = !searchTerm
        ? [...appState.allClasses]
        : appState.allClasses.filter(cls =>
            cls.name.toLowerCase().includes(searchTerm) ||
            cls.professor.toLowerCase().includes(searchTerm) ||
            cls.id_group.toLowerCase().includes(searchTerm)
        );
    renderTable();
}

function handleTableInteraction(event) {
    const target = event.target;
    if (target.tagName === 'INPUT' && target.type === 'checkbox') {
        if (!appState.activeScheduleId) {
            alert('لطفاً ابتدا یک برنامه درسی ایجاد یا انتخاب کنید.');
            target.checked = false;
            return;
        }
        const classId = target.dataset.id;
        if (target.checked) addSelection(classId, true);
        else removeSelection(classId);
    } else {
        const row = target.closest('tr');
        if (row && row.classList.contains('disabled-row')) {
            const classId = row.dataset.id;
            const classToShow = appState.allClasses.find(c => c.id_group === classId);
            const schedule = appState.schedules[appState.activeScheduleId];
            if (classToShow && schedule) {
                if (!isGenderCompatible(classToShow)) {
                    alert(`این کلاس برای جنسیت انتخاب شده شما در دسترس نیست.`);
                    return;
                }
                const conflicts = findConflicts(classToShow, schedule.classes);
                if (conflicts.length > 0) showConflictModal(classToShow, conflicts);
            }
        }
    }
}

function handleRemoveSelection(event) {
    if (event.target.classList.contains('remove-btn')) {
        removeSelection(event.target.dataset.id);
    }
}

function handleNewSchedule() {
    const name = prompt('یک نام برای برنامه جدید وارد کنید:', `برنامه ${Object.keys(appState.schedules).length + 1}`);
    if (!name) return;
    const id = `schedule-${Date.now()}`;
    appState.schedules[id] = { id, name, classes: [] };
    appState.activeScheduleId = id;
    updateUI();
}

function handleRenameSchedule() {
    if (!appState.activeScheduleId) return;
    const schedule = appState.schedules[appState.activeScheduleId];
    const newName = prompt('نام جدید برنامه را وارد کنید:', schedule.name);
    if (newName) {
        schedule.name = newName;
        updateUI();
    }
}

function handleDeleteSchedule() {
    if (!appState.activeScheduleId || Object.keys(appState.schedules).length <= 1) {
        alert('امکان حذف آخرین برنامه وجود ندارد.');
        return;
    }
    if (confirm(`آیا از حذف برنامه «${appState.schedules[appState.activeScheduleId].name}» مطمئن هستید؟`)) {
        delete appState.schedules[appState.activeScheduleId];
        appState.activeScheduleId = Object.keys(appState.schedules)[0];
        updateUI();
    }
}

function handleSwitchSchedule() {
    appState.activeScheduleId = scheduleSelector.value;
    updateUI();
}

function handleGenderSelect(event) {
    appState.userGender = event.target.value;
    updateUI();
}

function isGenderCompatible(cls) {
    if (!appState.userGender) return true;
    if (cls.gender === 'مختلط' || (cls.gender === 'مرد' && appState.userGender === 'male') || (cls.gender === 'زن' && appState.userGender === 'female')) {
        return true;
    }
    return false;
}

function addSelection(classId, fromUserAction = false) {
    if (!appState.userGender) {
        alert("لطفاً ابتدا جنسیت خود را انتخاب کنید.");
        if (fromUserAction) {
            const checkbox = tableBody.querySelector(`input[data-id="${classId}"]`);
            if (checkbox) checkbox.checked = false;
        }
        return;
    }
    const schedule = appState.schedules[appState.activeScheduleId];
    const classToAdd = appState.allClasses.find(c => c.id_group === classId);
    if (!classToAdd || schedule.classes.some(c => c.id_group === classId)) return;
    if (!isGenderCompatible(classToAdd)) {
        alert("امکان افزودن این کلاس به دلیل محدودیت جنسیتی وجود ندارد.");
        const checkbox = tableBody.querySelector(`input[data-id="${classId}"]`);
        if (checkbox) checkbox.checked = false;
        return;
    }
    const conflicts = findConflicts(classToAdd, schedule.classes);
    if (conflicts.length > 0) {
        showConflictModal(classToAdd, conflicts);
        const checkbox = tableBody.querySelector(`input[data-id="${classId}"]`);
        if (checkbox) checkbox.checked = false;
        return;
    }
    schedule.classes.push(classToAdd);
    updateUI({ lastAddedId: classId });
}

function removeSelection(classId) {
    const schedule = appState.schedules[appState.activeScheduleId];
    schedule.classes = schedule.classes.filter(c => c.id_group !== classId);
    updateUI();
}

function updateUI(options = {}) {
    renderScheduleSelector();
    const activeSchedule = appState.schedules[appState.activeScheduleId];
    if (activeSchedule) {
        renderSelectedClasses(activeSchedule, options);
        renderTable();
    } else {
        selectedList.innerHTML = '<p class="placeholder">برای شروع یک برنامه ایجاد کنید.</p>';
        totalUnitsSpan.textContent = '';
        tableBody.innerHTML = `<tr><td colspan="6" class="placeholder">برای شروع یک برنامه ایجاد کنید.</td></tr>`;
    }
}

// --- Rendering Functions ---
function renderScheduleSelector() {
    scheduleSelector.innerHTML = '';
    for (const id in appState.schedules) {
        const schedule = appState.schedules[id];
        const option = new Option(schedule.name, id, false, id === appState.activeScheduleId);
        scheduleSelector.add(option);
    }
}

function renderSelectedClasses(schedule, options = {}) {
    const total = schedule.classes.reduce((sum, cls) => sum + cls.units.total, 0);
    totalUnitsSpan.textContent = `(مجموع واحدها: ${total})`;
    selectedList.innerHTML = '';
    if (schedule.classes.length === 0) {
        selectedList.innerHTML = '<p class="placeholder">کلاسی به این برنامه اضافه نشده است.</p>';
        return;
    }
    schedule.classes.forEach(cls => {
        const li = document.createElement('li');
        if (cls.id_group === options.lastAddedId) {
            li.style.animation = 'none';
            requestAnimationFrame(() => { li.style.animation = ''; });
        }
        li.innerHTML = `<span><strong>${cls.name}</strong> (${cls.id_group})</span><button class="remove-btn" data-id="${cls.id_group}">حذف</button>`;
        selectedList.appendChild(li);
    });
}

function renderTable() {
    const activeSchedule = appState.schedules[appState.activeScheduleId];
    tableBody.innerHTML = '';
    if (appState.filteredClasses.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="placeholder">${appState.allClasses.length > 0 ? 'کلاسی با این مشخصات یافت نشد.' : 'لطفاً یک فایل داده بارگذاری کنید.'}</td></tr>`;
        return;
    }
    const fragment = document.createDocumentFragment();
    appState.filteredClasses.forEach(cls => {
        const isSelected = activeSchedule.classes.some(sc => sc.id_group === cls.id_group);
        const isGenderInvalid = appState.userGender && !isGenderCompatible(cls);
        const hasConflict = !isSelected && findConflicts(cls, activeSchedule.classes).length > 0;
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
    tableBody.appendChild(fragment);
}

function renderVisualCalendar(schedule) { const GRID_START_HOUR = 7; const GRID_END_HOUR = 21; const DAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه']; let html = '<div class="time-labels">'; for (let hour = GRID_START_HOUR; hour <= GRID_END_HOUR; hour++) { html += `<div class="time-label">${hour}:00</div>`; } html += '</div><div class="schedule-grid">'; DAYS.forEach(day => { html += `<div class="day-column"><div class="day-header">${day}</div>`; for (let hour = GRID_START_HOUR; hour < GRID_END_HOUR; hour++) { html += '<div class="hour-slot"></div>'; } html += '</div>'; }); html += '</div>'; visualScheduleContainer.innerHTML = html; const dayColumns = visualScheduleContainer.querySelectorAll('.day-column'); const timeToMinutes = timeStr => { const [h, m] = timeStr.split(':').map(Number); return h * 60 + m; }; schedule.classes.forEach((cls, index) => { if (!appState.classColors[cls.id_group]) { appState.classColors[cls.id_group] = CLASS_COLORS[index % CLASS_COLORS.length]; } const color = appState.classColors[cls.id_group]; cls.schedule.class_times.forEach(time => { const dayIndex = DAYS.indexOf(time.day); if (dayIndex === -1) return; const startMinutes = timeToMinutes(time.start_time); const endMinutes = timeToMinutes(time.end_time); const minutesFromGridTop = startMinutes - (GRID_START_HOUR * 60); const durationInMinutes = endMinutes - startMinutes; const pxPerMinute = HOUR_HEIGHT / 60; const top = minutesFromGridTop * pxPerMinute; const height = durationInMinutes * pxPerMinute; if (top < 0 || height <= 0) return; const block = document.createElement('div'); block.className = 'class-block'; block.style.top = `${top}px`; block.style.height = `${height}px`; block.style.backgroundColor = color; block.style.borderColor = `color-mix(in srgb, ${color} 80%, black)`; block.innerHTML = `<strong>${cls.name}</strong>${time.start_time} - ${time.end_time}`; dayColumns[dayIndex].appendChild(block); }); }); }
function showVisualScheduleModal() { const activeSchedule = appState.schedules[appState.activeScheduleId]; if (activeSchedule) { renderVisualCalendar(activeSchedule); visualScheduleModal.classList.add('visible'); } else { alert("لطفاً ابتدا یک برنامه ایجاد یا انتخاب کنید."); } }
function findConflicts(classToCheck, scheduleClasses) { const conflicts = []; const timeToMinutes = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; }; for (const scheduledClass of scheduleClasses) { for (const timeA of classToCheck.schedule.class_times) { for (const timeB of scheduledClass.schedule.class_times) { if (timeA.day === timeB.day && timeToMinutes(timeA.start_time) < timeToMinutes(timeB.end_time) && timeToMinutes(timeB.start_time) < timeToMinutes(timeA.end_time)) { conflicts.push({ conflictingClass: scheduledClass, reason: `تداخل زمان کلاس در روز ${timeA.day} (${timeA.start_time}-${timeA.end_time})` }); } } } const examA = classToCheck.schedule.exam; const examB = scheduledClass.schedule.exam; if (examA && examB && examA.date === examB.date && timeToMinutes(examA.start_time) < timeToMinutes(examB.end_time) && timeToMinutes(examB.start_time) < timeToMinutes(examA.end_time)) { conflicts.push({ conflictingClass: scheduledClass, reason: `تداخل امتحان در تاریخ ${examA.date} (${examA.start_time}-${examA.end_time})` }); } } return conflicts; }
function showConflictModal(classInQuestion, conflicts) { let detailsHtml = `<p>درس <strong>${classInQuestion.name} (${classInQuestion.id_group})</strong> با موارد زیر تداخل دارد:</p><ul>`; conflicts.forEach(conflict => { detailsHtml += `<li><strong>${conflict.conflictingClass.name} (${conflict.conflictingClass.id_group})</strong><br><small>${conflict.reason}</small></li>`; }); detailsHtml += '</ul>'; conflictDetails.innerHTML = detailsHtml; conflictModal.classList.add('visible'); }
function parseClassData(apiResponse) { const dataXmlString = apiResponse.outpar?.BMt; if (!dataXmlString) throw new Error("رشته XML داده‌ها (outpar.BMt) در پاسخ یافت نشد."); const parser = new DOMParser(); const xmlDoc = parser.parseFromString(dataXmlString, "application/xml"); const classRows = xmlDoc.querySelectorAll('row'); return Array.from(classRows).map(row => ({ id_group: row.getAttribute('C1'), name: row.getAttribute('C2'), units: { total: parseInt(row.getAttribute('C3'), 10) || 0, practical: parseFloat(row.getAttribute('C4')) || 0, }, capacity: parseInt(row.getAttribute('C5'), 10) || 0, gender: row.getAttribute('C6'), professor: cleanHtmlTags(row.getAttribute('C7')), schedule: parseSchedule(row.getAttribute('C8')), location: cleanHtmlTags(row.getAttribute('C9')), requirements: parseRequirementsHtml(row.getAttribute('C10')), description: cleanHtmlTags(row.getAttribute('C11')), })); }
function cleanHtmlTags(str) { if (!str) return ""; return str.replace(/<[^>]*>/g, '').trim(); }
function parseSchedule(scheduleStr) { if (!scheduleStr) return { class_times: [], exam: null }; const schedule = { class_times: [], exam: null }; const classTimeRegex = /درس\(.\):\s*([^\s]+)\s+([\d]{2}:[\d]{2})-([\d]{2}:[\d]{2})/g; let match; while ((match = classTimeRegex.exec(scheduleStr)) !== null) { schedule.class_times.push({ day: match[1].trim(), start_time: match[2], end_time: match[3], }); } const examRegex = /امتحان\(([^)]+)\)\s*ساعت\s*:\s*([\d]{2}:[\d]{2})-([\d]{2}:[\d]{2})/; const examMatch = scheduleStr.match(examRegex); if (examMatch) { schedule.exam = { date: examMatch[1], start_time: examMatch[2], end_time: examMatch[3], }; } return schedule; }
function parseRequirementsHtml(requirementsHtml) { const requirements = { prerequisites: [], corequisites: [], equivalents: [], conflicts: [] }; if (!requirementsHtml || !requirementsHtml.includes('<TR>')) return requirements; const tempDiv = document.createElement('div'); tempDiv.innerHTML = requirementsHtml; const requirementRows = tempDiv.querySelectorAll('tr'); requirementRows.forEach(tr => { const cells = tr.querySelectorAll('td'); if (cells.length < 2) return; const type = cells[0].textContent.trim(); const coursesText = cells[1].textContent.trim(); const courses = coursesText.split(/[,،]/).map(c => c.trim()).filter(Boolean); switch (type) { case 'پيش نياز': requirements.prerequisites.push(...courses); break; case 'هم نياز': requirements.corequisites.push(...courses); break; case 'معادل': requirements.equivalents.push(...courses); break; case 'متضاد': requirements.conflicts.push(...courses); break; } }); return requirements; }