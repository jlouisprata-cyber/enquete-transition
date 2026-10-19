param([Parameter(Mandatory=$true)][string]$Source)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($Source)
try {
  function Read-XmlEntry([string]$Name) {
    $reader = [IO.StreamReader]::new($archive.GetEntry($Name).Open())
    try { return [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
  }
  $shared = Read-XmlEntry 'xl/sharedStrings.xml'
  $strings = @($shared.sst.si | ForEach-Object { $_.InnerText })
  $sheet = Read-XmlEntry 'xl/worksheets/sheet2.xml'
  $questions = foreach ($row in $sheet.worksheet.sheetData.row) {
    if ([int]$row.r -eq 1) { continue }
    $values = @{}
    foreach ($cell in $row.c) {
      $value = [string]$cell.v
      if ($cell.t -eq 's') { $value = $strings[[int]$cell.v] }
      $values[$cell.r -replace '\d',''] = $value
    }
    if ($values.A) {
      [ordered]@{ id = "$($values.A)-$($values.D)"; family = $values.A; title = $values.B; scale = $values.C; text = $values.E.Trim(); type = $values.F }
    }
  }
  $target = Join-Path $PSScriptRoot '../src/data/questionnaire.json'
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
  [IO.File]::WriteAllText($target, (ConvertTo-Json -InputObject @($questions) -Depth 4), [Text.UTF8Encoding]::new($false))
  Write-Output "Imported $(@($questions).Count) questions."
} finally { $archive.Dispose() }
