import { readFile } from "node:fs/promises";
import path from "node:path";
import type { JobPostingInput } from "@/lib/types";

export async function readSampleJobs(): Promise<JobPostingInput[]> {
  const file = path.join(process.cwd(), "public", "sample_jobs.csv");
  const text = await readFile(file, "utf8");
  const [header, ...rows] = parseCsv(text);
  return rows
    .filter((row) => row.length === header.length)
    .map((row) => {
      const record = Object.fromEntries(header.map((key, index) => [key, row[index]]));
      return {
        source: record.source,
        external_id: record.external_id,
        title: record.title,
        company: record.company,
        location: record.location,
        description: record.description,
        url: record.url,
        posted_at: record.posted_at,
        raw_json: safeJson(record.raw_json)
      };
    });
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      value += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length > 0) {
    row.push(value);
    if (row.some(Boolean)) {
      rows.push(row);
    }
  }
  return rows;
}

function safeJson(value: string) {
  try {
    return JSON.parse(value || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}
