import React, { useEffect, useRef } from "react";
import HeaderBar from "./components/HeaderBar";
import Workspace from "./components/Workspace";
import { useStore } from "./store/useStore";
import { pickFolder, scanDirectory } from "./lib/tauriApi";

export default function App(): React.ReactElement {
  const themeMode = useStore((s) => s.themeMode);
  const targetPath = useStore((s) => s.targetPath);
  const setTargetPath = useStore((s) => s.setTargetPath);
  const setDirectoryInfo = useStore((s) => s.setDirectoryInfo);
  const setError = useStore((s) => s.setError);
  const setStatus = useStore((s) => s.setStatus);
  const bootedRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-dark", themeMode === "dark");
  }, [themeMode]);

  useEffect(() => {
    if (bootedRef.current || targetPath) return;

    bootedRef.current = true;

    const chooseFolder = async () => {
      try {
        setStatus("Selecting folder...");
        const path = (await pickFolder()) as string | null;

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
        setError(error instanceof Error ? error.message : "Failed to select a folder.");
        setStatus("Ready");
      }
    };

    chooseFolder();
  }, [setDirectoryInfo, setError, setStatus, setTargetPath, targetPath]);

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-5 md:p-6">
        <HeaderBar />
        <Workspace />
      </div>
    </div>
  );
}
