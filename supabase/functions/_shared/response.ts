import { corsHeaders } from "./cors.ts";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

/** Standard error shape so the frontend can branch on `code`. */
export function errorResponse(code: string, message: string, status = 400, details?: unknown): Response {
  return jsonResponse({ error: message, code, ...(details ? { details } : {}) }, status);
}

export function unauthorized(message = "Unauthorized"): Response {
  return errorResponse("unauthorized", message, 401);
}

export function forbidden(message = "Forbidden"): Response {
  return errorResponse("forbidden", message, 403);
}

export function serverError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return errorResponse("internal_error", message, 500);
}
