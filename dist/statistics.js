import { storage } from './storage.js';
const STORAGE_KEY = 'rubik_timer_3d_solves_v2';
/**
 * Formats milliseconds into standard speedcubing format: 00:00.00
 * Handles minutes > 59 without wrapping incorrectly.
 */
export function formatTime(ms, penalty = 'OK', withTag = false) {
    if (penalty === 'DNF' || ms === Infinity || isNaN(ms)) {
        return 'DNF';
    }
    const effectiveMs = penalty === '+2' ? ms + 2000 : ms;
    const safeMs = Math.max(0, effectiveMs);
    const totalHundredths = Math.floor(safeMs / 10);
    const hundredths = totalHundredths % 100;
    const totalSeconds = Math.floor(totalHundredths / 100);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    const minStr = String(minutes).padStart(2, '0');
    const secStr = String(seconds).padStart(2, '0');
    const hunStr = String(hundredths).padStart(2, '0');
    const formatted = `${minStr}:${secStr}.${hunStr}`;
    if (penalty === '+2' && withTag) {
        return `${formatted} (+2)`;
    }
    return formatted;
}
export function formatStatTime(ms) {
    if (ms === null || isNaN(ms))
        return '--';
    if (ms === Infinity)
        return 'DNF';
    return formatTime(ms);
}
/**
 * Calculates WCA Rule 9f trimmed average for a window of solves
 */
export function computeTrimmedAverage(solves) {
    if (!solves || solves.length < 3)
        return null;
    const times = solves.map(s => s.finalTime).sort((a, b) => a - b);
    const dnfCount = times.filter(t => t === Infinity).length;
    // Under WCA rules, 2 or more DNFs in an average of 5 or 12 makes the average DNF
    if (dnfCount >= 2) {
        return Infinity;
    }
    // Trim fastest (first) and slowest (last)
    const trimmed = times.slice(1, times.length - 1);
    if (trimmed.length === 0)
        return null;
    const sum = trimmed.reduce((a, b) => a + b, 0);
    return Math.round(sum / trimmed.length);
}
/**
 * Calculates comprehensive session statistics
 */
export function calculateStatistics(solves) {
    const solveCount = solves.length;
    if (solveCount === 0) {
        return {
            solveCount: 0,
            bestSingle: null,
            worstSingle: null,
            mean: null,
            currentAo5: null,
            currentAo12: null,
            bestAo5: null,
            bestAo12: null
        };
    }
    const validSolves = solves.filter(s => s.finalTime !== Infinity && !isNaN(s.finalTime));
    let bestSingle = null;
    let worstSingle = null;
    let mean = null;
    if (validSolves.length > 0) {
        const validTimes = validSolves.map(s => s.finalTime);
        bestSingle = Math.min(...validTimes);
        worstSingle = Math.max(...validTimes);
        const sum = validTimes.reduce((a, b) => a + b, 0);
        mean = Math.round(sum / validTimes.length);
    }
    else {
        worstSingle = Infinity;
    }
    // Current Ao5 & Ao12
    const currentAo5 = solveCount >= 5 ? computeTrimmedAverage(solves.slice(solveCount - 5)) : null;
    const currentAo12 = solveCount >= 12 ? computeTrimmedAverage(solves.slice(solveCount - 12)) : null;
    // Best Ao5 sliding window
    let bestAo5 = null;
    if (solveCount >= 5) {
        for (let i = 0; i <= solveCount - 5; i++) {
            const avg = computeTrimmedAverage(solves.slice(i, i + 5));
            if (avg !== null && avg !== Infinity) {
                if (bestAo5 === null || avg < bestAo5) {
                    bestAo5 = avg;
                }
            }
        }
    }
    // Best Ao12 sliding window
    let bestAo12 = null;
    if (solveCount >= 12) {
        for (let i = 0; i <= solveCount - 12; i++) {
            const avg = computeTrimmedAverage(solves.slice(i, i + 12));
            if (avg !== null && avg !== Infinity) {
                if (bestAo12 === null || avg < bestAo12) {
                    bestAo12 = avg;
                }
            }
        }
    }
    return {
        solveCount,
        bestSingle,
        worstSingle,
        mean,
        currentAo5,
        currentAo12,
        bestAo5,
        bestAo12
    };
}
export class SolvesManager {
    solves = [];
    listeners = [];
    constructor() {
        this.load();
    }
    getSolves() {
        return [...this.solves];
    }
    subscribe(cb) {
        this.listeners.push(cb);
        cb(this.getSolves());
        return () => {
            this.listeners = this.listeners.filter(l => l !== cb);
        };
    }
    notify() {
        const data = this.getSolves();
        for (const l of this.listeners) {
            l(data);
        }
        this.save();
    }
    addSolve(rawTime, scramble, penalty = 'OK', notes) {
        const id = `solve_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const finalTime = penalty === 'DNF' ? Infinity : penalty === '+2' ? rawTime + 2000 : rawTime;
        const solve = {
            id,
            timestamp: Date.now(),
            rawTime,
            scramble,
            penalty,
            finalTime,
            notes
        };
        this.solves.push(solve);
        this.notify();
        return solve;
    }
    updatePenalty(id, newPenalty) {
        const solve = this.solves.find(s => s.id === id);
        if (!solve)
            return;
        solve.penalty = newPenalty;
        solve.finalTime = newPenalty === 'DNF' ? Infinity : newPenalty === '+2' ? solve.rawTime + 2000 : solve.rawTime;
        this.notify();
    }
    deleteSolve(id) {
        this.solves = this.solves.filter(s => s.id !== id);
        this.notify();
    }
    clearAll() {
        this.solves = [];
        this.notify();
    }
    load() {
        const loaded = storage.getItem(STORAGE_KEY, []);
        if (Array.isArray(loaded)) {
            this.solves = loaded.filter(s => typeof s?.rawTime === 'number' && typeof s?.scramble === 'string');
        }
        else {
            this.solves = [];
        }
    }
    save() {
        storage.setItem(STORAGE_KEY, this.solves);
    }
}
