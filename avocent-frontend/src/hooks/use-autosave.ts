"use client";

import { useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutosave<T>(
  saveFn: (data: T) => Promise<void>,
  data: T,
  debounceMs = 800,
): { status: AutosaveStatus } {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const saveFnRef = useRef(saveFn);
  const isFirstRender = useRef(true);

  useEffect(() => {
    saveFnRef.current = saveFn;
  });

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setStatus("saving");
    const timeout = setTimeout(async () => {
      try {
        await saveFnRef.current(data);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [data, debounceMs]);

  return { status };
}
