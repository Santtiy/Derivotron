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

  return (
    <div className="w-full h-[500px] bg-gray-900 rounded-lg">
      <Plot
        data={[
          // Superficie principal
          {
            z: zValues,
            x: xValues,
            y: yValues,
            type: "surface",
            colorscale: "Viridis",
            showscale: true,
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
                    `(${point!.x.toFixed(2)}, ${point!.y.toFixed(
                      2
                    )}, ${pointZ.toFixed(2)})`,
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
        ] as any}
        layout={{
          autosize: true,
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          scene: {
            xaxis: { title: "x", color: "white" },
            yaxis: { title: "y", color: "white" },
            zaxis: { title: "z", color: "white" },
          },
          margin: { l: 0, r: 0, t: 0, b: 0 },
        } as any}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  )
}
