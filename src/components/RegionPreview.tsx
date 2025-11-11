import React, { useMemo } from "react";
import { create, all } from "mathjs";

const math = create(all, { number: "number", precision: 64 });

function compileSafe(expr: string) {
  try { return math.compile(expr); } catch { return null; }
}

function sx(x:number, ax:number, bx:number, w:number){ return ((x-ax)/(bx-ax))*w; }
function sy(y:number, cy:number, dy:number, h:number){ return h - ((y-cy)/(dy-cy))*h; }

export function RegionPreviewRect({
  ax, bx, cy, dy, width=320, height=220,
}: { ax:number; bx:number; cy:number; dy:number; width?:number; height?:number }) {
  const pad = 18;
  const w = width; const h = height;

  return (
    <svg width={w} height={h} className="rounded border border-gray-800 bg-gray-900">
      {/* eje */}
      <rect x={0} y={0} width={w} height={h} fill="#0b1220" />
      <rect
        x={sx(ax,ax,bx,w)} y={sy(dy,cy,dy,h)}
        width={sx(bx,ax,bx,w)-sx(ax,ax,bx,w)}
        height={sy(cy,cy,dy,h)-sy(dy,cy,dy,h)}
        fill="#2563eb33" stroke="#60a5fa" strokeDasharray="4 3"
      />
      <text x={pad} y={pad} fill="#9ca3af" fontSize="10">Rectángulo</text>
    </svg>
  );
}

export function RegionPreviewTypeI({
  xMin, xMax, y1Expr, y2Expr, width=320, height=220, samples=160,
}: {
  xMin:number; xMax:number; y1Expr:string; y2Expr:string;
  width?:number; height?:number; samples?:number;
}) {
  const y1c = compileSafe(y1Expr);
  const y2c = compileSafe(y2Expr);

  const data = useMemo(() => {
    const xs: number[] = [];
    const y1s: number[] = [];
    const y2s: number[] = [];
    let ymin = Infinity, ymax = -Infinity;
    if (!y1c || !y2c) return { xs, y1s, y2s, ymin:-1, ymax:1, ok:false };

    for (let i=0;i<=samples;i++){
      const x = xMin + (i*(xMax-xMin))/samples;
      const y1 = Number(y1c.evaluate({x}));
      const y2 = Number(y2c.evaluate({x}));
      xs.push(x); y1s.push(y1); y2s.push(y2);
      if (Number.isFinite(y1)) { ymin=Math.min(ymin,y1); ymax=Math.max(ymax,y1); }
      if (Number.isFinite(y2)) { ymin=Math.min(ymin,y2); ymax=Math.max(ymax,y2); }
    }
    if (!Number.isFinite(ymin) || !Number.isFinite(ymax)) { ymin=-1; ymax=1; }
    if (ymin===ymax) { ymin-=1; ymax+=1; }
    return { xs, y1s, y2s, ymin, ymax, ok:true };
  }, [xMin, xMax, y1Expr, y2Expr]);

  const w = width; const h = height;

  // path de relleno entre y1 y y2
  const top = data.xs.map((x,i)=>`${sx(x,xMin,xMax,w)},${sy(data.y2s[i],data.ymin,data.ymax,h)}`).join(" ");
  const bottom = data.xs.slice().reverse().map((x,ri)=>{
    const i = data.xs.length-1-ri;
    return `${sx(x,xMin,xMax,w)},${sy(data.y1s[i],data.ymin,data.ymax,h)}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="rounded border border-gray-800 bg-gray-900">
      <rect x={0} y={0} width={w} height={h} fill="#0b1220" />
      {data.ok ? (
        <>
          <polyline points={top} fill="none" stroke="#34d399" strokeWidth={1}/>
          <polyline points={data.xs.map((x,i)=>`${sx(x,xMin,xMax,w)},${sy(data.y1s[i],data.ymin,data.ymax,h)}`).join(" ")}
                    fill="none" stroke="#22d3ee" strokeWidth={1}/>
          <polygon
            points={`${top} ${bottom}`}
            fill="#10b98133"
            stroke="#10b98177"
          />
          <text x={8} y={14} fill="#9ca3af" fontSize="10">Región Tipo I</text>
        </>
      ) : (
        <text x={8} y={14} fill="#fca5a5" fontSize="12">Expresiones inválidas</text>
      )}
    </svg>
  );
}

export function RegionPreviewTypeII({
  yMin, yMax, x1Expr, x2Expr, width=320, height=220, samples=160,
}: {
  yMin:number; yMax:number; x1Expr:string; x2Expr:string;
  width?:number; height?:number; samples?:number;
}) {
  const x1c = compileSafe(x1Expr);
  const x2c = compileSafe(x2Expr);

  const data = useMemo(() => {
    const ys: number[] = [];
    const x1s: number[] = [];
    const x2s: number[] = [];
    let xmin = Infinity, xmax = -Infinity;
    if (!x1c || !x2c) return { ys, x1s, x2s, xmin:-1, xmax:1, ok:false };

    for (let j=0;j<=samples;j++){
      const y = yMin + (j*(yMax-yMin))/samples;
      const x1 = Number(x1c.evaluate({y}));
      const x2 = Number(x2c.evaluate({y}));
      ys.push(y); x1s.push(x1); x2s.push(x2);
      if (Number.isFinite(x1)) { xmin=Math.min(xmin,x1); xmax=Math.max(xmax,x1); }
      if (Number.isFinite(x2)) { xmin=Math.min(xmin,x2); xmax=Math.max(xmax,x2); }
    }
    if (!Number.isFinite(xmin) || !Number.isFinite(xmax)) { xmin=-1; xmax=1; }
    if (xmin===xmax) { xmin-=1; xmax+=1; }
    return { ys, x1s, x2s, xmin, xmax, ok:true };
  }, [yMin, yMax, x1Expr, x2Expr]);

  const w = width; const h = height;

  const right = data.ys.map((y,i)=>`${sx(data.x2s[i],data.xmin,data.xmax,w)},${sy(y,yMin,yMax,h)}`).join(" ");
  const left = data.ys.slice().reverse().map((y,ri)=>{
    const i = data.ys.length-1-ri;
    return `${sx(data.x1s[i],data.xmin,data.xmax,w)},${sy(y,yMin,yMax,h)}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="rounded border border-gray-800 bg-gray-900">
      <rect x={0} y={0} width={w} height={h} fill="#0b1220" />
      {data.ok ? (
        <>
          <polyline points={right} fill="none" stroke="#34d399" strokeWidth={1}/>
          <polyline points={data.ys.map((y,i)=>`${sx(data.x1s[i],data.xmin,data.xmax,w)},${sy(y,yMin,yMax,h)}`).join(" ")}
                    fill="none" stroke="#22d3ee" strokeWidth={1}/>
          <polygon
            points={`${right} ${left}`}
            fill="#10b98133"
            stroke="#10b98177"
          />
          <text x={8} y={14} fill="#9ca3af" fontSize="10">Región Tipo II</text>
        </>
      ) : (
        <text x={8} y={14} fill="#fca5a5" fontSize="12">Expresiones inválidas</text>
      )}
    </svg>
  );
}