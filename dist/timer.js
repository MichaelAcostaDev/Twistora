import { formatTime } from './statistics.js';
export class SpeedcubingTimer {
    _state = 'idle';
    holdThresholdMs = 1000;
    pressStartTime = null;
    startTime = null;
    stopTime = null;
    holdTimerId = null;
    animFrameId = null;
    isSpaceDown = false;
    isPointerDown = false;
    ui = null;
    onSolveRecorded = null;
    stateListeners = [];
    constructor(holdThresholdMs = 1000) {
        this.holdThresholdMs = holdThresholdMs;
    }
    get state() {
        return this._state;
    }
    getHoldThreshold() {
        return this.holdThresholdMs;
    }
    setHoldThreshold(ms) {
        if (ms > 0) {
            this.holdThresholdMs = ms;
            this.updateUI();
        }
    }
    onStateChange(cb) {
        this.stateListeners.push(cb);
        return () => {
            this.stateListeners = this.stateListeners.filter(l => l !== cb);
        };
    }
    setOnSolveRecorded(cb) {
        this.onSolveRecorded = cb;
    }
    attachUI(elements) {
        this.ui = elements;
        this.bindEvents();
        this.updateUI();
    }
    transition(nextState) {
        if (this._state === nextState)
            return;
        const old = this._state;
        this._state = nextState;
        for (const listener of this.stateListeners) {
            listener(nextState, old);
        }
        this.updateUI();
    }
    handleDown(now) {
        if (this._state === 'running') {
            // Stopping running timer
            this.stopTime = now;
            this.clearHoldTimer();
            this.stopRenderLoop();
            this.transition('stopped');
            const elapsed = this.startTime !== null ? Math.max(0, now - this.startTime) : 0;
            if (this.ui) {
                this.ui.display.textContent = formatTime(elapsed);
            }
            if (this.onSolveRecorded) {
                this.onSolveRecorded(elapsed);
            }
            return;
        }
        if (this._state === 'idle' || this._state === 'stopped') {
            // Begin holding
            this.pressStartTime = now;
            this.transition('holding');
            this.clearHoldTimer();
            this.holdTimerId = setTimeout(() => {
                if (this._state === 'holding') {
                    this.transition('ready');
                }
            }, this.holdThresholdMs);
            if (this.ui) {
                this.startHoldAnimation();
            }
        }
    }
    handleUp(now) {
        this.clearHoldTimer();
        if (this._state === 'holding') {
            // Released before readiness threshold -> cancel, do not start
            this.pressStartTime = null;
            this.transition('idle');
            return;
        }
        if (this._state === 'ready') {
            // Released after readiness threshold -> start timer!
            this.pressStartTime = null;
            this.startTime = now;
            this.stopTime = null;
            this.transition('running');
            this.startRenderLoop();
            return;
        }
    }
    reset() {
        this.clearHoldTimer();
        this.stopRenderLoop();
        this.pressStartTime = null;
        this.startTime = null;
        this.stopTime = null;
        this.transition('idle');
    }
    getElapsedTime(now) {
        if (this._state === 'running' && this.startTime !== null) {
            return Math.max(0, now - this.startTime);
        }
        if (this._state === 'stopped' && this.startTime !== null && this.stopTime !== null) {
            return Math.max(0, this.stopTime - this.startTime);
        }
        return 0;
    }
    clearHoldTimer() {
        if (this.holdTimerId !== null) {
            clearTimeout(this.holdTimerId);
            this.holdTimerId = null;
        }
    }
    startHoldAnimation() {
        const loop = () => {
            if (this._state !== 'holding' || !this.ui || this.pressStartTime === null)
                return;
            const now = performance.now();
            const elapsed = now - this.pressStartTime;
            const progress = Math.min(100, (elapsed / this.holdThresholdMs) * 100);
            this.ui.progressFill.style.width = `${progress}%`;
            if (elapsed >= this.holdThresholdMs) {
                this.transition('ready');
                return;
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
    startRenderLoop() {
        const loop = () => {
            if (this._state !== 'running' || !this.ui)
                return;
            const now = performance.now();
            const elapsed = this.getElapsedTime(now);
            this.ui.display.textContent = formatTime(elapsed);
            this.animFrameId = requestAnimationFrame(loop);
        };
        this.animFrameId = requestAnimationFrame(loop);
    }
    stopRenderLoop() {
        if (this.animFrameId !== null) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }
    updateUI() {
        if (!this.ui)
            return;
        this.ui.container.setAttribute('data-state', this._state);
        switch (this._state) {
            case 'idle':
                this.ui.statusBadge.textContent = 'Idle';
                this.ui.instructionText.textContent = `Hold [Space] or Click & Hold (${(this.holdThresholdMs / 1000).toFixed(1)}s) to Ready`;
                this.ui.progressFill.style.width = '0%';
                break;
            case 'holding':
                this.ui.statusBadge.textContent = 'Holding...';
                this.ui.instructionText.textContent = 'Keep holding until green...';
                break;
            case 'ready':
                this.ui.statusBadge.textContent = 'Ready!';
                this.ui.instructionText.textContent = 'Release to start timer!';
                this.ui.progressFill.style.width = '100%';
                break;
            case 'running':
                this.ui.statusBadge.textContent = 'Timing';
                this.ui.instructionText.textContent = 'Press Space or Click timer to stop';
                this.ui.progressFill.style.width = '0%';
                break;
            case 'stopped':
                this.ui.statusBadge.textContent = 'Finished';
                this.ui.instructionText.textContent = 'Solve recorded! Hold Space to start next solve';
                this.ui.progressFill.style.width = '0%';
                break;
        }
    }
    bindEvents() {
        if (!this.ui)
            return;
        // Space key handling
        window.addEventListener('keydown', (e) => {
            if (e.code !== 'Space')
                return;
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
                return;
            }
            e.preventDefault();
            if (e.repeat)
                return; // Prevent keydown repeats
            if (this.isSpaceDown)
                return;
            this.isSpaceDown = true;
            this.handleDown(performance.now());
        });
        window.addEventListener('keyup', (e) => {
            if (e.code !== 'Space')
                return;
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
                return;
            }
            e.preventDefault();
            this.isSpaceDown = false;
            this.handleUp(performance.now());
        });
        // Pointer events on timer container (mouse and touch)
        this.ui.container.addEventListener('pointerdown', (e) => {
            if (e.button !== 0)
                return;
            e.preventDefault();
            if (this.isPointerDown)
                return;
            this.isPointerDown = true;
            this.handleDown(performance.now());
        });
        window.addEventListener('pointerup', (e) => {
            if (!this.isPointerDown)
                return;
            e.preventDefault();
            this.isPointerDown = false;
            this.handleUp(performance.now());
        });
        window.addEventListener('pointercancel', () => {
            if (this.isPointerDown) {
                this.isPointerDown = false;
                this.handleUp(performance.now());
            }
        });
        // Window focus safety
        window.addEventListener('blur', () => {
            this.isSpaceDown = false;
            this.isPointerDown = false;
            if (this._state === 'holding') {
                this.reset();
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.isSpaceDown = false;
                this.isPointerDown = false;
                if (this._state === 'holding') {
                    this.reset();
                }
            }
        });
    }
}
