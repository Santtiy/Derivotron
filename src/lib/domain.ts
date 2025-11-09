export type DomainSample = { x: number; y: number; valid: boolean; value?: number };

/**
 * Escanea una malla rectilínea y devuelve validez y estimación de rango.
 */
export function analyzeDomainAndRange(
  evalFn: (x: number, y: number) => number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  nx = 80,
  ny = 80
) {
  const dx = (xMax - xMin) / nx;
  const dy = (yMax - yMin) / ny;
  const samples: { x: number; y: number; valid: boolean; value?: number }[] = [];
  const values: number[] = [];
  for (let i = 0; i <= nx; i++) {
    const x = xMin + i * dx;
    for (let j = 0; j <= ny; j++) {
      const y = yMin + j * dy;
      let v = NaN;
      try { v = Number(evalFn(x, y)); } catch { v = NaN; }
      const valid = Number.isFinite(v);
      samples.push({ x, y, valid, value: valid ? v : undefined });
      if (valid) values.push(v);
    }
  }
  const range = values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
  return { samples, range };
}