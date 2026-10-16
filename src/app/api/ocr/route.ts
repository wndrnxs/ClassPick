import { requireApiUser } from "@/server/auth/dal";
import { handle, HttpError } from "@/server/http";
import { readUploadedFile } from "@/server/ingest/extract";
import { createOcrMaterial } from "@/server/services/materials";

/** 스마트 OCR: 파일 1개 → 편집 가능한 텍스트 문서(자료함 저장, 연필 1자루) */
export const POST = handle(async (request: Request) => {
  const user = await requireApiUser();
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "업로드할 파일을 선택해 주세요.");
  const material = await createOcrMaterial(user.id, await readUploadedFile(file));
  return Response.json({ material }, { status: 201 });
});
