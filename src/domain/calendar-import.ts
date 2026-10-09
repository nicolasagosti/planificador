// Importing a calendar from an Excel or HTML file (docs/DECISIONES.md,
// "Importar calendarios"). The browser turns the file into tables of text;
// this module finds the table of pieces among them and reads each row the
// way a person would. The server validates the pieces again before saving.
import { FORMATS, formatLabel, type Format, type Network } from "./catalog";
import { MONTHS, monthName, monthOf, type MonthKey } from "./dates";
import type { PieceStatus } from "./statuses";
import { counted, joinWithAnd } from "./text";
import { isCalendarDay, type CalendarDay } from "./today";

/** The rows of one table of the file, each row the text of its cells. */
export type ImportTable = readonly (readonly string[])[];

export const IMPORT_LIMITS = { topic: 120, idea: 2000, pieces: 200 } as const;

export type ImportedPiece = {
  date: CalendarDay;
  /** Null when the file does not say it: the preview asks for it. */
  network: Network | null;
  format: Format;
  topic: string;
  idea: string | null;
  status: PieceStatus;
};

/** A row that is a piece of the month but cannot be imported, and why. */
export type ImportProblem = { row: string; message: string };

export type CalendarImport = {
  /** The pieces of the month by day; pieces of a day keep the file's order. */
  pieces: ImportedPiece[];
  /** Rows of other months: they belong to other calendars. */
  otherMonths: { month: MonthKey; count: number }[];
  problems: ImportProblem[];
};

// ---------------------------------------------------------------------------
// Words

/** Lowercase, without accents and with single spaces. */
function simplify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** `simplify`, and punctuation becomes a space: "¿Filmado?" is "filmado". */
function words(text: string): string {
  return simplify(text.replace(/[^\p{L}\p{N}\s]/gu, " "));
}

/** One line: the lines of a cell joined with a space. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Columns

type Role =
  | "date"
  | "network"
  | "format"
  | "topic"
  // Format and topic in one cell: "Placa" and, below, "Este finde".
  | "piece"
  | "idea"
  | "status"
  // Any other column: it is added to the idea under its header.
  | "extra"
  | "ignore";

const HEADERS: Record<string, Role> = {
  fecha: "date",
  dia: "date",
  "fecha de publicacion": "date",
  "dia de publicacion": "date",
  "dia de la semana": "ignore",
  semana: "ignore",
  n: "ignore",
  nro: "ignore",
  numero: "ignore",
  red: "network",
  redes: "network",
  "red social": "network",
  plataforma: "network",
  formato: "format",
  tipo: "format",
  "tipo de contenido": "format",
  "tipo de pieza": "format",
  tema: "topic",
  titulo: "topic",
  concepto: "topic",
  pieza: "piece",
  idea: "idea",
  "idea concreta": "idea",
  copy: "idea",
  descripcion: "idea",
  texto: "idea",
  guion: "idea",
  detalle: "idea",
  estado: "status",
  filmacion: "status",
  filmado: "status",
  subido: "status",
  publicado: "status",
};

// When the whole header is not known, its first word may be: "Fecha de
// posteo", "Tema del post", "Idea / copy".
const FIRST_WORDS: Record<string, Role> = {
  fecha: "date",
  red: "network",
  redes: "network",
  formato: "format",
  tema: "topic",
  titulo: "topic",
  idea: "idea",
  copy: "idea",
  estado: "status",
};

type Column = { index: number; role: Role; header: string };

function roleOf(header: string): Role {
  const key = words(header);
  if (key === "") return "ignore";
  return HEADERS[key] ?? FIRST_WORDS[key.split(" ")[0] ?? ""] ?? "extra";
}

function columnsOf(header: readonly string[]): Column[] {
  const columns = header.map((text, index) => ({
    index,
    role: roleOf(text),
    header: oneLine(text),
  }));
  const has = (role: Role) => columns.some((column) => column.role === role);
  // "Pieza" holds format and topic when there is no topic column, the
  // format when there is a topic but no format, and else it is one more.
  const pieceRole: Role = !has("topic")
    ? "piece"
    : !has("format")
      ? "format"
      : "extra";
  return columns.map((column) =>
    column.role === "piece" ? { ...column, role: pieceRole } : column,
  );
}

/** A header row has a date and a topic (or a piece) column. */
function isHeader(columns: readonly Column[]): boolean {
  const roles = new Set(columns.map((column) => column.role));
  return roles.has("date") && (roles.has("topic") || roles.has("piece"));
}

