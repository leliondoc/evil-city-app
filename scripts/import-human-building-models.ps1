param(
  [Parameter(Mandatory=$true)][string]$FreeArchive,
  [Parameter(Mandatory=$true)][string]$UpdateArchive
)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$destination = Join-Path $PSScriptRoot '../public/tiny-swords'
$copies = @(
  @($UpdateArchive, 'Tiny Swords (Update 010)/Factions/Knights/Buildings/Castle/Castle_Blue.png', 'human-fortress-blue'),
  @($FreeArchive, 'Tiny Swords (Free Pack)/Buildings/Blue Buildings/Barracks.png', 'human-barracks-blue'),
  @($FreeArchive, 'Tiny Swords (Free Pack)/Buildings/Blue Buildings/Archery.png', 'human-archery-blue'),
  @($FreeArchive, 'Tiny Swords (Free Pack)/Buildings/Yellow Buildings/Barracks.png', 'human-barracks-yellow'),
  @($FreeArchive, 'Tiny Swords (Free Pack)/Buildings/Yellow Buildings/Castle.png', 'human-citadel-yellow')
)
foreach ($copy in $copies) {
  $archive = [System.IO.Compression.ZipFile]::OpenRead($copy[0])
  try {
    $entry = $archive.GetEntry($copy[1])
    if (!$entry) { throw "Missing original model: $($copy[1])" }
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $destination "$($copy[2]).png"), $true)
  } finally { $archive.Dispose() }
}
