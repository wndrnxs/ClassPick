import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import {
  cleanPastedRuns,
  clearMarks,
  hasHanyangPua,
  hasOldHangul,
  marksIn,
  normalizeRich,
  parseRich,
  richLines,
  runsToMarkup,
  spliceRich,
  stripRich,
  toggleMark,
} from "@/lib/rich-text";
import { CreateMaterialInput } from "@/lib/schemas";
import { SAMPLES } from "@/lib/samples";
import { buildDocx } from "@/server/export/docx";
import { materialToDocModel } from "@/server/export/from-material";
import { buildHwpx } from "@/server/export/hwpx";
import { sampleToDTO } from "./helpers";

describe("passage markup", () => {
  it("parses only <b>, <u> and <box>, leaving <보기>-style text alone", () => {
    expect(parseRich("가 <b>나<u>다</u></b> <보기> <box>라</box>")).toEqual([
      { text: "가 " },
      { text: "나", b: true },
      { text: "다", b: true, u: true },
      { text: " <보기> " },
      { text: "라", box: true },
    ]);
    expect(stripRich("<b>굵게</b> <보기> <u>밑줄</u>")).toBe("굵게 <보기> 밑줄");
  });

  it("serializes with a fixed tag order and merges neighbours", () => {
    expect(runsToMarkup([{ text: "가", u: true, b: true }, { text: "나", b: true, u: true }, { text: "다", box: true, b: true }])).toBe(
      "<b><u>가나</u></b><box><b>다</b></box>",
    );
    // 짝이 맞지 않는 표기도 정돈
    expect(normalizeRich("</b>가<b>나")).toBe("가<b>나</b>");
    expect(normalizeRich("<b>가</b><b>나</b>")).toBe("<b>가나</b>");
  });

  it("splits lines for exports, keeping blank lines", () => {
    expect(richLines("<b>첫 줄\n둘째</b> 줄\n\n<u>넷째</u>")).toEqual([
      [{ text: "첫 줄", b: true }],
      [{ text: "둘째", b: true }, { text: " 줄" }],
      [],
      [{ text: "넷째", u: true }],
    ]);
  });

  it("toggles, clears and reads marks over a character range", () => {
    const text = "나 보기가 역겨워";
    const bold = toggleMark(text, 2, 5, "b");
    expect(bold).toBe("나 <b>보기가</b> 역겨워");
    expect(marksIn(bold, 2, 5)).toEqual({ b: true, u: false, box: false });
    expect(marksIn(bold, 0, 5).b).toBe(false);
    // 일부만 굵으면 전체를 굵게, 전체가 굵으면 해제
    expect(toggleMark(bold, 0, 5, "b")).toBe("<b>나 보기가</b> 역겨워");
    expect(toggleMark(bold, 2, 5, "b")).toBe(text);
    const boxed = toggleMark(bold, 6, 9, "box");
    expect(boxed).toBe("나 <b>보기가</b> <box>역겨워</box>");
    expect(clearMarks(boxed, 0, 9)).toBe(text);
    // 줄바꿈은 서식을 받지 않음
    expect(toggleMark("가\n나", 0, 3, "u")).toBe("<u>가</u>\n<u>나</u>");
  });

  it("splices pasted runs into an existing passage", () => {
    expect(spliceRich("<b>가나</b>다", 1, 2, [{ text: "X", u: true }])).toBe("<b>가</b><u>X</u>다");
  });

  it("cleans whitespace from pasted HTML while keeping indentation", () => {
    const runs = cleanPastedRuns([
      { text: "\n  첫  줄 " },
      { text: "굵게", b: true },
      { text: "  \n  들여쓴 줄 \n \n끝\n\n" },
    ]);
    expect(runsToMarkup(runs)).toBe("첫 줄 <b>굵게</b>\n  들여쓴 줄\n\n끝");
  });

  it("detects old Hangul and Hancom PUA characters", () => {
    expect(hasOldHangul("나랏말ᄊᆞ미")).toBe(true);
    expect(hasOldHangul("나랏말싸미")).toBe(false);
    expect(hasHanyangPua("")).toBe(true);
    expect(hasHanyangPua("ᄒᆞᆫ")).toBe(false);
  });

  it("validates passage length without counting markup", () => {
    const base = { types: ["mcq"] };
    expect(CreateMaterialInput.safeParse({ ...base, passage: "<b>짧은 글</b>" + "<u></u>".repeat(5) }).success).toBe(false);
    const ok = CreateMaterialInput.parse({ ...base, passage: "  <b>나 보기가</b> 역겨워 가실 때에는 말없이 고이 보내 드리우리다</b>  " });
    expect(ok.passage).toBe("<b>나 보기가</b> 역겨워 가실 때에는 말없이 고이 보내 드리우리다");
    const long = "가".repeat(20000);
    expect(CreateMaterialInput.safeParse({ ...base, passage: `<b>${long}</b>` }).success).toBe(true);
    expect(CreateMaterialInput.safeParse({ ...base, passage: `${long}나` }).success).toBe(false);
  });
});

