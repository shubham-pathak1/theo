import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, refreshSession, setAccessToken } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        // Always refresh first — the token in localStorage may be expired.
        // refreshSession() uses the httpOnly refresh cookie which is always current.
        const session = await refreshSession();
        setUser(session?.user || null);
      } catch {
        setAccessToken("");
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(email, password) {
        const data = await api.post("/api/auth/login", { email, password });
        setAccessToken(data.accessToken);
        setUser(data.user);
        return data;
      },
      async register(payload) {
        const data = await api.post("/api/auth/register", payload);
        setAccessToken(data.accessToken);
        setUser(data.user);
        return data;
      },
      async googleLogin(idToken) {
        const data = await api.post("/api/auth/google", { idToken });
        setAccessToken(data.accessToken);
        setUser(data.user);
        return data;
      },
      async resendVerification() {
        const data = await api.post("/api/auth/resend-verification", {});
        if (data.user) {
          setUser(data.user);
        }
        return data;
      },
      async logout() {
        await api.post("/api/auth/logout", {});
        setAccessToken("");
        setUser(null);
      },
      async updateUser(patch) {
        setUser((current) => ({ ...current, ...patch }));
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
