/**
 * Merges CSS class strings, filtering out all falsy values.
 *
 * A lightweight utility for conditionally joining Tailwind class names.
 * Use instead of string template literals to avoid accidental whitespace
 * and undefined values in class attributes.
 *
 * Example:
 *   cn("px-4 py-2", isActive && "bg-navy", "rounded")
 *   // → "px-4 py-2 bg-navy rounded"  (or without "bg-navy" when isActive is false)
 */
export function cn(
  ...classes: (string | undefined | null | false | 0)[]
): string {
  return classes.filter(Boolean).join(" ");
}
