import { requireApiUser } from "@/server/auth/dal";
import { handle, HttpError } from "@/server/http";
import { extractTextLocally, readUploadedFile } from "@/server/ingest/extract";

/**
 * 무료 텍스트 추출 (TXT · HWPX · DOCX · 텍스트 PDF).
 * 이미지·스캔 PDF는 { needsOcr: true } 를 돌려주며, 클라이언트는 스마트 OCR(/api/ocr)을 안내합니다.
 */
export const POST = handle(async (request: Request) => {
  await requireApiUser();
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "업로드할 파일을 선택해 주세요.");
  const result = await extractTextLocally(await readUploadedFile(file));
  if (!result) return Response.json({ needsOcr: true, fileName: file.name });
  return Response.json({ needsOcr: false, fileName: file.name, ...result });
});
