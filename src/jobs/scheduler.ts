import cron from "node-cron";
import { checkRefundDeadlines } from "./refundDeadlineChecker.job";
import { processScheduledRefunds } from "./refundProcessor.job";

export function startScheduler() {
  // every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      await checkRefundDeadlines();
    } catch (err) {
      console.error("refundDeadlineChecker job failed:", err);
    }
  });

  cron.schedule("*/15 * * * *", async () => {
    try {
      await processScheduledRefunds();
    } catch (err) {
      console.error("refundProcessor job failed:", err);
    }
  });

  console.log("Scheduler started — refund jobs running every 15 minutes");
}


