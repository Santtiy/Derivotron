"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, Sigma, LineChart, Wand2 } from "lucide-react";
import { create, all } from "mathjs";

/**
 * LimitsExplorer.tsx
 * - Rutas: rectas (múltiples θ), ejes, parábolas y curvas aleatorias.
 * - Chequeo de convergencia por ruta y veredicto global con tolerancia.
 * - Explorador empírico ε–δ.
 * - NUEVO: Panel Polar (θ → límite por r→0 en rayos).
 *
 * Dependencia: mathjs
 *   npm i mathjs
 */

const math = create(all, { number: "number" });

// ------------------------- Tipos -------------------------

type PathSample = {
  label: string;
  points: { x: number; y: number; r: number }[];
  values: number[];
  convergesTo?: number;
  error?: string;
};

export type LimitsExplorerProps = {
  functionExpr?: string;
  onPointChange?: (p: { x: number; y: number } | null) => void;
};

// ------------------------- Utils -------------------------

function safeCompile(expr: string) {
  try {
    return math.compile(expr);
  } catch {
    throw new Error("No se pudo interpretar la función. Revisa la sintaxis.");
  }
}

function evalAt(compiled: any, x: number, y: number) {
  try {
    const v = compiled.evaluate({ x, y, e: Math.E, pi: Math.PI });
    if (!Number.isFinite(v)) return NaN;
    return Number(v);
  } catch {
    return NaN;
  }
}

function makeGeometricRadii(levels: number, base: number) {
  return Array.from({ length: levels }, (_, i) => Math.pow(base, i + 1));
}

function linePaths(thetaList: number[], radii: number[], x0: number, y0: number) {
  return thetaList.map((theta) => {
    const points = radii.map((r) => ({
      x: x0 + r * Math.cos(theta),
      y: y0 + r * Math.sin(theta),
      r,
    }));
    return { label: `recta θ=${theta.toFixed(2)}`, points } as Omit<PathSample, "values">;
  });
}

function axisAlignedPaths(radii: number[], x0: number, y0: number) {
  const dirs = [
    { dx: 1, dy: 0, label: "x→x0 (y fijo)" },
    { dx: -1, dy: 0, label: "x←x0 (y fijo)" },
    { dx: 0, dy: 1, label: "y→y0 (x fijo)" },
    { dx: 0, dy: -1, label: "y←y0 (x fijo)" },
  ];
  return dirs.map((d) => {
    const points = radii.map((r) => ({ x: x0 + d.dx * r, y: y0 + d.dy * r, r }));
    return { label: d.label, points } as Omit<PathSample, "values">;
  });
}

function parabolaPaths(radii: number[], x0: number, y0: number, ks: number[]) {
  return ks.map((k) => {
    const points = radii.map((r) => ({ x: x0 + r, y: y0 + k * r * r, r }));
    return { label: `parábola k=${k}`, points } as Omit<PathSample, "values">;
  });
}

function randomSmoothPaths(nPaths: number, radii: number[], x0: number, y0: number, seed = 42) {
  let s = seed % 2147483647;
  const rnd = () => (s = (s * 48271) % 2147483647) / 2147483647;

  const res: Omit<PathSample, "values">[] = [];
  for (let i = 0; i < nPaths; i++) {
    const a = (rnd() - 0.5) * 2;
    const b = (rnd() - 0.5) * 2;
    const phi = rnd() * Math.PI * 2;
    const points = radii.map((r, j) => {
      const t = j / (radii.length - 1 || 1);
      const dx = r * (Math.cos(phi) + a * t);
      const dy = r * (Math.sin(phi) + b * (1 - t));
      return { x: x0 + dx, y: y0 + dy, r };
    });
    res.push({ label: `curva aleatoria ${i + 1}`, points });
  }
  return res;
}

function analyzeConvergence(values: number[], minTail: number) {
  const n = values.length;
  if (n < minTail) return { ok: false } as const;
  const tail = values.slice(-minTail);
  const mean = tail.reduce((a, b) => a + b, 0) / tail.length;
  const maxDev = Math.max(...tail.map((v) => Math.abs(v - mean)));
  return { ok: true, mean, maxDev } as const;
}

