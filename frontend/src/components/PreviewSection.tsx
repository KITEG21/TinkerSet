import React, { ReactElement } from "react";
import { Filter, RefreshCw } from "lucide-react";
import { useStore } from "../store/useStore";

interface PreviewSectionProps {
  onRefresh?: () => Promise<void>;
}

export default function PreviewSection({ onRefresh }: PreviewSectionProps): ReactElement {
  const preview = useStore((s) => s.preview);
  const previewMode = useStore((s) => s.previewMode);
  const setPreviewMode = useStore((s) => s.setPreviewMode);
  const isLoading = useStore((s) => s.isLoading);
  const actions = useStore((s) => s.actions);

  const items = previewMode === "matched" ? preview.filter((item) => item.status !== "ignored") : preview;
  const hasDestinationActions = actions.some((action) => action.type === "move" || action.type === "copy");

  return (
    <section className="card space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-main)]">Preview</h2>
          <p className="text-xs text-secondary">Show before and after filenames, match states, and errors.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            className="btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition hover:opacity-90"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => setPreviewMode(previewMode === "matched" ? "all" : "matched")}
            className="btn-ghost inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition hover:opacity-90"
          >
            <Filter size={16} />
            {previewMode === "matched" ? "Show all" : "Matched only"}
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] px-4 py-8 text-sm text-secondary">
            Loading preview...
          </div>
        ) : items.length > 0 ? (
          items.map((item, index) => (
            <div
              key={index}
              className="rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] p-2 text-xs"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-block px-2 py-1 rounded text-[10px] font-semibold ${
                    item.status === "matched"
                      ? "bg-green-900/30 text-green-300"
                      : item.status === "error"
                        ? "bg-red-900/30 text-red-300"
                        : "bg-slate-700/30 text-slate-300"
                  }`}
                >
                  {item.status || "unknown"}
                </span>
                <code className="flex-1 truncate text-slate-400">{item.original_name || item.name || "Unknown"}</code>
                {item.final_name && (
                  <>
                    <span className="text-slate-600">→</span>
                    <code className="flex-1 truncate text-slate-200">{item.final_name}</code>
                  </>
                )}
              </div>
              {hasDestinationActions && item.destination && (
                <div className="mt-1 text-[10px] text-slate-500">
                  Destination: <code>{item.destination}</code>
                </div>
              )}
              {item.error && (
                <div className="mt-1 text-[10px] text-red-400">
                  Error: {item.error}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] px-4 py-8 text-sm text-secondary">
            No items to preview. Select a folder and filters to see results.
          </div>
        )}
      </div>
    </section>
  );
}
