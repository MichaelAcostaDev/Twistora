# Twistora

> Twistora: A clean, high-precision speedcubing timer and interactive 3D Rubik's Cube simulator with an automated Herbert Kociemba two-phase solver.

---

## 1. Overview & Features

### ⏱️ Professional Speedcubing Timer
- **High-Precision Timing**: Millisecond precision derived directly from `performance.now()` differences and rendered using `requestAnimationFrame`. Formatted in standard speedcubing notation: `00:00.00` (minutes, seconds, hundredths).
- **Explicit 5-State Machine**: `idle`, `holding`, `ready`, `running`, `stopped`.
- **Hold-to-Ready Mechanics**:
  - Hold **Space** (or click/touch & hold) continuously for the configurable readiness threshold (default **1.0 second**, switchable to **2.0 seconds**).
  - Digits turn vibrant emerald green when ready.
  - Releasing after the threshold immediately starts timing.
  - Releasing before the threshold cancels the hold without starting.
  - Pressing Space or clicking/tapping while running immediately stops the timer and saves the solve.
  - Safe against repeated keydown events (`e.repeat`), lost focus (`window.blur`), visibility changes, and page scrolling.
- **Solve Management & Penalties**:
  - Automatically records solve ID, timestamp, raw time, scramble, penalty, and final time.
  - Supports **OK** (no penalty), **+2** (adds 2 seconds), and **DNF** (Did Not Finish).
  - Allows deleting individual solves or clearing the entire session history with confirmation.
  - Defensive `localStorage` persistence with in-memory fallback.

### 📊 WCA-Compliant Performance Statistics
- **Solves Counter**: Total completed solves in current session.
- **Best Single & Worst Single**: Automatically derived, distinguishing raw and penalized times.
- **Session Mean**: Arithmetic mean of all valid (non-DNF) solves.
- **Current & Best Ao5**: Standard World Cube Association (WCA) Rule 9f trimmed average of 5 (fastest and slowest are trimmed, remaining 3 averaged). If 1 solve is DNF, it is trimmed as slowest; if 2+ are DNF, Ao5 is DNF.
- **Current & Best Ao12**: Trimmed average of 12 (fastest and slowest trimmed, 10 middle averaged).

### 🎲 Valid 3×3×3 Scramble Generator
- Generates 21-move scrambles satisfying all standard move constraints:
  - No two consecutive turns on the same face.
  - No commuting redundant turns on opposite faces separated by 1 move (e.g. no `R L R`).
- Generates random-state scrambles using Kociemba solver tables.
- Scrambles are preserved with every recorded solve attempt.
- Includes **New Scramble**, **Copy to Clipboard**, and **Apply to 3D Cube** buttons.

### 🧊 Interactive 3D Rubik's Cube Simulator & Solver
- **Genuine 3D Architecture**: Powered by **Three.js** with 26 visible cubies surrounding a central void, proper sticker colors (White opposite Yellow, Green opposite Blue, Red opposite Orange), and dark core plastic.
- **Full Singmaster Move Notation**:
  - **Outer Face Turns**: `U, U', U2`, `D, D', D2`, `L, L', L2`, `R, R', R2`, `F, F', F2`, `B, B', B2`.
  - **Middle Slice Turns**:
    - `M, M', M2`: Middle slice between L and R (rotates in L direction).
    - `E, E', E2`: Equatorial slice between U and D (rotates in D direction).
    - `S, S', S2`: Standing slice between F and B (rotates in F direction).
- **OrbitControls**: Rotate the camera around the cube, zoom in/out within limits, and reset view.
- **Smooth Face Turn Animations**:
  - Three.js pivot group rotation with cubic ease-in-out interpolation.
  - Positions and rotations snapped to clean integer grid coordinates upon completion to prevent floating-point drift.
  - Configurable animation speed: **Fast (100ms)**, **Normal (200ms)**, **Slow (400ms)**.
- **Automated Kociemba Two-Phase Solver**:
  - Reads mathematical state and computes an optimal/near-optimal solution sequence.
  - Displays computed solution banner and animates moves step-by-step with a live step counter (`Move X of Y`).
  - Mathematically verifies that the final state is solved.
- **Manual Face Controls**: Fast access to all 27 standard face and slice moves.
- **Notation Trainer**: Interactive guide explaining every face and slice turn in English with live 3D execution preview.
- **WebGL Fallback**: Gracefully informs users if WebGL graphics acceleration is unavailable while keeping the timer, scrambles, and statistics fully operational.

---

## 2. Simplified Architecture (No Vite, No Font Awesome)

```
rubik-timer-3d/
├── index.html                 # Semantic HTML5 entrypoint with native import maps & SVG icons
├── package.json               # Clean package metadata, scripts, and dependencies
├── tsconfig.json              # Strict TypeScript compiler configuration
├── server.js                  # Zero-dependency static development server
├── README.md                  # Documentation and development guide
├── src/
│   ├── main.ts                # Application initialization and UI event wiring
│   ├── timer.ts               # Timer 5-state machine and keyboard/pointer handling
│   ├── scramble.ts            # WCA-constrained 3x3 scramble generator
│   ├── statistics.ts          # WCA Ao5/Ao12 trimmed averages & solve history management
│   ├── storage.ts             # Defensive localStorage wrapper with fallback
│   ├── cube.ts                # Three.js 3D scene, 26 cubies, slice rotations & OrbitControls
│   ├── cube-solver.ts         # Herbert Kociemba Two-Phase Algorithm solver integration
│   └── notation.ts            # Singmaster notation parser (outer faces + M, E, S slices)
├── styles/
│   ├── main.css               # Design tokens, responsive grid, header, footer, SVG styling
│   ├── timer.css              # Monospace timer typography, hold progress bar, states
│   └── cube.css               # 3D canvas viewport, overlay badges, move panel, trainer grid
├── assets/
│   ├── icons/                 # Application icons
│   └── vendor/
│       └── cubejs.js          # Standalone native ES module build of Kociemba solver
└── tests/
    ├── timer.test.ts          # Timer state machine, threshold, and statistics tests
    ├── notation.test.ts       # Notation parser, slice moves (M, E, S), and inversion tests
    └── cube.test.ts           # Cube solver, 4-cycles, middle slices, and scramble tests
```

---

## 3. Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
npm install
```

### Compiling TypeScript
Compiles all TypeScript files directly using `tsc` to `./dist`:
```bash
npm run build
```

### Starting the Local Development Server
Starts the zero-dependency local static development server on port `5173`:
```bash
npm start
# or
npm run dev
```
Open [http://127.0.0.1:5173](http://127.0.0.1:5173) in your browser.

### Running Automated Tests
Runs all unit tests in `tests/` using Vitest:
```bash
npm test
```

### Type Checking
Performs strict TypeScript static analysis without emitting files:
```bash
npm run typecheck
```

---

## 4. Developer Credit

**Made by MichaelAcostaDev**

- GitHub: [https://github.com/MichaelAcostaDev](https://github.com/MichaelAcostaDev)
- LinkedIn: [https://www.linkedin.com/in/michael-acosta-dev](https://www.linkedin.com/in/michael-acosta-dev)