// The header is near the top: above it there may be a title or a note.
const HEADER_SEARCH_ROWS = 30;

type PieceTable = { columns: Column[]; rows: (readonly string[])[] };

function findPieceTable(table: ImportTable): PieceTable | null {
  const limit = Math.min(table.length, HEADER_SEARCH_ROWS);
  for (let index = 0; index < limit; index += 1) {
    const columns = columnsOf(table[index] ?? []);
    if (isHeader(columns)) {
      return { columns, rows: table.slice(index + 1) };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Values

const MONTH_WORDS: Record<string, number> = {};
MONTHS.forEach((name, index) => {
  const key = simplify(name);
  MONTH_WORDS[key] = index + 1;
  MONTH_WORDS[key.slice(0, 3)] = index + 1;
});
MONTH_WORDS.setiembre = 9;
MONTH_WORDS.sept = 9;
MONTH_WORDS.set = 9;

const WEEKDAY_PATTERN =
  /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo|lun|mar|mie|jue|vie|sab|dom)\b\.?/g;
const MONTH_NAME_PATTERN = new RegExp(
  `\\b(\\d{1,2})\\s*(?:de\\s+)?(${Object.keys(MONTH_WORDS).join("|")})\\b\\.?(?:\\s*(?:de|del)?\\s*(\\d{4}))?`,
);

function dayFrom(
  year: number,
  month: number,
  date: number,
): CalendarDay | null {
  const day = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
  return isCalendarDay(day) ? day : null;
}

/**
 * The day of a date cell: "2026-10-06" (Excel dates arrive like this),
 * "6/10", "06/10/2026", "Mar 6/10", "martes 6 de octubre", "6 oct" or just
 * "6". Without a year, the calendar's. Day and month go in the Argentine
 * order unless only the other order falls in the calendar's month.
 */
export function readDay(text: string, month: MonthKey): CalendarDay | null {
  const value = simplify(text);
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));

  const iso = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(value);
  if (iso) return dayFrom(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const numeric = /\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}|\d{2}))?\b/.exec(
    value,
  );
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const yearText = numeric[3];
    const inYear = yearText
      ? Number(yearText.length === 2 ? `20${yearText}` : yearText)
      : year;
    const options = [
      dayFrom(inYear, second, first),
      dayFrom(inYear, first, second),
    ].filter((day): day is CalendarDay => day !== null);
    return options.find((day) => monthOf(day) === month) ?? options[0] ?? null;
  }

  const named = MONTH_NAME_PATTERN.exec(value);
  if (named) {
    const namedMonth = MONTH_WORDS[named[2] ?? ""] ?? 0;
    return dayFrom(
      named[3] ? Number(named[3]) : year,
      namedMonth,
      Number(named[1]),
    );
  }

  const dayOnly = value.replace(WEEKDAY_PATTERN, " ").replace(/[,.]/g, " ");
  if (/^\s*\d{1,2}\s*$/.test(dayOnly)) {
    return dayFrom(year, monthNumber, Number(dayOnly));
  }
  return null;
}

const NETWORK_WORDS: Record<string, Network> = {
  instagram: "instagram",
  insta: "instagram",
  ig: "instagram",
  facebook: "facebook",
  face: "facebook",
  fb: "facebook",
  tiktok: "tiktok",
  "tik tok": "tiktok",
  tt: "tiktok",
};

type Read<T> = { ok: true; value: T } | { ok: false; message: string };

