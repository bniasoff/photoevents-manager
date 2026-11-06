@echo off
REM SQL Server to CSV Export using sqlcmd
REM This will prompt for password

SET SERVER=Niasoff-Desktop1\SQLSERVER2022
SET DATABASE=Events
SET USERNAME=sa
SET TABLE=CalendarEvents
SET TIMESTAMP=%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%-%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
SET TIMESTAMP=%TIMESTAMP: =0%
SET OUTPUT=sql-events-export-%TIMESTAMP%.csv

echo === SQL Server Events Export ===
echo.
echo Server: %SERVER%
echo Database: %DATABASE%
echo Table: %TABLE%
echo Username: %USERNAME%
echo Output: %OUTPUT%
echo.
echo Please enter the password for user '%USERNAME%':
SET /P PASSWORD=

echo.
echo Connecting and exporting...
echo.

sqlcmd -S "%SERVER%" -d "%DATABASE%" -U "%USERNAME%" -P "%PASSWORD%" -Q "SET NOCOUNT ON; SELECT * FROM %TABLE%" -s "," -W -o "%OUTPUT%"

IF %ERRORLEVEL% EQU 0 (
    echo.
    echo Export complete!
    echo File saved to: %CD%\%OUTPUT%
    echo.
    echo First few lines of the file:
    type "%OUTPUT%" | more /E +0
) ELSE (
    echo.
    echo Error occurred during export. Error code: %ERRORLEVEL%
    echo.
    echo Common issues:
    echo   1. Check server name and instance
    echo   2. Verify username and password
    echo   3. Ensure SQL Server Authentication is enabled
    echo   4. Make sure TCP/IP is enabled in SQL Server Configuration
)

pause
