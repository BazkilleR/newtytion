import { logInInputSchema, signUpInputSchema } from "@fitness/shared";
import { Router } from "express";
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "../lib/auth-cookies.js";
import * as authService from "../services/auth.service.js";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  const user = await authService.signUp(signUpInputSchema.parse(req.body));
  setAuthCookies(res, await authService.issueTokens(user.id));
  res.status(201).json({ user });
});

authRouter.post("/login", async (req, res) => {
  const user = await authService.logIn(logInInputSchema.parse(req.body));
  setAuthCookies(res, await authService.issueTokens(user.id));
  res.json({ user });
});

// On failure the cookies are left alone: another tab may have just rotated
// them, and clearing them here would log that tab out too.
authRouter.post("/refresh", async (req, res) => {
  setAuthCookies(res, await authService.rotateRefreshToken(req.cookies[REFRESH_COOKIE]));
  res.status(204).end();
});

authRouter.post("/logout", async (req, res) => {
  await authService.revokeRefreshToken(req.cookies[REFRESH_COOKIE]);
  clearAuthCookies(res);
  res.status(204).end();
});
