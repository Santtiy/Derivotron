"use client";

import { useEffect, useState } from "react";
import type { ComponentType, Dispatch, SetStateAction } from "react";
import { evaluate } from "mathjs";
import { Card } from "../ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { FunctionInput } from "../FunctionInput";
import { SurfaceVisualizer } from "../SurfaceVisualizer";
import { FunctionsTable } from "../FunctionsTable";
import DerivativesCalculator from "../derivatives-calculator";
import OptimizationCalculator, { Candidate } from "../optimization-calculator";
import IntegrationCalculator from "../integration-calculator";
import { LimitsCalculator } from "../limits-calculator";

type OptimizationCalculatorWithCandidatesProps = {
  functionExpr: string;
  onCandidates?: Dispatch<SetStateAction<Candidate[]>>;
};

const OptimizationCalculatorWithCandidates = OptimizationCalculator as unknown as ComponentType<OptimizationCalculatorWithCandidatesProps>;

export function CalculatorLayout() {
  const [functionExpr, setFunctionExpr] = useState("sin(x) * cos(y)");
  const [limitPoint, setLimitPoint] = useState<{ x: number; y: number } | null>(null);
  const [optPoints, setOptPoints] = useState<Candidate[]>([]);
  const [regionRect, setRegionRect] = useState<{ ax: number; bx: number; cy: number; dy: number } | null>(null);
  const [zRange, setZRange] = useState<{ zmin: number; zmax: number } | null>(null);
  const [pathsLimits, setPathsLimits] = useState<{label:string; points:{x:number;y:number}[]}[]>([]);
  const [regionTypeI, setRegionTypeI] = useState<any>(null);
  const [regionTypeII, setRegionTypeII] = useState<any>(null);
  const [regionPolar, setRegionPolar] = useState<any>(null);
  const [showTangent, setShowTangent] = useState(true);
  const [showGradient, setShowGradient] = useState(true);

  // Calcula un rango aproximado de z para ayudar a la visualización
  useEffect(() => {
    const xs = Array.from({ length: 32 }, (_, i) => -4 + i * 0.25);
    const ys = Array.from({ length: 32 }, (_, i) => -4 + i * 0.25);
    let zmin = Infinity, zmax = -Infinity;
    for (const x of xs) for (const y of ys) {
      try {
        const v = Number(evaluate(functionExpr, { x, y }));
        if (Number.isFinite(v)) { if (v < zmin) zmin = v; if (v > zmax) zmax = v; }
      } catch {}
    }
    if (isFinite(zmin) && isFinite(zmax)) setZRange({ zmin, zmax }); else setZRange(null);
  }, [functionExpr]);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4">
      {/* Izquierda: Funciones de ejemplo | Derecha: contenido */}
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
        {/* IZQUIERDA: tabla de funciones */}
        <aside className="min-w-0 lg:sticky lg:top-16 h-auto lg:h-[calc(100vh-5rem)] overflow-auto rounded-lg border border-gray-800 bg-gray-900 p-3">
          <FunctionsTable onUse={(expr) => setFunctionExpr(expr)} />
        </aside>

        {/* DERECHA: pestañas, expresión y 3D */}
        <div className="min-w-0 space-y-6">
          <Card className="p-0 bg-gray-900 border-gray-800">
            <Tabs defaultValue="derivatives" className="w-full">
              <div className="px-4 pt-3">
                <TabsList className="flex flex-wrap gap-2">
                  <TabsTrigger value="derivatives">Derivadas</TabsTrigger>
                  <TabsTrigger value="opt">Optimización</TabsTrigger>
                  <TabsTrigger value="integration">Integración</TabsTrigger>
                  <TabsTrigger value="limits">Límites</TabsTrigger>
                </TabsList>
              </div>
              <div className="px-4 pb-4 pt-2 space-y-4">
                <TabsContent value="derivatives">
                  <DerivativesCalculator functionExpr={functionExpr} onPointChange={(p)=>setLimitPoint(p)} />
                </TabsContent>
                <TabsContent value="opt">
                  <OptimizationCalculatorWithCandidates functionExpr={functionExpr} onCandidates={setOptPoints} />
                </TabsContent>
                <TabsContent value="integration">
                  <IntegrationCalculator functionExpr={functionExpr} onRegionChange={(r)=>setRegionRect(r)} />
                </TabsContent>
                <TabsContent value="limits">
                  <LimitsCalculator functionExpr={functionExpr} onPointChange={(p)=>setLimitPoint(p)} />
                </TabsContent>
              </div>
            </Tabs>
          </Card>

          {/* Expresión matemática */}
          <Card className="p-4 bg-gray-900 border-gray-800">
            <FunctionInput value={functionExpr} onChange={setFunctionExpr} />
          </Card>

          {/* Visualización 3D */}
          <Card className="p-4 bg-gray-900 border-gray-800">
            <h2 className="text-lg font-semibold text-gray-100 mb-3">Visualización 3D</h2>
            <SurfaceVisualizer
              functionExpr={functionExpr}
              point={limitPoint ?? undefined}
              candidates={optPoints}
              regionRect={regionRect ?? undefined}
              zRange={zRange ?? undefined}
              limitPaths={pathsLimits}
              regionTypeI={regionTypeI}
              regionTypeII={regionTypeII}
              regionPolar={regionPolar}
              showTangent={showTangent}
              showGradient={showGradient}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
