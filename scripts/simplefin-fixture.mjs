// Local stand-in for the SimpleFIN Bridge: serves a real-format AccountSet on
// GET /simplefin/accounts so we can exercise the SimpleFinProvider end-to-end.
import { createServer } from "http";

const DAY = 86400;
const now = Math.floor(Date.now() / 1000);
const monthsBack = 7;
let tid = 0;
const txn = (posted, amount, payee, description) => ({
  id: `sfin-txn-${tid++}`,
  posted,
  amount: amount.toFixed(2),
  description: description ?? payee,
  payee,
});

function monthly(accTxns, day, amount, payee, jitter = 0) {
  for (let m = 0; m <= monthsBack; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    d.setDate(day);
    const posted = Math.floor(d.getTime() / 1000);
    if (posted > now || posted < now - monthsBack * 31 * DAY) continue;
    const amt = jitter ? amount * (1 + (Math.random() - 0.5) * 2 * jitter) : amount;
    accTxns.push(txn(posted, amt, payee));
  }
}

const checking = [];
const card = [];

// Income (biweekly) + bills on checking
for (let p = now; p > now - monthsBack * 30 * DAY; p -= 14 * DAY)
  checking.push(txn(p, 3200, "Acme Corp Payroll", "ACME CORP PAYROLL DIRECT DEP"));
monthly(checking, 1, -2150, "Skyview Apartments");
monthly(checking, 9, -88, "City Power & Electric", 0.2);
monthly(checking, 13, -74.99, "Comcast Xfinity");

// Subscriptions + discretionary on card
monthly(card, 4, -15.49, "Netflix");
monthly(card, 6, -11.99, "Spotify Premium");
monthly(card, 2, -39, "Iron Peak Fitness");
monthly(card, 21, -20, "OpenAI ChatGPT Plus");
const merchants = ["Whole Foods Market", "Trader Joe's", "Starbucks", "Chipotle", "Amazon", "Uber", "Shell Gas", "Target"];
for (let p = now; p > now - monthsBack * 30 * DAY; p -= DAY) {
  if (Math.random() < 0.7) {
    const m = merchants[Math.floor(Math.random() * merchants.length)];
    card.push(txn(p, -(5 + Math.random() * 120), m));
  }
}

const accountSet = {
  errors: [],
  accounts: [
    {
      org: { domain: "northbank.com", name: "Northbank" },
      id: "sfin-checking",
      name: "Everyday Checking",
      currency: "USD",
      balance: "6210.44",
      "available-balance": "6210.44",
      "balance-date": now,
      transactions: checking,
    },
    {
      org: { domain: "northbank.com", name: "Northbank" },
      id: "sfin-savings",
      name: "High-Yield Savings",
      currency: "USD",
      balance: "19800.00",
      "available-balance": "19800.00",
      "balance-date": now,
      transactions: [],
    },
    {
      org: { domain: "skyline.com", name: "Skyline" },
      id: "sfin-card",
      name: "Skyline Visa Credit Card",
      currency: "USD",
      balance: "1142.88",
      "available-balance": "8857.12",
      "balance-date": now,
      transactions: card,
    },
  ],
};

const server = createServer((req, res) => {
  if (req.url.includes("/accounts")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(accountSet));
  } else {
    res.writeHead(404);
    res.end("not found");
  }
});
server.listen(4000, () => console.log("SimpleFIN fixture on http://localhost:4000/simplefin"));
