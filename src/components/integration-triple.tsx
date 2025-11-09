"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { create, all } from "mathjs";

const math = create(all, { number: "number" });

/* ============================================================
   NUEVA FUNCIÓN AGREGADA
   ============================================================ */
export function tripleIntegral(
  f: (x: number, y: number, z: number) => number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  zMin: number,
  zMax: number,
  nx = 20,
  ny = 20,
  nz = 20
) {
  const dx = (xMax - xMin) / nx;
  const dy = (yMax - yMin) / ny;
  const dz = (zMax - zMin) / nz;
  let sum = 0;

  for (let i = 0; i <= nx; i++) {
    const x = xMin + i * dx;
    for (let j = 0; j <= ny; j++) {
      const y = yMin + j * dy;
      for (let k = 0; k <= nz; k++) {
        const z = zMin + k * dz;
        const w =
          (i === 0 || i === nx ? 0.5 : 1) *
          (j === 0 || j === ny ? 0.5 : 1) *
          (k === 0 || k === nz ? 0.5 : 1);
        sum += w * f(x, y, z);
      }
    }
  }

  return sum * dx * dy * dz;
}

/* ============================================================
   FUNCIONES AUXILIARES
   ============================================================ */
function compile(expr: string) {
  const node = math.parse(expr);
  const compiled = node.compile();
  return (scope: Record<string, number>) => Number(compiled.evaluate(scope));
}

// ∭_Box f(x,y,z) dV con método del punto medio
function integrateBox(
  fExpr: string,
  xr: [number, number],
  yr: [number, number],
  zr: [number, number],
  nx = 40,
  ny = 40,
  nz = 40
) {
  const f = compile(fExpr);
  const [xa, xb] = xr,
    [ya, yb] = yr,
    [za, zb] = zr;
  const dx = (xb - xa) / nx;
  const dy = (yb - ya) / ny;
  const dz = (zb - za) / nz;
  let sum = 0,
    valid = 0;

  for (let i = 0; i < nx; i++) {
    const x = xa + (i + 0.5) * dx;
    for (let j = 0; j < ny; j++) {
      const y = ya + (j + 0.5) * dy;
      for (let k = 0; k < nz; k++) {
        const z = za + (k + 0.5) * dz;
        try {
          const v = f({ x, y, z });
          if (Number.isFinite(v)) {
            sum += v * dx * dy * dz;
            valid++;
          }
        } catch {}
      }
    }
  }
  return { value: sum, samples: nx * ny * nz, valid };
}

