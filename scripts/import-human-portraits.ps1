param([Parameter(Mandatory=$true)][string]$Archive)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$portraits = @{
  'guard-avatar' = '02'; 'hero-warrior-avatar' = '11';
  'hero-lancer-avatar' = '13'; 'hero-archer-avatar' = '15';
  'hero-monk-avatar' = '14'; 'worker-avatar' = '05'
}
$zip = [System.IO.Compression.ZipFile]::OpenRead($Archive)
try {
  foreach ($key in $portraits.Keys) {
    $entry = $zip.GetEntry("Tiny Swords (Free Pack)/UI Elements/UI Elements/Human Avatars/Avatars_$($portraits[$key]).png")
    if (!$entry) { throw "Missing portrait: $key" }
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $PSScriptRoot "../public/tiny-swords/$key.png"), $true)
  }
  foreach ($pair in @(@('Blue', 'guard-shield'), @('Yellow', 'hero-warrior-shield'))) {
    $entry = $zip.GetEntry("Tiny Swords (Free Pack)/Units/$($pair[0]) Units/Warrior/Warrior_Guard.png")
    if (!$entry) { throw "Missing shield animation: $($pair[1])" }
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $PSScriptRoot "../public/tiny-swords/$($pair[1]).png"), $true)
  }
} finally { $zip.Dispose() }
