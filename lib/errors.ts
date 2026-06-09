// Error normalization. parseApiError always returns a human-readable string
// and never throws, whatever shape of error it is handed.

/** Type guard for objects carrying a string `message` property. */
function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as { message: unknown }).message === "string"
  );
}

export function parseApiError(error: unknown): string {
  // Plain strings pass through.
  if (typeof error === "string") {
    return error.trim() || "An unknown error occurred.";
  }

  if (error instanceof Error) {
    // JSON.parse / response.json() failures.
    if (error instanceof SyntaxError) {
      return "Received an invalid response from the server.";
    }
    // fetch() throws a TypeError when the request can't be made at all.
    if (error instanceof TypeError) {
      return "Network error. Please check your connection and try again.";
    }
    // AbortController-driven timeouts/cancellations.
    if (error.name === "AbortError") {
      return "The request timed out. Please try again.";
    }
    return error.message.trim() || "An unexpected error occurred.";
  }

  // API/SDK error objects, e.g. { message: "..." }.
  if (hasMessage(error)) {
    return error.message.trim() || "An unexpected error occurred.";
  }

  // Last resort: stringify without throwing.
  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}" && serialized !== "null") {
      return serialized;
    }
  } catch {
    // Circular or otherwise non-serializable, so fall through.
  }

  return "An unexpected error occurred.";
}
