/** 한글 텍스트 처리 유틸리티 (클라이언트·서버 공용, 의존성 없음) */

const CHOSEONG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

/** '진달래꽃' → 'ㅈㄷㄹㄲ'. 한글 음절이 아닌 문자는 그대로 둡니다. */
export function toChoseong(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= HANGUL_START && code <= HANGUL_END) {
      out += CHOSEONG[Math.floor((code - HANGUL_START) / 588)];
    } else {
      out += ch;
    }
  }
  return out;
}

/** 줄바꿈을 정규화하고 앞뒤 공백을 정리합니다. */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 빈 줄을 기준으로 연/문단을 나눕니다. */
export function splitBlocks(text: string): string[] {
  return normalizeText(text)
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
}

/** 문장 단위 분리 (마침표·물음표·느낌표·말줄임 기준, 따옴표 보존) */
export function splitSentences(text: string): string[] {
  const flat = normalizeText(text).replace(/\n+/g, " ");
  const parts = flat.match(/[^.!?。…]+(?:[.!?。…]+["'”’」』)]*|$)/g) ?? [];
  return parts.map((s) => s.trim()).filter((s) => s.length > 1);
}

/** 시(운문)인지 추정: 짧은 행이 많고 연 구분이 있으면 운문으로 봅니다. */
export function looksLikePoem(text: string): boolean {
  const lines = normalizeText(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 3) return false;
  const avg = lines.reduce((s, l) => s + l.length, 0) / lines.length;
  const sentenceEnds = lines.filter((l) => /[.?!]["'”’]?$/.test(l)).length;
  return avg < 26 && sentenceEnds / lines.length < 0.6;
}

const PARTICLES = [
  "에게서", "으로서", "으로써", "에서는", "이라는", "에게는", "까지는", "부터는", "이었다", "하였다",
  "에서", "에게", "으로", "까지", "부터", "처럼", "보다", "라는", "이라", "와는", "과는", "이다", "였다",
  "은", "는", "이", "가", "을", "를", "에", "의", "도", "로", "와", "과", "만", "고", "며",
];

const STOPWORDS = new Set([
  "그리고", "그러나", "하지만", "그런데", "또한", "때문", "것이", "것은", "것을", "있는", "있다", "없는", "없다",
  "하는", "한다", "했다", "되는", "된다", "그는", "그의", "이런", "저런", "어떤", "우리", "이것", "그것",
  "모든", "아니", "같은", "위해", "통해", "대한", "대해", "다른", "많은", "가장", "더욱", "있었다",
]);

/** 조사를 떼어 내 단순 어근을 추출합니다(형태소 분석기 없이 쓰는 휴리스틱). */
export function stripParticle(word: string): string {
  const w = word.replace(/[^가-힣a-zA-Z0-9]/g, "");
  for (const p of PARTICLES) {
    if (w.length > p.length + 1 && w.endsWith(p)) return w.slice(0, -p.length);
  }
  return w;
}

/** 빈도 기반 핵심어 후보 (2자 이상 한글 어절) */
export function extractKeywords(text: string, limit = 8): string[] {
  const counts = new Map<string, { n: number; first: number }>();
  const words = normalizeText(text).split(/\s+/);
  words.forEach((raw, i) => {
    const w = stripParticle(raw);
    if (w.length < 2 || !/^[가-힣]+$/.test(w) || STOPWORDS.has(w)) return;
    const prev = counts.get(w);
    counts.set(w, { n: (prev?.n ?? 0) + 1, first: prev?.first ?? i });
  });
  return [...counts.entries()]
    .sort((a, b) => b[1].n - a[1].n || b[0].length - a[0].length || a[1].first - b[1].first)
    .slice(0, limit)
    .map(([w]) => w);
}

/** 정규화한 텍스트의 간단한 지문 해시 (샘플 지문 식별용) */
export function textFingerprint(text: string): string {
  const compact = text.replace(/[\s\p{P}]/gu, "");
  let h = 2166136261;
  for (let i = 0; i < compact.length; i++) {
    h ^= compact.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** 마지막 글자에 받침이 있는지 (한글이 아니면 false) */
export function hasBatchim(word: string): boolean {
  const last = word.trim().at(-1);
  if (!last) return false;
  const code = last.codePointAt(0)!;
  if (code < HANGUL_START || code > HANGUL_END) return false;
  return (code - HANGUL_START) % 28 !== 0;
}

/** 받침에 맞는 조사를 붙입니다. josa('진달래꽃', '은/는') → '진달래꽃은' */
export function josa(word: string, pair: "은/는" | "이/가" | "을/를" | "과/와" | "이다/다" | "으로/로"): string {
  const [withBatchim, without] = pair.split("/");
  if (pair === "으로/로") {
    const last = word.trim().at(-1);
    const rieul = last ? (last.codePointAt(0)! - HANGUL_START) % 28 === 8 : false;
    return word + (hasBatchim(word) && !rieul ? withBatchim : without);
  }
  return word + (hasBatchim(word) ? withBatchim : without);
}
