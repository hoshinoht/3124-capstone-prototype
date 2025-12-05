# IT-Engineering Collaboration Hub Startup Script for Windows 11
# This script starts both the backend (Rust/Actix) and frontend (Vite/React)
# Run with: powershell -ExecutionPolicy Bypass -File .\start.ps1

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "backend", "frontend", "install", "help")]
    [string]$Command = "start"
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Cyan"
    White = "White"
}

# Project directories
$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"

# PID file locations
$BackendPidFile = Join-Path $ProjectRoot ".backend.pid"
$FrontendPidFile = Join-Path $ProjectRoot ".frontend.pid"

# Global process variables
$script:BackendProcess = $null
$script:FrontendProcess = $null

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] " -ForegroundColor $Colors.Blue -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] " -ForegroundColor $Colors.Green -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] " -ForegroundColor $Colors.Yellow -NoNewline
    Write-Host $Message
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] " -ForegroundColor $Colors.Red -NoNewline
    Write-Host $Message
}

function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

function Test-PortInUse {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

function Stop-PortProcess {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($process) {
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

function Install-Prerequisites {
    Write-Status "Checking and installing prerequisites..."
    
    $missing = @()
    $toInstall = @()
    
    # Check for winget (Windows Package Manager)
    if (-not (Test-CommandExists "winget")) {
        Write-Error "Windows Package Manager (winget) is not installed."
        Write-Host "Please install it from the Microsoft Store (App Installer) or visit:"
        Write-Host "https://github.com/microsoft/winget-cli/releases"
        exit 1
    }
    
    # Check for Rust/Cargo
    if (-not (Test-CommandExists "cargo")) {
        $missing += "Rust (cargo)"
        $toInstall += @{Name = "Rustlang.Rust.MSVC"; Display = "Rust"}
    }
    
    # Check for Node.js/npm
    if (-not (Test-CommandExists "npm")) {
        $missing += "Node.js (npm)"
        $toInstall += @{Name = "OpenJS.NodeJS.LTS"; Display = "Node.js LTS"}
    }
    
    # Check for SQLite
    if (-not (Test-CommandExists "sqlite3")) {
        $missing += "SQLite3"
        $toInstall += @{Name = "SQLite.SQLite"; Display = "SQLite"}
    }
    
    if ($missing.Count -gt 0) {
        Write-Warning "Missing required tools:"
        foreach ($tool in $missing) {
            Write-Host "  - $tool"
        }
        
        Write-Host ""
        $response = Read-Host "Would you like to install missing dependencies automatically? (Y/n)"
        
        if ($response -eq "" -or $response -match "^[Yy]") {
            foreach ($package in $toInstall) {
                Write-Status "Installing $($package.Display)..."
                try {
                    winget install --id $package.Name --accept-source-agreements --accept-package-agreements
                    Write-Success "$($package.Display) installed successfully"
                } catch {
                    Write-Error "Failed to install $($package.Display). Please install manually."
                }
            }
            
            Write-Host ""
            Write-Warning "Please restart your terminal/PowerShell session for PATH changes to take effect."
            Write-Warning "Then run this script again."
            exit 0
        } else {
            Write-Error "Cannot continue without required dependencies."
            exit 1
        }
    }
    
    Write-Success "All prerequisites found"
}

function Stop-Services {
    Write-Status "Stopping any running services..."
    
    # Stop backend if PID file exists
    if (Test-Path $BackendPidFile) {
        $pid = Get-Content $BackendPidFile -ErrorAction SilentlyContinue
        if ($pid) {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Status "Stopped backend server"
            }
        }
        Remove-Item $BackendPidFile -Force -ErrorAction SilentlyContinue
    }
    
    # Stop frontend if PID file exists
    if (Test-Path $FrontendPidFile) {
        $pid = Get-Content $FrontendPidFile -ErrorAction SilentlyContinue
        if ($pid) {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Status "Stopped frontend server"
            }
        }
        Remove-Item $FrontendPidFile -Force -ErrorAction SilentlyContinue
    }
    
    # Kill any processes on the ports we use
    Stop-PortProcess -Port 8080
    Stop-PortProcess -Port 5173
    
    # Small delay to ensure ports are released
    Start-Sleep -Milliseconds 500
}

function Install-Dependencies {
    Write-Status "Installing frontend dependencies..."
    
    Push-Location $FrontendDir
    try {
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Frontend dependencies installed"
        } else {
            Write-Error "Failed to install frontend dependencies"
            exit 1
        }
    } finally {
        Pop-Location
    }
}

