' Autogenererad dold startare for MarcsHalsoAI-DagligGlukos
Option Explicit
Dim sh, q, rc
Set sh = CreateObject("WScript.Shell")
q = Chr(34)
sh.CurrentDirectory = "E:\CHAT-RTX\CLAUDECODE GENERAL BRAIN\APP ideas\marcs-halsoai"
rc = sh.Run("cmd.exe /c " & q & "E:\CHAT-RTX\CLAUDECODE GENERAL BRAIN\APP ideas\marcs-halsoai\schedule\run_glukos.cmd" & q, 0, True)
WScript.Quit rc
