param([string]$Pack = "$env:USERPROFILE\Downloads\Tiny Swords (Enemy Pack).zip")
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = Split-Path $PSScriptRoot -Parent
$path = Join-Path $root 'app/game/assets.json'
$manifest = Get-Content -Raw $path | ConvertFrom-Json -AsHashtable
foreach ($action in @('idle', 'walk', 'attack')) {
  Copy-Item -LiteralPath (Join-Path $root "public/tiny-swords/bestiary-hex-shaman-$action.png") -Destination (Join-Path $root "public/tiny-swords/alchemist-$action.png")
  $manifest["alchemist-$action"] = $manifest["bestiary-hex-shaman-$action"].Clone()
  $manifest["alchemist-$action"].src = "/tiny-swords/alchemist-$action.png"
}
$zip = [System.IO.Compression.ZipFile]::OpenRead($Pack)
try {
  $entry = $zip.GetEntry('Tiny Swords (Enemy Pack)/Enemy Pack/Hex Shaman/Hex Shaman_Avatar.png')
  $dest = Join-Path $root 'public/tiny-swords/alchemist-avatar.png'
  [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $dest, $true)
  $bytes = [System.IO.File]::ReadAllBytes($dest)
  $w = $bytes[18] * 256 + $bytes[19]; $h = $bytes[22] * 256 + $bytes[23]
  $manifest['alchemist-avatar'] = [ordered]@{ src='/tiny-swords/alchemist-avatar.png'; width=$w; height=$h; frameWidth=$w; frames=1; anchor=0.67 }
  [System.IO.File]::WriteAllText($path, ($manifest | ConvertTo-Json -Depth 8) + "`n")
} finally { $zip.Dispose() }
