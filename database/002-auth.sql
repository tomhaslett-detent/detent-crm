SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @lockResult int;
EXEC @lockResult = sys.sp_getapplock
  @Resource = N'Detent CRM schema migrations',
  @LockMode = 'Exclusive',
  @LockOwner = 'Transaction',
  @LockTimeout = 10000;
IF @lockResult < 0 THROW 50000, 'Could not acquire CRM migration lock.', 1;
IF SCHEMA_ID(N'crm') IS NULL THROW 50001, 'Apply the CRM record migration first.', 1;

IF OBJECT_ID(N'crm.AuthAccount', N'U') IS NULL
BEGIN
  CREATE TABLE crm.AuthAccount (
    id uniqueidentifier NOT NULL PRIMARY KEY,
    email nvarchar(320) COLLATE Latin1_General_100_CI_AS NOT NULL UNIQUE,
    full_name nvarchar(200) NOT NULL,
    role varchar(10) NOT NULL CHECK (role IN ('admin', 'user')),
    password_hash varchar(200) NOT NULL,
    enabled bit NOT NULL DEFAULT 1,
    failed_attempts int NOT NULL DEFAULT 0,
    locked_until datetime2(3) NULL,
    created_at datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID(N'crm.AuthSession', N'U') IS NULL
BEGIN
  CREATE TABLE crm.AuthSession (
    token_digest binary(32) NOT NULL PRIMARY KEY,
    user_id uniqueidentifier NOT NULL REFERENCES crm.AuthAccount(id) ON DELETE CASCADE,
    expires_at datetime2(3) NOT NULL,
    created_at datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX IX_Crm_AuthSession_User ON crm.AuthSession(user_id);
  CREATE INDEX IX_Crm_AuthSession_Expiry ON crm.AuthSession(expires_at);
END;

COMMIT TRANSACTION;
