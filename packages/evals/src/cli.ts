#!/usr/bin/env bun
import { config } from "@dotenvx/dotenvx";
import type { EvalConfig, EvalReport } from "./runner";

// Load .env from repo root
config({ path: "../../.env" });

const DEFAULT_COUNTS = {
  booking: 15,
  "booking-status": 8,
  cancel: 8,
  modify: 6,
  onboarding: 5,
  "multi-turn": 10,
  faq: 10,
  fallback: 8,
  "edge-cases": 15,
  updates: 6,
};

const ALL_SUITES = [
  "booking",
  "booking-status",
  "cancel",
  "modify",
  "onboarding",
  "multi-turn",
  "faq",
  "fallback",
  "edge-cases",
  "updates",
] as const;

const parseArgs = (args: string[]) => {
  const config: EvalConfig = {
    suites: [...ALL_SUITES],
    counts: { ...DEFAULT_COUNTS },
    seed: Date.now(),
    verbose: false,
    allowFaqEscalation: false,
    notify: false,
    captureTranscripts: false,
    summaryOnly: false,
  };
  let json = false;
  let transcriptsPath: string | null = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--suite" || arg === "--suites") {
      const value = args[i + 1];
      if (!value) {
        throw new Error("Missing value for --suite");
      }
      config.suites = value
        .split(",")
        .map((suite) => suite.trim())
        .filter(Boolean) as EvalConfig["suites"];
      i += 1;
      continue;
    }
    if (arg === "--booking") {
      config.counts.booking = Number(args[i + 1] ?? DEFAULT_COUNTS.booking);
      i += 1;
      continue;
    }
    if (arg === "--booking-status") {
      config.counts["booking-status"] = Number(args[i + 1] ?? DEFAULT_COUNTS["booking-status"]);
      i += 1;
      continue;
    }
    if (arg === "--cancel") {
      config.counts.cancel = Number(args[i + 1] ?? DEFAULT_COUNTS.cancel);
      i += 1;
      continue;
    }
    if (arg === "--modify") {
      config.counts.modify = Number(args[i + 1] ?? DEFAULT_COUNTS.modify);
      i += 1;
      continue;
    }
    if (arg === "--onboarding") {
      config.counts.onboarding = Number(args[i + 1] ?? DEFAULT_COUNTS.onboarding);
      i += 1;
      continue;
    }
    if (arg === "--multi-turn") {
      config.counts["multi-turn"] = Number(args[i + 1] ?? DEFAULT_COUNTS["multi-turn"]);
      i += 1;
      continue;
    }
    if (arg === "--faq") {
      config.counts.faq = Number(args[i + 1] ?? DEFAULT_COUNTS.faq);
      i += 1;
      continue;
    }
    if (arg === "--fallback") {
      config.counts.fallback = Number(args[i + 1] ?? DEFAULT_COUNTS.fallback);
      i += 1;
      continue;
    }
    if (arg === "--edge-cases") {
      config.counts["edge-cases"] = Number(args[i + 1] ?? DEFAULT_COUNTS["edge-cases"]);
      i += 1;
      continue;
    }
    if (arg === "--updates") {
      config.counts.updates = Number(args[i + 1] ?? DEFAULT_COUNTS.updates);
      i += 1;
      continue;
    }
    if (arg === "--seed") {
      config.seed = Number(args[i + 1] ?? Date.now());
      i += 1;
      continue;
    }
    if (arg === "--verbose") {
      config.verbose = true;
      continue;
    }
    if (arg === "--allow-faq-escalation") {
      config.allowFaqEscalation = true;
      continue;
    }
    if (arg === "--summary-only") {
      config.summaryOnly = true;
      continue;
    }
    if (arg === "--notify") {
      config.notify = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--transcripts") {
      config.captureTranscripts = true;
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith("--")) {
        transcriptsPath = nextArg;
        i += 1;
      } else {
        transcriptsPath = `./transcripts-${Date.now()}.txt`;
      }
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return { config, json, transcriptsPath };
};

const printHelp = () => {
  console.log(`Usage: bun --filter @tee-time/evals run [options]

Suites:
  booking        New booking request flows (default: ${DEFAULT_COUNTS.booking})
  booking-status Booking status/lookup flows (default: ${DEFAULT_COUNTS["booking-status"]})
  cancel         Cancel booking flows (default: ${DEFAULT_COUNTS.cancel})
  modify         Modify booking flows (default: ${DEFAULT_COUNTS.modify})
  onboarding     New user onboarding (default: ${DEFAULT_COUNTS.onboarding})
  multi-turn     Multi-turn conversations (default: ${DEFAULT_COUNTS["multi-turn"]})
  faq            FAQ question flows (default: ${DEFAULT_COUNTS.faq})
  fallback       Fallback/support/clarify flows (default: ${DEFAULT_COUNTS.fallback})
  edge-cases     Edge cases and failure scenarios (default: ${DEFAULT_COUNTS["edge-cases"]})
  updates        Status update message tests (default: ${DEFAULT_COUNTS.updates})

Options:
  --suite <list>            Run specific suites (comma-separated)
  --booking <n>             Number of booking scenarios
  --booking-status <n>      Number of booking-status scenarios
  --cancel <n>              Number of cancel scenarios
  --modify <n>              Number of modify scenarios  
  --onboarding <n>          Number of onboarding scenarios
  --multi-turn <n>          Number of multi-turn scenarios
  --faq <n>                 Number of FAQ scenarios
  --fallback <n>            Number of fallback scenarios
  --edge-cases <n>          Number of edge-case scenarios
  --updates <n>             Number of update scenarios
  --seed <n>                Shuffle seed (default: now)
  --allow-faq-escalation    Treat FAQ escalations as pass
  --summary-only            Print only the final summary table (suppresses per-test logs)
  --notify                  Allow Slack notifications during evals
  --json                    Output JSON report
  --transcripts [path]      Save conversation transcripts to file
  --verbose                 Verbose output
  --help                    Show help

Examples:
  bun run evals                           # Run all suites with defaults
  bun run evals --suite booking,cancel    # Run only booking and cancel
  bun run evals --edge-cases 20           # Run 20 edge case scenarios
  bun run evals --transcripts review.txt  # Save transcripts for review
`);
};