describe("formatted passages in exports", () => {
  const material = {
    ...sampleToDTO(SAMPLES[0]),
    sourceText: "나 <b>보기가</b> <u>역겨워</u>\n가실 <box>때에는</box>\n\n<b><u><box>말없이</box></u></b> 나랏말ᄊᆞ미",
  };

  it("writes bold, underline and character-border styles to HWPX", async () => {
    const zip = await JSZip.loadAsync(await buildHwpx(materialToDocModel(material, "student")));
    const header = await zip.file("Contents/header.xml")!.async("string");
    const section = await zip.file("Contents/section0.xml")!.async("string");
    // 굵게+밑줄+박스(12+7-1=18) 글자 모양: 굵게, 밑줄, 글자 테두리
    const charPr = header.match(/<hh:charPr id="18"[^]*?<\/hh:charPr>/)?.[0] ?? "";
    expect(charPr).toContain("<hh:bold/>");
    expect(charPr).toContain('<hh:underline type="BOTTOM"');
    expect(charPr).toContain('borderFillIDRef="6"');
    expect(header).toMatch(/<hh:borderFill id="6"[^>]*>.*?<hh:leftBorder type="SOLID"/);
    expect(section).toContain('<hp:run charPrIDRef="1"><hp:t>보기가</hp:t></hp:run>');
    expect(section).toContain('<hp:run charPrIDRef="13"><hp:t>역겨워</hp:t></hp:run>');
    expect(section).toContain('<hp:run charPrIDRef="15"><hp:t>때에는</hp:t></hp:run>');
    expect(section).toContain('<hp:run charPrIDRef="18"><hp:t>말없이</hp:t></hp:run>');
    expect(section).toContain("나랏말ᄊᆞ미");
    expect(section).not.toContain("&lt;b&gt;");
  });

  it("writes underline and run borders to DOCX", async () => {
    const zip = await JSZip.loadAsync(await buildDocx(materialToDocModel(material, "student")));
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toMatch(/<w:u w:val="single"\/>.*?<w:t[^>]*>역겨워</);
    expect(xml).toMatch(/<w:bdr [^>]*w:val="single"[^>]*\/>.*?<w:t[^>]*>때에는</);
    expect(xml).toContain("함초롬바탕");
    expect(xml).not.toContain("&lt;box&gt;");
  });
});

describe("passage box layout (수능 형식)", () => {
  it("indents prose paragraphs and drops blank lines between them", async () => {
    const { passageKind, passageLayout } = await import("@/lib/passage-layout");
    const prose = "새침하게 흐린 품이 눈이 올 듯하더니 눈은 아니 오고 얼다가 만 비가 추적추적 내리는 날이었다.\n\n  이날이야말로 <b>운수 좋은 날</b>이었다. 문안에 들어간답시는 앞집 마나님을 전찻길까지 모셔다 드린 것을 비롯으로";
    expect(passageKind(prose)).toBe("prose");
    expect(passageKind("나 보기가 역겨워\n가실 때에는", "현대시 · 자유시")).toBe("verse");
    expect(passageKind("짧은 줄\n짧은 줄", "현대소설")).toBe("prose");
    const lines = passageLayout(prose, "prose");
    expect(lines).toHaveLength(2);
    expect(lines.every((l) => "runs" in l && l.indent)).toBe(true);
    expect(lines[1]).toMatchObject({ runs: [{ text: "이날이야말로 " }, { text: "운수 좋은 날", b: true }, expect.anything()] });
  });

  it("keeps verse lines and one gap between stanzas", async () => {
    const { passageLayout } = await import("@/lib/passage-layout");
    const lines = passageLayout("\n나 보기가 역겨워\n가실 때에는\n\n\n영변에 약산\n", "verse");
    expect(lines.map((l) => ("gap" in l ? "|" : l.runs.map((r) => r.text).join("")))).toEqual(["나 보기가 역겨워", "가실 때에는", "|", "영변에 약산"]);
  });

  it("puts the passage and questions before the teaching notes in exports", () => {
    const doc = materialToDocModel(sampleToDTO(SAMPLES[0]), "student");
    const texts = doc.blocks.map((b) => (b.type === "paragraph" ? b.runs.map((r) => r.text).join("") : b.type === "heading" ? `#${b.text}` : b.type));
    const iInstruction = texts.findIndex((t) => /^\[1～\d\] 다음 글을 읽고 물음에 답하시오\.$/.test(t));
    const iBox = texts.indexOf("box");
    const iFirstQ = texts.findIndex((t) => /^1\. /.test(t));
    const iNotes = texts.findIndex((t) => t.startsWith("#Ⅰ."));
    expect(iInstruction).toBeGreaterThan(-1);
    expect(iInstruction).toBeLessThan(iBox);
    expect(iBox).toBeLessThan(iFirstQ);
    expect(iFirstQ).toBeLessThan(iNotes);
  });
});
