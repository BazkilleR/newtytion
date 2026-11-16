import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setSessionExpiredHandler } from "./api.js";

const AuthContext = createContext(null);

const loggedOut = { user: null, isPending: false };

/**
 * Who is logged in. The JWTs are httpOnly cookies JavaScript can't read, so
 * on load we ask the api (GET /me) instead; `isPending` is true until it answers.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, isPending: true });

  useEffect(() => {
    setSessionExpiredHandler(() => setState(loggedOut));

    const controller = new AbortController();
    api("/me", { signal: controller.signal })
      .then((user) => setState({ user, isPending: false }))
      .catch((error) => {
        if (error.name !== "AbortError") setState(loggedOut);
      });

    return () => {
      controller.abort();
      setSessionExpiredHandler(() => {});
    };
  }, []);

  const logIn = useCallback(async (values) => {
    const { user } = await api("/auth/login", { method: "POST", body: values });
    setState({ user, isPending: false });
  }, []);

  const signUp = useCallback(async (values) => {
    const { user } = await api("/auth/signup", { method: "POST", body: values });
    setState({ user, isPending: false });
  }, []);

  const logOut = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setState(loggedOut);
    }
  }, []);

  const value = useMemo(
    () => ({ ...state, logIn, signUp, logOut }),
    [state, logIn, signUp, logOut],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

/** `{ user, isPending, logIn, signUp, logOut }`. `logIn` / `signUp` throw ApiError on failure. */
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}
