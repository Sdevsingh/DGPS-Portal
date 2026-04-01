"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type ClearResult = {
  status: string;
  clearedMessages: number;
  clearedThreads: number;
  note: string;
};

type ReseedResult = {
  status: string;
  note: string;
};

type TabResult = {
  updated: boolean;
  addedColumns: string[];
  clearedRows?: number;
};

type MigrateResult = {
  status: string;
  results: Record<string, TabResult>;
  note: string;
};

export default function MigratePage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MigrateResult | null>(null);
  const [error, setError] = useState("");

  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<ClearResult | null>(null);
  const [clearError, setClearError] = useState("");

  const [reseedConfirm, setReseedConfirm] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const [reseedResult, setReseedResult] = useState<ReseedResult | null>(null);
  const [reseedError, setReseedError] = useState("");

  async function reseedAll() {
    if (!reseedConfirm) {
      setReseedConfirm(true);
      return;
    }
    setReseeding(true);
    setReseedError("");
    setReseedResult(null);
    try {
      const res = await fetch("/api/admin/reseed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setReseedError(data.error ?? "Reseed failed");
        return;
      }
      setReseedResult(data);
      setReseedConfirm(false);
    } catch {
      setReseedError("Network error");
    } finally {
      setReseeding(false);
    }
  }

  async function clearChats() {
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    setClearing(true);
    setClearError("");
    setClearResult(null);
    try {
      const res = await fetch("/api/admin/clear-chats", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setClearError(data.error ?? "Clear failed");
        return;
      }
      setClearResult(data);
      setClearConfirm(false);
    } catch {
      setClearError("Network error");
    } finally {
      setClearing(false);
    }
  }

  async function runMigration() {
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/migrate-sheets", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Migration failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error — check console");
    } finally {
      setRunning(false);
    }
  }

  const tabs = result ? Object.entries(result.results) : [];
  const anyUpdated = tabs.some(([, r]) => r.updated);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Schema Migration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fixes Google Sheets column mismatches between the app&apos;s expected schema and the actual sheet headers.
          Safe to run multiple times — only updates tabs that are out of sync.
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-amber-800">Messages tab: corrupted rows will be cleared</p>
          <p className="text-xs text-amber-700 mt-0.5">
            If the Messages schema is out of sync, all existing chat messages will be deleted — they contain garbled data and cannot be repaired.
            Use <strong>Full Reset &amp; Reseed</strong> below to restore demo data afterwards.
          </p>
        </div>
      </div>

      {/* Run button */}
      <Button
        variant="primary"
        size="lg"
        loading={running}
        onClick={runMigration}
        className="w-full"
      >
        {running ? "Running migration…" : "Run Schema Migration"}
      </Button>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          <div className={`flex items-center gap-2 p-4 rounded-xl border ${anyUpdated ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
            <svg className={`w-5 h-5 shrink-0 ${anyUpdated ? "text-green-600" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className={`text-sm font-semibold ${anyUpdated ? "text-green-800" : "text-gray-700"}`}>
              {anyUpdated ? "Migration complete — schemas updated" : "All schemas already correct — no changes made"}
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Tab</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tabs.map(([tab, r]) => (
                  <tr key={tab} className="bg-white">
                    <td className="px-4 py-3 font-mono text-xs text-gray-800">{tab}</td>
                    <td className="px-4 py-3">
                      {r.updated ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          Updated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.updated && r.addedColumns.length > 0 && (
                        <span>Added columns: <span className="font-mono text-gray-800">{r.addedColumns.join(", ")}</span></span>
                      )}
                      {r.clearedRows !== undefined && r.clearedRows > 0 && (
                        <span className="block text-amber-600">{r.clearedRows} rows cleared</span>
                      )}
                      {!r.updated && "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {anyUpdated && (
            <p className="text-xs text-gray-400 text-center">
              If chat messages were cleared, use <strong>Full Reset &amp; Reseed</strong> below to restore demo data.
            </p>
          )}
        </div>
      )}

      {/* ── Danger Zone ── */}
      <div className="border border-red-200 rounded-xl overflow-hidden">
        <div className="bg-red-50 px-4 py-3 border-b border-red-200">
          <p className="text-sm font-semibold text-red-700">Danger Zone</p>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Clear All Chat Messages</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Deletes all rows in the Messages and ChatThreads tabs. Use this to reset chat data.
              Use <strong>Full Reset &amp; Reseed</strong> below to restore demo data afterwards.
            </p>
          </div>

          {clearConfirm && !clearing && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              This will permanently delete all chat messages and threads. Click again to confirm.
            </div>
          )}

          {clearError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{clearError}</div>
          )}

          {clearResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              ✅ Cleared {clearResult.clearedMessages} messages and {clearResult.clearedThreads} threads.
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="danger"
              size="sm"
              loading={clearing}
              onClick={clearChats}
            >
              {clearConfirm && !clearing ? "⚠️ Confirm — Delete All Chats" : "Clear All Chat Messages"}
            </Button>
            {clearConfirm && !clearing && (
              <button
                type="button"
                onClick={() => setClearConfirm(false)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-red-200 p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Full Reset &amp; Reseed</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Clears ALL tabs (Messages, ChatThreads, Jobs, QuoteItems, Users, Tenants, Attachments, Inspections)
              and restores the original demo data. Use this to fix duplicate records from running seed multiple times.
            </p>
          </div>

          {reseedConfirm && !reseeding && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              This will delete ALL data across all tabs and restore demo data. Click again to confirm.
            </div>
          )}

          {reseedError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{reseedError}</div>
          )}

          {reseedResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              ✅ All tabs cleared and reseeded with demo data.
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="danger"
              size="sm"
              loading={reseeding}
              onClick={reseedAll}
            >
              {reseedConfirm && !reseeding ? "⚠️ Confirm — Full Reset & Reseed" : "Full Reset & Reseed"}
            </Button>
            {reseedConfirm && !reseeding && (
              <button
                type="button"
                onClick={() => setReseedConfirm(false)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
