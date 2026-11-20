import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AuthGateError, requireSignedIn } from "@/components/auth/AuthGate";
import { getCrmActor } from "@/lib/crm-access";
import AppShell from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authed")({
  ssr: false,
  beforeLoad: async (options) => {
    const session = await requireSignedIn(options);
    const actor = await getCrmActor();
    return { ...session, actor };
  },
  errorComponent: AuthGateError,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { actor } = Route.useRouteContext();
  if (!actor) return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-xl font-bold">CRM access is pending</h1>
      <p className="mt-2">Ask a CRM admin to enable your work email and assign a role and team.</p>
      <a className="mt-3 inline-block underline" href="/login">Return to sign in</a>
    </main>
  );
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}