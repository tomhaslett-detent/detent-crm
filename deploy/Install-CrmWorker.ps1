[CmdletBinding()]
param(
    [switch]$TrustLabSqlCertificate,
    [ValidateSet('Dev','Live')][string]$Environment = 'Dev',
    [Parameter(Mandatory)][string]$SqlHost,
    [Parameter(Mandatory)][string]$SqlUser,
    [Parameter(Mandatory)][string]$AdminEmail,
    [Parameter(Mandatory)][string]$AdminName,
    [string]$SqlCaFile,
    [string]$NodePath = 'C:\DetentRuntime\node-v24.22.2-win-x64\node.exe',
    [string]$WinSWPath = 'C:\DetentRuntime\downloads\WinSW-x64.exe',
    [ValidateRange(1024,65535)][int]$Port
)

$ErrorActionPreference = 'Stop'
$principal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (!$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Run on the IIS server as Administrator.' }
Import-Module WebAdministration
$suffix = $Environment.ToLowerInvariant()
$siteName = "Detent-CRM-$Environment"
$origin = if ($Environment -eq 'Dev') { 'https://crm-dev.mialab.co.uk' } else { 'https://crm.mialab.co.uk' }
if (!$PSBoundParameters.ContainsKey('Port')) { $Port = if ($Environment -eq 'Dev') { 3085 } else { 3084 } }
$site = Get-Website -Name $siteName
$webRoot = "C:\inetpub\detent\detent-crm-$suffix"
if (!$site -or $site.physicalPath -ne $webRoot -or $site.State -ne 'Stopped') { throw "Expected the stopped $siteName IIS site and its dedicated web root." }
if (@(Get-ChildItem -LiteralPath $webRoot -Force).Count) { throw 'Expected an empty CRM web root.' }
$serviceName = "DetentCRM${Environment}API"
if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) { throw 'Dev worker service already exists.' }
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw 'Dev loopback port is in use.' }
$source = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$runtimeRoot = "C:\Apps\Detent\crm-$suffix"
$privateRoot = "C:\DetentData\crm-$suffix"
if ((Test-Path -LiteralPath $runtimeRoot) -or (Test-Path -LiteralPath $privateRoot)) { throw 'CRM Dev runtime directories already exist. Review the existing installation.' }
$npm = Join-Path (Split-Path -Parent $NodePath) 'node_modules\npm\bin\npm-cli.js'
foreach ($required in @($NodePath, $npm, $WinSWPath, (Join-Path $source 'dist-iis/server/server.js'))) {
    if (!(Test-Path -LiteralPath $required -PathType Leaf)) { throw "Missing file: $required" }
}
if ((Get-FileHash -LiteralPath $WinSWPath -Algorithm SHA256).Hash -ne '05B82D46AD331CC16BDC00DE5C6332C1EF818DF8CEEFCD49C726553209B3A0DA') {
    throw 'WinSW checksum mismatch.'
}
if ($SqlCaFile) { $SqlCaFile = (Resolve-Path -LiteralPath $SqlCaFile).Path }

function Invoke-Checked([string]$File, [string[]]$Arguments) {
    & $File @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $(Split-Path -Leaf $File)" }
}
function Read-Secret([string]$Prompt) {
    $secret = Read-Host $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $secret.Dispose()
    }
}

