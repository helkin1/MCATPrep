import { useEffect, useState } from "react";
import { supabase, onAuthStateChange } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user || null);
      setLoading(false);
    });

    const { data } = onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  return { user, loading };
}
