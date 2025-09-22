export default class ScheduleService {

    static isGenderCompatible(cls, userGender) {
        if (!userGender) return true; 
        return cls.gender === 'مختلط' ||
               (cls.gender === 'مرد' && userGender === 'male') ||
               (cls.gender === 'زن' && userGender === 'female');
    }
    static findConflicts(classToCheck, scheduleClasses) {
        const conflicts = [];
        const timeToMinutes = t => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };

        for (const scheduledClass of scheduleClasses) {
            for (const timeA of classToCheck.schedule.class_times) {
                for (const timeB of scheduledClass.schedule.class_times) {
                    if (timeA.day === timeB.day && timeToMinutes(timeA.start_time) < timeToMinutes(timeB.end_time) && timeToMinutes(timeB.start_time) < timeToMinutes(timeA.end_time)) {
                        conflicts.push({
                            conflictingClass: scheduledClass,
                            reason: `تداخل زمان کلاس در روز ${timeA.day} (${timeA.start_time}-${timeA.end_time})`
                        });
                    }
                }
            }
            const examA = classToCheck.schedule.exam;
            const examB = scheduledClass.schedule.exam;
            if (examA && examB && examA.date === examB.date && timeToMinutes(examA.start_time) < timeToMinutes(examB.end_time) && timeToMinutes(examB.start_time) < timeToMinutes(examA.end_time)) {
                conflicts.push({
                    conflictingClass: scheduledClass,
                    reason: `تداخل امتحان در تاریخ ${examA.date} (${examA.start_time}-${examA.end_time})`
                });
            }
        }
        return conflicts;
    }
}