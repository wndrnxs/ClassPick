import fs from "node:fs";
import path from "node:path";

import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { SAMPLES } from "@/lib/samples";
import { buildDocx } from "@/server/export/docx";
import { materialToDocModel } from "@/server/export/from-material";
import { buildHwpx } from "@/server/export/hwpx";
import { extractHwpxText } from "@/server/ingest/extract";
import { sampleToDTO } from "./helpers";

const OUT_DIR = process.env.EXPORT_OUT_DIR;

describe("HWPX export", () => {
  for (const sample of SAMPLES) {
    it(`builds a valid package for ${sample.slug}`, async () => {
      const doc = materialToDocModel(sampleToDTO(sample), "teacher");
      const bytes = await buildHwpx(doc, new Date("2026-01-01T00:00:00Z"));
      if (OUT_DIR) fs.writeFileSync(path.join(OUT_DIR, `${sample.slug}.hwpx`), bytes);

      const zip = await JSZip.loadAsync(bytes);
      const names = Object.keys(zip.files);
      // mimetype은 첫 항목, 무압축이어야 합니다.
      expect(names[0]).toBe("mimetype");
      expect(await zip.file("mimetype")!.async("string")).toBe("application/hwp+zip");
      expect(names).toEqual(
        expect.arrayContaining([
          "version.xml",
          "settings.xml",
          "Contents/header.xml",
          "Contents/section0.xml",
          "Contents/content.hpf",
          "META-INF/container.xml",
        ]),
      );
      const section = await zip.file("Contents/section0.xml")!.async("string");
      expect(section).toContain("<hp:secPr");
      expect(section).not.toMatch(/[<>]\s*&(?!amp;|lt;|gt;|quot;|#)/);
    });
  }

  it("round-trips text through the HWPX text extractor", async () => {
    const sample = SAMPLES[0];
    const bytes = await buildHwpx(materialToDocModel(sampleToDTO(sample), "student"));
    const text = await extractHwpxText(bytes);
    expect(text).toContain("나 보기가 역겨워");
    expect(text).toContain("사뿐히 즈려밟고 가시옵소서");
    // 학생용에는 정답 표기가 없어야 합니다.
    expect(text).not.toContain("정답 ②");
  });

  it("escapes XML special characters", async () => {
    const bytes = await buildHwpx({ title: "A & B <보기>", blocks: [{ type: "title", text: "A & B <보기>" }] });
    const zip = await JSZip.loadAsync(bytes);
    const section = await zip.file("Contents/section0.xml")!.async("string");
    expect(section).toContain("A &amp; B &lt;보기&gt;");
  });
});

describe("DOCX export", () => {
  it("builds a docx for every sample", async () => {
    for (const sample of SAMPLES) {
      const bytes = await buildDocx(materialToDocModel(sampleToDTO(sample), "teacher"));
      if (OUT_DIR) fs.writeFileSync(path.join(OUT_DIR, `${sample.slug}.docx`), bytes);
      const zip = await JSZip.loadAsync(bytes);
      const xml = await zip.file("word/document.xml")!.async("string");
      expect(xml).toContain(sample.content.structure!.title.slice(0, 3));
    }
  });
});
