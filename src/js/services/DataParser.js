import { cleanHtmlTags, parseSchedule, parseRequirementsHtml } from './parserUtils.js';

export default class DataParser {
    static parse(apiResponse) {
        // Handle the specific structure provided in the JSON (XML inside outpar.BMt)
        const dataXmlString = apiResponse.outpar?.BMt;
        if (!dataXmlString) throw new Error("ساختار داده نامعتبر است (XML داده‌ها یافت نشد).");

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(dataXmlString, "application/xml");
        const classRows = xmlDoc.querySelectorAll('row');

        return Array.from(classRows).map(row => {
            const rawDesc = cleanHtmlTags(row.getAttribute('C11'));
            const rawSchedule = row.getAttribute('C8');
            
            // Pass description to parser for intelligent auto-fixing
            const schedule = parseSchedule(rawSchedule, rawDesc);

            return {
                id_group: row.getAttribute('C1'),
                name: row.getAttribute('C2'),
                units: {
                    total: parseInt(row.getAttribute('C3'), 10) || 0,
                    practical: parseFloat(row.getAttribute('C4')) || 0,
                },
                capacity: parseInt(row.getAttribute('C5'), 10) || 0,
                gender: row.getAttribute('C6'),
                professor: cleanHtmlTags(row.getAttribute('C7')),
                schedule: schedule,
                location: cleanHtmlTags(row.getAttribute('C9')),
                requirements: parseRequirementsHtml(row.getAttribute('C10')),
                description: rawDesc,
                // Flag to indicate if the parser modified the schedule based on description
                hasScheduleOverride: !!schedule.isOverridden 
            };
        });
    }
}