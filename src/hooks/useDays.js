import { useCallback, useEffect, useRef, useState } from "react";
import { getDays, saveDays } from "@/lib/db";
import { uid } from "@/lib/time";

/**
 * Loads the entire days blob for the current user, exposes mutators that
 * write through to Supabase with debounced batching so rapid drags don't
 * spam the network.
 */
export function useDays(userId) {
  const [days, setDays] = useState({});
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef(null);
  const pendingRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      setDays({});
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    getDays()
      .then((d) => {
        if (alive) setDays(d || {});
      })
      .catch((e) => console.error("[mcat] getDays failed", e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId]);

  const flush = useCallback(async () => {
    if (!pendingRef.current) return;
    const snapshot = pendingRef.current;
    pendingRef.current = null;
    try {
      await saveDays(snapshot);
    } catch (e) {
      console.error("[mcat] saveDays failed", e);
    }
  }, []);

  const queueSave = useCallback(
    (next) => {
      pendingRef.current = next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, 400);
    },
    [flush]
  );

  // Flush on unmount / tab close
  useEffect(() => {
    const handler = () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        flush();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      handler();
    };
  }, [flush]);

  const setDayBlocks = useCallback(
    (key, blocks) => {
      setDays((prev) => {
        const day = prev[key] || { blocks: [], todos: [] };
        const next = { ...prev, [key]: { ...day, blocks } };
        queueSave(next);
        return next;
      });
    },
    [queueSave]
  );

  const setDayTodos = useCallback(
    (key, todos) => {
      setDays((prev) => {
        const day = prev[key] || { blocks: [], todos: [] };
        const next = { ...prev, [key]: { ...day, todos } };
        queueSave(next);
        return next;
      });
    },
    [queueSave]
  );

  const upsertBlock = useCallback(
    (key, block) => {
      setDays((prev) => {
        const day = prev[key] || { blocks: [], todos: [] };
        const blocks = [...day.blocks];
        const idx = blocks.findIndex((b) => b.id === block.id);
        if (idx >= 0) blocks[idx] = block;
        else blocks.push({ ...block, id: block.id || uid() });
        blocks.sort((a, b) => a.start.localeCompare(b.start));
        const next = { ...prev, [key]: { ...day, blocks } };
        queueSave(next);
        return next;
      });
    },
    [queueSave]
  );

  const deleteBlock = useCallback(
    (key, blockId) => {
      setDays((prev) => {
        const day = prev[key];
        if (!day) return prev;
        const blocks = day.blocks.filter((b) => b.id !== blockId);
        const next = { ...prev, [key]: { ...day, blocks } };
        queueSave(next);
        return next;
      });
    },
    [queueSave]
  );

  const replaceDay = useCallback(
    (key, dayObj) => {
      setDays((prev) => {
        const next = { ...prev, [key]: dayObj };
        queueSave(next);
        return next;
      });
    },
    [queueSave]
  );

  const bulkReplace = useCallback(
    (newDays) => {
      setDays(() => {
        queueSave(newDays);
        return newDays;
      });
    },
    [queueSave]
  );

  return {
    days,
    loading,
    setDayBlocks,
    setDayTodos,
    upsertBlock,
    deleteBlock,
    replaceDay,
    bulkReplace,
    flush,
  };
}
