[CmdletBinding(SupportsShouldProcess)]
param(
    [switch]$TrustLabSqlCertificate,
    [Parameter(Mandatory)][string]$SqlServer,
    [Parameter(Mandatory)][ValidateSet('Dev', 'Live')][string]$Environment,
    [Parameter(Mandatory)][string]$ExportPath,
    [PSCredential]$SqlCredential
)

$ErrorActionPreference = 'Stop'
$jsonOptions = @{}
if ((Get-Command ConvertFrom-Json).Parameters.ContainsKey('DateKind')) {
    $jsonOptions.DateKind = 'String'
}
$source = Get-Content -LiteralPath $ExportPath -Raw -Encoding UTF8 | ConvertFrom-Json @jsonOptions
if ($source.format -cne 'detent-crm' -or $source.version -ne 1 -or !$source.records) {
    throw 'Supply a version 1 Detent CRM JSON export.'
}

$types = @('Account', 'Contact', 'Deal', 'Activity')
$index = @{}
$rows = [System.Data.DataTable]::new()
$widths = @{ entity = 32; id = 128; source_key = 240; owner_email = 320; team_key = 128; payload = -1 }
foreach ($field in $widths.Keys) {
    $column = $rows.Columns.Add($field, [string])
    $column.MaxLength = $widths[$field]
}
foreach ($field in @('created_at', 'updated_at')) {
    [void]$rows.Columns.Add($field, [datetime])
}
foreach ($type in $types) {
    $property = $source.records.PSObject.Properties[$type]
    if (!$property -or $property.Value -isnot [array]) { throw "Export is missing the $type array." }
    $index[$type] = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($record in $property.Value) {
        if ($record.id -isnot [string] -or !$record.id.Trim() -or $record.id.Length -gt 128 -or !$index[$type].Add($record.id)) {
            throw "$type contains a missing, invalid or duplicate ID."
        }
    }
}

foreach ($type in $types) {
    foreach ($record in $source.records.$type) {
        foreach ($link in @(
            @('Account', 'account_id', 'account_ids', 'hubspot_account_ids'),
            @('Contact', 'contact_id', 'contact_ids', 'hubspot_contact_ids'),
            @('Deal', 'deal_id', 'deal_ids')
        )) {
            $target = $link[0]
            foreach ($field in $link[1..($link.Length - 1)]) {
                foreach ($id in @($record.$field)) {
                    if ($id -and ($id -isnot [string] -or !$index[$target].Contains($id))) {
                        throw "$type $($record.id) has an unresolved $field reference."
                    }
                }
            }
        }
        $row = $rows.NewRow()
        $row.entity = $type
        $row.id = $record.id
        $row.created_at = [DateTimeOffset]::Parse([string]$record.created_date, [Globalization.CultureInfo]::InvariantCulture).UtcDateTime
        $row.updated_at = [DateTimeOffset]::Parse([string]$record.updated_date, [Globalization.CultureInfo]::InvariantCulture).UtcDateTime
        if ($record.hubspot_source_key) { $row.source_key = $record.hubspot_source_key }
        if ($record.owner_email) { $row.owner_email = $record.owner_email }
        if ($record.team_key) { $row.team_key = $record.team_key }
        $row.payload = ConvertTo-Json -InputObject $record -Depth 100 -Compress
        $rows.Rows.Add($row)
    }
}

$database = "Detent-CRM-$Environment"
if (!$PSCmdlet.ShouldProcess($database, "Insert $($rows.Rows.Count) CRM records")) { return }
$builder = [System.Data.SqlClient.SqlConnectionStringBuilder]::new()
$builder['Data Source'] = $SqlServer
$builder['Initial Catalog'] = $database
$builder['Encrypt'] = $true
$builder['TrustServerCertificate'] = [bool]$TrustLabSqlCertificate
$builder['Integrated Security'] = !$SqlCredential
$builder['Application Name'] = 'Detent CRM import'
$connection = [System.Data.SqlClient.SqlConnection]::new($builder.ConnectionString)
if ($SqlCredential) {
    $password = $SqlCredential.Password.Copy()
    $password.MakeReadOnly()
    $connection.Credential = [System.Data.SqlClient.SqlCredential]::new($SqlCredential.UserName, $password)
}
try {
    $connection.Open()
    if ($connection.Database -cne $database) { throw "Expected database $database." }
    $transaction = $connection.BeginTransaction()
    try {
        $bulk = [System.Data.SqlClient.SqlBulkCopy]::new($connection, [System.Data.SqlClient.SqlBulkCopyOptions]::CheckConstraints, $transaction)
        try {
            $bulk.DestinationTableName = '[crm].[Record]'
            $bulk.BulkCopyTimeout = 180
            foreach ($column in $rows.Columns) {
                [void]$bulk.ColumnMappings.Add($column.ColumnName, $column.ColumnName)
            }
            $bulk.WriteToServer($rows)
        } finally {
            $bulk.Dispose()
        }
        $transaction.Commit()
    } catch {
        if ($transaction.Connection) { $transaction.Rollback() }
        throw
    } finally {
        $transaction.Dispose()
    }
    Write-Output "Imported $($rows.Rows.Count) records into $database."
} finally {
    $connection.Dispose()
    $rows.Dispose()
}
