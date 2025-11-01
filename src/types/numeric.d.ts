
// Minimal ambient types for numeric
declare module 'numeric' {
  export function newton(
    f: (x: number[]) => number[],
    x0: number[],
    tol?: number,
    maxit?: number
  ): number[];
  const _default: any;
  export default _default;
}
