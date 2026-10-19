@echo off
setlocal enabledelayedexpansion
title Madrasi Dosa POS - Setup Direct Silent Printing on this Computer
color 0A

echo ======================================================================
echo          MADRASI DOSA POS - SILENT PRINT SETUP WIZARD
echo ======================================================================
echo  This tool configures this computer for 1-click Direct Silent Printing.
echo  No print preview dialogs, no printer popups - straight to thermal roll!
echo ======================================================================
echo.

:: Detect browser
set "BROWSER_PATH="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_PATH=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_PATH=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
)

if "%BROWSER_PATH%"=="" (
    color 0C
    echo [ERROR] Neither Google Chrome nor Microsoft Edge was found on this computer.
    echo Please install Google Chrome and run this setup again.
    pause
    exit /b 1
)

echo [OK] Detected Browser: %BROWSER_PATH%
echo.

:: Ask for POS URL or default to localhost
echo Enter the POS Address:
echo   - If this computer is the main server, press ENTER for default: http://localhost:5173/pos
echo   - If accessing from another computer on the same Wi-Fi, enter: http://10.158.201.76:5173/pos
echo   - If using cloud deployment, enter your cloud URL (e.g. https://your-domain.com/pos)
echo.
set /p "TARGET_URL=Enter POS URL [Press ENTER for http://localhost:5173/pos]: "
if "%TARGET_URL%"=="" set "TARGET_URL=http://localhost:5173/pos"

echo.
echo Configuring launcher for URL: %TARGET_URL%
echo.

:: Desktop paths
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "BAT_PATH=%DESKTOP_DIR%\Madrasi Dosa POS (Direct Print).bat"

:: Write Desktop .bat launcher
(
echo @echo off
echo title Madrasi Dosa POS Terminal ^(Direct Silent Print^)
echo echo ==============================================================
echo echo   MADRASI DOSA POS - DIRECT SILENT PRINT MODE
echo echo   Zero preview dialogs. Direct hardware thermal printing.
echo echo ==============================================================
echo start "" "%BROWSER_PATH%" --user-data-dir="%%LOCALAPPDATA%%\MadrasiDosaPOSProfile" --kiosk-printing --app=%TARGET_URL%
echo exit
) > "%BAT_PATH%"

:: Create VBScript to make a proper .lnk Desktop shortcut
set "VBS_SCRIPT=%TEMP%\create_pos_shortcut_%RANDOM%.vbs"
(
echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
echo sLinkFile = "%DESKTOP_DIR%\Madrasi Dosa POS (Direct Print).lnk"
echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
echo oLink.TargetPath = "%BROWSER_PATH%"
echo oLink.Arguments = "--user-data-dir=""%LOCALAPPDATA%\MadrasiDosaPOSProfile"" --kiosk-printing --app=""%TARGET_URL%"""
echo oLink.Description = "Madrasi Dosa POS Terminal - Direct Silent Printing"
echo oLink.WorkingDirectory = "%USERPROFILE%"
echo oLink.Save
) > "%VBS_SCRIPT%"

cscript //nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%" >nul 2>&1

echo ======================================================================
echo   [SUCCESS] Direct Silent Print shortcut created on your Desktop!
echo ======================================================================
echo.
echo   * Shortcut: %DESKTOP_DIR%\Madrasi Dosa POS (Direct Print).lnk
echo.
echo   IMPORTANT FINAL STEP ON THIS COMPUTER:
echo   1. Open Windows 'Printers & scanners' (Settings > Bluetooth & devices).
echo   2. Click on your physical Thermal Receipt Printer (e.g. POS-80 / TVS).
echo   3. Click 'Set as default'.
echo.
echo   Now whenever you open the Desktop shortcut and click 'Complete Payment',
echo   it will print directly to your receipt machine without any preview window!
echo ======================================================================
echo.
pause
exit /b 0
