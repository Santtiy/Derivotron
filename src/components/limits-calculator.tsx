"use client"

import { useState } from "react"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { toast } from "sonner"
import * as math from "mathjs"

interface LimitsCalculatorProps {
  functionExpr: string
  onPointChange?: (point: { x: number; y: number }) => void
}

export function LimitsCalculator({ functionExpr, onPointChange }: LimitsCalculatorProps) {
  const [x0, setX0] = useState("0")
  const [y0, setY0] = useState("0")
  const [result, setResult] = useState<number | null>(null)

  const handleChange = (axis: "x" | "y", value: string) => {
    if (axis === "x") setX0(value)
    else setY0(value)

    if (onPointChange)
      onPointChange({
        x: parseFloat(axis === "x" ? value : x0),
        y: parseFloat(axis === "y" ? value : y0),
      })
  }

  const calculateLimit = () => {
    try {
      if (!functionExpr || functionExpr.trim() === "") {
        throw new Error("Debe ingresar una expresión matemática.")
      }

      // Intentar compilar la función
      let compiled
      try {
        compiled = math.compile(functionExpr)
      } catch {
        throw new Error("Error de sintaxis en la expresión.")
      }

      const a = parseFloat(x0)
      const b = parseFloat(y0)
      if (isNaN(a) || isNaN(b)) {
        throw new Error("Los valores de x o y no son válidos.")
      }

      const h = 1e-4
      const directions = [
        { x: a + h, y: b },
        { x: a - h, y: b },
        { x: a, y: b + h },
        { x: a, y: b - h },
        { x: a + h, y: b + h },
        { x: a - h, y: b - h },
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

      if (values.length === 0) {
        throw new Error("No se pudo evaluar la función en el entorno del punto.")
      }

      const average = values.reduce((sum, v) => sum + v, 0) / values.length
      setResult(average)

      // ✅ Mostrar toast de éxito
      toast.success(`Límite calculado correctamente: ${average.toFixed(6)}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido al calcular el límite."
      toast.error(`❌ ${message}`)
      setResult(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Entradas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="x0" className="text-xs text-gray-400">
            x →
          </Label>
          <Input
            id="x0"
            type="number"
            step="0.1"
            value={x0}
            onChange={(e) => handleChange("x", e.target.value)}
            className="h-9 bg-gray-800 text-gray-100 border-gray-700"
          />
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
          <Label htmlFor="y0" className="text-xs text-gray-400">
            y →
          </Label>
          <Input
            id="y0"
            type="number"
            step="0.1"
            value={y0}
            onChange={(e) => handleChange("y", e.target.value)}
            className="h-9 bg-gray-800 text-gray-100 border-gray-700"
          />
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

      {/* Botón para calcular */}
      <Button
        onClick={calculateLimit}
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
    </div>
  )
}