if ($Environment -eq 'Live') {
    & "$PSScriptRoot\Test-CrmIisSignIn.ps1" -Environment Dev
    $env:CRM_LIVE_ENABLED = 'true'
} else { $env:CRM_LIVE_ENABLED = $null }
$env:CRM_ENVIRONMENT = $Environment
$env:CRM_PUBLIC_ORIGIN = $origin
$env:CRM_PORT = [string]$Port
$env:CRM_SQL_HOST = $SqlHost
$env:CRM_SQL_USER = $SqlUser
$env:CRM_SQL_TRUST_CERTIFICATE = if ($TrustLabSqlCertificate) { 'true' } else { 'false' }
$env:NODE_EXTRA_CA_CERTS = $SqlCaFile
try {
    $env:CRM_SQL_PASSWORD = Read-Secret "$Environment CRM runtime SQL password"
    $env:CRM_BOOTSTRAP_EMAIL = $AdminEmail
    $env:CRM_BOOTSTRAP_NAME = $AdminName
    $env:CRM_BOOTSTRAP_PASSWORD = Read-Secret "$Environment CRM administrator password (minimum 16 characters)"
    Push-Location $source
    try {
        Invoke-Checked $NodePath @($npm, 'ci', '--omit=dev', '--no-audit', '--no-fund')
        Invoke-Checked $NodePath @('--input-type=module', '-e', "import sql from 'mssql'; import {connectCrmSql} from './server/sql-runtime.js'; const runtime=await connectCrmSql(sql); await runtime.close();")
        Invoke-Checked $NodePath @('server/bootstrap-crm-admin.js')
    } finally { Pop-Location }
    Remove-Item Env:\CRM_BOOTSTRAP_PASSWORD

    [void](New-Item -ItemType Directory -Path $runtimeRoot, $privateRoot)
    Invoke-Checked 'icacls.exe' @($privateRoot, '/inheritance:r', '/grant:r', '*S-1-5-32-544:(OI)(CI)F', '*S-1-5-18:(OI)(CI)F')
    foreach ($item in 'dist-iis','server','node_modules','package.json') {
        Copy-Item -LiteralPath (Join-Path $source $item) -Destination $runtimeRoot -Recurse
    }
    $wrapper = Join-Path $privateRoot "$serviceName.exe"
    Copy-Item -LiteralPath $WinSWPath -Destination $wrapper
    $logs = Join-Path $privateRoot 'logs'
    [void](New-Item -ItemType Directory -Path $logs)
    if ($SqlCaFile) {
        $ca = Join-Path $privateRoot 'sql-ca.pem'
        Copy-Item -LiteralPath $SqlCaFile -Destination $ca
        $env:NODE_EXTRA_CA_CERTS = $ca
    }
    $pairs = foreach ($name in 'CRM_ENVIRONMENT','CRM_LIVE_ENABLED','CRM_PUBLIC_ORIGIN','CRM_PORT','CRM_SQL_HOST','CRM_SQL_USER','CRM_SQL_PASSWORD','CRM_SQL_TRUST_CERTIFICATE','NODE_EXTRA_CA_CERTS') {
        $value = [Environment]::GetEnvironmentVariable($name)
        if ($value) { '<env name="' + $name + '" value="' + [Security.SecurityElement]::Escape($value) + '" />' }
    }
    $nodeXml = [Security.SecurityElement]::Escape($NodePath)
    $settings = @"
<service>
  <id>$serviceName</id><name>Detent CRM $Environment API</name>
  <executable>$nodeXml</executable><arguments>server/start-iis.js</arguments>
  <workingdirectory>$runtimeRoot</workingdirectory>
  <startmode>Automatic</startmode>
  <serviceaccount><domain>NT AUTHORITY</domain><user>LocalService</user></serviceaccount>
  <logpath>$logs</logpath><log mode="roll-by-size" />
  <onfailure action="restart" delay="10 sec" />
  $($pairs -join "`n  ")
</service>
"@
    [IO.File]::WriteAllText((Join-Path $privateRoot "$serviceName.xml"), $settings, [Text.UTF8Encoding]::new($false))
    Invoke-Checked $wrapper @('install')
    Invoke-Checked 'sc.exe' @('sidtype', $serviceName, 'unrestricted')
    $identity = "NT SERVICE\$serviceName"
    Invoke-Checked 'icacls.exe' @($privateRoot, '/grant', "${identity}:(OI)(CI)RX")
    Invoke-Checked 'icacls.exe' @($logs, '/grant', "${identity}:(OI)(CI)M")
    Invoke-Checked 'icacls.exe' @($runtimeRoot, '/grant', "${identity}:(OI)(CI)RX")
    Start-Service -Name $serviceName
    $ready = $false
    for ($attempt=0; $attempt -lt 15; $attempt++) {
        try {
            $result = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/health/ready" -TimeoutSec 3
            if ($result.StatusCode -eq 200 -and ($result.Content | ConvertFrom-Json).database -eq $siteName) {
                $ready = $true
                break
            }
        } catch { Start-Sleep -Seconds 2 }
    }
    if (!$ready) { throw 'CRM worker did not report SQL readiness. IIS was left stopped.' }
    & "$PSScriptRoot\New-CrmIisWebRoot.ps1" -Environment $Environment -WebRoot $webRoot -BackendPort $Port
    Start-Website -Name $siteName
    Write-Output "$Environment IIS started. Run Test-CrmIisSignIn.ps1 to verify HTTPS sign-in."
} finally {
    foreach ($name in 'CRM_SQL_PASSWORD','CRM_BOOTSTRAP_PASSWORD') {
        [Environment]::SetEnvironmentVariable($name, $null)
    }
}
