import { create, all } from 'mathjs';

const math = create(all);

export function solveLagrange(
  f: (x: number, y: number) => number,
  g: (x: number, y: number) => number,
  x0 = 0,
  y0 = 0
) {
  const h = 1e-6;
  const maxIt = 30;
  let x = x0, y = y0, lambda = 1;

  for (let it = 0; it < maxIt; it++) {
    const dfdx = (f(x + h, y) - f(x - h, y)) / (2 * h);
    const dfdy = (f(x, y + h) - f(x, y - h)) / (2 * h);
    const dgdx = (g(x + h, y) - g(x - h, y)) / (2 * h);
    const dgdy = (g(x, y + h) - g(x, y - h)) / (2 * h);

    // Sistema de ecuaciones para Newton
    const F = [
      dfdx - lambda * dgdx,
      dfdy - lambda * dgdy,
      g(x, y)
    ];

    // Matriz Jacobiana aproximada
    const J = [
      [1, 0, -dgdx],
      [0, 1, -dgdy],
      [dgdx, dgdy, 0]
    ];

    // Resolver sistema 3x3 para paso de Newton
    const det = J[0][0] * (J[1][1] * J[2][2] - J[1][2] * J[2][1])
              - J[0][1] * (J[1][0] * J[2][2] - J[1][2] * J[2][0])
              + J[0][2] * (J[1][0] * J[2][1] - J[1][1] * J[2][0]);

    if (Math.abs(det) < 1e-10) break;

    const dx = -(F[0] * (J[1][1] * J[2][2] - J[1][2] * J[2][1])
               - F[1] * (J[0][1] * J[2][2] - J[0][2] * J[2][1])
               + F[2] * (J[0][1] * J[1][2] - J[0][2] * J[1][1])) / det;

    const dy = -(J[0][0] * (F[1] * J[2][2] - F[2] * J[1][2])
               - J[0][2] * (F[1] * J[2][0] - F[2] * J[1][0])
               + F[0] * (J[1][2] * J[2][0] - J[1][0] * J[2][2])) / det;

    const dlambda = -(J[0][0] * (J[1][1] * F[2] - J[1][2] * F[1])
                   - J[0][1] * (J[1][0] * F[2] - J[1][2] * F[0])
                   + F[0] * (J[1][0] * J[2][1] - J[1][1] * J[2][0])) / det;

    x += dx;
    y += dy;
    lambda += dlambda;

    if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dlambda)) < 1e-8) break;
  }

  return [x, y, lambda];
}