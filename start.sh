#!/bin/bash

# IT-Engineering Collaboration Hub Startup Script
# This script starts both the backend (Rust/Actix) and frontend (Vite/React)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# PID file locations
BACKEND_PID_FILE="$PROJECT_ROOT/.backend.pid"
FRONTEND_PID_FILE="$PROJECT_ROOT/.frontend.pid"

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing=()
    
    if ! command_exists cargo; then
        missing+=("cargo (Rust)")
    fi
    
    if ! command_exists npm; then
        missing+=("npm (Node.js)")
    fi
    
    if [ ${#missing[@]} -ne 0 ]; then
        print_error "Missing required tools:"
        for tool in "${missing[@]}"; do
            echo "  - $tool"
        done
        exit 1
    fi
    
    print_success "All prerequisites found"
}

# Function to stop running services
stop_services() {
    print_status "Stopping any running services..."
    
    if [ -f "$BACKEND_PID_FILE" ]; then
        if kill -0 "$(cat "$BACKEND_PID_FILE")" 2>/dev/null; then
            kill "$(cat "$BACKEND_PID_FILE")" 2>/dev/null || true
            print_status "Stopped backend server"
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    if [ -f "$FRONTEND_PID_FILE" ]; then
        if kill -0 "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null; then
            kill "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null || true
            print_status "Stopped frontend server"
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    # Also kill any processes on the ports we use
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install
    print_success "Frontend dependencies installed"
}

# Function to start the backend
start_backend() {
    print_status "Starting backend server..."
    cd "$BACKEND_DIR"
    
    # Check if database exists, if not initialize it
    if [ ! -f "database.db" ]; then
        print_status "Initializing database..."
        if [ -f "schema.sql" ]; then
            sqlite3 database.db < schema.sql
            print_success "Database initialized"
        else
            print_warning "schema.sql not found, database will be created on first run"
        fi
    fi
    
    # Build and run the backend
    cargo run &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$BACKEND_PID_FILE"
    
    # Wait for backend to be ready
    print_status "Waiting for backend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8080/api/health >/dev/null 2>&1; then
            print_success "Backend server running on http://localhost:8080"
            return 0
        fi
        sleep 1
    done
    
    print_warning "Backend may still be compiling... Check terminal output"
}

# Function to start the frontend
start_frontend() {
    print_status "Starting frontend development server..."
    cd "$FRONTEND_DIR"
    
    npm run dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$FRONTEND_PID_FILE"
    
    # Wait for frontend to be ready
    print_status "Waiting for frontend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            print_success "Frontend server running on http://localhost:3000"
            return 0
        fi
        sleep 1
    done
    
    print_warning "Frontend may still be starting... Check terminal output"
}

# Function to display help
show_help() {
    echo "IT-Engineering Collaboration Hub Startup Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start       Start both backend and frontend (default)"
    echo "  stop        Stop all running services"
    echo "  restart     Restart all services"
    echo "  backend     Start only the backend"
    echo "  frontend    Start only the frontend"
    echo "  install     Install dependencies only"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Start everything"
    echo "  $0 start        # Start everything"
    echo "  $0 stop         # Stop all services"
    echo "  $0 backend      # Start only backend"
}

# Cleanup function for graceful shutdown
cleanup() {
    echo ""
    print_status "Shutting down..."
    stop_services
    print_success "All services stopped"
    exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Main script
main() {
    local command="${1:-start}"
    
    case "$command" in
        start)
            echo ""
            echo -e "${BLUE}========================================${NC}"
            echo -e "${BLUE}  IT-Engineering Collaboration Hub${NC}"
            echo -e "${BLUE}========================================${NC}"
            echo ""
            
            check_prerequisites
            stop_services
            install_dependencies
            start_backend
            start_frontend
            
            echo ""
            echo -e "${GREEN}========================================${NC}"
            echo -e "${GREEN}  All services started successfully!${NC}"
            echo -e "${GREEN}========================================${NC}"
            echo ""
            echo -e "  Backend:  ${BLUE}http://localhost:8080${NC}"
            echo -e "  Frontend: ${BLUE}http://localhost:5173${NC}"
            echo ""
            echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services"
            echo ""
            
            # Wait for user interrupt
            wait
            ;;
        stop)
            stop_services
            print_success "All services stopped"
            ;;
        restart)
            stop_services
            exec "$0" start
            ;;
        backend)
            check_prerequisites
            start_backend
            wait
            ;;
        frontend)
            check_prerequisites
            install_dependencies
            start_frontend
            wait
            ;;
        install)
            check_prerequisites
            install_dependencies
            print_success "Dependencies installed"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
