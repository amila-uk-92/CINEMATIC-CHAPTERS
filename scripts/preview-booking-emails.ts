import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "node:http";
import { bookingEmail } from "../lib/booking-email";

const directory = resolve(".data/email-previews");
await mkdir(directory, { recursive: true });
const sample = {
  name: "Alex",
  package: "Together Chapters",
  start: "2026-10-24T13:00:00Z",
  location: "Abbey Park, Leicester (to be agreed)",
  price: 17500,
  duration: 90,
};
for (const [kind, file] of [
  ["booking-pending", "booking-request.html"],
  ["booking-confirmed", "booking-confirmation.html"],
] as const) {
  const email = bookingEmail(kind, sample, "Cinematic Chapters", "cinematic.chapters.uk@gmail.com", "http://127.0.0.1:3031");
  await writeFile(resolve(directory, file), email.html);
  await writeFile(resolve(directory, file.replace(".html", ".txt")), email.plain);
}
await writeFile(resolve(directory, "index.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Booking email previews</title><body style="background:#f1ece3;color:#29241d;font:16px Arial;padding:24px"><h1>Cinematic Chapters email previews</h1><p>Fictional examples for design review. No emails have been sent.</p><div style="display:flex;gap:24px;flex-wrap:wrap"><section><h2 style="font-size:18px"><a href="/booking-request.html">Booking acknowledgement</a></h2><iframe title="Booking acknowledgement at mobile width" src="/booking-request.html" width="390" height="950" style="max-width:100%;border:1px solid #c8ad7f"></iframe></section><section><h2 style="font-size:18px"><a href="/booking-confirmation.html">Booking confirmation</a></h2><iframe title="Booking confirmation at mobile width" src="/booking-confirmation.html" width="390" height="950" style="max-width:100%;border:1px solid #c8ad7f"></iframe></section></div></body></html>`);
console.log(`Email previews saved to ${directory}`);
if (process.argv.includes("--serve")) {
  const allowed = new Set(["index.html", "booking-request.html", "booking-confirmation.html"]);
  const assets = new Map([
    ["/email/chapter-header.png", "image/png"],
    ["/email/chapter-footer.png", "image/png"],
    ["/fonts/BarlowCondensed-Regular.ttf", "font/ttf"],
    ["/fonts/BarlowCondensed-Bold.ttf", "font/ttf"],
  ]);
  createServer(async (request, response) => {
    if (request.url && assets.has(request.url)) {
      response.setHeader("Content-Type", assets.get(request.url)!);
      response.end(await readFile(resolve("public", request.url.slice(1))));
      return;
    }
    const file = request.url === "/" ? "index.html" : request.url?.slice(1);
    if (!file || !allowed.has(file)) { response.writeHead(404).end(); return; }
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(await readFile(resolve(directory, file)));
  }).listen(3031, "127.0.0.1", () => console.log("Preview: http://127.0.0.1:3031"));
}
