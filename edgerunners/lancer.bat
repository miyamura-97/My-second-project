@echo off
rem Lance Cyberpunk: Edgerunners (fan-projet) en local : double-cliquer sur ce fichier.
rem Les modules JavaScript ne se chargent pas en ouvrant index.html directement,
rem il faut un petit serveur local (Python).
cd /d "%~dp0"

where py >/dev/null 2>nul
if %errorlevel%==0 (
  set PYCMD=py -3
) else if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" (
  set PYCMD="%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
) else (
  set PYCMD=python
)

echo Edgerunners : http://localhost:8000
echo Laisse cette fenetre ouverte. La fermer arrete le site.
start "" cmd /c "timeout /t 2 >/dev/null & start http://localhost:8000/"
%PYCMD% -m http.server 8000
if errorlevel 1 (
  echo.
  echo Echec : Python introuvable, ou le port 8000 est deja pris.
  echo Installe Python depuis python.org en cochant "Add python.exe to PATH", puis relance.
  pause
)
