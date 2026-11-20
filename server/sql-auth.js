import { createHash, randomBytes, scrypt as deriveKey, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(deriveKey);
const lifetimeSeconds = 8 * 60 * 60;
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const dummyHash = "scrypt-v1$00000000000000000000000000000000$" + "0".repeat(64);
const cookieName = "__Host-detent-crm";
const hashPattern = /^scrypt-v1\$([0-9a-f]{32})\$([0-9a-f]{64})$/;
const tokenPattern = /^[a-zA-Z0-9_-]{43}$/;

export async function hashCrmPassword(password) {
  if (typeof password !== "string" || password.length < 16 || password.length > 200) {
    throw new Error("Use a password between 16 and 200 characters");
  }
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 32, options);
  return "scrypt-v1$" + salt.toString("hex") + "$" + key.toString("hex");
}

export async function verifyCrmPassword(password, hash) {
  if (typeof password !== "string" || password.length > 200) return false;
  const match = hashPattern.exec(hash);
  if (!match) return false;
  const key = await scrypt(password, Buffer.from(match[1], "hex"), 32, options);
  return timingSafeEqual(key, Buffer.from(match[2], "hex"));
}

function sessionDigest(cookie) {
  const token = (cookie ?? "").split(";").map((part) => part.trim())
    .find((part) => part.startsWith(cookieName + "="))?.slice(cookieName.length + 1);
  return tokenPattern.test(token ?? "") ? createHash("sha256").update(token).digest() : null;
}

export function crmSessionCookie(token = "") {
  return cookieName + "=" + token + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + (token ? lifetimeSeconds : 0);
}

export function createCrmSqlAuth(driver, pool) {
  let activeChecks = 0;
  async function authenticate(email, password) {
    if (typeof email !== "string" || typeof password !== "string" || email.length > 320 || password.length > 200) {
      return { status: "invalid" };
    }
    if (activeChecks >= 4) return { status: "busy" };
    activeChecks += 1;
    try {
      const request = pool.request().input("email", driver.NVarChar(320), email.trim().toLowerCase());
      const { recordset: [user] } = await request.query(
        "SELECT id, password_hash, enabled, locked_until FROM crm.AuthAccount WHERE email=@email",
      );
      const valid = await verifyCrmPassword(password, user?.password_hash ?? dummyHash);
      if (!user?.enabled || user.locked_until > new Date()) return { status: "invalid" };
      if (!valid) {
        await pool.request().input("id", driver.UniqueIdentifier, user.id).query(`
          UPDATE crm.AuthAccount
          SET locked_until = CASE WHEN (CASE WHEN locked_until <= SYSUTCDATETIME() THEN 0 ELSE failed_attempts END) >= 4
                                  THEN DATEADD(minute, 15, SYSUTCDATETIME()) ELSE NULL END,
              failed_attempts = (CASE WHEN locked_until <= SYSUTCDATETIME() THEN 0 ELSE failed_attempts END) + 1
          WHERE id=@id AND enabled=1 AND (locked_until IS NULL OR locked_until <= SYSUTCDATETIME());
        `);
        return { status: "invalid" };
      }

      const token = randomBytes(32).toString("base64url");
      const digest = createHash("sha256").update(token).digest();
      const result = await pool.request()
        .input("id", driver.UniqueIdentifier, user.id)
        .input("digest", driver.Binary(32), digest)
        .input("hash", driver.VarChar(200), user.password_hash)
        .input("seconds", driver.Int, lifetimeSeconds).query(`
          SET XACT_ABORT ON;
          BEGIN TRANSACTION;
          UPDATE crm.AuthAccount SET failed_attempts=0, locked_until=NULL
          WHERE id=@id AND enabled=1 AND password_hash=@hash
            AND (locked_until IS NULL OR locked_until <= SYSUTCDATETIME());
          IF @@ROWCOUNT = 1
          BEGIN
            INSERT INTO crm.AuthSession(token_digest,user_id,expires_at)
            VALUES(@digest,@id,DATEADD(second,@seconds,SYSUTCDATETIME()));
            COMMIT TRANSACTION;
            SELECT CAST(1 AS bit) AS authenticated;
          END
          ELSE
          BEGIN
            ROLLBACK TRANSACTION;
            SELECT CAST(0 AS bit) AS authenticated;
          END;
        `);
      return result.recordset[0].authenticated ? { status: "ok", token } : { status: "invalid" };
    } finally {
      activeChecks -= 1;
    }
  }

  async function userFor(cookie) {
    const digest = sessionDigest(cookie);
    if (!digest) return null;
    const { recordset: [user] } = await pool.request().input("digest", driver.Binary(32), digest).query(`
      SELECT a.id, a.email, a.full_name, a.role FROM crm.AuthSession s
      INNER JOIN crm.AuthAccount a ON a.id=s.user_id
      WHERE s.token_digest=@digest AND a.enabled=1 AND s.expires_at > SYSUTCDATETIME()
    `);
    return user ?? null;
  }

  async function signOut(cookie) {
    const digest = sessionDigest(cookie);
    if (digest) await pool.request().input("digest", driver.Binary(32), digest)
      .query("DELETE FROM crm.AuthSession WHERE token_digest=@digest");
  }

  return { authenticate, userFor, signOut };
}
