import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Submission } from "./questionnaire";
import { getSupabase } from "./supabase";

const directory =
  process.env.SURVEY_DATA_DIR || path.join(process.cwd(), "data", "responses");
export type SavedSubmission = Submission & { id: string; createdAt: string };
type SubmissionRow = {
  id: string;
  created_at: string;
  answers: Submission["answers"];
  practice: string;
  profile: Submission["profile"];
};
const fromRow = (row: SubmissionRow): SavedSubmission => ({
  id: row.id,
  createdAt: row.created_at,
  answers: row.answers,
  practice: row.practice,
  profile: row.profile,
});

// Keyset pagination also works if the project's API row limit is below 1000.
async function allRows<T extends { id: string }>(columns: string): Promise<T[]> {
  const db = getSupabase()!;
  const rows: T[] = [];
  let lastId: string | undefined;
  for (;;) {
    let query = db.from("survey_responses").select(columns).order("id").limit(500);
    if (lastId) query = query.gt("id", lastId);
    const { data, error } = await query;
    if (error) throw new Error("Lecture Supabase impossible.", { cause: error });
    const page = data as unknown as T[];
    if (!page.length) return rows;
    rows.push(...page);
    lastId = page[page.length - 1].id;
  }
}

export async function saveSubmission(submission: Submission) {
  const id = randomBytes(24).toString("hex");
  const record: SavedSubmission = {
    answers: { ...submission.answers },
    practice: submission.practice.trim(),
    profile: {
      role: submission.profile.role,
      sector: submission.profile.sector,
      size: submission.profile.size,
      email: submission.profile.email.trim(),
      consent: submission.profile.consent,
    },
    id,
    createdAt: new Date().toISOString(),
  };
  const db = getSupabase();
  if (db) {
    const { error } = await db.from("survey_responses").insert({
      id,
      created_at: record.createdAt,
      answers: record.answers,
      practice: record.practice,
      profile: record.profile,
    });
    if (error) throw new Error("Enregistrement Supabase impossible.", { cause: error });
    return id;
  }
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${id}.json`), JSON.stringify(record), {
    flag: "wx",
    mode: 0o600,
  });
  return id;
}

export async function getSubmission(
  id: string,
): Promise<SavedSubmission | null> {
  if (!/^[a-f0-9]{48}$/.test(id)) return null;
  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from("survey_responses")
      .select("id,created_at,answers,practice,profile").eq("id", id).maybeSingle();
    if (error) throw new Error("Lecture Supabase impossible.", { cause: error });
    return data ? fromRow(data as SubmissionRow) : null;
  }
  try {
    return JSON.parse(
      await readFile(/*turbopackIgnore: true*/ path.join(directory, `${id}.json`), "utf8"),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function getSubmissionIds() {
  if (getSupabase()) return (await allRows<{ id: string }>("id")).map((row) => row.id);
  try {
    return (await readdir(/*turbopackIgnore: true*/ directory))
      .filter((name) => /^[a-f0-9]{48}\.json$/.test(name))
      .map((name) => name.slice(0, -5));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function getAllSubmissions() {
  if (getSupabase()) {
    return (await allRows<SubmissionRow>("id,created_at,answers,practice,profile"))
      .map(fromRow).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  }
  const records: SavedSubmission[] = [];
  for (const id of await getSubmissionIds()) {
    const record = await getSubmission(id);
    if (record) records.push(record);
  }
  return records.sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}
