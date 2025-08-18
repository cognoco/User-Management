#!/bin/bash

# Security Audit Script for User Management System
# Run this script to check for common security vulnerabilities

echo "================================================"
echo "   Security Audit Report"
echo "   Generated: $(date)"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Counters
ISSUES=0
WARNINGS=0
PASS=0

# Function to check and report issues
check_issue() {
    local count=$1
    local message=$2
    local severity=$3
    
    if [ "$count" -gt 0 ]; then
        if [ "$severity" = "error" ]; then
            echo -e "${RED}❌ ISSUE: $message (Found: $count)${NC}"
            ISSUES=$((ISSUES + 1))
        else
            echo -e "${YELLOW}⚠️  WARNING: $message (Found: $count)${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${GREEN}✅ PASS: $message${NC}"
        PASS=$((PASS + 1))
    fi
}

echo "1. Checking for localStorage usage with sensitive data..."
echo "=========================================="
LOCALSTORAGE_COUNT=$(grep -r "localStorage\." src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test" | grep -v "mock" | grep -v "//" | wc -l)
check_issue $LOCALSTORAGE_COUNT "localStorage usage found (potential XSS vulnerability)" "error"
if [ "$LOCALSTORAGE_COUNT" -gt 0 ]; then
    echo "   Files with localStorage:"
    grep -r "localStorage\." src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test" | grep -v "mock" | grep -v "//" | head -5
fi
echo ""

echo "2. Checking for sessionStorage usage..."
echo "=========================================="
SESSIONSTORAGE_COUNT=$(grep -r "sessionStorage\." src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test" | grep -v "mock" | grep -v "//" | wc -l)
check_issue $SESSIONSTORAGE_COUNT "sessionStorage usage found (review for sensitive data)" "warning"
echo ""

echo "3. Checking for console.log statements..."
echo "=========================================="
CONSOLE_LOG_COUNT=$(grep -r "console\.log" src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test" | grep -v "mock" | grep -v "logger" | grep -v "//" | wc -l)
check_issue $CONSOLE_LOG_COUNT "console.log statements found (potential data exposure)" "warning"
echo ""

echo "4. Checking for hardcoded secrets..."
echo "=========================================="
# Check for potential API keys, passwords, tokens
SECRET_PATTERNS="(api[_-]?key|apikey|secret|password|token|bearer|private[_-]?key|client[_-]?secret)"
SECRETS_COUNT=$(grep -r -E "$SECRET_PATTERNS\s*[:=]\s*['\"]" src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test" | grep -v "interface" | grep -v "type " | grep -v "example" | grep -v "//" | wc -l)
check_issue $SECRETS_COUNT "Potential hardcoded secrets found" "error"
if [ "$SECRETS_COUNT" -gt 0 ]; then
    echo "   Potential secrets in:"
    grep -r -E "$SECRET_PATTERNS\s*[:=]\s*['\"]" src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test" | grep -v "interface" | grep -v "type " | grep -v "example" | grep -v "//" | head -3
fi
echo ""

echo "5. Checking cookie configuration..."
echo "=========================================="
# Check for cookies without httpOnly flag
INSECURE_COOKIES=$(grep -r "cookie" src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "httpOnly" | grep -v "test" | grep -v "import" | grep -v "//" | wc -l)
check_issue $INSECURE_COOKIES "Cookie operations without httpOnly flag" "warning"
echo ""

echo "6. Checking CSRF protection..."
echo "=========================================="
# Check if CSRF middleware exists
if [ -f "src/middleware/csrf.ts" ]; then
    echo -e "${GREEN}✅ CSRF middleware found${NC}"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ CSRF middleware not found${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Check for API routes without CSRF
UNPROTECTED_ROUTES=$(grep -r "export const \(POST\|PUT\|DELETE\|PATCH\)" app/api/ --include="*.ts" 2>/dev/null | grep -v "enableCSRF: false" | wc -l)
echo "   Protected API routes: $UNPROTECTED_ROUTES"
echo ""

echo "7. Checking authentication middleware..."
echo "=========================================="
# Check for routes that might need auth
PUBLIC_ROUTES=$(grep -r "requireAuth: false" app/api/ --include="*.ts" 2>/dev/null | wc -l)
echo "   Public API routes: $PUBLIC_ROUTES"
PROTECTED_ROUTES=$(grep -r "requireAuth: true" app/api/ --include="*.ts" 2>/dev/null | wc -l)
echo "   Protected API routes: $PROTECTED_ROUTES"
echo ""

echo "8. Checking for SQL injection vulnerabilities..."
echo "=========================================="
# Look for string concatenation in queries
SQL_CONCAT=$(grep -r "\$\|concat\|+" src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -i "query\|sql\|select\|insert\|update\|delete" | grep -v "test" | grep -v "//" | wc -l)
check_issue $SQL_CONCAT "Potential SQL injection points (review query construction)" "warning"
echo ""

echo "9. Checking for unsafe regular expressions..."
echo "=========================================="
# Check for potentially dangerous regex patterns
UNSAFE_REGEX=$(grep -r "new RegExp\|\.match\|\.test" src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test\." | grep -v "//" | wc -l)
echo "   Regular expressions found: $UNSAFE_REGEX (review for ReDoS)"
echo ""

echo "10. Running npm audit..."
echo "=========================================="
npm audit --audit-level=high 2>/dev/null | tail -10
echo ""

echo "11. Checking TypeScript any usage..."
echo "=========================================="
ANY_COUNT=$(grep -r ": any" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test" | grep -v "//" | wc -l)
check_issue $ANY_COUNT "TypeScript 'any' types found (type safety issue)" "warning"
echo ""

echo "12. Checking for exposed error messages..."
echo "=========================================="
# Check for error messages that might expose internal details
ERROR_EXPOSE=$(grep -r "catch.*console\|catch.*res\.json\|catch.*res\.send" src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test" | grep -v "//" | wc -l)
check_issue $ERROR_EXPOSE "Error handlers that might expose internal details" "warning"
echo ""

echo "================================================"
echo "   Security Audit Summary"
echo "================================================"
echo -e "${RED}Critical Issues: $ISSUES${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${GREEN}Passed Checks: $PASS${NC}"
echo ""

if [ "$ISSUES" -gt 0 ]; then
    echo -e "${RED}⚠️  CRITICAL: Security issues detected! Address these immediately.${NC}"
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Some security concerns found. Review and address as needed.${NC}"
    exit 0
else
    echo -e "${GREEN}✅ All security checks passed!${NC}"
    exit 0
fi