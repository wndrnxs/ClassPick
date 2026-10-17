"use client";

import { useEffect } from "react";

import { api } from "@/lib/api-client";

/**
 * 시험 결과 화면이 실제로 열렸을 때 실행:
 * 1) '새 답변' 표시 해제 — 서버 렌더링 중에 처리하면 링크 미리 불러오기만으로도 읽음 처리될 수 있어 클라이언트에서 호출합니다.
 *    이번 화면에서는 강조 표시를 그대로 두고, 다음에 들어올 때부터 사라집니다.
 * 2) '내 질문'에서 #문항 링크로 들어온 경우, 결과가 스트리밍으로 늦게 그려져도 해당 문항으로 스크롤합니다.
 */
export function MarkInquiriesRead({ assignmentId }: { assignmentId: string }) {
  useEffect(() => {
    api("/api/inquiries/read", { method: "POST", json: { assignmentId } }).catch(() => undefined);
    if (window.location.hash) document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ block: "start" });
  }, [assignmentId]);
  return null;
}
