export function getErrorMessage(error: unknown, fallback = "An error occurred"): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && error.message) return error.message;
  try {
    return String(error ?? fallback);
  } catch {
    return fallback;
  }
}
