import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ClipboardCheck, KeyRound } from "lucide-react";

import { CopyButton } from "@/components/classroom/copy-button";
import { RemoveStudentButton } from "@/components/classroom/remove-student-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { requireUser } from "@/server/auth/dal";
import { HttpError } from "@/server/http";
import { getClassDetail } from "@/server/services/classroom";

export const metadata: Metadata = { title: "반 관리" };

async function Detail({ params }: { params: PageProps<"/app/classes/[id]">["params"] }) {
  const user = await requireUser();
  const { id } = await params;
  let cls;
  try {
    cls = await getClassDetail(user.id, id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-white p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{cls.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            학생 {cls.students.length}명 · 배포한 시험 {cls.assignments.length}개
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
          <KeyRound className="size-4 text-primary" />
          <span className="font-mono text-2xl font-black tracking-[0.25em] text-primary-deep">{cls.joinCode}</span>
          <CopyButton value={cls.joinCode} label="코드 복사" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 font-extrabold">학생 명단</h2>
          {cls.students.length === 0 ? (
            <p className="rounded-xl bg-surface p-6 text-center text-sm text-muted-foreground">
              아직 참여한 학생이 없어요. 참여 코드 <strong className="font-mono">{cls.joinCode}</strong>를 알려 주세요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-semibold">이름</th>
                    <th className="py-2 text-right font-semibold">응시</th>
                    <th className="py-2 text-right font-semibold">평균</th>
                    <th className="py-2 text-right font-semibold">참여일</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {cls.students.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="py-2.5 font-semibold">{s.name}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        {s.submitted}/{cls.assignments.length}
                      </td>
                      <td className="py-2.5 text-right font-bold tabular-nums">{s.averageScore ?? "-"}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{formatDate(s.joinedAt)}</td>
                      <td className="py-2.5 text-right">
                        <RemoveStudentButton classId={cls.id} studentId={s.id} name={s.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 font-extrabold">배포한 시험</h2>
          {cls.assignments.length === 0 ? (
            <p className="rounded-xl bg-surface p-6 text-center text-sm text-muted-foreground">
              내 자료함에서 자료를 열고 <strong>‘학생에게 배포’</strong>를 눌러 시험을 보내 보세요.
            </p>
          ) : (
            <ul className="space-y-2">
              {cls.assignments.map((a) => (
                <li key={a.id}>
                  <Link href={`/app/assignments/${a.id}`} className="flex items-center gap-3 rounded-xl border p-3 transition hover:border-primary/40">
                    <ClipboardCheck className="size-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(a.createdAt)} · {a.questionCount}문항 · 응시 {a.submitted}/{cls.students.length}명
                      </p>
                    </div>
                    {a.status === "closed" && <Badge variant="muted">마감</Badge>}
                    <span className="text-lg font-black tabular-nums">{a.averageScore ?? "-"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ClassDetailPage(props: PageProps<"/app/classes/[id]">) {
  return (
    <>
      <Link href="/app/classes" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> 반 목록
      </Link>
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Detail params={props.params} />
      </Suspense>
    </>
  );
}
