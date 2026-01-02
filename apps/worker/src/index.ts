import { createDb } from "@tee-time/database";
import { logger, runRetentionCleanup, type JobRunnerContext } from "@tee-time/core";
import { runReports, runScheduledJobs } from "./jobs";
import { config } from "./config";

type WorkerTask = {
  name: string;
  everyMs: number;
  run: (context: JobRunnerContext) => Promise<void>;
};

const startIntervalTask = (context: JobRunnerContext, task: WorkerTask) => {
  let running = false;

  const run = async () => {
    if (running) {
      logger.warn("Skipping overlapping worker task", {
        service: "worker",
        task: task.name
      });
      return;
    }

    running = true;
    try {
      await task.run(context);
    } catch (error) {
      logger.error("Worker task failed", {
        service: "worker",
        task: task.name,
        error: (error as Error).message
      });
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(run, task.everyMs);

  return () => clearInterval(timer);
};

const main = async () => {
  const db = createDb();
  const context: JobRunnerContext = { db };



  const tasks: WorkerTask[] = [
    {
      name: "scheduled-jobs",
      everyMs: config.worker.scheduledIntervalMs,
      run: runScheduledJobs
    },
    {
      name: "report-generation",
      everyMs: config.worker.reportsIntervalMs,
      run: runReports
    },
    {
      name: "retention-cleanup",
      everyMs: config.worker.retentionIntervalMs,
      run: async (context) => {
        await runRetentionCleanup(context.db);
      }
    }
  ];

  logger.info("Worker starting", {
    service: "worker",
    tasks: tasks.map((task) => ({ name: task.name, everyMs: task.everyMs }))
  });

  const stopTasks = tasks.map((task) => startIntervalTask(context, task));

  const shutdown = (signal: string) => {
    logger.info("Worker shutting down", { service: "worker", signal });
    stopTasks.forEach((stop) => stop());
    setTimeout(() => process.exit(0), 50);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

void main();
