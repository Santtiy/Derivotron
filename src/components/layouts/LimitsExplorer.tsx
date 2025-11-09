"use client";

import React, { useMemo, useState, useEffect } from "react";
import { create, all } from "mathjs";
import { Card } from "../ui/card"; // Ajusta si tu alias "@" funciona: "@/components/ui/card"

const math = create(all, { number: "number" });

type PathSample = {
  label: string;
  points: { x: number; y: number; r: number }[];
  values: number[];
  convergesTo?: number;
  error?: string;
};

type Verdict = { status: "exists" | "diverges" | "inconclusive"; value?: number; spread?: number };

function safeCompile(expr: string) {
  try {
    // Compila una expresión en términos de x,y usando mathjs
    return math.compile(expr);
  } catch (e) {
    return null;
  }
}

function evalAt(compiled: any, x: number, y: number) {
  try {
    return Number(compiled.evaluate({ x, y }));
  } catch {
    return NaN;
  }
}

function makeRadii(n = 6, base = 0.5) {
  return Array.from({ length: n }, (_, i) => Math.pow(base, i + 1));
}

function linePaths(thetaList: number[], radii: number[], x0 = 0, y0 = 0): PathSample[] {
  return thetaList.map((theta) => {
    const pts = radii.map((r) => ({
      x: x0 + r * Math.cos(theta),
      y: y0 + r * Math.sin(theta),
      r,
    }));
    return { label: `recta θ=${theta.toFixed(2)}`, points: pts, values: [] };
  });
}

function parabolaPaths(radii: number[], x0 = 0, y0 = 0, ks = [-1, -0.5, 0.5, 1]) {
  return ks.map((k) => {
    const pts = radii.map((r) => {
      // parábola centrada en (x0,y0) con parámetro k: y = k (x - x0)^2 + y0
      const x = x0 + r;
      const y = y0 + k * Math.pow(r, 2);
      return { x, y, r };
    });
    return { label: `parábola k=${k}`, points: pts, values: [] };
  });
}

function analyzeConvergence(values: number[]) {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return { convergesTo: undefined, spread: Infinity };
  const tail = finite.slice(-3);
  const avg = tail.reduce((a, b) => a + b, 0) / tail.length;
  const spread = Math.max(...tail) - Math.min(...tail);
  return { convergesTo: avg, spread };
}

function computeMixedPaths(compiled: any, x0: number, y0: number) {
  const radii = makeRadii(8, 0.6);
  const thetas = [0, Math.PI / 6, Math.PI / 3, Math.PI / 2, (2 * Math.PI) / 3, Math.PI];
  const paths: PathSample[] = [
    ...linePaths(thetas, radii, x0, y0),
    ...parabolaPaths(radii, x0, y0, [-1, -0.5, 0.5, 1]),
  ];

  for (const p of paths) {
    p.values = p.points.map((pt) => evalAt(compiled, pt.x, pt.y));
    const { convergesTo, spread } = analyzeConvergence(p.values);
    p.convergesTo = convergesTo;
    if (!Number.isFinite(convergesTo)) p.error = "no finito";
  }

  return paths;
}

/* Pequeño componente local que muestra un veredicto simple.
   Si ya existe VerdictView en tu proyecto, reemplaza esto por la importación. */
function VerdictView({ verdict, tol }: { verdict: Verdict; tol?: number }) {
  if (!verdict) return null;
  const color =
    verdict.status === "exists" ? "text-emerald-400" : verdict.status === "diverges" ? "text-rose-400" : "text-yellow-400";
  return (
    <div className={`text-sm ${color}`}>
      {verdict.status === "exists" ? (
        <div>
          Valor candidato: <span className="font-mono">{(verdict.value ?? NaN).toPrecision?.(6) ?? "n/a"}</span>
          {typeof verdict.spread === "number" ? <span className="ml-2 text-xs text-gray-400">spread: {verdict.spread}</span> : null}
        </div>
      ) : verdict.status === "diverges" ? (
        <div>Detectado comportamiento divergente entre rutas</div>
      ) : (
        <div>Resultado inconcluso</div>
      )}
    </div>
  );
}

