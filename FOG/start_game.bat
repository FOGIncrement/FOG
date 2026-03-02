@echo off
setlocal
cd /d "%~dp0"
echo Starting local server at http://localhost:5500/index.html
start "FOG" http://localhost:5500/index.html
py -m http.server 5500
