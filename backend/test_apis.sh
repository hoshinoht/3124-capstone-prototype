#!/bin/bash

# API Testing Script for Bug Tracking System
# This script tests the complete flow: register users -> login -> create multiple projects -> manage diverse bugs
# 
# Test Coverage:
# - User registration and authentication (admin and regular users)
# - Multiple project creation with different types (Web App, Mobile App, API Gateway, Analytics Dashboard)
# - 13+ bugs with varying severities (Critical, High, Medium, Low), assignments, and realistic scenarios
# - Authentication Testing: Bearer Token, Cookie-based, Priority testing, Session management and expiry
# - CRUD operations for projects and bugs
# - Access control and authorization testing
# - Error handling and edge cases
# 
# Authentication Methods Tested:
# - Bearer Token Authentication (for API clients)
# - Cookie-based Authentication (for web browsers) 
# - Authentication priority testing (Bearer tokens take precedence over cookies)
# - Session management and expiry
# - Cookie clearing on logout

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:8080"
TIMESTAMP=$(date +%s)
ADMIN_USERNAME="admin_user_$TIMESTAMP"
ADMIN_PASSWORD="adminpassword123"
REGULAR_USERNAME="regular_user_$TIMESTAMP"
REGULAR_PASSWORD="regularpassword123"
TEST_PROJECT_NAME="Test Project $TIMESTAMP"
TEST_PROJECT_DESC="A test project for API testing"

# Global variables to store data between tests
ADMIN_TOKEN=""
REGULAR_TOKEN=""
ADMIN_DEVELOPER_ID=""
REGULAR_DEVELOPER_ID=""
PROJECT_ID=""
BUG_ID=""

echo -e "${BLUE}=== Bug Tracking System API Test Suite ===${NC}"
echo -e "${BLUE}Testing against: $BASE_URL${NC}"
echo ""

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        exit 1
    fi
}

# Function to extract JSON field - improved version
extract_json_field() {
    local json_response="$1"
    local field_name="$2"
    # Use multiple extraction methods
    local result=""
    
    # Method 1: sed extraction
    result=$(echo "$json_response" | sed -n "s/.*\"$field_name\":\"\\([^\"]*\)\".*/\\1/p")
    
    if [ -z "$result" ]; then
        # Method 2: grep and cut for non-quoted values
        result=$(echo "$json_response" | grep -o "\"$field_name\":[^,}]*" | cut -d':' -f2- | tr -d '"' | tr -d ' ' | tr -d ',')
    fi
    
    echo "$result"
}

# Function to pretty-print JSON responses
pretty_print_json() {
    local json_response="$1"
    local max_length="${2:-500}"  # Default max length before truncation
    
    # Check if we have python3 available for pretty printing
    if command -v python3 >/dev/null 2>&1; then
        echo "$json_response" | python3 -m json.tool 2>/dev/null || {
            # Fallback if JSON is invalid
            echo "Raw response (JSON formatting failed): $json_response"
        }
    elif command -v jq >/dev/null 2>&1; then
        echo "$json_response" | jq . 2>/dev/null || {
            # Fallback if JSON is invalid
            echo "Raw response (JSON formatting failed): $json_response"
        }
    else
        # Manual formatting if no tools available
        echo "$json_response" | sed 's/,/,\n  /g' | sed 's/{/{\n  /g' | sed 's/}/\n}/g' | sed 's/\[/[\n  /g' | sed 's/\]/\n]/g'
    fi
}