function readNetwork(text: string): Read<Network | null> {
  const value = simplify(text);
  if (value === "") return { ok: true, value: null };
  // `simplify` leaves single spaces, so " ?" is all the spacing there is.
  const parts = value
    .split(/ ?(?:[,/+&|]|\by\b|\be\b) ?/)
    .filter((part) => part !== "");
  const networks = parts.map((part) => NETWORK_WORDS[part]);
  const known = [...new Set(networks)];
  if (networks.some((network) => network === undefined)) {
    return {
      ok: false,
      message: `«${oneLine(text)}» no es una red de la app: usá Instagram, Facebook o TikTok.`,
    };
  }
  const [network] = known;
  if (known.length > 1 || !network) {
    return {
      ok: false,
      message: `Va en más de una red («${oneLine(text)}») y en la app cada pieza tiene una sola: separala en una fila por red.`,
    };
  }
  return { ok: true, value: network };
}

const FORMAT_WORDS: Record<string, Format> = {
  reel: "reel",
  reels: "reel",
  historia: "story",
  historias: "story",
  story: "story",
  stories: "story",
  carrusel: "carousel",
  carruseles: "carousel",
  carousel: "carousel",
  post: "post",
  posts: "post",
  posteo: "post",
  placa: "graphic",
  placas: "graphic",
};

/** "Reel, Historia, Carrusel, Post o Placa" */
const FORMAT_LIST = `${FORMATS.slice(0, -1).map(formatLabel).join(", ")} o ${formatLabel(FORMATS.at(-1) ?? "")}`;

function readFormat(text: string): Read<Format> {
  const value = words(text);
  const format = FORMAT_WORDS[value];
  if (format) return { ok: true, value: format };
  return {
    ok: false,
    message:
      value === ""
        ? "Falta el formato."
        : `«${oneLine(text)}» no es un formato de la app: usá ${FORMAT_LIST}.`,
  };
}

/**
 * A "Pieza" cell: the format on its first line and the topic below
 * ("Placa" / "Horarios del feriado"), or both on one line ("Reel: Detrás
 * de la barra"). Without a format first, it is all topic.
 */
function splitPiece(text: string): { format: string; topic: string } {
  const lines = text
    .split("\n")
    .map(oneLine)
    .filter((line) => line !== "");
  const [first = "", ...rest] = lines;
  // A short first line is the format even if the app does not know it
  // ("Video"), so the preview can say so.
  if (rest.length > 0 && words(first).split(" ").length <= 2) {
    return { format: first, topic: rest.join(" ") };
  }
  const inline = /^([^:\-–—·|]+)[:\-–—·|](.+)$/.exec(first);
  if (inline && rest.length === 0 && FORMAT_WORDS[words(inline[1] ?? "")]) {
    return {
      format: oneLine(inline[1] ?? ""),
      topic: oneLine(inline[2] ?? ""),
    };
  }
  return { format: "", topic: lines.join(" ") };
}

// The four states of the files (docs/DECISIONES.md): "Falta filmar" and
// "No subido" are pending, "Filmado" is done and "Subido" is delivered. The
// app's own names are understood too.
const STATUS_WORDS: Record<string, PieceStatus> = {
  "falta filmar": "pending",
  "no subido": "pending",
  "no subida": "pending",
  pendiente: "pending",
  filmado: "done",
  filmada: "done",
  hecha: "done",
  hecho: "done",
  subido: "delivered",
  subida: "delivered",
  entregada: "delivered",
  entregado: "delivered",
};

const STATUS_RANK: Record<PieceStatus, number> = {
  pending: 0,
  done: 1,
  delivered: 2,
};

/**
 * The state of a piece from its state columns, one or two (filming and
 * upload): the furthest one wins, so "Filmado" and "No subido" is done.
 */
function readStatus(texts: readonly string[]): Read<PieceStatus> {
  let status: PieceStatus = "pending";
  for (const text of texts) {
    const value = words(text);
    if (value === "") continue;
    const found = STATUS_WORDS[value];
    if (!found) {
      return {
        ok: false,
        message: `No conocemos el estado «${oneLine(text)}»: usá Falta filmar, Filmado, No subido o Subido.`,
      };
    }
    if (STATUS_RANK[found] > STATUS_RANK[status]) status = found;
  }
  return { ok: true, value: status };
}

// ---------------------------------------------------------------------------
// Rows

type RowResult =
  | { kind: "blank" }
  | { kind: "piece"; piece: ImportedPiece }
  | { kind: "other-month"; month: MonthKey }
  | { kind: "problem"; problem: ImportProblem };

