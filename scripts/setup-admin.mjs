import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const filename = path.join(process.cwd(), ".env.local");
let existing = "";
try {
  existing = await readFile(filename, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (/^\s*(?:export\s+)?ADMIN_PASSWORD\s*=/m.test(existing)) {
  console.log("ADMIN_PASSWORD existe deja dans .env.local. Aucun changement.");
} else {
  const separator = existing && !existing.endsWith("\n") ? "\n" : "";
  await writeFile(
    filename,
    `${existing}${separator}ADMIN_PASSWORD=${randomBytes(24).toString("base64url")}\n`,
    { mode: 0o600 },
  );
  console.log(
    "Mot de passe administrateur genere dans .env.local. Il n'est pas affiche dans le terminal.",
  );
}
