"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BarChart3, ClipboardPaste, FileUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import { FEATURE_COSTS } from "@/lib/catalog";
import { FileDropzone } from "./file-dropzone";
import { InsufficientPointsDialog } from "./insufficient-dialog";
import { ProgressOverlay } from "./progress-overlay";

export function ExamAnalysisForm({ sampleText }: { sampleText: string }) {
  const router = useRouter();
  const [examTitle, setExamTitle] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [examText, setExamText] = useState("");
  const [tab, setTab] = useState("paste");
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [shortfall, setShortfall] = useState<{ required: number; balance: number } | null>(null);

  function onShortfall(e: unknown) {
    if (e instanceof ApiError && e.code === "insufficient_points") {
      setShortfall({ required: Number(e.data.required), balance: Number(e.data.balance) });
      return true;
    }
    return false;
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api<{ needsOcr: boolean; text?: string }>("/api/extract", { method: "POST", body: fd });
      let text = res.text ?? "";
      if (res.needsOcr) {
        toast.info("스캔 시험지예요. 스마트 OCR로 변환합니다. (연필 1자루)");
        const ocr = await api<{ material: { sourceText: string } }>("/api/ocr", { method: "POST", body: fd });
        text = ocr.material.sourceText;
      }
      setExamText(text);
      if (!examTitle) setExamTitle(file.name.replace(/\.[^.]+$/, ""));
      setTab("paste");
      toast.success("시험지 본문을 가져왔어요. 문항 번호가 잘 보이는지 확인해 주세요.");
    } catch (e) {
      if (!onShortfall(e)) toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setPending(true);
    try {
      const res = await api<{ material: { id: string } }>("/api/exams/analyze", {
        method: "POST",
        json: { examTitle, school, grade, examText },
      });
      toast.success("분석 보고서가 완성되었어요!");
      router.push(`/app/materials/${res.material.id}`);
      router.refresh();
    } catch (e) {
      setPending(false);
      if (!onShortfall(e)) toast.error((e as Error).message);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-2xl border bg-white p-4 sm:p-6">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="paste">
                <ClipboardPaste /> 본문 붙여넣기
              </TabsTrigger>
              <TabsTrigger value="upload">
                <FileUp /> 시험지 파일
              </TabsTrigger>
            </TabsList>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => {
                setExamText(sampleText);
                setExamTitle("2026학년도 1학기 중간고사 고1 국어 (예시)");
                setTab("paste");
              }}
            >
              ✨ 예시 시험지 넣기
            </Button>
          </div>
          <TabsContent value="paste" className="mt-3">
            <Textarea
              value={examText}
              onChange={(e) => setExamText(e.target.value)}
              className="min-h-[420px] font-mono text-[13px] leading-relaxed"
              placeholder={"시험지 본문을 문항 번호와 함께 붙여넣어 주세요.\n\n1. 윗글의 표현상 특징으로 가장 적절한 것은?\n① ...\n② ..."}
              aria-label="시험지 본문"
            />
            <p className="mt-2 text-right text-xs text-muted-foreground tabular-nums">{examText.length.toLocaleString()} / 60,000자</p>
          </TabsContent>
          <TabsContent value="upload" className="mt-3">
            <FileDropzone onFiles={(f) => upload(f[0])} busy={uploading} hint="시험지 PDF · 스캔 이미지 · HWPX · DOCX (스캔본은 OCR 연필 1자루)" />
          </TabsContent>
        </Tabs>
      </div>
      <div className="space-y-4">
        <div className="space-y-4 rounded-2xl border bg-white p-5">
          <div className="space-y-2">
            <Label htmlFor="exam-title">시험명</Label>
            <Input id="exam-title" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder="예: 1학기 중간고사 국어" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="school">학교</Label>
              <Input id="school" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="OO고" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">학년</Label>
              <Input id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="1학년" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5 text-sm leading-relaxed text-slate-600">
          <p className="font-extrabold text-slate-900">보고서에 담기는 내용</p>
          <ul className="mt-2 space-y-1">
            <li>• 문항별 영역 · 갈래 · 유형 · 난이도</li>
            <li>• 난이도 분포와 영역별 출제 비중</li>
            <li>• 출제 경향 핵심과 영역별 학습 전략</li>
            <li>• 학부모 상담 가이드 문구</li>
          </ul>
        </div>
        <Button size="xl" variant="gradient" className="w-full" onClick={submit} disabled={pending || examText.trim().length < 50}>
          <BarChart3 className="size-5" /> 분석 보고서 만들기 (연필 {FEATURE_COSTS.examReport}자루)
        </Button>
      </div>
      {pending && (
        <ProgressOverlay
          title="시험지를 분석하고 있어요"
          steps={["문항을 나누고 번호를 확인하는 중", "영역·갈래·유형을 판별하는 중", "난이도를 평가하는 중", "학습 전략과 상담 가이드를 작성하는 중"]}
        />
      )}
      <InsufficientPointsDialog
        open={shortfall !== null}
        onOpenChange={(o) => !o && setShortfall(null)}
        required={shortfall?.required ?? 0}
        balance={shortfall?.balance ?? 0}
      />
    </div>
  );
}
