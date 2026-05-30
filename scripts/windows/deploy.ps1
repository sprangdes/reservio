$ErrorActionPreference = 'Stop'

$repoPath = 'C:\Users\dist6\reservio'
$tagFile = Join-Path $repoPath '.deploy-tag'
$logFile = Join-Path $repoPath '.deploy-last.log'

Start-Transcript -Path $logFile -Force | Out-Null

try {
    if (!(Test-Path $repoPath)) {
        throw "Repo path not found: $repoPath"
    }

    Set-Location $repoPath

    if (!(Test-Path $tagFile)) {
        throw "Tag file not found: $tagFile"
    }

    $tag = (Get-Content $tagFile -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($tag)) {
        throw 'Deploy tag is empty.'
    }

    Write-Host "Deploying tag: $tag"

    git fetch --all --tags
    git checkout $tag

    docker compose down
    docker compose up -d --build
    docker compose ps

    Write-Host 'Deployment completed successfully.'
} catch {
    Write-Error $_
    exit 1
} finally {
    Stop-Transcript | Out-Null
}
