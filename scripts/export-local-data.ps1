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

$mediaDirectory = Join-Path $resolvedOutput "media"
$mediaArchive = Join-Path $resolvedOutput "media.tar.gz"
node --env-file=.env.local scripts/transfer-media.mjs export $mediaDirectory
if ($LASTEXITCODE -ne 0) { throw "Media export failed." }
if (Test-Path -LiteralPath $mediaArchive) { Remove-Item -LiteralPath $mediaArchive -Force }
tar -czf $mediaArchive -C $mediaDirectory .
if ($LASTEXITCODE -ne 0) { throw "Could not create media archive." }
Remove-Item -LiteralPath $mediaDirectory -Recurse -Force

docker @compose exec -T postgres rm -f /tmp/sushimi-local.dump

Write-Host "Export created: $resolvedOutput"
Write-Host "Files: database.dump, media.tar.gz"
