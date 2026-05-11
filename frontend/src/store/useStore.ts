import { create } from "zustand";

// Types
export interface Filter {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface Action {
  id: string;
  type: string;
  renameMode?: string;
  find?: string;
  replace?: string;
  value?: string;
  padding?: number;
  prefix?: string;
  suffix?: string;
}

export interface DirectoryInfo {
  fileCount: number;
  lastScannedAt: string | null;
}

export interface Job {
  path: string;
  filters: Filter[];
  actions: Action[];
}

export interface PreviewItem {
  status: string;
  [key: string]: unknown;
}

export interface AppStore {
  targetPath: string;
  prompt: string;
  workspaceMode: "ui" | "ai";
  themeMode: "dark" | "light";
  filters: Filter[];
  actions: Action[];
  preview: PreviewItem[];
  previewMode: "matched" | "all";
  directoryInfo: DirectoryInfo;
  aiSuggestions: Job | null;
  isLoading: boolean;
  error: string;
  status: string;

  setTargetPath: (p: string) => void;
  setPrompt: (prompt: string) => void;
  setWorkspaceMode: (mode: "ui" | "ai") => void;
  toggleThemeMode: () => void;
  setFilters: (f: Filter[]) => void;
  setActions: (a: Action[]) => void;
  setPreview: (p: PreviewItem[]) => void;
  setPreviewMode: (mode: "matched" | "all") => void;
  setDirectoryInfo: (info: DirectoryInfo) => void;
  setAiSuggestions: (job: Job | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string) => void;
  setStatus: (status: string) => void;
  setJob: (job: Job) => void;
  addFilter: () => void;
  updateFilter: (id: string, patch: Partial<Filter>) => void;
  removeFilter: (id: string) => void;
  addAction: () => void;
  updateAction: (id: string, patch: Partial<Action>) => void;
  removeAction: (id: string) => void;
}

const createId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyFilter = (): Filter => ({
  id: createId(),
  field: "extension",
  operator: "equals",
  value: "txt",
});

const createEmptyAction = (): Action => ({
  id: createId(),
  type: "rename",
  renameMode: "replace",
  find: "",
  replace: "",
  value: "{name}-new",
  padding: 0,
  prefix: "",
  suffix: "",
});

export const useStore = create<AppStore>((set) => ({
  targetPath: "",
  prompt: "",
  workspaceMode: "ui",
  themeMode: "dark",
  filters: [],
  actions: [createEmptyAction()],
  preview: [],
  previewMode: "matched",
  directoryInfo: { fileCount: 0, lastScannedAt: null },
  aiSuggestions: null,
  isLoading: false,
  error: "",
  status: "Ready",

  setTargetPath: (p) => set({ targetPath: p }),
  setPrompt: (prompt) => set({ prompt }),
  setWorkspaceMode: (workspaceMode) => set({ workspaceMode }),
  toggleThemeMode: () =>
    set((state) => ({
      themeMode: state.themeMode === "dark" ? "light" : "dark",
    })),
  setFilters: (f) => set({ filters: f }),
  setActions: (a) => set({ actions: a }),
  setPreview: (p) => set({ preview: p }),
  setPreviewMode: (previewMode) => set({ previewMode }),
  setDirectoryInfo: (directoryInfo) => set({ directoryInfo }),
  setAiSuggestions: (aiSuggestions) => set({ aiSuggestions }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setStatus: (status) => set({ status }),

  setJob: (job: Job) =>
    set(() => {
      const mapFilter = (filter: Partial<Filter> & { type?: string; value?: unknown }) => {
        const field = filter.field ?? filter.type ?? "name";
        const operator =
          filter.operator ??
          (filter.type === "name_regex"
            ? "regex"
            : filter.type === "name_contains"
            ? "contains"
            : filter.type === "size_gt" || filter.type === "date_gt"
            ? ">"
            : filter.type === "size_lt" || filter.type === "date_lt"
            ? "<"
            : "equals");

        const value = Array.isArray(filter.value)
          ? (filter.value as unknown[]).join(", ")
          : String(filter.value ?? "");

        return {
          id: createId(),
          field:
            field === "extension"
              ? "extension"
              : field === "name_regex" || field === "name_contains"
              ? "name"
              : field === "size_gt" || field === "size_lt"
              ? "size"
              : field === "date_gt" || field === "date_lt"
              ? "date"
              : field === "file_type"
              ? "file_type"
              : "name",
          operator,
          value,
        } as Filter;
      };

      const mapAction = (action: Partial<Action> & { renameMode?: string }) => ({
        id: createId(),
        type: action.type ?? "rename",
        renameMode: action.renameMode ?? (action.find || action.replace ? "replace" : "template"),
        find: String(action.find ?? ""),
        replace: String(action.replace ?? ""),
        value: String(action.value ?? ""),
        padding: action.padding ?? 0,
        prefix: String(action.prefix ?? ""),
        suffix: String(action.suffix ?? ""),
      } as Action);

      return {
        targetPath: job?.path ?? "",
        filters: (job?.filters ?? []).map((f) => mapFilter(f as any)),
        actions: (job?.actions ?? []).map((a) => mapAction(a as any)),
      };
    }),

  addFilter: () =>
    set((state) => ({
      filters: [...state.filters, createEmptyFilter()],
    })),

  updateFilter: (id, patch) =>
    set((state) => ({
      filters: state.filters.map((filter) =>
        filter.id === id ? { ...filter, ...patch } : filter
      ),
    })),

  removeFilter: (id) =>
    set((state) => ({
      filters: state.filters.filter((filter) => filter.id !== id),
    })),

  addAction: () =>
    set((state) => ({
      actions: [...state.actions, createEmptyAction()],
    })),

  updateAction: (id, patch) =>
    set((state) => ({
      actions: state.actions.map((action) =>
        action.id === id ? { ...action, ...patch } : action
      ),
    })),

  removeAction: (id) =>
    set((state) => ({
      actions: state.actions.filter((action) => action.id !== id),
    })),
}));
