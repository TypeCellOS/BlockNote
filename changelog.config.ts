export default {
  types: {
    feat: { title: "🚀 Features" },
    fix: { title: "🩹 Fixes" },
    perf: { title: "🔥 Performance" },
    refactor: false,
    docs: false,
    build: false,
    chore: false,
    ci: false,
    test: false,
    style: false,
  },
  repo: {
    provider: "github" as const,
    repo: "TypeCellOS/BlockNote",
    domain: "github.com",
  },
  excludeAuthors: ["dependabot[bot]", "renovate[bot]"],
};
