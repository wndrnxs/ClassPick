import "server-only";

import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

/** 연필 부족 등 결제가 필요한 상황 */
export class InsufficientPointsError extends HttpError {
  constructor(
    public required: number,
    public balance: number,
  ) {
    super(402, `연필이 부족합니다. (필요 ${required}자루 · 보유 ${balance}자루)`, "insufficient_points");
  }
}

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Route Handler 공통 에러 처리 래퍼 */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      // redirect()·notFound()·프리렌더 중단 등 Next.js 내부 제어 흐름은 그대로 다시 던집니다.
      unstable_rethrow(err);
      if (err instanceof InsufficientPointsError) {
        return jsonError(err.status, err.message, { code: err.code, required: err.required, balance: err.balance });
      }
      if (err instanceof HttpError) return jsonError(err.status, err.message, err.code ? { code: err.code } : undefined);
      if (err instanceof z.ZodError) {
        return jsonError(400, err.issues[0]?.message ?? "입력값을 확인해 주세요.", { issues: err.issues });
      }
      console.error("[api] unhandled error", err);
      return jsonError(500, "요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };
}

export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "요청 본문(JSON)을 읽을 수 없습니다.");
  }
  return schema.parse(body);
}
