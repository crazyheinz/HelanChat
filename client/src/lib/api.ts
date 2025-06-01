export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const response = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }

  return response;
}

export async function get<T>(url: string): Promise<T> {
  const response = await apiRequest("GET", url);
  return response.json();
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiRequest("POST", url, data);
  return response.json();
}

export async function put<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiRequest("PUT", url, data);
  return response.json();
}

export async function del<T>(url: string): Promise<T> {
  const response = await apiRequest("DELETE", url);
  return response.json();
}
