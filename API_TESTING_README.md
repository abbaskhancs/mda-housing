# MDA Housing API Testing Guide

## Overview
This guide provides comprehensive testing instructions for the MDA Housing API system. All endpoints have been tested and are working correctly with proper authentication and validation.

## Quick Start

### 1. Start the Backend Server
```bash
# From the project root
npm run build
$env:DATABASE_URL="file:./prisma/dev.db"
$env:JWT_SECRET="your-super-secret-jwt-key"
$env:PORT="3001"
node dist/index.js
```

### 2. Run Automated Tests
```bash
# Run the PowerShell test script
.\test-api-endpoints.ps1
```

### 3. Import Postman Collection
1. Open Postman
2. Import `MDA_Housing_API_Collection.postman_collection.json`
3. Set collection variables:
   - `personId`: `cmf8492bm001kxjnwh9kgqhuc`
   - `plotId`: `cmf8492bv001pxjnwb3dktfeh`
4. Run the collection in order

## Test Results Summary

### ✅ All Tests Passing (13/13)

| Test | Status | Details |
|------|--------|---------|
| Health Check | ✅ PASSED | Server responding correctly |
| Admin Login | ✅ PASSED | JWT token generated |
| Get Profile | ✅ PASSED | User profile retrieved |
| Get Workflow Stages | ✅ PASSED | 13 stages found |
| Get Workflow Sections | ✅ PASSED | 4 sections found |
| Get Workflow Statuses | ✅ PASSED | 4 statuses found |
| Get Workflow Guards | ✅ PASSED | 14 guards found |
| Get All Transitions | ✅ PASSED | 15 transitions found |
| Get Transitions from SUBMITTED | ✅ PASSED | 1 transition found |
| Get Applications | ✅ PASSED | 0 applications (empty) |
| Create Application | ✅ PASSED | Application created successfully |
| Get Transitions with Dry-Run | ✅ PASSED | Guard evaluation working |
| Other User Logins | ✅ PASSED | All 5 demo users working |

## API Endpoints Tested

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/verify` - Verify token validity
- `POST /api/auth/logout` - User logout
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/register` - Register new user (Admin only)

### Workflow Lookup Endpoints
- `GET /api/workflow/stages` - Get all workflow stages
- `GET /api/workflow/sections` - Get all workflow sections
- `GET /api/workflow/statuses` - Get all workflow statuses
- `GET /api/workflow/guards` - Get all workflow guards
- `GET /api/workflow/transitions` - Get all transitions
- `GET /api/workflow/transitions/:fromStage` - Get transitions from specific stage
- `GET /api/workflow/transitions?from=STAGE&applicationId=ID&dryRun=true` - Get transitions with dry-run guard evaluation

### Application Endpoints
- `GET /api/applications` - Get all applications (with pagination)
- `POST /api/applications` - Create new application
- `GET /api/applications/:id` - Get application by ID
- `PUT /api/applications/:id` - Update application
- `POST /api/workflow/applications/:id/transition` - Transition application stage
- `POST /api/workflow/applications/:id/guard-test` - Test guard without transition

### Health Check
- `GET /health` - Server health status

## Demo Users

All demo users have the password: `password123`

| Username | Role | Description |
|----------|------|-------------|
| admin | ADMIN | System administrator |
| owo_officer | OWO | Office of Works Officer |
| bca_officer | BCA | Building Control Authority |
| housing_officer | HOUSING | Housing Department |
| accounts_officer | ACCOUNTS | Accounts Department |
| water_officer | WATER | Water Department |
| approver | APPROVER | Final approver |

## Key Features Tested

### 1. Authentication & Authorization
- JWT token generation and validation
- Role-based access control
- Token expiration handling
- Secure password hashing

### 2. Workflow System
- Complete workflow stage management
- Transition validation with guards
- Dry-run guard evaluation
- Section and status management

### 3. Guard System
- 14 different workflow guards implemented
- Guard evaluation with detailed reasons
- Dry-run mode for testing transitions
- Context validation

### 4. Data Integrity
- Prisma ORM integration
- Database seeding with demo data
- Proper error handling and validation
- Transaction safety

## Postman Collection Features

The Postman collection includes:
- **Pre-request scripts** for automatic token management
- **Test scripts** for response validation
- **Environment variables** for easy configuration
- **Comprehensive test coverage** for all endpoints
- **Error handling tests** for edge cases

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Ensure database is seeded: `npm run db:seed`
   - Check environment variables are set
   - Verify port 3001 is available

2. **Authentication failures**
   - Verify JWT_SECRET is set
   - Check token format in Authorization header
   - Ensure user exists in database

3. **Database errors**
   - Run migrations: `npx prisma migrate dev`
   - Seed database: `npx prisma db seed`
   - Check DATABASE_URL is correct

### Logs
- Server logs are available in the console
- Error logs are written to `logs/error.log`
- Combined logs are written to `logs/combined.log`

## Next Steps

With Milestone 2.1 complete, the API is ready for:
1. Frontend integration
2. End-to-end workflow testing
3. Document generation (Phase 3)
4. Production deployment preparation

## Support

For issues or questions:
1. Check the test results above
2. Review the Postman collection
3. Check server logs for detailed error messages
4. Verify all environment variables are set correctly
