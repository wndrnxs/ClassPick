import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Info, Users } from "lucide-react";

import { InquiryComposer } from "@/components/inquiry/inquiry-composer";
import { MessageList } from "@/components/inquiry/message-list";
import { PublicToggle } from "@/components/inquiry/public-toggle";
import { PassageView } from "@/components/material/sections";
import { QuestionReview } from "@/components/student/question-review";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth/dal";
import { HttpError } from "@/server/http";
import { getTeacherInquiry, type TeacherInquiry } from "@/server/services/inquiries";

export const metadata: Metadata = { title: "학생 질문" };

async function Detail({ params }: { params: PageProps<"/app/questions/[id]">["params"] }) {
  const user = await requireUser();
  const { id } = await params;
  let d: TeacherInquiry;
  try {
    d = await getTeacherInquiry(user.id, id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  const q = d.question;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {d.status === "open" ? <Badge variant="amber">답변 대기</Badge> : <Badge variant="emerald">답변 완료</Badge>}
          {d.isPublic && <Badge variant="muted">반 전체 공개</Badge>}
          <Badge variant="outline">
            <Users /> {d.className}
          </Badge>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          {d.student.name} 학생의 질문 · {q.number}번
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link href={`/app/assignments/${d.assignment.id}`} className="font-semibold text-primary hover:underline">
            {d.assignment.title}
          </Link>{" "}
          · {q.kind === "mcq" ? "5지선다" : "OX"} · {q.category}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <section className="space-y-4 lg:order-2 lg:sticky lg:top-20">
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 font-extrabold">대화</h2>
            <MessageList messages={d.messages} />
            <div className="mt-5 border-t pt-4">
              <InquiryComposer
                url={`/api/inquiries/${d.id}/messages`}
                placeholder={d.status === "open" ? "학생에게 답변을 남겨 주세요." : "추가로 설명할 내용이 있으면 남겨 주세요."}
                submitLabel="답변 보내기"
                successMessage="답변을 보냈어요. 학생 화면에 '새 답변'으로 표시돼요."
                autoFocus={d.status === "open"}
              />
            </div>
          </div>
          <PublicToggle inquiryId={d.id} isPublic={d.isPublic} answered={d.messages.some((m) => m.role === "teacher")} />
          {d.otherQuestionsOnSameItem > 0 && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-soft/60 p-3.5 text-sm text-slate-700">
              <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <span>
                같은 문항에 다른 학생 질문이 <b>{d.otherQuestionsOnSameItem}개</b> 더 있어요. 여러 학생이 헷갈려한 문항이라면 답변을 반 전체에 공개해
                보세요.{" "}
                <Link href={`/app/questions?status=all&assignment=${d.assignment.id}`} className="font-semibold text-primary hover:underline">
                  이 시험의 질문 모두 보기
                </Link>
              </span>
            </p>
          )}
        </section>

        <section className="space-y-3 lg:order-1">
          <h2 className="font-extrabold">학생이 푼 문항</h2>
          {d.section && (
            <details className="group rounded-xl border bg-white">
              <summary className="cursor-pointer list-none px-5 py-3 text-sm font-bold text-slate-700 [&::-webkit-details-marker]:hidden">
                지문 · {d.section.title}
                <span className="ml-2 font-medium text-primary group-open:hidden">펼치기</span>
                <span className="ml-2 hidden font-medium text-primary group-open:inline">접기</span>
              </summary>
              <PassageView text={d.section.text} className="m-3 mt-0" />
            </details>
          )}
          <QuestionReview q={q} myAnswer={d.studentAnswer} correct={d.correct} reveal answerLabel="학생 답" timeSec={d.timeSec} />
        </section>
      </div>
    </div>
  );
}

export default function TeacherQuestionPage({ params }: PageProps<"/app/questions/[id]">) {
  return (
    <>
      <Link href="/app/questions" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> 학생 질문
      </Link>
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        }
      >
        <Detail params={params} />
      </Suspense>
    </>
  );
}
