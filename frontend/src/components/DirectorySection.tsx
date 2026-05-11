import React, { ReactElement } from "react";
import { FolderOpen, RefreshCw } from "lucide-react";
import { useStore } from "../store/useStore";
import { pickFolder, scanDirectory } from "../lib/tauriApi";

function formatTime(value: string | null): string {
  if (!value) return "Not scanned yet";
  return new Date(value).toLocaleString();
}

export default function DirectorySection(): ReactElement {
  const targetPath = useStore((s) => s.targetPath);
  const directoryInfo = useStore((s) => s.directoryInfo);
  const setTargetPath = useStore((s) => s.setTargetPath);
  const setDirectoryInfo = useStore((s) => s.setDirectoryInfo);
  const setError = useStore((s) => s.setError);
  const setStatus = useStore((s) => s.setStatus);

  const refreshInfo = async (path: string = targetPath): Promise<void> => {
    if (!path) return;

    try {
      const info = await scanDirectory(path);
      setDirectoryInfo({
        fileCount: info.file_count,
        lastScannedAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to scan directory.");
    }
  };

  const handlePickFolder = async (): Promise<void> => {
    try {
      setError("");
      setStatus("Selecting folder...");
      const path = await pickFolder();
      if (path) {
        setTargetPath(path);
        setStatus("Folder selected");
        await refreshInfo(path);
      } else {
        setStatus("Ready");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to select a folder.");
      setStatus("Ready");
    }
  };

  return (
    <section className="card space-y-4">
      <div className="flex items-center gap-2">
        <FolderOpen className="text-[var(--accent)]" />
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-main)]">Directory</h2>
          <p className="text-xs text-secondary">Select your working folder and scan its files, including child folders.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-muted">Folder path</label>
          <input
            value={targetPath}
            onChange={(event) => setTargetPath(event.target.value)}
            placeholder="Path to your working folder"
            className="field input-focus w-full rounded-2xl px-3 py-2.5 text-sm placeholder:text-muted"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={handlePickFolder}
            className="btn-primary inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-medium transition hover:opacity-90"
          >
            <FolderOpen size={16} />
            Pick folder
          </button>
          <button
            onClick={() => refreshInfo()}
            className="btn-secondary inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm transition hover:opacity-90"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] p-3">
          <div className="text-xs uppercase tracking-wide text-muted">Files</div>
          <div className="mt-1 text-sm">{directoryInfo.fileCount} files</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] p-3">
          <div className="text-xs uppercase tracking-wide text-muted">Last scan time</div>
          <div className="mt-1 text-sm">{formatTime(directoryInfo.lastScannedAt)}</div>
        </div>
      </div>
    </section>
  );
}
