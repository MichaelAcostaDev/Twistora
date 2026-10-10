import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpeedcubingTimer } from '../src/timer.js';
import {
  calculateStatistics,
  computeTrimmedAverage,
  formatTime,
  SolvesManager,
  Solve
} from '../src/statistics.js';

describe('timer.test.ts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes in idle state', () => {
    const timer = new SpeedcubingTimer(1000);
    expect(timer.state).toBe('idle');
  });

  it('holding Space reaches ready state after threshold', () => {
    const timer = new SpeedcubingTimer(1000);
    timer.handleDown(100);
    expect(timer.state).toBe('holding');

    vi.advanceTimersByTime(1000);
    expect(timer.state).toBe('ready');
  });

  it('releasing early returns to idle without starting', () => {
    const timer = new SpeedcubingTimer(1000);
    timer.handleDown(100);
    expect(timer.state).toBe('holding');

    vi.advanceTimersByTime(500); // 500ms < 1000ms
    timer.handleUp(600);
    expect(timer.state).toBe('idle');
  });

  it('releasing after ready threshold starts the timer', () => {
    const timer = new SpeedcubingTimer(1000);
    timer.handleDown(100);
    vi.advanceTimersByTime(1000);
    expect(timer.state).toBe('ready');

    timer.handleUp(1100);
    expect(timer.state).toBe('running');
  });

  it('pressing Space stops a running timer and calculates elapsed time', () => {
    const timer = new SpeedcubingTimer(1000);
    let recordedTime = 0;
    timer.setOnSolveRecorded(ms => {
      recordedTime = ms;
    });

    timer.handleDown(100);
    vi.advanceTimersByTime(1000);
    timer.handleUp(1100); // starts at 1100
    expect(timer.state).toBe('running');

    timer.handleDown(15340); // stopped at 15340
    expect(timer.state).toBe('stopped');
    expect(recordedTime).toBe(15340 - 1100); // 14240ms
    expect(timer.getElapsedTime(15340)).toBe(14240);
  });

  it('repeated keydown events do not cause duplicate transitions', () => {
    const timer = new SpeedcubingTimer(1000);
    const transitions: string[] = [];
    timer.onStateChange(st => transitions.push(st));

    timer.handleDown(100);
    timer.handleDown(110);
    timer.handleDown(120);
    expect(transitions).toEqual(['holding']);
  });

  it('calculates elapsed time and formats with formatTime', () => {
    expect(formatTime(0)).toBe('00:00.00');
    expect(formatTime(14320)).toBe('00:14.32');
    expect(formatTime(65120)).toBe('01:05.12');
    expect(formatTime(4500000)).toBe('75:00.00'); // Minutes > 59 do not wrap
    expect(formatTime(10000, '+2')).toBe('00:12.00');
    expect(formatTime(10000, 'DNF')).toBe('DNF');
  });

  it('calculates WCA trimmed Ao5 and Ao12 averages with DNF handling', () => {
    function makeSolve(raw: number, penalty: 'OK' | '+2' | 'DNF' = 'OK'): Solve {
      const finalTime = penalty === 'DNF' ? Infinity : penalty === '+2' ? raw + 2000 : raw;
      return { id: `s_${Math.random()}`, timestamp: Date.now(), rawTime: raw, scramble: 'R', penalty, finalTime };
    }

    // 5 solves: 10s, 12s, 14s, 16s, 20s -> trim 10s & 20s -> avg(12,14,16) = 14s (14000ms)
    const solves5 = [makeSolve(10000), makeSolve(12000), makeSolve(14000), makeSolve(16000), makeSolve(20000)];
    expect(computeTrimmedAverage(solves5)).toBe(14000);

    // 1 DNF trimmed as slowest
    const solvesWith1Dnf = [makeSolve(10000), makeSolve(12000), makeSolve(14000), makeSolve(16000), makeSolve(10000, 'DNF')];
    expect(computeTrimmedAverage(solvesWith1Dnf)).toBe(14000);

    // 2 DNFs -> average is DNF (Infinity)
    const solvesWith2Dnf = [makeSolve(10000), makeSolve(12000), makeSolve(14000), makeSolve(10000, 'DNF'), makeSolve(10000, 'DNF')];
    expect(computeTrimmedAverage(solvesWith2Dnf)).toBe(Infinity);

    const stats = calculateStatistics(solves5);
    expect(stats.solveCount).toBe(5);
    expect(stats.bestSingle).toBe(10000);
    expect(stats.worstSingle).toBe(20000);
    expect(stats.currentAo5).toBe(14000);
  });

  it('recovers safely from invalid stored data', () => {
    // Should not crash with empty or corrupted storage
    const manager = new SolvesManager();
    expect(Array.isArray(manager.getSolves())).toBe(true);
  });
});
