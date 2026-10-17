import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, GraduationCap, MessageCircleQuestion, X } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateTime } from "@/lib/utils";
import { requireUser } from "@/server/auth/dal";
import { listTeacherInquiries } from "@/server/services/inquiries";

export const metadata: Metadata = { title: "학생 질문" };

const TABS = [
  { key: "open", label: "답변 대기" },
  { key: "answered", label: "답변 완료" },
  { key: "all", label: "전체" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

async function Inbox({ searchParams }: { searchParams: PageProps<"/app/questions">["searchParams"] }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab: TabKey = sp.status === "answered" || sp.status === "all" ? sp.status : "open";
  const assignmentId = typeof sp.assignment === "string" ? sp.assignment : undefined;
  const all = await listTeacherInquiries(user.id, "all", assignmentId);
  const counts = { open: all.filter((i) => i.status === "open").length, answered: all.filter((i) => i.status === "answered").length, all: all.length };
  const list = tab === "all" ? all : all.filter((i) => i.status === tab);
  const href = (key: TabKey) => `/app/questions?status=${key}${assignmentId ? `&assignment=${assignmentId}` : ""}`;

  return (
    <div className="space-y-4">
      {assignmentId && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="soft">{all[0]?.assignmentTitle ?? "선택한 시험"}의 질문만 보는 중</Badge>
          <Link href={`/app/questions?status=${tab}`} className="inline-flex items-center gap-0.5 font-semibold text-muted-foreground hover:text-foreground">
            <X className="size-3.5" /> 전체 시험 보기
          </Link>
        </p>
      )}
      <nav className="flex gap-1 rounded-xl bg-muted/60 p-1" aria-label="질문 상태">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition sm:flex-none",
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {t.label}
            <span className={cn("rounded-full px-1.5 text-xs tabular-nums", t.key === "open" && counts.open ? "bg-red-500 text-white" : "bg-muted text-slate-500")}>
              {counts[t.key]}
            </span>
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed bg-white px-6 py-14 text-center">
          <MessageCircleQuestion className="size-10 text-slate-300" />
          <p className="mt-3 font-bold">{tab === "open" ? "답변을 기다리는 질문이 없어요" : "질문이 없어요"}</p>
          <p className="mt-1 text-sm text-muted-foreground">학생은 시험을 제출한 뒤 결과 화면에서 문항마다 질문을 남길 수 있어요.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((i) => (
            <li key={i.id}>
              <Link
                href={`/app/questions/${i.id}`}
                className={cn(
                  "flex items-start gap-4 rounded-2xl border bg-white p-5 transition hover:border-primary/40 hover:shadow-sm",
                  i.status === "open" && "border-amber-200",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {i.status === "open" ? <Badge variant="amber">답변 대기</Badge> : <Badge variant="emerald">답변 완료</Badge>}
                    {i.isPublic && <Badge variant="muted">반 전체 공개</Badge>}
                    <span className="text-sm font-bold">{i.studentName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {i.className} · {i.assignmentTitle} · {formatDateTime(i.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm text-slate-500">
                    {i.questionNumber != null && <b className="mr-1 text-primary">{i.questionNumber}번</b>}
                    {i.stem}
                  </p>
                  {i.lastMessage && (
                    <p className="mt-1 flex items-start gap-1.5 text-[15px] text-slate-800">
                      {i.lastMessage.role === "teacher" ? (
                        <GraduationCap className="mt-1 size-4 shrink-0 text-primary" />
                      ) : (
                        <MessageCircleQuestion className="mt-1 size-4 shrink-0 text-amber-600" />
                      )}
                      <span className="line-clamp-2">{i.lastMessage.body}</span>
                    </p>
                  )}
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  {i.messageCount > 1 && `${i.messageCount}개 메시지`}
                  <ChevronRight className="size-4 text-slate-400" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TeacherQuestionsPage({ searchParams }: PageProps<"/app/questions">) {
  return (
    <>
      <PageHeader
        eyebrow="Questions"
        title="학생 질문"
        description="학생들이 시험을 본 뒤 문항에 대해 남긴 질문이에요. 답변하면 학생 화면에 바로 표시되고, 좋은 질문은 반 전체에 공개할 수 있어요."
      />
      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        }
      >
        <Inbox searchParams={searchParams} />
      </Suspense>
    </>
  );
}
