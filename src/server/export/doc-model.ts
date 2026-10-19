/**
 * 문서 중간 표현(DocModel)
 * 자료 콘텐츠 → DocModel → (HWPX | DOCX) 렌더러. 포맷별 렌더러는 이 블록만 알면 됩니다.
 */
export type RunColor = "accent" | "muted" | "danger" | "emerald";

export type Run = { text: string; bold?: boolean; underline?: boolean; /** 글자 테두리(네모 박스) */ boxed?: boolean; color?: RunColor };

export type Block =
  | { type: "title"; text: string }
  | { type: "meta"; text: string }
  | { type: "heading"; text: string; level: 1 | 2 }
  | { type: "paragraph"; runs: Run[]; align?: "left" | "center" | "justify"; indent?: boolean }
  /** 표: widths는 상대 비율 */
  | { type: "table"; header?: string[]; rows: string[][]; widths?: number[] }
  /** 테두리 상자 (지문, <보기>, 안내문) */
  | { type: "box"; title?: string; /** 한 줄 = 한 문단. 서식이 있는 줄은 구간 목록 */ lines: (string | Run[])[]; tone?: "plain" | "shaded" }
  | { type: "pageBreak" }
  | { type: "spacer" };

export type DocModel = { title: string; blocks: Block[] };

/** 상자 한 줄의 글자만 */
export const lineText = (line: string | Run[]) => (typeof line === "string" ? line : line.map((r) => r.text).join(""));

export const p = (text: string, opts: Omit<Extract<Block, { type: "paragraph" }>, "type" | "runs"> = {}): Block => ({
  type: "paragraph",
  runs: [{ text }],
  ...opts,
});

export const runs = (...r: (Run | string)[]): Block => ({
  type: "paragraph",
  runs: r.map((x) => (typeof x === "string" ? { text: x } : x)),
});
