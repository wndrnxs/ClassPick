"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Info, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { RichPassageEditor } from "@/components/app/rich-passage-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";
import { KIND_LABELS, MATERIAL_TYPE_META, MATERIAL_TYPE_ORDER } from "@/lib/catalog";
import { issueLocation, UpdateMaterialInput } from "@/lib/material-edit";
import type { MaterialDTO } from "@/lib/material-dto";
import type { ExamReport, ExamSet, PassageContent } from "@/lib/schemas";

import { at, each, Field, StringList, TextArea, TextInput, type Bind } from "./fields";
import {
  AnnotationEditor,
  ExamReportEditor,
  Group,
  McqListEditor,
  OxListEditor,
  ShortAnswerListEditor,
  StructureEditor,
  VocabListEditor,
} from "./section-editors";

type Draft = { title: string; author: string; sourceNote: string; sourceText: string; content: MaterialDTO["content"] };

function payloadOf(kind: MaterialDTO["kind"], d: Draft): UpdateMaterialInput {
  const base = { title: d.title, author: d.author, sourceNote: d.sourceNote };
  switch (kind) {
    case "passage":
      return { kind, ...base, sourceText: d.sourceText, content: d.content as PassageContent };
    case "exam_report":
      return { kind, ...base, content: d.content as { report: ExamReport } };
    case "exam_set":
      return { kind, ...base, content: d.content as { exam: ExamSet } };
    case "ocr":
      return { kind, ...base, content: { ocr: { text: (d.content as { ocr: { text: string } }).ocr.text } } };
  }
}

const card = "rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-6";

