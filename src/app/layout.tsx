import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SyncButton } from "@/components/SyncButton";

export const metadata: Metadata = {
  title: "Money Tracker",
  description: "Personal finance dashboard across all your accounts",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/accounts", label: "Accounts" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <div className="flex items-center gap-8">
                <Link href="/" className="text-lg font-bold tracking-tight">
                  💰 Money Tracker
                </Link>
                <nav className="flex gap-1">
                  {NAV.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      className="rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-slate-100 hover:text-ink"
                    >
                      {n.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <SyncButton />
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
