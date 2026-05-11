import React, { ReactElement } from "react";
import { FileInput, Search } from "lucide-react";
import { useStore } from "../store/useStore";
import { pickFolder as selectFolder } from "../lib/tauriApi";
import { getErrorMessage } from "../lib/errors";

export default function Sidebar(): ReactElement {
  const targetPath = useStore((s) => s.targetPath);
  const setTargetPath = useStore((s) => s.setTargetPath);
  const setError = useStore((s) => s.setError);
  const setStatus = useStore((s) => s.setStatus);

  const handlePickFolder = async (): Promise<void> => {
    try {
      setError("");
      setStatus("Selecting folder...");
      const path = await selectFolder();
      if (path) {
        setTargetPath(path);
        setStatus("Folder selected");
      } else {
        setStatus("Ready");
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to select a folder."));
      setStatus("Ready");
    }
  };

  return (
    <aside className="w-full lg:w-80 flex-shrink-0 space-y-4">
      <div className="card">
        <div className="flex items-center gap-2">
          <FileInput />
          <div>
            <div className="text-sm font-semibold">Target Directory</div>
            <div className="text-xs text-gray-400">Select folder to analyze</div>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-300 break-all">
          {targetPath || "No folder selected yet."}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
            onClick={handlePickFolder}
          >
            Select Folder
          </button>
          <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">
            Refresh
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2">
          <Search />
          <div className="text-sm font-semibold">Filters</div>
        </div>
        <div className="mt-3 text-sm text-gray-400">Generated filters will appear here after you describe the task.</div>
      </div>
    </aside>
  );
}
