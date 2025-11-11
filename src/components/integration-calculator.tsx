"use client";
import React, { useCallback, useMemo, useState, useEffect } from "react";
import { compile } from "mathjs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  doubleIntegral,
  typeIIntegral,
  typeIIIntegral,
  tripleIntegral,
} from "../lib/integrate";

type Mode = "rect" | "typeI" | "typeII" | "triple" | "polar";

interface Props {
  functionExpr: string;
  onRegionChange?: (r: { ax: number; bx: number; cy: number; dy: number } | null) => void;
  onRegionTypeI?: (cfg: { xMin:number; xMax:number; y1:(x:number)=>number; y2:(x:number)=>number } | null) => void;
  onRegionTypeII?: (cfg: { yMin:number; yMax:number; x1:(y:number)=>number; x2:(y:number)=>number } | null) => void;
  onRegionPolar?: (cfg: { rMin:number; rMax:number; tMin:number; tMax:number } | null) => void;
}

function compileSafe(expr: string) {
    return compile(expr);
    try {
      return compile(expr);
    } catch {
      return null;
    }
}
function makeEval(expr: string) {
  const c = compileSafe(expr);
  return (x: number, y: number) => {
    if (!c) return NaN;
    try {
      return Number(c.evaluate({ x, y }));
    } catch {
      return NaN;
    }
  };
}

// Integral en polares (rectángulos en r-θ con jacobiano r)
function polarIntegral(
  fxy: (x: number, y: number) => number,
  rmin: number,
  rmax: number,
  tmin: number,
  tmax: number,
  nr: number,
  nt: number
) {
  const dr = (rmax - rmin) / nr;
  const dt = (tmax - tmin) / nt;
  let acc = 0;
  for (let i = 0; i < nr; i++) {
    const r = rmin + (i + 0.5) * dr;
    for (let j = 0; j < nt; j++) {
      const th = tmin + (j + 0.5) * dt;
      const x = r * Math.cos(th);
      const y = r * Math.sin(th);
      const val = fxy(x, y);
      if (Number.isFinite(val)) acc += val * r * dr * dt; // jacobiano r
    }
  }
  return acc;
}

// Ayuda simple con tooltip nativo
function InfoHint({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] bg-gray-700 text-gray-100 select-none"
    >
      ?
    </span>
  );
}

