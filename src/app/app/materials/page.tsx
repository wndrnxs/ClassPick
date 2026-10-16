import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FolderOpen, Search, Sparkles } from "lucide-react";

import { MaterialRow } from "@/components/app/material-card";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { KIND_LABELS } from "@/lib/catalog";
import { MATERIAL_KINDS, type MaterialKind } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/dal";
import { listMaterials } from "@/server/services/materials";

export const metadata: Metadata = { title: "내 자료함" };

type SP = PageProps<"/app/materials">["searchParams"];

async function Filters({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const kind = typeof sp.kind === "string" ? sp.kind : "";
  const q = typeof sp.q === "string" ? sp.q : "";
  const tabs = [{ value: "", label: "전체" }, ...MATERIAL_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))];
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={{ pathname: "/app/materials", query: { ...(t.value ? { kind: t.value } : {}), ...(q ? { q } : {}) } }}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition",
              kind === t.value ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <form className="relative w-full lg:w-72" action="/app/materials">
        {kind && <input type="hidden" name="kind" value={kind} />}
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder="자료 제목 검색" className="pl-9" aria-label="자료 제목 검색" />
      </form>
    </div>
  );
}

async function List({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const kind = MATERIAL_KINDS.includes(sp.kind as MaterialKind) ? (sp.kind as MaterialKind) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : undefined;
  const items = listMaterials(user.id, { kind, q });
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed bg-white px-6 py-16 text-center">
        <FolderOpen className="size-10 text-slate-300" />
        <p className="mt-3 font-bold">{q || kind ? "조건에 맞는 자료가 없어요" : "아직 만든 자료가 없어요"}</p>
        <Button asChild className="mt-5">
          <Link href="/app/new">
            <Sparkles /> 새 자료 만들기
          </Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-2.5">
      <p className="text-sm text-muted-foreground">총 {items.length}개</p>
      {items.map((m) => (
        <MaterialRow key={m.id} m={m} />
      ))}
    </div>
  );
}

export default function MaterialsPage(props: PageProps<"/app/materials">) {
  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="내 자료함"
        description="만든 자료는 언제든 다시 열어 HWPX · DOCS · PDF로 내려받을 수 있어요."
        actions={
          <Button asChild>
            <Link href="/app/new">
              <Sparkles /> 새 자료 만들기
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="mb-5 h-10 rounded-xl" />}>
        <Filters searchParams={props.searchParams} />
      </Suspense>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[74px] rounded-xl" />
            ))}
          </div>
        }
      >
        <List searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
