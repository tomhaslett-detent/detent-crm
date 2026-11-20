SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @lockResult int;
EXEC @lockResult = sys.sp_getapplock
  @Resource = N'Detent CRM schema migrations',
  @LockMode = 'Exclusive',
  @LockOwner = 'Transaction',
  @LockTimeout = 10000;
IF @lockResult < 0 THROW 50000, 'Could not acquire CRM migration lock.', 1;

IF SCHEMA_ID(N'crm') IS NULL EXEC(N'CREATE SCHEMA crm AUTHORIZATION dbo');

IF OBJECT_ID(N'crm.Record', N'U') IS NULL
BEGIN
  CREATE TABLE crm.Record (
    entity varchar(32) COLLATE Latin1_General_100_BIN2 NOT NULL,
    id nvarchar(128) COLLATE Latin1_General_100_BIN2 NOT NULL,
    created_at datetime2(3) NOT NULL,
    updated_at datetime2(3) NOT NULL,
    source_key nvarchar(240) COLLATE Latin1_General_100_BIN2 NULL,
    owner_email nvarchar(320) NULL,
    team_key nvarchar(128) NULL,
    payload nvarchar(max) NOT NULL,
    CONSTRAINT PK_Crm_Record PRIMARY KEY (entity, id),
    CONSTRAINT CK_Crm_Record_Json CHECK (ISJSON(payload) = 1),
    CONSTRAINT CK_Crm_Record_Entity CHECK (entity IN (
      'Account', 'Contact', 'Deal', 'Activity', 'CrmAttachment', 'CrmHelpArticle',
      'CrmRegionalPreference', 'CrmSavedView', 'CrmSettings', 'TeamInvite', 'User'
    ))
  );
  CREATE UNIQUE INDEX UX_Crm_Record_Source ON crm.Record(entity, source_key)
    WHERE source_key IS NOT NULL;
  CREATE INDEX IX_Crm_Record_Team ON crm.Record(entity, team_key, id);
  CREATE INDEX IX_Crm_Record_Owner ON crm.Record(entity, owner_email, id);
END;

COMMIT TRANSACTION;
