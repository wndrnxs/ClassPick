import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Info } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/classroom/charts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MATERIAL_TYPE_META, TOKEN_PACKS } from "@/lib/catalog";
import type { MaterialType } from "@/lib/schemas";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/dal";
import { aiEngine, aiModelName, env } from "@/server/env";
import { getUsageReport } from "@/server/services/ai-usage";

export const metadata: Metadata = { title: "AI 사용량 · 원가" };

const PERIODS = [
  { key: "7", label: "최근 7일", days: 7 },
  { key: "30", label: "최근 30일", days: 30 },
  { key: "all", label: "전체", days: null },
] as const;

const FEATURE_LABEL: Record<string, string> = {
  ...Object.fromEntries(Object.entries(MATERIAL_TYPE_META).map(([k, v]) => [k, v.label])),
  exam_report: "시험지 분석 보고서",
  ocr: "스마트 OCR",
};
const JOB_LABEL = { passage: "지문 자료", exam_report: "시험지 분석", ocr: "OCR" } as const;

// 토큰 1개당 매출 범위 (토큰 팩 가격 기준: 가장 큰 팩 ~ 가장 작은 팩)
const perToken = TOKEN_PACKS.map((p) => p.price / p.tokens);
const REVENUE_MIN = Math.min(...perToken);
const REVENUE_MAX = Math.max(...perToken);

const krw = (usd: number) => Math.round(usd * env.usdKrw);
const won = (n: number) => `${formatNumber(Math.round(n))}원`;