/* Componente auxiliar: panel separado para "Resultado (rutas mixtas)" */
function MixedRoutesResults({ compiled, x0, y0 }: { compiled: any; x0: number; y0: number }) {
  const result = useMemo(() => {
    if (!compiled) {
      return { verdict: { status: "inconclusive" } as Verdict, paths: [] as PathSample[] };
    }
    const paths = computeMixedPaths(compiled, x0, y0);
    // calculo sencillo del veredicto global
    const convValues = paths.map((p) => p.convergesTo).filter(Number.isFinite) as number[];
    const spreadAll = convValues.length ? Math.max(...convValues) - Math.min(...convValues) : Infinity;
    const verdict: Verdict = spreadAll < 1e-3 ? { status: "exists", value: convValues[0], spread: spreadAll } : { status: "inconclusive" };
    return { verdict, paths };
  }, [compiled, x0, y0]);

  return (
    <Card className="p-4 bg-gray-900 border border-gray-800 rounded-lg w-full">
      <h3 className="text-lg font-semibold text-blue-400 mb-3">Resultado (rutas mixtas)</h3>

      <VerdictView verdict={result.verdict} tol={1e-3} />

      <div className="mt-3">
        <h4 className="font-medium text-gray-100 mb-2">Rutas evaluadas</h4>
        <div className="rounded border border-gray-800 bg-gray-800/40 max-h-[320px] overflow-y-auto p-2">
          <table className="w-full text-sm text-gray-100">
            <thead className="sticky top-0 bg-gray-800/60">
              <tr>
                <th className="text-left p-2">Ruta</th>
                <th className="text-left p-2">Últimos valores</th>
                <th className="text-left p-2">≈ Límite (ruta)</th>
              </tr>
            </thead>
            <tbody>
              {result.paths.map((p, i) => {
                const tailVals = p.values.filter(Number.isFinite).slice(-3);
                return (
                  <tr key={i} className="border-t border-gray-800/60">
                    <td className="p-2 align-top">{p.label}</td>
                    <td className="p-2 align-top font-mono text-xs">
                      {tailVals.length ? tailVals.map((v) => Number(v).toExponential(2)).join(", ") : <span className="text-gray-500">n/a</span>}
                    </td>
                    <td className="p-2 align-top">
                      {Number.isFinite(p.convergesTo ?? NaN) ? Number(p.convergesTo!).toPrecision(6) : <span className="text-gray-500">–</span>}
                    </td>
                  </tr>
                );
              })}
              {result.paths.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-gray-500">
                    No hay rutas evaluadas aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-400 mt-3">
        Nota: verificación numérica por múltiples rutas. Reemplaza el cálculo por tus datos reales si ya existen.
      </div>
    </Card>
  );
}

export type LimitsExplorerProps = {
  functionExpr?: string;
  onPointChange?: (p: { x: number; y: number } | null) => void;
};

export default function LimitsExplorer({ functionExpr: initialExpr = "sin(x) * cos(y)", onPointChange }: LimitsExplorerProps) {
  const [expr, setExpr] = useState(initialExpr);
  const [x0, setX0] = useState(0);
  const [y0, setY0] = useState(0);

  const compiled = useMemo(() => {
    const c = safeCompile(expr);
    return c;
  }, [expr]);

  // ejemplo sencillo: cuando cambia el punto informamos al padre
  useEffect(() => {
    onPointChange?.({ x: x0, y: y0 });
  }, [x0, y0, onPointChange]);

  return (
    <div className="space-y-6">
      {/* Panel Límite en (x0,y0) */}
      <Card className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold text-blue-400 mb-4">Σ Límite en (x0,y0)</h2>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-300 mb-1">f(x,y)</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded px-3 py-2"
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-gray-300">x0</label>
              <input
                type="number"
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded px-3 py-2"
                value={x0}
                onChange={(e) => setX0(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm text-gray-300">y0</label>
              <input
                type="number"
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded px-3 py-2"
                value={y0}
                onChange={(e) => setY0(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Aquí podrías agregar controles de rutas / tolerancias */}
      </Card>

      {/* Panel de Resultado (rutas mixtas) colocado debajo del panel de límite */}
      <div>
        <MixedRoutesResults compiled={compiled} x0={x0} y0={y0} />
      </div>

      {/* Otros paneles opcionales */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <h3 className="text-blue-400 font-semibold mb-2">Rutas / Polar</h3>
          <p className="text-sm text-gray-400">Controles y opciones para generar rutas (rectas, parábolas, aleatorias)</p>
        </Card>

        <Card className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <h3 className="text-blue-400 font-semibold mb-2">Tolerancias</h3>
          <p className="text-sm text-gray-400">Ajusta tolerancias ε / δ y parámetros de verificación</p>
        </Card>
      </div>
    </div>
  );
}
