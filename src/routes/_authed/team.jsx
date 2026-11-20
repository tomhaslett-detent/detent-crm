import { createFileRoute, Link } from "@tanstack/react-router";
import AccessSummary from "@/components/team/AccessSummary";
import WorkspaceDomain from "@/components/team/WorkspaceDomain";
import PageHeader from "@/components/layout/PageHeader";
import TeamAccess from "@/components/layout/TeamAccess";
import { useAuth } from "@/lib/AuthContext";

export const Route = createFileRoute("/_authed/team")({
  head: () => ({ meta: [{ title: "Team access · Detent CRM" }] }),
  component: TeamPage,
});

function TeamPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Detent CRM"
        title="Team access"
        description="Invite teammates with their work email, then give each one a role and a team."
      />

      <AccessSummary />

      {isAdmin ? (
        <>
          <WorkspaceDomain />
          <TeamAccess />
          <p className="text-xs text-muted-foreground">
            Want to know exactly what each role reaches?{" "}
            <Link to="/roles" className="font-semibold text-primary underline-offset-2 hover:underline">
              Run the access check
            </Link>
            .
          </p>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
          Only CRM admins can invite teammates or change access. Ask an admin if you need a different role or team.
        </p>
      )}
    </div>
  );
}