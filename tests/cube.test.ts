import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { CubeSolver } from '../src/cube-solver.js';
import { invertMove, invertSequence } from '../src/notation.js';
import { VirtualCube } from '../src/cube.js';

describe('cube.test.ts', () => {
  it('starts in solved state', () => {
    const cube = new CubeSolver();
    expect(cube.isSolved()).toBe(true);
    expect(cube.solve()).toBe('');
  });

  it('a move followed by its inverse restores solved state for all moves including M, E, S', () => {
    const testMoves = [
      'U', 'D', 'L', 'R', 'F', 'B',
      'M', 'E', 'S'
    ];

    for (const m of testMoves) {
      const cube = new CubeSolver();
      cube.move(m);
      expect(cube.isSolved()).toBe(false);

      const inv = invertMove(m);
      cube.move(inv);
      expect(cube.isSolved()).toBe(true);
    }
  });

  it('four quarter turns of any face or middle slice restore solved state', () => {
    const moves = ['U', 'D', 'L', 'R', 'F', 'B', 'M', 'E', 'S'];

    for (const m of moves) {
      const cube = new CubeSolver();
      cube.move(`${m} ${m} ${m} ${m}`);
      expect(cube.isSolved()).toBe(true);
    }
  });

  it('two half turns of any face or middle slice restore solved state', () => {
    const halfMoves = ['U2', 'D2', 'L2', 'R2', 'F2', 'B2', 'M2', 'E2', 'S2'];

    for (const m of halfMoves) {
      const cube = new CubeSolver();
      cube.move(`${m} ${m}`);
      expect(cube.isSolved()).toBe(true);
    }
  });

  it('middle slice moves preserve cube validity and can be inverted', () => {
    const cube = new CubeSolver();
    const seq = "M U M' U'";
    cube.move(seq);
    expect(cube.isSolved()).toBe(false);

    cube.move(invertSequence(seq));
    expect(cube.isSolved()).toBe(true);
  });

  it('scramble changes the actual cube state', () => {
    const cube = new CubeSolver();
    const scramble = cube.scramble();
    expect(scramble.length).toBeGreaterThan(0);
    expect(cube.isSolved()).toBe(false);
  });

  it('updates the scene background when the theme color changes', () => {
    const container = document.createElement('div');
    const cube = new VirtualCube(container as HTMLElement);
    const colorSpy = vi.fn();
    const sceneBackground = new THREE.Color(0x111419);

    (cube as any).renderer = { setClearColor: colorSpy };
    (cube as any).scene = { background: sceneBackground };

    cube.setThemeBackgroundColor(0xf6f8fb);

    expect(colorSpy).toHaveBeenCalledWith(0xf6f8fb, 1);
    expect((cube as any).scene.background.getHex()).toBe(0xf6f8fb);
  });

  it('solver returns a valid solution from the current state after additional manual moves', () => {
    const cube = new CubeSolver();
    cube.move("R U R' U' F2 D B2 L");
    cube.move('R');
    cube.move("U'");
    expect(cube.isSolved()).toBe(false);

    const solution = cube.solve();
    expect(solution.length).toBeGreaterThan(0);

    cube.move(solution);
    expect(cube.isSolved()).toBe(true);
  });

  it('solver handles valid middle-slice states and solves them', () => {
    const cube = new CubeSolver();
    cube.move("M U M' U'");
    expect(cube.isSolved()).toBe(false);

    const solution = cube.solve();
    expect(solution.length).toBeGreaterThan(0);

    cube.move(solution);
    expect(cube.isSolved()).toBe(true);
  });

  it('throws a controlled error for invalid cube state metadata', () => {
    const cube = new CubeSolver();
    (cube as any).cube = {
      toJSON: () => ({ center: [0, 1, 2, 3, 4, 5, 6], cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0], ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }),
      isSolved: () => false,
      solve: () => 'R'
    };

    expect(() => cube.solve()).toThrow(/Invalid cube state/i);
  });
});
