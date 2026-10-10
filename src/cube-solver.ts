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
    } catch (err) {
      console.warn('[cube-solver] Could not initialize solver tables:', err);
    }
  }
}

export class CubeSolver {
  private cube: any;

  constructor(cubeInstance?: any) {
    if (cubeInstance) {
      this.cube = cubeInstance.clone();
    } else {
      this.cube = new Cube();
    }
    ensureSolver();
  }

  public clone(): CubeSolver {
    return new CubeSolver(this.cube);
  }

  public reset(): void {
    this.cube.identity();
  }

  public isSolved(): boolean {
    return this.cube.isSolved();
  }

  public move(sequence: string): void {
    const trimmed = sequence.trim();
    if (!trimmed) return;
    this.cube.move(trimmed);
  }

  /**
   * Computes Herbert Kociemba's two-phase solution.
   * Returns space-separated move sequence.
   */
  public solve(): string {
    if (this.isSolved()) {
      return '';
    }
    ensureSolver();
    const solution = this.cube.solve();
    return solution.trim();
  }

  public scramble(): string {
    try {
      ensureSolver();
      const scramble = Cube.scramble();
      this.move(scramble);
      return scramble;
    } catch {
      const fallback = generateScramble(21);
      this.move(fallback);
      return fallback;
    }
  }
}
