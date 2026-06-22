"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function sync() {
    setLoading(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={sync}
      disabled={loading}
      className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
    >
      {loading ? "Syncing…" : "↻ Refresh"}
    </button>
  );
}
