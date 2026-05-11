import React, { useState, ReactElement, ChangeEvent } from "react";
import { FolderOpen, Plus, X, ListOrdered } from "lucide-react";
import { useStore, Action } from "../store/useStore";
import { pickFolder } from "../lib/tauriApi";
import ActionReorderModal from "./ActionReorderModal";

const actionTypes = ["rename", "move", "copy", "delete"];

export default function ActionsSection(): ReactElement {
  const actions = useStore((s) => s.actions);
  const addAction = useStore((s) => s.addAction);
  const updateAction = useStore((s) => s.updateAction);
  const removeAction = useStore((s) => s.removeAction);
  const setActions = useStore((s) => s.setActions);
  const [reorderOpen, setReorderOpen] = useState(false);

  const handlePickDestination = async (actionId: string): Promise<void> => {
    const selected = await pickFolder();
    if (selected) {
      updateAction(actionId, { value: selected });
    }
  };

  const renderRenameEditor = (action: Action): ReactElement => {
    const renameMode = action.renameMode || "replace";

    return (
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Rename mode</label>
          <select
            value={renameMode}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              updateAction(action.id, {
                renameMode: event.target.value,
                find: event.target.value === "replace" ? (action.find ?? "") : (action.find ?? ""),
                replace: event.target.value === "replace" ? (action.replace ?? "") : (action.replace ?? ""),
                value: event.target.value === "template" ? (action.value ?? "") : (action.value ?? "1"),
                padding: event.target.value === "number_sequential" ? (action.padding ?? 0) : undefined,
              })
            }
            className="field input-focus w-full rounded-xl px-3 py-2 text-sm"
          >
            <option value="replace">Find and replace text</option>
            <option value="template">Template rename</option>
            <option value="number_sequential">Number sequentially</option>
          </select>
        </div>

        {renameMode === "replace" ? (
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Find</label>
              <input
                value={action.find || ""}
                onChange={(event: ChangeEvent<HTMLInputElement>) => updateAction(action.id, { find: event.target.value })}
                placeholder="One Piece "
                className="field input-focus w-full rounded-xl px-3 py-2 text-sm placeholder:text-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Replace with</label>
              <input
                value={action.replace || ""}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateAction(action.id, { replace: event.target.value })
                }
                placeholder="op "
                className="field input-focus w-full rounded-xl px-3 py-2 text-sm placeholder:text-muted"
              />
            </div>
          </div>
        ) : renameMode === "number_sequential" ? (
          <div className="grid gap-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Start number</label>
                <input
                  type="number"
                  value={action.value || "1"}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateAction(action.id, { value: event.target.value })
                  }
                  min="0"
                  className="field input-focus w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Padding (0 = none)</label>
                <input
                  type="number"
                  value={action.padding ?? 0}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateAction(action.id, { padding: parseInt(event.target.value) || 0 })
                  }
                  min="0"
                  max="10"
                  className="field input-focus w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Prefix (optional)</label>
                <input
                  value={action.prefix || ""}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateAction(action.id, { prefix: event.target.value })
                  }
                  placeholder="e.g. ep_"
                  className="field input-focus w-full rounded-xl px-3 py-2 text-sm placeholder:text-muted"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Suffix (optional)</label>
                <input
                  value={action.suffix || ""}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateAction(action.id, { suffix: event.target.value })
                  }
                  placeholder="e.g. _v2"
                  className="field input-focus w-full rounded-xl px-3 py-2 text-sm placeholder:text-muted"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted">Example: ep_ + 01 + _v2 → "ep_01_v2" (with .ext preserved for files)</p>
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Template</label>
            <input
              value={action.value}
              onChange={(event: ChangeEvent<HTMLInputElement>) => updateAction(action.id, { value: event.target.value })}
              placeholder="e.g. op {name}"
              className="field input-focus w-full rounded-xl px-3 py-2 text-sm placeholder:text-muted"
            />
            <p className="mt-1 text-[11px] text-muted">Use {"{name}"} for the current file name and keep the rest as needed.</p>
          </div>
        )}

        <p className="text-[11px] text-muted">
          Example:{" "}
          {renameMode === "replace"
            ? "One Piece 01.mp4 → op 01.mp4"
            : renameMode === "number_sequential"
              ? "Dragon Ball S1 → ep_01_v2 (with prefix+number+suffix)"
              : "One Piece 01.mp4 → op One Piece 01.mp4"}
        </p>
      </div>
    );
  };

  const moveAction = (fromIndex: number, toIndex: number): void => {
    if (toIndex < 0 || toIndex >= actions.length || fromIndex === toIndex) return;

    const next = [...actions];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setActions(next);
  };

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-main)]">Actions</h2>
          <p className="text-xs text-secondary">Choose what happens to each matched file.</p>
          <p className="mt-1 text-[11px] text-muted">Move and copy use a destination folder and will auto-rename on conflicts.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setReorderOpen(true)}
            className="btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition hover:opacity-90"
          >
            <ListOrdered size={16} />
            Reorder
          </button>
          <button
            onClick={addAction}
            className="btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition hover:opacity-90"
          >
            <Plus size={16} />
            Add action
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {actions.map((action) => (
          <div
            key={action.id}
            className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] p-3 xl:grid-cols-[1fr_1.5fr_auto]"
          >
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Action</label>
              <select
                value={action.type}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  updateAction(action.id, { type: event.target.value })
                }
                className="field input-focus w-full rounded-xl px-3 py-2 text-sm"
              >
                {actionTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">
                {action.type === "move" || action.type === "copy" ? "Destination folder" : "Pattern / value"}
              </label>

              {action.type === "move" || action.type === "copy" ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      value={action.value}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateAction(action.id, { value: event.target.value })
                      }
                      placeholder="Choose a folder"
                      className="field input-focus min-w-0 flex-1 rounded-xl px-3 py-2 text-sm placeholder:text-muted"
                    />
                    <button
                      onClick={() => handlePickDestination(action.id)}
                      className="btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:opacity-90"
                    >
                      <FolderOpen size={16} />
                      Pick folder
                    </button>
                  </div>
                  <p className="text-[11px] text-muted">Existing files in the destination will be auto-renamed to avoid overwriting.</p>
                </div>
              ) : action.type === "rename" ? (
                renderRenameEditor(action)
              ) : (
                <input
                  value={action.value}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateAction(action.id, { value: event.target.value })
                  }
                  placeholder={action.type === "delete" ? "No value needed" : "Value"}
                  className="field input-focus w-full rounded-xl px-3 py-2 text-sm placeholder:text-muted"
                  disabled={action.type === "delete"}
                />
              )}
            </div>

            <div className="flex items-end justify-end">
              <button
                onClick={() => removeAction(action.id)}
                className="btn-ghost inline-flex h-10 items-center justify-center rounded-xl px-3 transition hover:opacity-90"
                aria-label="Remove action"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ActionReorderModal
        visible={reorderOpen}
        actions={actions}
        onClose={() => setReorderOpen(false)}
        onMoveUp={(index) => moveAction(index, index - 1)}
        onMoveDown={(index) => moveAction(index, index + 1)}
      />
    </section>
  );
}
