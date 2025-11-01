
// Minimal ambient types for nerdamer
declare module 'nerdamer' {
  export interface Expression {
    toString(): string;
    text?(): string;
    evaluate?(scope?: Record<string, number>): Expression;
    valueOf?(): number;
  }
  function nerdamer(expr: string, args?: any[], constants?: any): Expression;
  namespace nerdamer {}
  export default nerdamer;
}

// Side-effect modules
declare module 'nerdamer/Calculus';
declare module 'nerdamer/Algebra';
declare module 'nerdamer/Solve';
