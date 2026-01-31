import { PERSISTENT_STATE_KEY } from '../constants.js';
import ScheduleService from './ScheduleService.js';

export default class StateManager {
    constructor() {
        this.allClasses = [];
        this.filteredClasses = [];
        this.schedules = {};
        this.activeScheduleId = null;
        this.userGender = null;
    }

    getActiveSchedule() {
        return this.schedules[this.activeScheduleId];
    }

    loadState() {
        const savedStateJSON = localStorage.getItem(PERSISTENT_STATE_KEY);
        if (!savedStateJSON) {
            this.createNewSchedule('برنامه اصلی', false);
            return;
        }
        try {
            const savedState = JSON.parse(savedStateJSON);
            this.schedules = savedState.schedules || {};
            this.activeScheduleId = savedState.activeScheduleId || null;
            this.userGender = savedState.userGender || null;
            this.allClasses = savedState.allClasses || []; // Load saved classes
            
            if (!this.schedules[this.activeScheduleId] && Object.keys(this.schedules).length > 0) {
                this.activeScheduleId = Object.keys(this.schedules)[0];
            }
            if (Object.keys(this.schedules).length === 0) {
                 this.createNewSchedule('برنامه اصلی', false);
            }
            
            // Re-apply filter if classes exist
            if (this.allClasses.length > 0) {
                this.filterClasses('');
            }
        } catch (error) {
            localStorage.removeItem(PERSISTENT_STATE_KEY);
            this.createNewSchedule('برنامه اصلی', false);
        }
    }

    saveState() {
        try {
            const stateToSave = {
                schedules: this.schedules,
                activeScheduleId: this.activeScheduleId,
                userGender: this.userGender,
                allClasses: this.allClasses // Save all classes to persistence
            };
            localStorage.setItem(PERSISTENT_STATE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Storage error (Quota exceeded?):", error);
        }
    }

    setAllClasses(classes) {
        this.allClasses = classes;
        const removed = this._verifySchedulesWithNewData();
        this.filterClasses(''); 
        this.saveState(); 
        return removed;
    }

    _verifySchedulesWithNewData() {
        const removedClassesLog = [];
        if (!this.allClasses || this.allClasses.length === 0) return removedClassesLog;

        for (const scheduleId in this.schedules) {
            const schedule = this.schedules[scheduleId];
            
            const verified = [];
            schedule.classes.forEach(savedClass => {
                const freshClass = this.allClasses.find(c => c.id_group === savedClass.id_group);
                
                if (!freshClass) {
                    removedClassesLog.push({ ...savedClass, scheduleName: schedule.name, reason: 'حذف از سیستم' });
                    return;
                }

                if (ScheduleService.findConflicts(freshClass, verified).length > 0) {
                    removedClassesLog.push({ ...freshClass, scheduleName: schedule.name, reason: 'تداخل جدید' });
                } else {
                    verified.push(freshClass);
                }
            });
            schedule.classes = verified;
        }
        return removedClassesLog;
    }

    filterClasses(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        this.filteredClasses = !term
            ? [...this.allClasses]
            : this.allClasses.filter(cls =>
                cls.name.toLowerCase().includes(term) ||
                cls.professor.toLowerCase().includes(term) ||
                cls.id_group.toLowerCase().includes(term)
            );
    }
    
    setUserGender(gender) {
        this.userGender = gender;
        this.saveState();
    }
    
    setActiveSchedule(scheduleId) {
        if (this.schedules[scheduleId]) {
            this.activeScheduleId = scheduleId;
            this.saveState();
        }
    }

    createNewSchedule(name, shouldSave = true) {
        const id = `sched_${Date.now()}`;
        this.schedules[id] = { id, name, classes: [] };
        this.activeScheduleId = id;
        if (shouldSave) this.saveState();
    }
    
    renameActiveSchedule(newName) {
        const schedule = this.getActiveSchedule();
        if (schedule && newName) {
            schedule.name = newName;
            this.saveState();
        }
    }

    deleteActiveSchedule() {
        if (!this.activeScheduleId || Object.keys(this.schedules).length <= 1) return false;
        delete this.schedules[this.activeScheduleId];
        this.activeScheduleId = Object.keys(this.schedules)[0];
        this.saveState();
        return true;
    }

    addClassToActiveSchedule(classId) {
        const schedule = this.getActiveSchedule();
        const classToAdd = this.allClasses.find(c => c.id_group === classId);
        if (!schedule || !classToAdd || schedule.classes.some(c => c.id_group === classId)) return false;
        
        schedule.classes.push(classToAdd);
        this.saveState();
        return true;
    }

    removeClassFromActiveSchedule(classId) {
        const schedule = this.getActiveSchedule();
        if (!schedule) return;
        schedule.classes = schedule.classes.filter(c => c.id_group !== classId);
        this.saveState();
    }
}