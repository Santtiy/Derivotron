"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FunctionInput } from "../FunctionInput"
import { SurfaceVisualizer } from "../SurfaceVisualizer"
import { DerivativesCalculator } from "@/components/derivatives-calculator"
import { OptimizationCalculator } from "@/components/optimization-calculator"
import { IntegrationCalculator } from "@/components/integration-calculator"
import { LimitsCalculator } from "@/components/limits-calculator"
import { Calculator, TrendingUp, Maximize2, Layers, Sigma } from "lucide-react"

export function CalculatorLayout() {
  const [functionExpr, setFunctionExpr] = useState("sin(x) * cos(y)")

  return (
    <div className="h-screen w-screen bg-gray-950 text-gray-100 p-6">
      {/* Encabezado */}
      <header className="border-b border-gray-800 mb-6 pb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
          <Calculator className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-blue-400">🧠 Derivotrón</h1>
          <p className="text-sm text-gray-400">
            Visualizador de cálculo multivariable
          </p>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="w-full grid gap-6 lg:grid-cols-[1fr_400px] px-8">
        {/* Columna izquierda - Gráfica */}
        <div className="space-y-6">
          <Card className="p-6 bg-gray-900 border-gray-800">
            <h2 className="text-lg font-semibold mb-3">Visualización 3D</h2>
            <SurfaceVisualizer functionExpr={functionExpr} />
          </Card>
        </div>

        {/* Columna derecha - Controles */}
        <div className="space-y-6">
          <Card className="p-6 bg-gray-900 border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Función</h2>
            <FunctionInput value={functionExpr} onChange={setFunctionExpr} />
          </Card>

          <Card className="p-6 bg-gray-900 border-gray-800">
            <Tabs defaultValue="derivatives" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="derivatives" className="text-xs">
                  <TrendingUp className="mr-1 h-3 w-3" /> Derivadas
                </TabsTrigger>
                <TabsTrigger value="optimization" className="text-xs">
                  <Maximize2 className="mr-1 h-3 w-3" /> Optimización
                </TabsTrigger>
                <TabsTrigger value="integration" className="text-xs">
                  <Layers className="mr-1 h-3 w-3" /> Integración
                </TabsTrigger>
                <TabsTrigger value="limits" className="text-xs">
                  <Sigma className="mr-1 h-3 w-3" /> Límites
                </TabsTrigger>
              </TabsList>

              <TabsContent value="derivatives" className="mt-4">
                <DerivativesCalculator functionExpr={functionExpr} />
              </TabsContent>

              <TabsContent value="optimization" className="mt-4">
                <OptimizationCalculator functionExpr={functionExpr} />
              </TabsContent>

              <TabsContent value="integration" className="mt-4">
                <IntegrationCalculator functionExpr={functionExpr} />
              </TabsContent>

              <TabsContent value="limits" className="mt-4">
                <LimitsCalculator functionExpr={functionExpr} />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  )
}
