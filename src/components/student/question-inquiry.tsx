"use client";

import { useState } from "react";
import { ChevronDown, MessageCircleQuestion, Users } from "lucide-react";

import { InquiryComposer } from "@/components/inquiry/inquiry-composer";
import { MessageList, type MessageView } from "@/components/inquiry/message-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Thread = { id: string; status: "open" | "answered"; isPublic: boolean; unread: boolean; messages: MessageView[] };

export function InquiryStatusBadge({ status, unread }: { status: "open" | "answered"; unread?: boolean }) {
  if (unread) return <Badge variant="default">새 답변</Badge>;
  return status === "open" ? <Badge variant="amber">답변 대기</Badge> : <Badge variant="emerald">답변 완료</Badge>;
}

/** 결과 화면의 문항 카드 아래: 내 질문 대화 · 질문하기 · 선생님이 공개한 반 친구 질문 */
export function QuestionInquiry({
  assignmentId,
  questionId,
  questionNumber,
  thread,
  shared,
}: {
  assignmentId: string;
  questionId: string;
  questionNumber: number;
  thread: Thread | null;
  shared: Thread[];
}) {
  const [asking, setAsking] = useState(false);
  const [showShared, setShowShared] = useState(false);
  const close = () => setAsking(false);

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      {thread && (
        <div className={cn("rounded-xl border p-4", thread.unread ? "border-primary/40 bg-secondary/40" : "bg-surface/60")}>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <MessageCircleQuestion className="size-4 text-primary" />
            <b className="text-sm">내 질문</b>
            <InquiryStatusBadge status={thread.status} unread={thread.unread} />
            {thread.isPublic && <Badge variant="muted">반 전체 공개</Badge>}
          </div>
          <MessageList messages={thread.messages} />
          <div className="mt-3">
            {asking ? (
              <InquiryComposer
                url={`/api/inquiries/${thread.id}/messages`}
                placeholder="추가로 궁금한 점을 적어 주세요."
                submitLabel="추가 질문"
                successMessage="선생님께 추가 질문을 보냈어요."
                autoFocus
                onSent={close}
                onCancel={close}
              />
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setAsking(true)}>
                <MessageCircleQuestion /> 추가 질문하기
              </Button>
            )}
          </div>
        </div>
      )}

      {!thread && asking && (
        <div className="rounded-xl border bg-surface/60 p-4">
          <p className="text-sm font-bold">{questionNumber}번 문항 질문하기</p>
          <p className="mt-0.5 mb-2.5 text-xs text-muted-foreground">헷갈린 선지, 이해되지 않는 해설 등 궁금한 점을 남겨 주세요. 선생님만 볼 수 있어요.</p>
          <InquiryComposer
            url="/api/inquiries"
            extra={{ assignmentId, questionId }}
            placeholder="예: ③번 선지가 왜 틀렸는지 모르겠어요."
            submitLabel="질문 보내기"
            successMessage="선생님께 질문을 보냈어요. 답변이 오면 '내 질문'에서 알려 드려요."
            autoFocus
            onSent={close}
            onCancel={close}
          />
        </div>
      )}

      {((!thread && !asking) || shared.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {!thread && !asking && (
            <Button variant="outline" size="sm" onClick={() => setAsking(true)}>
              <MessageCircleQuestion /> 이 문항 질문하기
            </Button>
          )}
          {shared.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowShared((v) => !v)} aria-expanded={showShared}>
              <Users /> 반 친구들의 질문 {shared.length}
              <ChevronDown className={cn("transition-transform", showShared && "rotate-180")} />
            </Button>
          )}
        </div>
      )}

      {showShared &&
        shared.map((t) => (
          <div key={t.id} className="rounded-xl border border-dashed bg-white p-4">
            <p className="mb-3 text-xs font-bold text-muted-foreground">선생님이 반 전체에 공개한 질문과 답변</p>
            <MessageList messages={t.messages} />
          </div>
        ))}
    </div>
  );
}
