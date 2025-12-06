@echo off
echo Starting 3D Traffic Simulation...
echo.
echo NOTE: Because this project uses modern JavaScript Modules, it requires a local web server.
echo We are starting a temporary Python server for you.
echo.
echo Please keep this window open while using the simulation.
echo.
start "" "http://localhost:8000"
python -m http.server 8000
pause
