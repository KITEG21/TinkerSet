import React, { ReactElement } from "react";
import { Check, Play, Sparkles } from "lucide-react";
import { useStore } from "../store/useStore";

interface ExecutionBarProps {
  onPreview?: (openModal?: boolean) => Promise<void>;
  onExecute?: () => Promise<void>;
}

export default function ExecutionBar({ onPreview, onExecute }: ExecutionBarProps): ReactElement {
  const targetPath = useStore((s) => s.targetPath);

  const handleExecute = async (): Promise<void> => {
    if (onExecute) {
      await onExecute();
    }
  };

  return (
    <section className="card space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-main)]">Execution</h2>
          <p className="text-xs text-secondary">Preview, execute, and confirmation controls.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onPreview && onPreview(true)}
          disabled={!targetPath}
          className="btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles size={16} />
          Preview
        </button>
        <button
          onClick={handleExecute}
          disabled={!targetPath}
          className="btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={16} />
          Execute
        </button>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-2 text-sm text-secondary">
          <Check className="mr-2 inline-block text-[var(--success)]" size={16} />
          ConfirmationModal: enabled
        </div>
      </div>
    </section>
  );
}
