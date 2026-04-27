#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const [inputPath, outputPath = "queue.json"] = process.argv.slice(2);

if (!inputPath) {
  console.error("Usage: node scripts/build-queue-from-csv.mjs <input.csv> [output.json]");
  process.exit(1);
}

const csv = await readFile(inputPath, "utf8");
const table = parseCsv(csv);
const [headers, ...rows] = table;
const index = Object.fromEntries(headers.map((header, column) => [header, column]));

const queue = rows
  .map((row, i) => ({ row, sheetRow: i + 2 }))
  .filter(({ row }) => value(row, index, "초기상태") === "대기" && !value(row, index, "실행상태"))
  .map(({ row, sheetRow }) => ({
    sheetRow,
    month: value(row, index, "예약월"),
    date: value(row, index, "예약일"),
    weekday: value(row, index, "요일"),
    time: value(row, index, "시간"),
    name: value(row, index, "이름"),
    phone: value(row, index, "전화번호"),
    teacher: value(row, index, "강사"),
    sourceRow: value(row, index, "원본행"),
    status: "승인",
    memo: value(row, index, "원본메모"),
    key: value(row, index, "예약키")
  }));

await writeFile(outputPath, `${JSON.stringify(queue, null, 2)}\n`);
console.log(`Wrote ${queue.length} rows to ${outputPath}`);

function value(row, index, key) {
  return String(row[index[key]] || "").trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        i += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === "\"") quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}
