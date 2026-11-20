import { createSqlEntities } from "./sql-entities.js";

export function crmSqlConfig(env = process.env) {
  const environment = env.CRM_ENVIRONMENT;
  if (environment !== "Dev" && environment !== "Live") throw new Error("Set CRM_ENVIRONMENT to Dev or Live");
  const server = env.CRM_SQL_HOST?.trim();
  const user = env.CRM_SQL_USER?.trim();
  const password = env.CRM_SQL_PASSWORD;
  const port = Number(env.CRM_SQL_PORT ?? "1433");
  if (!server || !user || !password || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Configure the CRM SQL hostname, credentials and port");
  }
  return {
    server, user, password, port, database: "Detent-CRM-" + environment,
    options: { encrypt: true, trustServerCertificate: false },
    pool: { min: 0, max: 10, idleTimeoutMillis: 30_000 },
    connectionTimeout: 10_000,
    requestTimeout: 30_000,
  };
}

export async function connectCrmSql(driver, env) {
  const config = crmSqlConfig(env);
  const pool = new driver.ConnectionPool(config);
  try {
    await pool.connect();
    const { recordset: [status] } = await pool.request().query(
      "SELECT DB_NAME() AS database_name, OBJECT_ID(N'crm.Record', N'U') AS record_table_id",
    );
    if (status?.database_name !== config.database || !status.record_table_id) {
      throw new Error("The configured CRM database does not have the CRM schema");
    }
    return { entities: createSqlEntities(driver, pool), close: () => pool.close() };
  } catch (error) {
    await pool.close().catch(() => {});
    throw error;
  }
}
