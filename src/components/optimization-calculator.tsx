"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import * as math from "mathjs"

interface OptimizationCalculatorProps {
  functionExpr: string
}

export function OptimizationCalculator({ functionExpr }: OptimizationCalculatorProps) {
  const [constraint, setConstraint] = useState("x^2 + y^2 - 4")
  const [results, setResults] = useState<{
    criticalPoints: Array<{ x: number; y: number; value: number; lambda: number }>
  } | null>(null)

  const optimize = () => {
    try {
      // Simplified optimization using gradient descent with constraint
      const compiledF = math.compile(functionExpr)
      const compiledG = math.compile(constraint)

      const f = (x: number, y: number) => {
        try {
          return compiledF.evaluate({ x, y }) as number
        } catch {
          return 0
        }
      }

      const g = (x: number, y: number) => {
        try {
          return compiledG.evaluate({ x, y }) as number
        } catch {
          return 0
        }
      }

      // Numerical gradient
      const h = 0.0001
      const gradF = (x: number, y: number) => ({
        x: (f(x + h, y) - f(x - h, y)) / (2 * h),
        y: (f(x, y + h) - f(x, y - h)) / (2 * h),
      })

      const gradG = (x: number, y: number) => ({
        x: (g(x + h, y) - g(x - h, y)) / (2 * h),
        y: (g(x, y + h) - g(x, y - h)) / (2 * h),
      })

      // Find critical points using grid search
      const criticalPoints: Array<{ x: number; y: number; value: number; lambda: number }> = []
      const range = 5
      const step = 0.5

      for (let x = -range; x <= range; x += step) {
        for (let y = -range; y <= range; y += step) {
          if (Math.abs(g(x, y)) < 0.1) {
            const gf = gradF(x, y)
            const gg = gradG(x, y)

            // Check if gradients are parallel (Lagrange condition)
            const lambda = gg.x !== 0 ? gf.x / gg.x : gf.y / gg.y
            const error = Math.abs(gf.x - lambda * gg.x) + Math.abs(gf.y - lambda * gg.y)

            if (error < 0.5) {
              criticalPoints.push({
                x: Number.parseFloat(x.toFixed(2)),
                y: Number.parseFloat(y.toFixed(2)),
                value: f(x, y),
                lambda: Number.parseFloat(lambda.toFixed(4)),
              })
            }
          }
        }
      }

      // Remove duplicates
      const unique = criticalPoints.filter(
        (point, index, self) =>
          index === self.findIndex((p) => Math.abs(p.x - point.x) < 0.3 && Math.abs(p.y - point.y) < 0.3),
      )

      setResults({ criticalPoints: unique.slice(0, 5) })
    } catch (error) {
      console.error("[v0] Error in optimization:", error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="constraint" className="text-xs">
          Restricción g(x, y) = 0
        </Label>
        <Input
          id="constraint"
          value={constraint}
          onChange={(e) => setConstraint(e.target.value)}
          placeholder="x^2 + y^2 - 4"
          className="h-9 font-mono text-sm"
        />
      </div>

      <Button onClick={optimize} className="w-full" size="sm">
        Calcular con Lagrange
      </Button>

      {results && results.criticalPoints.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Puntos críticos encontrados:</Label>
          {results.criticalPoints.map((point, idx) => (
            <Card key={idx} className="bg-muted/50 p-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Punto:</span>
                  <span className="font-mono">
                    ({point.x.toFixed(2)}, {point.y.toFixed(2)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">f(x, y):</span>
                  <span className="font-mono font-medium">{point.value.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">λ:</span>
                  <span className="font-mono">{point.lambda.toFixed(4)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {results && results.criticalPoints.length === 0 && (
        <Card className="bg-muted/30 p-4">
          <p className="text-center text-xs text-muted-foreground">
            No se encontraron puntos críticos. Intente con otra restricción.
          </p>
        </Card>
      )}
    </div>
  )
}
