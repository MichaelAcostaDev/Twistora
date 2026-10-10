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

  it('solver returns a valid solution and applying it solves the cube', () => {
    const cube = new CubeSolver();
    const scramble = "R U R' U' F2 D B2 L";
    cube.move(scramble);
    expect(cube.isSolved()).toBe(false);

    const solution = cube.solve();
    expect(solution.length).toBeGreaterThan(0);

    cube.move(solution);
    expect(cube.isSolved()).toBe(true);
  });
});
