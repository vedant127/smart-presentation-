# API Testing Guide

## Quick Start

### 1. Start MongoDB
```bash
# Make sure MongoDB is running
mongod
```

### 2. Seed the Database
```bash
npm run seed
```

This will create:
- **Admin User**: admin@smartpresentation.com / admin123
- **Demo User**: demo@smartpresentation.com / demo123
- **Feasibility Study** presentation type
- **Credential Report** presentation type

### 3. Start the Server
```bash
npm run dev
```

Server will run on: http://localhost:5000

## Testing Workflow

### Step 1: Register/Login

**Login as Admin:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@smartpresentation.com",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "name": "Admin User",
      "email": "admin@smartpresentation.com",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save the token** - you'll need it for authenticated requests!

### Step 2: Get Presentation Types

```bash
curl http://localhost:5000/api/presentation-types
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "presentationTypes": [
      {
        "_id": "...",
        "name": "Feasibility Study",
        "displayName": "Feasibility Study Report",
        "hasPlotsCriterion": true,
        ...
      }
    ]
  }
}
```

### Step 3: Get Form Schema

```bash
curl http://localhost:5000/api/presentation-types/{ID}/form-schema
```

This returns the complete form structure with all criteria and sections.

### Step 4: Create API Key (Optional)

```bash
curl -X POST http://localhost:5000/api/api-keys \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API Key",
    "description": "For testing external integration",
    "permissions": ["generate", "read"]
  }'
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "apiKey": {
      "key": "spk_abc123...",
      ...
    }
  },
  "warning": "Please save this API key securely..."
}
```

### Step 5: Generate Presentation

**Using JWT Token:**
```bash
curl -X POST http://localhost:5000/api/presentations/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "presentationTypeId": "PRESENTATION_TYPE_ID",
    "numberOfPlots": 2,
    "plots": [
      {
        "plotNumber": 1,
        "criteriaAnswers": {
          "city": "riyadh",
          "assetType": "residential",
          "category": "apartments",
          "specifications": "luxury"
        }
      },
      {
        "plotNumber": 2,
        "criteriaAnswers": {
          "city": "dubai",
          "assetType": "office",
          "category": "grade a",
          "specifications": "high rise"
        }
      }
    ]
  }'
```

**Using API Key:**
```bash
curl -X POST http://localhost:5000/api/presentations/generate \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Response:**
```json
{
  "status": "success",
  "message": "Presentation generated successfully",
  "data": {
    "presentation": {
      "id": "...",
      "fileName": "Feasibility Study_abc123.pptx",
      "downloadUrl": "/api/presentations/download/Feasibility Study_abc123.pptx",
      "status": "completed",
      "metadata": {
        "totalSlides": 15,
        "generationTime": 1234
      }
    }
  }
}
```

### Step 6: Download Presentation

```bash
curl -O http://localhost:5000/api/presentations/download/Feasibility%20Study_abc123.pptx
```

Or open in browser:
```
http://localhost:5000/api/presentations/download/Feasibility Study_abc123.pptx
```

### Step 7: View History

```bash
curl http://localhost:5000/api/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 8: Get Statistics

```bash
curl http://localhost:5000/api/history/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Library Management

### Browse Library

```bash
curl "http://localhost:5000/api/library/browse?path=Feasibility%20Study" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Upload PPTX File (Admin Only)

```bash
curl -X POST http://localhost:5000/api/library/upload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@/path/to/file.pptx" \
  -F "presentationType=Feasibility Study" \
  -F "section=06_Market Overview" \
  -F "filename=riyadh + residential + apartments + luxury.pptx"
```

### Create Folder

```bash
curl -X POST http://localhost:5000/api/library/folder \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "folderPath": "Feasibility Study/12_New Section"
  }'
```

## Common Scenarios

### Scenario 1: Single Plot Presentation

```json
{
  "presentationTypeId": "...",
  "numberOfPlots": 1,
  "plots": [
    {
      "plotNumber": 1,
      "criteriaAnswers": {
        "city": "riyadh",
        "assetType": "residential",
        "category": "apartments",
        "specifications": "luxury"
      }
    }
  ]
}
```

### Scenario 2: Multiple Plots with Deduplication

```json
{
  "presentationTypeId": "...",
  "numberOfPlots": 3,
  "plots": [
    {
      "plotNumber": 1,
      "criteriaAnswers": {
        "city": "riyadh",
        "assetType": "residential",
        "category": "apartments",
        "specifications": "luxury"
      }
    },
    {
      "plotNumber": 2,
      "criteriaAnswers": {
        "city": "dubai",
        "assetType": "office",
        "category": "grade a",
        "specifications": "high rise"
      }
    },
    {
      "plotNumber": 3,
      "criteriaAnswers": {
        "city": "riyadh",
        "assetType": "residential",
        "category": "apartments",
        "specifications": "luxury"
      }
    }
  ]
}
```

**Result:** Plots 1 and 3 have identical criteria, so varying sections will only include files once.

### Scenario 3: Credential Report (Multiple Choice)

```json
{
  "presentationTypeId": "...",
  "globalCriteriaAnswers": {
    "companyName": "company a",
    "teamMembers": ["john doe", "jane smith"]
  },
  "numberOfPlots": 0,
  "plots": []
}
```

**Result:** Team CV section will include 2 files: `john doe.pptx` and `jane smith.pptx`

## Error Handling

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Not authorized to access this route. Please provide a valid token."
}
```

**Solution:** Include valid JWT token or API key

### 404 Not Found
```json
{
  "status": "error",
  "message": "Presentation type not found"
}
```

**Solution:** Check if the ID is correct

### 400 Validation Error
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

**Solution:** Fix the validation errors in your request

## Health Check

```bash
curl http://localhost:5000/api/health
```

**Response:**
```json
{
  "status": "success",
  "message": "Smart Presentation Machine API is running",
  "timestamp": "2026-02-03T10:00:00.000Z",
  "environment": "development"
}
```

## Tips

1. **Save your tokens** - Store JWT tokens for reuse
2. **Use environment variables** - Don't hardcode tokens in scripts
3. **Check file naming** - Varying section files must match criteria keys exactly
4. **Test incrementally** - Start with simple requests, then add complexity
5. **Monitor logs** - Server logs show detailed error information
6. **Use Postman** - Import the Postman collection for easier testing

## Postman Collection

Import `postman_collection.json` into Postman for a complete set of pre-configured requests.

## Next Steps

1. ✅ Test all authentication endpoints
2. ✅ Create presentation types
3. ✅ Upload PPTX files to Library
4. ✅ Generate test presentations
5. ✅ Integrate with your frontend
6. ✅ Integrate with your AI system
