import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BarChart3, BookCopy, FolderOpen, Lightbulb, Network, ScanText, Sparkles } from "lucide-react";

import { MaterialRow } from "@/components/app/material-card";
import { ReviewNotice } from "@/components/material/material-viewer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { costOf, MATERIAL_TYPE_ORDER } from "@/lib/catalog";
import { requireUser } from "@/server/auth/dal";
import { aiEngine } from "@/server/env";
import { listMaterials } from "@/server/services/materials";

export const metadata: Metadata = { title: "대시보드" };

const QUICK = [
  { href: "/app/new", icon: Network, title: "지문 → 수업 자료 세트", body: "도식화 · 행간주 · 5지선다 · 서술형 · OX · 어휘", color: "from-primary to-primary-deep" },
  { href: "/app/ocr", icon: ScanText, title: "스캔 문서 OCR", body: "PDF·이미지를 편집 가능한 HWPX로", color: "from-amber-400 to-orange-500" },
  { href: "/app/exam-builder", icon: BookCopy, title: "모음 시험지 제본", body: "여러 지문을 하나의 시험지로", color: "from-emerald-400 to-emerald-600" },
  { href: "/app/exam-analysis", icon: BarChart3, title: "시험지 분석 보고서", body: "난이도 분포 · 학부모 상담 가이드", color: "from-violet-500 to-indigo-600" },
];

async function Greeting() {
  const user = await requireUser();
  const engine = aiEngine();
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-blue-700 to-primary-deep p-6 text-white sm:p-8">
      <div className="bg-grid absolute inset-0 opacity-20" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-100">{user.organization || "클래스픽 워크스페이스"}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{user.name} 선생님, 오늘은 어떤 수업을 준비할까요?</h1>
          <p className="mt-2 text-blue-100">
            보유 연필 <strong className="text-white">{user.points}자루</strong> — 지문 풀세트(6종)는 연필 {costOf(MATERIAL_TYPE_ORDER)}자루면
            충분해요.
          </p>
          {engine === "demo" && (
            <p className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-amber-200 ring-1 ring-white/20">
              데모 엔진 모드 · ANTHROPIC_API_KEY를 설정하면 Claude AI로 생성됩니다
            </p>
          )}
        </div>
        <Button asChild size="lg" className="bg-white text-primary-deep shadow-lg hover:bg-blue-50">
          <Link href="/app/new">
            <Sparkles /> 새 자료 만들기
          </Link>
        </Button>
      </div>
    </div>
  );
}

async function RecentMaterials() {
  const user = await requireUser();
  const recent = await listMaterials(user.id, { limit: 6 });
  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed bg-white px-6 py-12 text-center">
        <FolderOpen className="size-10 text-slate-300" />
        <p className="mt-3 font-bold">아직 만든 자료가 없어요</p>
        <p className="mt-1 text-sm text-muted-foreground">지문 하나로 첫 수업 자료를 만들어 보세요.</p>
        <Button asChild className="mt-5">
          <Link href="/app/new">
            <Sparkles /> 첫 자료 만들기
          </Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {recent.map((m) => (
        <MaterialRow key={m.id} m={m} />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <Suspense fallback={<Skeleton className="h-48 rounded-2xl" />}>
        <Greeting />
      </Suspense>

      <section>
        <h2 className="mb-3 text-lg font-extrabold">빠른 시작</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK.map((q) => (
            <Link key={q.href} href={q.href} className="group rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
              <span className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${q.color} text-white shadow-md`}>
                <q.icon className="size-5" />
              </span>
              <p className="mt-4 font-extrabold group-hover:text-primary">{q.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{q.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-extrabold">최근 자료</h2>
            <Link href="/app/materials" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              전체 보기 <ArrowRight className="size-4" />
            </Link>
          </div>
          <Suspense
            fallback={
              <div className="grid grid-cols-1 gap-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[74px] rounded-xl" />
                ))}
              </div>
            }
          >
            <RecentMaterials />
          </Suspense>
        </section>
        <aside className="space-y-4">
          <div className="rounded-2xl border bg-white p-5">
            <p className="flex items-center gap-1.5 font-extrabold">
              <Lightbulb className="size-4 text-amber" /> 수업 준비 팁
            </p>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600">
              <li>• 시는 연 사이에 빈 줄을 넣으면 연 단위 해설이 정확해져요.</li>
              <li>• 같은 지문으로 ‘기초’와 ‘심화’를 각각 만들면 수준별 수업 자료가 완성돼요.</li>
              <li>• 자료함의 문항들을 묶어 ‘모음 시험지’로 제본할 수 있어요.</li>
            </ul>
          </div>
          <ReviewNotice />
        </aside>
      </div>
    </div>
  );
}
