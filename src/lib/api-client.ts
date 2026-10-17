/** 클라이언트 컴포넌트용 API 호출 헬퍼 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: Record<string, unknown> = {},
  ) {
    super(message);
  }
  get code() {
    return typeof this.data.code === "string" ? this.data.code : undefined;
  }
}

export async function api<T = Record<string, unknown>>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...headers } : headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(typeof data.error === "string" ? data.error : "요청을 처리하지 못했습니다.", res.status, data);
  }
  return data as T;
}
