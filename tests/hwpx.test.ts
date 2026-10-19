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

describe("two-column (exam paper) layout", () => {
  const material = sampleToDTO(SAMPLES[0]);

  it("puts the title in one column and the body in two columns with a rule in HWPX", async () => {
    const zip = await JSZip.loadAsync(await buildHwpx(materialToDocModel(material, "student")));
    const section = await zip.file("Contents/section0.xml")!.async("string");
    expect(section).toContain('colCount="1"');
    expect(section).toMatch(/<hp:colPr [^>]*colCount="2"[^>]*sameGap="2268"><hp:colLine type="SOLID"/);
    // 수능 문제지처럼 좁은 여백, 표는 단 폭에 맞춤
    expect(section).toContain('left="4252" right="4252"');
    const widths = [...section.matchAll(/<hp:sz width="(\d+)"/g)].map((m) => Number(m[1]));
    expect(widths.length).toBeGreaterThan(0);
    expect(Math.max(...widths)).toBeLessThanOrEqual(24378);
    // 1단으로 받으면 예전 형식
    const one = await JSZip.loadAsync(await buildHwpx(materialToDocModel(material, "student", undefined, 1)));
    const oneSection = await one.file("Contents/section0.xml")!.async("string");
    expect(oneSection).not.toContain('colCount="2"');
    expect(oneSection).toContain('left="8504" right="8504"');
  });

  it("starts a continuous two-column section in DOCX", async () => {
    const zip = await JSZip.loadAsync(await buildDocx(materialToDocModel(material, "teacher")));
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toMatch(/<w:cols [^>]*w:num="2"[^>]*\/?>/);
    expect(xml).toMatch(/w:sep="(1|true)"/);
    expect(xml).toMatch(/<w:type w:val="continuous"\/>/);
  });

  it("uses compact lists instead of wide tables in two columns", () => {
    const two = materialToDocModel(material, "teacher");
    const one = materialToDocModel(material, "teacher", undefined, 1);
    const tables = (d: typeof two) => d.blocks.filter((b) => b.type === "table").length;
    expect(tables(two)).toBeLessThan(tables(one));
    // 분석 보고서·제본 정답표처럼 1단으로 돌아가는 구간도 표현 가능
    expect(two.blocks.filter((b) => b.type === "columns")).toEqual([{ type: "columns", count: 2 }]);
  });
});
