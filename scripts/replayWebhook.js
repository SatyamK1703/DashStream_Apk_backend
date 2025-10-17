/*
Simple webhook replay tool for Razorpay-style HMAC-SHA256 signature.
Usage:
  node scripts/replayWebhook.js <webhookUrl> <webhookSecret> <payloadFile>
Example:
  node scripts/replayWebhook.js http://localhost:5000/api/payments/webhook "DashSteam_App" ./tests/sample-webhook.json
*/
import fs from "fs";
import crypto from "crypto";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error(
      "Usage: node scripts/replayWebhook.js <webhookUrl> <webhookSecret> <payloadFile>"
    );
    process.exit(1);
  }
  const [url, secret, payloadFile] = args;
  const payload = fs.readFileSync(payloadFile, "utf8");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  console.log("Posting to", url);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": signature,
    },
    body: payload,
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response body:", text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
