import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { MaterialEditor } from "@/components/material/edit/material-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth/dal";
import { HttpError } from "@/server/http";
import { getMaterial } from "@/server/services/materials";

export const metadata: Metadata = { title: "자료 수정" };

async function Editor({ params }: { params: PageProps<"/app/materials/[id]/edit">["params"] }) {
  const user = await requireUser();
  const { id } = await params;
  let material;
  try {
    material = await getMaterial(user.id, id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  return <MaterialEditor material={material} />;
}

async function BackLink({ params }: { params: PageProps<"/app/materials/[id]/edit">["params"] }) {
  const { id } = await params;
  return (
    <Link href={`/app/materials/${id}`} className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary">
      <ArrowLeft className="size-4" /> 자료로 돌아가기
    </Link>
  );
}

export default function MaterialEditPage(props: PageProps<"/app/materials/[id]/edit">) {
  return (
    <>
      <Suspense fallback={<div className="mb-5 h-5" />}>
        <BackLink params={props.params} />
      </Suspense>
      <PageHeader eyebrow="Edit" title="자료 수정" description="제목·지문·문항·해설의 오타나 잘못된 정보를 직접 고칠 수 있어요." />
      <Suspense
        fallback={
          <div className="space-y-5">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-[480px] rounded-2xl" />
          </div>
        }
      >
        <Editor params={props.params} />
      </Suspense>
    </>
  );
}
