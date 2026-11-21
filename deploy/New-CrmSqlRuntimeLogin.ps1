[CmdletBinding(SupportsShouldProcess)]
param(
    [switch]$TrustLabSqlCertificate,
    [Parameter(Mandatory)][string]$SqlServer,
    [Parameter(Mandatory)][ValidateSet('Dev','Live')][string]$Environment,
    [PSCredential]$SqlSetupCredential
)

$ErrorActionPreference = 'Stop'
$database = "Detent-CRM-$Environment"
$login = 'detent_crm_' + $Environment.ToLowerInvariant() + '_app'
if (!$PSCmdlet.ShouldProcess($database, "Create dedicated SQL runtime login $login")) { return }

$builder = [System.Data.SqlClient.SqlConnectionStringBuilder]::new()
$builder['Data Source'] = $SqlServer
$builder['Initial Catalog'] = 'master'
$builder['Encrypt'] = $true
$builder['TrustServerCertificate'] = [bool]$TrustLabSqlCertificate
$builder['Integrated Security'] = !$SqlSetupCredential
$builder['Application Name'] = 'Detent CRM runtime login setup'
$connection = [System.Data.SqlClient.SqlConnection]::new($builder.ConnectionString)
try {
    if ($SqlSetupCredential) {
        $setupPassword = $SqlSetupCredential.Password.Copy()
        $setupPassword.MakeReadOnly()
        $connection.Credential = [System.Data.SqlClient.SqlCredential]::new($SqlSetupCredential.UserName, $setupPassword)
    }
    $connection.Open()
    $runtimePassword = Read-Host "New SQL password for $login (16-128 characters)" -AsSecureString
    if ($runtimePassword.Length -lt 16 -or $runtimePassword.Length -gt 128) { throw 'Password must be 16-128 characters.' }
    $transaction = $connection.BeginTransaction()
    try {
        $command = $connection.CreateCommand()
        try {
            $command.Transaction = $transaction
            $command.CommandText = @"
SET XACT_ABORT ON;
IF DB_ID(N'$database') IS NULL THROW 50001, 'Target CRM database is missing.', 1;
IF OBJECT_ID(N'[$database].crm.Record', N'U') IS NULL OR
   OBJECT_ID(N'[$database].crm.AuthAccount', N'U') IS NULL OR
   OBJECT_ID(N'[$database].crm.AuthSession', N'U') IS NULL
    THROW 50002, 'Apply the target CRM schema first.', 1;
IF SUSER_ID(N'$login') IS NOT NULL THROW 50003, 'The CRM SQL login already exists.', 1;
DECLARE @statement nvarchar(max) = N'CREATE LOGIN [$login] WITH PASSWORD = '
    + QUOTENAME(@secret, '''') + N', DEFAULT_DATABASE = [$database], CHECK_POLICY = ON';
EXEC sys.sp_executesql @statement;
EXEC(N'USE [$database];
    CREATE USER [$login] FOR LOGIN [$login];
    GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::crm.Record TO [$login];
    GRANT SELECT, INSERT, UPDATE ON OBJECT::crm.AuthAccount TO [$login];
    GRANT SELECT, INSERT, DELETE ON OBJECT::crm.AuthSession TO [$login];');
"@
            $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($runtimePassword)
            try {
                $parameter = $command.Parameters.Add('@secret', [System.Data.SqlDbType]::NVarChar, 128)
                $parameter.Value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
                [void]$command.ExecuteNonQuery()
            } finally {
                [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
                $command.Parameters.Clear()
            }
        } finally { $command.Dispose() }
        $transaction.Commit()
    } catch {
        if ($transaction.Connection) { $transaction.Rollback() }
        throw
    } finally { $transaction.Dispose() }
    Write-Output "Created $login with CRM table access in $database."
} finally {
    if ($runtimePassword) { $runtimePassword.Dispose() }
    $connection.Dispose()
    if ($setupPassword) { $setupPassword.Dispose() }
}
