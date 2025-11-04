"use client";

import React, { useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { create, all } from "mathjs";

const math = create(all, { number: "number" });

interface IntegrationCalculatorProps {
  functionExpr: string; // f(x,y)
}

type RegionMask = (x: number, y: number) => boolean;

function compileSafe(expr: string) {
  try {
    return math.compile(expr);
  } catch {
    return null;
  }
}

function evalSafe(compiled: any, scope: Record<string, number>) {
  if (!compiled) return NaN;
  try {
    const v = compiled.evaluate({ ...scope, e: Math.E, pi: Math.PI });
    return Number.isFinite(v) ? Number(v) : NaN;
  } catch {
    return NaN;
  }
}

function linspace(a: number, b: number, n: number) {
  if (n <= 1) return [a];
  const h = (b - a) / (n - 1);
  return Array.from({ length: n }, (_, i) => a + i * h);
}

/** Integra g(t) en [a,b] con Simpson compuesto (si aplica) o trapecios */
function integrate1D(g: (t: number) => number, a: number, b: number, n: number) {
  if (n < 2) n = 2;
  const xs = linspace(a, b, n);
  const vals = xs.map(g);
  if (vals.some((v) => !Number.isFinite(v))) return NaN;
  const h = (b - a) / (n - 1);

  // Si (n-1) es par y n>=3, usamos Simpson compuesto
  if ((n - 1) % 2 === 0 && n >= 3) {
    let s = vals[0] + vals[n - 1];
    for (let i = 1; i < n - 1; i++) s += vals[i] * (i % 2 === 0 ? 2 : 4);
    return (h / 3) * s;
  }

  // Si no, trapecios
  let s = 0;
  for (let i = 0; i < n - 1; i++) s += (vals[i] + vals[i + 1]) * 0.5;
  return h * s;
}

/** Heatmap de la región en el plano xy */
function regionHeatmap(mask: RegionMask, xMin: number, xMax: number, yMin: number, yMax: number, n = 140) {
  const xs = linspace(xMin, xMax, n);
  const ys = linspace(yMin, yMax, n);
  const Z: number[][] = [];
  for (let j = 0; j < ys.length; j++) {
    const row: number[] = [];
    for (let i = 0; i < xs.length; i++) {
      row.push(mask(xs[i], ys[j]) ? 1 : NaN); // NaN -> no pinta fuera de región
    }
    Z.push(row);
  }
  return { xs, ys, Z };
}

export function IntegrationCalculator({ functionExpr }: IntegrationCalculatorProps) {
  // f(x,y) y densidad ρ(x,y)
  const [rhoExpr, setRhoExpr] = useState<string>("1");
  const fCompiled = useMemo(() => compileSafe(functionExpr), [functionExpr]);
  const rhoCompiled = useMemo(() => compileSafe(rhoExpr), [rhoExpr]);

  // Vista global para el plot 2D
  const [view, setView] = useState({ xMin: -3, xMax: 3, yMin: -3, yMax: 3 });

  // Resolución (discretización)
  const [nx, setNx] = useState<number>(200); // pasos eje externo
  const [ny, setNy] = useState<number>(200); // pasos eje interno

  // ========================= TAB 1: Rectangular =========================
  const [rect, setRect] = useState({ ax: -1, bx: 1, cy: -1, dy: 1 });
  const maskRect: RegionMask = (x, y) => x >= rect.ax && x <= rect.bx && y >= rect.cy && y <= rect.dy;

  const computeRect = () => {
    const gx = (x: number) =>
      integrate1D(
        (y) => evalSafe(fCompiled, { x, y }) * evalSafe(rhoCompiled, { x, y }),
        rect.cy,
        rect.dy,
        ny
      );

    const mass = integrate1D(gx, rect.ax, rect.bx, nx);
    if (!Number.isFinite(mass)) return { mass: NaN, cx: NaN, cy: NaN };

    const Gx = integrate1D(
      (x) =>
        integrate1D(
          (y) => x * evalSafe(fCompiled, { x, y }) * evalSafe(rhoCompiled, { x, y }),
          rect.cy,
          rect.dy,
          ny
        ),
      rect.ax,
      rect.bx,
      nx
    );
    const Gy = integrate1D(
      (x) =>
        integrate1D(
          (y) => y * evalSafe(fCompiled, { x, y }) * evalSafe(rhoCompiled, { x, y }),
          rect.cy,
          rect.dy,
          ny
        ),
      rect.ax,
      rect.bx,
      nx
    );

    return { mass, cx: Gx / mass, cy: Gy / mass };
  };

  // ========================= TAB 2: Tipo I (y∈[g1(x),g2(x)]) =========================
  const [tipoI, setTipoI] = useState({
    a: -1,
    b: 1,
    g1: "-sqrt(1 - x^2)",
    g2: "sqrt(1 - x^2)",
  });
  const g1c = useMemo(() => compileSafe(tipoI.g1), [tipoI.g1]);
  const g2c = useMemo(() => compileSafe(tipoI.g2), [tipoI.g2]);

  const maskTipoI: RegionMask = (x, y) => {
    if (x < tipoI.a || x > tipoI.b) return false;
    const y1 = evalSafe(g1c, { x });
    const y2 = evalSafe(g2c, { x });
    if (![y1, y2].every(Number.isFinite)) return false;
    const lo = Math.min(y1, y2);
    const hi = Math.max(y1, y2);
    return y >= lo && y <= hi;
  };

  const computeTipoI = () => {
    const gx = (x: number) => {
      const y1 = evalSafe(g1c, { x });
      const y2 = evalSafe(g2c, { x });
      if (![y1, y2].every(Number.isFinite)) return NaN;
      const lo = Math.min(y1, y2);
      const hi = Math.max(y1, y2);
      return integrate1D(
        (y) => evalSafe(fCompiled, { x, y }) * evalSafe(rhoCompiled, { x, y }),
        lo,
        hi,
        ny
      );
    };

    const mass = integrate1D(gx, tipoI.a, tipoI.b, nx);
    if (!Number.isFinite(mass)) return { mass: NaN, cx: NaN, cy: NaN };

    const Gx = integrate1D(
      (x) => {
        const y1 = evalSafe(g1c, { x });
        const y2 = evalSafe(g2c, { x });
        const lo = Math.min(y1, y2);
        const hi = Math.max(y1, y2);
        return integrate1D(
          (y) => x * evalSafe(fCompiled, { x, y }) * evalSafe(rhoCompiled, { x, y }),
          lo,
          hi,
          ny
        );
      },
      tipoI.a,
      tipoI.b,
      nx
    );

    const Gy = integrate1D(
      (x) => {
        const y1 = evalSafe(g1c, { x });
        const y2 = evalSafe(g2c, { x });
        const lo = Math.min(y1, y2);
        const hi = Math.max(y1, y2);
        return integrate1D(
          (y) => y * evalSafe(fCompiled, { x, y }) * evalSafe(rhoCompiled, { x, y }),
          lo,
          hi,
          ny
        );
      },
      tipoI.a,
      tipoI.b,
      nx
    );

    return { mass, cx: Gx / mass, cy: Gy / mass };
  };

  // ========================= TAB 3: Tipo II (x∈[h1(y),h2(y)]) =========================
  const [tipoII, setTipoII] = useState({
    c: -1,
    d: 1,
    h1: "-sqrt(1 - y^2)",
    h2: "sqrt(1 - y^2)",
  });
  const h1c = useMemo(() => compileSafe(tipoII.h1), [tipoII.h1]);
  const h2c = useMemo(() => compileSafe(tipoII.h2), [tipoII.h2]);

  const maskTipoII: RegionMask = (x, y) => {
    if (y < tipoII.c || y > tipoII.d) return false;
    const x1 = evalSafe(h1c, { y });
    const x2 = evalSafe(h2c, { y });
    if (![x1, x2].every(Number.isFinite)) return false;
    const lo = Math.min(x1, x2);
    const hi = Math.max(x1, x2);
    return x >= lo && x <= hi;
  };

  const computeTipoII = () => {
    const gy = (y: number) => {
      const x1 = evalSafe(h1c, { y });
      const x2 = evalSafe(h2c, { y });
      if (![x1, x2].every(Number.isFinite)) return NaN;
      const lo = Math.min(x1, x2);
      const hi = Math.max(x1, x2);
      return integrate1D(
        (x) => evalSafe(fCompiled, { x, y }) * evalSafe(rhoCompiled, { x, y }),
        lo,
        hi,
        nx
      );
    };

    const mass = integrate1D(gy, tipoII.c, tipoII.d, ny);
    if (!Number.isFinite(mass)) return { mass: NaN, cx: NaN, cy: NaN };

    const Gx = integrate1D(
      (y) => {
        const x1 = evalSafe(h1c, { y });
        const x2 = evalSafe(h2c, { y });
        const lo = Math.min(x1, x2);
        const hi = Math.max(x1, x2);
        return integrate1D(
          (x) => x * evalSafe(fCompiled, { x, y }) * evalSafe(rhoCompiled, { x, y }),
          lo,
          hi,
          nx
        );
      },
      tipoII.c,
      tipoII.d,
      ny
    );

    const Gy = integrate1D(
      (y) => {
        const x1 = evalSafe(h1c, { y });
        const x2 = evalSafe(h2c, { y });
        const lo = Math.min(x1, x2);
        const hi = Math.max(x1, x2);
        return integrate1D(
          (x) => y * evalSafe(fCompiled, { x, y }) * evalSafe(rhoCompiled, { x, y }),
          lo,
          hi,
          nx
        );
      },
      tipoII.c,
      tipoII.d,
      ny
    );

    return { mass, cx: Gx / mass, cy: Gy / mass };
  };

  // ========================= TAB 4: Polares =========================
  const [polar, setPolar] = useState({
    alpha: 0,
    beta: 2 * Math.PI,
    r1: "0",
    r2: "1",
  });
  const r1c = useMemo(() => compileSafe(polar.r1), [polar.r1]);
  const r2c = useMemo(() => compileSafe(polar.r2), [polar.r2]);

  const maskPolar: RegionMask = (x, y) => {
    const theta = Math.atan2(y, x);
    const r = Math.hypot(x, y);
    const a = polar.alpha;
    const b = polar.beta;
    const withinTheta = a <= b ? theta >= a && theta <= b : theta >= a || theta <= b;
    if (!withinTheta) return false;
    const rmin = evalSafe(r1c, { theta });
    const rmax = evalSafe(r2c, { theta });
    if (![rmin, rmax].every(Number.isFinite)) return false;
    const lo = Math.min(rmin, rmax);
    const hi = Math.max(rmin, rmax);
    return r >= lo && r <= hi;
    };

  const computePolar = () => {
    const gtheta = (theta: number) => {
      const rmin = evalSafe(r1c, { theta });
      const rmax = evalSafe(r2c, { theta });
      if (![rmin, rmax].every(Number.isFinite)) return NaN;
      const lo = Math.min(rmin, rmax);
      const hi = Math.max(rmin, rmax);
      return integrate1D(
        (r) => {
          const x = r * Math.cos(theta);
          const y = r * Math.sin(theta);
          return evalSafe(fCompiled, { x, y }) * evalSafe(rhoCompiled, { x, y }) * r; // Jacobiano r
        },
        lo,
        hi,
        nx
      );
    };

    const mass = integrate1D(gtheta, polar.alpha, polar.beta, ny);
    if (!Number.isFinite(mass)) return { mass: NaN, cx: NaN, cy: NaN };

    const Gx = integrate1D(
      (theta) => {
        const rmin = evalSafe(r1c, { theta });
        const rmax = evalSafe(r2c, { theta });
        const lo = Math.min(rmin, rmax);
        const hi = Math.max(rmin, rmax);
        return integrate1D(
          (r) => {
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta);
            return x * evalSafe(fCompiled, { x, y }) * evalSafe(rhoCompiled, { x, y }) * r;
          },
          lo,
          hi,
          nx
        );
      },
      polar.alpha,
      polar.beta,
      ny
    );

    const Gy = integrate1D(
      (theta) => {
        const rmin = evalSafe(r1c, { theta });
        const rmax = evalSafe(r2c, { theta });
        const lo = Math.min(rmin, rmax);
        const hi = Math.max(rmin, rmax);
        return integrate1D(
          (r) => {
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta);
            return y * evalSafe(fCompiled, { x, y }) * evalSafe(rhoCompiled, { x, y }) * r;
          },
          lo,
          hi,
          nx
        );
      },
      polar.alpha,
      polar.beta,
      ny
    );

    return { mass, cx: Gx / mass, cy: Gy / mass };
  };

  // ========================= Visual común =========================
  const [activeTab, setActiveTab] = useState<"rect" | "tipoI" | "tipoII" | "polar">("rect");

  const currentMask: RegionMask = useMemo(() => {
    switch (activeTab) {
      case "rect": return maskRect;
      case "tipoI": return maskTipoI;
      case "tipoII": return maskTipoII;
      case "polar": return maskPolar;
    }
  }, [activeTab, maskRect, maskTipoI, maskTipoII, maskPolar]);

  const heat = useMemo(() => regionHeatmap(currentMask, view.xMin, view.xMax, view.yMin, view.yMax, 140),
    [currentMask, view]
  );

  // ========================= Resultado =========================
  const [result, setResult] = useState<{ mass: number; cx: number; cy: number } | null>(null);

  const runCompute = () => {
    let out = { mass: NaN, cx: NaN, cy: NaN };
    if (activeTab === "rect") out = computeRect();
    if (activeTab === "tipoI") out = computeTipoI();
    if (activeTab === "tipoII") out = computeTipoII();
    if (activeTab === "polar") out = computePolar();
    setResult(out);
  };

  return (
    <Tabs
      value={
        activeTab === "rect" ? "rect" :
        activeTab === "tipoI" ? "tipoI" :
        activeTab === "tipoII" ? "tipoII" : "polar"
      }
      onValueChange={(v) => setActiveTab(v as any)}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="rect" className="text-xs">Rectangular</TabsTrigger>
        <TabsTrigger value="tipoI" className="text-xs">Tipo I</TabsTrigger>
        <TabsTrigger value="tipoII" className="text-xs">Tipo II</TabsTrigger>
        <TabsTrigger value="polar" className="text-xs">Polares</TabsTrigger>
      </TabsList>

      {/* Panel de parámetros */}
      <TabsContent value="rect" className="space-y-4">
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label>ax</Label><Input type="number" value={rect.ax} onChange={(e) => setRect({ ...rect, ax: parseFloat(e.target.value) })} /></div>
            <div><Label>bx</Label><Input type="number" value={rect.bx} onChange={(e) => setRect({ ...rect, bx: parseFloat(e.target.value) })} /></div>
            <div><Label>cy</Label><Input type="number" value={rect.cy} onChange={(e) => setRect({ ...rect, cy: parseFloat(e.target.value) })} /></div>
            <div><Label>dy</Label><Input type="number" value={rect.dy} onChange={(e) => setRect({ ...rect, dy: parseFloat(e.target.value) })} /></div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="tipoI" className="space-y-4">
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label>a</Label><Input type="number" value={tipoI.a} onChange={(e) => setTipoI({ ...tipoI, a: parseFloat(e.target.value) })} /></div>
            <div><Label>b</Label><Input type="number" value={tipoI.b} onChange={(e) => setTipoI({ ...tipoI, b: parseFloat(e.target.value) })} /></div>
            <div className="md:col-span-2"><Label>g1(x)</Label><Input value={tipoI.g1} onChange={(e) => setTipoI({ ...tipoI, g1: e.target.value })} className="font-mono" /></div>
            <div className="md:col-span-2"><Label>g2(x)</Label><Input value={tipoI.g2} onChange={(e) => setTipoI({ ...tipoI, g2: e.target.value })} className="font-mono" /></div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="tipoII" className="space-y-4">
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label>c</Label><Input type="number" value={tipoII.c} onChange={(e) => setTipoII({ ...tipoII, c: parseFloat(e.target.value) })} /></div>
            <div><Label>d</Label><Input type="number" value={tipoII.d} onChange={(e) => setTipoII({ ...tipoII, d: parseFloat(e.target.value) })} /></div>
            <div className="md:col-span-2"><Label>h1(y)</Label><Input value={tipoII.h1} onChange={(e) => setTipoII({ ...tipoII, h1: e.target.value })} className="font-mono" /></div>
            <div className="md:col-span-2"><Label>h2(y)</Label><Input value={tipoII.h2} onChange={(e) => setTipoII({ ...tipoII, h2: e.target.value })} className="font-mono" /></div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="polar" className="space-y-4">
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div><Label>α (rad)</Label><Input type="number" value={polar.alpha} onChange={(e) => setPolar({ ...polar, alpha: parseFloat(e.target.value) })} /></div>
            <div><Label>β (rad)</Label><Input type="number" value={polar.beta} onChange={(e) => setPolar({ ...polar, beta: parseFloat(e.target.value) })} /></div>
            <div className="md:col-span-2"><Label>r₁(θ)</Label><Input value={polar.r1} onChange={(e) => setPolar({ ...polar, r1: e.target.value })} className="font-mono" /></div>
            <div className="md:col-span-2"><Label>r₂(θ)</Label><Input value={polar.r2} onChange={(e) => setPolar({ ...polar, r2: e.target.value })} className="font-mono" /></div>
          </div>
        </Card>
      </TabsContent>

      {/* Controles comunes + Visual + Resultado */}
      <div className="grid md:grid-cols-2 gap-4 mt-2">
        <Card className="p-4 space-y-3">
          <h4 className="font-semibold">Parámetros comunes</h4>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div><Label>nx</Label><Input type="number" value={nx} onChange={(e) => setNx(parseInt(e.target.value || "200", 10))} /></div>
            <div><Label>ny</Label><Input type="number" value={ny} onChange={(e) => setNy(parseInt(e.target.value || "200", 10))} /></div>
            <div><Label>xMin</Label><Input type="number" value={view.xMin} onChange={(e) => setView({ ...view, xMin: parseFloat(e.target.value) })} /></div>
            <div><Label>xMax</Label><Input type="number" value={view.xMax} onChange={(e) => setView({ ...view, xMax: parseFloat(e.target.value) })} /></div>
            <div><Label>yMin</Label><Input type="number" value={view.yMin} onChange={(e) => setView({ ...view, yMin: parseFloat(e.target.value) })} /></div>
            <div><Label>yMax</Label><Input type="number" value={view.yMax} onChange={(e) => setView({ ...view, yMax: parseFloat(e.target.value) })} /></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="md:col-span-2">
              <Label>f(x,y)</Label>
              <Input value={functionExpr} readOnly className="font-mono" />
            </div>
            <div className="md:col-span-2">
              <Label>ρ(x,y) (densidad)</Label>
              <Input value={rhoExpr} onChange={(e) => setRhoExpr(e.target.value)} className="font-mono" />
            </div>
          </div>

          <Button onClick={runCompute} className="w-full mt-2">Integrar ∬</Button>
        </Card>

        <Card className="p-4 space-y-3">
          <h4 className="font-semibold">Región de integración (plano x–y)</h4>
          <div className="w-full h-[360px]">
            <Plot
              data={[
                {
                  type: "heatmap",
                  x: heat.xs,
                  y: heat.ys,
                  z: heat.Z,
                  showscale: false,
                  colorscale: [
                    [0, "rgba(56,189,248,0)"],
                    [1, "rgba(56,189,248,0.35)"],
                  ],
                  hoverinfo: "skip",
                } as any,
                {
                  type: "contour",
                  x: heat.xs,
                  y: heat.ys,
                  z: heat.Z.map((row) => row.map((v) => (Number.isFinite(v) ? 1 : 0))),
                  showscale: false,
                  contours: { coloring: "lines", showlabels: false, start: 0.5, end: 0.5, size: 1 },
                  line: { width: 2 },
                  hoverinfo: "skip",
                } as any,
              ]}
              layout={{
                margin: { l: 20, r: 10, t: 10, b: 30 },
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                xaxis: { title: "x", zeroline: true },
                yaxis: { title: "y", zeroline: true, scaleanchor: "x", scaleratio: 1 },
              } as any}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: "100%" }}
            />
          </div>

          <div className="rounded border p-3 bg-muted/30">
            <div className="text-sm">Resultado:</div>
            {result ? (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <div className="text-xs text-muted-foreground">∬ f·ρ dA</div>
                  <div className="font-mono">{Number.isFinite(result.mass) ? result.mass.toPrecision(6) : "n/a"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">x̄</div>
                  <div className="font-mono">{Number.isFinite(result.cx) ? result.cx.toPrecision(6) : "n/a"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">ȳ</div>
                  <div className="font-mono">{Number.isFinite(result.cy) ? result.cy.toPrecision(6) : "n/a"}</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Pulsa “Integrar ∬” para calcular.</div>
            )}
          </div>
        </Card>
      </div>
    </Tabs>
  );
}
