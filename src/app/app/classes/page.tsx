import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, KeyRound, Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { CopyButton } from "@/components/classroom/copy-button";
import { CreateClassForm } from "@/components/classroom/create-class-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth/dal";
import { listClasses } from "@/server/services/classroom";

export const metadata: Metadata = { title: "반 · 학생 관리" };

async function ClassList() {
  const user = await requireUser();
  const classes = await listClasses(user.id);
  if (!classes.length) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed bg-white px-6 py-14 text-center">
        <Users className="size-10 text-slate-300" />
        <p className="mt-3 font-bold">아직 만든 반이 없어요</p>
        <p className="mt-1 text-sm text-muted-foreground">반을 만들면 학생들이 참여할 수 있는 6자리 코드가 생깁니다.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {classes.map((c) => (
        <div key={c.id} className="flex flex-col rounded-2xl border bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-extrabold">{c.name}</p>
              <p className="text-sm text-muted-foreground">
                학생 {c.studentCount}명 · 배포한 시험 {c.assignmentCount}개
              </p>
            </div>
            <Link href={`/app/classes/${c.id}`} className="inline-flex items-center gap-0.5 text-sm font-semibold text-primary hover:underline">
              관리 <ChevronRight className="size-4" />
            </Link>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-secondary/60 p-3">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              <span className="text-xs font-semibold text-secondary-foreground">참여 코드</span>
              <span className="font-mono text-xl font-black tracking-[0.25em] text-primary-deep">{c.joinCode}</span>
            </div>
            <CopyButton value={c.joinCode} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ClassesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Classes"
        title="반 · 학생 관리"
        description="반을 만들고 참여 코드를 학생들에게 알려 주세요. 학생은 클래스픽 학생 화면에서 코드를 입력해 반에 들어옵니다."
      />
      <div className="mb-6 rounded-2xl border bg-white p-5">
        <p className="mb-3 font-bold">새 반 만들기</p>
        <CreateClassForm />
      </div>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        }
      >
        <ClassList />
      </Suspense>
    </>
  );
}
