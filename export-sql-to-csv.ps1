# SQL Server to CSV Export Script
# Uses SQL Server Authentication

$ServerInstance = "Niasoff-Desktop1\SQLSERVER2022"
$Database = "CalendarEvents"
$TableName = "events"
$Username = "sa"
$OutputPath = Join-Path $PSScriptRoot "sql-events-export-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').csv"

Write-Host "=== SQL Server Events Export ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server: $ServerInstance" -ForegroundColor Gray
Write-Host "Database: $Database" -ForegroundColor Gray
Write-Host "Table: $TableName" -ForegroundColor Gray
Write-Host "Username: $Username" -ForegroundColor Gray
Write-Host "Authentication: SQL Server Authentication" -ForegroundColor Gray
Write-Host ""

# Prompt for password
Write-Host "Please enter the password for SQL Server user '$Username':" -ForegroundColor Yellow
$SecurePassword = Read-Host -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
$Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

try {
    Write-Host ""
    Write-Host "Connecting to SQL Server..." -ForegroundColor Yellow

    # Build connection string with SQL Authentication
    $ConnectionString = "Server=$ServerInstance;Database=$Database;User Id=$Username;Password=$Password;TrustServerCertificate=True;"

    # Create connection
    $Connection = New-Object System.Data.SqlClient.SqlConnection
    $Connection.ConnectionString = $ConnectionString
    $Connection.Open()

    Write-Host "Connected successfully!" -ForegroundColor Green
    Write-Host ""

    # Create query
    $Query = "SELECT * FROM $TableName"
    Write-Host "Executing query: $Query" -ForegroundColor Yellow

    # Create command
    $Command = New-Object System.Data.SqlClient.SqlCommand
    $Command.Connection = $Connection
    $Command.CommandText = $Query

    # Execute query and load into DataTable
    $Adapter = New-Object System.Data.SqlClient.SqlDataAdapter
    $Adapter.SelectCommand = $Command
    $DataTable = New-Object System.Data.DataTable
    $RowCount = $Adapter.Fill($DataTable)

    Write-Host "Retrieved $RowCount records" -ForegroundColor Green
    Write-Host ""

    # Show column information
    if ($DataTable.Rows.Count -gt 0) {
        $ColumnCount = $DataTable.Columns.Count
        Write-Host "Columns found: $ColumnCount" -ForegroundColor Cyan
        $index = 1
        foreach ($Column in $DataTable.Columns) {
            $ColumnInfo = "$index. $($Column.ColumnName) - $($Column.DataType.Name)"
            Write-Host "  $ColumnInfo" -ForegroundColor Gray
            $index++
        }
        Write-Host ""
    }

    # Export to CSV
    $FileName = Split-Path $OutputPath -Leaf
    Write-Host "Exporting to CSV: $FileName" -ForegroundColor Yellow
    $DataTable | Export-Csv -Path $OutputPath -NoTypeInformation -Encoding UTF8

    Write-Host ""
    Write-Host "Export complete!" -ForegroundColor Green
    Write-Host "File saved to: $OutputPath" -ForegroundColor Green
    Write-Host "Total records: $RowCount" -ForegroundColor Green

    # Display sample data
    if ($DataTable.Rows.Count -gt 0) {
        Write-Host ""
        Write-Host "Sample data (first 3 records):" -ForegroundColor Cyan
        Write-Host ""

        $SampleRows = $DataTable.Rows | Select-Object -First 3
        $index = 1

        foreach ($Row in $SampleRows) {
            Write-Host "$index. Record:" -ForegroundColor Yellow

            # Show first 5 columns
            $ColumnsToShow = $DataTable.Columns | Select-Object -First 5
            foreach ($Column in $ColumnsToShow) {
                $Value = $Row[$Column.ColumnName]
                $ColDisplay = "   $($Column.ColumnName): $Value"
                Write-Host $ColDisplay -ForegroundColor Gray
            }
            Write-Host ""
            $index++
        }
    }

} catch {
    Write-Host ""
    Write-Host "Error exporting from SQL Server:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""

    $ErrorMsg = $_.Exception.Message

    if ($ErrorMsg -match "network-related|instance-specific") {
        Write-Host "Connection Error - Please check:" -ForegroundColor Yellow
        Write-Host "  1. SQL Server is running" -ForegroundColor Gray
        Write-Host "  2. Server name is correct" -ForegroundColor Gray
        Write-Host "  3. TCP/IP is enabled in SQL Server Configuration Manager" -ForegroundColor Gray
        Write-Host "  4. SQL Server Browser service is running" -ForegroundColor Gray
    } elseif ($ErrorMsg -match "Login failed") {
        Write-Host "Authentication Error - Please check:" -ForegroundColor Yellow
        Write-Host "  1. SQL Server Authentication is enabled (Mixed Mode)" -ForegroundColor Gray
        Write-Host "  2. Username and password are correct" -ForegroundColor Gray
        Write-Host "  3. The sa account is enabled" -ForegroundColor Gray
    } elseif ($ErrorMsg -match "Invalid object name") {
        Write-Host "Table Error - Please check:" -ForegroundColor Yellow
        Write-Host "  1. The table name is correct (case-sensitive)" -ForegroundColor Gray
        Write-Host "  2. The table exists in the database" -ForegroundColor Gray
    }

    exit 1
} finally {
    # Close connection and clear password from memory
    if ($Connection -and $Connection.State -eq 'Open') {
        $Connection.Close()
    }
    $Password = $null
    [System.GC]::Collect()
}
