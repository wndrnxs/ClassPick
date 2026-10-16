import type { Metadata } from "next";
import { Suspense } from "react";
import { ScanText } from "lucide-react";

import { MaterialRow } from "@/components/app/material-card";
import { OcrWorkbench } from "@/components/app/ocr-workbench";
import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth/dal";
import { listMaterials } from "@/server/services/materials";

export const metadata: Metadata = { title: "스마트 OCR" };

async function RecentOcr() {
  const user = await requireUser();
  const items = await listMaterials(user.id, { kind: "ocr", limit: 10 });
  if (!items.length) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-extrabold">최근 변환한 문서</h2>
      <div className="grid grid-cols-1 gap-2.5">
        {items.map((m) => (
          <MaterialRow key={m.id} m={m} />
        ))}
      </div>
    </section>
  );
}

export default function OcrPage() {
  return (
    <>
      <PageHeader
        eyebrow="Smart OCR"
        title="스캔 문서 스마트 OCR 변환"
        description="타이핑 없이 스캔본을 바로 편집 가능한 문서로. 지문·표·기호(①, ㉠)까지 정확히 읽어 HWPX로 저장합니다."
      />
      <div className="mb-5 flex gap-3 rounded-xl border border-blue-200 bg-secondary/60 p-4 text-sm leading-relaxed text-secondary-foreground">
        <ScanText className="mt-0.5 size-4 shrink-0" />
        <p>
          변환한 텍스트는 원문과 한 번 대조해 주세요. 특히 한자 병기, 고어 표기(ㆍ, ㅿ), 밑줄·기호가 많은 지문은 확인이 필요할 수 있어요.
        </p>
      </div>
      <OcrWorkbench />
      <Suspense fallback={<Skeleton className="mt-10 h-40 rounded-2xl" />}>
        <RecentOcr />
      </Suspense>
    </>
  );
}
