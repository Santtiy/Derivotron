"use client";

import React, { useState, useMemo } from "react";
import { create, all } from "mathjs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gradientAt } from "../lib/derivatives";
import { analyzeDomainAndRange } from "../lib/domain-range";

const math = create(all);

/* ===========================================================
   COMPONENTE PRINCIPAL: DerivativesCalculator
   =========================================================== */
export default function DerivativesCalculator({
  functionExpr = "x^2 + y^2",
  initialPoint = { x: 0, y: 0 },
}: {
  functionExpr?: string;
  initialPoint?: { x: number; y: number };
}) {
  const [expr, setExpr] = useState<string>(functionExpr);
  const [point, setPoint] = useState<{ x: number; y: number }>(initialPoint);

  const compiled = useMemo(() => {
    try {
      return math.compile(expr);
    } catch {
      return null;
    }
  }, [expr]);

  const evalFn = useMemo(() => {
    if (!compiled) return null;
    return (x: number, y: number) => Number(compiled.evaluate({ x, y }));
  }, [compiled]);

  const gradient = useMemo(() => {
    if (!evalFn) return null;
    return gradientAt(evalFn, point.x, point.y);
  }, [evalFn, point]);

  const scan = useMemo(
    () => evalFn ? analyzeDomainAndRange(evalFn, -5, 5, -5, 5, 50, 50) : { range: null, invalidPoints: 0, total: 0 },
    [evalFn]
  );

  return (
    <div className="space-y-6">
      {/* Panel principal para ingresar f y punto */}
      <Card className="p-4 bg-gray-900 border-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold text-blue-400 mb-4">
          Derivadas Parciales / Gradiente
        </h2>

        <div className="grid gap-3">
          <div>
            <Label>f(x,y)</Label>
            <Input
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              placeholder="Ej: x^2 + y^2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>x₀</Label>
              <Input
                type="number"
                value={point.x}
                onChange={(e) =>
                  setPoint((p) => ({ ...p, x: parseFloat(e.target.value) }))
                }
              />
            </div>
            <div>
              <Label>y₀</Label>
              <Input
                type="number"
                value={point.y}
                onChange={(e) =>
                  setPoint((p) => ({ ...p, y: parseFloat(e.target.value) }))
                }
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Panel de resultados del gradiente */}
      <Card className="p-4 bg-gray-900 border-gray-800 rounded-lg">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-400">∂f/∂x</label>
            <div className="font-mono text-lg text-gray-100">
              {gradient ? gradient.dfdx.toPrecision(6) : "—"}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400">∂f/∂y</label>
            <div className="font-mono text-lg text-gray-100">
              {gradient ? gradient.dfdy.toPrecision(6) : "—"}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400">||∇f||</label>
            <div className="font-mono text-lg text-gray-100">
              {gradient ? gradient.mag.toPrecision(6) : "—"}
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-400 mt-3">
          Evaluado en:{" "}
          <span className="font-mono">
            ({point.x.toPrecision(3)}, {point.y.toPrecision(3)})
          </span>
        </div>

        <div className="mt-4 text-xs text-gray-400">
          Rango estimado (malla 50x50): {scan.range ? `${scan.range.min.toPrecision(4)} a ${scan.range.max.toPrecision(4)}` : "—"} ·
          Puntos inválidos: {scan.invalidPoints}/{scan.total}
        </div>
      </Card>
    </div>
  );
}
