#!/usr/bin/env bun
import { runEvals, type EvalConfig, type EvalReport } from "./runner";

const DEFAULT_COUNTS = {
  booking: 20,
  faq: 20,
  fallback: 10,
  updates: 10,
};

const parseArgs = (args: string[]) => {
  const config: EvalConfig = {
    suites: ["booking", "faq", "fallback", "updates"],
    counts: { ...DEFAULT_COUNTS },
    seed: Date.now(),
    verbose: false,
    allowFaqEscalation: false,
    notify: false,
  };
  let json = false;

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
    if (arg === "--faq") {
      config.counts.faq = Number(args[i + 1] ?? DEFAULT_COUNTS.faq);
      i += 1;
      continue;
    }
    if (arg === "--fallback") {
      config.counts.fallback = Number(
        args[i + 1] ?? DEFAULT_COUNTS.fallback
      );
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
    if (arg === "--notify") {
      config.notify = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return { config, json };
};

const printHelp = () => {
  console.log(`Usage: bun --filter @tee-time/evals run [options]

Options:
  --suite booking,faq,fallback,updates  Run specific suites (comma-separated)
  --booking <n>                         Booking scenarios (default: 20)
  --faq <n>                             FAQ scenarios (default: 20)
  --fallback <n>                        Fallback scenarios (default: 10)
  --updates <n>                         Update scenarios (default: 10)
  --seed <n>                            Shuffle seed (default: now)
  --allow-faq-escalation                Treat FAQ escalations as pass
  --notify                              Allow Slack notifications during evals
  --json                                Output JSON report
  --help                                Show help
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

const printReport = (report: EvalReport, json: boolean) => {
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("\nEvals Report");
  console.log(`Duration: ${(report.durationMs / 1000).toFixed(1)}s`);
  for (const suite of report.suites) {
    console.log(formatSuiteLine(suite));
  }

  const failures = report.suites.flatMap((suite) =>
    suite.scenarios.filter((scenario) => scenario.status === "fail")
  );
  if (failures.length > 0) {
    console.log("\nFailures");
    for (const failure of failures) {
      const detail = failure.details ? ` - ${failure.details}` : "";
      console.log(`- ${failure.suite}/${failure.id}${detail}`);
    }
  }

  const skipped = report.suites.flatMap((suite) =>
    suite.scenarios.filter((scenario) => scenario.status === "skip")
  );
  if (skipped.length > 0) {
    console.log("\nSkipped");
    for (const skip of skipped) {
      const detail = skip.details ? ` - ${skip.details}` : "";
      console.log(`- ${skip.suite}/${skip.id}${detail}`);
    }
  }
};

const main = async () => {
  const { config, json } = parseArgs(process.argv.slice(2));
  const report = await runEvals(config);
  printReport(report, json);
  if (report.totals.failed > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error("Eval run failed:", error);
  process.exitCode = 1;
});
