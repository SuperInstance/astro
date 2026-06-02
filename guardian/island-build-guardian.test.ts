import { describe, expect, test } from "vitest";
import {
  DEFAULT_BUDGET,
  detect,
  formatReport,
  type BuildProfile,
  type Violation,
} from "./island-build-guardian";

// ─── Fixtures ─────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<BuildProfile> = {}): BuildProfile {
  return {
    timestamp: "2026-06-02T00:00:00.000Z",
    totalBytes: 5 * 1024 * 1024,
    files: [
      {
        path: "/dist/index.html",
        relativePath: "index.html",
        sizeBytes: 50 * 1024,
        extension: ".html",
        category: "html",
      },
      {
        path: "/dist/_astro/island-abc.js",
        relativePath: "_astro/island-abc.js",
        sizeBytes: 30 * 1024,
        extension: ".js",
        category: "js",
      },
      {
        path: "/dist/_astro/styles.css",
        relativePath: "_astro/styles.css",
        sizeBytes: 10 * 1024,
        extension: ".css",
        category: "css",
      },
      {
        path: "/dist/images/hero.webp",
        relativePath: "images/hero.webp",
        sizeBytes: 500 * 1024,
        extension: ".webp",
        category: "asset",
      },
    ],
    byCategory: {
      html: { count: 1, totalBytes: 50 * 1024 },
      js: { count: 1, totalBytes: 30 * 1024 },
      css: { count: 1, totalBytes: 10 * 1024 },
      asset: { count: 1, totalBytes: 500 * 1024 },
    },
    topFiles: [],
    ...overrides,
  };
}

// ─── Detect ───────────────────────────────────────────────────────────

describe("detect", () => {
  test("returns no violations when within budget", () => {
    const prof = makeProfile();
    const violations = detect(prof, DEFAULT_BUDGET);
    expect(violations.length).toBe(0);
  });

  test("detects total build overrun", () => {
    const prof = makeProfile({ totalBytes: 25 * 1024 * 1024 });
    const violations = detect(prof, DEFAULT_BUDGET);
    expect(violations.some((v) => v.kind === "total-build")).toBe(true);
  });

  test("detects oversize HTML page", () => {
    const prof = makeProfile({
      files: [
        {
          path: "/dist/blog/huge-post.html",
          relativePath: "blog/huge-post.html",
          sizeBytes: 300 * 1024,
          extension: ".html",
          category: "html" as const,
        },
      ],
    });
    const violations = detect(prof, DEFAULT_BUDGET);
    const pageV = violations.find((v) => v.kind === "page-oversize");
    expect(pageV).toBeDefined();
    expect(pageV!.subject).toBe("blog/huge-post.html");
  });

  test("detects oversize island JS", () => {
    const prof = makeProfile({
      files: [
        {
          path: "/dist/_astro/chunk-big.js",
          relativePath: "_astro/chunk-big.js",
          sizeBytes: 150 * 1024,
          extension: ".js",
          category: "js" as const,
        },
      ],
    });
    const violations = detect(prof, DEFAULT_BUDGET);
    expect(violations.some((v) => v.kind === "island-js")).toBe(true);
  });

  test("detects oversize CSS", () => {
    const prof = makeProfile({
      files: [
        {
          path: "/dist/_astro/megacss.css",
          relativePath: "_astro/megacss.css",
          sizeBytes: 80 * 1024,
          extension: ".css",
          category: "css" as const,
        },
      ],
    });
    const violations = detect(prof, DEFAULT_BUDGET);
    expect(violations.some((v) => v.kind === "css-oversize")).toBe(true);
  });

  test("detects oversize asset", () => {
    const prof = makeProfile({
      files: [
        {
          path: "/dist/images/giant.png",
          relativePath: "images/giant.png",
          sizeBytes: 5 * 1024 * 1024,
          extension: ".png",
          category: "asset" as const,
        },
      ],
    });
    const violations = detect(prof, DEFAULT_BUDGET);
    expect(violations.some((v) => v.kind === "asset-oversize")).toBe(true);
  });
});

// ─── Report ───────────────────────────────────────────────────────────

describe("formatReport", () => {
  test("includes header and success when no violations", () => {
    const prof = makeProfile();
    const report = formatReport(prof, [], "/dist");
    expect(report).toContain("Astro Island Build Guardian Report");
    expect(report).toContain("✅");
  });

  test("lists violations", () => {
    const prof = makeProfile();
    const violations: Violation[] = [
      {
        kind: "island-js",
        subject: "_astro/huge.js",
        valueBytes: 200 * 1024,
        limitBytes: 100 * 1024,
        message: "Island JS _astro/huge.js is 200KB (limit 100KB)",
      },
    ];
    const report = formatReport(prof, violations, "/dist");
    expect(report).toContain("⚠️");
    expect(report).toContain("huge.js");
  });
});
