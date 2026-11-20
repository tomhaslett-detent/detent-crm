export const portalId = "149444037";

export const mapping = {
  companies: { destination: "Account", fields: { name: "name", domain: "domain", industry: "industry", website: "website", numberofemployees: "employees" } },
  contacts: { destination: "Contact", fields: { firstname: "first_name", lastname: "last_name", email: "email", phone: "phone", jobtitle: "title" } },
  deals: { destination: "Deal", fields: { dealname: "title", amount: "value", deal_currency_code: "currency", closedate: "close_date" } },
};

export function projectRecord(object, source) {
  const { destination, fields } = mapping[object];
  const properties = source.properties ?? {};
  const values = {};
  const issues = [];
  for (const [from, to] of Object.entries(fields)) {
    const value = properties[from];
    if (value === undefined || value === null || value === "") continue;
    if (to === "value" || to === "employees") {
      const number = Number(value);
      if (Number.isFinite(number)) values[to] = number;
      else issues.push("invalid_numeric_value");
    } else {
      values[to] = value;
    }
  }
  const required = { Account: "name", Contact: "first_name", Deal: "title" };
  if (!values[required[destination]]?.trim()) issues.push("missing_destination_required_field");
  if (!source.id) issues.push("missing_source_id");
  if (object === "deals" && properties.dealstage) issues.push("stage_mapping_required");
  if (object === "deals" && values.value !== undefined && !values.currency) issues.push("amount_without_currency");
  const associations = Object.fromEntries(Object.entries(source.associations ?? {}).map(([kind, result]) => [
    kind, (result.results ?? []).map((link) => String(link.id)),
  ]));
  if (Object.values(associations).some((ids) => ids.length > 1)) issues.push("multiple_associations_require_mapping");
  return {
    destination, values, issues, associations,
    sourceKey: source.id ? [portalId, object, String(source.id)].join(":") : null,
    ownerId: properties.hubspot_owner_id || null,
    stageId: properties.dealstage || null,
    pipelineId: properties.pipeline || null,
  };
}

export function summarizePage(object, payload) {
  const result = { sampled: 0, mapped: 0, withSourceOwner: 0, associations: {}, issues: {}, hasMore: Boolean(payload.paging?.next?.after) };
  for (const record of payload.results ?? []) {
    const candidate = projectRecord(object, record);
    result.sampled += 1;
    if (candidate.issues.length === 0) result.mapped += 1;
    if (candidate.ownerId) result.withSourceOwner += 1;
    for (const [key, ids] of Object.entries(candidate.associations)) {
      result.associations[key] = (result.associations[key] ?? 0) + ids.length;
    }
    for (const issue of candidate.issues) result.issues[issue] = (result.issues[issue] ?? 0) + 1;
  }
  return result;
}
