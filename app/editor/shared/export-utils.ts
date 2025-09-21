// Small utilities for export-related calculations

/** Round to nearest even integer (many encoders require even dimensions). */
export function toEven(n: number): number {
  const r = Math.round(n);
  return r % 2 === 0 ? r : r + 1;
}

/**
 * Compute output dimensions from a single base value while preserving aspect.
 * Base maps to the vertical lines for landscape (height) and to width for portrait.
 * Square uses base for both.
 */
export function resolutionFromBase(base: number, aspectW: number, aspectH: number): { width: number; height: number } {
  const ar = Math.max(0.0001, aspectW / aspectH);
  if (ar >= 1) {
    // Landscape / square: base = height
    const height = Math.max(16, base);
    const width = height * ar;
    return { width: toEven(width), height: toEven(height) };
  }
  // Portrait: base = width
  const width = Math.max(16, base);
  const height = width / ar;
  return { width: toEven(width), height: toEven(height) };
}
