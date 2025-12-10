import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats make and model without duplication.
 * If model already starts with make (case-insensitive), only returns model.
 * Otherwise, returns "make model" format.
 */
export function formatMakeModel(make: string | undefined | null, model: string | undefined | null): string {
  if (!make && !model) return 'N/A'
  if (!make) return model || 'N/A'
  if (!model) return make || 'N/A'
  
  // Check if model already starts with make (case-insensitive)
  const makeLower = make.trim().toLowerCase()
  const modelLower = model.trim().toLowerCase()
  
  if (modelLower.startsWith(makeLower)) {
    // Model already contains make, only show model
    return model
  }
  
  // Model doesn't contain make, show both
  return `${make} ${model}`
}

/**
 * Checks if a string is a UUID (v4 format)
 */
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}