/**
 * HWPX(한글 문서, OWPML/KS X 6101) 패키지 생성기
 *
 * 구조
 *   mimetype                 (무압축, 첫 항목)
 *   version.xml / settings.xml
 *   META-INF/container.xml · container.rdf · manifest.xml
 *   Contents/content.hpf · header.xml · section0.xml
 *   Preview/PrvText.txt
 */
import JSZip from "jszip";

import type { Block, DocModel } from "../doc-model";
import { buildHeaderXml } from "./header";
import { buildSectionXml } from "./section";
import { esc, OWPML_NS, XML_DECL } from "./xml";

const VERSION_XML = `${XML_DECL}<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0" os="1" xmlVersion="1.5" application="Hancom Office Hangul" appVersion="13, 0, 0, 1408 WIN32LEWindows_10"/>`;

const SETTINGS_XML = `${XML_DECL}<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"><ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/></ha:HWPApplicationSetting>`;

const CONTAINER_XML = `${XML_DECL}<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"><ocf:rootfiles><ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/><ocf:rootfile full-path="Preview/PrvText.txt" media-type="text/plain"/><ocf:rootfile full-path="META-INF/container.rdf" media-type="application/rdf+xml"/></ocf:rootfiles></ocf:container>`;

const CONTAINER_RDF = `${XML_DECL}<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about=""><ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/header.xml"/></rdf:Description><rdf:Description rdf:about="Contents/header.xml"><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#HeaderFile"/></rdf:Description><rdf:Description rdf:about=""><ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/section0.xml"/></rdf:Description><rdf:Description rdf:about="Contents/section0.xml"><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#SectionFile"/></rdf:Description><rdf:Description rdf:about=""><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#Document"/></rdf:Description></rdf:RDF>`;

const MANIFEST_XML = `${XML_DECL}<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>`;

function contentHpf(title: string, now: Date) {
  const iso = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  return (
    `${XML_DECL}<opf:package ${OWPML_NS} version="" unique-identifier="" id="">` +
    `<opf:metadata><opf:title>${esc(title)}</opf:title><opf:language>ko</opf:language>` +
    `<opf:meta name="creator" content="text">ClassPick</opf:meta><opf:meta name="subject" content="text">국어 수업 자료</opf:meta>` +
    `<opf:meta name="description" content="text">클래스픽(ClassPick)에서 생성한 수업 자료</opf:meta>` +
    `<opf:meta name="lastsaveby" content="text">ClassPick</opf:meta>` +
    `<opf:meta name="CreatedDate" content="text">${iso}</opf:meta><opf:meta name="ModifiedDate" content="text">${iso}</opf:meta>` +
    `<opf:meta name="keyword" content="text">클래스픽</opf:meta></opf:metadata>` +
    `<opf:manifest><opf:item id="header" href="Contents/header.xml" media-type="application/xml"/><opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/><opf:item id="settings" href="settings.xml" media-type="application/xml"/></opf:manifest>` +
    `<opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine></opf:package>`
  );
}

function previewText(blocks: Block[]) {
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.type === "title" || b.type === "meta" || b.type === "heading") lines.push(b.text);
    else if (b.type === "paragraph") lines.push(b.runs.map((r) => r.text).join(""));
    else if (b.type === "box") lines.push(...(b.title ? [b.title] : []), ...b.lines);
    if (lines.join("\n").length > 1000) break;
  }
  return lines.join("\r\n").slice(0, 1000);
}

export async function buildHwpx(doc: DocModel, now = new Date()): Promise<Uint8Array> {
  const zip = new JSZip();
  // mimetype은 반드시 첫 항목이며 압축하지 않습니다.
  zip.file("mimetype", "application/hwp+zip", { compression: "STORE" });
  zip.file("version.xml", VERSION_XML);
  zip.file("Contents/header.xml", buildHeaderXml());
  zip.file("Contents/section0.xml", buildSectionXml(doc));
  zip.file("Preview/PrvText.txt", previewText(doc.blocks));
  zip.file("settings.xml", SETTINGS_XML);
  zip.file("META-INF/container.rdf", CONTAINER_RDF);
  zip.file("Contents/content.hpf", contentHpf(doc.title, now));
  zip.file("META-INF/container.xml", CONTAINER_XML);
  zip.file("META-INF/manifest.xml", MANIFEST_XML);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