function globalVerdict(paths: PathSample[], tol: number) {
  const winners = paths.filter((p) => Number.isFinite(p.convergesTo ?? NaN));
  if (winners.length === 0) return { status: "undetermined" as const };
  const means = winners.map((p) => p.convergesTo!);
  const mu = means.reduce((a, b) => a + b, 0) / means.length;
  const maxDiff = Math.max(...means.map((v) => Math.abs(v - mu)));
  if (maxDiff <= tol) return { status: "exists", value: mu, spread: maxDiff } as const;
  return {
    status: "counterexample",
    pairs: winners.map((p) => ({ label: p.label, value: p.convergesTo })),
  } as const;
}

function epsilonDeltaProbe(compiled: any, x0: number, y0: number, epsilon: number, delta: number, samples = 250) {
  let maxVar = 0;
  let f0 = evalAt(compiled, x0, y0);
  if (!Number.isFinite(f0)) f0 = 0;
  for (let i = 0; i < samples; i++) {
    const t = Math.random() * 2 * Math.PI;
    const r = Math.random() * delta;
    const x = x0 + r * Math.cos(t);
    const y = y0 + r * Math.sin(t);
    const v = evalAt(compiled, x, y);
    if (Number.isFinite(v)) {
      maxVar = Math.max(maxVar, Math.abs(v - f0));
    }
  }
  return { ok: maxVar < epsilon, maxVar };
}

// ------------------------- UI -------------------------

