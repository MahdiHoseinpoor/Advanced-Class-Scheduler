import { cleanHtmlTags, parseSchedule, parseRequirementsHtml } from './parserUtils.js';

export default class DataParser {
    static parse(apiResponse) {
        const dataXmlString = apiResponse.outpar?.BMt;
        if (!dataXmlString) throw new Error("رشته XML داده‌ها (outpar.BMt) در پاسخ یافت نشد.");

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(dataXmlString, "application/xml");
        const classRows = xmlDoc.querySelectorAll('row');

        return Array.from(classRows).map(row => ({
            id_group: row.getAttribute('C1'),
            name: row.getAttribute('C2'),
            units: {
                total: parseInt(row.getAttribute('C3'), 10) || 0,
                practical: parseFloat(row.getAttribute('C4')) || 0,
            },
            capacity: parseInt(row.getAttribute('C5'), 10) || 0,
            gender: row.getAttribute('C6'),
            professor: cleanHtmlTags(row.getAttribute('C7')),
            schedule: parseSchedule(row.getAttribute('C8')),
            location: cleanHtmlTags(row.getAttribute('C9')),
            requirements: parseRequirementsHtml(row.getAttribute('C10')),
            description: cleanHtmlTags(row.getAttribute('C11')),
        }));
    }
}