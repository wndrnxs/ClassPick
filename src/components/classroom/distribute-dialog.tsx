"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send, Timer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { api } from "@/lib/api-client";

type ClassItem = { id: string; name: string; studentCount: number };

const LIMIT_PRESETS = [5, 10, 15, 20, 30, 40, 50, 60, 80];

/** 자료 → 반 학생들에게 시험으로 배포 (5지선다·OX만 자동 채점) */
export function DistributeDialog({
  materialId,
  defaultTitle,
  gradableCount,
  recommendedMinutes = null,
}: {
  materialId: string;
  defaultTitle: string;
  gradableCount: number;
  recommendedMinutes?: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<ClassItem[] | null>(null);
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState(defaultTitle);
  const [reveal, setReveal] = useState(true);
  // "" = 제한 없음
  const [limit, setLimit] = useState(recommendedMinutes ? String(recommendedMinutes) : "");
  const limitOptions = [...new Set([...LIMIT_PRESETS, ...(recommendedMinutes ? [recommendedMinutes] : [])])].sort((a, b) => a - b);
  const [pending, setPending] = useState(false);

  async function load() {
    try {
      const res = await api<{ classes: ClassItem[] }>("/api/classes");
      setClasses(res.classes);
      setClassId((prev) => prev || res.classes[0]?.id || "");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function submit() {
    setPending(true);
    try {
      const res = await api<{ assignment: { id: string } }>("/api/assignments", {
        method: "POST",
        json: { materialId, classId, title, revealAnswers: reveal, timeLimitMin: limit ? Number(limit) : null },
      });
      toast.success("학생들에게 시험을 배포했어요.");
      setOpen(false);
      router.push(`/app/assignments/${res.assignment.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) load();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="emerald">
          <Send /> 학생에게 배포
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>학생에게 시험 배포</DialogTitle>
          <DialogDescription>
            5지선다·OX {gradableCount}문항이 자동 채점 시험으로 배포됩니다. (서술형·어휘 퀴즈는 제외)
          </DialogDescription>
        </DialogHeader>
        {classes === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">반 목록을 불러오는 중…</p>
        ) : classes.length === 0 ? (
          <div className="rounded-xl bg-surface p-5 text-center text-sm">
            <p className="font-semibold">아직 만든 반이 없어요.</p>
            <p className="mt-1 text-muted-foreground">반을 만들고 참여 코드를 학생들에게 알려 주세요.</p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/app/classes">반 만들러 가기</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assign-class">배포할 반</Label>
              <NativeSelect id="assign-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (학생 {c.studentCount}명)
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-title">시험 제목</Label>
              <Input id="assign-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-limit" className="flex items-center gap-1.5">
                <Timer className="size-4 text-primary" /> 제한 시간
              </Label>
              <NativeSelect id="assign-limit" value={limit} onChange={(e) => setLimit(e.target.value)}>
                <option value="">제한 없음 (시간만 기록)</option>
                {limitOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}분{m === recommendedMinutes ? " — 권장" : ""}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {recommendedMinutes ? `권장 ${recommendedMinutes}분은 수능 국어 페이스(80분·45문항, 5지선다 1문항 약 1분 47초) 기준이에요. ` : ""}
                시간이 다 되면 자동으로 제출되고, 제한 시간과 상관없이 전체 응시 시간과 문항별 풀이 시간은 항상 기록돼요.
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-muted/60 p-3 text-sm">
              <Checkbox checked={reveal} onCheckedChange={(v) => setReveal(v === true)} className="mt-0.5" aria-label="정답 공개" />
              <span>
                <strong>제출 후 정답·해설 공개</strong>
                <span className="block text-muted-foreground">끄면 학생은 점수와 맞음/틀림만 볼 수 있어요.</span>
              </span>
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={submit} disabled={pending || !classId || !title.trim()}>
            <Send /> {pending ? "배포하는 중…" : "배포하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
