"use client"

import Plot from "react-plotly.js"
import { evaluate } from "mathjs"

interface Props {
  functionExpr: string
  point?: { x: number; y: number }
}

export function SurfaceVisualizer({ functionExpr, point }: Props) {
  // Valores base de la malla
  const xValues = Array.from({ length: 40 }, (_, i) => -5 + i * 0.25)
  const yValues = Array.from({ length: 40 }, (_, i) => -5 + i * 0.25)

  // Calcular z de la superficie
  const zValues = xValues.map((x) =>
    yValues.map((y) => {
      try {
        const z = evaluate(functionExpr, { x, y })
        return typeof z === "number" ? z : NaN
      } catch {
        return NaN
      }
    })
  )

  // Calcular z del punto seleccionado
  let pointZ: number | null = null
  if (point) {
    try {
      const z = evaluate(functionExpr, { x: point.x, y: point.y })
      if (typeof z === "number" && isFinite(z)) {
        pointZ = z
      }
    } catch {
      pointZ = null
    }
  }

  // 🎨 Color dinámico según z
  const getColor = (z: number | null) => {
    if (z === null) return "gray"
    if (z > 0.1) return "red"
    if (z < -0.1) return "blue"
    return "limegreen"
  }
  const pointColor = getColor(pointZ)

  // 📉 Línea de proyección
  const projectionLine =
    point && pointZ !== null
      ? [
          {
            type: "scatter3d",
            mode: "lines",
            x: [point.x, point.x],
            y: [point.y, point.y],
            z: [0, pointZ],
            line: { color: "white", width: 2, dash: "dot" },
            name: "Proyección al plano XY",
          },
        ]
      : []

  // 🧭 Plano XY (z = 0)
  const zZeroPlane = [
    {
      z: Array(xValues.length).fill(Array(yValues.length).fill(0)),
      x: xValues,
      y: yValues,
      type: "surface",
      colorscale: [
        [0, "rgba(255,255,255,0.15)"],
        [1, "rgba(255,255,255,0.15)"],
      ],
      showscale: false,
      opacity: 0.3,
      name: "Plano z=0",
    },
  ]

  // ========= NUEVO: plano tangente y vector gradiente =========
  // Derivadas por diferencias centradas alrededor del punto (si existe)
  const h = 1e-3
  const hasPoint = point && pointZ !== null
  let tangentPlaneTrace: any[] = []
  let gradientArrowTrace: any[] = []

  if (hasPoint) {
    const x0 = point!.x
    const y0 = point!.y
    const f = (xx: number, yy: number) => {
      try {
        const v = evaluate(functionExpr, { x: xx, y: yy })
        return typeof v === "number" ? v : NaN
      } catch {
        return NaN
      }
    }

    // fx, fy
    const fx = (f(x0 + h, y0) - f(x0 - h, y0)) / (2 * h)
    const fy = (f(x0, y0 + h) - f(x0, y0 - h)) / (2 * h)

    // Parche del plano tangente (tamaño relativo al rango actual)
    const spanX = Math.abs(xValues[xValues.length - 1] - xValues[0]) || 10
    const spanY = Math.abs(yValues[yValues.length - 1] - yValues[0]) || 10
    const half = 0.15 * Math.min(spanX, spanY) // parche moderado

    const patchN = 14
    const patchX: number[][] = []
    const patchY: number[][] = []
    const patchZ: number[][] = []

    for (let i = 0; i <= patchN; i++) {
      const rowX: number[] = []
      const rowY: number[] = []
      const rowZ: number[] = []
      const yy = y0 - half + (i * 2 * half) / patchN
      for (let j = 0; j <= patchN; j++) {
        const xx = x0 - half + (j * 2 * half) / patchN
        const zz = (pointZ as number) + fx * (xx - x0) + fy * (yy - y0)
        rowX.push(xx)
        rowY.push(yy)
        rowZ.push(zz)
      }
      patchX.push(rowX)
      patchY.push(rowY)
      patchZ.push(rowZ)
    }

    tangentPlaneTrace = [
      {
        type: "surface",
        x: patchX,
        y: patchY,
        z: patchZ,
        opacity: 0.5,
        showscale: false,
        name: "Plano tangente",
      },
    ]

    // Flecha del gradiente (cone). Dirección en el plano xy: (fx, fy).
    const norm = Math.hypot(fx, fy)
    if (isFinite(norm) && norm > 0) {
      const len = half * 0.7
      const dx = (fx / norm) * len
      const dy = (fy / norm) * len
      const dz = fx * dx + fy * dy // incremento de z en esa dirección (sobre la superficie)

      gradientArrowTrace = [
        {
          type: "cone",
          x: [x0],
          y: [y0],
          z: [pointZ],
          u: [dx],
          v: [dy],
          w: [dz],
          sizemode: "absolute",
          sizeref: 0.6,
          showscale: false,
          anchor: "tail",
          name: "∇f (ascenso)",
        },
      ]
    }
  }
  // ========= FIN NUEVO =========

  return (
    <div className="w-full h-[500px] bg-gray-900 rounded-lg">
      <Plot
        data={
          [
            // Superficie principal
            {
              z: zValues,
              x: xValues,
              y: yValues,
              type: "surface",
              colorscale: "Viridis",
              showscale: true,
              name: "Superficie",
            },
            // Plano XY (z = 0)
            ...zZeroPlane,
            // Punto evaluado
            ...(pointZ !== null
              ? [
                  {
                    type: "scatter3d",
                    mode: "markers+text",
                    x: [point!.x],
                    y: [point!.y],
                    z: [pointZ],
                    text: [
                      `(${point!.x.toFixed(2)}, ${point!.y.toFixed(2)}, ${pointZ.toFixed(2)})`,
                    ],
                    textposition: "top center",
                    marker: {
                      color: pointColor,
                      size: 7,
                      symbol: "circle",
                      line: { width: 1, color: "#fff" },
                      opacity: 0.9,
                    },
                    name: "Punto evaluado",
                  },
                ]
              : []),
            // Línea de proyección
            ...projectionLine,
            // NUEVO: plano tangente y vector gradiente
            ...tangentPlaneTrace,
            ...gradientArrowTrace,
          ] as any
        }
        layout={
          {
            autosize: true,
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            scene: {
              xaxis: { title: "x", color: "white" },
              yaxis: { title: "y", color: "white" },
              zaxis: { title: "z", color: "white" },
              aspectmode: "cube",
            },
            margin: { l: 0, r: 0, t: 0, b: 0 },
          } as any
        }
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  )
}
