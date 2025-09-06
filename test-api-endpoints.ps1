# MDA Housing API Test Script
# This script tests all API endpoints to ensure they're working correctly

$baseUrl = "http://localhost:3001"
$adminToken = ""
$personId = "cmf8492bm001kxjnwh9kgqhuc"
$plotId = "cmf8492bv001pxjnwb3dktfeh"

Write-Host "=== MDA Housing API Test Script ===" -ForegroundColor Green
Write-Host "Testing all endpoints to ensure they respond correctly..." -ForegroundColor Yellow

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Health Check: PASSED" -ForegroundColor Green
    } else {
        Write-Host "❌ Health Check: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Health Check: FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# Test 2: Admin Login
Write-Host "`n2. Testing Admin Login..." -ForegroundColor Cyan
try {
    $loginBody = @{
        username = "admin"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    if ($response.StatusCode -eq 200) {
        $loginData = $response.Content | ConvertFrom-Json
        $adminToken = $loginData.token
        Write-Host "✅ Admin Login: PASSED" -ForegroundColor Green
        Write-Host "   Token: $($adminToken.Substring(0, 20))..." -ForegroundColor Gray
    } else {
        Write-Host "❌ Admin Login: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Admin Login: FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# Test 3: Get Profile
Write-Host "`n3. Testing Get Profile..." -ForegroundColor Cyan
try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/profile" -Method GET -Headers $headers
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Get Profile: PASSED" -ForegroundColor Green
    } else {
        Write-Host "❌ Get Profile: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Get Profile: FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# Test 4: Get Workflow Stages
Write-Host "`n4. Testing Get Workflow Stages..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/workflow/stages" -Method GET -Headers $headers
    if ($response.StatusCode -eq 200) {
        $stagesData = $response.Content | ConvertFrom-Json
        Write-Host "✅ Get Workflow Stages: PASSED (Found $($stagesData.stages.Count) stages)" -ForegroundColor Green
    } else {
        Write-Host "❌ Get Workflow Stages: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Get Workflow Stages: FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# Test 5: Get Workflow Sections
Write-Host "`n5. Testing Get Workflow Sections..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/workflow/sections" -Method GET -Headers $headers
    if ($response.StatusCode -eq 200) {
        $sectionsData = $response.Content | ConvertFrom-Json
        Write-Host "✅ Get Workflow Sections: PASSED (Found $($sectionsData.sections.Count) sections)" -ForegroundColor Green
    } else {
        Write-Host "❌ Get Workflow Sections: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Get Workflow Sections: FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# Test 6: Get Workflow Statuses
Write-Host "`n6. Testing Get Workflow Statuses..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/workflow/statuses" -Method GET -Headers $headers
    if ($response.StatusCode -eq 200) {
        $statusesData = $response.Content | ConvertFrom-Json
        Write-Host "✅ Get Workflow Statuses: PASSED (Found $($statusesData.statuses.Count) statuses)" -ForegroundColor Green
    } else {
        Write-Host "❌ Get Workflow Statuses: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Get Workflow Statuses: FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# Test 7: Get Workflow Guards
Write-Host "`n7. Testing Get Workflow Guards..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/workflow/guards" -Method GET -Headers $headers
    if ($response.StatusCode -eq 200) {
        $guardsData = $response.Content | ConvertFrom-Json
        Write-Host "✅ Get Workflow Guards: PASSED (Found $($guardsData.guards.Count) guards)" -ForegroundColor Green
    } else {
        Write-Host "❌ Get Workflow Guards: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Get Workflow Guards: FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# Test 8: Get All Transitions
Write-Host "`n8. Testing Get All Transitions..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/workflow/transitions" -Method GET -Headers $headers
    if ($response.StatusCode -eq 200) {
        $transitionsData = $response.Content | ConvertFrom-Json
        Write-Host "✅ Get All Transitions: PASSED (Found $($transitionsData.transitions.Count) transitions)" -ForegroundColor Green
    } else {
        Write-Host "❌ Get All Transitions: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Get All Transitions: FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# Test 9: Get Transitions from SUBMITTED
Write-Host "`n9. Testing Get Transitions from SUBMITTED..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/workflow/transitions/SUBMITTED" -Method GET -Headers $headers
    if ($response.StatusCode -eq 200) {
        $transitionsData = $response.Content | ConvertFrom-Json
        Write-Host "✅ Get Transitions from SUBMITTED: PASSED (Found $($transitionsData.transitions.Count) transitions)" -ForegroundColor Green
    } else {
        Write-Host "❌ Get Transitions from SUBMITTED: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Get Transitions from SUBMITTED: FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# Test 10: Get Applications
Write-Host "`n10. Testing Get Applications..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/applications" -Method GET -Headers $headers
    if ($response.StatusCode -eq 200) {
        $applicationsData = $response.Content | ConvertFrom-Json
        Write-Host "✅ Get Applications: PASSED (Found $($applicationsData.applications.Count) applications)" -ForegroundColor Green
    } else {
        Write-Host "❌ Get Applications: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Get Applications: FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# Test 11: Create Application
Write-Host "`n11. Testing Create Application..." -ForegroundColor Cyan
try {
    $applicationBody = @{
        sellerId = $personId
        buyerId = $personId
        plotId = $plotId
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/api/applications" -Method POST -Body $applicationBody -ContentType "application/json" -Headers $headers
    if ($response.StatusCode -eq 201) {
        $applicationData = $response.Content | ConvertFrom-Json
        $applicationId = $applicationData.application.id
        Write-Host "✅ Create Application: PASSED (ID: $applicationId)" -ForegroundColor Green
    } else {
        Write-Host "❌ Create Application: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Create Application: FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# Test 12: Get Transitions with Dry-Run
Write-Host "`n12. Testing Get Transitions with Dry-Run..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/workflow/transitions?from=SUBMITTED&applicationId=$applicationId&dryRun=true" -Method GET -Headers $headers
    if ($response.StatusCode -eq 200) {
        $transitionsData = $response.Content | ConvertFrom-Json
        Write-Host "✅ Get Transitions with Dry-Run: PASSED (Found $($transitionsData.transitions.Count) transitions with guard results)" -ForegroundColor Green
    } else {
        Write-Host "❌ Get Transitions with Dry-Run: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Get Transitions with Dry-Run: FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# Test 13: Test Other User Logins
Write-Host "`n13. Testing Other User Logins..." -ForegroundColor Cyan
$users = @("owo_officer", "bca_officer", "housing_officer", "accounts_officer", "approver")
foreach ($user in $users) {
    try {
        $loginBody = @{
            username = $user
            password = "password123"
        } | ConvertTo-Json

        $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $user Login: PASSED" -ForegroundColor Green
        } else {
            Write-Host "❌ $user Login: FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ $user Login: FAILED (Error: $($_.Exception.Message))" -ForegroundColor Red
    }
}

Write-Host "`n=== API Test Summary ===" -ForegroundColor Green
Write-Host "All major endpoints have been tested. Check the results above." -ForegroundColor Yellow
Write-Host "`nPostman Collection: MDA_Housing_API_Collection.postman_collection.json" -ForegroundColor Cyan
Write-Host "Import this collection into Postman for comprehensive testing." -ForegroundColor Yellow
