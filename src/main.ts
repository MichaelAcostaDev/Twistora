import { SpeedcubingTimer } from './timer.js';
import { VirtualCube, SpeedMode } from './cube.js';
import { generateScramble } from './scramble.js';
import {
  SolvesManager,
  calculateStatistics,
  formatTime,
  formatStatTime,
  PenaltyType,
  Solve
} from './statistics.js';
import { MOVE_DESCRIPTIONS } from './notation.js';
import { storage } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial State
  const savedHoldMs = storage.getItem<number>('rubik_timer_hold_ms', 1000);
  const timer = new SpeedcubingTimer(savedHoldMs);
  const solvesManager = new SolvesManager();

  // 2. 3D Cube Initialization
  const cubeHost = document.getElementById('cube-canvas-host');
  let cube: VirtualCube | null = null;
  if (cubeHost) {
    cube = new VirtualCube(cubeHost);
  }

  // 3. Scramble Handling
  const scrambleDisplay = document.getElementById('scramble-display')!;
  const btnNewScramble = document.getElementById('btn-new-scramble') as HTMLButtonElement;
  const btnCopyScramble = document.getElementById('btn-copy-scramble') as HTMLButtonElement;
  const btnSyncCube = document.getElementById('btn-sync-cube') as HTMLButtonElement;

  let activeScramble = '';

  const setNewScramble = (scramble: string) => {
    activeScramble = scramble;
    scrambleDisplay.innerHTML = '';
    const tokens = scramble.split(/\s+/);
    for (const token of tokens) {
      const span = document.createElement('span');
      span.className = 'scramble-move-token';
      span.textContent = token;
      span.title = MOVE_DESCRIPTIONS[token] || `Move ${token}`;
      scrambleDisplay.appendChild(span);
    }
  };

  const refreshScramble = () => {
    setNewScramble(generateScramble(21));
  };
  refreshScramble();

  btnNewScramble.addEventListener('click', () => {
    refreshScramble();
  });

  btnCopyScramble.addEventListener('click', async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(activeScramble);
      } else {
        const ta = document.createElement('textarea');
        ta.value = activeScramble;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      btnCopyScramble.textContent = 'Copied!';
      setTimeout(() => {
        btnCopyScramble.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        `;
      }, 1200);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  });

  btnSyncCube.addEventListener('click', async () => {
    if (!cube || cube.isAnimating() || !activeScramble) return;
    const banner = document.getElementById('solver-solution-container')!;
    banner.style.display = 'none';
    setCubeBusy(true, false);
    await cube.executeSequence(activeScramble);
    setCubeBusy(false);
  });

  // 4. Timer Setup
  const timerContainer = document.getElementById('timer-box')!;
  const timerDisplay = document.getElementById('timer-display')!;
  const progressFill = document.getElementById('hold-progress-fill')!;
  const statusBadge = document.getElementById('timer-status-badge')!;
  const instructionText = document.getElementById('timer-instruction')!;

  timer.attachUI({
    container: timerContainer,
    display: timerDisplay,
    progressFill,
    statusBadge,
    instructionText
  });

  timer.setOnSolveRecorded(rawMs => {
    solvesManager.addSolve(rawMs, activeScramble, 'OK');
    refreshScramble();
  });

  // 5. 3D Cube UI Controls
  const btnScrambleCube = document.getElementById('btn-scramble-cube') as HTMLButtonElement;
  const btnSolveCube = document.getElementById('btn-solve-cube') as HTMLButtonElement;
  const btnStopAnimation = document.getElementById('btn-stop-animation') as HTMLButtonElement;
  const btnResetSolved = document.getElementById('btn-reset-solved') as HTMLButtonElement;
  const btnResetCamera = document.getElementById('btn-reset-camera') as HTMLButtonElement;
  const speedSelect = document.getElementById('cube-speed-select') as HTMLSelectElement;
  const cubeStatusChip = document.getElementById('cube-status-chip')!;
  const cubeStatusText = document.getElementById('cube-status-text')!;
  const solutionBanner = document.getElementById('solver-solution-container')!;
  const solutionStepCount = document.getElementById('solution-step-count')!;
  const solutionMovesList = document.getElementById('solution-moves-list')!;
  const moveButtons = document.querySelectorAll<HTMLButtonElement>('.move-btn');

  const setCubeBusy = (busy: boolean, isSolving = false) => {
    btnScrambleCube.disabled = busy;
    btnSolveCube.disabled = busy;
    btnStopAnimation.style.display = busy ? 'inline-flex' : 'none';
    moveButtons.forEach(b => (b.disabled = busy));

    if (busy) {
      cubeStatusChip.className = 'cube-status-chip solving';
      cubeStatusText.textContent = isSolving ? 'Solving Cube...' : 'Scrambling...';
    }
  };

  if (cube) {
    cube.onStateChange(isSolved => {
      if (isSolved) {
        cubeStatusChip.className = 'cube-status-chip solved';
        cubeStatusText.textContent = 'Solved State';
      } else {
        cubeStatusChip.className = 'cube-status-chip scrambled';
        cubeStatusText.textContent = 'Scrambled State';
      }
    });

    speedSelect.addEventListener('change', () => {
      cube?.setSpeed(speedSelect.value as SpeedMode);
    });

    btnResetCamera.addEventListener('click', () => {
      cube?.resetCamera();
    });

    btnResetSolved.addEventListener('click', () => {
      cube?.resetSolved();
      solutionBanner.style.display = 'none';
      setCubeBusy(false);
    });

    btnStopAnimation.addEventListener('click', () => {
      cube?.stopSequence();
      setCubeBusy(false);
    });

    btnScrambleCube.addEventListener('click', async () => {
      if (cube.isAnimating()) return;
      const scrambleSeq = generateScramble(20);
      solutionBanner.style.display = 'none';
      setCubeBusy(true, false);
      await cube.executeSequence(scrambleSeq);
      setCubeBusy(false);
    });

    btnSolveCube.addEventListener('click', async () => {
      if (cube.isAnimating()) return;

      if (cube.getSolver().isSolved()) {
        solutionBanner.style.display = 'block';
        solutionStepCount.textContent = '0 moves';
        solutionMovesList.textContent = 'Cube is already solved!';
        return;
      }

      try {
        const solution = cube.getSolver().solve();
        if (!solution || !solution.trim()) {
          solutionBanner.style.display = 'block';
          solutionMovesList.textContent = 'Cube is already in solved state.';
          return;
        }

        const steps = solution.trim().split(/\s+/);
        solutionBanner.style.display = 'block';
        solutionStepCount.textContent = `${steps.length} moves`;
        solutionMovesList.textContent = solution;

        setCubeBusy(true, true);

        await cube.executeSequence(solution, (current, total, token) => {
          solutionStepCount.textContent = `Move ${current} of ${total} (${token})`;
        });

        setCubeBusy(false);
        solutionStepCount.textContent = `Solved in ${steps.length} moves!`;
      } catch (err) {
        console.error('Solve error:', err);
        setCubeBusy(false);
        solutionBanner.style.display = 'block';
        solutionMovesList.textContent = 'Error computing solution for current state.';
      }
    });

    // Move buttons (including middle slices M, E, S)
    moveButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        if (cube.isAnimating()) return;
        const move = btn.dataset.move;
        if (move) {
          await cube.executeMove(move);
        }
      });
    });
  }

  // 6. Statistics View & Solve History
  const statCount = document.getElementById('stat-count')!;
  const statBest = document.getElementById('stat-best')!;
  const statWorst = document.getElementById('stat-worst')!;
  const statMean = document.getElementById('stat-mean')!;
  const statCurrAo5 = document.getElementById('stat-curr-ao5')!;
  const statBestAo5 = document.getElementById('stat-best-ao5')!;
  const statCurrAo12 = document.getElementById('stat-curr-ao12')!;
  const statBestAo12 = document.getElementById('stat-best-ao12')!;

  const quickLastTime = document.getElementById('quick-last-time')!;
  const quickLastPenalty = document.getElementById('quick-last-penalty')!;
  const quickAo5 = document.getElementById('quick-ao5')!;
  const quickAo12 = document.getElementById('quick-ao12')!;

  const historyContainer = document.getElementById('history-table-container')!;
  const btnClearSolves = document.getElementById('btn-clear-solves') as HTMLButtonElement;

  const renderStatsAndHistory = (solves: Solve[]) => {
    const stats = calculateStatistics(solves);

    statCount.textContent = String(stats.solveCount);
    statBest.textContent = formatStatTime(stats.bestSingle);
    statWorst.textContent = formatStatTime(stats.worstSingle);
    statMean.textContent = formatStatTime(stats.mean);
    statCurrAo5.textContent = formatStatTime(stats.currentAo5);
    statBestAo5.textContent = formatStatTime(stats.bestAo5);
    statCurrAo12.textContent = formatStatTime(stats.currentAo12);
    statBestAo12.textContent = formatStatTime(stats.bestAo12);

    if (solves.length > 0) {
      const last = solves[solves.length - 1]!;
      quickLastTime.textContent = formatTime(last.rawTime, last.penalty);
      if (last.penalty === '+2') {
        quickLastPenalty.innerHTML = '<span class="penalty-tag plus2">+2</span>';
      } else if (last.penalty === 'DNF') {
        quickLastPenalty.innerHTML = '<span class="penalty-tag dnf">DNF</span>';
      } else {
        quickLastPenalty.innerHTML = '';
      }
    } else {
      quickLastTime.textContent = '--';
      quickLastPenalty.innerHTML = '';
    }

    quickAo5.textContent = formatStatTime(stats.currentAo5);
    quickAo12.textContent = formatStatTime(stats.currentAo12);

    // History Table
    if (solves.length === 0) {
      historyContainer.innerHTML = `
        <div class="history-empty-state">
          <p>No solves recorded yet in this session.</p>
          <span style="font-size:0.75rem;color:var(--text-muted)">Press and hold Space (1s) to start timing!</span>
        </div>
      `;
      return;
    }

    const reversed = [...solves].reverse();
    let table = `
      <table class="history-table">
        <thead>
          <tr>
            <th class="history-index">#</th>
            <th>Time</th>
            <th>Penalty</th>
            <th>Scramble</th>
            <th class="history-actions-col"></th>
          </tr>
        </thead>
        <tbody>
    `;

    reversed.forEach((s, idx) => {
      const num = solves.length - idx;
      const isDnf = s.penalty === 'DNF';
      table += `
        <tr>
          <td class="history-index">${num}</td>
          <td class="history-time ${isDnf ? 'dnf' : ''}">${formatTime(s.rawTime, s.penalty)}</td>
          <td>
            <div class="history-penalty-btn-group">
              <button class="penalty-btn ${s.penalty === 'OK' ? 'active-ok' : ''}" data-solve-id="${s.id}" data-penalty="OK">OK</button>
              <button class="penalty-btn ${s.penalty === '+2' ? 'active-plus2' : ''}" data-solve-id="${s.id}" data-penalty="+2">+2</button>
              <button class="penalty-btn ${s.penalty === 'DNF' ? 'active-dnf' : ''}" data-solve-id="${s.id}" data-penalty="DNF">DNF</button>
            </div>
          </td>
          <td class="history-scramble-col" title="${s.scramble}">${s.scramble}</td>
          <td class="history-actions-col">
            <button class="history-delete-btn" data-solve-id="${s.id}" title="Delete solve" aria-label="Delete solve ${num}">×</button>
          </td>
        </tr>
      `;
    });

    table += '</tbody></table>';
    historyContainer.innerHTML = table;
  };

  solvesManager.subscribe(renderStatsAndHistory);

  btnClearSolves.addEventListener('click', () => {
    const list = solvesManager.getSolves();
    if (list.length === 0) return;
    if (window.confirm(`Delete all ${list.length} recorded solves in this session?`)) {
      solvesManager.clearAll();
    }
  });

  historyContainer.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const penBtn = target.closest<HTMLButtonElement>('.penalty-btn');
    if (penBtn && penBtn.dataset.solveId && penBtn.dataset.penalty) {
      solvesManager.updatePenalty(penBtn.dataset.solveId, penBtn.dataset.penalty as PenaltyType);
      return;
    }

    const delBtn = target.closest<HTMLButtonElement>('.history-delete-btn');
    if (delBtn && delBtn.dataset.solveId) {
      solvesManager.deleteSolve(delBtn.dataset.solveId);
    }
  });

  // 7. Notation Trainer (Outer + Middle slices M, E, S)
  const trainerGrid = document.getElementById('trainer-grid-container');
  if (trainerGrid) {
    const movesList = [
      'R', "R'", 'R2',
      'L', "L'", 'L2',
      'U', "U'", 'U2',
      'D', "D'", 'D2',
      'F', "F'", 'F2',
      'B', "B'", 'B2',
      'M', "M'", 'M2',
      'E', "E'", 'E2',
      'S', "S'", 'S2'
    ];

    trainerGrid.innerHTML = '';
    for (const m of movesList) {
      const card = document.createElement('div');
      card.className = 'trainer-item';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${m}: ${MOVE_DESCRIPTIONS[m] || ''}. Click to preview on 3D cube.`);

      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="trainer-move-badge">${m}</span>
          <span style="font-size:0.75rem;color:var(--text-muted)">▶</span>
        </div>
        <span class="trainer-move-desc">${MOVE_DESCRIPTIONS[m] || ''}</span>
      `;

      const trigger = async () => {
        if (cube && !cube.isAnimating()) {
          card.style.borderColor = 'var(--accent-primary)';
          await cube.executeMove(m);
          setTimeout(() => {
            card.style.borderColor = '';
          }, 300);
        }
      };

      card.addEventListener('click', trigger);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger();
        }
      });

      trainerGrid.appendChild(card);
    }
  }

  // 8. Hold Threshold Toggle (1.0s vs 2.0s)
  const btnHoldToggle = document.getElementById('btn-hold-toggle') as HTMLButtonElement;
  const holdLabel = document.getElementById('hold-threshold-label')!;

  const setHoldThreshold = (ms: number) => {
    timer.setHoldThreshold(ms);
    holdLabel.textContent = `Hold: ${(ms / 1000).toFixed(1)}s`;
    storage.setItem('rubik_timer_hold_ms', ms);
  };
  setHoldThreshold(savedHoldMs);

  btnHoldToggle.addEventListener('click', () => {
    const next = timer.getHoldThreshold() === 1000 ? 2000 : 1000;
    setHoldThreshold(next);
  });

  // 9. Theme Toggle
  const btnThemeToggle = document.getElementById('btn-theme-toggle') as HTMLButtonElement;
  const getStoredOrSystemTheme = (): 'dark' | 'light' => {
    const stored = storage.getItem<'dark' | 'light' | null>('rubik_timer_theme', null);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }

    return 'dark';
  };

  const applyTheme = (t: 'dark' | 'light') => {
    document.documentElement.setAttribute('data-theme', t);
    storage.setItem('rubik_timer_theme', t);
    btnThemeToggle.setAttribute('aria-pressed', String(t === 'light'));
    btnThemeToggle.setAttribute('aria-label', `Switch to ${t === 'light' ? 'dark' : 'light'} theme`);
    cube?.setThemeMode(t);
  };

  const initialTheme = getStoredOrSystemTheme();
  applyTheme(initialTheme);

  btnThemeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    applyTheme(isLight ? 'dark' : 'light');
  });

  // 10. Navigation Tabs
  const navButtons = document.querySelectorAll<HTMLButtonElement>('.nav-tab-btn');
  const dualView = document.getElementById('view-dual')!;
  const dualGrid = dualView.querySelector('.dual-view-grid')!;
  const viewTrainer = document.getElementById('view-trainer')!;
  const statsCard = document.querySelector('.dashboard-bottom-grid') as HTMLElement;

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      navButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      dualGrid.classList.remove('mode-timer-solo', 'mode-cube-solo');

      if (tab === 'trainer') {
        dualView.style.display = 'none';
        viewTrainer.style.display = 'block';
      } else {
        dualView.style.display = 'block';
        viewTrainer.style.display = 'none';

        if (tab === 'timer') {
          dualGrid.classList.add('mode-timer-solo');
        } else if (tab === 'cube') {
          dualGrid.classList.add('mode-cube-solo');
        } else if (tab === 'stats') {
          statsCard.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
});
