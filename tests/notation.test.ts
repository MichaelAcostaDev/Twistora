import { describe, it, expect } from 'vitest';
import {
  parseToken,
  parseSequence,
  isValidMove,
  invertMove,
  invertSequence,
  VALID_MOVES
} from '../src/notation.js';

describe('notation.ts', () => {
  it('validates all 27 standard Singmaster moves (18 outer + 9 middle slices)', () => {
    expect(VALID_MOVES.size).toBe(27);

    const expected = [
      'U', "U'", 'U2',
      'D', "D'", 'D2',
      'L', "L'", 'L2',
      'R', "R'", 'R2',
      'F', "F'", 'F2',
      'B', "B'", 'B2',
      'M', "M'", 'M2',
      'E', "E'", 'E2',
      'S', "S'", 'S2'
    ];

    for (const m of expected) {
      expect(isValidMove(m)).toBe(true);
      expect(parseToken(m)).not.toBeNull();
    }
  });

  it('rejects invalid notation tokens', () => {
    expect(isValidMove('X')).toBe(false);
    expect(isValidMove('R3')).toBe(false);
    expect(isValidMove("U''")).toBe(false);
    expect(isValidMove('foo')).toBe(false);

    expect(() => parseSequence("R U X R'")).toThrowError('Invalid cube move notation: "X"');
  });

  it('correctly maps middle slice axes, layer=0, and angles', () => {
    // M turns in direction of L on X axis
    const m = parseToken('M');
    expect(m?.axis).toBe('x');
    expect(m?.layer).toBe(0);
    expect(m?.angle).toBe(Math.PI / 2);

    const mPrime = parseToken("M'");
    expect(mPrime?.axis).toBe('x');
    expect(mPrime?.layer).toBe(0);
    expect(mPrime?.angle).toBe(-Math.PI / 2);

    // E turns in direction of D on Y axis
    const e = parseToken('E');
    expect(e?.axis).toBe('y');
    expect(e?.layer).toBe(0);
    expect(e?.angle).toBe(Math.PI / 2);

    // S turns in direction of F on Z axis
    const s = parseToken('S');
    expect(s?.axis).toBe('z');
    expect(s?.layer).toBe(0);
    expect(s?.angle).toBe(-Math.PI / 2);
  });

  it('inverts single moves correctly', () => {
    expect(invertMove('R')).toBe("R'");
    expect(invertMove("R'")).toBe('R');
    expect(invertMove('R2')).toBe('R2');
    expect(invertMove('M')).toBe("M'");
    expect(invertMove("M'")).toBe('M');
    expect(invertMove('M2')).toBe('M2');
  });

  it('inverts move sequences correctly', () => {
    expect(invertSequence("R U R' U'")).toBe("U R U' R'");
    expect(invertSequence("M U M' U'")).toBe("U M U' M'");
  });
});
