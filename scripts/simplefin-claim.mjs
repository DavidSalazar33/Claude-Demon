// Exchange a SimpleFIN *setup token* for a long-lived *access URL*.
//
//   npm run simplefin:claim <setup-token>
//
// Get a setup token from https://bridge.simplefin.org (My Account -> create a
// new app/token). The returned access URL embeds basic-auth credentials and is
// what you store in .env as SIMPLEFIN_ACCESS_URL.

const token = process.argv[2];
if (!token) {
  console.error("Usage: npm run simplefin:claim <setup-token>");
  process.exit(1);
}

// Setup tokens are base64-encoded claim URLs.
let claimUrl;
try {
  claimUrl = Buffer.from(token, "base64").toString("utf8").trim();
  new URL(claimUrl);
} catch {
  console.error("That doesn't look like a valid SimpleFIN setup token (base64 URL).");
  process.exit(1);
}

const res = await fetch(claimUrl, { method: "POST" });
const body = (await res.text()).trim();

if (!res.ok || !body.startsWith("http")) {
  console.error(`Claim failed (${res.status}). Response:\n${body.slice(0, 300)}`);
  console.error("\nNote: setup tokens are single-use. Generate a fresh one if already claimed.");
  process.exit(1);
}

console.log("\nAccess URL (add this to your .env):\n");
console.log(`SIMPLEFIN_ACCESS_URL="${body}"`);
console.log(`FINANCIAL_PROVIDER="simplefin"\n`);
