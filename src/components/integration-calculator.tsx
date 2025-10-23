"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import * as math from "mathjs"

interface IntegrationCalculatorProps {
  functionExpr: string
}

export function IntegrationCalculator({ functionExpr }: IntegrationCalculatorProps) {
  const [xMin, setXMin] = useState("-2")
  const [xMax, setXMax] = useState("2")
  const [yMin, setYMin] = useState("-2")
  const [yMax, setYMax] = useState("2")
  const [zMin, setZMin] = useState("0")
  const [zMax, setZMax] = useState("2")
  const [result, setResult] = useState<number | null>(null)

  const calculateDoubleIntegral = () => {
    try {
      const compiledExpr = math.compile(functionExpr)
      const xMinVal = Number.parseFloat(xMin)
      const xMaxVal = Number.parseFloat(xMax)
      const yMinVal = Number.parseFloat(yMin)
      const yMaxVal = Number.parseFloat(yMax)

      if (isNaN(xMinVal) || isNaN(xMaxVal) || isNaN(yMinVal) || isNaN(yMaxVal)) {
        return
      }

      // Simpson's rule for double integration
      const n = 50
      const hx = (xMaxVal - xMinVal) / n
      const hy = (yMaxVal - yMinVal) / n

      let sum = 0

      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n; j++) {
          const x = xMinVal + i * hx
          const y = yMinVal + j * hy

          try {
            const z = compiledExpr.evaluate({ x, y }) as number

            if (isFinite(z)) {
              let weight = 1
              if (i === 0 || i === n) weight *= 0.5
              if (j === 0 || j === n) weight *= 0.5

              sum += weight * z
            }
          } catch {
            // Skip invalid points
          }
        }
      }

      const integral = sum * hx * hy
      setResult(isFinite(integral) ? integral : null)
    } catch (error) {
      console.error("[v0] Error calculating integral:", error)
    }
  }

  const calculateVolume = () => {
    try {
      const compiledExpr = math.compile(functionExpr)
      const xMinVal = Number.parseFloat(xMin)
      const xMaxVal = Number.parseFloat(xMax)
      const yMinVal = Number.parseFloat(yMin)
      const yMaxVal = Number.parseFloat(yMax)
      const zMinVal = Number.parseFloat(zMin)
      const zMaxVal = Number.parseFloat(zMax)

      if (isNaN(xMinVal) || isNaN(xMaxVal) || isNaN(yMinVal) || isNaN(yMaxVal) || isNaN(zMinVal) || isNaN(zMaxVal)) {
        return
      }

      // Calculate volume under surface
      const n = 40
      const hx = (xMaxVal - xMinVal) / n
      const hy = (yMaxVal - yMinVal) / n

      let volume = 0

      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n; j++) {
          const x = xMinVal + i * hx
          const y = yMinVal + j * hy

          try {
            const z = compiledExpr.evaluate({ x, y }) as number

            if (isFinite(z) && z >= zMinVal && z <= zMaxVal) {
              let weight = 1
              if (i === 0 || i === n) weight *= 0.5
              if (j === 0 || j === n) weight *= 0.5

              volume += weight * Math.max(0, z - zMinVal)
            }
          } catch {
            // Skip invalid points
          }
        }
      }

      const result = volume * hx * hy
      setResult(isFinite(result) ? result : null)
    } catch (error) {
      console.error("[v0] Error calculating volume:", error)
    }
  }

  return (
    <Tabs defaultValue="double" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="double" className="text-xs">
          Integral Doble
        </TabsTrigger>
        <TabsTrigger value="volume" className="text-xs">
          Volumen
        </TabsTrigger>
      </TabsList>

      <TabsContent value="double" className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="x-min" className="text-xs">
              x mín
            </Label>
            <Input
              id="x-min"
              type="number"
              step="0.1"
              value={xMin}
              onChange={(e) => setXMin(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="x-max" className="text-xs">
              x máx
            </Label>
            <Input
              id="x-max"
              type="number"
              step="0.1"
              value={xMax}
              onChange={(e) => setXMax(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="y-min" className="text-xs">
              y mín
            </Label>
            <Input
              id="y-min"
              type="number"
              step="0.1"
              value={yMin}
              onChange={(e) => setYMin(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="y-max" className="text-xs">
              y máx
            </Label>
            <Input
              id="y-max"
              type="number"
              step="0.1"
              value={yMax}
              onChange={(e) => setYMax(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <Button onClick={calculateDoubleIntegral} className="w-full" size="sm">
          Calcular ∬ f(x,y) dA
        </Button>

        {result !== null && (
          <Card className="bg-primary/10 p-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Resultado</div>
              <div className="font-mono text-lg font-bold">{result.toFixed(6)}</div>
            </div>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="volume" className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="vol-x-min" className="text-xs">
              x mín
            </Label>
            <Input
              id="vol-x-min"
              type="number"
              step="0.1"
              value={xMin}
              onChange={(e) => setXMin(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vol-x-max" className="text-xs">
              x máx
            </Label>
            <Input
              id="vol-x-max"
              type="number"
              step="0.1"
              value={xMax}
              onChange={(e) => setXMax(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vol-y-min" className="text-xs">
              y mín
            </Label>
            <Input
              id="vol-y-min"
              type="number"
              step="0.1"
              value={yMin}
              onChange={(e) => setYMin(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vol-y-max" className="text-xs">
              y máx
            </Label>
            <Input
              id="vol-y-max"
              type="number"
              step="0.1"
              value={yMax}
              onChange={(e) => setYMax(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="z-min" className="text-xs">
              z mín
            </Label>
            <Input
              id="z-min"
              type="number"
              step="0.1"
              value={zMin}
              onChange={(e) => setZMin(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="z-max" className="text-xs">
              z máx
            </Label>
            <Input
              id="z-max"
              type="number"
              step="0.1"
              value={zMax}
              onChange={(e) => setZMax(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <Button onClick={calculateVolume} className="w-full" size="sm">
          Calcular Volumen
        </Button>

        {result !== null && (
          <Card className="bg-primary/10 p-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Volumen</div>
              <div className="font-mono text-lg font-bold">{result.toFixed(6)} u³</div>
            </div>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  )
}
