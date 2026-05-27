import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, refreshSession, setAccessToken } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshSession()
      .then((session) => setUser(session?.user || null))
      .finally(() => setLoading(false));
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
