import React, { useEffect, useRef, useState, ReactElement } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { Maximize2, Minus, Square, X } from "lucide-react";

interface TauriWindow {
  isMaximized(): Promise<boolean>;
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  unmaximize(): Promise<void>;
  close(): Promise<void>;
  onResized(callback: () => void): Promise<() => void>;
  startDragging(): Promise<void>;
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && (isTauri() || Boolean((window as any).__TAURI_INTERNALS__));
}

export default function WindowControls(): ReactElement {
  const [isMaximized, setIsMaximized] = useState(false);
  const windowRef = useRef<TauriWindow | null>(null);
  const windowPromiseRef = useRef<Promise<TauriWindow | null> | null>(null);

  const getWindow = async (): Promise<TauriWindow | null> => {
    if (!isTauriRuntime()) return null;

    if (windowRef.current) {
      return windowRef.current;
    }

    if (!windowPromiseRef.current) {
      windowPromiseRef.current = import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
        const currentWindow = getCurrentWindow() as TauriWindow;
        windowRef.current = currentWindow;
        return currentWindow;
      });
    }

    return windowPromiseRef.current;
  };

  useEffect(() => {
    let mounted = true;
    let unlisten: (() => void) | null = null;

    (async () => {
      const appWindow = await getWindow();
      if (!appWindow || !mounted) return;

      setIsMaximized(await appWindow.isMaximized());

      unlisten = await appWindow.onResized(async () => {
        if (!mounted) return;
        setIsMaximized(await appWindow.isMaximized());
      });
    })();

    return () => {
      mounted = false;
      if (typeof unlisten === "function") {
        unlisten();
      }
    };
  }, []);

  const handleMinimize = async (): Promise<void> => {
    const appWindow = await getWindow();
    if (!appWindow) return;
    await appWindow.minimize();
  };

  const handleMaximize = async (): Promise<void> => {
    const appWindow = await getWindow();
    if (!appWindow) return;

    const maximized = await appWindow.isMaximized();
    if (maximized) {
      await appWindow.unmaximize();
      setIsMaximized(false);
    } else {
      await appWindow.maximize();
      setIsMaximized(true);
    }
  };

  const handleClose = async (): Promise<void> => {
    const appWindow = await getWindow();
    if (!appWindow) return;
    await appWindow.close();
  };

  return (
    <div className="flex items-center gap-2 ml-auto select-none">
      {/* Minimize Button */}
      <button
        type="button"
        onClick={handleMinimize}
        className="
          p-2 rounded-lg
          text-[var(--text-secondary)] hover:text-[var(--text-main)]
          hover:bg-[var(--panel-muted)]
          transition-all duration-200 ease-out
          active:scale-95
        "
        aria-label="Minimize"
        title="Minimize"
      >
        <Minus size={18} />
      </button>

      {/* Maximize/Restore Button */}
      <button
        type="button"
        onClick={handleMaximize}
        className="
          p-2 rounded-lg
          text-[var(--text-secondary)] hover:text-[var(--text-main)]
          hover:bg-[var(--panel-muted)]
          transition-all duration-200 ease-out
          active:scale-95
        "
        aria-label={isMaximized ? "Restore" : "Maximize"}
        title={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? <Square size={18} /> : <Maximize2 size={18} />}
      </button>

      {/* Close Button */}
      <button
        type="button"
        onClick={handleClose}
        className="
          p-2 rounded-lg
          text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-900/20
          transition-all duration-200 ease-out
          active:scale-95
        "
        aria-label="Close"
        title="Close"
      >
        <X size={18} />
      </button>
    </div>
  );
}
