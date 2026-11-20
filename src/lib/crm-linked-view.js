const associationFields = {
  account: ["Account", "account_ids", "hubspot_account_ids"],
  contact: ["Contact", "contact_ids", "hubspot_contact_ids"],
  deal: ["Deal", "deal_ids"],
};

export function linkedIds(records) {
  return Object.entries(associationFields).map(([prefix, [object, ...listFields]]) => {
    const ids = new Set();
    for (const record of records) {
      const single = record[prefix + "_id"];
      if (single) ids.add(single);
      for (const field of listFields) for (const id of record[field] ?? []) ids.add(id);
    }
    return [object, [...ids]];
  });
}

export function linkedView(record, visible) {
  if (!record) return record;
  const result = { ...record };
  delete result.hubspot_source_fields;
  delete result.source_attachment_ids;
  if (!visible) return result;
  for (const [prefix, [object, ...listFields]] of Object.entries(associationFields)) {
    const allowed = visible[object];
    const id = result[prefix + "_id"];
    if (!id || !allowed?.has(id)) {
      delete result[prefix + "_id"];
      delete result[prefix + "_name"];
    }
    for (const field of listFields) {
      if (Array.isArray(result[field])) result[field] = result[field].filter((id) => allowed?.has(id));
    }
  }
  return result;
}
