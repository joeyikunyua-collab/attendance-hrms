import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import api from "@/lib/axios";
import type { AuthUser } from "@/types";

/**
 * Fetches the current logged-in user from /api/auth/me. If the request
 * fails (no/expired session) it redirects to /login - this is a client-side
 * belt-and-braces check on top of the server-side middleware redirect.
 */
export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .get<{ user: AuthUser }>("/auth/me")
      .then((res) => {
        if (!cancelled) setUser(res.data.user);
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, loading };
}
