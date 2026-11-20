import { randomUUID } from "node:crypto";
import sql from "mssql";
import { hashCrmPassword } from "./sql-auth.js";
import { crmSqlConfig } from "./sql-runtime.js";
import { iisEnvironment } from "./iis-environment.js";

const { database, environment } = iisEnvironment();
const email = process.env.CRM_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const fullName = process.env.CRM_BOOTSTRAP_NAME?.trim();
if (!email || email.length > 320 || !/^[^@\s]+@detentgtm\.io$/.test(email) || !fullName || fullName.length > 200) {
  throw new Error("Provide CRM_BOOTSTRAP_EMAIL at detentgtm.io and CRM_BOOTSTRAP_NAME");
}
const hash = await hashCrmPassword(process.env.CRM_BOOTSTRAP_PASSWORD);
delete process.env.CRM_BOOTSTRAP_PASSWORD;
const pool = await new sql.ConnectionPool(crmSqlConfig()).connect();
try {
  await pool.request()
    .input("id", sql.UniqueIdentifier, randomUUID())
    .input("email", sql.NVarChar(320), email)
    .input("full_name", sql.NVarChar(200), fullName)
    .input("hash", sql.VarChar(200), hash)
    .input("database", sql.NVarChar(128), database)
    .query(`
      IF DB_NAME() <> @database THROW 50002, 'Wrong database', 1;
      SET XACT_ABORT ON;
      BEGIN TRANSACTION;
      IF EXISTS(SELECT 1 FROM crm.AuthAccount WITH (UPDLOCK,HOLDLOCK) WHERE role='admin')
        THROW 50003, 'A CRM administrator already exists', 1;
      INSERT INTO crm.AuthAccount(id,email,full_name,role,password_hash)
      VALUES(@id,@email,@full_name,'admin',@hash);
      COMMIT TRANSACTION;
    `);
  console.log("Created the first CRM " + environment + " administrator.");
} finally {
  await pool.close();
}
