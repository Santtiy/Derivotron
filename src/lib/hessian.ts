import { create, all } from "mathjs";
const math = create(all);

export function classifyCriticalPoint(dxx:number, dyy:number, dxy:number) {
  const det = dxx * dyy - dxy * dxy;
  if (det > 0) {
    if (dxx > 0) return "mínimo local";
    if (dxx < 0) return "máximo local";
    return "silla/indeterminado";
  }
  if (det < 0) return "punto silla";
  return "indeterminado";
}

/** Evalúa Hessiano numérico con diferencias centrales */
export function numericHessian(f:(x:number,y:number)=>number,x:number,y:number,h=1e-4){
  const f00=f(x,y);
  const f10=f(x+h,y), f_10=f(x-h,y);
  const f01=f(x,y+h), f0_1=f(x,y-h);
  const f11=f(x+h,y+h), f1_1=f(x+h,y-h), f_11=f(x-h,y+h), f_1_1=f(x-h,y-h);
  const dxx=(f10 -2*f00 + f_10)/(h*h);
  const dyy=(f01 -2*f00 + f0_1)/(h*h);
  const dxy=(f11 - f1_1 - f_11 + f_1_1)/(4*h*h);
  return { dxx,dyy,dxy };
}
export function classify(dxx:number,dyy:number,dxy:number){
  const D = dxx*dyy - dxy*dxy;
  if (D>0 && dxx>0) return "mínimo local";
  if (D>0 && dxx<0) return "máximo local";
  if (D<0) return "punto silla";
  return "indeterminado";
}