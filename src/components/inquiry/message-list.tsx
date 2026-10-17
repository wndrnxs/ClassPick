/**
 * 문항 질문 대화 말풍선 (훅 없음 · 서버/클라이언트 공용)
 * 보는 사람 자신의 메시지는 오른쪽, 상대 메시지는 왼쪽에 둡니다.
 */
import { GraduationCap, UserRound } from "lucide-react";

import { cn, formatDateTime } from "@/lib/utils";

export type MessageView = { id: string; role: "student" | "teacher"; authorName: string; body: string; createdAt: string; mine: boolean };

export function MessageList({ messages, className }: { messages: MessageView[]; className?: string }) {
  return (
    <ol className={cn("space-y-3", className)}>
      {messages.map((m) => (
        <li key={m.id} className={cn("flex gap-2", m.mine && "flex-row-reverse")}>
          <span
            aria-hidden
            className={cn(
              "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
              m.role === "teacher" ? "bg-primary text-white" : "bg-emerald-soft text-emerald-700",
            )}
          >
            {m.role === "teacher" ? <GraduationCap className="size-4" /> : <UserRound className="size-4" />}
          </span>
          <div className={cn("min-w-0 max-w-[85%]", m.mine && "text-right")}>
            <p className="mb-1 text-xs text-muted-foreground">
              <b className="font-semibold text-slate-700">{m.authorName}</b> · {formatDateTime(m.createdAt)}
            </p>
            <p
              className={cn(
                "inline-block rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed whitespace-pre-line break-words",
                m.role === "teacher" ? "bg-secondary text-slate-900" : "bg-surface text-slate-800",
                m.mine ? "rounded-tr-sm" : "rounded-tl-sm",
              )}
            >
              {m.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
