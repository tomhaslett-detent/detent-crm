[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$SqlServer,
    [Parameter(Mandatory)][ValidateSet('Dev', 'Live')][string]$Environment,
    [PSCredential]$SqlCredential,
    [switch]$CreateDatabase
)

$ErrorActionPreference = 'Stop'
$database = "Detent-CRM-$Environment"
$builder = [System.Data.SqlClient.SqlConnectionStringBuilder]::new()
$builder['Data Source'] = $SqlServer
$builder['Initial Catalog'] = if ($CreateDatabase) { 'master' } else { $database }
$builder['Encrypt'] = $true
$builder['TrustServerCertificate'] = $false
$builder['Application Name'] = 'Detent CRM database setup'
$builder['Integrated Security'] = !$SqlCredential
$connection = [System.Data.SqlClient.SqlConnection]::new($builder.ConnectionString)
if ($SqlCredential) {
    $password = $SqlCredential.Password.Copy()
    $password.MakeReadOnly()
    $connection.Credential = [System.Data.SqlClient.SqlCredential]::new($SqlCredential.UserName, $password)
}

try {
    $connection.Open()
    if ($CreateDatabase) {
        $create = $connection.CreateCommand()
        try {
            $create.CommandTimeout = 120
            $create.CommandText = "IF DB_ID(N'$database') IS NULL CREATE DATABASE [$database];"
            [void]$create.ExecuteNonQuery()
        } finally {
            $create.Dispose()
        }
        $connection.ChangeDatabase($database)
    }
    if ($connection.Database -cne $database) { throw "Expected database $database." }
    $migration = $connection.CreateCommand()
    try {
        $migration.CommandTimeout = 120
        $migration.CommandText = Get-Content -LiteralPath (Join-Path $PSScriptRoot '../database/001-crm.sql') -Raw
        [void]$migration.ExecuteNonQuery()
    } finally {
        $migration.Dispose()
    }
    Write-Output "Schema configured in $database."
} finally {
    $connection.Dispose()
}
