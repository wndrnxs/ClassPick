import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, GraduationCap, MessageCircleQuestion } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { InquiryStatusBadge } from "@/components/student/question-inquiry";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateTime } from "@/lib/utils";
import { requireStudent } from "@/server/auth/dal";
import { listStudentInquiries } from "@/server/services/inquiries";

export const metadata: Metadata = { title: "내 질문" };

async function QuestionList() {
  const user = await requireStudent();
  const list = await listStudentInquiries(user.id);
  if (!list.length) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed bg-white px-6 py-14 text-center">
        <MessageCircleQuestion className="size-10 text-slate-300" />
        <p className="mt-3 font-bold">아직 남긴 질문이 없어요</p>
        <p className="mt-1 text-sm text-muted-foreground">시험 결과 화면에서 문항마다 「이 문항 질문하기」로 선생님께 물어볼 수 있어요.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {list.map((i) => (
        <li key={i.id}>
          <Link
            href={`/student/exams/${i.assignmentId}#r-${i.questionId}`}
            className={cn(
              "flex items-start gap-4 rounded-2xl border bg-white p-5 transition hover:border-primary/40 hover:shadow-sm",
              i.unread && "border-primary/40 bg-secondary/30",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <InquiryStatusBadge status={i.status} unread={i.unread} />
                <span className="truncate text-xs text-muted-foreground">
                  {i.assignmentTitle} · {formatDateTime(i.updatedAt)}
                </span>
              </div>
              <p className="mt-1.5 truncate font-bold">
                {i.questionNumber != null && <span className="mr-1 text-primary">{i.questionNumber}번</span>}
                {i.stem}
              </p>
              {i.lastMessage && (
                <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                  {i.lastMessage.role === "teacher" ? (
                    <GraduationCap className="mt-0.5 size-4 shrink-0 text-primary" />
                  ) : (
                    <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  )}
                  <span className="line-clamp-2">{i.lastMessage.body}</span>
                </p>
              )}
            </div>
            <ChevronRight className="mt-1 size-4 shrink-0 text-slate-400" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function StudentQuestionsPage() {
  return (
    <>
      <PageHeader eyebrow="My Questions" title="내 질문" description="시험 문항에 대해 선생님께 남긴 질문과 답변을 모아 볼 수 있어요." />
      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        }
      >
        <QuestionList />
      </Suspense>
    </>
  );
}
