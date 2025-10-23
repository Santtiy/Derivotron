import "./App.css"
import { CalculatorLayout } from "./components/layouts/CalculatorLayout"
import { Toaster } from "sonner"

function App() {
  return (
    <div className="min-h-screen w-full bg-gray-950 text-gray-100">
      {/* Tu aplicación principal */}
      <CalculatorLayout />

      {/* 👇 Toaster global para notificaciones */}
      <Toaster richColors position="top-right" />
    </div>
  )
}

export default App
