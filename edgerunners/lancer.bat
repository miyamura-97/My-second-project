@echo off
rem Lance Cyberpunk: Edgerunners (fan-projet) en local sur Windows : double-cliquer sur ce fichier.
rem Les modules JavaScript ne se chargent pas en ouvrant index.html directement
rem (file://), il faut un petit serveur local.
cd /d "%~dp0"
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8000/"
where py >nul 2>nul && (py -3 -m http.server 8000) || (python -m http.server 8000)
