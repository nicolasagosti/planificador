// Reading a calendar file in the browser (docs/DECISIONES.md, "Importar
// calendarios"): an Excel workbook gives a table per sheet and an HTML page a
// table per <table>. The server never opens the file: it only receives the
// pieces read from these tables, and validates them again.
import readXlsxFile, { InvalidInputError } from "read-excel-file/universal";
import type { ImportTable } from "@/domain/calendar-import";

/** A file that cannot be read, with the message to show. */
export class CalendarFileError extends Error {}

export const CALENDAR_FILE_ACCEPT =
  ".xlsx,.html,.htm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/html";

// A calendar is a few hundred kilobytes, even with pictures pasted in.
const MAX_BYTES = 20 * 1024 * 1024;

const OLD_EXCEL =
  "Es un Excel viejo (.xls). Abrilo y guardalo como libro de Excel (.xlsx) para importarlo.";

export async function readCalendarFile(file: File): Promise<ImportTable[]> {
  const name = file.name.toLowerCase();
  if (file.size > MAX_BYTES) {
    throw new CalendarFileError(
      "El archivo pesa más de 20 MB: no parece un calendario.",
    );
  }
  if (name.endsWith(".xlsx")) return readWorkbook(file);
  if (name.endsWith(".html") || name.endsWith(".htm")) {
    return readPage(await file.text());
  }
  if (name.endsWith(".xls")) throw new CalendarFileError(OLD_EXCEL);
  throw new CalendarFileError(
    "Elegí un Excel (.xlsx) o una página web (.html).",
  );
}

// ---------------------------------------------------------------------------
// Excel

async function readWorkbook(file: File): Promise<ImportTable[]> {
  try {
    // The universal build reads in this thread: the browser build starts
    // workers, which the app's Content Security Policy does not allow.
    const sheets = await readXlsxFile(file);
    return sheets.map((sheet) => sheet.data.map((row) => row.map(sheetCell)));
  } catch (error) {
    if (
      error instanceof InvalidInputError &&
      error.code === "XLS_FILE_NOT_SUPPORTED"
    ) {
      throw new CalendarFileError(OLD_EXCEL);
    }
    throw new CalendarFileError(
      "No pudimos leer el Excel. Abrilo, guardalo de nuevo como .xlsx y probá otra vez.",
    );
  }
}

function sheetCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  // Excel dates have no time zone: the library builds them in UTC, so the
  // UTC day is the day written in the sheet.
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ""
      : value.toISOString().slice(0, 10);
  }
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

// ---------------------------------------------------------------------------
// HTML

async function readPage(html: string): Promise<ImportTable[]> {
  const rendered = (await renderPage(html)) ?? html;
  const page = new DOMParser().parseFromString(rendered, "text/html");
  return Array.from(page.querySelectorAll("table"), tableRows);
}

// Whatever could load something from elsewhere or navigate the frame.
const DROPPED =
  "script[src], link, style, base, meta[http-equiv], iframe, frame, object, embed, img, picture, video, audio, source, track";
const RENDERED = "planificador:rendered";
const RENDER_TIMEOUT_MS = 5000;

/**
 * Calendar pages often build their tables with a script when they open, so
 * the page runs first in a hidden, sandboxed frame: without the app's origin
 * it cannot reach its pages, cookies or storage, and it keeps the app's
 * Content Security Policy, so it cannot load anything from other sites. Its
 * inline scripts get this page's nonce, the only way that policy lets them
 * run. Once loaded, the frame sends back its HTML. Null if it does not
 * answer in time: then the page is read as it came.
 */
function renderPage(html: string): Promise<string | null> {
  const nonce =
    document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce;
  if (!nonce) return Promise.resolve(null);

  const page = new DOMParser().parseFromString(html, "text/html");
  page.querySelectorAll(DROPPED).forEach((element) => element.remove());
  // The policy blocks inline styles and handlers anyway. Parsing the file
  // already logs one harmless policy error per inline style; without them,
  // the frame logs none.
  page.querySelectorAll("*").forEach((element) => {
    for (const { name } of Array.from(element.attributes)) {
      if (name === "style" || name.startsWith("on")) {
        element.removeAttribute(name);
      }
    }
  });
  page.querySelectorAll("script").forEach((script) => {
    script.setAttribute("nonce", nonce);
  });
  const reporter = page.createElement("script");
  reporter.setAttribute("nonce", nonce);
  reporter.textContent = `addEventListener("load", function () {
  setTimeout(function () {
    parent.postMessage({ type: ${JSON.stringify(RENDERED)}, html: document.documentElement.outerHTML }, "*");
  }, 50);
});`;
  page.body.append(reporter);

  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts");
  frame.hidden = true;
  frame.srcdoc = `<!doctype html>${page.documentElement.outerHTML}`;

  return new Promise((resolve) => {
    const finish = (rendered: string | null) => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      frame.remove();
      resolve(rendered);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return;
      const data: unknown = event.data;
      if (
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        data.type === RENDERED &&
        "html" in data &&
        typeof data.html === "string"
      ) {
        finish(data.html);
      }
    };
    const timer = setTimeout(() => finish(null), RENDER_TIMEOUT_MS);
    window.addEventListener("message", onMessage);
    document.body.append(frame);
  });
}

/**
 * The rows of a table as text, one entry per column: a cell that spans
 * several rows repeats in each (a date for two pieces), and one that spans
 * several columns leaves the others empty.
 */
function tableRows(table: HTMLTableElement): string[][] {
  const rows: string[][] = [];
  // Cells that still span down, by column.
  const spans = new Map<number, { text: string; rows: number }>();
  for (const row of Array.from(table.rows)) {
    const cells: string[] = [];
    let column = 0;
    const fillSpans = () => {
      let span = spans.get(column);
      while (span) {
        cells[column] = span.text;
        if (span.rows > 1) spans.set(column, { ...span, rows: span.rows - 1 });
        else spans.delete(column);
        column += 1;
        span = spans.get(column);
      }
    };
    for (const cell of Array.from(row.cells)) {
      fillSpans();
      const text = cellText(cell);
      const width = Math.min(Math.max(cell.colSpan, 1), 50);
      for (let offset = 0; offset < width; offset += 1) {
        const value = offset === 0 ? text : "";
        cells[column] = value;
        if (cell.rowSpan > 1) {
          spans.set(column, { text: value, rows: cell.rowSpan - 1 });
        }
        column += 1;
      }
    }
    fillSpans();
    rows.push(Array.from(cells, (text) => text ?? ""));
  }
  return rows;
}

const BLOCKS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DD",
  "DIV",
  "DL",
  "DT",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HR",
  "LI",
  "OL",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TR",
  "UL",
]);
const SKIPPED = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT"]);

/**
 * A cell's text as it reads on screen: a <br> or a block starts a new line,
 * so "Placa<br>Este finde" is two lines and not "PlacaEste finde".
 */
function cellText(cell: HTMLTableCellElement): string {
  return textOf(cell)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line !== "")
    .join("\n");
}

function textOf(node: Node): string {
  let text = "";
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent ?? "";
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = (child as Element).tagName;
      if (SKIPPED.has(tag)) continue;
      if (tag === "BR") text += "\n";
      else if (BLOCKS.has(tag)) text += `\n${textOf(child)}\n`;
      else text += textOf(child);
    }
  }
  return text;
}
