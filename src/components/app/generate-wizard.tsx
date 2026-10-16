"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardPaste,
  FileUp,
  FlaskConical,
  ListChecks,
  Minus,
  Network,
  PenLine,
  Plus,
  ScanText,
  ScrollText,
  Sparkles,
  SpellCheck,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RadioChip, RadioGroup } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { costOf, FEATURE_COSTS, MATERIAL_TYPE_META, MATERIAL_TYPE_ORDER } from "@/lib/catalog";
import { DIFFICULTIES, SCHOOL_LEVELS, type MaterialType } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { FileDropzone } from "./file-dropzone";
import { InsufficientPointsDialog } from "./insufficient-dialog";
import { ProgressOverlay } from "./progress-overlay";

export type WizardSample = { slug: string; title: string; author: string; sourceNote: string; passage: string };
export type WizardInitial = { passage: string; title: string; author: string; sourceNote: string };

const GENRES = [
  "auto",
  "현대시",
  "고전시가",
  "현대소설",
  "고전소설",
  "수필",
  "극·시나리오",
  "독서(인문)",
  "독서(사회)",
  "독서(과학·기술)",
  "독서(예술)",
  "문법",
];
const GRADES = { middle: ["중1", "중2", "중3"], high: ["고1", "고2", "고3"], csat: ["고3·N수"] } as const;

const TYPE_ICON: Record<MaterialType, React.ReactNode> = {
  structure: <Network />,
  annotation: <ScrollText />,
  mcq: <ListChecks />,
  short_answer: <PenLine />,
  ox: <Check />,
  vocab: <SpellCheck />,
};

const COUNT_LIMITS = {
  mcq: { min: 1, max: 10, label: "문항" },
  short_answer: { min: 1, max: 5, label: "문항" },
  ox: { min: 3, max: 15, label: "문항" },
  vocab: { min: 3, max: 15, label: "개" },
} as const;
type CountKey = keyof typeof COUNT_LIMITS;

const PRESETS: { label: string; types: MaterialType[] }[] = [
  { label: "풀세트 6종", types: [...MATERIAL_TYPE_ORDER] },
  { label: "수업용", types: ["structure", "annotation", "vocab"] },
  { label: "평가 대비용", types: ["mcq", "short_answer", "ox"] },
];

const STEPS = ["지문 입력 및 설정", "자료 유형 선택", "확인 및 생성"];

