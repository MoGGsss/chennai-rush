@echo off
title Chennai Rush — Network Server
echo.
echo  ============================================================
echo   Chennai Rush — Network Server (PC + Mobile)
echo  ============================================================
echo.
echo   Your PC address:
echo.
echo     Desktop/Laptop  ^>  http://localhost:8080
echo     Mobile (WiFi)   ^>  http://10.100.100.152:8080
echo.
echo   Make sure your phone is on the SAME WiFi network!
echo   Open the mobile URL in Chrome on your phone.
echo.
echo   Press Ctrl+C to stop the server.
echo  ============================================================
echo.
python -m http.server 8080 --bind 0.0.0.0
