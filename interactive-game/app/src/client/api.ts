export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== "GET") headers["x-court-request"] = "1";
  if (data && !(data instanceof FormData))
    headers["Content-Type"] = "application/json";
  const response = await fetch("/api" + path, {
    method,
    headers,
    body:
      data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
  });
  if (!response.headers.get("Content-Type")?.includes("application/json"))
    throw Error(
      path.startsWith("/admin/")
        ? "Host sign-in expired. Open the guest book again to sign in."
        : "The Court could not answer. Please try again.",
    );
  const result = await response.json();
  if (!response.ok)
    throw Error(
      result && typeof result === "object" && "error" in result
        ? String(result.error)
        : "The Court could not answer.",
    );
  return result as T;
}
