"use client"

import { useState } from "react"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import * as math from "mathjs"

interface LimitsCalculatorProps {
  functionExpr: string
  onPointChange?: (point: { x: number; y: number }) => void
}

export function LimitsCalculator({ functionExpr, onPointChange }: LimitsCalculatorProps) {
  const [x0, setX0] = useState("0")
  const [y0, setY0] = useState("0")
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (axis: "x" | "y", value: string) => {
    if (axis === "x") setX0(value)
    else setY0(value)

    if (onPointChange)
      onPointChange({
        x: parseFloat(axis === "x" ? value : x0),
        y: parseFloat(axis === "y" ? value : y0),
      })

    calculateLimit(parseFloat(axis === "x" ? value : x0), parseFloat(axis === "y" ? value : y0))
  }

  const calculateLimit = (a?: number, b?: number) => {
    try {
      if (!functionExpr || functionExpr.trim() === "") {
        throw new Error("Debe ingresar una expresión matemática.")
      }

      // Intentar compilar la expresión
      let compiled
      try {
        compiled = math.compile(functionExpr)
      } catch {
        throw new Error("La expresión contiene un error de sintaxis.")
      }

      const xVal = a ?? parseFloat(x0)
      const yVal = b ?? parseFloat(y0)
      if (isNaN(xVal) || isNaN(yVal)) {
        throw new Error("Los valores de x o y no son válidos.")
      }

      const h = 1e-4
      const directions = [
        { x: xVal + h, y: yVal },
        { x: xVal - h, y: yVal },
        { x: xVal, y: yVal + h },
        { x: xVal, y: yVal - h },
        { x: xVal + h, y: yVal + h },
        { x: xVal - h, y: yVal - h },
      ]

      const values = directions
        .map((p) => {
          try {
            const val = compiled.evaluate({ x: p.x, y: p.y }) as number
            return isFinite(val) ? val : NaN
          } catch {
            return NaN
          }
        })
        .filter((v) => !isNaN(v))

      if (values.length === 0) throw new Error("No se pudo evaluar la función.")

      const avg = values.reduce((s, v) => s + v, 0) / values.length
      setResult(avg)
      setError(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error desconocido al evaluar."
      setError(message)
      setResult(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Entradas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="x0" className="text-xs text-gray-400">x →</Label>
          <Input
            id="x0"
            type="number"
            step="0.1"
            value={x0}
            onChange={(e) => handleChange("x", e.target.value)}
            className="h-9 bg-gray-800 text-gray-100 border-gray-700"
          />
          {/* Slider para x */}
          <input
            type="range"
            min={-5}
            max={5}
            step={0.1}
            value={x0}
            onChange={(e) => handleChange("x", e.target.value)}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="y0" className="text-xs text-gray-400">y →</Label>
          <Input
            id="y0"
            type="number"
            step="0.1"
            value={y0}
            onChange={(e) => handleChange("y", e.target.value)}
            className="h-9 bg-gray-800 text-gray-100 border-gray-700"
          />
          {/* Slider para y */}
          <input
            type="range"
            min={-5}
            max={5}
            step={0.1}
            value={y0}
            onChange={(e) => handleChange("y", e.target.value)}
            className="w-full accent-blue-500"
          />
        </div>
      </div>

      {/* Botón manual de cálculo */}
      <Button
        onClick={() => calculateLimit()}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
      >
        Calcular límite
      </Button>

      {/* Resultado */}
      {result !== null && (
        <Card className="bg-gray-800 border-gray-700 p-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-400">Resultado:</div>
            <div className="font-mono text-lg font-bold text-blue-400">
              {isNaN(result) ? "Indeterminado" : result.toFixed(6)}
            </div>
          </div>
        </Card>
      )}

      {/* Mensajes de error */}
      {error && (
        <div className="bg-red-800/50 text-red-300 text-sm rounded-md p-2">
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}
