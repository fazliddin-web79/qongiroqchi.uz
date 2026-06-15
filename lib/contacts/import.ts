import readXlsxFile from "read-excel-file/node";
import { AppError } from "@/lib/api/errors";

export type ImportRow = Record<string, string>;

const HEADER_ALIASES: Record<string, string> = {
  "full name": "fullName",
  fullname: "fullName",
  full_name: "fullName",
  name: "fullName",
  phone: "phone",
  telephone: "phone",
  tel: "phone",
  status: "status",
};

function normalizeHeader(value: unknown) {
  const header = String(value ?? "").trim();
  return HEADER_ALIASES[header.toLowerCase()] ?? header;
}

function rowsToObjects(rows: unknown[][]) {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).filter((row) => row.some((value) => String(value ?? "").trim())).map((row) => Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? "").trim()])));
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export async function parseContactImport(file: File): Promise<ImportRow[]> {
  if (file.size > 5 * 1024 * 1024) throw new AppError("Import file must be smaller than 5 MB", 413, "FILE_TOO_LARGE");
  const extension = file.name.toLowerCase().split(".").pop();
  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: unknown[][];

  if (extension === "csv") {
    rows = parseCsv(buffer.toString("utf8"));
  } else if (extension === "xlsx") {
    rows = await readXlsxFile(buffer) as unknown as unknown[][];
  } else {
    throw new AppError("Only CSV and XLSX files are supported", 422, "INVALID_FILE_TYPE");
  }

  if (rows.length > 2001) throw new AppError("Import is limited to 2,000 contacts", 422, "IMPORT_LIMIT");
  const records = rowsToObjects(rows);
  if (!records.length) throw new AppError("Import file has no contact rows", 422, "EMPTY_IMPORT");
  return records;
}