function Start-Backend {
    Write-Status "Starting backend server..."
    
    Push-Location $BackendDir
    try {
        # Check if database exists, if not initialize it
        $dbPath = Join-Path $BackendDir "database.db"
        $schemaPath = Join-Path $BackendDir "schema.sql"
        
        if (-not (Test-Path $dbPath)) {
            Write-Status "Initializing database..."
            if (Test-Path $schemaPath) {
                if (Test-CommandExists "sqlite3") {
                    $schemaContent = Get-Content $schemaPath -Raw
                    sqlite3 $dbPath $schemaContent
                    Write-Success "Database initialized"
                } else {
                    Write-Warning "sqlite3 not found, database will be created on first run"
                }
            } else {
                Write-Warning "schema.sql not found, database will be created on first run"
            }
        }
        
        # Build and run the backend
        $script:BackendProcess = Start-Process -FilePath "cargo" -ArgumentList "run" -WorkingDirectory $BackendDir -PassThru -NoNewWindow
        $script:BackendProcess.Id | Out-File $BackendPidFile
        
        # Wait for backend to be ready
        Write-Status "Waiting for backend to start (this may take a while on first run due to compilation)..."
        $maxAttempts = 120  # 2 minutes for initial compilation
        $attempt = 0
        
        while ($attempt -lt $maxAttempts) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -TimeoutSec 1 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-Success "Backend server running on http://localhost:8080"
                    return
                }
            } catch {
                # Server not ready yet
            }
            Start-Sleep -Seconds 1
            $attempt++
            
            # Show progress every 10 seconds
            if ($attempt % 10 -eq 0) {
                Write-Status "Still waiting for backend... ($attempt seconds)"
            }
        }
        
        Write-Warning "Backend may still be compiling... Check terminal output"
    } finally {
        Pop-Location
    }
}

function Start-Frontend {
    Write-Status "Starting frontend development server..."
    
    Push-Location $FrontendDir
    try {
        $script:FrontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $FrontendDir -PassThru -NoNewWindow
        $script:FrontendProcess.Id | Out-File $FrontendPidFile
        
        # Wait for frontend to be ready
        Write-Status "Waiting for frontend to start..."
        $maxAttempts = 30
        $attempt = 0
        
        while ($attempt -lt $maxAttempts) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 1 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-Success "Frontend server running on http://localhost:5173"
                    return
                }
            } catch {
                # Server not ready yet
            }
            Start-Sleep -Seconds 1
            $attempt++
        }
        
        Write-Warning "Frontend may still be starting... Check terminal output"
    } finally {
        Pop-Location
    }
}

function Show-Help {
    Write-Host ""
    Write-Host "IT-Engineering Collaboration Hub Startup Script (Windows)" -ForegroundColor $Colors.Blue
    Write-Host ""
    Write-Host "Usage: .\start.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  start       Start both backend and frontend (default)"
    Write-Host "  stop        Stop all running services"
    Write-Host "  restart     Restart all services"
    Write-Host "  backend     Start only the backend"
    Write-Host "  frontend    Start only the frontend"
    Write-Host "  install     Install dependencies only"
    Write-Host "  help        Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\start.ps1              # Start everything"
    Write-Host "  .\start.ps1 start        # Start everything"
    Write-Host "  .\start.ps1 stop         # Stop all services"
    Write-Host "  .\start.ps1 backend      # Start only backend"
    Write-Host ""
    Write-Host "Note: Run with administrator privileges if you encounter permission issues."
    Write-Host ""
}

function Start-AllServices {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor $Colors.Blue
    Write-Host "  IT-Engineering Collaboration Hub" -ForegroundColor $Colors.Blue
    Write-Host "========================================" -ForegroundColor $Colors.Blue
    Write-Host ""
    
    Install-Prerequisites
    Stop-Services
    Install-Dependencies
    Start-Backend
    Start-Frontend
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor $Colors.Green
    Write-Host "  All services started successfully!" -ForegroundColor $Colors.Green
    Write-Host "========================================" -ForegroundColor $Colors.Green
    Write-Host ""
    Write-Host "  Backend:  " -NoNewline
    Write-Host "http://localhost:8080" -ForegroundColor $Colors.Blue
    Write-Host "  Frontend: " -NoNewline
    Write-Host "http://localhost:5173" -ForegroundColor $Colors.Blue
    Write-Host ""
    Write-Host "  Press " -NoNewline
    Write-Host "Ctrl+C" -ForegroundColor $Colors.Yellow -NoNewline
    Write-Host " to stop all services"
    Write-Host ""
    
    # Register cleanup on exit
    $null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
        Stop-Services
    }
    
    # Wait for processes
    try {
        while ($true) {
            Start-Sleep -Seconds 1
            
            # Check if processes are still running
            if ($script:BackendProcess -and $script:BackendProcess.HasExited) {
                Write-Warning "Backend process has stopped unexpectedly"
            }
            if ($script:FrontendProcess -and $script:FrontendProcess.HasExited) {
                Write-Warning "Frontend process has stopped unexpectedly"
            }
        }
    } finally {
        Stop-Services
        Write-Success "All services stopped"
    }
}

# Main script execution
switch ($Command) {
    "start" {
        Start-AllServices
    }
    "stop" {
        Stop-Services
        Write-Success "All services stopped"
    }
    "restart" {
        Stop-Services
        Start-AllServices
    }
    "backend" {
        Install-Prerequisites
        Start-Backend
        try {
            while ($true) { Start-Sleep -Seconds 1 }
        } finally {
            Stop-Services
        }
    }
    "frontend" {
        Install-Prerequisites
        Install-Dependencies
        Start-Frontend
        try {
            while ($true) { Start-Sleep -Seconds 1 }
        } finally {
            Stop-Services
        }
    }
    "install" {
        Install-Prerequisites
        Install-Dependencies
        Write-Success "Dependencies installed"
    }
    "help" {
        Show-Help
    }
    default {
        Write-Error "Unknown command: $Command"
        Show-Help
        exit 1
    }
}
