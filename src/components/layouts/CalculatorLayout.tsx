"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FunctionInput } from "../FunctionInput";
import { SurfaceVisualizer } from "../SurfaceVisualizer";
import DerivativesCalculator from "../derivatives-calculator";
import OptimizationCalculator, { Candidate } from "../optimization-calculator";
import { LimitsCalculator } from "@/components/limits-calculator";
import { Calculator, TrendingUp, Maximize2, Layers, Sigma } from "lucide-react";
import { Toaster } from "sonner";
import IntegrationCalculator from "../integration-calculator";

export function CalculatorLayout() {
  const [functionExpr, setFunctionExpr] = useState("sin(x) * cos(y)");
  const [limitPoint, setLimitPoint] = useState<{ x: number; y: number } | null>(null);

  // NUEVO: candidatos de optimización a pintar en 3D
  const [optPoints, setOptPoints] = useState<Candidate[]>([]);

  return (
    <div className="h-screen w-screen bg-gray-950 text-gray-100 p-6">
      <header className="border-b border-gray-800 mb-6 pb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
          <Calculator className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-blue-400">🧠 Derivotrón</h1>
          <p className="text-sm text-gray-400">Visualizador de cálculo multivariable</p>
        </div>
      </header>

      <main className="w-full grid gap-6 lg:grid-cols-[1fr_400px] px-8">
        {/* Visualización 3D */}
        <div className="space-y-6">
          <Card className="p-6 bg-gray-900 border-gray-800 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Visualización 3D</h2>
            <SurfaceVisualizer
              functionExpr={functionExpr}
              point={limitPoint ?? undefined}
              candidates={optPoints}
              showCandidates={true}
            />
          </Card>
        </div>

        {/* Función de entrada y cálculos */}
        <div className="space-y-6">
          <Card className="p-6 bg-gray-900 border-gray-800 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Función</h2>
            <FunctionInput value={functionExpr} onChange={setFunctionExpr} />
          </Card>

          {/* Opciones de cálculo */}
          <Card className="p-6 bg-gray-900 border-gray-800 rounded-lg shadow-lg">
            <Tabs defaultValue="derivatives" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="derivatives" className="text-xs text-gray-100">
                  <TrendingUp className="mr-1 h-3 w-3" /> Derivadas
                </TabsTrigger>
                <TabsTrigger value="optimization" className="text-xs text-gray-100">
                  <Maximize2 className="mr-1 h-3 w-3" /> Optimización
                </TabsTrigger>
                <TabsTrigger value="integration" className="text-xs text-gray-100">
                  <Layers className="mr-1 h-3 w-3" /> Integración
                </TabsTrigger>
                <TabsTrigger value="limits" className="text-xs text-gray-100">
                  <Sigma className="mr-1 h-3 w-3" /> Límites
                </TabsTrigger>
              </TabsList>

              <TabsContent value="derivatives" className="mt-4">
                <DerivativesCalculator functionExpr={functionExpr} />
              </TabsContent>

              <TabsContent value="optimization" className="mt-4">
                <OptimizationCalculator
                  functionExpr={functionExpr}
                  onCandidatesChange={setOptPoints}
                />
              </TabsContent>

              <TabsContent value="integration" className="mt-4">
                <IntegrationCalculator functionExpr={functionExpr} />
              </TabsContent>

              <TabsContent value="limits" className="mt-4">
                <LimitsCalculator
                  functionExpr={functionExpr}
                  onPointChange={setLimitPoint}
                />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
