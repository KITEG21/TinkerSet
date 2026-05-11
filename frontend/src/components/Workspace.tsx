import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactElement,
} from "react";
import ReviewModal from "./ReviewModal";
import FiltersSection from "./FiltersSection";
import ActionsSection from "./ActionsSection";
import ExecutionBar from "./ExecutionBar";
import AIAssistant from "./AIAssistant";
import DirectorySection from "./DirectorySection";
import { useStore } from "../store/useStore";
import { buildBackendJob, executeJob, previewJob } from "../lib/tauriApi";

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function Workspace(): ReactElement {
  const targetPath = useStore((s) => s.targetPath);
  const workspaceMode = useStore((s) => s.workspaceMode);
  const filters = useStore((s) => s.filters);
  const actions = useStore((s) => s.actions);
  const setPreview = useStore((s) => s.setPreview);
  const setLoading = useStore((s) => s.setLoading);
  const setError = useStore((s) => s.setError);
  const setStatus = useStore((s) => s.setStatus);
  const isLoading = useStore((s) => s.isLoading);
  const lastAutoPreviewKey = useRef("");

  const job = useMemo(
    () => buildBackendJob({ path: targetPath, filters, actions }),
    [targetPath, filters, actions]
  );

  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewMode, setReviewMode] = useState<"preview" | "execute">("preview");

  const handlePreview = useCallback(
    async (openModal: boolean = false): Promise<void> => {
      if (!targetPath) {
        setError("Select a target folder first.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        setStatus("Building preview...");
        const result = await previewJob(job);
        setPreview(result);
        setStatus("Preview ready");

        if (openModal) {
          setReviewMode("preview");
          setReviewVisible(true);
        }
      } catch (error) {
        setError(getErrorMessage(error, "Failed to build preview."));
        setStatus("Ready");
      } finally {
        setLoading(false);
      }
    },
    [job, targetPath, setError, setLoading, setPreview, setStatus]
  );

  const handleExecute = useCallback(async (): Promise<void> => {
    if (!targetPath) {
      setError("Select a target folder first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setStatus("Building review preview...");
      const result = await previewJob(job);
      setPreview(result);
      setReviewMode("execute");
      setReviewVisible(true);
      setStatus("Review ready");
    } catch (error) {
      setError(getErrorMessage(error, "Failed to build preview."));
      setStatus("Ready");
    } finally {
      setLoading(false);
    }
  }, [job, targetPath, setError, setLoading, setPreview, setStatus]);

  const confirmExecute = useCallback(async (): Promise<void> => {
    setReviewVisible(false);
    try {
      setLoading(true);
      setError("");
      setStatus("Applying changes...");
      const result = await executeJob(job);
      setPreview(result);
      setStatus("Changes applied");
    } catch (error) {
      setError(getErrorMessage(error, "Failed to apply changes."));
      setStatus("Ready");
    } finally {
      setLoading(false);
    }
  }, [job, setError, setLoading, setPreview, setStatus]);

  useEffect(() => {
    if (!targetPath || isLoading) return;

    const previewKey = JSON.stringify({ targetPath, filters, actions });
    if (lastAutoPreviewKey.current === previewKey) return;

    const timeoutId = window.setTimeout(() => {
      lastAutoPreviewKey.current = previewKey;
      handlePreview();
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [targetPath, filters, actions, isLoading, handlePreview]);

  return (
    <main className="space-y-4">
      {workspaceMode === "ui" ? (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-4">
            <DirectorySection />
            <FiltersSection />
            <ActionsSection />
          </div>

          <div className="space-y-4 xl:col-span-8">
            <ExecutionBar onPreview={handlePreview} onExecute={handleExecute} />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-4">
            <AIAssistant />
          </div>

          <div className="space-y-4 xl:col-span-8">
            <div className="card space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-main)]">AI workflow preview</h2>
              <p className="text-sm text-secondary">Generate filters and actions first, then switch to UI mode to fine-tune them.</p>
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-4 text-sm text-secondary">
                AI mode does not execute changes directly.
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewVisible ? (
        <ReviewModal
          visible={reviewVisible}
          mode={reviewMode}
          onClose={() => setReviewVisible(false)}
          onConfirm={reviewMode === "execute" ? confirmExecute : undefined}
          onRefresh={() => handlePreview(true)}
        />
      ) : null}
    </main>
  );
}
