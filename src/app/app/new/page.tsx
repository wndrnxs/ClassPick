import type { Metadata } from "next";
import { Suspense } from "react";

import { GenerateWizard, type WizardInitial } from "@/components/app/generate-wizard";
import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SAMPLES } from "@/lib/samples";
import { requireUser } from "@/server/auth/dal";
import { DEMO_NOTICE, demoReasonFor } from "@/server/ai/access";
import { HttpError } from "@/server/http";
import { getMaterial } from "@/server/services/materials";

export const metadata: Metadata = { title: "새 자료 만들기" };

async function WizardLoader({ searchParams }: { searchParams: PageProps<"/app/new">["searchParams"] }) {
  const user = await requireUser();
  const { from } = await searchParams;
  let initial: WizardInitial | undefined;
  if (typeof from === "string") {
    try {
      const m = await getMaterial(user.id, from);
      initial = { passage: m.sourceText, title: m.title, author: m.author, sourceNote: m.sourceNote };
    } catch (e) {
      if (!(e instanceof HttpError)) throw e;
    }
  }
  const samples = SAMPLES.map(({ slug, title, author, sourceNote, passage }) => ({ slug, title, author, sourceNote, passage }));
  const demoReason = demoReasonFor(user);
  return (
    <GenerateWizard
      balance={user.points}
      engine={demoReason ? "demo" : "claude"}
      demoNotice={demoReason ? DEMO_NOTICE[demoReason] : undefined}
      samples={samples}
      initial={initial}
    />
  );
}

export default function NewMaterialPage(props: PageProps<"/app/new">) {
  return (
    <>
      <PageHeader
        eyebrow="New Material"
        title="지문 하나로 수업 자료 세트 만들기"
        description="지문을 넣고, 필요한 자료를 고르면 클래스픽이 한 번에 만들어 드립니다."
      />
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-[72px] rounded-2xl" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Skeleton className="h-[480px] rounded-2xl" />
              <Skeleton className="h-[480px] rounded-2xl" />
            </div>
          </div>
        }
      >
        <WizardLoader searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
