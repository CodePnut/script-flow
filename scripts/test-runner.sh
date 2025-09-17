#!/bin/bash

# ScriptFlow Test Runner
# Simplified test execution script

set -e  # Exit on any error

echo "🚀 ScriptFlow Test Runner"
echo "========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Default values
RUN_UNIT=false
RUN_E2E=false
RUN_ALL=false
WATCH_MODE=false
HEADED=false
UI_MODE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--unit)
            RUN_UNIT=true
            shift
            ;;
        -e|--e2e)
            RUN_E2E=true
            shift
            ;;
        -a|--all)
            RUN_ALL=true
            shift
            ;;
        -w|--watch)
            WATCH_MODE=true
            shift
            ;;
        -h|--headed)
            HEADED=true
            shift
            ;;
        --ui)
            UI_MODE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -u, --unit     Run unit tests only"
            echo "  -e, --e2e      Run E2E tests only"
            echo "  -a, --all      Run all tests"
            echo "  -w, --watch    Run tests in watch mode (unit tests only)"
            echo "  -h, --headed   Run E2E tests in headed mode"
            echo "  --ui           Run E2E tests in UI mode"
            echo "  --help         Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --unit              # Run unit tests"
            echo "  $0 --e2e --headed      # Run E2E tests with browser visible"
            echo "  $0 --all               # Run all tests"
            echo "  $0 --unit --watch      # Run unit tests in watch mode"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# If no specific test type is selected, run all
if [[ "$RUN_UNIT" == false && "$RUN_E2E" == false && "$RUN_ALL" == false ]]; then
    RUN_ALL=true
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed or not in PATH"
    exit 1
fi

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    
    if [[ "$WATCH_MODE" == true ]]; then
        print_status "Starting unit tests in watch mode..."
        npm run test:watch
    else
        npm run test
    fi
    
    if [[ $? -eq 0 ]]; then
        print_success "Unit tests passed!"
    else
        print_error "Unit tests failed!"
        return 1
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    print_status "Running E2E tests..."
    
    # Check if Playwright is installed
    if ! npx playwright --version &> /dev/null; then
        print_warning "Playwright not found. Installing..."
        npx playwright install
    fi
    
    # Build the command
    E2E_CMD="npx playwright test"
    
    if [[ "$HEADED" == true ]]; then
        E2E_CMD="$E2E_CMD --headed"
    fi
    
    if [[ "$UI_MODE" == true ]]; then
        E2E_CMD="$E2E_CMD --ui"
    fi
    
    print_status "Running: $E2E_CMD"
    eval $E2E_CMD
    
    if [[ $? -eq 0 ]]; then
        print_success "E2E tests passed!"
    else
        print_error "E2E tests failed!"
        return 1
    fi
}

# Main execution
main() {
    local start_time=$(date +%s)
    local failed=false
    
    print_status "Starting test execution..."
    
    if [[ "$RUN_ALL" == true ]]; then
        print_status "Running all tests..."
        
        # Run unit tests first
        if ! run_unit_tests; then
            failed=true
        fi
        
        # Run E2E tests
        if ! run_e2e_tests; then
            failed=true
        fi
        
    elif [[ "$RUN_UNIT" == true ]]; then
        if ! run_unit_tests; then
            failed=true
        fi
        
    elif [[ "$RUN_E2E" == true ]]; then
        if ! run_e2e_tests; then
            failed=true
        fi
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo "========================="
    
    if [[ "$failed" == true ]]; then
        print_error "Some tests failed! Duration: ${duration}s"
        exit 1
    else
        print_success "All tests passed! Duration: ${duration}s"
    fi
}

# Run the main function
main
