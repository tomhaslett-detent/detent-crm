[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('Dev', 'Live')][string]$Environment,
    [Parameter(Mandatory)][string]$WebRoot,
    [Parameter(Mandatory)][ValidateRange(1024, 65535)][int]$BackendPort
)

$ErrorActionPreference = 'Stop'
$root = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($WebRoot)
if (Test-Path -LiteralPath $root) {
    if (@(Get-ChildItem -LiteralPath $root -Force).Count) {
        throw 'Use an empty dedicated IIS web root.'
    }
} else {
    [void][IO.Directory]::CreateDirectory($root)
}

$config = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <directoryBrowse enabled="false" />
    <httpErrors existingResponse="PassThrough" />
    <rewrite>
      <rules>
        <rule name="Require HTTPS" stopProcessing="true">
          <match url="(.*)" />
          <conditions><add input="{HTTPS}" pattern="^OFF$" /></conditions>
          <action type="CustomResponse" statusCode="403" statusReason="HTTPS required" statusDescription="Use HTTPS for Detent CRM." />
        </rule>
        <rule name="Detent CRM $Environment worker" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:$BackendPort/{R:1}" appendQueryString="true" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
"@
[void][xml]$config
[IO.File]::WriteAllText((Join-Path $root 'web.config'), $config, [Text.UTF8Encoding]::new($false))
Write-Output "Prepared the $Environment IIS web root at $root for loopback port $BackendPort."
