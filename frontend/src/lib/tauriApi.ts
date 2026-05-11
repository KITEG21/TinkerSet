import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { PreviewItem } from "../store/useStore";
import { BACKEND_URL } from "./config";

export interface DirectoryInfo {
  path: string;
  file_count: number;
}

export interface Filter {
  type?: string;
  value?: string | string[] | number;
  field?: string;
  operator?: string;
}

export interface Action {
  type?: string;
  renameMode?: string;
  value?: string;
  find?: string;
  replace?: string;
  padding?: number;
  prefix?: string;
  suffix?: string;
}

export interface JobRequest {
  path: string;
  filters?: Filter[];
  actions?: Action[];
}

export interface JobResponse {
  path?: string;
  filters?: Filter[];
  actions?: Action[];
  [key: string]: unknown;
}

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    (isTauri() || Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__))
  );
}

export async function pickFolder(): Promise<string | null> {
  try {
    if (isTauriRuntime()) {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select target folder",
      });

      if (typeof selected === "string") {
        return selected;
      }

      return null;
    }
  } catch {
    // fall back to a simple browser prompt below
  }

  const typed = window.prompt("Enter the full folder path to work in:");
  return typed?.trim() || null;
}

export async function startWindowDrag(): Promise<void> {
  if (!isTauriRuntime()) return;

  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().startDragging();
}

export async function interpretPrompt(
  prompt: string,
  path: string,
  options: { provider?: string } = {}
): Promise<JobResponse> {
  const payload = {
    prompt,
    path,
    provider: options.provider,
  };

  if (isTauriRuntime()) {
    return invoke("interpret_prompt", payload);
  }

  return postJson("/ai/interpret", payload);
}

export async function confirmAction(message: string): Promise<boolean> {
  if (
    typeof window !== "undefined" &&
    (isTauri() || (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
  ) {
    const { confirm } = await import("@tauri-apps/plugin-dialog");
    return confirm(message, {
      title: "Confirm execution",
      kind: "warning",
    });
  }

  return window.confirm(message);
}

export async function scanDirectory(path: string): Promise<DirectoryInfo> {
  if (isTauriRuntime()) {
    return invoke("scan_directory", { path });
  }

  return Promise.resolve({ path, file_count: 0 });
}

function normalizeExtensions(value: string | string[] | number): string[] {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.startsWith(".") ? part : `.${part}`));
}

interface RawFilter {
  type?: string;
  value?: string | string[] | number;
  field?: string;
  operator?: string;
}

interface RawAction {
  type?: string;
  renameMode?: string;
  value?: string | number;
  find?: string;
  replace?: string;
  padding?: number;
  prefix?: string;
  suffix?: string;
}

function buildFilter(filter: RawFilter): Filter {
  const field = filter.field || filter.type || "name";
  const operator = filter.operator || "equals";
  const value = filter.value;

  // file_type is special - send with type="file_type"
  if (field === "file_type") {
    return { type: "file_type", value: String(value || "files") };
  }

  if (field === "extension") {
    return { type: "extension", value: normalizeExtensions(value) };
  }

  if (field === "name") {
    if (operator === "regex") {
      return { type: "name_regex", value: String(value || ".*") };
    }

    if (operator === "contains") {
      return { type: "name_contains", value: String(value || "") };
    }

    return { type: "name_regex", value: String(value || ".*") };
  }

  if (field === "size") {
    if (operator === ">") {
      return { type: "size_gt", value: Number(value) || 0 };
    }
    return { type: "size_lt", value: Number(value) || 0 };
  }

  if (field === "date") {
    if (operator === "after") {
      return { type: "date_gt", value: String(value || "") };
    }
    return { type: "date_lt", value: String(value || "") };
  }

  if (field === "name_regex") {
    return { type: "name_regex", value: String(value || ".*") };
  }

  if (field === "name_contains") {
    return { type: "name_contains", value: String(value || "") };
  }

  if (field === "size_gt") {
    return { type: "size_gt", value: Number(value) || 0 };
  }

  if (field === "size_lt") {
    return { type: "size_lt", value: Number(value) || 0 };
  }

  if (field === "date_gt") {
    return { type: "date_gt", value: String(value || "") };
  }

  if (field === "date_lt") {
    return { type: "date_lt", value: String(value || "") };
  }

  return { type: "name_regex", value: String(value || ".*") };
}

function buildAction(action: RawAction): Action {
  if ((action.type || "rename") === "rename") {
    const renameMode = action.renameMode || "replace";

    if (renameMode === "replace") {
      return {
        type: "rename",
        renameMode: "replace",
        value: String(action.value || ""),
        find: String(action.find || ""),
        replace: String(action.replace || ""),
      };
    }

    if (renameMode === "number_sequential") {
      const actionObj: Action = {
        type: "rename",
        renameMode: "number_sequential",
        value: String(action.value || "1"),
      };
      if (action.padding && Number(action.padding) > 0) {
        actionObj.padding = Number(action.padding);
      }
      if (action.prefix) {
        actionObj.prefix = String(action.prefix);
      }
      if (action.suffix) {
        actionObj.suffix = String(action.suffix);
      }
      return actionObj;
    }

    return {
      type: "rename",
      renameMode: "template",
      value: String(action.value || ""),
    };
  }

  return {
    type: action.type || "rename",
    value: String(action.value ?? ""),
  };
}

export function buildBackendJob(options: { path: string; filters?: RawFilter[]; actions?: RawAction[] }): JobRequest {
  const { path, filters = [], actions = [] } = options;
  return {
    path,
    filters: filters.map(buildFilter),
    actions: actions.map(buildAction),
  };
}

async function postJson<T>(path: string, body: JobRequest | JobResponse): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function previewJob(job: JobRequest): Promise<PreviewItem[]> {
  if (isTauriRuntime()) {
    return invoke("preview_job", { job });
  }

  return postJson<PreviewItem[]>("/preview", job);
}

export async function executeJob(job: JobRequest): Promise<PreviewItem[]> {
  if (isTauriRuntime()) {
    return invoke("execute_job", { job });
  }

  return postJson<PreviewItem[]>("/execute", job);
}
