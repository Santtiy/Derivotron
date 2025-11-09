import { create, all } from "mathjs";
const math = create(all);

/**
 * Resolución básica para múltiples restricciones g_i(x,y)=0.
 * gList: array de funciones (x,y)=>number
 * Devuelve [x,y, lambda1, lambda2, ...] o null si falla.
 */
export function solveLagrangeMulti(
  f: (x:number,y:number)=>number,
  gList: ((x:number,y:number)=>number)[],
  x0 = 0, y0 = 0
) {
  const m = gList.length;
  const varsLen = 2 + m;
  let vars = [x0, y0];
  for (let i=0;i<m;i++) vars[2+i] = 1; // lambdas
  const h = 1e-6; const maxIt = 40;
  for (let it=0; it<maxIt; it++) {
    const [x,y, ...lam] = vars;
    // build F: grad f - sum lambda_i grad g_i ; and g_i
    const dfdx = (f(x+h,y)-f(x-h,y))/(2*h);
    const dfdy = (f(x,y+h)-f(x,y-h))/(2*h);
    const Fx = dfdx - gList.reduce((s, g, i) => s + lam[i]*((g(x+h,y)-g(x-h,y))/(2*h)), 0);
    const Fy = dfdy - gList.reduce((s, g, i) => s + lam[i]*((g(x,y+h)-g(x,y-h))/(2*h)), 0);
    const G = gList.map(g => g(x,y));
    const F = [Fx, Fy, ...G];
    // approximate Jacobian numeric (cols: x,y,lambda_i)
    // usar number[][] para evitar problemas de tipos con librerías
    const J: number[][] = Array.from({ length: varsLen }, () => Array(varsLen).fill(0));
    // diferencia central para cada variable de entrada
    for (let col = 0; col < varsLen; col++) {
      const varsPerturbed = vars.slice();
      varsPerturbed[col] += h;
      const [xp, yp, ...lamp] = varsPerturbed;
      const dfdx_p = (f(xp+h, yp) - f(xp-h, yp)) / (2*h);
      const dfdy_p = (f(xp, yp+h) - f(xp, yp-h)) / (2*h);
      const Gp = gList.map(g => g(xp, yp));
      const Fx_p = dfdx_p - gList.reduce((s, g, i) => s + lamp[i]*((g(xp+h, yp)-g(xp-h, yp))/(2*h)), 0);
      const Fy_p = dfdy_p - gList.reduce((s, g, i) => s + lamp[i]*((g(xp, yp+h)-g(xp, yp-h))/(2*h)), 0);
      const Fp = [Fx_p, Fy_p, ...Gp];
      // F actual ya calculado arriba (F). J[:,col] ≈ (Fp - F) / h
      for (let row = 0; row < varsLen; row++) {
        J[row][col] = (Fp[row] - F[row]) / h;
      }
    }
    try {
      const delta = math.lusolve(math.matrix(J) as any, math.matrix(F) as any) as any;
      const d = (delta as any).toArray().map((v:number[])=>v[0]);
      let norm = 0;
      for (let k=0;k<varsLen;k++) { vars[k] -= d[k]; norm = Math.max(norm, Math.abs(d[k])); }
      if (norm < 1e-8) return vars;
    } catch (e) {
      console.error("lagrange-multi failure", e);
      return null;
    }
  }
  return null;
}