// Centro de masa en caja: M, x̄, ȳ, z̄
function centerOfMassBox(
  rhoExpr: string,
  xr: [number, number],
  yr: [number, number],
  zr: [number, number],
  nx = 28,
  ny = 28,
  nz = 28
) {
  const rho = compile(rhoExpr);
  const [xa, xb] = xr,
    [ya, yb] = yr,
    [za, zb] = zr;
  const dx = (xb - xa) / nx;
  const dy = (yb - ya) / ny;
  const dz = (zb - za) / nz;
  let M = 0,
    Mx = 0,
    My = 0,
    Mz = 0,
    valid = 0;

  for (let i = 0; i < nx; i++) {
    const x = xa + (i + 0.5) * dx;
    for (let j = 0; j < ny; j++) {
      const y = ya + (j + 0.5) * dy;
      for (let k = 0; k < nz; k++) {
        const z = za + (k + 0.5) * dz;
        try {
          const r = rho({ x, y, z });
          if (Number.isFinite(r)) {
            const dV = dx * dy * dz;
            M += r * dV;
            Mx += x * r * dV;
            My += y * r * dV;
            Mz += z * r * dV;
            valid++;
          }
        } catch {}
      }
    }
  }
  const xbar = M !== 0 ? Mx / M : NaN;
  const ybar = M !== 0 ? My / M : NaN;
  const zbar = M !== 0 ? Mz / M : NaN;
  return { M, xbar, ybar, zbar, samples: nx * ny * nz, valid };
}

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
export default function IntegrationTriple() {
  // Modo 1: integral triple de f
  const [f, setF] = useState("x^2 + y^2 + z^2");
  // Modo 2: centro de masa con densidad rho
  const [rho, setRho] = useState("1"); // homogénea por defecto

  const [xa, setXa] = useState("-1");
  const [xb, setXb] = useState("1");
  const [ya, setYa] = useState("-1");
  const [yb, setYb] = useState("1");
  const [za, setZa] = useState("-1");
  const [zb, setZb] = useState("1");

  const [n, setN] = useState("32");
  const [outInt, setOutInt] = useState<string>("");
  const [outCM, setOutCM] = useState<string>("");

  const runIntegral = () => {
    const xr: [number, number] = [parseFloat(xa), parseFloat(xb)];
    const yr: [number, number] = [parseFloat(ya), parseFloat(yb)];
    const zr: [number, number] = [parseFloat(za), parseFloat(zb)];
    const N = Math.max(6, Math.min(80, Math.floor(Number(n) || 32)));
    if (!(xr[0] < xr[1] && yr[0] < yr[1] && zr[0] < zr[1])) {
      setOutInt("Rangos inválidos");
      return;
    }

    // ✅ Opción alternativa usando tripleIntegral
    const fNum = (x: number, y: number, z: number) => {
      const fn = compile(f);
      return fn({ x, y, z });
    };
    const value2 = tripleIntegral(fNum, xr[0], xr[1], yr[0], yr[1], zr[0], zr[1], N, N, N);

    // ✅ Opción previa (para comparación)
    const { value, samples, valid } = integrateBox(f, xr, yr, zr, N, N, N);

    setOutInt(
      `∭_Box f dV ≈ ${value.toFixed(6)} | Método Simpson ≈ ${value2.toFixed(
        6
      )} (válidas: ${valid}/${samples}, N=${N})`
    );
  };

  const runCenterOfMass = () => {
    const xr: [number, number] = [parseFloat(xa), parseFloat(xb)];
    const yr: [number, number] = [parseFloat(ya), parseFloat(yb)];
    const zr: [number, number] = [parseFloat(za), parseFloat(zb)];
    const N = Math.max(6, Math.min(60, Math.floor(Number(n) || 28)));
    if (!(xr[0] < xr[1] && yr[0] < yr[1] && zr[0] < zr[1])) {
      setOutCM("Rangos inválidos");
      return;
    }
    const { M, xbar, ybar, zbar, samples, valid } = centerOfMassBox(
      rho,
      xr,
      yr,
      zr,
      N,
      N,
      N
    );
    const pos = `(${Number(xbar).toFixed(6)}, ${Number(ybar).toFixed(
      6
    )}, ${Number(zbar).toFixed(6)})`;
    setOutCM(
      `M ≈ ${M.toFixed(6)}; centro ≈ ${pos}  (válidas: ${valid}/${samples}, N=${N})`
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integración triple (caja)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>f(x,y,z)</Label>
            <Input
              value={f}
              onChange={(e) => setF(e.target.value)}
              placeholder="x^2 + y^2 + z^2"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>x mín</Label>
              <Input value={xa} onChange={(e) => setXa(e.target.value)} />
            </div>
            <div>
              <Label>y mín</Label>
              <Input value={ya} onChange={(e) => setYa(e.target.value)} />
            </div>
            <div>
              <Label>z mín</Label>
              <Input value={za} onChange={(e) => setZa(e.target.value)} />
            </div>
            <div>
              <Label>x máx</Label>
              <Input value={xb} onChange={(e) => setXb(e.target.value)} />
            </div>
            <div>
              <Label>y máx</Label>
              <Input value={yb} onChange={(e) => setYb(e.target.value)} />
            </div>
            <div>
              <Label>z máx</Label>
              <Input value={zb} onChange={(e) => setZb(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <Label>Resolución (N por eje)</Label>
              <Input value={n} onChange={(e) => setN(e.target.value)} />
            </div>
          </div>

          <Button className="w-full" onClick={runIntegral}>
            Integrar ∭
          </Button>
          {outInt && <div className="text-sm bg-gray-900 rounded p-3">{outInt}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Centro de masa (densidad ρ)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>ρ(x,y,z)</Label>
            <Input
              value={rho}
              onChange={(e) => setRho(e.target.value)}
              placeholder="1"
            />
          </div>

          <Button className="w-full" onClick={runCenterOfMass}>
            Calcular centro de masa
          </Button>
          {outCM && <div className="text-sm bg-gray-900 rounded p-3">{outCM}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
