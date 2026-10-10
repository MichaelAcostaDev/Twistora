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

  public validateState(): void {
    if (!this.cube || typeof this.cube.toJSON !== 'function') {
      throw new Error('Invalid cube state: the cube state is unavailable.');
    }

    const state = this.cube.toJSON();

    const validateRange = (values: number[], length: number, label: string, min: number, max: number) => {
      if (!Array.isArray(values) || values.length !== length) {
        throw new Error(`Invalid cube state: ${label} must contain ${length} entries.`);
      }

      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (!Number.isInteger(value) || value < min || value > max) {
          throw new Error(`Invalid cube state: ${label}[${i}] is out of range (${min}..${max}).`);
        }
      }
    };

    validateRange(state.center, 6, 'center', 0, 5);
    validateRange(state.cp, 8, 'cp', 0, 7);
    validateRange(state.co, 8, 'co', 0, 2);
    validateRange(state.ep, 12, 'ep', 0, 11);
    validateRange(state.eo, 12, 'eo', 0, 1);

    const cornerSet = new Set(state.cp);
    if (cornerSet.size !== 8) {
      throw new Error('Invalid cube state: corner permutation contains duplicates or missing pieces.');
    }

    const edgeSet = new Set(state.ep);
    if (edgeSet.size !== 12) {
      throw new Error('Invalid cube state: edge permutation contains duplicates or missing pieces.');
    }

    const centerSet = new Set(state.center);
    if (centerSet.size !== 6) {
      throw new Error('Invalid cube state: center mapping contains duplicates or missing faces.');
    }
  }

  public move(sequence: string): void {
    const trimmed = sequence.trim();
    if (!trimmed) return;
    this.cube.move(trimmed);
  }

  /**
   * Computes Herbert Kociemba's two-phase solution from the current mathematical state.
   * Returns space-separated move sequence.
   */
  public solve(): string {
    if (this.isSolved()) {
      return '';
    }
    this.validateState();
    ensureSolver();
    const solution = this.cube.solve();
    if (typeof solution !== 'string' || solution.trim().length === 0) {
      throw new Error('Unable to compute a valid solution for the current cube state.');
    }
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
