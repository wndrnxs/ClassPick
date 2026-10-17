import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

export function formatDate(value: string | number | Date) {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | number | Date) {
  return dateTimeFormatter.format(new Date(value));
}

/** 초 → "45초", "1분 12초", "1시간 5분", "2일 3시간" */
export function formatDuration(sec: number | null | undefined) {
  if (sec == null) return "-";
  const t = Math.max(0, Math.round(sec));
  if (t < 60) return `${t}초`;
  if (t < 3600) return t % 60 ? `${Math.floor(t / 60)}분 ${t % 60}초` : `${t / 60}분`;
  if (t < 86400) return `${Math.floor(t / 3600)}시간 ${Math.floor((t % 3600) / 60)}분`;
  return `${Math.floor(t / 86400)}일 ${Math.floor((t % 86400) / 3600)}시간`;
}

/** 초 → "1:05", "1:02:09" (타이머·차트 라벨용) */
export function formatClock(sec: number) {
  const t = Math.max(0, Math.round(sec));
  const pad = (n: number) => String(n).padStart(2, "0");
  return t >= 3600 ? `${Math.floor(t / 3600)}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}` : `${Math.floor(t / 60)}:${pad(t % 60)}`;
}

export function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

export function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

/** 파일명에 쓸 수 없는 문자를 제거합니다. */
export function safeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|\s]+/g, "_").replace(/_+/g, "_").slice(0, 80) || "classpick";
}
