const FACES = ['U', 'D', 'L', 'R', 'F', 'B'] as const;
type Face = typeof FACES[number];

const OPPOSITE_FACES: Record<Face, Face> = {
  U: 'D',
  D: 'U',
  L: 'R',
  R: 'L',
  F: 'B',
  B: 'F'
};

const MODIFIERS = ['', "'", '2'] as const;

/**
 * Generates a valid WCA-constrained 3x3x3 scramble.
 * Guarantees:
 * 1. No two consecutive moves on the same face.
 * 2. No opposing face commuting moves separated by 1 move (e.g. no R L R).
 */
export function generateScramble(length = 21): string {
  const moves: string[] = [];
  let lastFace: Face | null = null;
  let secondLastFace: Face | null = null;

  for (let i = 0; i < length; i++) {
    let face: Face;
    do {
      face = FACES[Math.floor(Math.random() * FACES.length)]!;
      if (face === lastFace) continue;
      if (secondLastFace === face && lastFace !== null && OPPOSITE_FACES[lastFace] === face) {
        continue;
      }
      break;
    } while (true);

    const modifier = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)]!;
    moves.push(`${face}${modifier}`);

    secondLastFace = lastFace;
    lastFace = face;
  }

  return moves.join(' ');
}
