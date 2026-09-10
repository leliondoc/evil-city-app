param([string]$Pack = "$env:USERPROFILE\Downloads\Tiny Swords (Free Pack).zip")
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = Split-Path $PSScriptRoot -Parent
$manifestPath = Join-Path $projectRoot 'app/game/assets.json'
$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json -AsHashtable
$archive = [System.IO.Compression.ZipFile]::OpenRead($Pack)
try {
  foreach ($item in @(
    @('fx-dust-small', 'Dust_01.png', 64),
    @('fx-dust-large', 'Dust_02.png', 64),
    @('fx-impact', 'Explosion_01.png', 192),
    @('fx-explosion', 'Explosion_02.png', 192),
    @('fx-fire', 'Fire_01.png', 64)
  )) {
    $entry = $archive.GetEntry("Tiny Swords (Free Pack)/Particle FX/$($item[1])")
    $destination = Join-Path $projectRoot "public/tiny-swords/$($item[0]).png"
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destination, $true)
    $bytes = [System.IO.File]::ReadAllBytes($destination)
    $width = $bytes[16] * 16777216 + $bytes[17] * 65536 + $bytes[18] * 256 + $bytes[19]
    $height = $bytes[20] * 16777216 + $bytes[21] * 65536 + $bytes[22] * 256 + $bytes[23]
    if ($width % $item[2]) { throw "Incomplete animation: $($item[1])" }
    $manifest[$item[0]] = [ordered]@{
      src = "/tiny-swords/$($item[0]).png"; width = $width; height = $height
      frameWidth = $item[2]; frames = $width / $item[2]; anchor = 0.5
    }
  }
  [System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 8) + "`n")
} finally { $archive.Dispose() }
