const PERSIAN_DAYS_MAP = {
    'شنبه': 'شنبه',
    'یک شنبه': 'یک‌شنبه', 'یکشنبه': 'یک‌شنبه',
    'دو شنبه': 'دوشنبه', 'دوشنبه': 'دوشنبه',
    'سه شنبه': 'سه‌شنبه', 'سه‌شنبه': 'سه‌شنبه',
    'چهار شنبه': 'چهارشنبه', 'چهارشنبه': 'چهارشنبه',
    'پنج شنبه': 'پنج‌شنبه', 'پنجشنبه': 'پنج‌شنبه',
    'جمعه': 'جمعه'
};

const ODD_DAYS = ['یک‌شنبه', 'سه‌شنبه'];
const EVEN_DAYS = ['شنبه', 'دوشنبه', 'چهارشنبه'];

export function cleanHtmlTags(str) {
    if (!str) return "";
    const tempEl = document.createElement('div');
    tempEl.innerHTML = str.replace(/<br\s*\/?>/gi, '\n');
    return (tempEl.textContent || tempEl.innerText || "").trim();
}

function toEnglishDigits(str) {
    return str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
              .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

function normalizeDay(dayStr) {
    const cleaned = dayStr.replace(/[‌\s]/g, '').trim(); 
    for (const [key, value] of Object.entries(PERSIAN_DAYS_MAP)) {
        if (key.replace(/[‌\s]/g, '') === cleaned) return value;
    }
    return dayStr;
}

export function parseDescriptionForSchedule(desc, existingSchedule) {
    if (!desc) return existingSchedule;

    let cleanDesc = toEnglishDigits(desc)
        .replace(/[يی]/g, 'ی')
        .replace(/[كک]/g, 'ک')
        .replace(/يك/g, 'یک')
        .replace(/یک\s+شنبه/g, 'یکشنبه')
        .replace(/دو\s+شنبه/g, 'دوشنبه')
        .replace(/سه\s+شنبه/g, 'سه‌شنبه')
        .replace(/چهار\s+شنبه/g, 'چهارشنبه')
        .replace(/پنج\s+شنبه/g, 'پنج‌شنبه')
        .replace(/پنجشنبه/g, 'پنج‌شنبه')
        .replace(/\s+/g, ' ');

    const overrideKeywords = /(تغییر|تشکیل|برگزار|جبرانی|روزهای|ساعت|زمان|روز و ساعت)/;
    if (!overrideKeywords.test(cleanDesc)) return existingSchedule;

    const timeRegex = /(?:ساعت|س|از|الی|^|\s)(\d{1,2})(?::(\d{2}))?\s*(?:تا|الی|به|-)\s*(\d{1,2})(?::(\d{2}))?/g;
    
    const foundTimes = [];
    let match;
    while ((match = timeRegex.exec(cleanDesc)) !== null) {
        let h1 = parseInt(match[1]);
        let m1 = parseInt(match[2] || '0');
        let h2 = parseInt(match[3]);
        let m2 = parseInt(match[4] || '0');

        if (h1 >= 7 && h1 <= 21 && h2 >= 7 && h2 <= 21) {
             foundTimes.push({
                start: `${h1.toString().padStart(2, '0')}:${m1.toString().padStart(2, '0')}`,
                end: `${h2.toString().padStart(2, '0')}:${m2.toString().padStart(2, '0')}`
            });
        }
    }

    let foundDays = new Set();
    
    const dayPriorities = [
        { key: 'یکشنبه', val: 'یک‌شنبه' },
        { key: 'دوشنبه', val: 'دوشنبه' },
        { key: 'سه‌شنبه', val: 'سه‌شنبه' },
        { key: 'چهارشنبه', val: 'چهارشنبه' },
        { key: 'پنج‌شنبه', val: 'پنج‌شنبه' },
        { key: 'شنبه', val: 'شنبه' }, 
        { key: 'جمعه', val: 'جمعه' }
    ];

    dayPriorities.forEach(d => {
        if (d.key === 'شنبه') {
             if (/(?<!(یک|دو|سه|چهار|پنج|‌))شنبه/.test(cleanDesc)) {
                foundDays.add(d.val);
            }
        } else {
            if (cleanDesc.includes(d.key)) {
                foundDays.add(d.val);
            }
        }
    });

    if (foundDays.size === 0) {
        if (cleanDesc.includes('روزهای فرد') || cleanDesc.includes('روز های فرد')) {
            ODD_DAYS.forEach(d => foundDays.add(d));
        } else if (cleanDesc.includes('روزهای زوج') || cleanDesc.includes('روز های زوج')) {
            EVEN_DAYS.forEach(d => foundDays.add(d));
        }
    }

    if (foundDays.size > 0 && foundTimes.length > 0) {
        const timeToUse = foundTimes[foundTimes.length - 1];
        
        const newClassTimes = [];
        foundDays.forEach(day => {
            newClassTimes.push({
                day: day,
                start_time: timeToUse.start,
                end_time: timeToUse.end
            });
        });

        return {
            class_times: newClassTimes,
            exam: existingSchedule.exam,
            isOverridden: true,
            originalSchedule: existingSchedule.class_times
        };
    }

    return existingSchedule;
}

export function parseSchedule(scheduleStr, descriptionStr = "") {
    let schedule = { class_times: [], exam: null };
    
    if (scheduleStr) {
        const withNewlines = scheduleStr.replace(/<br[^>]*>/gi, '\n');
        const tempEl = document.createElement('div');
        tempEl.innerHTML = withNewlines;
        const cleanStr = toEnglishDigits((tempEl.textContent || tempEl.innerText || "").trim())
            .replace(/[يی]/g, 'ی').replace(/[كک]/g, 'ک');

        const classTimeRegex = /درس\s*\(([تزع])\)\s*:\s*([^\d:]+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g;
        const examRegex = /امتحان\s*\(([\d\.]+)\)\s*ساعت\s*:\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;
        
        let match;
        while ((match = classTimeRegex.exec(cleanStr)) !== null) {
            schedule.class_times.push({
                day: normalizeDay(match[2].trim()),
                start_time: match[3].padStart(5, '0'),
                end_time: match[4].padStart(5, '0'),
            });
        }

        const examMatch = cleanStr.match(examRegex);
        if (examMatch) {
            schedule.exam = {
                date: examMatch[1],
                start_time: examMatch[2].padStart(5, '0'),
                end_time: examMatch[3].padStart(5, '0'),
            };
        }
    }

    return parseDescriptionForSchedule(descriptionStr, schedule);
}

export function parseRequirementsHtml(requirementsHtml) {
    const requirements = { prerequisites: [], corequisites: [], equivalents: [], conflicts: [] };
    if (!requirementsHtml || !requirementsHtml.includes('<TR>')) return requirements;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = requirementsHtml;
    const requirementRows = tempDiv.querySelectorAll('tr');
    
    requirementRows.forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length < 2) return;
        
        const type = cells[0].textContent.trim();
        const coursesText = cells[1].textContent.trim();
        const courses = coursesText.split(/[,،]/).map(c => c.trim()).filter(Boolean);
        
        switch (type) {
            case 'پيش نياز': requirements.prerequisites.push(...courses); break;
            case 'هم نياز': requirements.corequisites.push(...courses); break;
            case 'معادل': requirements.equivalents.push(...courses); break;
            case 'متضاد': requirements.conflicts.push(...courses); break;
        }
    });
    return requirements;
}