import { describe, expect, it } from "vitest";

import { extractKeywords, josa, looksLikePoem, splitBlocks, textFingerprint, toChoseong } from "@/lib/hangul";
import { SAMPLES } from "@/lib/samples";

describe("hangul utils", () => {
  it("extracts choseong", () => {
    expect(toChoseong("진달래꽃")).toBe("ㅈㄷㄹㄲ");
    expect(toChoseong("즈려밟다")).toBe("ㅈㄹㅂㄷ");
    expect(toChoseong("A 가")).toBe("A ㄱ");
  });

  it("attaches the right particle", () => {
    expect(josa("진달래꽃", "은/는")).toBe("진달래꽃은");
    expect(josa("나무", "은/는")).toBe("나무는");
    expect(josa("반어법", "이/가")).toBe("반어법이");
    expect(josa("연", "으로/로")).toBe("연으로");
    expect(josa("문단", "으로/로")).toBe("문단으로");
    expect(josa("길", "으로/로")).toBe("길로");
  });

  it("splits stanzas and detects poems", () => {
    const azalea = SAMPLES.find((s) => s.slug === "azalea")!;
    const language = SAMPLES.find((s) => s.slug === "language")!;
    expect(splitBlocks(azalea.passage)).toHaveLength(4);
    expect(looksLikePoem(azalea.passage)).toBe(true);
    expect(looksLikePoem(language.passage)).toBe(false);
  });

  it("finds frequent keywords", () => {
    const language = SAMPLES.find((s) => s.slug === "language")!;
    expect(extractKeywords(language.passage, 10)).toContain("언어");
  });

  it("fingerprints ignore whitespace and punctuation", () => {
    expect(textFingerprint("나 보기가 역겨워\n가실 때에는")).toBe(textFingerprint("나 보기가  역겨워 가실 때에는."));
  });
});
