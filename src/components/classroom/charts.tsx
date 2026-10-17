/**
 * 학생 포털 공용 차트 (훅 없음 · 서버/클라이언트 공용)
 * 단일 계열은 한 가지 색(primary)만 쓰고, 값은 막대 끝에 텍스트 색으로 표기합니다.
 * 강조(약점 등)는 색과 함께 텍스트 라벨로도 표시합니다.
 */
import { cn } from "@/lib/utils";

export type BarRow = {
  label: string;
  value: number;
  display?: string;
  sub?: string;
  emphasis?: "warn" | "good";
  /** 강조 라벨 문구 (기본: 약점 / 강점) */
  tag?: string;
};

/** 가로 막대 목록 (0~max) */
export function BarList({ rows, max = 100, unit = "%", empty = "아직 데이터가 없어요." }: { rows: BarRow[]; max?: number; unit?: string; empty?: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="group relative grid grid-cols-[minmax(5rem,9rem)_minmax(0,1fr)_auto] items-center gap-3">
          <span className="truncate text-sm font-semibold text-slate-700" title={r.label}>
            {r.label}
            {r.emphasis === "warn" && <span className="ml-1 rounded bg-amber-soft px-1 text-[11px] font-bold text-amber-700">{r.tag ?? "약점"}</span>}
            {r.emphasis === "good" && <span className="ml-1 rounded bg-emerald-soft px-1 text-[11px] font-bold text-emerald-700">{r.tag ?? "강점"}</span>}
          </span>
          <div className="h-4 border-l border-slate-300">
            <div
              className={cn(
                "h-full rounded-r-[4px] transition-[filter] group-hover:brightness-110",
                r.emphasis === "warn" ? "bg-amber" : "bg-primary",
              )}
              style={{ width: `${Math.min(100, (r.value / max) * 100)}%`, minWidth: r.value > 0 ? 4 : 0 }}
            />
          </div>
          <span className="text-right text-sm whitespace-nowrap tabular-nums text-slate-700">
            {r.display ?? `${r.value}${unit}`}
            {r.sub && <span className="ml-1 text-xs text-muted-foreground">{r.sub}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 세로 막대 (점수 분포, 성적 추이, 문항별 풀이 시간) */
export type ColumnDatum = {
  label: string;
  value: number;
  hint?: string;
  /** 막대 위 표시값 (기본: value + unit) */
  display?: string;
  /** 비교 기준선 (예: 반 평균) — 막대 위에 가로선으로 표시 */
  marker?: number;
  emphasis?: "warn";
};

export function ColumnChart({
  data,
  max,
  unit = "",
  height = 160,
  markerLabel,
}: {
  data: ColumnDatum[];
  max?: number;
  unit?: string;
  height?: number;
  /** marker 범례 문구 (예: "반 평균") */
  markerLabel?: string;
}) {
  const top = Math.max(1, max ?? Math.max(...data.map((d) => Math.max(d.value, d.marker ?? 0))));
  const plot = height - 22;
  const dense = data.length > 10;
  return (
    <div>
      <div className="flex items-end gap-1.5 border-b border-slate-300 sm:gap-3" style={{ height }}>
        {data.map((d, i) => (
          <div key={`${d.label}-${i}`} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            <span
              className={cn(
                "mb-1 max-w-full truncate font-semibold tabular-nums",
                dense ? "text-[10px]" : "text-xs",
                d.emphasis === "warn" ? "text-amber-700" : "text-slate-700",
              )}
            >
              {d.display ?? `${d.value}${unit}`}
            </span>
            <div
              className={cn(
                "w-full max-w-10 rounded-t-[4px] transition-[filter] group-hover:brightness-110",
                d.emphasis === "warn" ? "bg-amber" : "bg-primary",
              )}
              style={{ height: `${(d.value / top) * plot}px`, minHeight: d.value > 0 ? 4 : 0 }}
            />
            {d.marker != null && (
              <span
                aria-hidden
                className="absolute h-0.5 w-[calc(100%+4px)] max-w-12 rounded-full bg-slate-900"
                style={{ bottom: `${(d.marker / top) * plot}px` }}
              />
            )}
            {d.hint && (
              <span
                role="tooltip"
                className={cn(
                  // 숨김 상태에서도 화면 밖으로 삐져나와 가로 스크롤을 만들지 않도록 hover 때만 렌더링하고, 가장자리 막대는 안쪽으로 정렬
                  "pointer-events-none absolute -top-7 z-10 hidden rounded-md bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg group-hover:block",
                  i < data.length / 3 ? "left-0" : i >= (data.length * 2) / 3 ? "right-0" : "",
                )}
              >
                {d.hint}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 sm:gap-3">
        {data.map((d, i) => (
          <span key={`${d.label}-l-${i}`} className="min-w-0 flex-1 truncate text-center text-[11px] text-muted-foreground" title={d.label}>
            {d.label}
          </span>
        ))}
      </div>
      {markerLabel && data.some((d) => d.marker != null) && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className="inline-block h-0.5 w-4 rounded-full bg-slate-900" /> {markerLabel}
        </p>
      )}
    </div>
  );
}

export function StatTile({ label, value, unit, hint }: { label: string; value: string | number; unit?: string; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
