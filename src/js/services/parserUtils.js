function cleanHtmlTags(str) {
    if (!str) return "";

    const tempEl = document.createElement('div');
    tempEl.innerHTML = str;
    return (tempEl.textContent || tempEl.innerText || "").trim();
}

function parseSchedule(scheduleStr) {
    if (!scheduleStr) return { class_times: [], exam: null };
    
    const withNewlines = scheduleStr.replace(/<br[^>]*>/gi, '\n');
    const tempEl = document.createElement('div');
    tempEl.innerHTML = withNewlines;
    const cleanStr = (tempEl.textContent || tempEl.innerText || "").trim();


    const schedule = { class_times: [], exam: null };

    const classTimeRegex = /درس\(([تزع])\):\s*(\S+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})/g;
    
    const examRegex = /امتحان\(([\d.]+)\)\s*ساعت\s*:\s*(\d{2}:\d{2})-(\d{2}:\d{2})/;
    
    let match;
    while ((match = classTimeRegex.exec(cleanStr)) !== null) {
        schedule.class_times.push({
            day: match[2].trim(),
            start_time: match[3],
            end_time: match[4],
        });
    }

    const examMatch = cleanStr.match(examRegex);
    if (examMatch) {
        schedule.exam = {
            date: examMatch[1],
            start_time: examMatch[2],
            end_time: examMatch[3],
        };
    }

    return schedule;
}

function parseRequirementsHtml(requirementsHtml) {
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

export { cleanHtmlTags, parseSchedule, parseRequirementsHtml };