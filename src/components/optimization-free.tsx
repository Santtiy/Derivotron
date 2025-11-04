"use client"

import { useState } from "react"
import { create, all } from "mathjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const math = create(all, { number: "number" })

interface Props {
  functionExpr: string
}

/** ---------- Utilidades numéricas ---------- **/

// Compila una vez y devuelve f(x,y)
function makeEvaluator(expr: string) {
  const node = math.parse(expr)
  const compiled = node.compile()
  return (x: number, y: number) => {
    const v = compiled.evaluate({ x, y })
    return Number(v)
  }
}

// Diferencias centradas
function dfdx(f: (x: number, y: number) => number, x: number, y: number, h = 1e-5) {
  return (f(x + h, y) - f(x - h, y)) / (2 * h)
}
function dfdy(f: (x: number, y: number) => number, x: number, y: number, h = 1e-5) {
  return (f(x, y + h) - f(x, y - h)) / (2 * h)
}

// Gradiente y Hessiano (numérico)
function gradient(f: (x: number, y: number) => number, x: number, y: number, h = 1e-5) {
  return { fx: dfdx(f, x, y, h), fy: dfdy(f, x, y, h) }
}
function hessian(f: (x: number, y: number) => number, x: number, y: number, h = 1e-4) {
  const fxx = (f(x + h, y) - 2 * f(x, y) + f(x - h, y)) / (h * h)
  const fyy = (f(x, y + h) - 2 * f(x, y) + f(x, y - h)) / (h * h)
  const fxy =
    (f(x + h, y + h) - f(x + h, y - h) - f(x - h, y + h) + f(x - h, y - h)) /
    (4 * h * h)
  return { fxx, fyy, fxy }
}

function inv2(a11: number, a12: number, a21: number, a22: number) {
  const det = a11 * a22 - a12 * a21
  if (!Number.isFinite(det) || Math.abs(det) < 1e-14) return null
  const invDet = 1 / det
  return { b11: a22 * invDet, b12: -a12 * invDet, b21: -a21 * invDet, b22: a11 * invDet, det }
}

function classifyCritical(fxx: number, fyy: number, fxy: number) {
  const det = fxx * fyy - fxy * fxy
  if (!Number.isFinite(det)) return { type: "inconcluso", det }
  if (det > 1e-10) {
    if (fxx > 0) return { type: "mínimo", det }
    if (fxx < 0) return { type: "máximo", det }
    return { type: "inconcluso", det }
  } else if (det < -1e-10) {
    return { type: "silla", det }
  } else {
    return { type: "inconcluso", det }
  }
}

// Newton 2D sobre ∇f=0
function newtonStationary(
  f: (x: number, y: number) => number,
  x0: number,
  y0: number,
  opts?: { h?: number; tol?: number; maxIt?: number }
) {
  const h = opts?.h ?? 1e-5
  const tol = opts?.tol ?? 1e-8
  const maxIt = opts?.maxIt ?? 50
  let x = x0,
    y = y0
  for (let k = 0; k < maxIt; k++) {
    const g = gradient(f, x, y, h)
    const H = hessian(f, x, y, Math.max(1e-4, h * 10))
    const invH = inv2(H.fxx, H.fxy, H.fxy, H.fyy)
    if (!invH) {
      // fallback: descenso de gradiente suave
      const alpha = 0.1
      x = x - alpha * g.fx
      y = y - alpha * g.fy
      continue
    }
    const dx = invH.b11 * g.fx + invH.b12 * g.fy
    const dy = invH.b21 * g.fx + invH.b22 * g.fy
    // amortiguación si el paso es inestable
    let step = 1.0
    let xn = x - step * dx
    let yn = y - step * dy
    let tries = 0
    while (tries < 5 && (!Number.isFinite(xn) || !Number.isFinite(yn))) {
      step *= 0.5
      xn = x - step * dx
      yn = y - step * dy
      tries++
    }
    if (!Number.isFinite(xn) || !Number.isFinite(yn)) break
    x = xn
    y = yn
    if (Math.hypot(dx, dy) * step < tol && Math.hypot(g.fx, g.fy) < Math.sqrt(tol)) {
      return { x, y, iters: k + 1, converged: true }
    }
  }
  return { x, y, iters: maxIt, converged: false }
}

/** ---------- Componente ---------- **/
export default function OptimizationFree({ functionExpr }: Props) {
  const [x0, setX0] = useState("0")
  const [y0, setY0] = useState("0")
  const [h, setH] = useState("1e-5")

  const [out, setOut] = useState<null | {
    x: number; y: number; f: number;
    fxx: number; fyy: number; fxy: number;
    det: number; type: string; iters: number; converged: boolean
  }>(null)

  const onSolve = () => {
    let f: (x: number, y: number) => number
    try {
      f = makeEvaluator(functionExpr)
    } catch {
      toast.error("Expresión inválida en f(x,y)")
      return
    }
    const x0n = Number(x0), y0n = Number(y0), hn = Number(h)
    if (!Number.isFinite(x0n) || !Number.isFinite(y0n)) {
      toast.error("Punto inicial inválido")
      return
    }
    const sol = newtonStationary(f, x0n, y0n, { h: Number.isFinite(hn) ? hn : 1e-5 })
    const H = hessian(f, sol.x, sol.y, Math.max(1e-4, (Number.isFinite(hn) ? hn : 1e-5) * 10))
    const cls = classifyCritical(H.fxx, H.fyy, H.fxy)
    const fval = f(sol.x, sol.y)

    setOut({
      x: sol.x, y: sol.y, f: fval,
      fxx: H.fxx, fyy: H.fyy, fxy: H.fxy,
      det: cls.det, type: cls.type,
      iters: sol.iters, converged: sol.converged
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Optimización (sin restricción)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>x₀</Label>
            <Input value={x0} onChange={(e) => setX0(e.target.value)} type="number" step="any" />
          </div>
          <div>
            <Label>y₀</Label>
            <Input value={y0} onChange={(e) => setY0(e.target.value)} type="number" step="any" />
          </div>
          <div>
            <Label>h (derivadas)</Label>
            <Input value={h} onChange={(e) => setH(e.target.value)} />
          </div>
        </div>

        <Button onClick={onSolve} className="w-full">Buscar punto crítico</Button>

        {out && (
          <div className="text-sm bg-gray-900 rounded p-3 space-y-1 mt-2">
            <div><b>Convergencia:</b> {out.converged ? "sí" : "no"} (iters: {out.iters})</div>
            <div><b>Punto:</b> (x, y) = ({out.x.toFixed(6)}, {out.y.toFixed(6)})</div>
            <div><b>f(x,y):</b> {out.f.toFixed(6)}</div>
            <div className="mt-2"><b>Hessiano:</b></div>
            <div>fxx = {out.fxx.toExponential(6)}, fyy = {out.fyy.toExponential(6)}, fxy = {out.fxy.toExponential(6)}</div>
            <div>det(H) = {out.det.toExponential(6)} → <b>{out.type}</b></div>
            <div className="text-gray-400">Regla: det&gt;0 y fxx&gt;0 → mínimo; det&gt;0 y fxx&lt;0 → máximo; det&lt;0 → silla; det≈0 → inconcluso.</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