const PROGRESS_STEPS = [
  "지문을 읽고 갈래를 판별하는 중",
  "작품 구조와 전개를 도식화하는 중",
  "구절별 해설과 출제 포인트를 정리하는 중",
  "문항을 출제하고 정답을 검토하는 중",
  "자료함에 저장하는 중",
];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="진행 단계">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition",
                done && "bg-emerald text-white",
                active && "bg-primary text-white ring-4 ring-primary/15",
                !done && !active && "bg-muted text-slate-400",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="size-4" /> : n}
            </span>
            <span className={cn("hidden text-sm font-bold sm:block", active ? "text-slate-900" : "text-slate-400")}>{label}</span>
            {n < STEPS.length && <span className={cn("h-0.5 flex-1 rounded", done ? "bg-emerald" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}

function CountStepper({ value, onChange, min, max, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; unit: string }) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-white">
      <button
        type="button"
        className="flex size-8 cursor-pointer items-center justify-center text-slate-500 hover:text-primary disabled:opacity-30"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="줄이기"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-12 text-center text-sm font-bold tabular-nums">
        {value}
        {unit}
      </span>
      <button
        type="button"
        className="flex size-8 cursor-pointer items-center justify-center text-slate-500 hover:text-primary disabled:opacity-30"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="늘리기"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function GenerateWizard({
  balance,
  engine,
  samples,
  initial,
}: {
  balance: number;
  engine: "claude" | "demo";
  samples: WizardSample[];
  initial?: WizardInitial;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [passage, setPassage] = useState(initial?.passage ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [sourceNote, setSourceNote] = useState(initial?.sourceNote ?? "");
  const [schoolLevel, setSchoolLevel] = useState<keyof typeof SCHOOL_LEVELS>("high");
  const [grade, setGrade] = useState("고1");
  const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTIES>("standard");
  const [genre, setGenre] = useState("auto");
  const [types, setTypes] = useState<MaterialType[]>(["structure", "annotation", "mcq", "ox"]);
  const [counts, setCounts] = useState<Record<CountKey, number>>({ mcq: 3, short_answer: 2, ox: 6, vocab: 6 });
  const [uploading, setUploading] = useState(false);
  const [pendingOcr, setPendingOcr] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [shortfall, setShortfall] = useState<{ required: number; balance: number } | null>(null);
  const [inputTab, setInputTab] = useState("paste");

  const cost = useMemo(() => costOf(types), [types]);
  const ordered = MATERIAL_TYPE_ORDER.filter((t) => types.includes(t));
  const passageOk = passage.trim().length >= 20;

  function toggleType(t: MaterialType, on: boolean) {
    setTypes((prev) => (on ? [...new Set([...prev, t])] : prev.filter((x) => x !== t)));
  }

  function loadSample(slug: string) {
    const s = samples.find((x) => x.slug === slug);
    if (!s) return;
    setPassage(s.passage);
    setTitle(s.title);
    setAuthor(s.author);
    setSourceNote(s.sourceNote);
    setInputTab("paste");
    toast.success(`예시 지문 「${s.title}」을 넣었어요.`);
  }

  async function extract(file: File) {
    setUploading(true);
    setPendingOcr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api<{ needsOcr: boolean; text?: string; fileName: string }>("/api/extract", { method: "POST", body: fd });
      if (res.needsOcr) {
        setPendingOcr(file);
      } else {
        setPassage(res.text ?? "");
        if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
        setInputTab("paste");
        toast.success("파일에서 지문을 가져왔어요. 내용을 확인해 주세요.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function runOcr() {
    if (!pendingOcr) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", pendingOcr);
      const res = await api<{ material: { sourceText: string; title: string } }>("/api/ocr", { method: "POST", body: fd });
      setPassage(res.material.sourceText);
      if (!title) setTitle(res.material.title);
      setPendingOcr(null);
      setInputTab("paste");
      router.refresh();
      toast.success("스마트 OCR로 지문을 변환했어요. 원문과 대조해 확인해 주세요.");
    } catch (e) {
      if (e instanceof ApiError && e.code === "insufficient_points") {
        setShortfall({ required: Number(e.data.required), balance: Number(e.data.balance) });
      } else toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function generate() {
    if (cost > balance) {
      setShortfall({ required: cost, balance });
      return;
    }
    setGenerating(true);
    try {
      const res = await api<{ material: { id: string } }>("/api/materials", {
        method: "POST",
        json: {
          passage,
          title,
          author,
          sourceNote,
          types: ordered,
          settings: { schoolLevel, grade, difficulty, genre, counts },
        },
      });
      toast.success("수업 자료가 완성되었어요!");
      router.push(`/app/materials/${res.material.id}`);
      router.refresh();
    } catch (e) {
      setGenerating(false);
      if (e instanceof ApiError && e.code === "insufficient_points") {
        setShortfall({ required: Number(e.data.required), balance: Number(e.data.balance) });
      } else toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-4 sm:p-5">
        <Stepper step={step} />
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-2xl border bg-white p-4 sm:p-6">
            <Tabs value={inputTab} onValueChange={setInputTab}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="paste">
                    <ClipboardPaste /> 직접 입력
                  </TabsTrigger>
                  <TabsTrigger value="upload">
                    <FileUp /> 파일 업로드
                  </TabsTrigger>
                </TabsList>
                <NativeSelect
                  aria-label="예시 지문 넣기"
                  value=""
                  onChange={(e) => loadSample(e.target.value)}
                  wrapperClassName="w-auto"
                  className="h-9 text-sm font-semibold text-primary"
                >
                  <option value="">✨ 예시 지문 넣기</option>
                  {samples.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.title} · {s.author}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <TabsContent value="paste" className="mt-3">
                <Textarea
                  value={passage}
                  onChange={(e) => setPassage(e.target.value)}
                  placeholder={"수업할 지문을 붙여넣어 주세요.\n\n시는 연과 연 사이에 빈 줄을 넣으면 연 단위 해설이 더 정확해집니다."}
                  className="passage min-h-[360px] resize-y text-[15px]"
                  aria-label="지문 본문"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{passageOk ? "좋아요! 다음 단계로 넘어가세요." : "20자 이상 입력해 주세요."}</span>
                  <span className="tabular-nums">{passage.length.toLocaleString()} / 20,000자</span>
                </div>
              </TabsContent>
              <TabsContent value="upload" className="mt-3 space-y-3">
                <FileDropzone onFiles={(f) => extract(f[0])} busy={uploading} />
                {pendingOcr && (
                  <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-soft/70 p-4 sm:flex-row sm:items-center">
                    <ScanText className="size-6 shrink-0 text-amber-600" />
                    <p className="flex-1 text-sm leading-relaxed text-amber-900">
                      <strong>{pendingOcr.name}</strong>은(는) 스캔 이미지 문서예요. 스마트 OCR로 텍스트를 읽어 올까요? (연필 {FEATURE_COSTS.ocrPerFile}자루)
                    </p>
                    <Button onClick={runOcr} disabled={uploading} variant="default" size="sm">
                      스마트 OCR 실행
                    </Button>
                  </div>
                )}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  HWPX·DOCX·TXT·텍스트 PDF는 무료로 바로 변환되고, 스캔 PDF·이미지는 스마트 OCR(연필 {FEATURE_COSTS.ocrPerFile}자루)로 변환됩니다.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-5 rounded-2xl border bg-white p-4 sm:p-6">
            <div className="space-y-2">
              <Label htmlFor="title">작품명 · 제목</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="비워 두면 자동으로 채워져요" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="author">작가</Label>
                <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="예: 김소월" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="genre">갈래</Label>
                <NativeSelect id="genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g === "auto" ? "자동 판별" : g}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">출처 (자료 하단에 자동 표기)</Label>
              <Input id="source" value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} placeholder="예: 2026 고1 3월 모의고사 / 교과서 3단원" />
            </div>
            <div className="space-y-2">
              <Label>학교급</Label>
              <RadioGroup
                value={schoolLevel}
                onValueChange={(v) => {
                  const lvl = v as keyof typeof SCHOOL_LEVELS;
                  setSchoolLevel(lvl);
                  setGrade(GRADES[lvl][0]);
                }}
                className="flex flex-wrap gap-2"
                aria-label="학교급"
              >
                {Object.entries(SCHOOL_LEVELS).map(([k, v]) => (
                  <RadioChip key={k} value={k}>
                    {v}
                  </RadioChip>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>학년</Label>
              <RadioGroup value={grade} onValueChange={setGrade} className="flex flex-wrap gap-2" aria-label="학년">
                {GRADES[schoolLevel].map((g) => (
                  <RadioChip key={g} value={g}>
                    {g}
                  </RadioChip>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>난이도</Label>
              <RadioGroup
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as keyof typeof DIFFICULTIES)}
                className="grid grid-cols-3 gap-2"
                aria-label="난이도"
              >
                {Object.entries(DIFFICULTIES).map(([k, v]) => (
                  <RadioChip key={k} value={k}>
                    {v}
                  </RadioChip>
                ))}
              </RadioGroup>
            </div>
          </div>

          <div className="flex justify-end lg:col-span-2">
            <Button size="lg" onClick={() => setStep(2)} disabled={!passageOk}>
              다음: 자료 유형 선택 <ArrowRight />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">빠른 선택</span>
            {PRESETS.map((p) => (
              <Button key={p.label} variant="outline" size="sm" onClick={() => setTypes(p.types)}>
                <WandSparkles className="text-primary" /> {p.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MATERIAL_TYPE_ORDER.map((t) => {
              const meta = MATERIAL_TYPE_META[t];
              const on = types.includes(t);
              const countKey = (t in COUNT_LIMITS ? t : null) as CountKey | null;
              return (
                <div
                  key={t}
                  className={cn(
                    "relative flex flex-col rounded-2xl border-2 bg-white p-5 transition",
                    on ? "border-primary shadow-[var(--shadow-soft)]" : "border-transparent ring-1 ring-border hover:ring-primary/40",
                  )}
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl transition [&_svg]:size-5",
                        on ? "bg-primary text-white" : "bg-secondary text-primary",
                      )}
                    >
                      {TYPE_ICON[t]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-extrabold">{meta.label}</span>
                        <Checkbox checked={on} onCheckedChange={(v) => toggleType(t, v === true)} aria-label={meta.label} />
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{meta.description}</span>
                    </span>
                  </label>
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <Badge variant="amber">연필 {meta.cost}자루</Badge>
                    {countKey && on && (
                      <CountStepper
                        value={counts[countKey]}
                        min={COUNT_LIMITS[countKey].min}
                        max={COUNT_LIMITS[countKey].max}
                        unit={COUNT_LIMITS[countKey].label}
                        onChange={(v) => setCounts((c) => ({ ...c, [countKey]: v }))}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border bg-white/95 p-4 shadow-[var(--shadow-lift)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <strong>{types.length}종</strong> 선택 · 사용 연필 <strong className="text-primary">{cost}자루</strong>
              <span className="text-muted-foreground"> / 보유 {balance}자루</span>
              {cost > balance && <span className="ml-2 font-semibold text-red-600">연필이 부족해요</span>}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft /> 이전
              </Button>
              <Button onClick={() => setStep(3)} disabled={types.length === 0}>
                다음: 확인 <ArrowRight />
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border bg-white p-5 sm:p-6">
            <p className="text-sm font-bold text-muted-foreground">지문 미리보기</p>
            <h2 className="mt-1 text-xl font-extrabold">
              {title || "제목 자동 생성"} {author && <span className="text-base font-semibold text-muted-foreground">{author}</span>}
            </h2>
            <p className="passage mt-4 line-clamp-[12] rounded-xl bg-surface p-4 text-[15px] whitespace-pre-line text-slate-800">{passage}</p>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border bg-white p-5">
              <p className="font-extrabold">생성 설정</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">학교급 · 학년</dt>
                  <dd className="font-semibold">
                    {SCHOOL_LEVELS[schoolLevel]} {grade}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">난이도</dt>
                  <dd className="font-semibold">{DIFFICULTIES[difficulty]}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">갈래</dt>
                  <dd className="font-semibold">{genre === "auto" ? "자동 판별" : genre}</dd>
                </div>
              </dl>
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-bold">생성할 자료 ({ordered.length}종)</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {ordered.map((t) => (
                    <li key={t} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Check className="size-4 text-emerald" /> {MATERIAL_TYPE_META[t].label}
                        {t in COUNT_LIMITS && (
                          <span className="text-muted-foreground">
                            ({counts[t as CountKey]}
                            {COUNT_LIMITS[t as CountKey].label})
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{MATERIAL_TYPE_META[t].cost}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 flex items-center justify-between border-t pt-3 font-extrabold">
                  <span>사용 연필</span>
                  <span className="text-primary">{cost}자루</span>
                </p>
              </div>
            </div>
            {engine === "demo" && (
              <p className="flex gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-soft/60 p-3 text-xs leading-relaxed text-amber-900">
                <FlaskConical className="size-4 shrink-0" />
                데모 엔진 모드입니다. 예시 지문은 완성된 결과가, 그 밖의 지문은 형태 분석 기반의 틀이 생성됩니다.
              </p>
            )}
            <Button size="xl" variant="gradient" className="w-full" onClick={generate} disabled={generating}>
              <Sparkles className="size-5" /> 수업 자료 생성하기
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep(2)}>
              <ArrowLeft /> 자료 유형 다시 고르기
            </Button>
            <p className="text-center text-xs text-muted-foreground">생성 후 HWPX · DOCS · PDF로 내려받을 수 있어요.</p>
          </div>
        </div>
      )}

      {generating && <ProgressOverlay title="수업 자료를 만들고 있어요" steps={PROGRESS_STEPS} />}
      <InsufficientPointsDialog
        open={shortfall !== null}
        onOpenChange={(o) => !o && setShortfall(null)}
        required={shortfall?.required ?? 0}
        balance={shortfall?.balance ?? 0}
      />
    </div>
  );
}
