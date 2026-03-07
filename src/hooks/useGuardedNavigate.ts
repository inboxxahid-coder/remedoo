import { useNavigate } from "react-router-dom";
import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Returns a navigate function that checks auth first.
 * If the user is not logged in, redirects to /login with a toast.
 * Paths in `publicPaths` are allowed without login.
 */
const PUBLIC_PATHS = ["/dashboard", "/onboarding", "/login", "/signup", "/forgot-password", "/reset-password", "/"];

export function useGuardedNavigate() {
  const navigate = useNavigate();
  const sessionCache = useRef<{ checked: boolean; loggedIn: boolean }>({ checked: false, loggedIn: false });

  // Prime the cache on first call
  const checkAuth = useCallback(async () => {
    if (sessionCache.current.checked) return sessionCache.current.loggedIn;
    const { data: { session } } = await supabase.auth.getSession();
    sessionCache.current = { checked: true, loggedIn: !!session };
    return !!session;
  }, []);

  // Listen for auth changes to keep cache updated
  const listenerSet = useRef(false);
  if (!listenerSet.current) {
    listenerSet.current = true;
    supabase.auth.onAuthStateChange((_, session) => {
      sessionCache.current = { checked: true, loggedIn: !!session };
    });
  }

  const guardedNavigate = useCallback(
    async (path: string) => {
      if (PUBLIC_PATHS.includes(path)) {
        navigate(path);
        return;
      }
      const loggedIn = await checkAuth();
      if (loggedIn) {
        navigate(path);
      } else {
        toast.info("Please login to access this feature");
        navigate("/login", { replace: true });
      }
    },
    [navigate, checkAuth]
  );

  return guardedNavigate;
}

