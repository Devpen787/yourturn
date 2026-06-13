#!/usr/bin/env node
/**
 * Regenerates docs/BRAND-UI-APPENDIX.generated.md from source.
 * Run: npm run docs:brand-appendix
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "BRAND-UI-APPENDIX.generated.md");

function walkFiles(dir, exts, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walkFiles(p, exts, acc);
    } else if (exts.some((e) => ent.name.endsWith(e))) {
      acc.push(p);
    }
  }
  return acc;
}

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

function extractExports(content, fileLabel) {
  const rows = [];
  const re = /^export (type|const|function) ([A-Za-z0-9_]+)/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    rows.push({ kind: m[1], name: m[2], file: fileLabel });
  }
  return rows;
}

function extractGlassExports(content) {
  const rows = [];
  const re = /^export const ([A-Za-z0-9_]+)\s*=/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    rows.push(m[1]);
  }
  return rows;
}

/** Keys inside `export const brandCssVar = { ... } as const` */
function extractBrandCssVarKeys(content) {
  const start = content.indexOf("export const brandCssVar = {");
  if (start === -1) return [];
  const sub = content.slice(start);
  const endBrace = sub.indexOf("} as const");
  if (endBrace === -1) return [];
  const body = sub.slice(0, endBrace);
  const keys = [];
  const re = /^\s*(\w+):\s*"/gm;
  let m;
  while ((m = re.exec(body)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

function extractDomIds(content) {
  const ids = new Set();
  const re = /\bid="([^"]+)"/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    ids.add(m[1]);
  }
  return [...ids].sort();
}

function extractHashHrefs(content) {
  const frags = new Set();
  const re = /\bhref="#([^"]+)"/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    frags.add(m[1]);
  }
  return [...frags].sort();
}

