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
