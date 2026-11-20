import { randomUUID } from "node:crypto";
import { sqlArguments } from "./sql-query.js";

const entityNames = [
  "Account", "Contact", "Deal", "Activity", "CrmAttachment", "CrmHelpArticle",
  "CrmRegionalPreference", "CrmSavedView", "CrmSettings", "TeamInvite", "User",
];
const missing = () => Object.assign(new Error("CRM record not found"), { status: 404 });

// Used only by server code, behind the CRM's signed-in policy handlers.
export function createSqlEntities(driver, pool) {
  async function execute(connection, statement, parameters) {
    const request = new driver.Request(connection);
    parameters.forEach((value, index) => request.input("p" + index,
      typeof value === "number" ? driver.Int : value instanceof Date ? driver.DateTime2(3) : driver.NVarChar(driver.MAX),
      value ?? null));
    return request.query(statement);
  }

  async function transaction(work) {
    const tx = new driver.Transaction(pool);
    await tx.begin();
    try {
      const result = await work(tx);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback().catch(() => {});
      throw error;
    }
  }

  const project = (record, fields) => fields
    ? Object.fromEntries(["id", ...fields].filter((name) => Object.hasOwn(record, name)).map((name) => [name, record[name]]))
    : record;

  function entity(name) {
    async function filter(query = {}, sortOrOptions, limitArg, offsetArg, fieldsArg) {
      const paged = typeof sortOrOptions === "object" && sortOrOptions !== null;
      const options = paged ? sortOrOptions : { sort: sortOrOptions, limit: limitArg, skip: offsetArg, fields: fieldsArg };
      const offset = options.cursor ? Number(Buffer.from(options.cursor, "base64url").toString("utf8")) : (options.skip ?? 0);
      const limit = options.limit ?? 100;
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 2147483146 ||
          !Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error("Invalid CRM page");
      const args = sqlArguments();
      const kind = args.bind(name);
      const where = args.filter(query);
      const sort = options.sort ?? "-created_date";
      const key = sort.replace(/^-/, "");
      const order = args.field(key) + (sort.startsWith("-") ? " DESC" : " ASC");
      const result = await execute(pool, "SELECT [payload] FROM [crm].[Record] WHERE [entity] = " + kind +
        " AND (" + where + ") ORDER BY " + order + (key === "id" ? "" : ", [id] ASC") +
        " OFFSET " + args.bind(offset) + " ROWS FETCH NEXT " + args.bind(limit + 1) + " ROWS ONLY", args.parameters);
      const items = result.recordset.slice(0, limit).map(({ payload }) => project(JSON.parse(payload), options.fields));
      return paged ? {
        items, next_cursor: result.recordset.length > limit ? Buffer.from(String(offset + limit)).toString("base64url") : null,
      } : items;
    }

    async function get(id) {
      const [record] = await filter({ id }, "id", 1);
      if (!record) throw missing();
      return record;
    }

    async function count(query = {}) {
      const args = sqlArguments();
      const kind = args.bind(name);
      const where = args.filter(query);
      const result = await execute(pool, "SELECT COUNT_BIG(*) AS [total] FROM [crm].[Record] WHERE [entity] = " + kind + " AND (" + where + ")", args.parameters);
      return Number(result.recordset[0].total);
    }

    async function insert(connection, values) {
      const date = new Date();
      const record = { ...values, id: randomUUID(), created_date: date.toISOString(), updated_date: date.toISOString() };
      await execute(connection, `INSERT INTO [crm].[Record]
        ([entity], [id], [created_at], [updated_at], [source_key], [owner_email], [team_key], [payload])
        VALUES (@p0, @p1, @p2, @p2, @p3, @p4, @p5, @p6)`,
      [name, record.id, date, record.hubspot_source_key || null, record.owner_email || null, record.team_key || null, JSON.stringify(record)]);
      return record;
    }

    async function updateWhere(query, patch) {
      return transaction(async (tx) => {
        const args = sqlArguments();
        const kind = args.bind(name);
        const where = args.filter(query);
        const selected = await execute(tx, "SELECT [payload] FROM [crm].[Record] WITH (UPDLOCK, HOLDLOCK) WHERE [entity] = " +
          kind + " AND (" + where + ")", args.parameters);
        const updated = [];
        for (const { payload } of selected.recordset) {
          const current = JSON.parse(payload);
          const date = new Date();
          const record = { ...current, ...patch, id: current.id, created_date: current.created_date, updated_date: date.toISOString() };
          await execute(tx, `UPDATE [crm].[Record]
            SET [updated_at] = @p2, [source_key] = @p3, [owner_email] = @p4, [team_key] = @p5, [payload] = @p6
            WHERE [entity] = @p0 AND [id] = @p1`,
          [name, record.id, date, record.hubspot_source_key || null, record.owner_email || null, record.team_key || null, JSON.stringify(record)]);
          updated.push(record);
        }
        return updated;
      });
    }

    return {
      filter,
      list: (sort, limit, skip, fields) => filter({}, sort, limit, skip, fields),
      get,
      count,
      create: (values) => insert(pool, values),
      bulkCreate: (input) => transaction(async (tx) => {
        const records = [];
        for (const values of input) records.push(await insert(tx, values));
        return records;
      }),
      update: async (id, values) => {
        const [record] = await updateWhere({ id }, values);
        if (!record) throw missing();
        return record;
      },
      updateMany: async (query, change) => {
        if (!change.$set || Object.keys(change).length !== 1) throw new Error("Only field updates are supported");
        return { updated: (await updateWhere(query, change.$set)).length };
      },
      delete: async (id) => {
        const result = await execute(pool, "DELETE FROM [crm].[Record] WHERE [entity] = @p0 AND [id] = @p1", [name, id]);
        if (result.rowsAffected[0] !== 1) throw missing();
        return { id };
      },
    };
  }

  return Object.fromEntries(entityNames.map((name) => [name, entity(name)]));
}
