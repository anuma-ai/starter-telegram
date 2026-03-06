import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const DOCS_SRC = "documents";
const DOCS_OUT = join("docs", DOCS_SRC);
const GITHUB_BASE =
  "https://github.com/anuma-ai/starter-telegram/blob/main/";

const includeCodeRe = /^\{@includeCode\s+(\S+?)(?:#(\S+))?\s*\}$/;
const regionMarkerRe = /^\s*\/\/\s*#(?:region|endregion)\b.*$/;

let warnings = 0;
function warn(msg) {
  console.warn(`  warn: ${msg}`);
  warnings++;
}

// --- File and region helpers ---

const fileCache = new Map();
function readLines(filePath) {
  if (fileCache.has(filePath)) return fileCache.get(filePath);
  if (!existsSync(filePath)) {
    fileCache.set(filePath, null);
    return null;
  }
  const lines = readFileSync(filePath, "utf8").split("\n");
  fileCache.set(filePath, lines);
  return lines;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractRegion(filePath, region) {
  const lines = readLines(filePath);
  if (!lines) {
    warn(`source file not found: ${filePath}`);
    return null;
  }
  if (!region) {
    // Include whole file, stripping region markers.
    const content = lines.filter((l) => !regionMarkerRe.test(l));
    return { content, startLine: 1, endLine: lines.length };
  }
  const escaped = escapeRegExp(region);
  const startRe = new RegExp(`^//\\s*#region\\s+${escaped}$`);
  const endRe = new RegExp(`^//\\s*#endregion\\s+${escaped}$`);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (start === -1 && startRe.test(trimmed)) {
      start = i;
    } else if (start !== -1 && endRe.test(trimmed)) {
      const content = lines
        .slice(start + 1, i)
        .filter((l) => !regionMarkerRe.test(l));
      return { content, startLine: start + 2, endLine: i };
    }
  }
  warn(`region "${region}" not found in ${filePath}`);
  return null;
}

function langFromExt(filePath) {
  const ext = extname(filePath).slice(1);
  return ext || "text";
}

// --- Collect source files ---

function collectFiles(dir, ext) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(full, ext));
    else if (entry.name.endsWith(ext)) files.push(full);
  }
  return files;
}

// --- Generate ---

// Clean output.
if (existsSync("docs")) rmSync("docs", { recursive: true });

// Process each source markdown file.
for (const srcFile of collectFiles(DOCS_SRC, ".md")) {
  const outFile = join("docs", srcFile);
  mkdirSync(dirname(outFile), { recursive: true });

  const srcLines = readFileSync(srcFile, "utf8").split("\n");
  const out = [];

  for (const line of srcLines) {
    const m = line.match(includeCodeRe);
    if (!m) {
      out.push(line);
      continue;
    }

    // Resolve the referenced file path relative to the source doc.
    const refPath = relative(".", resolve(dirname(srcFile), m[1]));
    const region = m[2] || null;
    const extracted = extractRegion(refPath, region);

    if (!extracted) {
      out.push(line); // Keep the raw directive so the problem is visible.
      continue;
    }

    // Fenced code block.
    const lang = langFromExt(refPath);
    out.push(`\`\`\`${lang}`);
    out.push(...extracted.content);
    out.push("```");

    // Source link with line numbers.
    const fragment = region
      ? `#L${extracted.startLine}-L${extracted.endLine}`
      : "";
    out.push(`\n[${refPath}](${GITHUB_BASE}${refPath}${fragment})`);
  }

  writeFileSync(outFile, out.join("\n"));
}

// Copy README into docs output.
if (existsSync("README.md")) {
  mkdirSync(DOCS_OUT, { recursive: true });
  copyFileSync("README.md", join(DOCS_OUT, "index.md"));
}

// Copy _meta.js navigation files.
for (const src of collectFiles(DOCS_SRC, "_meta.js")) {
  const dest = join("docs", src);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}

if (warnings > 0) {
  console.warn(`\n${warnings} warning(s) during doc generation`);
  process.exitCode = 1;
}
