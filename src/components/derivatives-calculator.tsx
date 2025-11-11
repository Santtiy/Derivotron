import React, { useState, useMemo, useEffect } from "react";
import { create, all } from "mathjs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { gradientAt } from "../lib/derivatives";
import { analyzeDomainAndRange } from "../lib/domain-range";
import { trySymbolicDerivatives, tangentPlaneAt } from "../lib/symbolic";

const math = create(all);

interface Props {
  functionExpr: string;
  onPointChange?: (p: { x: number; y: number } | null) => void;
}

export default function DerivativesCalculator({ functionExpr, onPointChange }: Props) {
  const [expr, setExpr] = useState<string>(functionExpr ?? "");
  const [rawPoint, setRawPoint] = useState<string>("0,0");
  const [point, setPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [forceRecalc, setForceRecalc] = useState(0);

  // Mantener expr sincronizada con la función global
  useEffect(() => {
    setExpr(functionExpr ?? "");
  }, [functionExpr]);

  // Parsear “x,y” a objeto punto y emitir al 3D
  useEffect(() => {
    const parts = rawPoint.split(/[,;\s]+/).filter(Boolean);
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      const p = { x, y };
      setPoint(p);
      onPointChange?.(p);
    } else {
      onPointChange?.(null);
    }
  }, [rawPoint, onPointChange]);

  const allowedPattern = /^[0-9a-zA-Z+\-*/^().,\s]*$/;
  function safeCompile(expr: string) {
    if (!allowedPattern.test(expr)) return null;
    try {
      return math.compile(expr);
    } catch {
      return null;
    }
  }

  const compiled = useMemo(() => safeCompile(expr), [expr, forceRecalc]);

  const evalFn = useMemo(() => {
    if (!compiled) return null;
    return (x: number, y: number) => {
      try {
        return Number(compiled.evaluate({ x, y }));
      } catch {
        return NaN;
      }
    };
  }, [compiled]);

  const gradient = useMemo(() => {
    if (!evalFn) return null;
    return gradientAt(evalFn, point.x, point.y);
  }, [evalFn, point]);

  const symbolic = useMemo(() => trySymbolicDerivatives(expr), [expr]);

  const plane = useMemo(() => {
    if (!evalFn || !gradient) return null;
    return tangentPlaneAt(evalFn, gradient, point.x, point.y);
  }, [evalFn, gradient, point]);

  const scan = useMemo(
    () =>
      evalFn
        ? analyzeDomainAndRange(evalFn, -5, 5, -5, 5, 40, 40)
        : { range: null, invalidPoints: 0, total: 0 },
    [evalFn]
  );

  const invalidPct =
    scan.total > 0 ? ((scan.invalidPoints / scan.total) * 100).toFixed(1) : "0.0";

  const hasError = !compiled;

  const applyPreset = (p: string) => {
    setExpr(p);
    setForceRecalc((c) => c + 1);
  };

  const handleRecalc = () => {
    setForceRecalc((c) => c + 1);
    onPointChange?.(point); // vuelve a emitir el punto actual
  };

  return (
    <div className="space-y-5">
      <Card className="p-4 bg-gray-900 border-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold text-blue-400 mb-4">Derivadas / Gradiente</h2>

        <div className="grid gap-3">
          <div>
            <Label>f(x,y)</Label>
            <Input
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              className={hasError ? "border-red-500" : ""}
              placeholder="Ej: x^2 + y^2"
            />
            {hasError && (
              <div className="text-xs text-red-400 mt-1">
                Expresión inválida. Revisa sintaxis.
              </div>
            )}
          </div>

          <div>
            <Label>Punto (x0,y0)</Label>
            <Input
              value={rawPoint}
              onChange={(e) => setRawPoint(e.target.value)}
              placeholder="Ej: 1,2"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Button variant="outline" onClick={() => applyPreset("x^2 + y^2")} className="h-7 px-2">
              x²+y²
            </Button>
            <Button variant="outline" onClick={() => applyPreset("sin(x)*cos(y)")} className="h-7 px-2">
              sin(x)cos(y)
            </Button>
            <Button variant="outline" onClick={() => applyPreset("exp(x*y)")} className="h-7 px-2">
              {"e^{xy}"}
            </Button>
            <Button variant="outline" onClick={() => applyPreset("1/(x^2 + y^2)")} className="h-7 px-2">
              1/(x²+y²)
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleRecalc} disabled={hasError} className="h-8">
              Recalcular
            </Button>
            <Button variant="ghost" onClick={() => setShowAdvanced((s) => !s)} className="h-8 text-xs">
              {showAdvanced ? "Ocultar avanzado" : "Mostrar avanzado"}
            </Button>
          </div>
        </div>
      </Card>

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
          Punto: <span className="font-mono">({point.x.toPrecision(3)}, {point.y.toPrecision(3)})</span>
        </div>

        <div className="mt-3 text-xs text-gray-400">
          Rango (≈):{" "}
          {scan.range ? `${scan.range.min.toPrecision(4)} a ${scan.range.max.toPrecision(4)}` : "—"} ·
          Inválidos: {scan.invalidPoints}/{scan.total} ({invalidPct}%)
        </div>

        {showAdvanced && (
          <div className="mt-4 space-y-2 border-t border-gray-800 pt-3 text-xs text-gray-300">
            <div className="font-semibold text-blue-300">Avanzado</div>
            <div>
              Derivadas simbólicas:{" "}
              {symbolic ? <span className="font-mono">fx={symbolic.dx} · fy={symbolic.dy}</span> : "No disponible"}
            </div>
            <div>
              Plano tangente:{" "}
              {plane ? (
                <span className="font-mono">
                  z ≈ {plane.z0.toPrecision(4)} + {plane.a.toPrecision(4)}(x-{point.x.toPrecision(3)}) +{" "}
                  {plane.b.toPrecision(4)}(y-{point.y.toPrecision(3)})
                </span>
              ) : (
                "—"
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
