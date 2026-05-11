import React, { useEffect, ReactElement } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Action } from "../store/useStore";

function describeAction(action: Action): string {
  const type = action?.type || "rename";

  if (type === "rename") {
    if ((action.renameMode || "replace") === "template") {
      return `rename · template · ${action.value || "(empty)"}`;
    }

    return `rename · ${action.find || "(find)"} → ${action.replace || "(replace)"}`;
  }

  if (type === "move" || type === "copy") {
    return `${type} · ${action.value || "(destination folder)"}`;
  }

  if (type === "delete") {
    return "delete";
  }

  return type;
}

interface ActionReorderModalProps {
  visible: boolean;
  actions?: Action[];
  onClose: () => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export default function ActionReorderModal({
  visible,
  actions = [],
  onClose,
  onMoveUp,
  onMoveDown,
}: ActionReorderModalProps): ReactElement | null {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };

    if (visible) {
      window.addEventListener("keydown", handleKey);
    }

    return () => window.removeEventListener("keydown", handleKey);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-[min(760px,94%)] max-h-[85vh] overflow-hidden rounded-2xl bg-[var(--panel)] p-4 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Reorder actions</h3>
            <p className="text-xs text-secondary">Use the arrows to change the order. Top to bottom is the execution order.</p>
          </div>
          <button onClick={onClose} className="btn-ghost rounded-md px-2 py-1 text-sm">
            Close
          </button>
        </div>

        <div className="mt-3 max-h-[68vh] space-y-2 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] p-3">
          {actions.length ? (
            actions.map((action, index) => (
              <div
                key={action.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted">{index + 1}</div>
                  <div className="truncate text-sm font-medium text-[var(--text-main)]">{describeAction(action)}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onMoveUp(index)}
                    disabled={index === 0}
                    className="btn-ghost inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Move action ${index + 1} up`}
                  >
                    <ArrowUp size={16} />
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveDown(index)}
                    disabled={index === actions.length - 1}
                    className="btn-ghost inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Move action ${index + 1} down`}
                  >
                    <ArrowDown size={16} />
                    Down
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel)] px-4 py-8 text-sm text-secondary">
              No actions yet.
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost rounded-md px-4 py-2 text-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
