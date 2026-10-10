export type MoveModifier = '' | "'" | '2';

export interface MoveInfo {
  face: string;
  modifier: MoveModifier;
  raw: string;
  axis: 'x' | 'y' | 'z';
  layer: number; // -1, 0, or 1
  angle: number; // in radians
}

export const VALID_MOVES = new Set([
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'L', "L'", 'L2',
  'R', "R'", 'R2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
  'M', "M'", 'M2',
  'E', "E'", 'E2',
  'S', "S'", 'S2'
]);

export const MOVE_DESCRIPTIONS: Record<string, string> = {
  // Outer face moves
  'U': 'Turn Up (top) face 90° clockwise',
  "U'": 'Turn Up (top) face 90° counterclockwise',
  'U2': 'Turn Up (top) face 180°',
  'D': 'Turn Down (bottom) face 90° clockwise',
  "D'": 'Turn Down (bottom) face 90° counterclockwise',
  'D2': 'Turn Down (bottom) face 180°',
  'L': 'Turn Left face 90° clockwise',
  "L'": 'Turn Left face 90° counterclockwise',
  'L2': 'Turn Left face 180°',
  'R': 'Turn Right face 90° clockwise',
  "R'": 'Turn Right face 90° counterclockwise',
  'R2': 'Turn Right face 180°',
  'F': 'Turn Front face 90° clockwise',
  "F'": 'Turn Front face 90° counterclockwise',
  'F2': 'Turn Front face 180°',
  'B': 'Turn Back face 90° clockwise',
  "B'": 'Turn Back face 90° counterclockwise',
  'B2': 'Turn Back face 180°',

  // Middle-layer moves (Singmaster conventions)
  'M': 'Turn Middle slice 90° in L direction (between L and R)',
  "M'": 'Turn Middle slice 90° in R direction',
  'M2': 'Turn Middle slice 180°',
  'E': 'Turn Equatorial slice 90° in D direction (between U and D)',
  "E'": 'Turn Equatorial slice 90° in U direction',
  'E2': 'Turn Equatorial slice 180°',
  'S': 'Turn Standing slice 90° in F direction (between F and B)',
  "S'": 'Turn Standing slice 90° in B direction',
  'S2': 'Turn Standing slice 180°'
};

/**
 * Validates whether a token is standard Singmaster 3x3 notation (including M, E, S)
 */
export function isValidMove(token: string): boolean {
  return VALID_MOVES.has(token.trim());
}

/**
 * Parses a move token into 3D axis, layer coordinate, and rotation angle
 */
export function parseToken(token: string): MoveInfo | null {
  const trimmed = token.trim();
  const match = trimmed.match(/^([UDLRFBEMS])(['2]?)$/);
  if (!match) return null;

  const face = match[1]!;
  const modifier = match[2] as MoveModifier;

  let axis: 'x' | 'y' | 'z' = 'y';
  let layer = 0;
  let baseAngle = -Math.PI / 2;

  switch (face) {
    // Outer faces
    case 'R':
      axis = 'x';
      layer = 1;
      baseAngle = -Math.PI / 2;
      break;
    case 'L':
      axis = 'x';
      layer = -1;
      baseAngle = Math.PI / 2;
      break;
    case 'U':
      axis = 'y';
      layer = 1;
      baseAngle = -Math.PI / 2;
      break;
    case 'D':
      axis = 'y';
      layer = -1;
      baseAngle = Math.PI / 2;
      break;
    case 'F':
      axis = 'z';
      layer = 1;
      baseAngle = -Math.PI / 2;
      break;
    case 'B':
      axis = 'z';
      layer = -1;
      baseAngle = Math.PI / 2;
      break;

    // Middle slices (Singmaster rules: M follows L, E follows D, S follows F)
    case 'M':
      axis = 'x';
      layer = 0;
      baseAngle = Math.PI / 2; // turns like L
      break;
    case 'E':
      axis = 'y';
      layer = 0;
      baseAngle = Math.PI / 2; // turns like D
      break;
    case 'S':
      axis = 'z';
      layer = 0;
      baseAngle = -Math.PI / 2; // turns like F
      break;
  }

  let multiplier = 1;
  if (modifier === "'") {
    multiplier = -1;
  } else if (modifier === '2') {
    multiplier = 2;
  }

  return {
    face,
    modifier,
    raw: `${face}${modifier}`,
    axis,
    layer,
    angle: baseAngle * multiplier
  };
}

/**
 * Parses a sequence of space-separated tokens, rejecting invalid moves
 */
export function parseSequence(sequence: string): MoveInfo[] {
  if (!sequence || !sequence.trim()) return [];
  const tokens = sequence.trim().split(/\s+/);
  const result: MoveInfo[] = [];

  for (const token of tokens) {
    const parsed = parseToken(token);
    if (!parsed) {
      throw new Error(`Invalid cube move notation: "${token}"`);
    }
    result.push(parsed);
  }

  return result;
}

/**
 * Returns the inverse of a move (e.g. R -> R', R' -> R, R2 -> R2, M -> M', M' -> M)
 */
export function invertMove(move: string): string {
  const trimmed = move.trim();
  if (!isValidMove(trimmed)) {
    throw new Error(`Cannot invert invalid move: "${trimmed}"`);
  }
  if (trimmed.endsWith("'")) {
    return trimmed.slice(0, -1);
  }
  if (trimmed.endsWith('2')) {
    return trimmed;
  }
  return `${trimmed}'`;
}

/**
 * Inverts an entire move sequence
 */
export function invertSequence(sequence: string): string {
  if (!sequence.trim()) return '';
  const tokens = sequence.trim().split(/\s+/);
  return tokens
    .reverse()
    .map(t => invertMove(t))
    .join(' ');
}

export function getMoveDescription(token: string): string {
  return MOVE_DESCRIPTIONS[token] || `Turn ${token}`;
}
