import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ClipboardCheck, FolderOpen } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { requireUser } from "@/server/auth/dal";
import { listAssignments } from "@/server/services/classroom";

export const metadata: Metadata = { title: "배포한 시험 · 성적" };

async function List() {
  const user = await requireUser();
  const items = await listAssignments(user.id);
  if (!items.length) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed bg-white px-6 py-14 text-center">
        <ClipboardCheck className="size-10 text-slate-300" />
        <p className="mt-3 font-bold">아직 배포한 시험이 없어요</p>
        <p className="mt-1 text-sm text-muted-foreground">5지선다·OX 문항이 있는 자료를 열고 ‘학생에게 배포’를 눌러 주세요.</p>
        <Button asChild className="mt-5">
          <Link href="/app/materials">
            <FolderOpen /> 내 자료함으로
          </Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-bold">시험</th>
            <th className="px-4 py-3 font-bold">반</th>
            <th className="px-4 py-3 text-right font-bold">응시</th>
            <th className="px-4 py-3 text-right font-bold">평균</th>
            <th className="px-4 py-3 text-right font-bold">배포일</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id} className="border-t hover:bg-surface">
              <td className="px-4 py-3">
                <Link href={`/app/assignments/${a.id}`} className="font-bold hover:text-primary">
                  {a.title}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground">{a.questionCount}문항</span>
                {a.status === "closed" && (
                  <Badge variant="muted" className="ml-2">
                    마감
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{a.className}</td>
              <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                {a.submitted}/{a.rosterSize}명
              </td>
              <td className="px-4 py-3 text-right text-base font-black tabular-nums">{a.averageScore ?? "-"}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap text-muted-foreground">{formatDateTime(a.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AssignmentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Assignments"
        title="배포한 시험 · 성적"
        description="시험을 누르면 정답률, 선지별 응답 분포, 점수 분포와 학생별 성적을 한눈에 볼 수 있어요."
      />
      <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
        <List />
      </Suspense>
    </>
  );
}
