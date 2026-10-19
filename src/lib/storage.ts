import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Submission } from "./questionnaire";

const directory =
  process.env.SURVEY_DATA_DIR || path.join(process.cwd(), "data", "responses");
export type SavedSubmission = Submission & { id: string; createdAt: string };

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
