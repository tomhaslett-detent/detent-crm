[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][ValidateSet('Dev','Live')][string]$Environment,
    [Parameter(Mandatory)][ValidateRange(1024,65535)][int]$BackendPort,
    [Parameter(Mandatory)][ValidatePattern('^[A-Fa-f0-9]{40}$')][string]$CertificateThumbprint,
    [ValidateSet('My','WebHosting')][string]$CertificateStore = 'My',
    [string]$SiteRoot = 'C:\inetpub\detent'
)

$ErrorActionPreference = 'Stop'
$suffix = if ($Environment -eq 'Dev') { 'crm-dev' } else { 'crm' }
$siteName = "Detent-CRM-$Environment"
$hostname = "$suffix.mialab.co.uk"
$webRoot = Join-Path $SiteRoot $suffix
Import-Module WebAdministration
$certificate = Get-Item -LiteralPath "Cert:\LocalMachine\$CertificateStore\$CertificateThumbprint"
$now = Get-Date
$names = @($certificate.DnsNameList | ForEach-Object { $_.Unicode })
if (!$certificate.HasPrivateKey -or $certificate.NotBefore -gt $now -or $certificate.NotAfter -le $now -or
    ($hostname -notin $names -and '*.mialab.co.uk' -notin $names)) {
    throw "The supplied certificate cannot serve $hostname."
}
if ((Test-Path -LiteralPath "IIS:\Sites\$siteName") -or (Test-Path -LiteralPath "IIS:\AppPools\$siteName")) {
    throw "The site or application pool already exists. Review it before making changes."
}
if (Get-WebBinding -Protocol https | Where-Object { $_.bindingInformation -like "*:443:$hostname" }) {
    throw "$hostname already has an IIS HTTPS binding."
}
if (!$PSCmdlet.ShouldProcess($hostname, "Create stopped IIS site $siteName")) { return }

& "$PSScriptRoot\New-CrmIisWebRoot.ps1" -Environment $Environment -WebRoot $webRoot -BackendPort $BackendPort
Add-Type -AssemblyName 'Microsoft.Web.Administration'
$manager = [Microsoft.Web.Administration.ServerManager]::new()
try {
    $pool = $manager.ApplicationPools.Add($siteName)
    $pool.ManagedRuntimeVersion = ''
    $pool.AutoStart = $false
    $binding = "*:443:$hostname"
    $site = $manager.Sites.Add($siteName, 'https', $binding, $webRoot)
    $site.ServerAutoStart = $false
    $site.Applications['/'].ApplicationPoolName = $siteName
    $site.Bindings[0].SslFlags = [Microsoft.Web.Administration.SslFlags]::Sni
    $site.Bindings[0].CertificateHash = $certificate.GetCertHash()
    $site.Bindings[0].CertificateStoreName = $CertificateStore
    $manager.CommitChanges()
    Write-Output "Created $siteName for $hostname with automatic start disabled."
} finally {
    $manager.Dispose()
}