function main() {
  const glassPath = path.join(ROOT, "lib", "ui", "glass-classes.ts");
  const glassSrc = fs.readFileSync(glassPath, "utf8");
  const glassExports = extractGlassExports(glassSrc);

  const brandTokensPath = path.join(ROOT, "lib", "ui", "brand-tokens.ts");
  const brandTokensSrc = fs.readFileSync(brandTokensPath, "utf8");
  const brandTokenExports = extractExports(
    brandTokensSrc,
    rel(brandTokensPath)
  );
  const brandCssKeys = extractBrandCssVarKeys(brandTokensSrc);

  const labPrimitives = path.join(
    ROOT,
    "components",
    "brand-lab",
    "LabMockPrimitives.tsx"
  );
  const logoPath = path.join(
    ROOT,
    "components",
    "brand-lab",
    "brandLogoVariants.tsx"
  );

  const primitivesExports = extractExports(
    fs.readFileSync(labPrimitives, "utf8"),
    rel(labPrimitives)
  );
  const logoExports = extractExports(
    fs.readFileSync(logoPath, "utf8"),
    rel(logoPath)
  );

  const labDirs = [
    path.join(ROOT, "components", "brand-lab"),
    path.join(ROOT, "app", "brand-lab"),
  ];
  const labFiles = [];
  for (const d of labDirs) {
    walkFiles(d, [".tsx", ".ts"], labFiles);
  }

  /** @type {Map<string, string[]>} */
  const idToFiles = new Map();
  /** @type {Map<string, string[]>} */
  const hrefToFiles = new Map();

  for (const file of labFiles.sort()) {
    const text = fs.readFileSync(file, "utf8");
    const ids = extractDomIds(text);
    for (const id of ids) {
      if (!idToFiles.has(id)) idToFiles.set(id, []);
      idToFiles.get(id).push(rel(file));
    }
    const hrefs = extractHashHrefs(text);
    for (const h of hrefs) {
      if (!hrefToFiles.has(h)) hrefToFiles.set(h, []);
      hrefToFiles.get(h).push(rel(file));
    }
  }

  const iso = new Date().toISOString();

  const lines = [
    "# BRAND-UI appendix (generated)",
    "",
    "> **Do not edit by hand.** Regenerate with `npm run docs:brand-appendix`.",
    "",
    `Generated (UTC): \`${iso}\``,
    "",
    "See **`docs/BRAND-UI.md` §12** for narrative spec. This file is a **mechanical index** so diffs surface when exports or `id`s change.",
    "",
    "---",
    "",
    "## 1. `lib/ui/glass-classes.ts` — `export const` names",
    "",
    "Composable Tailwind class strings for glass / signature surfaces.",
    "",
    "| Export |",
    "|--------|",
    ...glassExports.map((n) => `| \`${n}\` |`),
    "",
    "---",
    "",
    "## 2. `lib/ui/brand-tokens.ts`",
    "",
    "### `brandCssVar` keys → CSS custom properties",
    "",
    "| Key | Tailwind usage (examples) |",
    "|-----|---------------------------|",
    ...brandCssKeys.map((k) => {
      const tw = {
        mark: "`text-brand-mark`, `fill-brand-mark`, `stroke-brand-mark`, …",
        schedule: "`text-brand-schedule`, `stroke-brand-schedule`, `fill-brand-schedule`, …",
        motion: "`text-brand-motion`, `stroke-brand-motion`, …",
        wordAccent: "`text-brand-word-accent`",
        link: "`text-brand-link`",
        canvas: "`bg-brand-canvas`",
        canvasMid: "`bg-brand-canvas-mid`",
        focusRing: "`ring-brand-focus` (see `tailwind.config` `ringColor`)",
      }[k];
      return `| \`${k}\` | ${tw ?? "(see tailwind `brand.*` theme)"} |`;
    }),
    "",
    "### TypeScript exports",
    "",
    "| Kind | Name |",
    "|------|------|",
    ...brandTokenExports.map((r) => `| ${r.kind} | \`${r.name}\` |`),
    "",
    "---",
    "",
    "## 3. `components/brand-lab/LabMockPrimitives.tsx` — exports",
    "",
    "| Kind | Name |",
    "|------|------|",
    ...primitivesExports.map((r) => `| ${r.kind} | \`${r.name}\` |`),
    "",
    "---",
    "",
    "## 4. `components/brand-lab/brandLogoVariants.tsx` — exports",
    "",
    "| Kind | Name |",
    "|------|------|",
    ...logoExports.map((r) => `| ${r.kind} | \`${r.name}\` |`),
    "",
    "---",
    "",
    "## 5. DOM `id=\"…\"` in brand lab (deduped)",
    "",
    "Scanned: `components/brand-lab/**`, `app/brand-lab/**` (`.ts` / `.tsx`).",
    "",
  ];

  const sortedIds = [...idToFiles.keys()].sort();
  if (sortedIds.length === 0) {
    lines.push("*No `id` attributes found.*", "");
  } else {
    lines.push("| `id` | Files |", "|------|-------|");
    for (const id of sortedIds) {
      const files = idToFiles
        .get(id)
        .sort()
        .map((f) => `\`${f}\``)
        .join("<br>");
      lines.push(`| \`${id}\` | ${files} |`);
    }
    lines.push("");
  }

  lines.push("---", "", "## 6. In-page `href=\"#…\"` in brand lab (deduped)", "");

  const sortedHrefs = [...hrefToFiles.keys()].sort();
  if (sortedHrefs.length === 0) {
    lines.push("*No hash hrefs found.*", "");
  } else {
    lines.push("| Fragment | Files |", "|----------|-------|");
    for (const h of sortedHrefs) {
      const files = hrefToFiles
        .get(h)
        .sort()
        .map((f) => `\`${f}\``)
        .join("<br>");
      lines.push(`| \`#${h}\` | ${files} |`);
    }
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "## 7. `components/brand-lab/*.tsx` files (inventory)",
    ""
  );
  const allLab = walkFiles(path.join(ROOT, "components", "brand-lab"), [
    ".tsx",
    ".ts",
  ]).sort();
  for (const f of allLab) {
    lines.push(`- \`${rel(f)}\``);
  }
  lines.push("");

  fs.writeFileSync(OUT, lines.join("\n"), "utf8");
  console.log(`Wrote ${path.relative(ROOT, OUT)}`);
}

main();
