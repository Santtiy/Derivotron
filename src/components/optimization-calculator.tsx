"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { create, all } from "mathjs";
import { numericHessian, classify } from "../lib/hessian";

const math = create(all, { number: "number" });

export type Candidate = { x: number; y: number; f: number; lambda: number };

interface OptimizationCalculatorProps {
  functionExpr: string;
  onCandidatesChange?: (pts: Candidate[]) => void; // 🔹 Callback opcional para SurfaceVisualizer
}

export default function OptimizationCalculator({
  functionExpr,
  onCandidatesChange,
}: OptimizationCalculatorProps) {
  const [constraint, setConstraint] = useState("x^2 + y^2 - 4");
  const [results, setResults] = useState<{ criticalPoints: Array<Candidate> } | null>(null);

  // -------- Compilación segura --------
  const compiled = useMemo(() => {
    try {
      return {
        f: math.compile(functionExpr || "x^2 + y^2"),
        g: math.compile(constraint),
      };
    } catch {
      return null;
    }
  }, [functionExpr, constraint]);

  const feval = (x: number, y: number) => {
    if (!compiled) return NaN;
    try {
      const v = compiled.f.evaluate({ x, y, e: Math.E, pi: Math.PI });
      return Number.isFinite(v) ? Number(v) : NaN;
    } catch {
      return NaN;
    }
  };

  const geval = (x: number, y: number) => {
    if (!compiled) return NaN;
    try {
      const v = compiled.g.evaluate({ x, y, e: Math.E, pi: Math.PI });
      return Number.isFinite(v) ? Number(v) : NaN;
    } catch {
      return NaN;
    }
  };

  // -------- Derivadas numéricas centradas --------
  const h = 1e-4;
  const dfdx = (x: number, y: number) => (feval(x + h, y) - feval(x - h, y)) / (2 * h);
  const dfdy = (x: number, y: number) => (feval(x, y + h) - feval(x, y - h)) / (2 * h);
  const dgdx = (x: number, y: number) => (geval(x + h, y) - geval(x - h, y)) / (2 * h);
  const dgdy = (x: number, y: number) => (geval(x, y + h) - geval(x, y - h)) / (2 * h);

  const d2 = (fn: (x: number, y: number) => number, x: number, y: number) => ({
    xx: (fn(x + h, y) - 2 * fn(x, y) + fn(x - h, y)) / (h * h),
    yy: (fn(x, y + h) - 2 * fn(x, y) + fn(x, y - h)) / (h * h),
    xy:
      (fn(x + h, y + h) - fn(x + h, y - h) - fn(x - h, y + h) + fn(x - h, y - h)) /
      (4 * h * h),
  });

  // -------- Solver lineal 3x3 --------
  function solve3(A: number[][], b: number[]): number[] | null {
    const M = [
      [A[0][0], A[0][1], A[0][2], b[0]],
      [A[1][0], A[1][1], A[1][2], b[1]],
      [A[2][0], A[2][1], A[2][2], b[2]],
    ];
    for (let i = 0; i < 3; i++) {
      let p = i;
      for (let r = i + 1; r < 3; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
      if (Math.abs(M[p][i]) < 1e-12 || !Number.isFinite(M[p][i])) return null;
      if (p !== i) [M[i], M[p]] = [M[p], M[i]];
      const div = M[i][i];
      for (let j = i; j < 4; j++) M[i][j] /= div;
      for (let r = 0; r < 3; r++) {
        if (r === i) continue;
        const k = M[r][i];
        for (let j = i; j < 4; j++) M[r][j] -= k * M[i][j];
      }
    }
    return [M[0][3], M[1][3], M[2][3]];
  }

  // -------- Newton 3D para Lagrange --------
  function newtonLagrange(
    x0: number,
    y0: number,
    lambda0 = 0,
    tol = 1e-6,
    maxIt = 60
  ): { x: number; y: number; lambda: number; ok: boolean } {
    let x = x0,
      y = y0,
      lam = lambda0;
    for (let it = 0; it < maxIt; it++) {
      const fx = dfdx(x, y),
        fy = dfdy(x, y);
      const gx = dgdx(x, y),
        gy = dgdy(x, y);
      const g = geval(x, y);
      if (![fx, fy, gx, gy, g].every(Number.isFinite)) break;

      const F1 = fx - lam * gx;
      const F2 = fy - lam * gy;
      const F3 = g;

      const resid = Math.max(Math.abs(F1), Math.abs(F2), Math.abs(F3));
      if (resid < tol) return { x, y, lambda: lam, ok: true };

      const Hf = d2(feval, x, y);
      const Hg = d2(geval, x, y);

      const A = [
        [Hf.xx - lam * Hg.xx, Hf.xy - lam * Hg.xy, -gx],
        [Hf.xy - lam * Hg.xy, Hf.yy - lam * Hg.yy, -gy],
        [gx, gy, 0],
      ];
      const rhs = [-F1, -F2, -F3];
      const delta = solve3(A, rhs);
      if (!delta) break;

      let step = 1.0;
      let xn = x + step * delta[0];
      let yn = y + step * delta[1];
      let ln = lam + step * delta[2];
      let tries = 0;
      while (
        tries < 8 &&
        (![xn, yn, ln].every(Number.isFinite) || Math.hypot(xn - x, yn - y) > 1e3)
      ) {
        step *= 0.5;
        xn = x + step * delta[0];
        yn = y + step * delta[1];
        ln = lam + step * delta[2];
        tries++;
      }

      x = xn;
      y = yn;
      lam = ln;
      if (Math.hypot(delta[0] * step, delta[1] * step) < tol) {
        return { x, y, lambda: lam, ok: true };
      }
    }
    return { x, y, lambda: lam, ok: false };
  }

  // -------- Generar semillas alrededor de g=0 --------
  function generateSeeds(): Array<{ x: number; y: number; lambda: number }> {
    const seeds: Array<{ x: number; y: number; lambda: number }> = [];
    const range = 5,
      step = 0.5,
      tolG = 0.15;
    for (let x = -range; x <= range; x += step) {
      for (let y = -range; y <= range; y += step) {
        const gv = geval(x, y);
        if (!Number.isFinite(gv) || Math.abs(gv) > tolG) continue;
        const gx = dgdx(x, y),
          gy = dgdy(x, y);
        const gf = { x: dfdx(x, y), y: dfdy(x, y) };
        const denom = gx * gx + gy * gy;
        const lam0 = denom > 1e-12 ? (gf.x * gx + gf.y * gy) / denom : 0;
        seeds.push({ x, y, lambda: lam0 });
      }
    }
    return seeds;
  }

  // -------- Ejecutar búsqueda completa --------
  const optimize = () => {
    try {
      if (!compiled) return;

      const seeds = generateSeeds();
      const found: Candidate[] = [];
      const seen: { x: number; y: number }[] = [];

      const isNear = (a: { x: number; y: number }, b: { x: number; y: number }) =>
        Math.hypot(a.x - b.x, a.y - b.y) < 0.2;

      for (const s of seeds) {
        const out = newtonLagrange(s.x, s.y, s.lambda, 1e-6, 60);
        if (!out.ok || ![out.x, out.y].every(Number.isFinite)) continue;

        const fx = dfdx(out.x, out.y),
          fy = dfdy(out.x, out.y);
        const gx = dgdx(out.x, out.y),
          gy = dgdy(out.x, out.y);
        const g = geval(out.x, out.y);
        const r1 = Math.abs(fx - out.lambda * gx);
        const r2 = Math.abs(fy - out.lambda * gy);
        const r3 = Math.abs(g);
        const resid = Math.max(r1, r2, r3);
        if (!(resid < 1e-4)) continue;

        if (seen.some((p) => isNear(p, out))) continue;
        seen.push({ x: out.x, y: out.y });

        found.push({
          x: Number.parseFloat(out.x.toFixed(6)),
          y: Number.parseFloat(out.y.toFixed(6)),
          f: Number.parseFloat(feval(out.x, out.y).toFixed(6)),
          lambda: Number.parseFloat(out.lambda.toFixed(6)),
        });

        if (found.length > 20) break;
      }

      found.sort((a, b) => a.f - b.f);
      setResults({ criticalPoints: found });

      onCandidatesChange?.(found);
    } catch (err) {
      console.error("[optimization] error:", err);
      setResults({ criticalPoints: [] });
      onCandidatesChange?.([]);
    }
  };

  // -------- Render --------
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="constraint" className="text-xs">
          Restricción g(x, y) = 0
        </Label>
        <Input
          id="constraint"
          value={constraint}
          onChange={(e) => setConstraint(e.target.value)}
          placeholder="x^2 + y^2 - 4"
          className="h-9 font-mono text-sm"
        />
      </div>

      <Button onClick={optimize} className="w-full" size="sm">
        Calcular con Lagrange
      </Button>

      {results && results.criticalPoints.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Puntos críticos encontrados:</Label>
          {results.criticalPoints.map((p, idx) => {
            const H = numericHessian(feval, p.x, p.y);
            const tipo = classify(H.dxx, H.dyy, H.dxy);
            return (
              <Card key={idx} className="bg-muted/50 p-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Punto:</span>
                    <span className="font-mono">
                      ({p.x.toFixed(2)}, {p.y.toFixed(2)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">f(x, y):</span>
                    <span className="font-mono font-medium">{p.f.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">λ:</span>
                    <span className="font-mono">{p.lambda.toFixed(4)}</span>
                  </div>
                  <div className="text-xs text-gray-400">Clasificación: {tipo}</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {results && results.criticalPoints.length === 0 && (
        <Card className="bg-muted/30 p-4">
          <p className="text-center text-xs text-muted-foreground">
            No se encontraron puntos críticos. Intenta con otra restricción o cambia la función.
          </p>
        </Card>
      )}
    </div>
  );
}

// Removed obsolete runOptimization helper; use the optimize() handler within the component instead.
