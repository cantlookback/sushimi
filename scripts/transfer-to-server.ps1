param(
    [Parameter(Mandatory = $true)]
    [string]$Server,
    [string]$RemoteDirectory = "/home/sushimi",
    [string]$Image = "cantlookback/sushimi:latest",
    [switch]$SkipImagePublish,
    [switch]$ConfirmReplace
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path "$PSScriptRoot/..").Path

if (-not $ConfirmReplace) {
    throw "Pass -ConfirmReplace because this operation replaces production data."
}

Push-Location $repositoryRoot
try {
    if (-not $SkipImagePublish) {
        & "$repositoryRoot/deploy_image.ps1" -Image $Image
        if ($LASTEXITCODE -ne 0) { throw "Image publishing failed." }
    }

    & "$PSScriptRoot/export-local-data.ps1"
    if ($LASTEXITCODE -ne 0) { throw "Local data export failed." }

    $remoteTransfer = "$RemoteDirectory/local-transfer"
    ssh $Server "mkdir -p '$RemoteDirectory/scripts' '$remoteTransfer'"
    if ($LASTEXITCODE -ne 0) { throw "Could not prepare the server directories." }

    scp docker-compose.prod.yml "${Server}:${RemoteDirectory}/docker-compose.prod.yml"
    if ($LASTEXITCODE -ne 0) { throw "Could not upload docker-compose.prod.yml." }
    scp scripts/import-production-data.sh scripts/backup.sh "${Server}:${RemoteDirectory}/scripts/"
    if ($LASTEXITCODE -ne 0) { throw "Could not upload server scripts." }
    scp backups/local-transfer/database.dump backups/local-transfer/media.tar.gz "${Server}:${remoteTransfer}/"
    if ($LASTEXITCODE -ne 0) { throw "Could not upload exported data." }

    $remoteCommand = "cd '$RemoteDirectory' && docker compose -f docker-compose.prod.yml pull app && sh scripts/import-production-data.sh --confirm-replace '$remoteTransfer'"
    ssh $Server $remoteCommand
    if ($LASTEXITCODE -ne 0) { throw "Production import failed." }

    Write-Host "Production data transfer completed successfully."
}
finally {
    Pop-Location
}
