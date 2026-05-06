import { useCallback, useEffect, useState } from "react";
import { getTemplates, saveTemplates } from "@/lib/db";

export function useTemplates(userId) {
  const [templates, setTemplates] = useState({ daily: [], weekly: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setTemplates({ daily: [], weekly: [] });
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    getTemplates()
      .then((t) => {
        if (alive) setTemplates(t || { daily: [], weekly: [] });
      })
      .catch((e) => console.error("[mcat] getTemplates failed", e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId]);

  const persist = useCallback(async (next) => {
    setTemplates(next);
    try {
      await saveTemplates(next);
    } catch (e) {
      console.error("[mcat] saveTemplates failed", e);
    }
  }, []);

  return { templates, loading, persist };
}