export function MaterialEditor({ material }: { material: MaterialDTO }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => ({
    title: material.title,
    author: material.author,
    sourceNote: material.sourceNote,
    sourceText: material.sourceText,
    content: structuredClone(material.content),
  }));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const root: Bind<Draft> = {
    value: draft,
    set: (v) => {
      setDraft(v);
      setDirty(true);
    },
  };

  // 저장하지 않고 나가려 하면 확인
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    const payload = payloadOf(material.kind, draft);
    const check = UpdateMaterialInput.safeParse(payload);
    if (!check.success) {
      const issue = check.error.issues[0];
      const where = issue ? issueLocation(issue.path) : "";
      toast.error(`${where ? `${where}: ` : ""}${issue?.message ?? "입력값을 확인해 주세요."}`);
      return;
    }
    setSaving(true);
    try {
      await api(`/api/materials/${material.id}`, { method: "PATCH", json: payload });
      setDirty(false);
      toast.success("수정한 내용을 저장했어요.");
      router.push(`/app/materials/${material.id}`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
      setSaving(false);
    }
  }

  const content = at(root, "content") as Bind<unknown>;

  return (
    <div className="space-y-5">
      <section className={`space-y-4 ${card}`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{KIND_LABELS[material.kind]}</Badge>
          <p className="text-xs text-muted-foreground">오타나 잘못된 정보를 고쳐 저장하세요. 토큰은 사용하지 않아요.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <TextInput label="제목" b={at(root, "title")} />
          {material.kind !== "exam_report" && material.kind !== "exam_set" && <TextInput label="작가" b={at(root, "author")} />}
          <TextInput label={material.kind === "passage" ? "출처" : "부가 정보"} b={at(root, "sourceNote")} />
        </div>
        {material.kind === "passage" && (
          <Field label="지문" hint="굵게·밑줄·네모 박스 서식을 쓸 수 있어요">
            {() => (
              <RichPassageEditor
                value={draft.sourceText}
                onChange={(v) => root.set({ ...draft, sourceText: v })}
                aria-label="지문 본문"
                editorClassName="min-h-48"
              />
            )}
          </Field>
        )}
        {(material.kind === "passage" || material.kind === "exam_set") && (
          <p className="flex gap-2 rounded-lg bg-surface px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            지문을 고쳐도 문항은 다시 만들어지지 않아요. 이미 학생에게 배포한 시험은 배포할 때의 내용 그대로 유지돼요.
          </p>
        )}
      </section>

      {material.kind === "passage" && <PassageContentEditor b={content as Bind<PassageContent>} />}
      {material.kind === "exam_report" && (
        <section className={card}>
          <ExamReportEditor b={at(content as Bind<{ report: ExamReport }>, "report")} />
        </section>
      )}
      {material.kind === "exam_set" && <ExamSetEditor b={at(content as Bind<{ exam: ExamSet }>, "exam")} />}
      {material.kind === "ocr" && (
        <section className={card}>
          <TextArea label="변환된 글" b={at(at(content as Bind<{ ocr: { text: string } }>, "ocr"), "text")} passage />
        </section>
      )}

      <div className="sticky bottom-3 z-20 rounded-2xl border bg-white/95 shadow-[var(--shadow-lift)] backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-muted-foreground">{dirty ? "저장하지 않은 수정 사항이 있어요." : "수정한 내용이 없어요."}</p>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/app/materials/${material.id}`}>취소</Link>
            </Button>
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />} 저장하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PassageContentEditor({ b }: { b: Bind<PassageContent> }) {
  const types = MATERIAL_TYPE_ORDER.filter((t) => b.value[t]);
  if (!types.length) return null;
  return (
    <Tabs defaultValue={types[0]}>
      <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
        {types.map((t) => (
          <TabsTrigger key={t} value={t}>
            {MATERIAL_TYPE_META[t].shortLabel}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className={card}>
        {types.map((t) => (
          <TabsContent key={t} value={t}>
            {t === "structure" && <StructureEditor b={at(b, "structure") as Bind<NonNullable<PassageContent["structure"]>>} />}
            {t === "annotation" && <AnnotationEditor b={at(b, "annotation") as Bind<NonNullable<PassageContent["annotation"]>>} />}
            {t === "mcq" && <McqListEditor b={at(at(b, "mcq") as Bind<NonNullable<PassageContent["mcq"]>>, "questions")} />}
            {t === "short_answer" && (
              <ShortAnswerListEditor b={at(at(b, "short_answer") as Bind<NonNullable<PassageContent["short_answer"]>>, "questions")} />
            )}
            {t === "ox" && <OxListEditor b={at(at(b, "ox") as Bind<NonNullable<PassageContent["ox"]>>, "items")} />}
            {t === "vocab" && <VocabListEditor b={at(at(b, "vocab") as Bind<NonNullable<PassageContent["vocab"]>>, "items")} />}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}

function ExamSetEditor({ b }: { b: Bind<ExamSet> }) {
  // 문항 번호는 지문 순서대로 이어집니다.
  const starts = b.value.sections.map((_, i) => {
    const before = b.value.sections.slice(0, i);
    return { mcq: 1 + before.reduce((n, s) => n + s.mcq.length, 0), sa: 1 + before.reduce((n, s) => n + s.short_answer.length, 0) };
  });
  return (
    <div className="space-y-5">
      <section className={`space-y-4 ${card}`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <TextInput label="학교" b={at(b, "school")} />
          <TextInput label="학년" b={at(b, "grade")} />
          <Field label="제한 시간(분)" hint="비우면 표시 안 함">
            {(id) => (
              <input
                id={id}
                type="number"
                min={5}
                max={300}
                value={b.value.timeLimit ?? ""}
                onChange={(e) => b.set({ ...b.value, timeLimit: e.target.value === "" ? null : Number(e.target.value) })}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums shadow-xs outline-none focus-visible:border-primary"
              />
            )}
          </Field>
        </div>
        <StringList label="수험생 유의 사항" b={at(b, "instructions")} addLabel="유의 사항 추가" multiline />
      </section>
      {each(at(b, "sections")).map((sec, i) => (
        <section key={sec.value.materialId + i} className={`space-y-4 ${card}`}>
          <h2 className="text-lg font-extrabold">지문 {i + 1}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="작품명" b={at(at(sec, "passage"), "title")} />
            <TextInput label="작가" b={at(at(sec, "passage"), "author")} />
          </div>
          <Field label="지문">
            {() => (
              <RichPassageEditor
                value={sec.value.passage.text}
                onChange={(v) => sec.set({ ...sec.value, passage: { ...sec.value.passage, text: v } })}
                aria-label={`지문 ${i + 1} 본문`}
                editorClassName="min-h-40"
              />
            )}
          </Field>
          {(sec.value.mcq.length > 0 || sec.value.short_answer.length === 0) && (
            <Group title="5지선다">
              <McqListEditor b={at(sec, "mcq")} startNumber={starts[i].mcq} />
            </Group>
          )}
          {sec.value.short_answer.length > 0 && (
            <Group title="서술형">
              <ShortAnswerListEditor b={at(sec, "short_answer")} startNumber={starts[i].sa} />
            </Group>
          )}
          {sec.value.ox.length > 0 && (
            <Group title="OX">
              <OxListEditor b={at(sec, "ox")} />
            </Group>
          )}
        </section>
      ))}
    </div>
  );
}
