/* eslint-disable no-restricted-globals */
import { create, all } from "mathjs";
import { doubleIntegral, typeIIntegral, typeIIIntegral, tripleIntegral } from "../lib/integrate";

const math = create(all, { number: "number", precision: 64 });

type Job =
  | { kind: "rect"; expr: string; ax:number; bx:number; cy:number; dy:number; nx:number; ny:number }
  | { kind: "typeI"; expr: string; xMin:number; xMax:number; y1Expr:string; y2Expr:string; nx:number; ny:number }
  | { kind: "typeII"; expr: string; yMin:number; yMax:number; x1Expr:string; x2Expr:string; nx:number; ny:number }
  | { kind: "triple"; expr: string; ax:number; bx:number; cy:number; dy:number; zMin:number; zMax:number; nx:number; ny:number; nz:number };

function compileSafe(expr: string) {
  try { return math.compile(expr); } catch { return null; }
}

function evalFn(expr: string) {
  const c = compileSafe(expr);
  return (x:number, y:number) => {
    if (!c) return NaN;
    try { return Number(c.evaluate({ x, y })); } catch { return NaN; }
  };
}

self.onmessage = (e: MessageEvent<Job>) => {
  const job = e.data;
  try {
    if (job.kind === "rect") {
      const f = evalFn(job.expr);
      const coarse = doubleIntegral(f, job.ax, job.bx, job.cy, job.dy, job.nx, job.ny);
      const fine   = doubleIntegral(f, job.ax, job.bx, job.cy, job.dy, job.nx*2, job.ny*2);
      (self as any).postMessage({ type: "done", payload: { value: fine, error: Math.abs(fine - coarse) } });
      return;
    }
    if (job.kind === "typeI") {
      const f = evalFn(job.expr);
      const y1c = compileSafe(job.y1Expr), y2c = compileSafe(job.y2Expr);
      const y1 = (x:number)=> y1c ? Number(y1c.evaluate({x})) : NaN;
      const y2 = (x:number)=> y2c ? Number(y2c.evaluate({x})) : NaN;
      const coarse = typeIIntegral(f, job.xMin, job.xMax, y1, y2, job.nx, job.ny);
      const fine   = typeIIntegral(f, job.xMin, job.xMax, y1, y2, job.nx*2, job.ny*2);
      (self as any).postMessage({ type: "done", payload: { value: fine, error: Math.abs(fine - coarse) } });
      return;
    }
    if (job.kind === "typeII") {
      const f = evalFn(job.expr);
      const x1c = compileSafe(job.x1Expr), x2c = compileSafe(job.x2Expr);
      const x1 = (y:number)=> x1c ? Number(x1c.evaluate({y})) : NaN;
      const x2 = (y:number)=> x2c ? Number(x2c.evaluate({y})) : NaN;
      const coarse = typeIIIntegral(f, job.yMin, job.yMax, x1, x2, job.nx, job.ny);
      const fine   = typeIIIntegral(f, job.yMin, job.yMax, x1, x2, job.nx*2, job.ny*2);
      (self as any).postMessage({ type: "done", payload: { value: fine, error: Math.abs(fine - coarse) } });
      return;
    }
    if (job.kind === "triple") {
      const f2 = evalFn(job.expr);
      const g = (x:number,y:number,z:number)=> f2(x,y); // independiente de z
      const coarse = tripleIntegral(g, job.ax, job.bx, job.cy, job.dy, job.zMin, job.zMax, job.nx, job.ny, job.nz);
      const fine   = tripleIntegral(g, job.ax, job.bx, job.cy, job.dy, job.zMin, job.zMax, job.nx*2, job.ny*2, job.nz*2);
      (self as any).postMessage({ type: "done", payload: { value: fine, error: Math.abs(fine - coarse) } });
      return;
    }
  } catch (err:any) {
    (self as any).postMessage({ type: "error", message: err?.message || String(err) });
  }
};