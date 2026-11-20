import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";

export const authMiddleware = createMiddleware({ type: "function" }).server(({ next }) => next());

export const base44RequestMiddleware = createMiddleware({ type: "request" }).server(({ next, context }) => {
  const runtime = context?.crmRuntime;
  if (!runtime) return next();
  const getBase44 = () => runtime.client;
  return next({ context: { getBase44, sqlUser: runtime.user } });
});

export const requireUser = createMiddleware({ type: "function" }).server(({ next, context }) => {
  if (context?.sqlUser) return next({ context: { user: context.sqlUser } });
  setResponseStatus(401);
  throw Object.assign(new Error("Unauthorized"), { status: 401 });
});

export const requireUserRoute = createMiddleware({ type: "request" }).server(({ next, context }) =>
  context?.sqlUser
    ? next({ context: { user: context.sqlUser } })
    : Response.json({ error: "Unauthorized" }, { status: 401 }));
