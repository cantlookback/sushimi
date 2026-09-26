param(
    [string]$OutputDirectory = "backups/local-transfer"
)

$ErrorActionPreference = "Stop"
$compose = @("compose", "--env-file", ".env.local")
$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
$workspace = [System.IO.Path]::GetFullPath((Get-Location).Path)

if (-not $resolvedOutput.StartsWith($workspace + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Output directory must be inside the project workspace."
}

New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null

docker @compose up -d postgres object-storage
if ($LASTEXITCODE -ne 0) { throw "Could not start local data services." }

docker @compose exec -T postgres sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB" -f /tmp/sushimi-local.dump'
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL export failed." }
docker @compose cp postgres:/tmp/sushimi-local.dump (Join-Path $resolvedOutput "database.dump")
if ($LASTEXITCODE -ne 0) { throw "Could not copy PostgreSQL dump." }

docker @compose stop object-storage
if ($LASTEXITCODE -ne 0) { throw "Could not stop local object storage for a consistent export." }
try {
    $mediaArchive = Join-Path $resolvedOutput "media.tar.gz"
    docker @compose run --rm --no-deps -T --volume "${resolvedOutput}:/transfer" --entrypoint tar object-storage -czf /transfer/media.tar.gz -C /data .
    if ($LASTEXITCODE -ne 0) { throw "Media export failed." }
    if (-not (Test-Path -LiteralPath $mediaArchive) -or (Get-Item -LiteralPath $mediaArchive).Length -eq 0) {
        throw "Media archive was not created or is empty."
    }
}
finally {
    docker @compose up -d object-storage
}

docker @compose exec -T postgres rm -f /tmp/sushimi-local.dump

Write-Host "Export created: $resolvedOutput"
Write-Host "Files: database.dump, media.tar.gz"
