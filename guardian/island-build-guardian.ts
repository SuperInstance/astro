/**
 * Island Build Guardian for Astro
 *
 * Budget → Profile → Detect → Report
 *
 * Measures Astro island hydration scripts, static assets, and page output.
 * Detects when individual islands or total page weight exceed conservation budgets.
 * Runs via `npx tsx guardian/island-build-guardian.ts`.
 */

import { readdir, stat, readFile, writeFile } from "node:fs/promises";
import { join, relative, extname } from "node:path";

// ─── Budget ───────────────────────────────────────────────────────────

export interface IslandBudget {
  /** Max total build output (dist/) in MB */
  maxTotalBuildMb: number;
  /** Max per-page HTML in KB */
  maxPageKb: number;
  /** Max individual JS hydration chunk in KB */
  maxIslandJsKb: number;
  /** Max CSS per page in KB */
  maxCssKb: number;
  /** Max static asset (images/fonts) in MB per file */
  maxAssetMb: number;
  /** Patterns to exclude from asset checks */
  excludePatterns: RegExp[];
}

export const DEFAULT_BUDGET: IslandBudget = {
  maxTotalBuildMb: 20,
  maxPageKb: 200,
  maxIslandJsKb: 100,
  maxCssKb: 50,
  maxAssetMb: 2,
  excludePatterns: [/node_modules/, /\.git/],
};

// ─── Profile ──────────────────────────────────────────────────────────

export interface BuildFile {
  path: string;
  relativePath: string;
  sizeBytes: number;
  extension: string;
  category: "html" | "js" | "css" | "asset";
}

export interface BuildProfile {
  timestamp: string;
  totalBytes: number;
  files: BuildFile[];
  byCategory: Record<string, { count: number; totalBytes: number }>;
  topFiles: BuildFile[];
}

function categorize(ext: string): BuildFile["category"] {
  if (ext === ".html") return "html";
  if ([".js", ".mjs", ".cjs"].includes(ext)) return "js";
  if (ext === ".css") return "css";
  return "asset";
}

async function* walk(dir: string, exclude: RegExp[]): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (exclude.some((pat) => pat.test(full))) continue;
    if (entry.isDirectory()) {
      yield* walk(full, exclude);
    } else {
      yield full;
    }
  }
}

export async function profileBuild(
  distDir: string,
  budget: IslandBudget = DEFAULT_BUDGET,
): Promise<BuildProfile> {
  const files: BuildFile[] = [];

  try {
    for await (const filePath of walk(distDir, budget.excludePatterns)) {
      const s = await stat(filePath);
      const ext = extname(filePath);
      const rel = relative(distDir, filePath);

      files.push({
        path: filePath,
        relativePath: rel,
        sizeBytes: s.size,
        extension: ext,
        category: categorize(ext),
      });
    }
  } catch {
    // dist may not exist
  }

  const byCategory: Record<string, { count: number; totalBytes: number }> = {};
  for (const f of files) {
    if (!byCategory[f.category]) byCategory[f.category] = { count: 0, totalBytes: 0 };
    byCategory[f.category].count++;
    byCategory[f.category].totalBytes += f.sizeBytes;
  }

  const sorted = [...files].sort((a, b) => b.sizeBytes - a.sizeBytes);

  return {
    timestamp: new Date().toISOString(),
    totalBytes: files.reduce((s, f) => s + f.sizeBytes, 0),
    files,
    byCategory,
    topFiles: sorted.slice(0, 20),
  };
}

// ─── Detect ───────────────────────────────────────────────────────────

export interface Violation {
  kind: "total-build" | "page-oversize" | "island-js" | "css-oversize" | "asset-oversize";
  subject: string;
  valueBytes: number;
  limitBytes: number;
  message: string;
}

