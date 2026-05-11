import React, { ReactElement, SyntheticEvent } from "react";
import { Bot, FolderOpen, MoonStar, Workflow } from "lucide-react";
import { useStore } from "../store/useStore";
import { pickFolder, scanDirectory, startWindowDrag } from "../lib/tauriApi";
import { getErrorMessage } from "../lib/errors";
import WindowControls from "./WindowControls";

export default function HeaderBar(): ReactElement {
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const workspaceMode = useStore((s) => s.workspaceMode);
  const setWorkspaceMode = useStore((s) => s.setWorkspaceMode);
  const targetPath = useStore((s) => s.targetPath);
  const setTargetPath = useStore((s) => s.setTargetPath);
  const setDirectoryInfo = useStore((s) => s.setDirectoryInfo);
  const setError = useStore((s) => s.setError);
  const setStatus = useStore((s) => s.setStatus);
  const themeMode = useStore((s) => s.themeMode);
  const toggleThemeMode = useStore((s) => s.toggleThemeMode);

  const handleChangeFolder = async (): Promise<void> => {
    try {
      setError("");
      setStatus("Selecting folder...");
      const path = await pickFolder();

      if (!path) {
        setStatus("Ready");
        return;
      }

      setTargetPath(path);
      const info = await scanDirectory(path);
      setDirectoryInfo({
        fileCount: info.file_count,
        lastScannedAt: new Date().toISOString(),
      });
      setStatus("Folder selected");
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to select a folder."));
      setStatus("Ready");
    }
  };

  const folderLabel = targetPath ? targetPath.replace(/[\\/]+$/, "") : "No folder selected";

  const handleTitleBarMouseDown = async (event: SyntheticEvent<HTMLDivElement>): Promise<void> => {
    const evt = event as React.MouseEvent<HTMLDivElement>;
    if (evt.button !== 0) return;
    if ((evt.target as HTMLElement).closest("button")) return;

    try {
      await startWindowDrag();
    } catch {
      // Ignore; the CSS drag region is still present as a fallback.
    }
  };

  return (
    <header className="surface rounded-3xl px-5 py-4 backdrop-blur">
      <div className="flex flex-col gap-4">
        {/* Title bar: draggable area + window controls */}
        <div className="flex items-start justify-between gap-4">
          <div
            className="flex min-w-0 flex-1 items-center gap-3 select-none cursor-grab active:cursor-grabbing"
            data-tauri-drag-region
            onMouseDown={handleTitleBarMouseDown}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--panel-muted)] text-[var(--accent)] ring-1 ring-[var(--border)]">
              <Workflow size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">AI File Manager</h1>
              <p className="text-sm text-secondary">Select, filter, preview, and execute file workflows.</p>
            </div>
          </div>
          <WindowControls />
        </div>

        {/* Action rows: Status, Folder, Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="chip rounded-full px-3 py-1 text-sm">{status}</span>
          <span
            className="
              inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs
              bg-[var(--panel-muted)] text-[var(--text-secondary)]
              border border-[var(--border)] mono max-w-xs truncate
              transition-colors duration-150 hover:text-[var(--text-main)]
            "
            title={folderLabel}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0"></span>
            <code className="truncate">{folderLabel}</code>
          </span>
          <button
            onClick={handleChangeFolder}
            className="btn-secondary inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition hover:opacity-90"
          >
            <FolderOpen size={15} />
            Change folder
          </button>
          <button
            onClick={() => setWorkspaceMode(workspaceMode === "ui" ? "ai" : "ui")}
            className="btn-ghost inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition hover:opacity-90"
          >
            <Bot size={15} />
            {workspaceMode === "ui" ? "AI mode" : "UI mode"}
          </button>
          <button
            onClick={toggleThemeMode}
            className="btn-ghost ml-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition hover:opacity-90"
          >
            <MoonStar size={15} />
            {themeMode === "dark" ? "Light" : "Dark"}
          </button>
        </div>

        {/* Error bar */}
        {error && (
          <div className="rounded-2xl border border-red-900/30 bg-red-900/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    </header>
  );
}
