import { Router } from "express";

export const meRouter = Router();

meRouter.get("/", (_req, res) => {
  const { id, name, email, createdAt } = res.locals.user;
  res.json({ id, name, email, createdAt });
});