export function detect(profile: BuildProfile, budget: IslandBudget = DEFAULT_BUDGET): Violation[] {
  const violations: Violation[] = [];

  // Total build size
  if (profile.totalBytes > budget.maxTotalBuildMb * 1024 * 1024) {
    violations.push({
      kind: "total-build",
      subject: "dist/",
      valueBytes: profile.totalBytes,
      limitBytes: budget.maxTotalBuildMb * 1024 * 1024,
      message: `Total build ${(profile.totalBytes / 1024 / 1024).toFixed(1)}MB exceeds ${budget.maxTotalBuildMb}MB`,
    });
  }

  for (const f of profile.files) {
    // HTML pages
    if (f.category === "html" && f.sizeBytes > budget.maxPageKb * 1024) {
      violations.push({
        kind: "page-oversize",
        subject: f.relativePath,
        valueBytes: f.sizeBytes,
        limitBytes: budget.maxPageKb * 1024,
        message: `Page ${f.relativePath} is ${(f.sizeBytes / 1024).toFixed(0)}KB (limit ${budget.maxPageKb}KB)`,
      });
    }

    // JS hydration islands
    if (f.category === "js" && f.sizeBytes > budget.maxIslandJsKb * 1024) {
      violations.push({
        kind: "island-js",
        subject: f.relativePath,
        valueBytes: f.sizeBytes,
        limitBytes: budget.maxIslandJsKb * 1024,
        message: `Island JS ${f.relativePath} is ${(f.sizeBytes / 1024).toFixed(0)}KB (limit ${budget.maxIslandJsKb}KB)`,
      });
    }

    // CSS
    if (f.category === "css" && f.sizeBytes > budget.maxCssKb * 1024) {
      violations.push({
        kind: "css-oversize",
        subject: f.relativePath,
        valueBytes: f.sizeBytes,
        limitBytes: budget.maxCssKb * 1024,
        message: `CSS ${f.relativePath} is ${(f.sizeBytes / 1024).toFixed(0)}KB (limit ${budget.maxCssKb}KB)`,
      });
    }

    // Assets
    if (f.category === "asset" && f.sizeBytes > budget.maxAssetMb * 1024 * 1024) {
      violations.push({
        kind: "asset-oversize",
        subject: f.relativePath,
        valueBytes: f.sizeBytes,
        limitBytes: budget.maxAssetMb * 1024 * 1024,
        message: `Asset ${f.relativePath} is ${(f.sizeBytes / 1024 / 1024).toFixed(1)}MB (limit ${budget.maxAssetMb}MB)`,
      });
    }
  }

  return violations;
}

// ─── Report ───────────────────────────────────────────────────────────

export function formatReport(
  profile: BuildProfile,
  violations: Violation[],
  distDir: string,
): string {
  const lines: string[] = [];
  const kb = (b: number) => `${(b / 1024).toFixed(1)} KB`;
  const mb = (b: number) => `${(b / 1024 / 1024).toFixed(2)} MB`;

  lines.push("═══════════════════════════════════════════════");
  lines.push("  🚀 Astro Island Build Guardian Report");
  lines.push("═══════════════════════════════════════════════");
  lines.push(`  Timestamp : ${profile.timestamp}`);
  lines.push(`  Build dir : ${distDir}`);
  lines.push(`  Total     : ${mb(profile.totalBytes)}`);
  lines.push("");

  lines.push("  ── By Category ──");
  for (const [cat, info] of Object.entries(profile.byCategory).sort(
    (a, b) => b[1].totalBytes - a[1].totalBytes,
  )) {
    lines.push(`    ${cat.padEnd(8)} ${info.count.toString().padStart(5)} files  ${mb(info.totalBytes).padStart(12)}`);
  }
  lines.push("");

  lines.push("  ── Top 10 Largest Files ──");
  for (const f of profile.topFiles.slice(0, 10)) {
    const size = f.sizeBytes > 1024 * 1024 ? mb(f.sizeBytes) : kb(f.sizeBytes);
    lines.push(`    ${size.padStart(12)}  [${f.category}]  ${f.relativePath}`);
  }
  lines.push("");

  if (violations.length === 0) {
    lines.push("  ✅ All islands within conservation budget.");
  } else {
    lines.push(`  ⚠️  ${violations.length} violation(s):`);
    for (const v of violations) {
      lines.push(`    • [${v.kind}] ${v.message}`);
    }
  }

  lines.push("═══════════════════════════════════════════════");
  return lines.join("\n");
}

// ─── CLI ──────────────────────────────────────────────────────────────

async function main() {
  const distDir = process.argv[2] || join(process.cwd(), "dist");
  const budget = { ...DEFAULT_BUDGET };

  if (process.env.MAX_TOTAL_BUILD_MB) budget.maxTotalBuildMb = Number(process.env.MAX_TOTAL_BUILD_MB);
  if (process.env.MAX_PAGE_KB) budget.maxPageKb = Number(process.env.MAX_PAGE_KB);
  if (process.env.MAX_ISLAND_JS_KB) budget.maxIslandJsKb = Number(process.env.MAX_ISLAND_JS_KB);

  const prof = await profileBuild(distDir, budget);
  const violations = detect(prof, budget);
  const report = formatReport(prof, violations, distDir);

  console.log(report);

  const jsonPath = join(distDir, "..", "guardian-report.json");
  await writeFile(jsonPath, JSON.stringify({ profile: prof, violations, budget }, null, 2));
  console.log(`\n  JSON report → ${jsonPath}`);

  process.exit(violations.length > 0 ? 1 : 0);
}

if (typeof require !== "undefined" && require.main === module) {
  main().catch(console.error);
}
// ESM direct run
if (typeof import.meta !== "undefined" && import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