function cellsWith(
  row: readonly string[],
  columns: readonly Column[],
  role: Role,
): { header: string; text: string }[] {
  return columns
    .filter((column) => column.role === role)
    .map((column) => ({
      header: column.header,
      text: (row[column.index] ?? "").trim(),
    }));
}

/** "Mar 6/10 · Horarios del feriado", to point at a row of the file. */
function rowLabel(dateText: string, topic: string, row: readonly string[]) {
  const shortTopic = topic.length > 60 ? `${topic.slice(0, 59)}…` : topic;
  const label = [oneLine(dateText), shortTopic]
    .filter((part) => part !== "")
    .join(" · ");
  return label || oneLine(row.find((cell) => cell.trim() !== "") ?? "");
}

function readRow(
  row: readonly string[],
  columns: readonly Column[],
  month: MonthKey,
): RowResult {
  // A blank row, or a row with a single cell: a title like "Semana 2".
  if (row.filter((cell) => cell.trim() !== "").length <= 1) {
    return { kind: "blank" };
  }

  const first = (role: Role) =>
    cellsWith(row, columns, role).find((cell) => cell.text !== "")?.text ?? "";
  const pieceCell = splitPiece(first("piece"));
  const formatText = first("format") || pieceCell.format;
  const topic = oneLine(first("topic") || pieceCell.topic);

  const dateTexts = cellsWith(row, columns, "date").filter(
    (cell) => cell.text !== "",
  );
  // A table can have a weekday column and a date column: the first one
  // that reads as a date is the date.
  const date =
    dateTexts
      .map((cell) => readDay(cell.text, month))
      .find((day) => day !== null) ?? null;
  const dateText = dateTexts[0]?.text ?? "";
  if (date && monthOf(date) !== month) {
    return { kind: "other-month", month: monthOf(date) };
  }

  const messages: string[] = [];
  if (!date) {
    messages.push(
      dateText === ""
        ? "Falta la fecha."
        : `No entendemos la fecha «${oneLine(dateText)}».`,
    );
  }
  const format = readFormat(formatText);
  if (!format.ok) messages.push(format.message);
  const network = readNetwork(first("network"));
  if (!network.ok) messages.push(network.message);
  if (topic === "") messages.push("Falta el tema.");
  if (topic.length > IMPORT_LIMITS.topic) {
    messages.push(
      `El tema tiene ${topic.length} caracteres y el máximo es ${IMPORT_LIMITS.topic}.`,
    );
  }
  const idea = ideaOf(row, columns);
  if (idea !== null && idea.length > IMPORT_LIMITS.idea) {
    messages.push(
      `La idea, con las columnas que se le suman, tiene ${idea.length} caracteres y el máximo es ${IMPORT_LIMITS.idea}.`,
    );
  }
  const status = readStatus(
    cellsWith(row, columns, "status").map((cell) => cell.text),
  );
  if (!status.ok) messages.push(status.message);

  if (!date || !format.ok || !network.ok || !status.ok || messages.length > 0) {
    return {
      kind: "problem",
      problem: {
        row: rowLabel(dateText, topic, row),
        message: messages.join(" "),
      },
    };
  }
  return {
    kind: "piece",
    piece: {
      date,
      network: network.value,
      format: format.value,
      topic,
      idea,
      status: status.value,
    },
  };
}

/**
 * The idea, and below it every column the app has no field for, under its
 * header ("Objetivo: Llenar los talleres"), so nothing of the file is lost.
 */
function ideaOf(row: readonly string[], columns: readonly Column[]) {
  const idea = cellsWith(row, columns, "idea")
    .map((cell) => cell.text)
    .filter((text) => text !== "")
    .join("\n\n");
  const extras = cellsWith(row, columns, "extra")
    .filter((cell) => cell.text !== "")
    .map((cell) =>
      cell.header
        ? `${cell.header}: ${oneLine(cell.text)}`
        : oneLine(cell.text),
    )
    .join("\n");
  const text = [idea, extras].filter((part) => part !== "").join("\n\n");
  return text === "" ? null : text;
}

// ---------------------------------------------------------------------------
// The file

