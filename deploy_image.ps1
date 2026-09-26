param(
    [string]$Image = "cantlookback/sushimi:latest"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = $PSScriptRoot

Push-Location $repositoryRoot
try {
    docker build -t $Image .
    if ($LASTEXITCODE -ne 0) { throw "Docker image build failed." }

    docker push $Image
    if ($LASTEXITCODE -ne 0) { throw "Docker image push failed." }

    Write-Host "Published image: $Image"
}
finally {
    Pop-Location
}
