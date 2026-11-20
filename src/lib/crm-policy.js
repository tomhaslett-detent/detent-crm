export const roles = ["revops", "manager", "rep", "service", "viewer"];

export function mayAccess(actor, action, object, record) {
  if (actor?.role === "admin") return true;
  if (!roles.includes(actor?.role)) return false;
  if (action === "export") return actor.role === "revops";
  const inTeam = Boolean(actor.team && record?.team_key === actor.team);
  const own = inTeam && record?.owner_email === actor.email;
  if (action === "read") {
    return actor.role === "revops" || (actor.role === "rep" ? own : inTeam);
  }
  if (action === "delete") return false;
  if (action !== "create" && action !== "update") return false;
  if (actor.role === "revops") return true;
  if (actor.role === "manager") return inTeam;
  if (actor.role === "rep") return own;
  return actor.role === "service" && inTeam && object === "Activity";
}
