import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import React from "react";

const Spinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

/**
 * HOC that redirects guest users to /login before showing detail pages.
 */
export function withAuthGuard<P extends object>(Component: React.ComponentType<P>) {
  return function AuthGuarded(props: P) {
    const navigate = useNavigate();
    const [allowed, setAllowed] = useState<boolean | null>(null);

    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          toast.info("Please login to view details");
          navigate("/login", { replace: true });
        } else {
          setAllowed(true);
        }
      });
    }, [navigate]);

    if (allowed === null) return <Spinner />;
    return <Component {...props} />;
  };
}
