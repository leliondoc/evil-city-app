param([Parameter(Mandatory=$true)][string]$Archive)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$target = Join-Path $PSScriptRoot '../public/audio/tommusic'
New-Item -ItemType Directory -Force -Path $target | Out-Null
$clips = @{
  'chop-1' = 'Chopping and Mining/chop 1.wav'
  'chop-2' = 'Chopping and Mining/chop 2.wav'
  'mine-1' = 'Chopping and Mining/mine 1.wav'
  'mine-2' = 'Chopping and Mining/mine 2.wav'
  'sword-1' = 'Attacks/Sword Attacks Hits and Blocks/Sword Attack 1.wav'
  'sword-2' = 'Attacks/Sword Attacks Hits and Blocks/Sword Attack 2.wav'
  'bow' = 'Attacks/Bow Attacks Hits and Blocks/Bow Attack 1.wav'
  'magic' = 'Spells/Spell Impact 1.wav'
  'fire' = 'Spells/Fireball 1.wav'
  'deposit' = 'Doors Gates and Chests/Chest Close 1.wav'
  'complete' = 'Doors Gates and Chests/Door Open 1.wav'
}
$zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Archive))
try {
  foreach ($clip in $clips.GetEnumerator()) {
    $entry = $zip.GetEntry("Free Fantasy SFX Pack By TomMusic/WAV Files/SFX/$($clip.Value)")
    if (!$entry) { throw "Missing TomMusic sound: $($clip.Value)" }
    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $target "$($clip.Key).wav"), $true)
  }
} finally { $zip.Dispose() }
Write-Output "Imported $($clips.Count) TomMusic effects for the local audio trial."
