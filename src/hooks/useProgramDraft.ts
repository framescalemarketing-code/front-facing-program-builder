"use client";

import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { Draft, DraftPatch } from "@/lib/programDraft";
import {
  createDefaultDraft,
  deserializeDraft,
  ensureDepartmentConfigs,
  mergeDraft,
  serializeDraft,
} from "@/lib/programDraft";

const STORAGE_KEY = "osso_front_facing_program_builder_draft_v2";
const LEGACY_STORAGE_KEY = "osso_program_draft_v1";

type ProgramDraftStore = {
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  updateDraft: (patch: DraftPatch | ((prev: Draft) => DraftPatch)) => void;
  setBuilder: (updater: (prev: Draft["builder"]) => Draft["builder"]) => void;
  setProgram: (updater: (prev: Draft["program"]) => Draft["program"]) => void;
  clear: {
    builder: () => void;
    program: () => void;
  };
};

const ProgramDraftContext = createContext<ProgramDraftStore | null>(null);

function loadStoredDraft(): Draft {
  try {
    const raw =
      typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
        : null;
    if (!raw) return createDefaultDraft();
    const draft = deserializeDraft(JSON.parse(raw));
    if (draft.builder.guidelines.allowanceScope !== "department_based") return draft;
    const current = draft.program.departmentConfigs ?? [];
    if (current.length >= 2) return draft;
    return mergeDraft(draft, {
      program: {
        departmentConfigs: ensureDepartmentConfigs(current, 2),
      },
    });
  } catch {
    return createDefaultDraft();
  }
}

export function ProgramDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(() => {
    return loadStoredDraft();
  });
  const saveTimerRef = useRef<number | null>(null);
  const idleSaveRef = useRef<number | null>(null);

  const updateDraft = useCallback((patch: DraftPatch | ((prev: Draft) => DraftPatch)) => {
    setDraft((prev) => {
      const resolvedPatch = typeof patch === "function" ? patch(prev) : patch;
      return mergeDraft(prev, resolvedPatch);
    });
  }, []);

  useEffect(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (idleSaveRef.current !== null && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(idleSaveRef.current);
      idleSaveRef.current = null;
    }

    saveTimerRef.current = window.setTimeout(() => {
      const persist = () => {
        try {
          localStorage.setItem(STORAGE_KEY, serializeDraft(draft));
        } catch {
          // Ignore persistence failures and keep in-memory state available.
        }
      };

      if ("requestIdleCallback" in window) {
        idleSaveRef.current = window.requestIdleCallback(() => {
          idleSaveRef.current = null;
          persist();
        });
        return;
      }

      persist();
    }, 400);

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (idleSaveRef.current !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleSaveRef.current);
        idleSaveRef.current = null;
      }
    };
  }, [draft]);

  const setBuilder = useCallback((updater: (prev: Draft["builder"]) => Draft["builder"]) => {
    updateDraft((prev) => {
      const builder = updater(prev.builder);
      if (builder.guidelines.allowanceScope !== "department_based") {
        return { builder };
      }

      const current = prev.program.departmentConfigs ?? [];
      if (current.length >= 2) {
        return { builder };
      }

      return {
        builder,
        program: {
          departmentConfigs: ensureDepartmentConfigs(current, 2),
        },
      };
    });
  }, [updateDraft]);

  const setProgram = useCallback((updater: (prev: Draft["program"]) => Draft["program"]) => {
    updateDraft((prev) => ({ program: updater(prev.program) }));
  }, [updateDraft]);

  const clear = useMemo(
    () => ({
      builder: () => updateDraft({ builder: createDefaultDraft().builder }),
      program: () =>
        updateDraft((prev) => {
          const defaults = createDefaultDraft().program;
          const isDepartmentBased = prev.builder.guidelines.allowanceScope === "department_based";
          const departmentConfigs = isDepartmentBased
            ? ensureDepartmentConfigs(defaults.departmentConfigs ?? [], 2)
            : defaults.departmentConfigs ?? [];
          return {
            program: {
              ...defaults,
              contact: prev.program.contact,
              departmentConfigs,
            },
          };
        }),
    }),
    [updateDraft]
  );

  const store = useMemo<ProgramDraftStore>(
    () => ({
      draft,
      setDraft,
      updateDraft,
      setBuilder,
      setProgram,
      clear,
    }),
    [clear, draft, setBuilder, setProgram, updateDraft]
  );

  return createElement(ProgramDraftContext.Provider, { value: store }, children);
}

export function useProgramDraft() {
  const ctx = useContext(ProgramDraftContext);
  if (!ctx) {
    throw new Error("useProgramDraft must be used within ProgramDraftProvider.");
  }
  return ctx;
}