const formatSuiteLine = (suite: EvalReport["suites"][number]) => {
  const status =
    suite.failed > 0
      ? "[FAIL]"
      : suite.skipped === suite.total
      ? "[SKIP]"
      : "[PASS]";
  return `${status} ${suite.suite}: ${suite.passed}/${suite.total} passed (${suite.failed} failed, ${suite.skipped} skipped)`;
};

const buildScenarioTable = (report: EvalReport) => {
  const rows = report.suites.flatMap((suite) =>
    suite.scenarios.map((scenario) => ({
      status:
        scenario.status === "pass"
          ? "✅"
          : scenario.status === "skip"
          ? "⏭️"
          : "❌",
      id: `${scenario.suite}/${scenario.id}`,
      name: scenario.name,
    }))
  );

  if (rows.length === 0) {
    return [];
  }

  const idWidth = Math.max(
    "Scenario".length,
    ...rows.map((row) => row.id.length)
  );
  const nameWidth = Math.max("Name".length, ...rows.map((row) => row.name.length));

  const header = `${"Status"}  ${"Scenario".padEnd(idWidth)}  ${"Name".padEnd(
    nameWidth
  )}`;
  const divider = `${"-".repeat(6)}  ${"-".repeat(idWidth)}  ${"-".repeat(
    nameWidth
  )}`;
  const lines = rows.map(
    (row) =>
      `${row.status}     ${row.id.padEnd(idWidth)}  ${row.name.padEnd(nameWidth)}`
  );

  return [header, divider, ...lines];
};

const printReport = (report: EvalReport, json: boolean) => {
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("\n========================================");
  console.log("EVALS REPORT");
  console.log("========================================");
  console.log(`Duration: ${(report.durationMs / 1000).toFixed(1)}s`);
  console.log(`Total: ${report.totals.passed}/${report.totals.total} passed\n`);
  
  for (const suite of report.suites) {
    console.log(formatSuiteLine(suite));
  }

  const failures = report.suites.flatMap((suite) =>
    suite.scenarios.filter((scenario) => scenario.status === "fail")
  );
  if (failures.length > 0) {
    console.log("\n❌ Failures:");
    for (const failure of failures) {
      const detail = failure.details ? ` - ${failure.details}` : "";
      console.log(`  - ${failure.suite}/${failure.id}${detail}`);
    }
  }

  const skipped = report.suites.flatMap((suite) =>
    suite.scenarios.filter((scenario) => scenario.status === "skip")
  );
  if (skipped.length > 0) {
    console.log("\n⏭️  Skipped:");
    for (const skip of skipped) {
      const detail = skip.details ? ` - ${skip.details}` : "";
      console.log(`  - ${skip.suite}/${skip.id}${detail}`);
    }
  }

  console.log("\n========================================");
  if (report.totals.failed > 0) {
    console.log(`Result: FAILED (${report.totals.failed} failures)`);
  } else {
    console.log("Result: PASSED ✓");
  }
  console.log("========================================\n");

  const tableLines = buildScenarioTable(report);
  if (tableLines.length > 0) {
    console.log("Scenario Results:");
    for (const line of tableLines) {
      console.log(line);
    }
    console.log("");
  }
};

const writeTranscripts = async (report: EvalReport, path: string) => {
  const lines: string[] = [];
  lines.push(`Eval Transcripts - ${new Date().toISOString()}`);
  lines.push(`=${'='.repeat(60)}`);
  lines.push("");

  for (const suite of report.suites) {
    for (const scenario of suite.scenarios) {
      if (scenario.transcript && scenario.transcript.length > 0) {
        lines.push(`## ${scenario.suite}/${scenario.id} [${scenario.status.toUpperCase()}]`);
        lines.push(`Name: ${scenario.name}`);
        if (scenario.details) lines.push(`Details: ${scenario.details}`);
        lines.push("-".repeat(40));
        for (const turn of scenario.transcript) {
          const prefix = turn.role === "user" ? "USER" : "AGENT";
          lines.push(`${prefix}: ${turn.content}`);
        }
        lines.push("");
        lines.push("");
      }
    }
  }

  await Bun.write(path, lines.join("\n"));
  console.log(`📝 Transcripts saved to: ${path}`);
};

const main = async () => {
  const { config, json, transcriptsPath } = parseArgs(process.argv.slice(2));

  // Default to error log level to reduce noise, unless verbose is requested.
  // This must be set before importing runner (which imports core logger).
  if (!config.verbose) {
    process.env.LOG_LEVEL = "error";
  }

  const { runEvals } = await import("./runner");
  
  console.log("\n🏌️ Tee Time Agent Evals");
  console.log("========================");
  console.log(`Suites: ${config.suites.join(", ")}`);
  console.log(`Seed: ${config.seed}`);
  if (transcriptsPath) {
    console.log(`Transcripts: ${transcriptsPath}`);
  }
  console.log("");
  
  const report = await runEvals(config);
  printReport(report, json);

  if (transcriptsPath) {
    await writeTranscripts(report, transcriptsPath);
  }
  
  if (report.totals.failed > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error("Eval run failed:", error);
  process.exitCode = 1;
});
