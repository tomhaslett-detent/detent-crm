const searchFields = {
  Account: ["name", "domain", "owner"],
  Contact: ["first_name", "last_name", "email", "account_name", "title"],
  Deal: ["title", "owner", "account_name", "contact_name"],
};

function literalPattern(value) {
  return [...value].map((char) => {
    if (/[a-z]/i.test(char) && char.length === 1 && /^[a-zA-Z]$/.test(char)) {
      return "[" + char.toLowerCase() + char.toUpperCase() + "]";
    }
    return "\\^$.*+?()[]{}|".includes(char) ? "\\" + char : char;
  }).join("");
}

export function sourceRecordId(term) {
  return term?.trim().match(/^id:\s*([A-Za-z0-9][A-Za-z0-9._-]{0,79})$/i)?.[1];
}

export function crmSearchFilter(object, term, includeLinkedName = true, includeSourceId = false) {
  const fields = searchFields[object];
  const text = term?.trim();
  if (!text || !fields) return {};
  const id = includeSourceId ? sourceRecordId(text) : undefined;
  if (id) return { hubspot_source_key: { $regex: ":" + id.replaceAll(".", "\\.") + "$" } };
  const pattern = literalPattern(text);
  return { $or: fields.filter((field) => includeLinkedName || !["account_name", "contact_name"].includes(field)).map((field) => ({ [field]: { $regex: pattern } })) };
}
