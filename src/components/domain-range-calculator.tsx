"use client";

import React, { useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { create, all } from "mathjs";
import { Card, CardHeader, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const math = create(all, { number: "number" });

/* ===========================================================
   NUEVA FUNCIÓN AGREGADA
   =========================================================== */
export function analyzeDomain(
  f: (x: number, y: number) => number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  samples = 50
) {
  const points: { x: number; y: number; valid: boolean }[] = [];
  const dx = (xMax - xMin) / samples;
  const dy = (yMax - yMin) / samples;

  for (let i = 0; i <= samples; i++) {
    for (let j = 0; j <= samples; j++) {
      const x = xMin + i * dx;
      const y = yMin + j * dy;
      const val = f(x, y);
      points.push({
        x,
        y,
        valid: Number.isFinite(val) && !Number.isNaN(val),
      });
    }
  }

  return points;
}

/* ===========================================================
   FUNCIONES AUXILIARES PARA GRID Y EVALUACIÓN
   =========================================================== */

type GridResult = {
  X: number[][];
  Y: number[][];
  Z: (number | null)[][];
  validMask: number[][];
  zMin: number | null;
  zMax: number | null;
  validCount: number;
  totalCount: number;
};

function buildGrid(
  xmin: number,
  xmax: number,
  ymin: number,
  ymax: number,
  n: number
): GridResult {
  const X: number[][] = [];
  const Y: number[][] = [];
  const Z: (number | null)[][] = [];
  const validMask: number[][] = [];

  let zMin: number | null = null;
  let zMax: number | null = null;
  let validCount = 0;
  const totalCount = n * n;

  for (let i = 0; i < n; i++) {
    const rowX: number[] = [];
    const rowY: number[] = [];
    const rowZ: (number | null)[] = [];
    const rowMask: number[] = [];
    const y = ymin + (i * (ymax - ymin)) / (n - 1);
    for (let j = 0; j < n; j++) {
      const x = xmin + (j * (xmax - xmin)) / (n - 1);
      rowX.push(x);
      rowY.push(y);
      rowZ.push(null);
      rowMask.push(0);
    }
    X.push(rowX);
    Y.push(rowY);
    Z.push(rowZ);
    validMask.push(rowMask);
  }

  return { X, Y, Z, validMask, zMin, zMax, validCount, totalCount };
}

function evaluateGrid(
  expr: string,
  xmin: number,
  xmax: number,
  ymin: number,
  ymax: number,
  n = 60
): GridResult {
  const res = buildGrid(xmin, xmax, ymin, ymax, n);
  let compiled: any;
  try {
    compiled = math.parse(expr).compile();
  } catch {
    return res;
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = res.X[i][j];
      const y = res.Y[i][j];
      try {
        const val = Number(compiled.evaluate({ x, y }));
        if (Number.isFinite(val)) {
          res.Z[i][j] = val;
          res.validMask[i][j] = 1;
          res.validCount++;
          res.zMin = res.zMin === null ? val : Math.min(res.zMin, val);
          res.zMax = res.zMax === null ? val : Math.max(res.zMax, val);
        }
      } catch {
        // deja como null / 0
      }
    }
  }
  return res;
}

/* ===========================================================
   COMPONENTE PRINCIPAL
   =========================================================== */

export default function DomainRangeCalculator() {
  const [xmin, setXmin] = useState("-3");
  const [xmax, setXmax] = useState("3");
  const [ymin, setYmin] = useState("-3");
  const [ymax, setYmax] = useState("3");
  const [n, setN] = useState("60");
  const [expr, setExpr] = useState("sin(x) * cos(y)");

  const result = useMemo(() => {
    const xi = parseFloat(xmin);
    const xa = parseFloat(xmax);
    const yi = parseFloat(ymin);
    const ya = parseFloat(ymax);
    const nn = Math.max(10, Math.min(200, parseInt(n)));
    if (![xi, xa, yi, ya].every(Number.isFinite) || xa <= xi || ya <= yi) {
      return null;
    }
    return evaluateGrid(expr, xi, xa, yi, ya, nn);
  }, [expr, xmin, xmax, ymin, ymax, n]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold">
            Dominio, rango y mapa de validez
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div>
              <Label htmlFor="xmin">x min</Label>
              <Input
                id="xmin"
                value={xmin}
                onChange={(e) => setXmin(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="xmax">x max</Label>
              <Input
                id="xmax"
                value={xmax}
                onChange={(e) => setXmax(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ymin">y min</Label>
              <Input
                id="ymin"
                value={ymin}
                onChange={(e) => setYmin(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ymax">y max</Label>
              <Input
                id="ymax"
                value={ymax}
                onChange={(e) => setYmax(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="n">Resolución (10–200)</Label>
              <Input
                id="n"
                value={n}
                onChange={(e) => setN(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="expr">f(x,y)</Label>
              <Input
                id="expr"
                value={expr}
                onChange={(e) => setExpr(e.target.value)}
              />
            </div>
          </div>

          {!result && (
            <div className="text-xs text-gray-400">
              Ajusta los parámetros para ver el dominio muestreado.
            </div>
          )}

          {result && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Heatmap de máscara de validez */}
              <div className="w-full h-[320px]">
                <Plot
                  data={[
                    {
                      type: "heatmap",
                      z: result.validMask,
                      showscale: false,
                      colorscale: [
                        [0, "rgba(200,50,50,1)"],
                        [1, "rgba(50,200,120,1)"],
                      ],
                    } as any,
                  ]}
                  layout={{
                    autosize: true,
                    margin: { l: 30, r: 10, t: 10, b: 30 },
                    xaxis: { title: "j (índice en x)" },
                    yaxis: { title: "i (índice en y)" },
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                  } as any}
                  useResizeHandler
                  style={{ width: "100%", height: "100%" }}
                />
              </div>

              {/* Heatmap de Z */}
              <div className="w-full h-[320px]">
                <Plot
                  data={[
                    {
                      type: "heatmap",
                      z: result.Z,
                      colorbar: { title: "z" },
                    } as any,
                  ]}
                  layout={{
                    autosize: true,
                    margin: { l: 30, r: 10, t: 10, b: 30 },
                    xaxis: { title: "j (índice en x)" },
                    yaxis: { title: "i (índice en y)" },
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                  } as any}
                  useResizeHandler
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>
          )}

          {result && (
            <div className="text-xs text-gray-300">
              <div>
                celdas válidas: {result.validCount} / {result.totalCount}
              </div>
              <div>
                rango z:{" "}
                {result.zMin === null ? "—" : result.zMin.toFixed(4)} a{" "}
                {result.zMax === null ? "—" : result.zMax.toFixed(4)}
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={() => {
              /* placeholder para CTA */
            }}
          >
            Recalcular
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