async function Report({ searchParams }: { searchParams: PageProps<"/app/usage">["searchParams"] }) {
  await requireAdmin();
  const sp = await searchParams;
  const period = PERIODS.find((p) => p.key === sp.days) ?? PERIODS[1];
  const { total, features, jobs } = await getUsageReport(period.days);

  const engine = aiEngine();
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        현재 설정: 엔진{" "}
        <b className="text-slate-700">{engine === "claude" ? "Claude" : engine === "gemini" ? "Gemini" : "데모 (API 키 없음 · 기록 안 됨)"}</b> · 모델{" "}
        <b className="text-slate-700">{aiModelName()}</b>
        {engine === "claude" && (
          <>
            {" "}
            · effort <b className="text-slate-700">{env.aiEffort}</b>
          </>
        )}{" "}
        · 실제 AI 사용{" "}
        <b className="text-slate-700">{env.aiUsers === "admins" ? "운영자·마스터 계정만" : "가입 계정 전체"}</b> (체험 계정은 항상 데모)
      </p>
      <nav className="flex gap-1 rounded-xl bg-muted/60 p-1 sm:w-fit" aria-label="기간">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/app/usage?days=${p.key}`}
            aria-current={p === period ? "page" : undefined}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-center text-sm font-bold transition sm:flex-none",
              p === period ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="API 호출" value={formatNumber(total.calls)} unit="회" hint={total.failedCalls ? `실패 ${total.failedCalls}회 포함` : undefined} />
        <StatTile label="추정 원가" value={won(krw(total.costUsd))} hint={`$${total.costUsd.toFixed(2)} · ${formatNumber(env.usdKrw)}원/달러`} />
        <StatTile label="입력 토큰" value={formatNumber(total.inputTokens)} hint="캐시 포함" />
        <StatTile label="출력 토큰" value={formatNumber(total.outputTokens)} hint="AI 사고(thinking) 포함" />
        <StatTile label="작업당 평균 원가" value={total.jobCount ? won(krw(total.costUsd / total.jobCount)) : "-"} hint={`작업 ${formatNumber(total.jobCount)}건`} />
      </div>

      {engine === "gemini" && env.geminiFreeTier && (
        <p className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <Info className="size-4 shrink-0" /> Gemini 무료 등급으로 쓰는 동안 실제 청구 금액은 0원이에요. 아래 원가는 유료 등급으로 바꿨을 때의 예상치예요.
        </p>
      )}

      {total.unknownCost > 0 && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-soft px-4 py-3 text-sm text-amber-900">
          <Info className="size-4 shrink-0" /> 단가표에 없는 모델로 처리된 호출 {total.unknownCost}건은 원가에서 빠졌어요. (src/server/ai/usage.ts의 MODEL_PRICES)
        </p>
      )}

      <section className="rounded-2xl border bg-white">
        <h2 className="border-b p-5 font-extrabold">기능별 평균</h2>
        {features.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">이 기간에 기록된 AI 호출이 없어요.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-bold">기능</th>
                  <th className="px-4 py-2.5 text-right font-bold">호출</th>
                  <th className="px-4 py-2.5 text-right font-bold">평균 입력</th>
                  <th className="px-4 py-2.5 text-right font-bold">평균 출력</th>
                  <th className="px-4 py-2.5 text-right font-bold">평균 원가</th>
                  <th className="px-4 py-2.5 text-right font-bold">평균 시간</th>
                  <th className="px-4 py-2.5 text-right font-bold">합계 원가</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f) => (
                  <tr key={f.feature} className="border-t">
                    <td className="px-4 py-2.5 font-semibold">
                      {FEATURE_LABEL[f.feature] ?? f.feature}
                      {f.failedCalls > 0 && <span className="ml-1.5 text-xs text-red-600">실패 {f.failedCalls}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(f.calls)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(f.avgInput)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(f.avgOutput)}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{won(krw(f.avgCostUsd))}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{(f.avgDurationMs / 1000).toFixed(1)}초</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{won(krw(f.costUsd))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white">
        <div className="border-b p-5">
          <h2 className="font-extrabold">최근 작업별 원가 vs 토큰 매출</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            토큰 매출은 토큰 팩 가격 기준 1개당 {won(REVENUE_MIN)}~{won(REVENUE_MAX)}로 계산했어요. 마진은 가장 낮은 단가({won(REVENUE_MIN)}) 기준이에요. 실패한
            작업은 토큰이 환불되어 매출이 없어요.
          </p>
        </div>
        {jobs.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">기록이 없어요.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-bold">시각</th>
                  <th className="px-4 py-2.5 font-bold">작업</th>
                  <th className="px-4 py-2.5 font-bold">사용자</th>
                  <th className="px-4 py-2.5 text-right font-bold">토큰(입력/출력)</th>
                  <th className="px-4 py-2.5 text-right font-bold">원가</th>
                  <th className="px-4 py-2.5 text-right font-bold">차감 토큰</th>
                  <th className="px-4 py-2.5 text-right font-bold">매출</th>
                  <th className="px-4 py-2.5 text-right font-bold">마진</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const cost = krw(j.costUsd);
                  const revenueMin = j.succeeded ? j.pointsSpent * REVENUE_MIN : 0;
                  const margin = revenueMin - cost;
                  return (
                    <tr key={j.refId} className="border-t align-top">
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{formatDateTime(j.createdAt)}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold">
                          {j.title ?? JOB_LABEL[j.job]}
                          {!j.succeeded && (
                            <Badge variant="destructive" className="ml-1.5">
                              실패·환불
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {j.features.map((f) => MATERIAL_TYPE_META[f as MaterialType]?.shortLabel ?? FEATURE_LABEL[f] ?? f).join(" · ")} · {j.models.join(", ")}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{j.userEmail}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">
                        {formatNumber(j.inputTokens)} / {formatNumber(j.outputTokens)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold tabular-nums">{won(cost)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{j.succeeded ? `${j.pointsSpent}개` : "환불"}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums text-muted-foreground">
                        {j.succeeded ? `${won(revenueMin)}~${won(j.pointsSpent * REVENUE_MAX)}` : "0원"}
                      </td>
                      <td className={cn("px-4 py-2.5 text-right font-bold tabular-nums", margin < 0 ? "text-red-600" : "text-emerald-700")}>
                        {margin < 0 ? "−" : "+"}
                        {won(Math.abs(margin))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function UsagePage({ searchParams }: PageProps<"/app/usage">) {
  return (
    <>
      <PageHeader
        eyebrow="Operator"
        title="AI 사용량 · 원가"
        description="AI API 호출마다 토큰 사용량과 추정 원가를 기록해요. 실패해서 토큰을 환불한 작업도 API 요금은 나가므로 함께 보여 줘요."
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-11 w-80 rounded-xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        }
      >
        <Report searchParams={searchParams} />
      </Suspense>
    </>
  );
}
