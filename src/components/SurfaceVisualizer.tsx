"use client";

import Plot from "react-plotly.js";
import { evaluate } from "mathjs";
import type { Candidate } from "@/components/optimization-calculator";

interface Props {
  functionExpr: string;
  point?: { x: number; y: number };
  candidates?: Candidate[];
  regionRect?: { ax: number; bx: number; cy: number; dy: number } | null;
  zRange?: { zmin: number; zmax: number } | null;
  // NUEVO:
  limitPaths?: { label: string; points: { x: number; y: number }[] }[];
  regionTypeI?: { xMin: number; xMax: number; y1: (x: number)=>number; y2: (x: number)=>number } | null;
  regionTypeII?: { yMin: number; yMax: number; x1: (y: number)=>number; x2: (y: number)=>number } | null;
  regionPolar?: { rMin: number; rMax: number; tMin: number; tMax: number } | null;
  showTangent?: boolean;
  showGradient?: boolean;
}

export function SurfaceVisualizer({
  functionExpr, point, candidates = [],
  regionRect = null, zRange = null,
  limitPaths = [], regionTypeI = null, regionTypeII = null, regionPolar = null,
  showTangent = false, showGradient = false
}: Props) {
  const xValues = Array.from({ length: 40 }, (_, i) => -5 + i * 0.25);
  const yValues = Array.from({ length: 40 }, (_, i) => -5 + i * 0.25);

  const zValues = xValues.map((x) =>
    yValues.map((y) => {
      try {
        const z = evaluate(functionExpr, { x, y });
        return typeof z === "number" ? z : NaN;
      } catch {
        return NaN;
      }
    })
  );

  let pointZ: number | null = null;
  if (point) {
    try {
      const z = evaluate(functionExpr, { x: point.x, y: point.y });
      if (typeof z === "number" && isFinite(z)) {
        pointZ = z;
      }
    } catch {
      pointZ = null;
    }
  }

  const getColor = (z: number | null) => {
    if (z === null) return "gray";
    if (z > 0.1) return "red";
    if (z < -0.1) return "blue";
    return "limegreen";
  };
  const pointColor = getColor(pointZ);

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
      : [];

  // Plano z=0
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
  ];

  // NUEVO: planos del rango (zmin/zmax)
  const rangePlanes: any[] = !zRange ? [] : [
    {
      z: Array(xValues.length).fill(Array(yValues.length).fill(zRange.zmin)),
      x: xValues, y: yValues, type: "surface",
      colorscale: [[0, "rgba(255,0,0,0.15)"], [1, "rgba(255,0,0,0.15)"]],
      showscale: false, opacity: 0.25, name: "z min (rango)"
    },
    {
      z: Array(xValues.length).fill(Array(yValues.length).fill(zRange.zmax)),
      x: xValues, y: yValues, type: "surface",
      colorscale: [[0, "rgba(0,150,255,0.15)"], [1, "rgba(0,150,255,0.15)"]],
      showscale: false, opacity: 0.25, name: "z max (rango)"
    }
  ];

  // NUEVO: región rectangular de integración sombreada (en z=0)
  const regionTrace: any[] = !regionRect ? [] : [
    {
      type: "mesh3d",
      x: [regionRect.ax, regionRect.bx, regionRect.bx, regionRect.ax],
      y: [regionRect.cy, regionRect.cy, regionRect.dy, regionRect.dy],
      z: [0, 0, 0, 0],
      color: "rgba(255,215,0,0.35)",
      name: "Región de integración", showscale: false
    }
  ];

  // ===== Plano tangente y gradiente en el punto =====
  const h = 1e-3;
  const hasPoint = point && pointZ !== null;
  let tangentPlaneTrace: any[] = [];
  let gradientArrowTrace: any[] = [];

  if (hasPoint) {
    const x0 = point!.x;
    const y0 = point!.y;
    const f = (xx: number, yy: number) => {
      try {
        const v = evaluate(functionExpr, { x: xx, y: yy });
        return typeof v === "number" ? v : NaN;
      } catch {
        return NaN;
      }
    };

    const fx = (f(x0 + h, y0) - f(x0 - h, y0)) / (2 * h);
    const fy = (f(x0, y0 + h) - f(x0, y0 - h)) / (2 * h);

    const spanX = Math.abs(xValues[xValues.length - 1] - xValues[0]) || 10;
    const spanY = Math.abs(yValues[yValues.length - 1] - yValues[0]) || 10;
    const half = 0.15 * Math.min(spanX, spanY);

    const patchN = 14;
    const patchX: number[][] = [];
    const patchY: number[][] = [];
    const patchZ: number[][] = [];

    for (let i = 0; i <= patchN; i++) {
      const rowX: number[] = [];
      const rowY: number[] = [];
      const rowZ: number[] = [];
      const yy = y0 - half + (i * 2 * half) / patchN;
      for (let j = 0; j <= patchN; j++) {
        const xx = x0 - half + (j * 2 * half) / patchN;
        const zz = (pointZ as number) + fx * (xx - x0) + fy * (yy - y0);
        rowX.push(xx);
        rowY.push(yy);
        rowZ.push(zz);
      }
      patchX.push(rowX);
      patchY.push(rowY);
      patchZ.push(rowZ);
    }

    tangentPlaneTrace = showTangent ? [
      {
        type: "surface",
        x: patchX,
        y: patchY,
        z: patchZ,
        opacity: 0.5,
        showscale: false,
        name: "Plano tangente",
      },
    ] : [];

    const norm = Math.hypot(fx, fy);
    if (showGradient && isFinite(norm) && norm > 0) {
      const len = half * 0.7;
      const dx = (fx / norm) * len;
      const dy = (fy / norm) * len;
      const dz = fx * dx + fy * dy;

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
      ];
    } else {
      gradientArrowTrace = [];
    }
  }

  // ===== NUEVO: marcadores de candidatos de optimización =====
  let candidatesTrace: any[] = [];
  if (candidates && candidates.length > 0) {
    const xs = candidates.map((c) => c.x);
    const ys = candidates.map((c) => c.y);
    const zs = candidates.map((c) => {
      if (Number.isFinite(c.f)) return c.f;
      try {
        const v = evaluate(functionExpr, { x: c.x, y: c.y });
        return typeof v === "number" ? v : NaN;
      } catch {
        return NaN;
      }
    });
    const texts = candidates.map(
      (c, i) => `#${i + 1}  f=${(Number.isFinite(c.f) ? c.f : zs[i]).toFixed(4)}  λ=${c.lambda.toFixed(3)}`
    );

    candidatesTrace = [
      {
        type: "scatter3d",
        mode: "markers+text",
        x: xs,
        y: ys,
        z: zs,
        text: texts,
        textposition: "top center",
        marker: {
          color: "#22c55e",
          size: 6,
          symbol: "diamond",
          line: { width: 1, color: "#0a0a0a" },
          opacity: 0.95,
        },
        name: "Candidatos (Lagrange)",
      },
    ];
  }

  const data: any[] = [
    {
      z: zValues, x: xValues, y: yValues,
      type: "surface", colorscale: "Viridis", showscale: true, name: "Superficie",
    },
    ...zZeroPlane,
    ...rangePlanes,
    ...(pointZ !== null
      ? [
          {
            type: "scatter3d",
            mode: "markers+text",
            x: [point!.x],
            y: [point!.y],
            z: [pointZ],
            text: [`(${point!.x.toFixed(2)}, ${point!.y.toFixed(2)}, ${pointZ.toFixed(2)})`],
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
    ...projectionLine,
    ...tangentPlaneTrace,
    ...gradientArrowTrace,
    ...candidatesTrace,
    ...regionTrace,
  ];

  // NUEVO: trazas para regiones especiales
  function buildTypeIOutline(cfg: Props["regionTypeI"], steps=80) {
    if(!cfg) return [];
    const { xMin,xMax,y1,y2 } = cfg;
    const xs = Array.from({length:steps},(_,i)=> xMin + (xMax-xMin)*i/(steps-1));
    const top = xs.map(x=>({x, y: y2(x)}));
    const bottom = [...xs].reverse().map(x=>({x, y: y1(x)}));
    const loop = [...top, ...bottom];
    return [{
      type:"scatter3d",
      mode:"lines",
      x: loop.map(p=>p.x),
      y: loop.map(p=>p.y),
      z: loop.map(()=>0),
      line:{color:"#f59e0b", width:3},
      name:"Región Tipo I"
    }];
  }

  function buildTypeIIOutline(cfg: Props["regionTypeII"], steps=80){
    if(!cfg) return [];
    const { yMin,yMax,x1,x2 } = cfg;
    const ys = Array.from({length:steps},(_,i)=> yMin + (yMax-yMin)*i/(steps-1));
    const right = ys.map(y=>({y, x: x2(y)}));
    const left = [...ys].reverse().map(y=>({y, x: x1(y)}));
    const loop = [...right, ...left];
    return [{
      type:"scatter3d",
      mode:"lines",
      x: loop.map(p=>p.x),
      y: loop.map(p=>p.y),
      z: loop.map(()=>0),
      line:{color:"#10b981", width:3},
      name:"Región Tipo II"
    }];
  }

  function buildPolarSector(cfg: Props["regionPolar"], stepsR=40, stepsT=80){
    if(!cfg) return [];
    const { rMin,rMax,tMin,tMax } = cfg;
    const pts: {x:number;y:number}[] = [];
    for(let i=0;i<stepsT;i++){
      const t = tMin + (tMax-tMin)*i/(stepsT-1);
      pts.push({x:rMax*Math.cos(t), y:rMax*Math.sin(t)});
    }
    for(let i=stepsT-1;i>=0;i--){
      const t = tMin + (tMax-tMin)*i/(stepsT-1);
      pts.push({x:rMin*Math.cos(t), y:rMin*Math.sin(t)});
    }
    return [{
      type:"scatter3d",
      mode:"lines",
      x: pts.map(p=>p.x),
      y: pts.map(p=>p.y),
      z: pts.map(()=>0),
      line:{color:"#6366f1", width:3},
      name:"Sector polar"
    }];
  }

  // NUEVO: rutas límites
  function buildLimitPaths(paths: Props["limitPaths"]){
    if(!paths || !paths.length) return [];
    return paths.map(p=>({
      type:"scatter3d",
      mode:"lines",
      x: p.points.map(pt=>pt.x),
      y: p.points.map(pt=>pt.y),
      z: p.points.map(()=>0),
      line:{width:2},
      name:`Ruta ${p.label}`
    }));
  }

  // Dentro del render, añadir:
  const typeITrace = buildTypeIOutline(regionTypeI);
  const typeIITrace = buildTypeIIOutline(regionTypeII);
  const polarTrace = buildPolarSector(regionPolar);
  const limitPathTraces = buildLimitPaths(limitPaths);

  // Al final agregar outlines y rutas:
  data.push(...typeITrace, ...typeIITrace, ...polarTrace, ...limitPathTraces);

  return (
    <div className="w-full max-w-full overflow-hidden">
      <Plot
        data={data}
        layout={{
          autosize: true,
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          scene: {
            xaxis: { title: "x", color: "white" },
            yaxis: { title: "y", color: "white" },
            zaxis: { title: "z", color: "white" },
            aspectmode: "cube",
          },
          margin: { l: 0, r: 0, t: 40, b: 0 },
        } as any}
        style={{ width: "100%", height: 520 }}
        useResizeHandler
        className="rounded-lg"
        config={{ displaylogo: false, responsive: true }}
      />
    </div>
  );
}
