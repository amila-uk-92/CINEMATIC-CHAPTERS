export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const r = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}
export function money(minor: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}
export function bytes(n: number) {
  return n >= 1073741824
    ? (n / 1073741824).toFixed(2) + " GB"
    : (n / 1048576).toFixed(1) + " MB";
}
