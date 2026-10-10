// Standalone ES Module Cube Solver
// @ts-ignore - native ESM vendor module
import Cube from '../assets/vendor/cubejs.js';
import { generateScramble } from './scramble.js';
let solverInitialized = false;
function ensureSolver() {
    if (!solverInitialized) {
        try {
            Cube.initSolver();
            solverInitialized = true;
        }
        catch (err) {
            console.warn('[cube-solver] Could not initialize solver tables:', err);
        }
    }
}
export class CubeSolver {
    cube;
    constructor(cubeInstance) {
        if (cubeInstance) {
            this.cube = cubeInstance.clone();
        }
        else {
            this.cube = new Cube();
        }
        ensureSolver();
    }
    clone() {
        return new CubeSolver(this.cube);
    }
    reset() {
        this.cube.identity();
    }
    isSolved() {
        return this.cube.isSolved();
    }
    move(sequence) {
        const trimmed = sequence.trim();
        if (!trimmed)
            return;
        this.cube.move(trimmed);
    }
    /**
     * Computes Herbert Kociemba's two-phase solution.
     * Returns space-separated move sequence.
     */
    solve() {
        if (this.isSolved()) {
            return '';
        }
        ensureSolver();
        const solution = this.cube.solve();
        return solution.trim();
    }
    scramble() {
        try {
            ensureSolver();
            const scramble = Cube.scramble();
            this.move(scramble);
            return scramble;
        }
        catch {
            const fallback = generateScramble(21);
            this.move(fallback);
            return fallback;
        }
    }
}
