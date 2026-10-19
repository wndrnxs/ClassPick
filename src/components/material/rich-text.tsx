/**
 * 서식 있는 지문 표시 (훅 없음 → 서버/클라이언트/인쇄 화면 공용)
 * <b>·<u>·<box> 세 가지 표기만 해석하고, 나머지는 모두 글자 그대로 보여 줍니다.
 */
import { parseRich, type RichRun } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

export function RichText({ text }: { text: string }) {
  return <RichRuns runs={parseRich(text)} />;
}

/** 이미 나눈 서식 구간 (줄 단위 배치 등) */
export function RichRuns({ runs }: { runs: RichRun[] }) {
  return runs.map((r, i) =>
    r.b || r.u || r.box ? (
      <span key={i} className={cn(r.b && "font-bold", r.u && "rich-u", r.box && "rich-box")}>
        {r.text}
      </span>
    ) : (
      r.text
    ),
  );
}
