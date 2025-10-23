import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// ✅ Versión limpia, sin logs
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
