export const sourceNamePattern = /^[a-z0-9][a-z0-9-]{1,59}$/;
export const detentHubSpotOrigin = "149444037";

export function importOrigin(source) {
  if (source === undefined) return detentHubSpotOrigin;
  if (!sourceNamePattern.test(source)) throw new Error("Enter a source name with 2–60 letters, digits or hyphens.");
  return "file:" + source;
}

export function validImportId(id, origin) {
  return typeof id === "string" && (origin === detentHubSpotOrigin ? /^\d{1,30}$/ : /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/).test(id);
}

export function importKey(origin, kind, id) {
  return origin + ":" + kind + ":" + id;
}
