import { MAX_AUTO_SCHEDULE_RESULTS, SCORING, PRIORITIES } from '../constants.js';

export default class ScheduleService {

    static isGenderCompatible(cls, userGender) {
        if (!userGender) return true; 
        return cls.gender === 'مختلط' ||
               (cls.gender === 'مرد' && userGender === 'male') ||
               (cls.gender === 'زن' && userGender === 'female');
    }

    static timeToMinutes(t) {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }

    static findConflicts(classToCheck, scheduleClasses) {
        const conflicts = [];
        
        for (const scheduledClass of scheduleClasses) {
            if (scheduledClass.id_group === classToCheck.id_group) continue;

            for (const timeA of classToCheck.schedule.class_times) {
                for (const timeB of scheduledClass.schedule.class_times) {
                    if (timeA.day === timeB.day && 
                        this.timeToMinutes(timeA.start_time) < this.timeToMinutes(timeB.end_time) && 
                        this.timeToMinutes(timeB.start_time) < this.timeToMinutes(timeA.end_time)) {
                        
                        conflicts.push({
                            conflictingClass: scheduledClass,
                            reason: `تداخل زمان کلاس: ${timeA.day} ${timeA.start_time}`
                        });
                    }
                }
            }
            
            const examA = classToCheck.schedule.exam;
            const examB = scheduledClass.schedule.exam;
            if (examA && examB && examA.date === examB.date && 
                this.timeToMinutes(examA.start_time) < this.timeToMinutes(examB.end_time) && 
                this.timeToMinutes(examB.start_time) < this.timeToMinutes(examA.end_time)) {
                
                conflicts.push({
                    conflictingClass: scheduledClass,
                    reason: `تداخل امتحان: ${examA.date}`
                });
            }
        }
        return conflicts;
    }

    static checkUIConflicts(mandatoryClasses, allOtherClasses) {
        const conflictMap = new Set();
        
        mandatoryClasses.forEach(mand => {
            allOtherClasses.forEach(other => {
                if (mand.id_group === other.id_group) return;
                
                const conflicts = this.findConflicts(mand, [other]);
                if (conflicts.length > 0) {
                    conflictMap.add(other.id_group);
                }
            });
        });

        return conflictMap;
    }

    static calculateScore(schedule, mode = 'balanced') {
        let score = 0;
        const days = new Set();
        let totalGap = 0;
        
        const sortedClasses = schedule.flatMap(c => 
            c.schedule.class_times.map(t => ({...t, minutes: this.timeToMinutes(t.start_time), cls: c}))
        ).sort((a, b) => {
            if (a.day !== b.day) return a.day.localeCompare(b.day);
            return a.minutes - b.minutes;
        });

        for (let i = 0; i < sortedClasses.length - 1; i++) {
            if (sortedClasses[i].day === sortedClasses[i+1].day) {
                const gap = this.timeToMinutes(sortedClasses[i+1].start_time) - this.timeToMinutes(sortedClasses[i].end_time);
                if (gap > 0 && gap < 240) { 
                    totalGap += gap;
                }
            }
        }

        schedule.forEach(c => {
            c.schedule.class_times.forEach(t => days.add(t.day));
            score += c.tempWeight || 0;
        });

        if (mode === 'compact') {
            score += (totalGap / 60) * SCORING.COMPACT_GAP_PENALTY;
            score += days.size * SCORING.COMPACT_DAY_PENALTY;
        } else {
            score += (totalGap / 60) * SCORING.GAP_PENALTY;
            score += days.size * SCORING.DAY_PENALTY;
        }

        return score;
    }

    static generateSchedules(allClasses, preferences) {
        const { 
            priorities, 
            minUnits, 
            maxUnits, 
            timePreferences, 
            userGender 
        } = preferences;

        const results = {
            balanced: [],
            compact: [],
            preferred: []
        };

        const isTimeValid = (cls) => {
            return cls.schedule.class_times.every(t => {
                const dayPref = timePreferences[t.day];
                if (!dayPref) return false;
                
                const startM = this.timeToMinutes(t.start_time);
                
                if (!dayPref.am && startM < 720) return false;
                if (!dayPref.pm && startM >= 720) return false; 
                return true;
            });
        };

        const validClasses = allClasses.filter(cls => {
            if (!this.isGenderCompatible(cls, userGender)) return false;
            
            const priority = priorities[cls.id_group] || PRIORITIES.LOW;
            if (priority === PRIORITIES.EXCLUDE) return false;

            if (priority === PRIORITIES.MANDATORY) return true;

            return isTimeValid(cls);
        });

        const courseGroups = {};
        validClasses.forEach(cls => {
            if (!courseGroups[cls.name]) courseGroups[cls.name] = [];
            
            cls.tempPriority = priorities[cls.id_group] || PRIORITIES.LOW;
            
            if (cls.tempPriority === PRIORITIES.MANDATORY) {
                cls.tempWeight = SCORING.MANDATORY_WEIGHT;
            } else if (cls.tempPriority === PRIORITIES.PREFERRED) {
                cls.tempWeight = SCORING.PREFERRED_WEIGHT;
            } else {
                cls.tempWeight = SCORING.LOW_PRIORITY_WEIGHT;
            }
            
            courseGroups[cls.name].push(cls);
        });

        const mandatoryGroups = [];
        const poolGroups = [];

        Object.values(courseGroups).forEach(group => {
            const hasMandatory = group.some(c => c.tempPriority === PRIORITIES.MANDATORY);
            if (hasMandatory) {
                mandatoryGroups.push(group.filter(c => c.tempPriority === PRIORITIES.MANDATORY));
            } else {
                poolGroups.push(group);
            }
        });

        const generateForMode = (mode) => {
            const modeResults = [];
            
            const explore = (index, currentSchedule, currentUnits, groupsToExplore) => {
                if (modeResults.length >= MAX_AUTO_SCHEDULE_RESULTS) return;
                
                if (index >= groupsToExplore.length) {
                    if (currentUnits >= minUnits && currentUnits <= maxUnits) {
                        const score = this.calculateScore(currentSchedule, mode);
                        modeResults.push({
                            classes: [...currentSchedule],
                            totalUnits: currentUnits,
                            score: score,
                            type: mode
                        });
                    }
                    return;
                }

                if (currentUnits > maxUnits) return;

                const group = groupsToExplore[index];
                
                explore(index + 1, currentSchedule, currentUnits, groupsToExplore);

                for (const cls of group) {
                    if (this.findConflicts(cls, currentSchedule).length === 0 && 
                        !currentSchedule.some(c => c.name === cls.name)) {
                        
                        explore(
                            index + 1, 
                            [...currentSchedule, cls], 
                            currentUnits + cls.units.total, 
                            groupsToExplore
                        );
                    }
                }
            };

            const initialSchedule = [];
            let initialUnits = 0;
            let possible = true;

            for (const group of mandatoryGroups) {
                const validInGroup = group.filter(c => this.findConflicts(c, initialSchedule).length === 0);
                if (validInGroup.length === 0) {
                    possible = false;
                    break;
                }
                const bestMandatory = validInGroup[0]; 
                initialSchedule.push(bestMandatory);
                initialUnits += bestMandatory.units.total;
            }

            if (possible) {
                explore(0, initialSchedule, initialUnits, poolGroups);
            }
            return modeResults.sort((a, b) => b.score - a.score).slice(0, 5);
        };

        results.balanced = generateForMode('balanced');
        results.compact = generateForMode('compact');
        results.preferred = generateForMode('preferred'); 

        return results;
    }
}