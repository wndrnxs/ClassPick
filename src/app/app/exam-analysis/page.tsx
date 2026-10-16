import type { Metadata } from "next";
import { Suspense } from "react";

import { ExamAnalysisForm } from "@/components/app/exam-analysis-form";
import { MaterialRow } from "@/components/app/material-card";
import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SAMPLE_EXAM_TEXT } from "@/lib/samples/exam-text";
import { requireUser } from "@/server/auth/dal";
import { listMaterials } from "@/server/services/materials";

export const metadata: Metadata = { title: "시험지 분석 보고서" };

async function RecentReports() {
  const user = await requireUser();
  const items = listMaterials(user.id, { kind: "exam_report", limit: 10 });
  if (!items.length) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-extrabold">최근 분석 보고서</h2>
      <div className="grid grid-cols-1 gap-2.5">
        {items.map((m) => (
          <MaterialRow key={m.id} m={m} />
        ))}
      </div>
    </section>
  );
}

export default function ExamAnalysisPage() {
  return (
    <>
      <PageHeader
        eyebrow="Exam Analysis"
        title="시험지 구조 및 난이도 분석 보고서"
        description="내신 시험지를 등록하면 문항별 난이도 분포, 영역별 출제 비중, 학습 전략과 학부모 상담 가이드까지 정리해 드립니다."
      />
      <ExamAnalysisForm sampleText={SAMPLE_EXAM_TEXT} />
      <Suspense fallback={<Skeleton className="mt-10 h-40 rounded-2xl" />}>
        <RecentReports />
      </Suspense>
    </>
  );
}
