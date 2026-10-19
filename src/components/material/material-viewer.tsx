"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgeCheck, Bot, Columns2, Eye, EyeOff, FlaskConical, LayoutGrid, Pencil, PenLine, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";
import { KIND_LABELS, MATERIAL_TYPE_META, MATERIAL_TYPE_ORDER } from "@/lib/catalog";
import type { MaterialDTO } from "@/lib/material-dto";
import { DIFFICULTIES, SCHOOL_LEVELS } from "@/lib/schemas";
import { cn, formatDate } from "@/lib/utils";
import { DistributeDialog } from "@/components/classroom/distribute-dialog";
import { ExamReportView, ExamSetView } from "./exam-views";
import { ExportMenu, type ExportTargets } from "./export-menu";
import { hasPaperLayout, PaperDocument } from "./paper";
import { AnnotationView, McqView, OxView, PassageView, ShortAnswerView, StructureView, VocabView } from "./sections";

export function ReviewNotice({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-xl border border-amber-200 bg-amber-soft/70 p-4 text-sm leading-relaxed text-amber-900", className)}>
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <p>
        <strong>AI 생성 자료의 최종 검수 안내</strong> — 클래스픽의 결과물은 수업 준비를 돕는 초안입니다. 실제 수업 배치 및 내신·수능 대비
        시험 출제 전, 담당 선생님의 최종 확인과 다듬기를 거쳐 주세요.
      </p>
    </div>
  );
}

function EngineBadge({ engine, isSample }: { engine: MaterialDTO["engine"]; isSample: boolean }) {
  if (isSample)
    return (
      <Badge variant="emerald">
        <BadgeCheck /> 생성 샘플
      </Badge>
    );
  if (engine === "claude")
    return (
      <Badge variant="soft">
        <Bot /> Claude AI 생성
      </Badge>
    );
  if (engine === "demo")
    return (
      <Badge variant="amber">
        <FlaskConical /> 데모 엔진 생성
      </Badge>
    );
  return null;
}

