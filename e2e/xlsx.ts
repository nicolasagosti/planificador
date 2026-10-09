import { crc32 } from "node:zlib";

/** A cell: text, or a day ("2026-12-01") saved as an Excel date. */
export type XlsxCell = string | { day: string };

const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const RELATIONSHIPS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_RELATIONSHIPS =
  "http://schemas.openxmlformats.org/package/2006/relationships";
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/**
 * A workbook with one sheet, as small as Excel can read: the import tests
 * build their files here instead of keeping binary fixtures.
 */
export function buildXlsx(sheetName: string, rows: XlsxCell[][]): Buffer {
  const sheetRows = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((cell, columnIndex) =>
            cellXml(cell, `${columnName(columnIndex)}${rowIndex + 1}`),
          )
          .join("")}</row>`,
    )
    .join("");
  return zip({
    "[Content_Types].xml": `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `${XML}<Relationships xmlns="${PACKAGE_RELATIONSHIPS}"><Relationship Id="rId1" Type="${RELATIONSHIPS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `${XML}<workbook xmlns="${MAIN}" xmlns:r="${RELATIONSHIPS}"><sheets><sheet name="${escape(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `${XML}<Relationships xmlns="${PACKAGE_RELATIONSHIPS}"><Relationship Id="rId1" Type="${RELATIONSHIPS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${RELATIONSHIPS}/styles" Target="styles.xml"/></Relationships>`,
    // Style 1 is Excel's built-in short date format (14).
    "xl/styles.xml": `${XML}<styleSheet xmlns="${MAIN}"><fonts count="1"><font/></fonts><fills count="1"><fill/></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/></cellXfs></styleSheet>`,
    "xl/worksheets/sheet1.xml": `${XML}<worksheet xmlns="${MAIN}"><sheetData>${sheetRows}</sheetData></worksheet>`,
  });
}

function cellXml(cell: XlsxCell, reference: string): string {
  if (typeof cell === "string") {
    return `<c r="${reference}" t="inlineStr"><is><t>${escape(cell)}</t></is></c>`;
  }
  // Days since 30 December 1899, Excel's day zero.
  const serial =
    (Date.parse(`${cell.day}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86_400_000;
  return `<c r="${reference}" s="1"><v>${serial}</v></c>`;
}

function columnName(index: number): string {
  return String.fromCharCode(65 + index);
}

function escape(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** A zip archive with the files stored as they are, without compression. */
function zip(files: Record<string, string>): Buffer {
  const entries: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, "utf8");
    const data = Buffer.from(text, "utf8");
    const checksum = crc32(data);

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4); // version needed
    header.writeUInt16LE(0x0800, 6); // UTF-8 names
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(nameBytes.length, 26);
    entries.push(header, nameBytes, data);

    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4); // version made by
    record.writeUInt16LE(20, 6); // version needed
    record.writeUInt16LE(0x0800, 8);
    record.writeUInt32LE(checksum, 16);
    record.writeUInt32LE(data.length, 20);
    record.writeUInt32LE(data.length, 24);
    record.writeUInt16LE(nameBytes.length, 28);
    record.writeUInt32LE(offset, 42);
    directory.push(record, nameBytes);

    offset += header.length + nameBytes.length + data.length;
  }
  const directorySize = directory.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(directorySize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...entries, ...directory, end]);
}
