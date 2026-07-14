@echo off
cd /d "%~dp0"
echo Running daily Google Analytics 4 data import...
node scripts\import-ga4.js --days=2
echo Done!
