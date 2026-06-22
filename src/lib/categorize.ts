// Rule-based transaction categorization.
//
// Deliberately simple and dependency-free: a keyword -> category map applied to
// the merchant/description. This keeps categorization fast, free, and fully
// local. When you connect Plaid, you can prefer Plaid's `personal_finance_category`
// and fall back to these rules (see lib/providers/plaidProvider.ts).

export const CATEGORIES = [
  "Income",
  "Rent & Mortgage",
  "Utilities",
  "Groceries",
  "Dining",
  "Transport",
  "Shopping",
  "Subscriptions",
  "Entertainment",
  "Health",
  "Travel",
  "Transfers",
  "Fees",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Stable display colors (used by charts and badges).
export const CATEGORY_COLORS: Record<Category, string> = {
  Income: "#16a34a",
  "Rent & Mortgage": "#7c3aed",
  Utilities: "#0891b2",
  Groceries: "#65a30d",
  Dining: "#ea580c",
  Transport: "#2563eb",
  Shopping: "#db2777",
  Subscriptions: "#9333ea",
  Entertainment: "#c026d3",
  Health: "#dc2626",
  Travel: "#0d9488",
  Transfers: "#475569",
  Fees: "#b45309",
  Other: "#94a3b8",
};

// First matching rule wins, so order matters (most specific first).
const RULES: Array<{ category: Category; keywords: string[] }> = [
  { category: "Income", keywords: ["payroll", "salary", "direct dep", "deposit", "interest paid", "refund"] },
  { category: "Rent & Mortgage", keywords: ["rent", "mortgage", "landlord", "property mgmt"] },
  {
    category: "Subscriptions",
    keywords: ["netflix", "spotify", "hulu", "disney+", "youtube premium", "icloud", "google one", "dropbox", "notion", "github", "openai", "anthropic", "audible", "nytimes", "patreon", "membership"],
  },
  {
    category: "Utilities",
    keywords: ["electric", "power", "water", "gas company", "comcast", "xfinity", "verizon", "at&t", "t-mobile", "internet", "utility"],
  },
  {
    category: "Groceries",
    keywords: ["whole foods", "trader joe", "safeway", "kroger", "aldi", "costco", "grocery", "supermarket", "wegmans", "publix"],
  },
  {
    category: "Dining",
    keywords: ["starbucks", "mcdonald", "chipotle", "restaurant", "cafe", "coffee", "doordash", "uber eats", "grubhub", "pizza", "bar &", "tavern", "diner"],
  },
  {
    category: "Transport",
    keywords: ["uber", "lyft", "shell", "chevron", "exxon", "bp ", "gas station", "parking", "transit", "metro", "toll", "car wash"],
  },
  {
    category: "Travel",
    keywords: ["airlines", "delta", "united", "southwest", "airbnb", "hotel", "marriott", "hilton", "expedia", "booking.com", "rental car"],
  },
  {
    category: "Health",
    keywords: ["pharmacy", "cvs", "walgreens", "clinic", "dental", "doctor", "hospital", "gym", "fitness", "peloton"],
  },
  {
    category: "Entertainment",
    keywords: ["cinema", "movie", "theater", "steam", "playstation", "xbox", "nintendo", "concert", "ticketmaster", "spotify live"],
  },
  {
    category: "Shopping",
    keywords: ["amazon", "target", "walmart", "best buy", "apple store", "ikea", "etsy", "ebay", "nike", "store", "shop"],
  },
  { category: "Transfers", keywords: ["transfer", "venmo", "zelle", "paypal", "withdrawal", "atm"] },
  { category: "Fees", keywords: ["fee", "overdraft", "service charge", "interest charged", "atm fee"] },
];

export function categorize(description: string, amount?: number): Category {
  const text = description.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.category;
  }
  // Unmatched positive amounts are most likely income.
  if (typeof amount === "number" && amount > 0) return "Income";
  return "Other";
}
