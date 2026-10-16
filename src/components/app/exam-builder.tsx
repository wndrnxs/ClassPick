"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, BookCopy, FileText, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api-client";
import { FEATURE_COSTS } from "@/lib/catalog";
import type { MaterialSummaryDTO } from "@/lib/material-dto";
import { cn } from "@/lib/utils";
import { InsufficientPointsDialog } from "./insufficient-dialog";
import { ProgressOverlay } from "./progress-overlay";

type QType = "mcq" | "short_answer" | "ox";
const Q_LABEL: Record<QType, string> = { mcq: "5지선다", short_answer: "서술형", ox: "OX" };
type Picked = { materialId: string; include: QType[] };

export function ExamBuilder({ candidates }: { candidates: MaterialSummaryDTO[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Picked[]>([]);
  const [title, setTitle] = useState("1학기 중간고사 대비 모의평가");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [timeLimit, setTimeLimit] = useState("50");
  const [pending, setPending] = useState(false);
  const [shortfall, setShortfall] = useState<{ required: number; balance: number } | null>(null);

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const available = (m: MaterialSummaryDTO) => (Object.keys(m.questionCounts) as QType[]).filter((k) => m.questionCounts[k] > 0);

  function add(m: MaterialSummaryDTO) {
    setPicked((p) => [...p, { materialId: m.id, include: available(m) }]);
  }
  function move(i: number, d: -1 | 1) {
    setPicked((p) => {
      const next = [...p];
      const j = i + d;
      if (j < 0 || j >= next.length) return p;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function toggle(i: number, t: QType) {
    setPicked((p) => p.map((x, k) => (k === i ? { ...x, include: x.include.includes(t) ? x.include.filter((y) => y !== t) : [...x.include, t] } : x)));
  }

  const totals = picked.reduce(
    (acc, p) => {
      const m = byId.get(p.materialId);
      if (!m) return acc;
      for (const t of p.include) acc[t] += m.questionCounts[t];
      return acc;
    },
    { mcq: 0, short_answer: 0, ox: 0 },
  );

  async function submit() {
    setPending(true);
    try {
      const res = await api<{ material: { id: string } }>("/api/exams/compose", {
        method: "POST",
        json: {
          title,
          school,
          grade,
          timeLimit: timeLimit ? Number(timeLimit) : null,
          sections: picked.filter((p) => p.include.length > 0),
        },
      });
      toast.success("모음 시험지를 제본했어요!");
      router.push(`/app/materials/${res.material.id}`);
      router.refresh();
    } catch (e) {
      setPending(false);
      if (e instanceof ApiError && e.code === "insufficient_points") setShortfall({ required: Number(e.data.required), balance: Number(e.data.balance) });
      else toast.error((e as Error).message);
    }
  }

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed bg-white px-6 py-16 text-center">
        <BookCopy className="size-10 text-slate-300" />
        <p className="mt-3 font-bold">제본할 문항이 있는 지문 자료가 없어요</p>
        <p className="mt-1 text-sm text-muted-foreground">5지선다·서술형·OX 문항을 포함해 지문 자료를 먼저 만들어 주세요.</p>
        <Button asChild className="mt-5">
          <Link href="/app/new">
            <Sparkles /> 지문 자료 만들기
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <section className="rounded-2xl border bg-white p-4 sm:p-5">
        <h2 className="font-extrabold">① 내 지문 자료</h2>
        <p className="mt-1 text-sm text-muted-foreground">시험지에 넣을 지문을 순서대로 추가하세요.</p>
        <ul className="mt-4 space-y-2">
          {candidates.map((m) => {
            const count = picked.filter((p) => p.materialId === m.id).length;
            const types = available(m);
            return (
              <li key={m.id} className="flex items-center gap-3 rounded-xl border p-3">
                <FileText className="size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {types.length ? types.map((t) => `${Q_LABEL[t]} ${m.questionCounts[t]}`).join(" · ") : "문항 없음"}
                  </p>
                </div>
                <Button size="sm" variant={count ? "secondary" : "outline"} onClick={() => add(m)} disabled={!types.length}>
                  <Plus /> {count ? `추가됨 ${count}` : "추가"}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border bg-white p-4 sm:p-5">
          <h2 className="font-extrabold">② 시험지 구성</h2>
          {picked.length === 0 ? (
            <p className="mt-4 rounded-xl bg-surface p-6 text-center text-sm text-muted-foreground">왼쪽에서 지문을 추가하면 여기에 순서대로 배치됩니다.</p>
          ) : (
            <ol className="mt-4 space-y-2">
              {picked.map((p, i) => {
                const m = byId.get(p.materialId)!;
                return (
                  <li key={`${p.materialId}-${i}`} className="rounded-xl border p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{i + 1}</span>
                      <p className="min-w-0 flex-1 truncate text-sm font-bold">{m.title}</p>
                      <Button size="icon-sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로">
                        <ArrowUp />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === picked.length - 1} aria-label="아래로">
                        <ArrowDown />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => setPicked((x) => x.filter((_, k) => k !== i))} aria-label="빼기">
                        <X />
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
                      {available(m).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggle(i, t)}
                          aria-pressed={p.include.includes(t)}
                          className={cn(
                            "cursor-pointer rounded-md border px-2 py-0.5 text-xs font-semibold transition",
                            p.include.includes(t) ? "border-primary bg-secondary text-primary" : "text-slate-400 line-through",
                          )}
                        >
                          {Q_LABEL[t]} {m.questionCounts[t]}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-4 rounded-lg bg-surface px-3 py-2 text-sm">
            총 <strong>5지선다 {totals.mcq}</strong> · 서술형 {totals.short_answer} · OX {totals.ox} 문항
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border bg-white p-4 sm:p-5">
          <h2 className="font-extrabold">③ 시험지 정보</h2>
          <div className="space-y-2">
            <Label htmlFor="exam-title">시험지 제목</Label>
            <Input id="exam-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="exam-school">학교 · 학원</Label>
              <Input id="exam-school" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="OO고" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-grade">학년</Label>
              <Input id="exam-grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="1학년" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-time">시간(분)</Label>
              <Input id="exam-time" type="number" min={5} max={300} value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
            </div>
          </div>
          <Button size="lg" variant="gradient" className="w-full" onClick={submit} disabled={pending || picked.length === 0 || !title.trim()}>
            <BookCopy /> 시험지 제본하기 (토큰 {FEATURE_COSTS.examCompose}개)
          </Button>
        </div>
      </section>
      {pending && <ProgressOverlay title="시험지를 제본하고 있어요" steps={["지문을 순서대로 배치하는 중", "문항 번호를 정리하는 중", "정답표를 만드는 중"]} />}
      <InsufficientPointsDialog
        open={shortfall !== null}
        onOpenChange={(o) => !o && setShortfall(null)}
        required={shortfall?.required ?? 0}
        balance={shortfall?.balance ?? 0}
      />
    </div>
  );
}