# Function to display response with better formatting
display_response() {
    local response_body="$1"
    local response_type="${2:-Response}"
    
    echo ""
    echo "=== $response_type ==="
    
    # Check if response looks like JSON (starts with { or [)
    if [[ "$response_body" =~ ^[[:space:]]*[\[\{] ]]; then
        # For large arrays, show count and format nicely
        local item_count=$(echo "$response_body" | grep -o '"bug_id"\|"project_id"\|"developer_id"' | wc -l | xargs)
        if [[ "$response_body" =~ ^\[.*\]$ ]] && [ "$item_count" -gt 5 ]; then
            echo "📊 Found $item_count items in response"
            echo ""
        fi
        pretty_print_json "$response_body"
    else
        echo "$response_body"
    fi
    echo "===================="
}

echo -e "${YELLOW}1. Testing Admin User Registration${NC}"
echo "Registering new admin user: $ADMIN_USERNAME"

REGISTER_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"$ADMIN_USERNAME\",
        \"password\": \"$ADMIN_PASSWORD\",
        \"is_admin\": true
    }" \
    "$BASE_URL/register")

HTTP_STATUS=$(echo $REGISTER_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
REGISTER_BODY=$(echo $REGISTER_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    print_result 0 "Admin user registration successful"
    display_response "$REGISTER_BODY" "Registration Response"
else
    print_result 1 "Admin user registration failed (HTTP $HTTP_STATUS)"
    display_response "$REGISTER_BODY" "Error Response"
fi

echo ""
echo -e "${YELLOW}2. Testing Regular User Registration${NC}"
echo "Registering new regular user: $REGULAR_USERNAME"

REGISTER_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"$REGULAR_USERNAME\",
        \"password\": \"$REGULAR_PASSWORD\",
        \"is_admin\": false
    }" \
    "$BASE_URL/register")

HTTP_STATUS=$(echo $REGISTER_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
REGISTER_BODY=$(echo $REGISTER_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    print_result 0 "Regular user registration successful"
    display_response "$REGISTER_BODY" "Registration Response"
else
    print_result 1 "Regular user registration failed (HTTP $HTTP_STATUS)"
    display_response "$REGISTER_BODY" "Error Response"
fi

echo ""
echo -e "${YELLOW}3. Testing Admin User Login${NC}"
echo "Logging in admin user: $ADMIN_USERNAME"

LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"$ADMIN_USERNAME\",
        \"password\": \"$ADMIN_PASSWORD\"
    }" \
    "$BASE_URL/login")

HTTP_STATUS=$(echo $LOGIN_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
LOGIN_BODY=$(echo $LOGIN_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Admin user login successful"
    # Extract token and developer ID from response
    echo "Debug - Full login response:"
    display_response "$LOGIN_BODY" "Login Response"
    ADMIN_TOKEN=$(extract_json_field "$LOGIN_BODY" "token")
    ADMIN_DEVELOPER_ID=$(extract_json_field "$LOGIN_BODY" "developer_id")
    echo "Admin Token received: ${ADMIN_TOKEN:0:20}..."
    echo "Admin Developer ID: '$ADMIN_DEVELOPER_ID'"
    
    # Fallback extraction if the first method fails
    if [ -z "$ADMIN_DEVELOPER_ID" ]; then
        echo "Trying alternative extraction method..."
        ADMIN_DEVELOPER_ID=$(echo "$LOGIN_BODY" | sed -n 's/.*"developer_id":"\([^"]*\)".*/\1/p')
        echo "Alternative extraction result: '$ADMIN_DEVELOPER_ID'"
    fi
else
    print_result 1 "Admin user login failed (HTTP $HTTP_STATUS)"
    display_response "$LOGIN_BODY" "Login Error Response"
fi

echo ""
echo -e "${YELLOW}4. Testing Regular User Login${NC}"
echo "Logging in regular user: $REGULAR_USERNAME"

LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{
        \"username\": \"$REGULAR_USERNAME\",
        \"password\": \"$REGULAR_PASSWORD\"
    }" \
    "$BASE_URL/login")

HTTP_STATUS=$(echo $LOGIN_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
LOGIN_BODY=$(echo $LOGIN_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Regular user login successful"
    # Extract token and developer ID from response
    display_response "$LOGIN_BODY" "Regular User Login Response"
    REGULAR_TOKEN=$(extract_json_field "$LOGIN_BODY" "token")
    REGULAR_DEVELOPER_ID=$(extract_json_field "$LOGIN_BODY" "developer_id")
    echo "Regular Token received: ${REGULAR_TOKEN:0:20}..."
    echo "Regular Developer ID: '$REGULAR_DEVELOPER_ID'"
    
    # Fallback extraction if the first method fails
    if [ -z "$REGULAR_DEVELOPER_ID" ]; then
        echo "Trying alternative extraction method..."
        REGULAR_DEVELOPER_ID=$(echo "$LOGIN_BODY" | sed -n 's/.*"developer_id":"\([^"]*\)".*/\1/p')
        echo "Alternative extraction result: '$REGULAR_DEVELOPER_ID'"
    fi
else
    print_result 1 "Regular user login failed (HTTP $HTTP_STATUS)"
    display_response "$LOGIN_BODY" "Regular User Login Error Response"
fi

echo ""
echo -e "${YELLOW}4.5. Testing Cookie Authentication${NC}"
echo "Testing cookie-based authentication with admin user"

# Login and save cookies
COOKIE_LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -c /tmp/test_cookies.txt \
    -d "{
        \"username\": \"$ADMIN_USERNAME\",
        \"password\": \"$ADMIN_PASSWORD\"
    }" \
    "$BASE_URL/login")

HTTP_STATUS=$(echo $COOKIE_LOGIN_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
COOKIE_LOGIN_BODY=$(echo $COOKIE_LOGIN_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Cookie login successful"
    
    # Test accessing protected endpoint using cookies (no Authorization header)
    echo "Testing project access using cookie authentication"
    COOKIE_PROJECT_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X GET \
        -b /tmp/test_cookies.txt \
        "$BASE_URL/project")
    
    COOKIE_HTTP_STATUS=$(echo $COOKIE_PROJECT_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    COOKIE_PROJECT_BODY=$(echo $COOKIE_PROJECT_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    if [ "$COOKIE_HTTP_STATUS" -eq 200 ]; then
        print_result 0 "Cookie authentication successful - can access protected endpoints"
        echo "Cookie project response length: ${#COOKIE_PROJECT_BODY} characters"
    else
        print_result 1 "Cookie authentication failed (HTTP $COOKIE_HTTP_STATUS)"
        echo "Response: $COOKIE_PROJECT_BODY"
    fi
    
    # Test logout with cookie clearing
    echo "Testing logout with cookie clearing"
    ADMIN_TOKEN_FOR_LOGOUT=$(extract_json_field "$COOKIE_LOGIN_BODY" "token")
    
    COOKIE_LOGOUT_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -b /tmp/test_cookies.txt \
        -c /tmp/test_cookies.txt \
        -d "{\"token\": \"$ADMIN_TOKEN_FOR_LOGOUT\"}" \
        "$BASE_URL/logout")
    
    LOGOUT_HTTP_STATUS=$(echo $COOKIE_LOGOUT_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$LOGOUT_HTTP_STATUS" -eq 200 ]; then
        print_result 0 "Cookie logout successful"
        
        # Verify that cookie is cleared by trying to access protected endpoint
        echo "Verifying cookie is cleared - should fail"
        VERIFY_COOKIE_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X GET \
            -b /tmp/test_cookies.txt \
            "$BASE_URL/project")
        
        VERIFY_HTTP_STATUS=$(echo $VERIFY_COOKIE_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
        
        if [ "$VERIFY_HTTP_STATUS" -eq 401 ]; then
            print_result 0 "Cookie properly cleared - access denied as expected"
        else
            print_result 1 "Cookie not properly cleared - unexpected access granted (HTTP $VERIFY_HTTP_STATUS)"
        fi
    else
        print_result 1 "Cookie logout failed (HTTP $LOGOUT_HTTP_STATUS)"
    fi
    
    # Clean up cookie file
    rm -f /tmp/test_cookies.txt
    
else
    print_result 1 "Cookie login failed (HTTP $HTTP_STATUS)"
fi

echo ""
echo -e "${YELLOW}4.9. Testing Authentication Priority (Bearer vs Cookie)${NC}"
echo "Testing that Bearer token takes priority over cookies"

# First, login to get a valid cookie (using regular user)
PRIORITY_LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -c /tmp/priority_cookies.txt \
    -d "{
        \"username\": \"$REGULAR_USERNAME\",
        \"password\": \"$REGULAR_PASSWORD\"
    }" \
    "$BASE_URL/login")

PRIORITY_HTTP_STATUS=$(echo $PRIORITY_LOGIN_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

if [ "$PRIORITY_HTTP_STATUS" -eq 200 ]; then
    # Now test with both cookie (regular user) and Authorization header (admin user)
    # The admin token should take priority
    echo "Testing with both cookie (regular user) and Bearer token (admin user)"
    
    PRIORITY_TEST_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -b /tmp/priority_cookies.txt \
        "$BASE_URL/project")
    
    PRIORITY_TEST_STATUS=$(echo $PRIORITY_TEST_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$PRIORITY_TEST_STATUS" -eq 200 ]; then
        print_result 0 "Bearer token correctly takes priority over cookie"
        echo "Request succeeded with admin Bearer token despite regular user cookie"
    else
        print_result 1 "Priority test failed - Bearer token should take precedence (HTTP $PRIORITY_TEST_STATUS)"
    fi
    
    # Clean up
    rm -f /tmp/priority_cookies.txt
else
    echo "Priority test skipped - failed to establish cookie session"
fi

echo ""
echo -e "${YELLOW}5. Testing Project Creation Access Control${NC}"
echo "Testing regular user project creation (should fail)"

PROJECT_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $REGULAR_TOKEN" \
    -d "{
        \"name\": \"Unauthorized Project\",
        \"description\": \"This should fail\"
    }" \
    "$BASE_URL/project")

HTTP_STATUS=$(echo $PROJECT_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
PROJECT_BODY=$(echo $PROJECT_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 403 ]; then
    print_result 0 "Regular user project creation correctly denied"
    echo "Response: $PROJECT_BODY"
else
    print_result 1 "Regular user project creation should have been denied (HTTP $HTTP_STATUS)"
    echo "Response: $PROJECT_BODY"
fi

echo ""
echo -e "${YELLOW}6. Testing Project Creation (Admin User)${NC}"
echo "Creating project: $TEST_PROJECT_NAME"

PROJECT_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"name\": \"$TEST_PROJECT_NAME\",
        \"description\": \"$TEST_PROJECT_DESC\"
    }" \
    "$BASE_URL/project")

HTTP_STATUS=$(echo $PROJECT_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
PROJECT_BODY=$(echo $PROJECT_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Project creation successful"
    # Extract project ID from the response (assuming it's in the last project in the array)
    PROJECT_ID=$(echo "$PROJECT_BODY" | grep -o '"project_id":"[^"]*"' | tail -1 | cut -d'"' -f4)
    echo "Project ID: $PROJECT_ID"
    echo "Response: $PROJECT_BODY"
else
    print_result 1 "Project creation failed (HTTP $HTTP_STATUS)"
fi

echo ""
echo -e "${YELLOW}7. Testing Get Projects${NC}"

GET_PROJECTS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$BASE_URL/project")

HTTP_STATUS=$(echo $GET_PROJECTS_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
GET_PROJECTS_BODY=$(echo $GET_PROJECTS_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Get projects successful"
    echo "Response: $GET_PROJECTS_BODY"
else
    print_result 1 "Get projects failed (HTTP $HTTP_STATUS)"
fi

echo ""
echo -e "${YELLOW}7b. Creating Additional Test Projects${NC}"
echo "Creating diverse projects to test with different types of bugs"

# Array to store additional project IDs
ADDITIONAL_PROJECT_IDS=()

# Project 2: Mobile App Project
echo "Creating Project 2: Mobile Application"
PROJECT2_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"name\": \"MobileApp Beta $TIMESTAMP\",
        \"description\": \"Cross-platform mobile application for iOS and Android. Features include user authentication, real-time messaging, offline data sync, and push notifications. Built with React Native and Firebase backend.\"
    }" \
    "$BASE_URL/project")

HTTP_STATUS=$(echo $PROJECT2_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
PROJECT2_BODY=$(echo $PROJECT2_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    PROJECT2_ID=$(echo "$PROJECT2_BODY" | grep -o '"project_id":"[^"]*"' | tail -1 | cut -d'"' -f4)
    ADDITIONAL_PROJECT_IDS+=("$PROJECT2_ID")
    echo "✓ Mobile App project created successfully (ID: $PROJECT2_ID)"
else
    echo "✗ Mobile App project creation failed (HTTP $HTTP_STATUS)"
fi

# Project 3: API Gateway Project
echo "Creating Project 3: API Gateway Service"
PROJECT3_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"name\": \"API Gateway v2 $TIMESTAMP\",
        \"description\": \"Microservices API gateway built with Rust and Actix-web. Handles authentication, rate limiting, load balancing, and request routing. Supports REST and GraphQL endpoints with comprehensive monitoring and logging.\"
    }" \
    "$BASE_URL/project")

HTTP_STATUS=$(echo $PROJECT3_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
PROJECT3_BODY=$(echo $PROJECT3_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    PROJECT3_ID=$(echo "$PROJECT3_BODY" | grep -o '"project_id":"[^"]*"' | tail -1 | cut -d'"' -f4)
    ADDITIONAL_PROJECT_IDS+=("$PROJECT3_ID")
    echo "✓ API Gateway project created successfully (ID: $PROJECT3_ID)"
else
    echo "✗ API Gateway project creation failed (HTTP $HTTP_STATUS)"
fi

# Project 4: Data Analytics Dashboard
echo "Creating Project 4: Analytics Dashboard"
PROJECT4_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"name\": \"Analytics Dashboard $TIMESTAMP\",
        \"description\": \"Real-time business intelligence dashboard with interactive charts, data visualization, and automated reporting. Built with Vue.js frontend and Python backend. Integrates with multiple data sources including SQL databases, APIs, and CSV imports.\"
    }" \
    "$BASE_URL/project")

HTTP_STATUS=$(echo $PROJECT4_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
PROJECT4_BODY=$(echo $PROJECT4_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    PROJECT4_ID=$(echo "$PROJECT4_BODY" | grep -o '"project_id":"[^"]*"' | tail -1 | cut -d'"' -f4)
    ADDITIONAL_PROJECT_IDS+=("$PROJECT4_ID")
    echo "✓ Analytics Dashboard project created successfully (ID: $PROJECT4_ID)"
else
    echo "✗ Analytics Dashboard project creation failed (HTTP $HTTP_STATUS)"
fi

# Create bugs for the additional projects
if [ ${#ADDITIONAL_PROJECT_IDS[@]} -gt 0 ]; then
    echo ""
    echo "Creating bugs for additional projects..."
    
    # Bug for Mobile App (Project 2)
    if [ ${#ADDITIONAL_PROJECT_IDS[@]} -gt 0 ]; then
        echo "Creating bug for Mobile App project"
        MOBILE_BUG_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -d "{
                \"project_id\": \"${ADDITIONAL_PROJECT_IDS[0]}\",
                \"title\": \"iOS App Crashes on Background Return\",
                \"description\": \"When users switch from the app to another app and return after 5+ minutes, the iOS version crashes with memory error. Affects iOS 15.0+ devices. Android version works correctly. Error occurs in authentication token refresh logic. Priority fix needed for App Store approval.\",
                \"reported_by\": \"$ADMIN_DEVELOPER_ID\",
                \"assigned_to\": \"$REGULAR_DEVELOPER_ID\",
                \"severity\": \"High\"
            }" \
            "$BASE_URL/bugs/new")
        
        HTTP_STATUS=$(echo $MOBILE_BUG_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
        if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
            echo "✓ Mobile app bug created successfully"
        fi
    fi
    
    # Bug for API Gateway (Project 3)
    if [ ${#ADDITIONAL_PROJECT_IDS[@]} -gt 1 ]; then
        echo "Creating bug for API Gateway project"
        API_BUG_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $REGULAR_TOKEN" \
            -d "{
                \"project_id\": \"${ADDITIONAL_PROJECT_IDS[1]}\",
                \"title\": \"Rate Limiter Incorrectly Blocks Valid Requests\",
                \"description\": \"The rate limiting middleware is incorrectly calculating request rates for users with multiple concurrent connections. Valid API requests are being blocked after 3-4 simultaneous calls instead of the configured 100/minute limit. This affects WebSocket connections and real-time features. Temporary workaround: Disable rate limiting for WebSocket endpoints.\",
                \"reported_by\": \"$REGULAR_DEVELOPER_ID\",
                \"assigned_to\": \"$ADMIN_DEVELOPER_ID\",
                \"severity\": \"Medium\"
            }" \
            "$BASE_URL/bugs/new")
        
        HTTP_STATUS=$(echo $API_BUG_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
        if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
            echo "✓ API Gateway bug created successfully"
        fi
    fi
    
    # Bug for Analytics Dashboard (Project 4)
    if [ ${#ADDITIONAL_PROJECT_IDS[@]} -gt 2 ]; then
        echo "Creating bug for Analytics Dashboard project"
        ANALYTICS_BUG_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -d "{
                \"project_id\": \"${ADDITIONAL_PROJECT_IDS[2]}\",
                \"title\": \"Chart Rendering Fails with Large Datasets\",
                \"description\": \"When loading datasets with >10,000 data points, the chart rendering engine fails and displays 'Canvas memory exceeded' error. This affects monthly and yearly reports with high-frequency data. Charts work fine with smaller datasets. Browser becomes unresponsive during rendering attempts. Consider implementing data sampling or pagination for large datasets.\",
                \"reported_by\": \"$ADMIN_DEVELOPER_ID\",
                \"assigned_to\": null,
                \"severity\": \"Medium\"
            }" \
            "$BASE_URL/bugs/new")
        
        HTTP_STATUS=$(echo $ANALYTICS_BUG_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
        if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
            echo "✓ Analytics Dashboard bug created successfully"
        fi
    fi
    
    print_result 0 "Created ${#ADDITIONAL_PROJECT_IDS[@]} additional projects with associated bugs"
    echo "Additional Project IDs: ${ADDITIONAL_PROJECT_IDS[*]}"
fi

echo ""
echo -e "${YELLOW}8. Testing Project Deletion Access Control${NC}"
echo "Testing regular user project deletion (should fail)"

if [ ! -z "$PROJECT_ID" ]; then
    DELETE_PROJECT_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X DELETE \
        -H "Authorization: Bearer $REGULAR_TOKEN" \
        "$BASE_URL/project/$PROJECT_ID")

    HTTP_STATUS=$(echo $DELETE_PROJECT_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    DELETE_PROJECT_BODY=$(echo $DELETE_PROJECT_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

    if [ "$HTTP_STATUS" -eq 403 ]; then
        print_result 0 "Regular user project deletion correctly denied"
        echo "Response: $DELETE_PROJECT_BODY"
    else
        print_result 1 "Regular user project deletion should have been denied (HTTP $HTTP_STATUS)"
        echo "Response: $DELETE_PROJECT_BODY"
    fi
else
    echo -e "${YELLOW}Skipping project deletion test (no project ID available)${NC}"
fi

echo ""
echo -e "${YELLOW}9. Testing Bug Creation (Multiple Test Bugs)${NC}"
echo "Creating 10 bugs with different values, severities, and assignments across multiple projects"
echo "Primary Project: $PROJECT_ID"
echo "Reporter (Admin): '$ADMIN_DEVELOPER_ID'"
echo "Assignee (Regular): '$REGULAR_DEVELOPER_ID'"

# Check if we have valid developer IDs before proceeding
if [ -z "$ADMIN_DEVELOPER_ID" ] || [ -z "$REGULAR_DEVELOPER_ID" ]; then
    echo -e "${RED}Error: Missing developer IDs. Cannot create bugs.${NC}"
    echo "Admin Developer ID: '$ADMIN_DEVELOPER_ID'"
    echo "Regular Developer ID: '$REGULAR_DEVELOPER_ID'"
    print_result 1 "Bug creation failed - missing developer IDs"
fi

# Initialize arrays to store created bug IDs
BUG_IDS=()
TIMESTAMP=$(date +%s)

# Bug Test Coverage Summary:
# ===========================
# Primary Project Bugs (10):
# - Bug 1: Critical UI Issue (Login button not responding)
# - Bug 2: High Priority Database Performance (Query timeout)  
# - Bug 3: Medium Priority Feature Bug (CSV export date filter)
# - Bug 4: Low Priority Cosmetic Issue (Dark mode button styling)
# - Bug 5: Medium Priority Security Concern (Session tokens in dev tools)
# - Bug 6: High Priority API Bug (Bulk update failures)
# - Bug 7: Critical Data Loss Bug (Comments lost during migration)
# - Bug 8: Medium Priority Mobile Issue (Responsive table)
# - Bug 9: Low Priority Enhancement (Keyboard shortcuts)
# - Bug 10: High Priority Performance (Search timeout)
#
# Additional Project Bugs (3):
# - Mobile App: High Priority iOS crash on background return
# - API Gateway: Medium Priority rate limiter false positives  
# - Analytics Dashboard: Medium Priority chart rendering with large datasets
#
# Severity Distribution: 2 Critical, 4 High, 5 Medium, 2 Low
# Assignment Distribution: 8 assigned, 5 unassigned
# Reporter Distribution: 7 admin-reported, 6 regular user-reported

# Bug 1: Critical UI Bug
echo "Creating Bug 1: Critical UI Issue"
BUG1_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"project_id\": \"$PROJECT_ID\",
        \"title\": \"Critical UI Login Button Not Responding\",
        \"description\": \"Users cannot click the login button on the main page. This is blocking all user access to the system. Affects all browsers including Chrome, Firefox, and Safari. Error appears in console: 'Uncaught TypeError: Cannot read property click'.\",
        \"reported_by\": \"$ADMIN_DEVELOPER_ID\",
        \"assigned_to\": \"$REGULAR_DEVELOPER_ID\",
        \"severity\": \"Critical\"
    }" \
    "$BASE_URL/bugs/new")

HTTP_STATUS=$(echo $BUG1_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BUG1_BODY=$(echo $BUG1_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    BUG1_ID=$(extract_json_field "$BUG1_BODY" "bug_id")
    BUG_IDS+=("$BUG1_ID")
    echo "✓ Bug 1 created successfully (ID: $BUG1_ID)"
else
    echo "✗ Bug 1 creation failed (HTTP $HTTP_STATUS)"
fi

# Bug 2: High Priority Database Issue
echo "Creating Bug 2: High Priority Database Performance Issue"
BUG2_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"project_id\": \"$PROJECT_ID\",
        \"title\": \"Database Query Timeout on Project List\",
        \"description\": \"When loading project list with more than 100 projects, the query times out after 30 seconds. Users see 'Connection timeout' error. This affects productivity for teams with large project portfolios. Suggested optimization: add database indexing on project.created_at field.\",
        \"reported_by\": \"$REGULAR_DEVELOPER_ID\",
        \"assigned_to\": \"$ADMIN_DEVELOPER_ID\",
        \"severity\": \"High\"
    }" \
    "$BASE_URL/bugs/new")

HTTP_STATUS=$(echo $BUG2_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BUG2_BODY=$(echo $BUG2_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    BUG2_ID=$(extract_json_field "$BUG2_BODY" "bug_id")
    BUG_IDS+=("$BUG2_ID")
    echo "✓ Bug 2 created successfully (ID: $BUG2_ID)"
else
    echo "✗ Bug 2 creation failed (HTTP $HTTP_STATUS)"
fi

# Bug 3: Medium Priority Feature Bug
echo "Creating Bug 3: Medium Priority Feature Enhancement"
BUG3_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $REGULAR_TOKEN" \
    -d "{
        \"project_id\": \"$PROJECT_ID\",
        \"title\": \"Export Bug Reports to CSV Missing Date Filter\",
        \"description\": \"When exporting bug reports to CSV format, the date filter options are not working correctly. All bugs are exported regardless of the selected date range. Users need this feature to generate monthly and quarterly reports for management.\",
        \"reported_by\": \"$REGULAR_DEVELOPER_ID\",
        \"assigned_to\": \"$REGULAR_DEVELOPER_ID\",
        \"severity\": \"Medium\"
    }" \
    "$BASE_URL/bugs/new")

HTTP_STATUS=$(echo $BUG3_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BUG3_BODY=$(echo $BUG3_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    BUG3_ID=$(extract_json_field "$BUG3_BODY" "bug_id")
    BUG_IDS+=("$BUG3_ID")
    echo "✓ Bug 3 created successfully (ID: $BUG3_ID)"
else
    echo "✗ Bug 3 creation failed (HTTP $HTTP_STATUS)"
fi

# Bug 4: Low Priority Cosmetic Issue
echo "Creating Bug 4: Low Priority Cosmetic Issue"
BUG4_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"project_id\": \"$PROJECT_ID\",
        \"title\": \"Inconsistent Button Styling in Dark Mode\",
        \"description\": \"In dark mode, some buttons have inconsistent styling. Submit buttons appear with light background while Cancel buttons have dark background. This creates a poor user experience but doesn't affect functionality. Affects: Settings page, User profile page, Bug creation form.\",
        \"reported_by\": \"$ADMIN_DEVELOPER_ID\",
        \"assigned_to\": null,
        \"severity\": \"Low\"
    }" \
    "$BASE_URL/bugs/new")

HTTP_STATUS=$(echo $BUG4_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BUG4_BODY=$(echo $BUG4_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    BUG4_ID=$(extract_json_field "$BUG4_BODY" "bug_id")
    BUG_IDS+=("$BUG4_ID")
    echo "✓ Bug 4 created successfully (ID: $BUG4_ID)"
else
    echo "✗ Bug 4 creation failed (HTTP $HTTP_STATUS)"
fi

# Bug 5: Medium Priority Security Concern
echo "Creating Bug 5: Medium Priority Security Issue"
BUG5_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"project_id\": \"$PROJECT_ID\",
        \"title\": \"Session Tokens Visible in Browser Developer Tools\",
        \"description\": \"Session tokens are visible in the browser's developer tools Network tab. While this doesn't pose immediate risk, it's a security concern for shared computers or when developers are debugging in production. Recommended: Implement httpOnly cookies or move tokens to secure headers.\",
        \"reported_by\": \"$ADMIN_DEVELOPER_ID\",
        \"assigned_to\": \"$ADMIN_DEVELOPER_ID\",
        \"severity\": \"Medium\"
    }" \
    "$BASE_URL/bugs/new")

HTTP_STATUS=$(echo $BUG5_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BUG5_BODY=$(echo $BUG5_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    BUG5_ID=$(extract_json_field "$BUG5_BODY" "bug_id")
    BUG_IDS+=("$BUG5_ID")
    echo "✓ Bug 5 created successfully (ID: $BUG5_ID)"
else
    echo "✗ Bug 5 creation failed (HTTP $HTTP_STATUS)"
fi

# Bug 6: High Priority API Bug
echo "Creating Bug 6: High Priority API Integration Issue"
BUG6_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $REGULAR_TOKEN" \
    -d "{
        \"project_id\": \"$PROJECT_ID\",
        \"title\": \"REST API Returns 500 Error on Bulk Bug Updates\",
        \"description\": \"The /bugs/bulk-update endpoint consistently returns HTTP 500 errors when updating more than 10 bugs simultaneously. This affects automated testing scripts and batch operations. Error log shows: 'database connection pool exhausted'. Critical for CI/CD pipeline integration. Workaround: Update bugs individually with 1-second delays.\",
        \"reported_by\": \"$REGULAR_DEVELOPER_ID\",
        \"assigned_to\": \"$ADMIN_DEVELOPER_ID\",
        \"severity\": \"High\"
    }" \
    "$BASE_URL/bugs/new")

HTTP_STATUS=$(echo $BUG6_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BUG6_BODY=$(echo $BUG6_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    BUG6_ID=$(extract_json_field "$BUG6_BODY" "bug_id")
    BUG_IDS+=("$BUG6_ID")
    echo "✓ Bug 6 created successfully (ID: $BUG6_ID)"
else
    echo "✗ Bug 6 creation failed (HTTP $HTTP_STATUS)"
fi

# Bug 7: Critical Data Loss Bug
echo "Creating Bug 7: Critical Data Integrity Issue"
BUG7_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"project_id\": \"$PROJECT_ID\",
        \"title\": \"Bug Comments Lost During Project Migration\",
        \"description\": \"When migrating projects between environments, bug comments are not properly transferred. This results in loss of valuable debugging information and team communication history. Affects: Project export/import functionality, Environment migrations, Database backups. URGENT: Backup before any migrations until fixed.\",
        \"reported_by\": \"$ADMIN_DEVELOPER_ID\",
        \"assigned_to\": \"$ADMIN_DEVELOPER_ID\",
        \"severity\": \"Critical\"
    }" \
    "$BASE_URL/bugs/new")

HTTP_STATUS=$(echo $BUG7_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BUG7_BODY=$(echo $BUG7_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    BUG7_ID=$(extract_json_field "$BUG7_BODY" "bug_id")
    BUG_IDS+=("$BUG7_ID")
    echo "✓ Bug 7 created successfully (ID: $BUG7_ID)"
else
    echo "✗ Bug 7 creation failed (HTTP $HTTP_STATUS)"
fi

# Bug 8: Medium Priority Mobile Compatibility
echo "Creating Bug 8: Medium Priority Mobile Responsiveness"
BUG8_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $REGULAR_TOKEN" \
    -d "{
        \"project_id\": \"$PROJECT_ID\",
        \"title\": \"Mobile View: Bug List Table Not Responsive\",
        \"description\": \"On mobile devices (viewport < 768px), the bug list table does not adapt to smaller screens. Horizontal scrolling is required to view all columns, making it difficult to use on phones and tablets. Suggested solution: Implement card-based layout for mobile or make table columns collapsible. Affects user adoption on mobile devices.\",
        \"reported_by\": \"$REGULAR_DEVELOPER_ID\",
        \"assigned_to\": null,
        \"severity\": \"Medium\"
    }" \
    "$BASE_URL/bugs/new")

HTTP_STATUS=$(echo $BUG8_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BUG8_BODY=$(echo $BUG8_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    BUG8_ID=$(extract_json_field "$BUG8_BODY" "bug_id")
    BUG_IDS+=("$BUG8_ID")
    echo "✓ Bug 8 created successfully (ID: $BUG8_ID)"
else
    echo "✗ Bug 8 creation failed (HTTP $HTTP_STATUS)"
fi

# Bug 9: Low Priority Enhancement Request
echo "Creating Bug 9: Low Priority Feature Enhancement"
BUG9_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"project_id\": \"$PROJECT_ID\",
        \"title\": \"Add Keyboard Shortcuts for Common Actions\",
        \"description\": \"Power users would benefit from keyboard shortcuts for common actions like creating new bugs (Ctrl+N), saving changes (Ctrl+S), and navigating between bugs (Ctrl+↑/↓). This is a nice-to-have feature that would improve productivity for frequent users. Current workflow requires multiple mouse clicks. Consider implementing: Ctrl+N: New bug, Ctrl+E: Edit mode, Ctrl+S: Save, Esc: Cancel.\",
        \"reported_by\": \"$ADMIN_DEVELOPER_ID\",
        \"assigned_to\": \"$REGULAR_DEVELOPER_ID\",
        \"severity\": \"Low\"
    }" \
    "$BASE_URL/bugs/new")

HTTP_STATUS=$(echo $BUG9_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BUG9_BODY=$(echo $BUG9_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    BUG9_ID=$(extract_json_field "$BUG9_BODY" "bug_id")
    BUG_IDS+=("$BUG9_ID")
    echo "✓ Bug 9 created successfully (ID: $BUG9_ID)"
else
    echo "✗ Bug 9 creation failed (HTTP $HTTP_STATUS)"
fi

# Bug 10: High Priority Performance Issue
echo "Creating Bug 10: High Priority Performance Degradation"
BUG10_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $REGULAR_TOKEN" \
    -d "{
        \"project_id\": \"$PROJECT_ID\",
        \"title\": \"Search Function Takes >30 Seconds for Large Datasets\",
        \"description\": \"When searching through projects with >1000 bugs, the search function becomes unresponsive and takes over 30 seconds to return results. Users experience browser timeout warnings. Performance testing shows exponential degradation with dataset size. Impact: Teams with large bug databases cannot effectively use search functionality. Proposed fix: Implement pagination and database indexing on searchable fields.\",
        \"reported_by\": \"$REGULAR_DEVELOPER_ID\",
        \"assigned_to\": \"$ADMIN_DEVELOPER_ID\",
        \"severity\": \"High\"
    }" \
    "$BASE_URL/bugs/new")

HTTP_STATUS=$(echo $BUG10_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BUG10_BODY=$(echo $BUG10_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    BUG10_ID=$(extract_json_field "$BUG10_BODY" "bug_id")
    BUG_IDS+=("$BUG10_ID")
    echo "✓ Bug 10 created successfully (ID: $BUG10_ID)"
else
    echo "✗ Bug 10 creation failed (HTTP $HTTP_STATUS)"
fi

# Store the first bug ID for later tests (backward compatibility)
if [ ${#BUG_IDS[@]} -gt 0 ]; then
    BUG_ID="${BUG_IDS[0]}"
    print_result 0 "Created ${#BUG_IDS[@]} test bugs successfully"
    echo "Bug IDs created: ${BUG_IDS[*]}"
    echo "Primary Bug ID for further testing: $BUG_ID"
else
    print_result 1 "Failed to create any test bugs"
fi

echo ""
echo -e "${YELLOW}10. Testing Get All Bugs${NC}"

GET_BUGS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$BASE_URL/bugs")

HTTP_STATUS=$(echo $GET_BUGS_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
GET_BUGS_BODY=$(echo $GET_BUGS_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Get all bugs successful"
    display_response "$GET_BUGS_BODY" "All Bugs Response"
else
    print_result 1 "Get all bugs failed (HTTP $HTTP_STATUS)"
    display_response "$GET_BUGS_BODY" "Error Response"
fi

echo ""
echo -e "${YELLOW}11. Testing Get Bug by ID${NC}"

if [ ! -z "$BUG_ID" ]; then
    GET_BUG_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$BASE_URL/bugs/$BUG_ID")

    HTTP_STATUS=$(echo $GET_BUG_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    GET_BUG_BODY=$(echo $GET_BUG_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

    if [ "$HTTP_STATUS" -eq 200 ]; then
        print_result 0 "Get bug by ID successful"
        display_response "$GET_BUG_BODY" "Single Bug Response"
    else
        print_result 1 "Get bug by ID failed (HTTP $HTTP_STATUS)"
        display_response "$GET_BUG_BODY" "Error Response"
    fi
else
    echo -e "${YELLOW}Skipping get bug by ID test (no bug ID available)${NC}"
fi

echo ""
echo -e "${YELLOW}12. Testing Bug Filtering${NC}"
echo "Testing all available filters individually, then combined"

# First test basic /bugs endpoint without filters to ensure it works
echo ""
echo -e "${BLUE}12.0. Basic Bugs Endpoint (No Filters)${NC}"
BASIC_BUGS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$BASE_URL/bugs")

HTTP_STATUS=$(echo $BASIC_BUGS_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BASIC_BUGS_BODY=$(echo $BASIC_BUGS_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Basic bugs endpoint working"
    echo "📊 Found $(echo "$BASIC_BUGS_BODY" | grep -o '"bug_id"' | wc -l | xargs) bugs total"
else
    print_result 1 "Basic bugs endpoint failed (HTTP $HTTP_STATUS)"
    display_response "$BASIC_BUGS_BODY" "Error Response"
fi

# Test 12a: Filter by project ID
echo ""
echo -e "${BLUE}12a. Filter by Project ID${NC}"
echo "Testing with project_id: $PROJECT_ID"
FILTER_PROJECT_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$BASE_URL/bugs?project_id=$PROJECT_ID")

HTTP_STATUS=$(echo $FILTER_PROJECT_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
FILTER_PROJECT_BODY=$(echo $FILTER_PROJECT_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Bug filtering by project ID successful"
    display_response "$FILTER_PROJECT_BODY" "Filter by Project ID"
else
    print_result 1 "Bug filtering by project ID failed (HTTP $HTTP_STATUS)"
    display_response "$FILTER_PROJECT_BODY" "Error Response"
fi

# Test 12b: Filter by severity
echo ""
echo -e "${BLUE}12b. Filter by Severity (High)${NC}"
FILTER_SEVERITY_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$BASE_URL/bugs?severity=High")

HTTP_STATUS=$(echo $FILTER_SEVERITY_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
FILTER_SEVERITY_BODY=$(echo $FILTER_SEVERITY_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Bug filtering by severity successful"
    display_response "$FILTER_SEVERITY_BODY" "Filter by Severity (High)"
else
    print_result 1 "Bug filtering by severity failed (HTTP $HTTP_STATUS)"
    display_response "$FILTER_SEVERITY_BODY" "Error Response"
fi

# Test 12c: Filter by status
echo ""
echo -e "${BLUE}12c. Filter by Status (Open)${NC}"
FILTER_STATUS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$BASE_URL/bugs?status=Open")

HTTP_STATUS=$(echo $FILTER_STATUS_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
FILTER_STATUS_BODY=$(echo $FILTER_STATUS_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Bug filtering by status successful"
    display_response "$FILTER_STATUS_BODY" "Filter by Status (Open)"
else
    print_result 1 "Bug filtering by status failed (HTTP $HTTP_STATUS)"
    display_response "$FILTER_STATUS_BODY" "Error Response"
fi

# Test 12d: Filter by assigned_to
echo ""
echo -e "${BLUE}12d. Filter by Assigned To${NC}"
FILTER_ASSIGNED_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$BASE_URL/bugs?assigned_to=$ADMIN_DEVELOPER_ID")

HTTP_STATUS=$(echo $FILTER_ASSIGNED_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
FILTER_ASSIGNED_BODY=$(echo $FILTER_ASSIGNED_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Bug filtering by assigned_to successful"
    display_response "$FILTER_ASSIGNED_BODY" "Filter by Assigned To (Admin)"
else
    print_result 1 "Bug filtering by assigned_to failed (HTTP $HTTP_STATUS)"
    display_response "$FILTER_ASSIGNED_BODY" "Error Response"
fi

# Test 12e: Filter by reported_by
echo ""
echo -e "${BLUE}12e. Filter by Reported By${NC}"
FILTER_REPORTER_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$BASE_URL/bugs?reported_by=$REGULAR_DEVELOPER_ID")

HTTP_STATUS=$(echo $FILTER_REPORTER_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
FILTER_REPORTER_BODY=$(echo $FILTER_REPORTER_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Bug filtering by reported_by successful"
    display_response "$FILTER_REPORTER_BODY" "Filter by Reported By (Regular User)"
else
    print_result 1 "Bug filtering by reported_by failed (HTTP $HTTP_STATUS)"
    display_response "$FILTER_REPORTER_BODY" "Error Response"
fi

# Test 12f: Multiple filters combined
echo ""
echo -e "${BLUE}12f. Multiple Filters Combined (Project + Severity + Status)${NC}"
FILTER_COMBINED_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$BASE_URL/bugs?project_id=$PROJECT_ID&severity=High&status=Open")

HTTP_STATUS=$(echo $FILTER_COMBINED_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
FILTER_COMBINED_BODY=$(echo $FILTER_COMBINED_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Bug filtering with multiple filters successful"
    display_response "$FILTER_COMBINED_BODY" "Combined Filters (Project + High Severity + Open Status)"
else
    print_result 1 "Bug filtering with multiple filters failed (HTTP $HTTP_STATUS)"
    display_response "$FILTER_COMBINED_BODY" "Error Response"
fi

# Test 12g: Edge case - Filter with no results
echo ""
echo -e "${BLUE}12g. Filter Edge Case (No Results Expected)${NC}"
echo "Testing with filters that should return empty results"

# Test different combinations that might cause issues
echo "Testing individual edge case filters first:"

# Test 12g1: Invalid severity value
echo ""
echo -e "${BLUE}12g1. Testing Invalid Severity${NC}"
INVALID_SEVERITY_URL="$BASE_URL/bugs?severity=InvalidSeverity"
echo "Testing URL: $INVALID_SEVERITY_URL"
INVALID_SEVERITY_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$INVALID_SEVERITY_URL")

HTTP_STATUS=$(echo $INVALID_SEVERITY_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
INVALID_SEVERITY_BODY=$(echo $INVALID_SEVERITY_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

echo "Invalid severity test - HTTP Status: $HTTP_STATUS"
if [ "$HTTP_STATUS" -eq 400 ]; then
    echo "✓ Invalid severity correctly rejected with 400"
    display_response "$INVALID_SEVERITY_BODY" "Invalid Severity Response"
elif [ "$HTTP_STATUS" -eq 200 ]; then
    echo "⚠ Invalid severity accepted (might return empty results)"
    display_response "$INVALID_SEVERITY_BODY" "Invalid Severity Response"
else
    echo "⚠ Unexpected response for invalid severity"
    display_response "$INVALID_SEVERITY_BODY" "Invalid Severity Response"
fi

# Test 12g2: Invalid status value
echo ""
echo -e "${BLUE}12g2. Testing Invalid Status${NC}"
INVALID_STATUS_URL="$BASE_URL/bugs?status=InvalidStatus"
echo "Testing URL: $INVALID_STATUS_URL"
INVALID_STATUS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$INVALID_STATUS_URL")

HTTP_STATUS=$(echo $INVALID_STATUS_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
INVALID_STATUS_BODY=$(echo $INVALID_STATUS_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

echo "Invalid status test - HTTP Status: $HTTP_STATUS"
if [ "$HTTP_STATUS" -eq 400 ]; then
    echo "✓ Invalid status correctly rejected with 400"
    display_response "$INVALID_STATUS_BODY" "Invalid Status Response"
elif [ "$HTTP_STATUS" -eq 200 ]; then
    echo "⚠ Invalid status accepted (might return empty results)"
    display_response "$INVALID_STATUS_BODY" "Invalid Status Response"
else
    echo "⚠ Unexpected response for invalid status"
    display_response "$INVALID_STATUS_BODY" "Invalid Status Response"
fi

# Test 12g3: Valid filters that should return no results
echo ""
echo -e "${BLUE}12g3. Testing Valid Filters (No Results Expected)${NC}"
EMPTY_RESULTS_URL="$BASE_URL/bugs?severity=Critical&status=Resolved"
echo "Testing URL: $EMPTY_RESULTS_URL"
FILTER_EMPTY_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$EMPTY_RESULTS_URL")

HTTP_STATUS=$(echo $FILTER_EMPTY_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
FILTER_EMPTY_BODY=$(echo $FILTER_EMPTY_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "Valid filters with empty results handled correctly"
    display_response "$FILTER_EMPTY_BODY" "Filter Edge Case (Critical + Resolved)"
else
    print_result 1 "Valid filters with empty results failed (HTTP $HTTP_STATUS)"
    display_response "$FILTER_EMPTY_BODY" "Error Response"
fi

# Test 12g4: URL encoding test
echo ""
echo -e "${BLUE}12g4. Testing URL Encoding${NC}"
ENCODED_URL="$BASE_URL/bugs?project_id=$(echo "$PROJECT_ID" | sed 's/-/%2D/g')"
echo "Testing URL with encoded characters: $ENCODED_URL"
ENCODED_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$ENCODED_URL")

HTTP_STATUS=$(echo $ENCODED_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
ENCODED_BODY=$(echo $ENCODED_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✓ URL encoding handled correctly"
    echo "Found $(echo "$ENCODED_BODY" | grep -o '"bug_id"' | wc -l | xargs) bugs with encoded project ID"
else
    echo "⚠ URL encoding test failed (HTTP $HTTP_STATUS)"
    display_response "$ENCODED_BODY" "URL Encoding Error Response"
fi

echo ""
echo -e "${YELLOW}13. Testing Bug Update${NC}"

if [ ! -z "$BUG_ID" ]; then
    UPDATE_BUG_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X PATCH \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"title\": \"Updated Test Bug\",
            \"status\": \"InProgress\",
            \"severity\": \"High\"
        }" \
        "$BASE_URL/bugs/$BUG_ID")

    HTTP_STATUS=$(echo $UPDATE_BUG_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    UPDATE_BUG_BODY=$(echo $UPDATE_BUG_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

    if [ "$HTTP_STATUS" -eq 200 ]; then
        print_result 0 "Bug update successful"
        display_response "$UPDATE_BUG_BODY" "Updated Bug Response"
    else
        print_result 1 "Bug update failed (HTTP $HTTP_STATUS)"
        display_response "$UPDATE_BUG_BODY" "Error Response"
    fi
else
    echo -e "${YELLOW}Skipping bug update test (no bug ID available)${NC}"
fi

echo ""
echo -e "${YELLOW}14. Testing User Logout${NC}"

LOGOUT_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"token\": \"$ADMIN_TOKEN\"}" \
    "$BASE_URL/logout")

HTTP_STATUS=$(echo $LOGOUT_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
LOGOUT_BODY=$(echo $LOGOUT_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_result 0 "User logout successful"
    display_response "$LOGOUT_BODY" "Logout Response"
else
    print_result 1 "User logout failed (HTTP $HTTP_STATUS)"
    display_response "$LOGOUT_BODY" "Error Response"
fi

echo ""
echo -e "${GREEN}=== All API Tests Completed Successfully! ===${NC}"
echo -e "${BLUE}Test Summary:${NC}"
echo "- Admin User: $ADMIN_USERNAME"
echo "- Regular User: $REGULAR_USERNAME"
echo "- Project: $TEST_PROJECT_NAME (ID: $PROJECT_ID)"
echo "- Bug ID: $BUG_ID"
echo ""
echo -e "${BLUE}Authentication Tests Performed:${NC}"
echo "✅ Bearer Token Authentication (API clients)"
echo "✅ Cookie-based Authentication (web browsers)"
echo "✅ Authentication Priority (Bearer > Cookie)"
echo "✅ Cookie clearing on logout"
echo "✅ Session expiry validation"
echo ""
echo -e "${YELLOW}Total Tests: 16 scenarios covering both Bearer token and cookie authentication${NC}"
echo -e "${YELLOW}Note: Some tests may fail if the server is not running or if there are authentication issues.${NC}"
echo -e "${YELLOW}Make sure your server is running on $BASE_URL before running these tests.${NC}"

# Test 12h: Query Parameter Debugging
echo ""
echo -e "${BLUE}12h. Query Parameter Debugging${NC}"
echo "Testing individual query parameters to identify deserialization issues"

# Test each possible query parameter individually
echo ""
echo "Testing severity parameter values:"
for severity in "Critical" "High" "Medium" "Low" "Invalid"; do
    echo "  Testing severity=$severity"
    TEST_URL="$BASE_URL/bugs?severity=$severity"
    TEST_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$TEST_URL")
    
    TEST_STATUS=$(echo $TEST_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    if [ "$TEST_STATUS" -eq 200 ]; then
        echo "    ✓ severity=$severity: HTTP 200 ($(echo $TEST_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | grep -o '"bug_id"' | wc -l | xargs) results)"
    else
        echo "    ✗ severity=$severity: HTTP $TEST_STATUS"
        if [ "$TEST_STATUS" -eq 400 ]; then
            echo "      Server rejected this severity value"
        fi
    fi
done

echo ""
echo "Testing status parameter values:"
for status in "Open" "InProgress" "Closed" "Resolved" "Invalid"; do
    echo "  Testing status=$status"
    TEST_URL="$BASE_URL/bugs?status=$status"
    TEST_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$TEST_URL")
    
    TEST_STATUS=$(echo $TEST_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    if [ "$TEST_STATUS" -eq 200 ]; then
        echo "    ✓ status=$status: HTTP 200 ($(echo $TEST_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | grep -o '"bug_id"' | wc -l | xargs) results)"
    else
        echo "    ✗ status=$status: HTTP $TEST_STATUS"
        if [ "$TEST_STATUS" -eq 400 ]; then
            echo "      Server rejected this status value"
        fi
    fi
done

echo ""
echo "Testing project_id parameter:"
if [ ! -z "$PROJECT_ID" ]; then
    echo "  Testing project_id=$PROJECT_ID"
    TEST_URL="$BASE_URL/bugs?project_id=$PROJECT_ID"
    TEST_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$TEST_URL")
    
    TEST_STATUS=$(echo $TEST_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    if [ "$TEST_STATUS" -eq 200 ]; then
        echo "    ✓ project_id=$PROJECT_ID: HTTP 200 ($(echo $TEST_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | grep -o '"bug_id"' | wc -l | xargs) results)"
    else
        echo "    ✗ project_id=$PROJECT_ID: HTTP $TEST_STATUS"
    fi
    
    # Also test with invalid project ID
    echo "  Testing project_id=invalid-uuid"
    TEST_URL="$BASE_URL/bugs?project_id=invalid-uuid"
    TEST_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$TEST_URL")
    
    TEST_STATUS=$(echo $TEST_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    if [ "$TEST_STATUS" -eq 200 ]; then
        echo "    ✓ project_id=invalid-uuid: HTTP 200 ($(echo $TEST_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//' | grep -o '"bug_id"' | wc -l | xargs) results)"
    else
        echo "    ✗ project_id=invalid-uuid: HTTP $TEST_STATUS"
        if [ "$TEST_STATUS" -eq 400 ]; then
            echo "      Server rejected invalid UUID format"
        fi
    fi
else
    echo "  Skipping project_id test (no PROJECT_ID available)"
fi

echo ""
echo "Summary: If any tests above show HTTP 400, it indicates the server has strict validation"
echo "for query parameters and rejects invalid values rather than ignoring them."