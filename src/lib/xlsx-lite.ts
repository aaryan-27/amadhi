/**
 * Dependency-free .xlsx reader (temporary import tooling).
 * An .xlsx is a ZIP of XML; we parse the central directory, inflate entries
 * with Node's zlib, then pull rows out of the first worksheet + shared strings.
 * Handles: shared strings, inline strings, numbers, booleans. Good enough for
 * a data-import spreadsheet; not a general SheetJS replacement.
 */
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

interface ZipEntry {
  name: string;
  method: number;
  compSize: number;
  uncompSize: number;
  localOffset: number;
}

function parseZip(buf: Buffer): Map<string, Buffer> {
  // find End Of Central Directory (0x06054b50), scanning backwards
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a zip (no EOCD)");
  const cdCount = buf.readUInt16LE(eocd + 10);
  let cdOffset = buf.readUInt32LE(eocd + 16);

  const entries: ZipEntry[] = [];
  for (let n = 0; n < cdCount; n++) {
    if (buf.readUInt32LE(cdOffset) !== 0x02014b50) break;
    const method = buf.readUInt16LE(cdOffset + 10);
    const compSize = buf.readUInt32LE(cdOffset + 20);
    const uncompSize = buf.readUInt32LE(cdOffset + 24);
    const nameLen = buf.readUInt16LE(cdOffset + 28);
    const extraLen = buf.readUInt16LE(cdOffset + 30);
    const commentLen = buf.readUInt16LE(cdOffset + 32);
    const localOffset = buf.readUInt32LE(cdOffset + 42);
    const name = buf.toString("utf8", cdOffset + 46, cdOffset + 46 + nameLen);
    entries.push({ name, method, compSize, uncompSize, localOffset });
    cdOffset += 46 + nameLen + extraLen + commentLen;
  }

  const files = new Map<string, Buffer>();
  for (const e of entries) {
    // local header: 30 bytes + name + extra
    const lhNameLen = buf.readUInt16LE(e.localOffset + 26);
    const lhExtraLen = buf.readUInt16LE(e.localOffset + 28);
    const dataStart = e.localOffset + 30 + lhNameLen + lhExtraLen;
    const raw = buf.subarray(dataStart, dataStart + e.compSize);
    const out = e.method === 0 ? Buffer.from(raw) : inflateRawSync(raw);
    files.set(e.name, out);
  }
  return files;
}

const colToNum = (col: string): number => {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&");
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const siRegex = /<si>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRegex.exec(xml))) {
    const inner = m[1];
    const texts = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]);
    out.push(decodeXmlEntities(texts.join("")));
  }
  return out;
}

export interface SheetData {
  name: string;
  rows: string[][]; // rows of cell values, indexed by column
}

export function readXlsx(path: string): { sheets: SheetData[] } {
  const buf = readFileSync(path);
  const files = parseZip(buf);

  const get = (name: string) => {
    const f = files.get(name);
    return f ? f.toString("utf8") : "";
  };

  const shared = parseSharedStrings(get("xl/sharedStrings.xml"));

  // sheet name → target file, via workbook.xml + workbook.xml.rels
  const workbook = get("xl/workbook.xml");
  const rels = get("xl/_rels/workbook.xml.rels");
  const relMap = new Map<string, string>();
  for (const r of rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?>/g)) {
    relMap.set(r[1], r[2].replace(/^\/?xl\//, "").replace(/^\//, ""));
  }
  const sheetDefs: { name: string; file: string }[] = [];
  for (const s of workbook.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/?>/g)) {
    const target = relMap.get(s[2]);
    if (target) sheetDefs.push({ name: decodeXmlEntities(s[1]), file: `xl/${target.replace(/^xl\//, "")}` });
  }
  // fallback: any worksheet files
  if (!sheetDefs.length) {
    for (const key of files.keys()) {
      if (/^xl\/worksheets\/sheet\d+\.xml$/.test(key)) sheetDefs.push({ name: key, file: key });
    }
  }

  const sheets: SheetData[] = [];
  for (const def of sheetDefs) {
    const xml = get(def.file);
    if (!xml) continue;
    const rows: string[][] = [];
    for (const rowM of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = [];
      for (const cM of rowM[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g)) {
        const attrs = cM[1] ?? cM[3] ?? "";
        const body = cM[2] ?? "";
        const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1];
        const type = /t="([^"]+)"/.exec(attrs)?.[1];
        const colIdx = ref ? colToNum(ref) : cells.length;
        let value = "";
        if (type === "s") {
          const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
          value = v != null ? shared[parseInt(v, 10)] ?? "" : "";
        } else if (type === "inlineStr") {
          value = decodeXmlEntities([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""));
        } else {
          const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
          value = v != null ? decodeXmlEntities(v) : "";
        }
        cells[colIdx] = value;
      }
      for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = "";
      rows.push(cells);
    }
    sheets.push({ name: def.name, rows });
  }
  return { sheets };
}
