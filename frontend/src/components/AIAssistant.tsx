import React, { ChangeEvent, ReactElement } from "react";
import { Wand2, CheckCircle2, Loader } from "lucide-react";
import { useStore, Action, Filter } from "../store/useStore";
import { interpretPrompt } from "../lib/tauriApi";
import { getErrorMessage } from "../lib/errors";

export default function AIAssistant(): ReactElement {
  const targetPath = useStore((s) => s.targetPath);
  const prompt = useStore((s) => s.prompt);
  const setPrompt = useStore((s) => s.setPrompt);
  const setJob = useStore((s) => s.setJob);
  const aiSuggestions = useStore((s) => s.aiSuggestions);
  const setAiSuggestions = useStore((s) => s.setAiSuggestions);
  const setLoading = useStore((s) => s.setLoading);
  const setError = useStore((s) => s.setError);
  const setStatus = useStore((s) => s.setStatus);
  const isLoading = useStore((s) => s.isLoading);

  const handleGenerate = async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");
      setStatus("Generating suggestions...");
      const job = await interpretPrompt(prompt, targetPath, { provider: "groq" });
      setAiSuggestions(job);
      setStatus("AI suggestions ready");
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to generate suggestions."));
      setStatus("Ready");
    } finally {
      setLoading(false);
    }
  };

  const applySuggestions = (): void => {
    if (!aiSuggestions) return;
    setJob(aiSuggestions);
    setStatus("Suggestions applied to UI");
  };

  return (
    <section className="card space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 className="text-[var(--accent)]" />
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-main)]">AI assistant</h2>
          <p className="text-xs text-secondary">Only fills the UI; it does not execute.</p>
        </div>
      </div>

      <textarea
        value={prompt}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setPrompt(event.target.value)}
        placeholder="Describe what you want..."
        className="field input-focus min-h-28 w-full resize-none rounded-2xl px-3 py-2 text-sm placeholder:text-muted"
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="
            btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium
            transition-all duration-200 ease-out
            disabled:opacity-75 disabled:cursor-not-allowed
            hover:not-disabled:shadow-lg
          "
          data-loading={isLoading ? "true" : "false"}
        >
          {isLoading ? (
            <>
              <Loader size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 size={16} />
              Generate
            </>
          )}
        </button>
        <button
          onClick={applySuggestions}
          disabled={!aiSuggestions}
          className="btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 hover:scale-105 hover:shadow-md"
        >
          <CheckCircle2 size={16} />
          Apply to UI
        </button>
      </div>

      {aiSuggestions ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] p-3">
            <div className="text-xs uppercase tracking-wide text-muted mb-2">Translation Preview</div>
            <div className="rounded-xl bg-[var(--panel-bg)] p-2 font-mono text-xs text-secondary max-h-48 overflow-y-auto">
              <div className="text-muted mb-1">Filters:</div>
              {(aiSuggestions.filters as Filter[] | undefined)?.length ?? 0 > 0 ? (
                <div className="space-y-1 mb-2">
                  {(aiSuggestions.filters as Filter[])?.map((f: any, i: number) => (
                    <div key={i} className="text-slate-300">
                      • {f.type || f.field}: {typeof f.value === "string" ? f.value : JSON.stringify(f.value)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted mb-2">—</div>
              )}

              <div className="text-muted mb-1">Actions:</div>
              {(aiSuggestions.actions as Action[] | undefined)?.length ?? 0 > 0 ? (
                <div className="space-y-1">
                  {(aiSuggestions.actions as Action[])?.map((a: any, i: number) => (
                    <div key={i} className="text-slate-300">
                      • {a.type}{a.renameMode ? ` (${a.renameMode})` : ""}: {a.find ? `"${a.find}" → ` : ""}{a.value || a.replace || "—"}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted">—</div>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] p-3">
              <div className="text-xs uppercase tracking-wide text-muted">Summary</div>
              <div className="mt-2 text-sm text-secondary">
                {(aiSuggestions.filters as Filter[] | undefined)?.length ?? 0} filters ·{" "}
                {(aiSuggestions.actions as Action[] | undefined)?.length ?? 0} actions
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] p-3">
              <div className="text-xs uppercase tracking-wide text-muted">Status</div>
              <div className="mt-2 text-sm text-secondary">Ready to apply to UI</div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
