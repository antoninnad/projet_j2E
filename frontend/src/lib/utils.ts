import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes?: number | null): string {
  if (bytes == null) return ""
  return bytes < 1024 ? bytes + " o" : (bytes / 1024).toFixed(1) + " Ko"
}
