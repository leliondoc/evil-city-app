param([Parameter(Mandatory=$true)][string]$Archive)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$target = Join-Path $PSScriptRoot '../public/audio/tommusic'
New-Item -ItemType Directory -Force -Path $target | Out-Null
$clips = @{
  'chop-1' = 'Chopping and Mining/chop 1.wav'
  'chop-2' = 'Chopping and Mining/chop 2.wav'
  'chop-3' = 'Chopping and Mining/chop 3.wav'
  'chop-4' = 'Chopping and Mining/chop 4.wav'
  'mine-1' = 'Chopping and Mining/mine 1.wav'
  'mine-2' = 'Chopping and Mining/mine 2.wav'
  'mine-3' = 'Chopping and Mining/mine 3.wav'
  'mine-4' = 'Chopping and Mining/mine 4.wav'
  'sword-1' = 'Attacks/Sword Attacks Hits and Blocks/Sword Attack 1.wav'
  'sword-2' = 'Attacks/Sword Attacks Hits and Blocks/Sword Attack 2.wav'
  'sword-3' = 'Attacks/Sword Attacks Hits and Blocks/Sword Attack 3.wav'
  'hit-1' = 'Attacks/Sword Attacks Hits and Blocks/Sword Impact Hit 1.wav'
  'hit-2' = 'Attacks/Sword Attacks Hits and Blocks/Sword Impact Hit 2.wav'
  'block-1' = 'Attacks/Sword Attacks Hits and Blocks/Sword Blocked 1.wav'
  'block-2' = 'Attacks/Sword Attacks Hits and Blocks/Sword Blocked 2.wav'
  'equip' = 'Attacks/Sword Attacks Hits and Blocks/Sword Unsheath 1.wav'
  'bow' = 'Attacks/Bow Attacks Hits and Blocks/Bow Attack 1.wav'
  'bow-2' = 'Attacks/Bow Attacks Hits and Blocks/Bow Attack 2.wav'
  'arrow-hit-1' = 'Attacks/Bow Attacks Hits and Blocks/Bow Impact Hit 1.wav'
  'arrow-hit-2' = 'Attacks/Bow Attacks Hits and Blocks/Bow Impact Hit 2.wav'
  'magic' = 'Spells/Spell Impact 1.wav'
  'magic-2' = 'Spells/Spell Impact 2.wav'
  'heal' = 'Spells/Spell Impact 3.wav'
  'fire' = 'Spells/Fireball 1.wav'
  'fire-2' = 'Spells/Fireball 2.wav'
  'ritual' = 'Spells/Firebuff 2.wav'
  'rubble' = 'Spells/Rock Wall 1.wav'
  'heavy-hit' = 'Spells/Rock Meteor Throw 1.wav'
  'deposit' = 'Doors Gates and Chests/Chest Close 1.wav'
  'complete' = 'Doors Gates and Chests/Door Open 1.wav'
  'capture' = 'Doors Gates and Chests/Gate Close.wav'
  'dirt-1' = 'Footsteps/Dirt/Dirt Walk 1.wav'
  'dirt-2' = 'Footsteps/Dirt/Dirt Walk 2.wav'
  'stone-1' = 'Footsteps/Stone/Stone Walk 1.wav'
  'stone-2' = 'Footsteps/Stone/Stone Walk 2.wav'
  'wood-1' = 'Footsteps/Wood/Wood Walk 1.wav'
  'wood-2' = 'Footsteps/Wood/Wood Walk 2.wav'
  'armor-1' = 'Footsteps/Stone/Stone Chain Walk 1.wav'
  'armor-2' = 'Footsteps/Stone/Stone Chain Walk 2.wav'
  'fall' = 'Footsteps/Dirt/Dirt Land.wav'
}
$zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Archive))
try {
  foreach ($clip in $clips.GetEnumerator()) {
    $entry = $zip.GetEntry("Free Fantasy SFX Pack By TomMusic/WAV Files/SFX/$($clip.Value)")
    if (!$entry) { throw "Missing TomMusic sound: $($clip.Value)" }
    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $target "$($clip.Key).wav"), $true)
  }
} finally { $zip.Dispose() }
Write-Output "Imported $($clips.Count) TomMusic effects used by Evil City."
