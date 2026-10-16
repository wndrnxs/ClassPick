"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/** 생성 대기 화면: 실제 작업은 서버에서 병렬로 진행되며, 단계 표시는 사용자 안내용입니다. */
export function ProgressOverlay({ steps, title }: { steps: string[]; title: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 2200);
    return () => clearInterval(t);
  }, []);
  const current = Math.min(tick, steps.length - 1);
  const progress = Math.min(92, 8 + tick * (84 / Math.max(steps.length, 1)));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-secondary">
            <Loader2 className="size-6 animate-spin text-primary" />
          </span>
          <div>
            <p className="font-extrabold">{title}</p>
            <p className="text-sm text-muted-foreground">창을 닫지 말고 잠시만 기다려 주세요.</p>
          </div>
        </div>
        <Progress value={progress} className="mt-5" />
        <ol className="mt-5 space-y-2.5">
          {steps.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-2.5 text-sm", i > current ? "text-slate-400" : "text-slate-800")}>
              {i < current ? (
                <CheckCircle2 className="size-4 text-emerald" />
              ) : i === current ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <span className="size-4 rounded-full border-2 border-slate-200" />
              )}
              <span className={cn(i === current && "font-bold")}>{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
