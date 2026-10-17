import "server-only";

import JSZip from "jszip";

import { normalizeText } from "@/lib/hangul";
import type { OcrResult } from "@/lib/schemas";
import { HttpError } from "@/server/http";

export type UploadedFile = { name: string; type: string; bytes: Uint8Array };

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const AI_OCR_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"] as const;

const ext = (name: string) => name.toLowerCase().split(".").pop() ?? "";

const XML_ENTITIES: Record<string, string> = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&apos;": "'" };
const decodeXml = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&(lt|gt|amp|quot|apos);/g, (m) => XML_ENTITIES[m]);

/** HWPX(OWPML) 본문 텍스트 추출: Contents/section*.xml의 문단(hp:p)별 hp:t 텍스트를 모읍니다. */
export async function extractHwpxText(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const sections = Object.keys(zip.files)
    .filter((p) => /^Contents\/section\d+\.xml$/i.test(p))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  if (sections.length === 0) throw new HttpError(422, "HWPX 본문(section)을 찾을 수 없습니다.");
  const paragraphs: string[] = [];
  for (const path of sections) {
    const xml = await zip.file(path)!.async("string");
    for (const chunk of xml.split(/<\/hp:p>/)) {
      const runs = [...chunk.matchAll(/<hp:t(?:\s[^>]*)?>([\s\S]*?)<\/hp:t>/g)].map((m) =>
        decodeXml(m[1].replace(/<hp:tab[^>]*\/>/g, "\t").replace(/<hp:lineBreak[^>]*\/>/g, "\n").replace(/<[^>]+>/g, "")),
      );
      if (runs.length) paragraphs.push(runs.join(""));
      else if (/<hp:p[\s>]/.test(chunk)) paragraphs.push("");
    }
  }
  return normalizeText(paragraphs.join("\n"));
}

function decodeTextFile(bytes: Uint8Array): string {
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  if (!utf8.includes("�")) return utf8;
  try {
    return new TextDecoder("euc-kr").decode(bytes); // 오래된 한글 텍스트 파일 대응
  } catch {
    return utf8;
  }
}

/**
 * AI 없이 추출 가능한 형식(텍스트·HWPX·DOCX·텍스트 PDF)은 직접 추출합니다.
 * 이미지·스캔 PDF처럼 OCR이 필요한 경우 null을 반환합니다.
 */
export async function extractTextLocally(file: UploadedFile): Promise<Omit<OcrResult, "fileName"> | null> {
  const e = ext(file.name);
  if (file.bytes.byteLength > MAX_UPLOAD_BYTES) throw new HttpError(413, "파일은 15MB 이하만 업로드할 수 있습니다.");

  if (e === "txt" || e === "md" || file.type.startsWith("text/")) {
    return { method: "text", text: normalizeText(decodeTextFile(file.bytes)) };
  }
  if (e === "hwpx") {
    return { method: "hwpx", text: await extractHwpxText(file.bytes) };
  }
  if (e === "hwp") {
    throw new HttpError(415, "구버전 HWP 파일은 지원하지 않습니다. 한글에서 'HWPX'로 다시 저장해 업로드해 주세요.");
  }
  if (e === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(file.bytes) });
    return { method: "docx", text: normalizeText(result.value) };
  }
  if (e === "pdf" || file.type === "application/pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(file.bytes));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    const clean = normalizeText(text);
    // 페이지당 글자가 거의 없으면 스캔본으로 보고 OCR로 넘깁니다.
    if (clean.replace(/\s/g, "").length < Math.max(30, totalPages * 20)) return null;
    return { method: "pdf-text", text: clean, note: `텍스트 레이어에서 ${totalPages}쪽을 추출했습니다.` };
  }
  if (file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(e)) {
    return null;
  }
  throw new HttpError(415, "지원하지 않는 파일 형식입니다. (지원: PDF, 이미지, HWPX, DOCX, TXT)");
}

export function mediaTypeOf(file: UploadedFile): (typeof AI_OCR_MEDIA_TYPES)[number] | null {
  const e = ext(file.name);
  const byExt: Record<string, (typeof AI_OCR_MEDIA_TYPES)[number]> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    pdf: "application/pdf",
  };
  const t = (AI_OCR_MEDIA_TYPES as readonly string[]).includes(file.type) ? file.type : byExt[e];
  return (t as (typeof AI_OCR_MEDIA_TYPES)[number]) ?? null;
}

export async function readUploadedFile(file: File): Promise<UploadedFile> {
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "파일은 15MB 이하만 업로드할 수 있습니다.");
  return { name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) };
}
