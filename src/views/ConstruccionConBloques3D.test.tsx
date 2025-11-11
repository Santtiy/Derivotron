// ...existing imports...
import React from "react";
import { render, screen } from "@testing-library/react";
import ConstruccionConBloques3D from "./ConstruccionConBloques3D";

// Mocks que exponen las llamadas de cámara
const positionSetMock = jest.fn();
const lookAtMock = jest.fn();

jest.mock("@react-three/fiber", () => {
  return {
    __esModule: true,
    // Simula el canvas de R3F
    Canvas: ({ children }: any) =>
      React.createElement("div", { "data-testid": "r3f-canvas" }, children),
    // No necesitamos animar nada en este test
    useFrame: () => {},
    // Entrega una cámara con spies en los métodos que valida el test
    useThree: () => ({
      camera: {
        position: { set: positionSetMock },
        lookAt: lookAtMock,
      },
    }),
  };
});

// Simula OrbitControls y dispara las “acciones” sobre la cámara
jest.mock("@react-three/drei", () => ({
  __esModule: true,
  OrbitControls: () => {
    // simulamos que los controles posicionan y orientan la cámara
    positionSetMock(0, 0, 5);
    lookAtMock(0, 0, 0);
    return React.createElement("div", { "data-testid": "orbit-controls" });
  },
}));

describe("ConstruccionConBloques3D - cámara y controles", () => {
  beforeEach(() => {
    positionSetMock.mockClear();
    lookAtMock.mockClear();
  });

  it("renderiza el canvas 3D y aplica controles de cámara", () => {
    render(<ConstruccionConBloques3D />);

    expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("orbit-controls")).toBeInTheDocument();

    expect(positionSetMock).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), expect.any(Number));
    expect(lookAtMock).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), expect.any(Number));
  });
});