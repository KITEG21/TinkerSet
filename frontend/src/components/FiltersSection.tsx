import React, { ReactElement, ChangeEvent } from "react";
import { Plus, X } from "lucide-react";
import { useStore } from "../store/useStore";

interface FieldOption {
  value: string;
  label: string;
}

const fieldOptions: FieldOption[] = [
  { value: "name", label: "name" },
  { value: "extension", label: "extension" },
  { value: "size", label: "size" },
  { value: "date", label: "date" },
  { value: "file_type", label: "file type" },
];

const operatorOptions: Record<string, string[]> = {
  name: ["regex", "equals", "contains"],
  extension: ["equals", "contains"],
  size: ["<", ">", "equals"],
  date: ["before", "after", "equals"],
  file_type: [],
};

function getDefaultValue(field: string): string {
  switch (field) {
    case "size":
      return "1024";
    case "date":
      return new Date().toISOString().slice(0, 10);
    case "extension":
      return "txt";
    case "file_type":
      return "files";
    default:
      return ".*";
  }
}

export default function FiltersSection(): ReactElement {
  const filters = useStore((s) => s.filters);
  const addFilter = useStore((s) => s.addFilter);
  const updateFilter = useStore((s) => s.updateFilter);
  const removeFilter = useStore((s) => s.removeFilter);

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-main)]">Filters</h2>
          <p className="text-xs text-secondary">Select conditions for matched files.</p>
        </div>
        <button
          onClick={addFilter}
          className="btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition hover:opacity-90"
        >
          <Plus size={16} />
          Add filter
        </button>
      </div>

      <div className="space-y-3">
        {filters.map((filter, index) => (
          <div
            key={filter.id}
            className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] p-3 xl:grid-cols-[1fr_1fr_1.5fr_auto]"
          >
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Field</label>
              <select
                value={filter.field}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  const field = event.target.value;
                  updateFilter(filter.id, {
                    field,
                    operator: operatorOptions[field]?.[0] ?? "equals",
                    value: getDefaultValue(field),
                  });
                }}
                className="field input-focus w-full rounded-xl px-3 py-2 text-sm"
              >
                {fieldOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {filter.field === "file_type" ? (
              <>
                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Selection</label>
                  <select
                    value={filter.value}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      updateFilter(filter.id, { value: event.target.value })
                    }
                    className="field input-focus w-full rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="files">Files only</option>
                    <option value="folders">Folders only</option>
                    <option value="both">Both files and folders</option>
                  </select>
                </div>
                <div />
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Operator</label>
                  <select
                    value={filter.operator}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      updateFilter(filter.id, { operator: event.target.value })
                    }
                    className="field input-focus w-full rounded-xl px-3 py-2 text-sm"
                  >
                    {(operatorOptions[filter.field] ?? ["equals"]).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Value</label>
                  <input
                    value={filter.value}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateFilter(filter.id, { value: event.target.value })
                    }
                    placeholder={index === 0 ? "e.g. report, txt, 1200, 2026-05-01" : "Value"}
                    className="field input-focus w-full rounded-xl px-3 py-2 text-sm placeholder:text-muted"
                  />
                </div>
              </>
            )}

            <div className="flex items-end justify-end">
              <button
                onClick={() => removeFilter(filter.id)}
                className="btn-ghost inline-flex h-10 items-center justify-center rounded-xl px-3 transition hover:opacity-90"
                aria-label="RemoveFilterButton"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