export default function IntegrationCalculator({
  functionExpr,
  onRegionChange,
  onRegionTypeI,
  onRegionTypeII,
  onRegionPolar,
}: Props) {
  const f = useMemo(() => makeEval(functionExpr), [functionExpr]);

  // Tipo y ayuda
  const [mode, setMode] = useState<Mode>("rect");
  const help: Record<Mode, string> = {
    rect: "Rectangular: integra en [ax, bx] × [cy, dy].",
    typeI: "Tipo I: x en [x_min, x_max]; y entre y1(x) y y2(x).",
    typeII: "Tipo II: y en [y_min, y_max]; x entre x1(y) y x2(y).",
    triple: "Triple: caja rectangular; se proyecta la región en XY.",
    polar: "Polares: r en [r_min, r_max]; θ en [θ_min, θ_max]. f(r cosθ, r sinθ)·r.",
  };

  // Parámetros comunes
  const [n, setN] = useState(80);
  const [tol, setTol] = useState(1e-5); // tolerancia/criterio de refinamiento

  // Rect / Triple
  const [ax, setAx] = useState(-1);
  const [bx, setBx] = useState(1);
  const [cy, setCy] = useState(-1);
  const [dy, setDy] = useState(1);
  const [zMin, setZMin] = useState(-1);
  const [zMax, setZMax] = useState(1);

  // Tipo I
  const [xMinI, setXMinI] = useState(-1);
  const [xMaxI, setXMaxI] = useState(1);
  const [y1Expr, setY1Expr] = useState("x^2");
  const [y2Expr, setY2Expr] = useState("1");

  // Tipo II
  const [yMinII, setYMinII] = useState(-1);
  const [yMaxII, setYMaxII] = useState(1);
  const [x1Expr, setX1Expr] = useState("-sqrt(1 - y^2)");
  const [x2Expr, setX2Expr] = useState("sqrt(1 - y^2)");

  // Polares
  const [rMin, setRMin] = useState(0);
  const [rMax, setRMax] = useState(1);
  const [tMin, setTMin] = useState(0); // en radianes si deg=false
  const [tMax, setTMax] = useState(Math.PI / 2);
  const [deg, setDeg] = useState(false);

  // Salida
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<number | null>(null);

  // Validaciones básicas por tipo
  const rectInvalid =
    mode === "rect" && (ax >= bx || cy >= dy);
  const tripleInvalid =
    mode === "triple" && (ax >= bx || cy >= dy || zMin >= zMax);
  const typeIInvalid =
    mode === "typeI" && (xMinI >= xMaxI);
  const typeIIInvalid =
    mode === "typeII" && (yMinII >= yMaxII);
  const polarInvalid =
    mode === "polar" && (rMin >= rMax || (deg ? tMin * Math.PI/180 : tMin) >= (deg ? tMax * Math.PI/180 : tMax));

  const lowResolution = n < 40;

  const calc = useCallback(() => {
    setBusy(true);
    setResult(null);
    setError(null);
    requestAnimationFrame(() => {
      try {
        if (mode === "rect") {
          const coarse = doubleIntegral(f, ax, bx, cy, dy, n, n);
          const fine = doubleIntegral(f, ax, bx, cy, dy, n * 2, n * 2);
          setResult(fine);
          setError(Math.abs(fine - coarse));
          onRegionChange?.({ ax, bx, cy, dy });
        } else if (mode === "typeI") {
          const y1c = compileSafe(y1Expr);
          const y2c = compileSafe(y2Expr);
          const y1 = (x: number) => (y1c ? Number(y1c.evaluate({ x })) : NaN);
          const y2 = (x: number) => (y2c ? Number(y2c.evaluate({ x })) : NaN);
          const coarse = typeIIntegral(f, xMinI, xMaxI, y1, y2, n, n);
          const fine = typeIIntegral(f, xMinI, xMaxI, y1, y2, n * 2, n * 2);
          setResult(fine);
          setError(Math.abs(fine - coarse));
          onRegionTypeI?.({ xMin:xMinI, xMax:xMaxI, y1, y2 });
        } else if (mode === "typeII") {
          const x1c = compileSafe(x1Expr);
          const x2c = compileSafe(x2Expr);
          const x1 = (y: number) => (x1c ? Number(x1c.evaluate({ y })) : NaN);
          const x2 = (y: number) => (x2c ? Number(x2c.evaluate({ y })) : NaN);
          const coarse = typeIIIntegral(f, yMinII, yMaxII, x1, x2, n, n);
          const fine = typeIIIntegral(f, yMinII, yMaxII, x1, x2, n * 2, n * 2);
          setResult(fine);
          setError(Math.abs(fine - coarse));
          onRegionTypeII?.({ yMin:yMinII, yMax:yMaxII, x1, x2 });
        } else if (mode === "triple") {
          const g = (x: number, y: number, _z: number) => f(x, y);
          const coarse = tripleIntegral(g, ax, bx, cy, dy, zMin, zMax, n, n, n);
          const fine = tripleIntegral(g, ax, bx, cy, dy, zMin, zMax, n * 2, n * 2, n * 2);
          setResult(fine);
          setError(Math.abs(fine - coarse));
          onRegionChange?.({ ax, bx, cy, dy });
        } else {
          // Polar
          const t1 = deg ? (tMin * Math.PI) / 180 : tMin;
          const t2 = deg ? (tMax * Math.PI) / 180 : tMax;
          const coarse = polarIntegral(f, rMin, rMax, t1, t2, n, n);
          const fine = polarIntegral(f, rMin, rMax, t1, t2, n * 2, n * 2);
          setResult(fine);
          setError(Math.abs(fine - coarse));
          onRegionPolar?.({ rMin, rMax, tMin: deg? tMin*Math.PI/180: tMin, tMax: deg? tMax*Math.PI/180: tMax });
        }
      } finally {
        setBusy(false);
      }
    });
  }, [
    mode,
    f,
    ax,
    bx,
    cy,
    dy,
    xMinI,
    xMaxI,
    y1Expr,
    y2Expr,
    yMinII,
    yMaxII,
    x1Expr,
    x2Expr,
    zMin,
    zMax,
    rMin,
    rMax,
    tMin,
    tMax,
    deg,
    n,
    onRegionChange,
    onRegionTypeI,
    onRegionTypeII,
    onRegionPolar,
  ]);

  // UI: selector claro en el mismo panel
  const TypeSelector = (
    <div className="flex flex-wrap gap-2">
      {[
        { id: "rect", label: "Rectangular" },
        { id: "typeI", label: "Tipo I" },
        { id: "typeII", label: "Tipo II" },
        { id: "polar", label: "Polares" },
        { id: "triple", label: "Triple" },
      ].map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => {
            setMode(opt.id as Mode);
            setResult(null);
            setError(null);
            onRegionChange?.(null);
          }}
          className={`px-3 py-1 rounded border text-sm ${
            mode === opt.id
              ? "bg-blue-600 text-white border-blue-500"
              : "bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700"
          }`}
          aria-pressed={mode === opt.id}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  useEffect(()=>{
    if(mode!=="rect" && mode!=="triple") onRegionChange?.(null);
    if(mode!=="typeI") onRegionTypeI?.(null);
    if(mode!=="typeII") onRegionTypeII?.(null);
    if(mode!=="polar") onRegionPolar?.(null);
  },[mode]);

  return (
    <div className="p-4 rounded-lg border border-gray-800 bg-gray-900 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-blue-400 font-semibold">Integración</h3>
        {/* Acción principal visible arriba */}
        <Button onClick={calc}>
          Calcular {mode === "rect" ? "(Rectangular)" : mode === "typeI" ? "(Tipo I)" : mode === "typeII" ? "(Tipo II)" : mode === "polar" ? "(Polares)" : "(Triple)"}
        </Button>
      </header>

      {/* 1) Tipo de integración */}
      <section className="space-y-2">
        <Label className="text-sm">
          Tipo de integración
          <InfoHint text="Elige cómo está definida la región de integración." />
        </Label>
        <div className="max-w-sm">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            aria-label="Tipo de integración"
          >
            <option value="rect">Rectangular (∬ en [x_min, x_max] × [y_min, y_max])</option>
            <option value="typeI">Tipo I (x en [x_min, x_max], y entre y1(x) y y2(x))</option>
            <option value="typeII">Tipo II (y en [y_min, y_max], x entre x1(y) y x2(y))</option>
            <option value="polar">Polares (r, θ) con jacobiano r</option>
            <option value="triple">Triple (∭ en caja rectangular)</option>
          </select>
        </div>
        <p className="text-xs text-gray-400">
          {mode === "rect" && "Integra f(x,y) en un rectángulo cartesiano."}
          {mode === "typeI" && "y está acotada por funciones de x. Útil para regiones bajo/encima de curvas."}
          {mode === "typeII" && "x está acotada por funciones de y. Útil para regiones a la izquierda/derecha de curvas."}
          {mode === "polar" && "x = r cosθ, y = r sinθ. Recuerda el factor r (jacobiano)."}
          {mode === "triple" && "Integra f(x,y,z) en una caja rectangular. Si tu f no depende de z, se multiplica por el alto."}
        </p>
      </section>

      {/* 2) Definir región (agrupado por modo) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Definir la región</div>
          {/* Acción secundaria junto a campos */}
          <Button size="sm" variant="outline" onClick={calc}>
            Calcular
          </Button>
        </div>

        {mode === "rect" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Límite inferior de x<InfoHint text="x_min: inicio del intervalo en x." /></Label>
              <Input type="number" value={ax} onChange={(e) => setAx(+e.target.value)} aria-invalid={rectInvalid && ax >= bx} />
            </div>
            <div>
              <Label>Límite superior de x<InfoHint text="x_max: fin del intervalo en x." /></Label>
              <Input type="number" value={bx} onChange={(e) => setBx(+e.target.value)} aria-invalid={rectInvalid && ax >= bx} />
            </div>
            <div>
              <Label>Límite inferior de y<InfoHint text="y_min: inicio del intervalo en y." /></Label>
              <Input type="number" value={cy} onChange={(e) => setCy(+e.target.value)} aria-invalid={rectInvalid && cy >= dy} />
            </div>
            <div>
              <Label>Límite superior de y<InfoHint text="y_max: fin del intervalo en y." /></Label>
              <Input type="number" value={dy} onChange={(e) => setDy(+e.target.value)} aria-invalid={rectInvalid && cy >= dy} />
            </div>
          </div>
        )}

        {mode === "typeI" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <Label>Límite inferior de x</Label>
              <Input type="number" value={xMinI} onChange={(e) => setXMinI(+e.target.value)} aria-invalid={typeIInvalid && xMinI >= xMaxI} />
            </div>
            <div>
              <Label>Límite superior de x</Label>
              <Input type="number" value={xMaxI} onChange={(e) => setXMaxI(+e.target.value)} aria-invalid={typeIInvalid && xMinI >= xMaxI} />
            </div>
            <div className="lg:col-span-2">
              <Label>y1(x) (límite inferior de y)<InfoHint text="Función inferior en y respecto a x." /></Label>
              <Input value={y1Expr} onChange={(e) => setY1Expr(e.target.value)} placeholder="p.ej. x^2" />
            </div>
            <div className="lg:col-span-2">
              <Label>y2(x) (límite superior de y)<InfoHint text="Función superior en y respecto a x." /></Label>
              <Input value={y2Expr} onChange={(e) => setY2Expr(e.target.value)} placeholder="p.ej. 1" />
            </div>
          </div>
        )}

        {mode === "typeII" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <Label>Límite inferior de y</Label>
              <Input type="number" value={yMinII} onChange={(e) => setYMinII(+e.target.value)} aria-invalid={typeIIInvalid && yMinII >= yMaxII} />
            </div>
            <div>
              <Label>Límite superior de y</Label>
              <Input type="number" value={yMaxII} onChange={(e) => setYMaxII(+e.target.value)} aria-invalid={typeIIInvalid && yMinII >= yMaxII} />
            </div>
            <div className="lg:col-span-2">
              <Label>x1(y) (límite inferior de x)</Label>
              <Input value={x1Expr} onChange={(e) => setX1Expr(e.target.value)} placeholder="p.ej. -sqrt(1-y^2)" />
            </div>
            <div className="lg:col-span-2">
              <Label>x2(y) (límite superior de x)</Label>
              <Input value={x2Expr} onChange={(e) => setX2Expr(e.target.value)} placeholder="p.ej. sqrt(1-y^2)" />
            </div>
          </div>
        )}

        {mode === "polar" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <Label>r mínimo</Label>
              <Input type="number" value={rMin} onChange={(e) => setRMin(+e.target.value)} aria-invalid={polarInvalid && rMin >= rMax} />
            </div>
            <div>
              <Label>r máximo</Label>
              <Input type="number" value={rMax} onChange={(e) => setRMax(+e.target.value)} aria-invalid={polarInvalid && rMin >= rMax} />
            </div>
            <div>
              <Label>θ mínimo</Label>
              <Input type="number" value={tMin} onChange={(e) => setTMin(+e.target.value)} />
            </div>
            <div>
              <Label>θ máximo</Label>
              <Input type="number" value={tMax} onChange={(e) => setTMax(+e.target.value)} />
            </div>
            <div className="col-span-2 flex items-center gap-2 mt-6">
              <input id="deg" type="checkbox" checked={deg} onChange={(e) => setDeg(e.target.checked)} />
              <Label htmlFor="deg">Ángulos en grados</Label>
            </div>
            <p className="text-xs text-gray-400 lg:col-span-6">
              En polares, f(x,y) se evalúa como f(r cosθ, r sinθ) y se multiplica por r.
            </p>
          </div>
        )}

        {mode === "triple" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <Label>Límite inferior de x</Label>
              <Input type="number" value={ax} onChange={(e) => setAx(+e.target.value)} aria-invalid={tripleInvalid && ax >= bx} />
            </div>
            <div>
              <Label>Límite superior de x</Label>
              <Input type="number" value={bx} onChange={(e) => setBx(+e.target.value)} aria-invalid={tripleInvalid && ax >= bx} />
            </div>
            <div>
              <Label>Límite inferior de y</Label>
              <Input type="number" value={cy} onChange={(e) => setCy(+e.target.value)} aria-invalid={tripleInvalid && cy >= dy} />
            </div>
            <div>
              <Label>Límite superior de y</Label>
              <Input type="number" value={dy} onChange={(e) => setDy(+e.target.value)} aria-invalid={tripleInvalid && cy >= dy} />
            </div>
            <div>
              <Label>z mínimo</Label>
              <Input type="number" value={zMin} onChange={(e) => setZMin(+e.target.value)} aria-invalid={tripleInvalid && zMin >= zMax} />
            </div>
            <div>
              <Label>z máximo</Label>
              <Input type="number" value={zMax} onChange={(e) => setZMax(+e.target.value)} aria-invalid={tripleInvalid && zMin >= zMax} />
            </div>
          </div>
        )}

        {/* Mensajes de validación cerca de los campos */}
        {(rectInvalid || tripleInvalid || typeIInvalid || typeIIInvalid || polarInvalid) && (
          <div className="text-xs text-red-400">
            Revisa los límites: el inferior debe ser menor que el superior.
          </div>
        )}
      </section>

      {/* 3) Opciones avanzadas (acordeón simple) */}
      <details className="rounded border border-gray-800 bg-gray-950/40 p-3">
        <summary className="cursor-pointer text-sm font-medium">Opciones avanzadas</summary>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Resolución (n)<InfoHint text="Número de subdivisiones por eje. Valores mayores aumentan la precisión." /></Label>
            <Input
              type="number"
              value={n}
              onChange={(e) => setN(Math.max(4, +e.target.value || 40))}
            />
          </div>
          <div>
            <Label>Tolerancia (ε)<InfoHint text="Objetivo de error: se estima comparando n vs 2n." /></Label>
            <Input type="number" value={tol} onChange={(e) => setTol(+e.target.value || 1e-5)} />
          </div>
        </div>
        {lowResolution && (
          <p className="mt-2 text-xs text-amber-400">
            Resolución baja. Considere aumentar n para mejorar la precisión.
          </p>
        )}
      </details>

      {/* 4) Resultado y retroalimentación */}
      <section className="text-sm">
        <div className="flex items-center gap-3">
          <span>Resultado:</span>
          <span className="font-mono">
            {result !== null ? result.toPrecision(8) : "—"}
          </span>
          {error !== null && (
            <span className={`text-xs ${error > (tol || 0) ? "text-amber-400" : "text-green-400"}`}>
              {error > (tol || 0) ? `Error ≈ ±${error.toExponential(2)} (supera tol)` : "Cálculo exitoso (error dentro de tol)"}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
