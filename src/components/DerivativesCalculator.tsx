import { FormulaReference } from "../ui/FormulaReference";

export const Derivadas = () => {
  return (
    <>
      <h2>Derivadas</h2>
      <FormulaReference
        title="Fórmulas de derivadas"
        rows={[
          { label: "Parciales", tex: "\\frac{\\partial f}{\\partial x},\\; \\frac{\\partial f}{\\partial y}" },
          { label: "Gradiente", tex: "\\nabla f(x,y) = (f_x, f_y)" },
          { label: "Plano tangente", tex: "z = f(x_0,y_0) + f_x(x_0,y_0)(x-x_0) + f_y(x_0,y_0)(y-y_0)" },
          { label: "Direccional", tex: "D_{\\mathbf{u}} f = \\nabla f \\cdot \\mathbf{u}" },
        ]}
      />
    </>
  );
};