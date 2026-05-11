import React, { useEffect, ReactElement } from "react";
import PreviewSection from "./PreviewSection";

interface ReviewModalProps {
  visible: boolean;
  mode?: "preview" | "execute";
  onClose: () => void;
  onConfirm?: () => void;
  onRefresh?: () => Promise<void>;
}

export default function ReviewModal({
  visible,
  mode = "preview",
  onClose,
  onConfirm,
  onRefresh,
}: ReviewModalProps): ReactElement | null {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
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
        className="relative w-[min(1200px,96%)] max-h-[90vh] overflow-hidden rounded-2xl bg-[var(--panel)] p-4 shadow-lg"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold">{mode === "execute" ? "Review changes" : "Preview changes"}</h3>
            <p className="text-xs text-secondary">
              {mode === "execute"
                ? "Inspect the proposed changes before confirming."
                : "Inspect the current preview in a popup without applying changes."}
            </p>
          </div>
        </div>

        <div className="mt-3 max-h-[72vh] overflow-auto rounded-md border border-[var(--border)] bg-[var(--panel-muted)] p-3 text-sm">
          <PreviewSection onRefresh={onRefresh} />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm">
            {mode === "execute" ? "Cancel" : "Close"}
          </button>
          {onConfirm ? (
            <button onClick={onConfirm} className="btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm">
              Confirm and Apply
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
