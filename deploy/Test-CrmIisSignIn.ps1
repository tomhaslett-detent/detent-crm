[CmdletBinding()]
param([ValidateSet('Dev','Live')][string]$Environment = 'Dev')

$ErrorActionPreference = 'Stop'
$origin = if ($Environment -eq 'Dev') { 'https://crm-dev.mialab.co.uk' } else { 'https://crm.mialab.co.uk' }
$database = "Detent-CRM-$Environment"
$ready = Invoke-RestMethod -Uri "$origin/health/ready" -TimeoutSec 10
if ($ready.status -ne 'ok' -or $ready.database -ne $database) { throw "Expected SQL readiness for $database." }
$credential = Get-Credential -Message "Enter an existing CRM $Environment user to verify sign-in."
if (!$credential) { throw 'Sign-in verification was cancelled.' }
$session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$headers = @{ Origin = $origin }
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($credential.Password)
try {
    $body = @{
        email = $credential.UserName
        password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } | ConvertTo-Json -Compress
    $response = Invoke-RestMethod -Uri "$origin/api/auth/login" -Method Post -TimeoutSec 10 -Headers $headers -ContentType 'application/json' -Body $body -WebSession $session
    if (!$response.ok) { throw 'CRM sign-in did not succeed.' }
} finally {
    $body = $null
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $credential.Password.Dispose()
}
try {
    $user = Invoke-RestMethod -Uri "$origin/api/auth/me" -TimeoutSec 10 -WebSession $session
    if (!$user.id -or $user.email -ne $credential.UserName) { throw 'CRM did not return the expected signed-in account.' }
} finally {
    [void](Invoke-RestMethod -Uri "$origin/api/auth/logout" -Method Post -TimeoutSec 10 -Headers $headers -WebSession $session)
}
Write-Output "Verified $Environment sign-in and sign-out through IIS with $database."
