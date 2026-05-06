import { useCallback, useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/lib/db";

export function useProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const p = await getProfile();
      setProfile(p);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    reload();
  }, [userId, reload]);

  const update = useCallback(
    async (patch) => {
      const next = await updateProfile(patch);
      setProfile(next);
      return next;
    },
    []
  );

  return { profile, loading, error, reload, update };
}
