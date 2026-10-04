import "./env";
import { tick } from "../lib/worker";
import { db } from "../lib/db";
let running = true;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    running = false;
  });
console.log("Worker running: previews, ZIPs, cleanup, expiry and outbox.");
while (running) {
  try {
    await tick();
  } catch {
    console.error("Worker tick failed; inspect integration health.");
  }
  await new Promise((r) => setTimeout(r, 1500));
}
await db.end();