function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="자료 삭제">
          <Trash2 className="text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>이 자료를 삭제할까요?</DialogTitle>
          <DialogDescription>삭제한 자료는 복구할 수 없으며, 사용한 토큰은 환불되지 않습니다.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">취소</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await api(`/api/materials/${id}`, { method: "DELETE" });
                  toast.success("자료를 삭제했습니다.");
                  router.push("/app/materials");
                  router.refresh();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              })
            }
          >
            삭제하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MaterialViewer({
  material,
  targets,
  isSample = false,
  initialTab,
  gradableCount = 0,
  recommendedMinutes = null,
}: {
  material: MaterialDTO;
  targets: ExportTargets;
  isSample?: boolean;
  initialTab?: string;
  /** 0보다 크면 '학생에게 배포' 버튼을 보여 줍니다 (5지선다·OX 문항 수) */
  gradableCount?: number;
  /** 배포 시 제안할 제한 시간(분, 수능 페이스 기준) */
  recommendedMinutes?: number | null;
}) {
  const [showAnswers, setShowAnswers] = useState(true);
  // 지문 자료·시험지·OCR은 시험지 형식(2단)으로 촘촘하게, 필요하면 카드 형식으로
  const paper = hasPaperLayout(material);
  const [view, setView] = useState<"paper" | "cards">("paper");
  const hasAnswers = material.kind === "passage" || material.kind === "exam_set";

  const meta: string[] = [];
  if (material.kind === "passage") {
    const s = material.settings;
    if (s.schoolLevel) meta.push(`${SCHOOL_LEVELS[s.schoolLevel]}${s.grade ? ` ${s.grade}` : ""}`);
    if (s.difficulty) meta.push(`난이도 ${DIFFICULTIES[s.difficulty]}`);
  } else if (material.sourceNote) {
    meta.push(material.sourceNote);
  }
  if (!isSample) meta.push(formatDate(material.createdAt));
  if (!isSample && material.pointsSpent > 0) meta.push(`토큰 ${material.pointsSpent}개 사용`);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{KIND_LABELS[material.kind]}</Badge>
            <EngineBadge engine={material.engine} isSample={isSample} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
            {material.title}
            {material.author && <span className="ml-2 text-lg font-semibold text-muted-foreground">{material.author}</span>}
          </h1>
          {meta.length > 0 && <p className="text-sm text-muted-foreground">{meta.join("  ·  ")}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {hasAnswers && (
            <Button variant="outline" onClick={() => setShowAnswers((v) => !v)} aria-pressed={showAnswers}>
              {showAnswers ? <EyeOff /> : <Eye />}
              {showAnswers ? "정답·해설 숨기기" : "정답·해설 보기"}
            </Button>
          )}
          {gradableCount > 0 && !isSample && (
            <DistributeDialog
              materialId={material.id}
              defaultTitle={material.title}
              gradableCount={gradableCount}
              recommendedMinutes={recommendedMinutes}
            />
          )}
          {!isSample && (
            <Button variant="outline" asChild>
              <Link href={`/app/materials/${material.id}/edit`}>
                <PenLine /> 수정
              </Link>
            </Button>
          )}
          <ExportMenu {...targets} />
          {!isSample && <DeleteButton id={material.id} />}
        </div>
      </div>

      {material.engine === "demo" && !isSample && (
        <div className="flex gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-soft/50 p-4 text-sm leading-relaxed text-amber-900">
          <FlaskConical className="mt-0.5 size-4 shrink-0" />
          <p>
            이 자료는 <strong>데모 엔진</strong>으로 만들어졌습니다.{" "}
            {material.kind === "exam_report"
              ? "데모 엔진은 문항 번호와 발문 표지(<보기>, 부정 발문 등)만으로 영역과 난이도를 추정합니다."
              : "데모 엔진은 지문의 형태(구성·반복·어조 표지)만 분석해 자료의 틀을 보여 줍니다. (예시 지문은 데모 모드에서도 완성된 결과를 보여 줍니다.)"}{" "}
            서버에 <code className="rounded bg-white/70 px-1">ANTHROPIC_API_KEY</code>를 설정하면 Claude가 실제 분석과 출제를 수행합니다.
          </p>
        </div>
      )}

      {paper && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex rounded-xl bg-muted/70 p-1 text-sm font-bold" role="group" aria-label="보기 형식">
            {(
              [
                ["paper", "시험지 보기 (2단)", Columns2],
                ["cards", "카드 보기", LayoutGrid],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition",
                  view === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          {view === "paper" && <p className="hidden text-xs text-muted-foreground md:block">쪽마다 왼쪽 단부터 채워요. 인쇄·HWPX·DOCX도 같은 형식이에요.</p>}
        </div>
      )}

      {paper && view === "paper" ? (
        <div className="rounded-2xl border bg-slate-100 p-3 sm:p-6 max-sm:bg-white">
          <PaperDocument material={material} showAnswers={showAnswers} />
        </div>
      ) : (
        <MaterialBody material={material} showAnswers={showAnswers} initialTab={initialTab} />
      )}

      <ReviewNotice />
    </div>
  );
}

function MaterialBody({ material, showAnswers, initialTab }: { material: MaterialDTO; showAnswers: boolean; initialTab?: string }) {
  switch (material.kind) {
    case "exam_report":
      return <ExamReportView report={material.content.report} />;
    case "exam_set":
      return <ExamSetView exam={material.content.exam} showAnswers={showAnswers} />;
    case "ocr":
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Pencil className="size-4" /> 원본 파일: {material.content.ocr.fileName}
            {material.content.ocr.note && <span>· {material.content.ocr.note}</span>}
          </div>
          <PassageView text={material.content.ocr.text} />
        </div>
      );
    case "passage": {
      const c = material.content;
      const types = MATERIAL_TYPE_ORDER.filter((t) => c[t]);
      const first = initialTab && (initialTab === "passage" || types.includes(initialTab as never)) ? initialTab : (types[0] ?? "passage");
      return (
        <Tabs defaultValue={first}>
          <TabsList className="w-full justify-start sm:w-fit">
            {types.map((t) => (
              <TabsTrigger key={t} value={t}>
                {MATERIAL_TYPE_META[t].shortLabel}
              </TabsTrigger>
            ))}
            <TabsTrigger value="passage">지문 원문</TabsTrigger>
          </TabsList>
          <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-6">
            {c.structure && (
              <TabsContent value="structure">
                <StructureView data={c.structure} />
              </TabsContent>
            )}
            {c.annotation && (
              <TabsContent value="annotation">
                <AnnotationView data={c.annotation} />
              </TabsContent>
            )}
            {c.mcq && (
              <TabsContent value="mcq">
                <McqView data={c.mcq} showAnswers={showAnswers} />
              </TabsContent>
            )}
            {c.short_answer && (
              <TabsContent value="short_answer">
                <ShortAnswerView data={c.short_answer} showAnswers={showAnswers} />
              </TabsContent>
            )}
            {c.ox && (
              <TabsContent value="ox">
                <OxView data={c.ox} showAnswers={showAnswers} />
              </TabsContent>
            )}
            {c.vocab && (
              <TabsContent value="vocab">
                <VocabView data={c.vocab} showAnswers={showAnswers} />
              </TabsContent>
            )}
            <TabsContent value="passage">
              <PassageView
                text={material.sourceText}
                title={material.title}
                author={material.author}
                sourceNote={material.sourceNote || undefined}
              />
            </TabsContent>
          </div>
        </Tabs>
      );
    }
  }
}
