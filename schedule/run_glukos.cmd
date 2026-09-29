@echo off
rem Autogenererad av install_glukos_task.ps1 - Marcs HalsoAI nattliga glukosjobb.
cd /d "E:\CHAT-RTX\CLAUDECODE GENERAL BRAIN\APP ideas\marcs-halsoai"
echo ---------- %DATE% %TIME% >> "E:\CHAT-RTX\CLAUDECODE GENERAL BRAIN\APP ideas\marcs-halsoai\logs\glukos-task.log"
"C:\Program Files\nodejs\node.exe" "E:\CHAT-RTX\CLAUDECODE GENERAL BRAIN\APP ideas\marcs-halsoai\tools\daglig-glukos.js"  >> "E:\CHAT-RTX\CLAUDECODE GENERAL BRAIN\APP ideas\marcs-halsoai\logs\glukos-task.log" 2>&1
