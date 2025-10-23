"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import * as math from "mathjs"

interface DerivativesCalculatorProps {
  functionExpr: string
}

export function DerivativesCalculator({ functionExpr }: DerivativesCalculatorProps) {
  const [x, setX] = useState("0")
  const [y, setY] = useState("0")
  const [results, setResults] = useState<{
    fx: string
    fy: string
    fxValue: number | null
    fyValue: number | null
    gradient: string
    gradientMagnitude: number | null
  } | null>(null)

  const calculate = () => {
    try {
      const xVal = Number.parseFloat(x)
      const yVal = Number.parseFloat(y)

      if (isNaN(xVal) || isNaN(yVal)) {
        return
      }

      // Calculate partial derivatives numerically
      const h = 0.0001
      const compiledExpr = math.compile(functionExpr)

      const f = (xv: number, yv: number) => {
        try {
          return compiledExpr.evaluate({ x: xv, y: yv }) as number
        } catch {
          return 0
        }
      }

      // Partial derivative with respect to x
      const fxValue = (f(xVal + h, yVal) - f(xVal - h, yVal)) / (2 * h)

      // Partial derivative with respect to y
      const fyValue = (f(xVal, yVal + h) - f(xVal, yVal - h)) / (2 * h)

      // Gradient magnitude
      const gradientMagnitude = Math.sqrt(fxValue ** 2 + fyValue ** 2)

      setResults({
        fx: "∂f/∂x",
        fy: "∂f/∂y",
        fxValue: isFinite(fxValue) ? fxValue : null,
        fyValue: isFinite(fyValue) ? fyValue : null,
        gradient: `∇f = (${fxValue.toFixed(4)}, ${fyValue.toFixed(4)})`,
        gradientMagnitude: isFinite(gradientMagnitude) ? gradientMagnitude : null,
      })
    } catch (error) {
      console.error("[v0] Error calculating derivatives:", error)
    }
  }

  useEffect(() => {
    calculate()
  }, [functionExpr, x, y])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="x-point" className="text-xs">
            Punto x
          </Label>
          <Input
            id="x-point"
            type="number"
            step="0.1"
            value={x}
            onChange={(e) => setX(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="y-point" className="text-xs">
            Punto y
          </Label>
          <Input
            id="y-point"
            type="number"
            step="0.1"
            value={y}
            onChange={(e) => setY(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {results && (
        <div className="space-y-3">
          <Card className="bg-muted/50 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{results.fx}:</span>
                <span className="font-mono font-medium">
                  {results.fxValue !== null ? results.fxValue.toFixed(4) : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{results.fy}:</span>
                <span className="font-mono font-medium">
                  {results.fyValue !== null ? results.fyValue.toFixed(4) : "N/A"}
                </span>
              </div>
            </div>
          </Card>

          <Card className="bg-primary/10 p-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Gradiente</div>
              <div className="font-mono text-sm">{results.gradient}</div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Magnitud:</span>
                <span className="font-mono font-medium">
                  {results.gradientMagnitude !== null ? results.gradientMagnitude.toFixed(4) : "N/A"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
