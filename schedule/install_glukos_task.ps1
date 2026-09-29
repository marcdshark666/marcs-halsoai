<#
Registrerar det nattliga glukos- och matjobbet for Marcs HalsoAI.

  powershell -ExecutionPolicy Bypass -File .\schedule\install_glukos_task.ps1
  powershell -ExecutionPolicy Bypass -File .\schedule\install_glukos_task.ps1 -Time 23:50
  powershell -ExecutionPolicy Bypass -File .\schedule\install_glukos_task.ps1 -Remove

VAD DEN GOR
tools\daglig-glukos.js hamtar dygnets CGM-varden fran Dexcom Share, raknar
dygnsstatistik (medel, TIR, GMI, dygnsdelar, trend), skickar en Google Foto-
lank till Marcs Telegram sa han kan valja dagens matbilder, tolkar bilderna
(livsmedel + kolhydrater), ritar kurvan efter varje maltid och bygger + deployar
marcs-halsoai.vercel.app.

VARFOR 23:55
Dexcom Share ger bara de senaste 24 timmarna, sa jobbet maste ga innan
midnatt for att dygnet ska bli helt. Fototsteget vantar upp till 40 min pa
Marc, sa deployen landar senast ~00:40.

Filen ar sparad med UTF-8 BOM med avsikt: PowerShell 5.1 laser en .ps1 utan
BOM som cp1252 och a/o/a-tecken gor skriptet ogiltigt.
#>
param([string]$Time = "23:55",
      [string]$TaskName = "MarcsHalsoAI-DagligGlukos",
      [string]$Slug = "glukos",
      [string]$ExtraArgs = "",
      [switch]$Remove)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $Node) { throw "hittar inte node.exe i PATH" }

if ($Remove) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Borttagen: $TaskName"
  return
}

$LogDir = Join-Path $Root "logs"
New-Item -ItemType Directory -Force $LogDir | Out-Null
$Log = Join-Path $LogDir "$Slug-task.log"
$Cmd = Join-Path $PSScriptRoot "run_$Slug.cmd"
$Vbs = Join-Path $PSScriptRoot "$Slug.vbs"

# Samma uppdelning som ovriga schemalagda jobb i APP ideas: kommandot i en .cmd,
# VBS:en startar den dolt sa inget konsolfonster blinkar forbi.
$cmdLines = @(
  "@echo off",
  "rem Autogenererad av install_glukos_task.ps1 - Marcs HalsoAI nattliga glukosjobb.",
  "cd /d ""$Root""",
  "echo ---------- %DATE% %TIME% >> ""$Log""",
  """$Node"" ""$Root\tools\daglig-glukos.js"" $ExtraArgs >> ""$Log"" 2>&1"
)
Set-Content -Path $Cmd -Value $cmdLines -Encoding ascii

$vbsLines = @(
  "' Autogenererad dold startare for $TaskName",
  "Option Explicit",
  "Dim sh, q, rc",
  "Set sh = CreateObject(""WScript.Shell"")",
  "q = Chr(34)",
  "sh.CurrentDirectory = ""$Root""",
  "rc = sh.Run(""cmd.exe /c "" & q & ""$Cmd"" & q, 0, True)",
  "WScript.Quit rc"
)
Set-Content -Path $Vbs -Value $vbsLines -Encoding ascii

# Register-ScheduledTask, INTE schtasks /TR: backslash-citaten runt sokvagen blir
# literala under PS 7 och uppgiften dor med slutkod 1 utan en enda loggrad.
$action  = New-ScheduledTaskAction -Execute "C:\Windows\System32\wscript.exe" `
                                   -Argument "//B //Nologo `"$Vbs`"" -WorkingDirectory $Root
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
              -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
              -MultipleInstances IgnoreNew -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries
$desc = "Marcs HalsoAI: hamtar dygnets Dexcom-varden, raknar dygnsstatistik, " +
        "later Marc valja dagens matbilder via Telegram + Google Foto, tolkar " +
        "kolhydrater och kurvan efter maten, och deployar marcs-halsoai.vercel.app. " +
        "Maste ga fore midnatt (Dexcom Share ger bara 24 h)."

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Description $desc -Force | Out-Null

$t = Get-ScheduledTask -TaskName $TaskName
Write-Host "Klart: '$TaskName' kor dagligen $Time."
Write-Host ("Task To Run: " + ($t.Actions | ForEach-Object { $_.Execute + " " + $_.Arguments }))
Write-Host "Testa: Start-ScheduledTask -TaskName $TaskName ; sedan Get-Content '$Log' -Tail 30"
