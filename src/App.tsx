import "./App.css"
import { CalculatorLayout } from "./components/layouts/CalculatorLayout"
import { Toaster } from "sonner"

function App() {
  return (
    <>
      {/* Aplicación principal */}
      <CalculatorLayout />
      {/* Toaster global */}
      <Toaster />
    </>
  );
}

export default App
