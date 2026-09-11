param([Parameter(Mandatory=$true)][string]$Archive)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$target = Join-Path $PSScriptRoot '../public/audio/alkakrab'
New-Item -ItemType Directory -Force -Path $target | Out-Null
$zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Archive))
try {
  foreach ($number in 1..8) {
    $entry = $zip.GetEntry("Spooky Game Music Pack/mp3/Spooky $number.mp3")
    if (!$entry) { throw "Missing Spooky $number.mp3" }
    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $target "spooky-$number.mp3"), $true)
  }
  [IO.Compression.ZipFileExtensions]::ExtractToFile($zip.GetEntry('Spooky Game Music Pack/AlkaKrab Music License Info.pdf'), (Join-Path $target 'license.pdf'), $true)
} finally { $zip.Dispose() }
Write-Output 'Imported 8 original MP3 tracks and the original license.'
