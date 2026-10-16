import type { Metadata } from "next";
import { Suspense } from "react";

import { ExamBuilder } from "@/components/app/exam-builder";
import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth/dal";
import { listMaterials } from "@/server/services/materials";

export const metadata: Metadata = { title: "모음 시험지 제본" };

async function Builder() {
  const user = await requireUser();
  const candidates = listMaterials(user.id, { kind: "passage" });
  return <ExamBuilder candidates={candidates} />;
}

export default function ExamBuilderPage() {
  return (
    <>
      <PageHeader
        eyebrow="Multi-Passage Test"
        title="여러 지문 모음 시험지 제본"
        description="원하는 지문들을 묶어 단 하나의 시험지로. 지문 순서와 영역별 출제 유형을 정하면 문항 번호와 정답표까지 자동으로 정리됩니다."
      />
      <Suspense fallback={<Skeleton className="h-[480px] rounded-2xl" />}>
        <Builder />
      </Suspense>
    </>
  );
}
