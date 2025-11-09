"use client";

import React, { useMemo, useState, useCallback } from "react";
import { create, all } from "mathjs";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { doubleIntegral, typeIIntegral, typeIIIntegral, tripleIntegral } from "../lib/integrate";
import { centerOfMass2D } from "../lib/center-mass";

const math = create(all, { number: "number", precision: 64 });

interface IntegrationCalculatorProps {
  functionExpr: string; // f(x,y)
}

function compileSafe(expr: string) {
  try {
    return math.compile(expr);
  } catch {
    return null;
  }
}

function evalFnFromExpr(expr: string) {
  const compiled = compileSafe(expr);
  return (x: number, y: number) => {
    if (!compiled) return NaN;
    try {
      return Number(compiled.evaluate({ x, y }));
    } catch {
      return NaN;
    }
  };
}

export default function IntegrationCalculator({ functionExpr }: IntegrationCalculatorProps) {
  const [tab, setTab] = useState<"rect" | "typeI" | "typeII" | "triple">("rect");

  // Rectangular
  const [ax, setAx] = useState(-1);
  const [bx, setBx] = useState(1);
  const [cy, setCy] = useState(-1);
  const [dy, setDy] = useState(1);
  const [nx, setNx] = useState(200);
  const [ny, setNy] = useState(200);

  // Tipo I: y ∈ [y1(x), y2(x)], x ∈ [xMinI, xMaxI]
  const [xMinI, setXMinI] = useState(-1);
  const [xMaxI, setXMaxI] = useState(1);
  const [y1Expr, setY1Expr] = useState("x^2");
  const [y2Expr, setY2Expr] = useState("1");

  // Tipo II: x ∈ [x1(y), x2(y)], y ∈ [yMinII, yMaxII]
  const [yMinII, setYMinII] = useState(-1);
  const [yMaxII, setYMaxII] = useState(1);
  const [x1Expr, setX1Expr] = useState("-sqrt(1 - y^2)");
  const [x2Expr, setX2Expr] = useState("sqrt(1 - y^2)");

  // Triple
  const [zMin, setZMin] = useState(-1);
  const [zMax, setZMax] = useState(1);

  const [result, setResult] = useState<number | null>(null);
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);

  const f = useMemo(() => evalFnFromExpr(functionExpr), [functionExpr]);

  const calcRect = useCallback(() => {
    const val = doubleIntegral(f, ax, bx, cy, dy, Math.max(4, nx), Math.max(4, ny));
    const massData = centerOfMass2D(f, ax, bx, cy, dy, Math.max(4, nx), Math.max(4, ny));
    setResult(val);
    setCenter({ x: massData.cx, y: massData.cy });
  }, [f, ax, bx, cy, dy, nx, ny]);

  const calcTypeI = useCallback(() => {
    const y1c = compileSafe(y1Expr);
    const y2c = compileSafe(y2Expr);
    const y1 = (x: number) => (y1c ? Number(y1c.evaluate({ x })) : NaN);
    const y2 = (x: number) => (y2c ? Number(y2c.evaluate({ x })) : NaN);
    const val = typeIIntegral(f, xMinI, xMaxI, y1, y2, Math.max(4, nx), Math.max(4, ny));
    setResult(val);
  }, [f, xMinI, xMaxI, y1Expr, y2Expr, nx, ny]);

  const calcTypeII = useCallback(() => {
    const x1c = compileSafe(x1Expr);
    const x2c = compileSafe(x2Expr);
    const x1 = (y: number) => (x1c ? Number(x1c.evaluate({ y })) : NaN);
    const x2 = (y: number) => (x2c ? Number(x2c.evaluate({ y })) : NaN);
    const val = typeIIIntegral(f, yMinII, yMaxII, x1, x2, Math.max(4, nx), Math.max(4, ny));
    setResult(val);
  }, [f, yMinII, yMaxII, x1Expr, x2Expr, nx, ny]);

  return (
    <Card className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
      <h3 className="text-blue-400 font-semibold mb-3">Integración de {functionExpr}</h3>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="mb-3">
          <TabsTrigger value="rect">Rectangular</TabsTrigger>
          <TabsTrigger value="typeI">Tipo I</TabsTrigger>
          <TabsTrigger value="typeII">Tipo II</TabsTrigger>
          <TabsTrigger value="triple" className="text-xs text-gray-100">Triple</TabsTrigger>
        </TabsList>

        <TabsContent value="rect">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>ax</Label><Input type="number" value={ax} onChange={(e)=>setAx(Number(e.target.value))}/></div>
            <div><Label>bx</Label><Input type="number" value={bx} onChange={(e)=>setBx(Number(e.target.value))}/></div>
            <div><Label>cy</Label><Input type="number" value={cy} onChange={(e)=>setCy(Number(e.target.value))}/></div>
            <div><Label>dy</Label><Input type="number" value={dy} onChange={(e)=>setDy(Number(e.target.value))}/></div>
            <div><Label>nx</Label><Input type="number" value={nx} onChange={(e)=>setNx(Number(e.target.value))}/></div>
            <div><Label>ny</Label><Input type="number" value={ny} onChange={(e)=>setNy(Number(e.target.value))}/></div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={calcRect}>Calcular</Button>
            <div className="text-sm text-gray-300">Resultado: <span className="font-mono">{result !== null ? result.toPrecision(8) : "—"}</span></div>
          </div>
          {center && <div className="text-xs text-gray-400">Centro de masa ≈ ({center.x.toPrecision(4)}, {center.y.toPrecision(4)})</div>}
        </TabsContent>

        <TabsContent value="typeI">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>x min</Label><Input type="number" value={xMinI} onChange={(e)=>setXMinI(Number(e.target.value))}/></div>
            <div><Label>x max</Label><Input type="number" value={xMaxI} onChange={(e)=>setXMaxI(Number(e.target.value))}/></div>
            <div className="col-span-2"><Label>y1(x)</Label><Input value={y1Expr} onChange={(e)=>setY1Expr(e.target.value)}/></div>
            <div className="col-span-2"><Label>y2(x)</Label><Input value={y2Expr} onChange={(e)=>setY2Expr(e.target.value)}/></div>
            <div><Label>nx</Label><Input type="number" value={nx} onChange={(e)=>setNx(Number(e.target.value))}/></div>
            <div><Label>ny</Label><Input type="number" value={ny} onChange={(e)=>setNy(Number(e.target.value))}/></div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={calcTypeI}>Calcular</Button>
            <div className="text-sm text-gray-300">Resultado: <span className="font-mono">{result !== null ? result.toPrecision(8) : "—"}</span></div>
          </div>
        </TabsContent>

        <TabsContent value="typeII">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>y min</Label><Input type="number" value={yMinII} onChange={(e)=>setYMinII(Number(e.target.value))}/></div>
            <div><Label>y max</Label><Input type="number" value={yMaxII} onChange={(e)=>setYMaxII(Number(e.target.value))}/></div>
            <div className="col-span-2"><Label>x1(y)</Label><Input value={x1Expr} onChange={(e)=>setX1Expr(e.target.value)}/></div>
            <div className="col-span-2"><Label>x2(y)</Label><Input value={x2Expr} onChange={(e)=>setX2Expr(e.target.value)}/></div>
            <div><Label>nx</Label><Input type="number" value={nx} onChange={(e)=>setNx(Number(e.target.value))}/></div>
            <div><Label>ny</Label><Input type="number" value={ny} onChange={(e)=>setNy(Number(e.target.value))}/></div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={calcTypeII}>Calcular</Button>
            <div className="text-sm text-gray-300">Resultado: <span className="font-mono">{result !== null ? result.toPrecision(8) : "—"}</span></div>
          </div>
        </TabsContent>

        <TabsContent value="triple">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>x min</Label><Input type="number" value={ax} onChange={e=>setAx(+e.target.value)}/></div>
            <div><Label>x max</Label><Input type="number" value={bx} onChange={e=>setBx(+e.target.value)}/></div>
            <div><Label>y min</Label><Input type="number" value={cy} onChange={e=>setCy(+e.target.value)}/></div>
            <div><Label>y max</Label><Input type="number" value={dy} onChange={e=>setDy(+e.target.value)}/></div>
            <div><Label>z min</Label><Input type="number" value={zMin} onChange={e=>setZMin(+e.target.value)}/></div>
            <div><Label>z max</Label><Input type="number" value={zMax} onChange={e=>setZMax(+e.target.value)}/></div>
            <div><Label>n</Label><Input type="number" value={nx} onChange={e=>setNx(+e.target.value)}/></div>
            <div><Label>m</Label><Input type="number" value={ny} onChange={e=>setNy(+e.target.value)}/></div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={()=>{
              const g=(x:number,y:number,z:number)=>evalFnFromExpr(functionExpr)(x,y)*1; // f(x,y) extendida constante en z
              const val=tripleIntegral(g, ax,bx, cy,dy, zMin,zMax, Math.max(4,nx), Math.max(4,ny), Math.max(4,ny));
              setResult(val);
            }}>Calcular</Button>
            <div className="text-sm text-gray-300">Resultado: <span className="font-mono">{result!==null?result.toPrecision(8):"—"}</span></div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
