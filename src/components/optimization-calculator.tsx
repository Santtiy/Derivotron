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

type Point = { x: number; y: number; value: number; lambda: number }

export function OptimizationCalculator({ functionExpr }: OptimizationCalculatorProps) {
  const [constraint, setConstraint] = useState("x^2 + y^2 - 4")
  const [results, setResults] = useState<{ criticalPoints: Array<Point> } | null>(null)

  // ---------- Helpers numéricos ----------
  const compile = (expr: string) => {
    const node = math.parse(expr)
    return node.compile()
  }

  const makeEval = (compiled: math.EvalFunction) => (scope: { x: number; y: number }) => {
    const v = compiled.evaluate(scope)
    return Number(v)
  }

  // Derivadas con diferencias centradas
  const dfdx = (f: (x: number, y: number) => number, x: number, y: number, h = 1e-5) =>
    (f(x + h, y) - f(x - h, y)) / (2 * h)
  const dfdy = (f: (x: number, y: number) => number, x: number, y: number, h = 1e-5) =>
    (f(x, y + h) - f(x, y - h)) / (2 * h)

  const hess2 = (f: (x: number, y: number) => number, x: number, y: number, h = 1e-4) => {
    const fxx = (f(x + h, y) - 2 * f(x, y) + f(x - h, y)) / (h * h)
    const fyy = (f(x, y + h) - 2 * f(x, y) + f(x, y - h)) / (h * h)
    const fxy =
      (f(x + h, y + h) - f(x + h, y - h) - f(x - h, y + h) + f(x - h, y - h)) / (4 * h * h)
    return { fxx, fyy, fxy }
  }

  // Resuelve el sistema de Lagrange con Newton 3D (x,y,lambda)
  function newtonLagrange(
    f: (x: number, y: number) => number,
    g: (x: number, y: number) => number,
    x0: number,
    y0: number,
    lambda0 = 0,
    opts?: { tol?: number; maxIt?: number }
  ): { x: number; y: number; lambda: number; ok: boolean } {
    const tol = opts?.tol ?? 1e-8
    const maxIt = opts?.maxIt ?? 40
    let x = x0,
      y = y0,
      lam = lambda0

    for (let k = 0; k < maxIt; k++) {
      const fx = dfdx(f, x, y)
      const fy = dfdy(f, x, y)
      const gx = dfdx(g, x, y)
      const gy = dfdy(g, x, y)

      // Ecuaciones
      const F1 = fx - lam * gx
      const F2 = fy - lam * gy
      const F3 = g(x, y)

      const res = Math.abs(F1) + Math.abs(F2) + Math.abs(F3)
      if (!Number.isFinite(res)) break
      if (res < tol) return { x, y, lambda: lam, ok: true }

      // Jacobiano del sistema
      const Hf = hess2(f, x, y)
      const Hg = hess2(g, x, y)

      // Parciales:
      // dF1/dx = fxx - lam*gxx ; dF1/dy = fxy - lam*gxy ; dF1/dlam = -gx
      // dF2/dx = fxy - lam*gxy ; dF2/dy = fyy - lam*gyy ; dF2/dlam = -gy
      // dF3/dx = gx ; dF3/dy = gy ; dF3/dlam = 0
      const a11 = Hf.fxx - lam * Hg.fxx
      const a12 = Hf.fxy - lam * Hg.fxy
      const a13 = -gx

      const a21 = Hf.fxy - lam * Hg.fxy
      const a22 = Hf.fyy - lam * Hg.fyy
      const a23 = -gy

      const a31 = gx
      const a32 = gy
      const a33 = 0

      // Resolver A * delta = -F con Cramer o Gauss simple (3x3)
      const detA =
        a11 * (a22 * a33 - a23 * a32) -
        a12 * (a21 * a33 - a23 * a31) +
        a13 * (a21 * a32 - a22 * a31)

      if (!Number.isFinite(detA) || Math.abs(detA) < 1e-18) {
        // fallback: un paso pequeño hacia g=0 + corrección de paralelismo
        const step = 1e-2
        x -= step * F3 * gx
        y -= step * F3 * gy
        lam = lam // sin cambio
        continue
      }

      const b1 = -F1,
        b2 = -F2,
        b3 = -F3

      const dx =
        (b1 * (a22 * a33 - a23 * a32) -
          a12 * (b2 * a33 - a23 * b3) +
          a13 * (b2 * a32 - a22 * b3)) /
        detA
      const dy =
        (a11 * (b2 * a33 - a23 * b3) -
          b1 * (a21 * a33 - a23 * a31) +
          a13 * (a21 * b3 - b2 * a31)) /
        detA
      const dl =
        (a11 * (a22 * b3 - b2 * a32) -
          a12 * (a21 * b3 - b2 * a31) +
          b1 * (a21 * a32 - a22 * a31)) /
        detA

      // Amortiguación si el paso explota
      let step = 1.0
      let xN = x + step * dx
      let yN = y + step * dy
      let lN = lam + step * dl
      let tries = 0
      while (
        tries < 6 &&
        (!Number.isFinite(xN) || !Number.isFinite(yN) || !Number.isFinite(lN))
      ) {
        step *= 0.5
        xN = x + step * dx
        yN = y + step * dy
        lN = lam + step * dl
        tries++
      }

      x = xN
      y = yN
      lam = lN
      if (Math.hypot(dx, dy) * step < tol) return { x, y, lambda: lam, ok: true }
    }
    return { x, y, lambda: lam, ok: false }
  }

  const optimize = () => {
    try {
      // Compilar funciones
      const compiledF = compile(functionExpr)
      const compiledG = compile(constraint)
      const f = (x: number, y: number) => makeEval(compiledF)({ x, y })
      const g = (x: number, y: number) => makeEval(compiledG)({ x, y })

      // 1) Búsqueda en grilla (igual idea que tenías) para semillas cercanas a g=0
      const seeds: Array<{ x: number; y: number; lambda: number }> = []
      const range = 5
      const step = 0.5
      const tolG = 0.15

      const gradF = (x: number, y: number) => ({
        x: dfdx(f, x, y),
        y: dfdy(f, x, y),
      })
      const gradG = (x: number, y: number) => ({
        x: dfdx(g, x, y),
        y: dfdy(g, x, y),
      })

      for (let x = -range; x <= range; x += step) {
        for (let y = -range; y <= range; y += step) {
          const gv = g(x, y)
          if (Math.abs(gv) < tolG) {
            const gf = gradF(x, y)
            const gg = gradG(x, y)
            // lambda aproximado (mejor que 0): proyecta gf sobre gg
            const denom = gg.x * gg.x + gg.y * gg.y
            const lam0 =
              denom > 1e-12 ? (gf.x * gg.x + gf.y * gg.y) / denom : 0
            seeds.push({ x, y, lambda: lam0 })
          }
        }
      }

      // 2) Refinar con Newton cada semilla
      const candidates: Point[] = []
      const seen: Array<{ x: number; y: number }> = []
      const isNear = (a: { x: number; y: number }, b: { x: number; y: number }) =>
        Math.abs(a.x - b.x) < 0.2 && Math.abs(a.y - b.y) < 0.2

      for (const s of seeds) {
        const sol = newtonLagrange(f, g, s.x, s.y, s.lambda)
        if (!sol.ok || !Number.isFinite(sol.x) || !Number.isFinite(sol.y)) continue
        // de-dup
        if (seen.some((p) => isNear(p, sol))) continue
        seen.push({ x: sol.x, y: sol.y })
        candidates.push({
          x: Number(sol.x),
          y: Number(sol.y),
          value: f(sol.x, sol.y),
          lambda: Number(sol.lambda),
        })
        if (candidates.length > 12) break
      }

      // Ordena por valor de f (útil para ver extremos) y recorta
      candidates.sort((a, b) => a.value - b.value)
      const top = candidates.slice(0, 5).map((p) => ({
        ...p,
        x: Number.parseFloat(p.x.toFixed(6)),
        y: Number.parseFloat(p.y.toFixed(6)),
        value: Number.parseFloat(p.value.toFixed(6)),
        lambda: Number.parseFloat(p.lambda.toFixed(6)),
      }))

      setResults({ criticalPoints: top })
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
