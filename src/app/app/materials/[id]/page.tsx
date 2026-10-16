import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { MaterialViewer } from "@/components/material/material-viewer";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth/dal";
import { HttpError } from "@/server/http";
import { getMaterial } from "@/server/services/materials";

export const metadata: Metadata = { title: "자료 보기" };

async function Viewer({ params }: { params: PageProps<"/app/materials/[id]">["params"] }) {
  const user = await requireUser();
  const { id } = await params;
  let material;
  try {
    material = getMaterial(user.id, id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  return (
    <MaterialViewer
      material={material}
      targets={{
        exportBase: `/api/materials/${id}/export`,
        printBase: `/print/materials/${id}`,
        hasAudience: material.kind === "passage" || material.kind === "exam_set",
      }}
    />
  );
}

export default function MaterialPage(props: PageProps<"/app/materials/[id]">) {
  return (
    <>
      <Link href="/app/materials" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> 내 자료함
      </Link>
      <Suspense
        fallback={
          <div className="space-y-5">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-10 w-96 max-w-full rounded-xl" />
            <Skeleton className="h-[480px] rounded-2xl" />
          </div>
        }
      >
        <Viewer params={props.params} />
      </Suspense>
    </>
  );
}