export default function LimitsExplorer({ functionExpr, onPointChange }: LimitsExplorerProps) {
  const [expr, setExpr] = useState<string>(functionExpr ?? "(x*x*y)/(x*x + y*y)");
  useEffect(() => {
    if (typeof functionExpr === "string") setExpr(functionExpr);
  }, [functionExpr]);

  const [x0, setX0] = useState<number>(0);
  const [y0, setY0] = useState<number>(0);
  useEffect(() => {
    onPointChange?.({ x: x0, y: y0 });
  }, [x0, y0, onPointChange]);

  // Parámetros generales
  const [levels, setLevels] = useState<number>(6);
  const [base, setBase] = useState<number>(0.2);
  const [thetaCount, setThetaCount] = useState<number>(8);
  const [kList, setKList] = useState<string>("-2,-1,-0.5,0.5,1,2");
  const [randCount, setRandCount] = useState<number>(2);
  const [tail, setTail] = useState<number>(3);
  const [tol, setTol] = useState<number>(1e-3);

  const compiled = useMemo(() => safeCompile(expr), [expr]);

  // ----------- Cálculo rutas “mixto” (rectas/ejes/parábolas/aleatorias) -----------
  const result = useMemo(() => {
    const radii = makeGeometricRadii(levels, base);
    const thetas = Array.from({ length: thetaCount }, (_, i) => (i * 2 * Math.PI) / thetaCount);
    const lines = linePaths(thetas, radii, x0, y0);
    const axes = axisAlignedPaths(radii, x0, y0);
    const ks = kList.split(",").map((s) => Number(s.trim())).filter((v) => Number.isFinite(v));
    const parabs = parabolaPaths(radii, x0, y0, ks);
    const randoms = randomSmoothPaths(randCount, radii, x0, y0);

    const all: PathSample[] = [...lines, ...axes, ...parabs, ...randoms].map((p) => ({ ...p, values: [] }));

    for (const p of all) {
      for (const pt of p.points) p.values.push(evalAt(compiled, pt.x, pt.y));
      const finiteSeq = p.values.filter((v) => Number.isFinite(v));
      if (finiteSeq.length >= tail) {
        const an = analyzeConvergence(finiteSeq, tail);
        if (an.ok && Number.isFinite(an.mean) && an.maxDev < tol) p.convergesTo = an.mean;
      }
    }
    return { radii, paths: all, verdict: globalVerdict(all, tol) } as const;
  }, [expr, x0, y0, levels, base, thetaCount, kList, randCount, tail, tol]);

  // ----------- NUEVO: Panel Polar (θ → límite por r→0) -----------
  const [thetaStart, setThetaStart] = useState<number>(0); // en radianes
  const [thetaN, setThetaN] = useState<number>(16);
  const polar = useMemo(() => {
    const radii = makeGeometricRadii(levels, base);
    const thetas = Array.from({ length: thetaN }, (_, i) => thetaStart + (i * 2 * Math.PI) / thetaN);

    const rows = thetas.map((theta) => {
      const seq = radii.map((r) => evalAt(compiled, x0 + r * Math.cos(theta), y0 + r * Math.sin(theta)));
      const finite = seq.filter((v) => Number.isFinite(v));
      let approx: number | null = null;
      if (finite.length >= tail) {
        const an = analyzeConvergence(finite, tail);
        if (an.ok && an.maxDev < tol) approx = an.mean;
      }
      return {
        theta,
        last: finite.slice(-tail).map((v) => Number(v)),
        limit: approx,
      };
    });

    const cand = rows.map((r) => r.limit).filter((v): v is number => Number.isFinite(v as number));
    let verdict:
      | { status: "polar-undetermined" }
      | { status: "polar-consistent"; value: number; spread: number }
      | { status: "polar-inconsistent"; min: number; max: number } = { status: "polar-undetermined" };

    if (cand.length > 0) {
      const mu = cand.reduce((a, b) => a + b, 0) / cand.length;
      const spread = Math.max(...cand.map((v) => Math.abs(v - mu)));
      if (spread <= tol) verdict = { status: "polar-consistent", value: mu, spread };
      else verdict = { status: "polar-inconsistent", min: Math.min(...cand), max: Math.max(...cand) };
    }
    return { rows, verdict } as const;
  }, [compiled, x0, y0, levels, base, thetaN, thetaStart, tail, tol]);

  // ----------- ε–δ -----------
  const [epsilon, setEpsilon] = useState<number>(0.05);
  const [delta, setDelta] = useState<number>(0.05);
  const probe = useMemo(() => epsilonDeltaProbe(compiled, x0, y0, epsilon, delta), [compiled, x0, y0, epsilon, delta]);

  return (
    <div className="w-full grid gap-4 md:grid-cols-2">
      {/* Controles */}
      <Card className="p-4 space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sigma className="w-5 h-5" /> Límite en (x0,y0)
        </h2>

        <div className="grid gap-3">
          <div>
            <Label>f(x,y)</Label>
            <Input value={expr} onChange={(e) => setExpr(e.target.value)} placeholder="Ej: (x^2*y)/(x^2+y^2)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>x0</Label>
              <Input type="number" value={x0} onChange={(e) => setX0(parseFloat(e.target.value))} />
            </div>
            <div>
              <Label>y0</Label>
              <Input type="number" value={y0} onChange={(e) => setY0(parseFloat(e.target.value))} />
            </div>
          </div>
        </div>

        <Tabs defaultValue="paths" className="mt-2">
          <TabsList>
            <TabsTrigger value="paths"><LineChart className="w-4 h-4 mr-1" />Rutas</TabsTrigger>
            <TabsTrigger value="polar">Polar</TabsTrigger>
            <TabsTrigger value="tolerances"><Wand2 className="w-4 h-4 mr-1" />Tolerancias</TabsTrigger>
          </TabsList>

          {/* Rutas mixtas */}
          <TabsContent value="paths" className="space-y-3 mt-3">
            <div>
              <Label>Niveles (r)</Label>
              <Slider value={[levels]} onValueChange={(val: number[]) => setLevels(Math.round(val[0]))} min={3} max={12} step={1} />
              <div className="text-xs text-muted-foreground">{levels} niveles</div>
            </div>
            <div>
              <Label>Base geométrica</Label>
              <Slider value={[base]} onValueChange={(val: number[]) => setBase(Number(val[0].toFixed(2)))} min={0.05} max={0.5} step={0.01} />
              <div className="text-xs text-muted-foreground">rᵢ = base^(i)</div>
            </div>
            <div>
              <Label>Rectas (θ)</Label>
              <Slider value={[thetaCount]} onValueChange={(val: number[]) => setThetaCount(Math.round(val[0]))} min={4} max={24} step={1} />
              <div className="text-xs text-muted-foreground">{thetaCount} direcciones</div>
            </div>
            <div>
              <Label>Parábolas k</Label>
              <Input value={kList} onChange={(e) => setKList(e.target.value)} />
            </div>
            <div>
              <Label>Curvas aleatorias</Label>
              <Slider value={[randCount]} onValueChange={(val: number[]) => setRandCount(Math.round(val[0]))} min={0} max={6} step={1} />
              <div className="text-xs text-muted-foreground">{randCount} curvas</div>
            </div>
          </TabsContent>

          {/* NUEVO: Panel polar */}
          <TabsContent value="polar" className="space-y-3 mt-3">
            <div>
              <Label>Ángulos (θ)</Label>
              <Slider value={[thetaN]} onValueChange={(val: number[]) => setThetaN(Math.round(val[0]))} min={8} max={72} step={1} />
              <div className="text-xs text-muted-foreground">{thetaN} direcciones en [0, 2π)</div>
            </div>
            <div>
              <Label>Desfase inicial θ₀ (radianes)</Label>
              <Slider value={[thetaStart]} onValueChange={(val: number[]) => setThetaStart(Number(val[0].toFixed(2)))} min={0} max={Math.PI * 2} step={0.01} />
              <div className="text-xs text-muted-foreground">θ comienza en {thetaStart.toFixed(2)} rad</div>
            </div>
            <div className="rounded border p-2">
              <div className="text-sm font-medium mb-2">Resultados por θ</div>
              <div className="max-h-56 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">θ (rad)</th>
                      <th className="text-left p-2">Últimos valores</th>
                      <th className="text-left p-2">≈ Límite(θ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {polar.rows.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{r.theta.toFixed(3)}</td>
                        <td className="p-2 font-mono text-xs">
                          {r.last.length ? r.last.map((v) => Number(v).toExponential(2)).join(", ") : <span className="text-muted-foreground">n/a</span>}
                        </td>
                        <td className="p-2">{Number.isFinite(r.limit ?? NaN) ? Number(r.limit).toPrecision(6) : <span className="text-muted-foreground">–</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Veredicto polar */}
              <div className="mt-3 text-sm">
                {polar.verdict.status === "polar-undetermined" && (
                  <div className="flex items-start gap-2 text-amber-700">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <span>No concluyente: aumenta niveles o reduce la base.</span>
                  </div>
                )}
                {polar.verdict.status === "polar-consistent" && (
                  <div className="rounded-md border p-2 bg-emerald-50 text-emerald-900">
                    Coincidencia por θ: L ≈ {polar.verdict.value.toPrecision(6)} (disp máx: {polar.verdict.spread.toExponential(2)} ≤ {tol})
                  </div>
                )}
                {polar.verdict.status === "polar-inconsistent" && (
                  <div className="rounded-md border p-2 bg-rose-50 text-rose-900">
                    Inconsistencia por θ: límites entre {polar.verdict.min.toPrecision(6)} y {polar.verdict.max.toPrecision(6)}.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tolerancias */}
          <TabsContent value="tolerances" className="space-y-3 mt-3">
            <div>
              <Label>Tail para convergencia</Label>
              <Slider value={[tail]} onValueChange={(val: number[]) => setTail(Math.round(val[0]))} min={2} max={8} step={1} />
              <div className="text-xs text-muted-foreground">Se observan los últimos {tail} valores por ruta</div>
            </div>
            <div>
              <Label>Tolerancia (ruta &amp; global)</Label>
              <Input type="number" value={tol} onChange={(e) => setTol(parseFloat(e.target.value))} />
              <div className="text-xs text-muted-foreground">Si la dispersión ≤ tolerancia, aceptamos mismo límite</div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ε–δ */}
        <div className="pt-2 grid grid-cols-2 gap-3">
          <div>
            <Label>ε (epsilon)</Label>
            <Input type="number" value={epsilon} onChange={(e) => setEpsilon(parseFloat(e.target.value))} />
          </div>
          <div>
            <Label>δ (delta)</Label>
            <Input type="number" value={delta} onChange={(e) => setDelta(parseFloat(e.target.value))} />
          </div>
        </div>
        <div className="text-sm mt-1">
          {probe.ok ? (
            <span className="text-green-600">Para este δ, la variación máx (~{probe.maxVar.toExponential(2)}) está por debajo de ε.</span>
          ) : (
            <span className="text-amber-600">Para este δ, la variación máx (~{probe.maxVar.toExponential(2)}) supera ε.</span>
          )}
        </div>
      </Card>

      {/* Resultados (rutas mixtas) */}
      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold">Resultado (rutas mixtas)</h3>
        <VerdictView verdict={result.verdict} tol={tol} />

        <div className="space-y-2">
          <h4 className="font-medium">Rutas evaluadas</h4>
          <div className="max-h-72 overflow-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2">Ruta</th>
                  <th className="text-left p-2">Últimos valores</th>
                  <th className="text-left p-2">≈ Límite (ruta)</th>
                </tr>
              </thead>
              <tbody>
                {result.paths.map((p, i) => {
                  const tailVals = p.values.filter(Number.isFinite).slice(-tail);
                  return (
                    <tr key={i} className="border-t">
                      <td className="p-2 align-top">{p.label}</td>
                      <td className="p-2 align-top font-mono text-xs">
                        {tailVals.length ? tailVals.map((v) => Number(v).toExponential(2)).join(", ") : <span className="text-muted-foreground">n/a</span>}
                      </td>
                      <td className="p-2 align-top">
                        {Number.isFinite(p.convergesTo ?? NaN) ? Number(p.convergesTo).toPrecision(6) : <span className="text-muted-foreground">–</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Nota: Verificación <strong>numérica</strong> por múltiples rutas. Si detecta rutas con límites distintos, reporta contraejemplo. Si todas coinciden dentro de la tolerancia, sugiere un valor candidato.
        </div>
      </Card>
    </div>
  );
}

function VerdictView({ verdict, tol }: { verdict: ReturnType<typeof globalVerdict>; tol: number }) {
  if (verdict.status === "undetermined") {
    return (
      <div className="flex items-start gap-2 text-amber-700">
        <AlertCircle className="w-5 h-5 mt-0.5" />
        <div>
          <div className="font-medium">No concluyente</div>
          <div className="text-sm">Intenta aumentar niveles, ajustar tolerancia o añadir más rutas.</div>
        </div>
      </div>
    );
  }
  if (verdict.status === "exists") {
    return (
      <div className="rounded-xl border p-3 bg-emerald-50">
        <div className="text-sm">Todas las rutas convergen (disp. ≤ {tol}).</div>
        <div className="text-xl font-semibold">Límite ≈ {verdict.value?.toPrecision(6)}</div>
        <div className="text-xs text-muted-foreground">Dispersión máxima entre rutas: {verdict.spread?.toExponential(2)}</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border p-3 bg-rose-50">
      <div className="font-semibold">Contraejemplo numérico</div>
      <div className="text-sm">Se hallaron rutas con límites incompatibles:</div>
      <ul className="list-disc pl-6 text-sm mt-1">
        {verdict.pairs?.slice(0, 6).map((p, i) => (
          <li key={i}>
            <span className="font-mono">{p.label}</span>: {Number.isFinite(p.value) ? Number(p.value).toPrecision(6) : "n/a"}
          </li>
        ))}
      </ul>
      <div className="text-xs text-muted-foreground mt-2">Si alguna ruta es inestable, intenta reducir la base geométrica o aumentar niveles.</div>
    </div>
  );
}