function readTable(table: PieceTable, month: MonthKey): CalendarImport {
  const pieces: ImportedPiece[] = [];
  const problems: ImportProblem[] = [];
  const otherMonths = new Map<MonthKey, number>();
  for (const row of table.rows) {
    // A table can repeat its header further down, once per week.
    if (isHeader(columnsOf(row))) continue;
    const result = readRow(row, table.columns, month);
    if (result.kind === "piece") pieces.push(result.piece);
    if (result.kind === "problem") problems.push(result.problem);
    if (result.kind === "other-month") {
      otherMonths.set(result.month, (otherMonths.get(result.month) ?? 0) + 1);
    }
  }
  return {
    // Stable: pieces of the same day keep the file's order.
    pieces: [...pieces].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    ),
    otherMonths: [...otherMonths]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, count]) => ({ month: key, count })),
    problems,
  };
}

/**
 * The pieces of `month` in the tables of a file. Tables with the same
 * columns are read as one (a table per week, a sheet per month), and of
 * those groups wins the one with the most pieces of the month. Null when no
 * table has a header with a date and a topic (or piece) column.
 */
export function readCalendarImport(
  tables: readonly ImportTable[],
  month: MonthKey,
): CalendarImport | null {
  const groups = new Map<string, PieceTable>();
  for (const table of tables) {
    const found = findPieceTable(table);
    if (!found) continue;
    const key = found.columns
      .map((column) => `${column.role}:${words(column.header)}`)
      .join("|");
    const group = groups.get(key);
    if (group) group.rows.push(...found.rows);
    else groups.set(key, { columns: found.columns, rows: [...found.rows] });
  }
  let best: CalendarImport | null = null;
  for (const group of groups.values()) {
    const result = readTable(group, month);
    if (!best || result.pieces.length > best.pieces.length) best = result;
  }
  return best;
}

// ---------------------------------------------------------------------------
// The preview's texts

/** "Encontramos 9 piezas de octubre." */
export function importFoundText(count: number, month: MonthKey): string {
  const name = monthName(month);
  return count === 0
    ? `El archivo no tiene piezas de ${name}.`
    : `Encontramos ${counted(count, "pieza", "piezas")} de ${name}.`;
}

/** "No entran en este calendario: 1 pieza de noviembre." */
export function otherMonthsText(
  otherMonths: CalendarImport["otherMonths"],
): string | null {
  if (otherMonths.length === 0) return null;
  const parts = otherMonths.map(({ month, count }, index) =>
    index === 0
      ? `${counted(count, "pieza", "piezas")} de ${monthName(month)}`
      : `${count} de ${monthName(month)}`,
  );
  const months = joinWithAnd(otherMonths.map(({ month }) => monthName(month)));
  const total = otherMonths.reduce((sum, { count }) => sum + count, 0);
  return `No entran en este calendario: ${joinWithAnd(parts)}. Importá el mismo archivo en ${months} para ${total === 1 ? "cargarla" : "cargarlas"}.`;
}

/** "2 filas no se importan:" */
export function problemsTitle(count: number): string {
  return count === 1
    ? "1 fila no se importa:"
    : `${count} filas no se importan:`;
}

/** "El archivo no dice la red de 9 piezas." */
export function missingNetworkText(count: number): string {
  return count === 1
    ? "El archivo no dice la red de 1 pieza."
    : `El archivo no dice la red de ${count} piezas.`;
}

/** "Reemplaza las 4 piezas que tiene el calendario." */
export function replaceText(count: number): string | null {
  if (count === 0) return null;
  return count === 1
    ? "Reemplaza la pieza que tiene el calendario."
    : `Reemplaza las ${count} piezas que tiene el calendario.`;
}

/** "Importar 9 piezas" */
export function importButtonText(count: number): string {
  return `Importar ${counted(count, "pieza", "piezas")}`;
}

/** "El archivo tiene más de 200 piezas de octubre: …" */
export function tooManyPiecesText(month: MonthKey): string {
  return `El archivo tiene más de ${IMPORT_LIMITS.pieces} piezas de ${monthName(month)}: revisá que sea el calendario de un mes.`;
}

export const NO_TABLE_TEXT =
  "No encontramos la tabla de piezas. Tiene que tener una columna de fecha y otra de tema (o de pieza), cada una con su título arriba.";
