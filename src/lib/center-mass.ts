import { doubleIntegral } from "./integrate";
export function centerOfMass2D(
  f:(x:number,y:number)=>number,
  xMin:number,xMax:number,yMin:number,yMax:number,
  nx=120, ny=120
){
  const mass = doubleIntegral(f,xMin,xMax,yMin,yMax,nx,ny);
  const fx = (x:number,y:number)=> x * f(x,y);
  const fy = (x:number,y:number)=> y * f(x,y);
  const mx = doubleIntegral(fx,xMin,xMax,yMin,yMax,nx,ny);
  const my = doubleIntegral(fy,xMin,xMax,yMin,yMax,nx,ny);
  return { mass, cx: mx/mass, cy: my/mass };
}