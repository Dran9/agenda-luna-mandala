import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(SCRIPT_DIR, "..");
const SRC_DIR = path.join(APP_DIR, "src");

const LIMITS = {
  ".jsx": 300,
  ".css": 200
};

const FORBIDDEN_PATTERNS = [
  "location.reload",
  "setRefreshTick",
  "Math.random",
  "key={Math.random"
];

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return collectFiles(fullPath);
      }

      if (entry.isFile()) {
        return [fullPath];
      }

      return [];
    })
  );

  return files.flat();
}

function lineCount(content) {
  if (content.length === 0) {
    return 0;
  }

  const lines = content.split(/\r\n|\r|\n/);
  return lines.at(-1) === "" ? lines.length - 1 : lines.length;
}

function relative(filePath) {
  return path.relative(APP_DIR, filePath);
}

const files = await collectFiles(SRC_DIR);
const violations = [];
const maxima = {
  ".jsx": { count: 0, file: null },
  ".css": { count: 0, file: null }
};

for (const file of files) {
  const ext = path.extname(file);
  const content = await readFile(file, "utf8");

  if (Object.hasOwn(LIMITS, ext)) {
    const count = lineCount(content);

    if (count > maxima[ext].count) {
      maxima[ext] = { count, file };
    }

    if (count > LIMITS[ext]) {
      violations.push(`${relative(file)} has ${count} lines; limit is ${LIMITS[ext]}`);
    }
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (content.includes(pattern)) {
      violations.push(`${relative(file)} contains forbidden pattern: ${pattern}`);
    }
  }
}

console.log(`Admin Next guardrails: max JSX ${maxima[".jsx"].count} (${relative(maxima[".jsx"].file)})`);
console.log(`Admin Next guardrails: max CSS ${maxima[".css"].count} (${relative(maxima[".css"].file)})`);

if (violations.length > 0) {
  console.error("Admin Next guardrails failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Admin Next guardrails passed.");
