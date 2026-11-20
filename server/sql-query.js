const columns = new Map(Object.entries({
  id: "[id]", hubspot_source_key: "[source_key]", owner_email: "[owner_email]",
  team_key: "[team_key]", created_date: "[created_at]", updated_date: "[updated_at]",
}));

// CRM search builds a limited pattern language: anchors, escaped punctuation,
// and case pairs such as [aA]. Escape SQL wildcards unless they represent anchors.
export function crmPatternToLike(pattern) {
  const start = pattern.startsWith("^");
  const end = pattern.endsWith("$") && !/(?:^|[^\\])(?:\\\\)*\\\$$/.test(pattern);
  const core = pattern.slice(start ? 1 : 0, end ? -1 : undefined);
  let like = "";
  const escape = (char) => "%_[~".includes(char) ? "~" + char : char;
  for (let i = 0; i < core.length; i += 1) {
    const char = core[i];
    if (char === "\\" && i + 1 < core.length) {
      like += escape(core[++i]);
    } else if (char === "[") {
      const pair = core.slice(i, i + 4);
      if (!/^\[[a-z][A-Z]\]$/.test(pair) || pair[1].toUpperCase() !== pair[2]) throw new Error("Unsupported CRM search pattern");
      like += pair;
      i += 3;
    } else {
      if ("^$.*+?(){}|\\]".includes(char)) throw new Error("Unsupported CRM search pattern");
      like += escape(char);
    }
  }
  return (start ? "" : "%") + like + (end ? "" : "%");
}

export function sqlArguments() {
  const parameters = [];
  const bind = (value) => {
    parameters.push(value);
    return "@p" + (parameters.length - 1);
  };
  const field = (key, json = false) => {
    if (!json && columns.has(key)) return columns.get(key);
    const segments = key.split(".");
    if (!segments.every((segment) => /^[A-Za-z_][A-Za-z0-9_ '()-]{0,199}$/.test(segment))) throw new Error("Invalid CRM field");
    const path = bind("$." + segments.map((segment) => JSON.stringify(segment)).join("."));
    return json ? "JSON_QUERY([payload], " + path + ")" : "JSON_VALUE([payload], " + path + ") COLLATE Latin1_General_100_BIN2";
  };
  const condition = (key, value) => {
    const expression = field(key);
    if (value == null) return expression + " IS NULL";
    if (typeof value !== "object") return expression + " = " + bind(String(value));
    if (Array.isArray(value)) throw new Error("Invalid CRM filter");
    const clauses = Object.entries(value).map(([operator, operand]) => {
      switch (operator) {
        case "$exists": return expression + (operand ? " IS NOT NULL" : " IS NULL");
        case "$gt": return expression + " > " + bind(String(operand));
        case "$regex": return expression + " COLLATE Latin1_General_100_BIN2 LIKE " + bind(crmPatternToLike(operand)) + " ESCAPE '~'";
        case "$in": return operand.length ? expression + " IN (" + operand.map((item) => bind(String(item))).join(", ") + ")" : "1 = 0";
        case "$all": return operand.map((item) => "EXISTS (SELECT 1 FROM OPENJSON(" + field(key, true) +
          ") AS a WHERE a.[value] COLLATE Latin1_General_100_BIN2 = " + bind(String(item)) + ")").join(" AND ") || "1 = 1";
        default: throw new Error("Unsupported CRM filter operator");
      }
    });
    if (!clauses.length) throw new Error("Empty CRM filter");
    return "(" + clauses.join(" AND ") + ")";
  };
  const filter = (query) => Object.entries(query).map(([key, value]) => {
    if (key !== "$and" && key !== "$or") return condition(key, value);
    if (!Array.isArray(value) || !value.length) throw new Error("Invalid CRM logical filter");
    return "(" + value.map(filter).join(key === "$and" ? " AND " : " OR ") + ")";
  }).join(" AND ") || "1 = 1";
  return { parameters, bind, field, filter };
}
