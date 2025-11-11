"use client";

import { useMemo, useState, useEffect } from "react";
import { create, all } from "mathjs";
import { Card } from "../ui/card";
import { RoutesAndTolerancePanel } from "../limits/RoutesAndTolerancePanel";

const math = create(all, { number: "number" });

type PathSample = {
  label: string;
  points: { x: number; y: number; r: number }[];
  values: number[];
  candidate?: number;
  spread?: number;
  status?: "estable" | "inestable";
  error?: string;
};

type Verdict = { status: "exists" | "diverges" | "inconclusive"; value?: number; spread?: number };

function safeCompile(expr: string) {
  try {
    return math.compile(expr);
  } catch {
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

function parseCustomAngles(text: string): number[] {
  return text
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((a) => {
      const v = Number(a);
      if (!Number.isFinite(v)) return null;
      return Math.abs(v) > 2 * Math.PI ? (v * Math.PI) / 180 : v;
    })
    .filter((v): v is number => v !== null);
}

function randomCurves(n: number, seed: string, radii: number[], x0: number, y0: number): PathSample[] {
  let s = seed ? [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) : 1234567;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const curves: PathSample[] = [];
  for (let i = 0; i < n; i++) {
    const baseTheta = rand() * 2 * Math.PI;
    const pts = radii.map((r) => {
      const theta = baseTheta + (rand() - 0.5) * 0.15;
      return { x: x0 + r * Math.cos(theta), y: y0 + r * Math.sin(theta), r };
    });
    curves.push({ label: `aleatoria ${i + 1}`, points: pts, values: [] });
  }
  return curves;
}

// Reemplaza computeMixedPaths:
function computeMixedPaths(
  compiled: any,
  x0: number,
  y0: number,
  routes: { anglesN: number; customAngles: string; randomCurves: number; seed: string },
  tols: { epsilon: number; delta: number; convTol: number }
) {
  const radii = makeRadii(6, Math.max(Math.min(tols.delta, 0.9), 0.3));
  const autoAngles = Array.from({ length: routes.anglesN }, (_, i) => (2 * Math.PI * i) / routes.anglesN);
  const custom = parseCustomAngles(routes.customAngles);
  const thetas = custom.length ? custom : autoAngles;

  const paths: PathSample[] = [
    ...linePaths(thetas, radii, x0, y0),
    ...parabolaPaths(radii, x0, y0, [-1, 1]),
    ...randomCurves(routes.randomCurves, routes.seed, radii, x0, y0),
  ];

  for (const p of paths) {
    p.values = p.points.map(pt => evalAt(compiled, pt.x, pt.y));
    const { convergesTo, spread } = analyzeConvergence(p.values);
    p.candidate = convergesTo;
    p.spread = spread;
    p.status = spread < tols.convTol ? "estable" : "inestable";
  }
  return paths;
}

/* Veredicto simple */
function VerdictView({ verdict }: { verdict: Verdict }) {
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

function MixedRoutesResults({
  compiled,
  x0,
  y0,
  routes,
  tols,
}: {
  compiled: any;
  x0: number;
  y0: number;
  routes: { anglesN: number; customAngles: string; randomCurves: number; seed: string };
  tols: { epsilon: number; delta: number; convTol: number };
}) {
  const result = useMemo((): { verdict: Verdict; paths: PathSample[] } => {
    const inconclusive: Verdict = { status: "inconclusive" };
    if (!compiled) return { verdict: inconclusive, paths: [] };

    const paths = computeMixedPaths(compiled, x0, y0, routes, tols);
    const convValues = paths.filter(p => Number.isFinite(p.candidate)).map(p => p.candidate!) as number[];

    if (!convValues.length) return { verdict: inconclusive, paths };

    const minV = Math.min(...convValues);
    const maxV = Math.max(...convValues);
    const spreadAll = maxV - minV;

    const verdict: Verdict =
      spreadAll < tols.epsilon
        ? { status: "exists", value: convValues[0], spread: spreadAll }
        : { status: "inconclusive", value: convValues[0], spread: spreadAll };

    return { verdict, paths };
  }, [compiled, x0, y0, routes, tols]);

  return (
    <Card className="p-4 bg-gray-900 border border-gray-800 rounded-lg w-full">
      <h3 className="text-lg font-semibold text-blue-400 mb-3">Resultado (rutas mixtas)</h3>
      <VerdictView verdict={result.verdict} />

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
                      {Number.isFinite(p.candidate ?? NaN) ? (
                        <div className="flex flex-col">
                          <span className="font-mono">{Number(p.candidate).toPrecision(6)}</span>
                          <span className={`text-[10px] ${
                            p.status === "estable" ? "text-emerald-400" : "text-yellow-400"
                          }`}>
                            spread={p.spread?.toExponential(2)} · {p.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">–</span>
                      )}
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
        Nota: verificación numérica por múltiples rutas.
      </div>
    </Card>
  );
}

export type LimitsExplorerProps = {
  functionExpr?: string;
  onPointChange?: (p: { x: number; y: number } | null) => void;
  onPathsChange?: (paths: { label: string; points: { x: number; y: number }[] }[]) => void;
};

export default function LimitsExplorer({
  functionExpr,
  onPointChange,
  onPathsChange,
}: LimitsExplorerProps) {
  const [expr, setExpr] = useState(functionExpr ?? "sin(x) * cos(y)");
  const [x0, setX0] = useState(0);
  const [y0, setY0] = useState(0);
  const [busy, setBusy] = useState(false);

  const [routes, setRoutes] = useState({ anglesN: 8, customAngles: "0,45,90", randomCurves: 3, seed: "" });
  const [tols, setTols] = useState({ epsilon: 1e-3, delta: 0.5, convTol: 1e-3, maxIter: 50 });
  const [summary, setSummary] = useState<{ ok: boolean; text: string } | null>(null);

  const compiled = useMemo(() => safeCompile(expr), [expr]);

  useEffect(() => {
    onPointChange?.({ x: x0, y: y0 });
  }, [x0, y0, onPointChange]);

  function handleRegenerate() {
    setBusy(true);
    setSummary(null);

    if (!compiled) {
      onPathsChange?.([]);
      setSummary({ ok: false, text: "Expresión inválida" });
      setBusy(false);
      return;
    }

    const paths = computeMixedPaths(compiled, x0, y0, routes, tols);

    const pathsFor3D = paths.map((p) => ({
      label: p.label,
      points: p.points.map(({ x, y }) => ({ x, y })),
    }));
    onPathsChange?.(pathsFor3D);

    setSummary({ ok: true, text: "Rutas regeneradas" });
    setBusy(false);
  }

  function onReset() {
    setSummary(null);
    setExpr(functionExpr ?? "sin(x)*cos(y)");
    setX0(0);
    setY0(0);
    onPathsChange?.([]);
    onPointChange?.({ x: 0, y: 0 });
  }

  return (
    <div className="space-y-6">
      <RoutesAndTolerancePanel
        routes={routes}
        tolerances={tols}
        busy={busy}
        resultSummary={summary}
        onChangeRoutes={setRoutes}
        onChangeTolerances={setTols}
        onRegenerate={handleRegenerate}
        onReset={onReset}
      />

      <div className="mt-6 rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h3 className="text-center text-sm font-semibold text-gray-200">Rutas / Polar</h3>
        {/* Panel legacy eliminado en funcionalidad; se mantiene como contenedor si aún hay UI por migrar */}
      </div>

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
      </Card>

      <div>
        <MixedRoutesResults compiled={compiled} x0={x0} y0={y0} routes={routes} tols={tols} />
      </div>
    </div>
  );
}
