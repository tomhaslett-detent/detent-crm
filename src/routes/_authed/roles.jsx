import { createFileRoute } from "@tanstack/react-router";
import AccessAudit from "@/components/team/AccessAudit";
import RoleLegend from "@/components/team/RoleLegend";
import PageHeader from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/AuthContext";

export const Route = createFileRoute("/_authed/roles")({
  head: () => ({ meta: [{ title: "Roles & permissions · Detent CRM" }] }),
  component: RolesPage,
});

function RolesPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Detent CRM"
        title="Roles & permissions"
        description="What each role can see and do. The same rules guard every CRM request, so what you check here is what your imported data will obey."
      />

      <RoleLegend />

      {user?.role === "admin" ? (
        <AccessAudit />
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
          Only CRM admins can run the access check. Your own role and team are shown under Team access.
        </p>
      )}
    </div>
  );
}