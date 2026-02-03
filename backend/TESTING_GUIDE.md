# 🧪 Testing Guide

## Prerequisites

✅ Server is running (`npm run dev`)
✅ MongoDB is connected
✅ Database is seeded (`npm run seed`)

## Testing Tools

### Option 1: Postman (Recommended)
1. Import `postman_collection.json`
2. Set variables:
   - `baseUrl`: http://localhost:5000
   - `token`: (will be set after login)

### Option 2: cURL (Command Line)
### Option 3: Thunder Client (VS Code Extension)

---

## Test Sequence

### 1️⃣ Health Check

**Request:**
```http
GET http://localhost:5000/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-02-03T..."
}
```

---

### 2️⃣ Register New User

**Request:**
```http
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "...",
      "name": "Test User",
      "email": "test@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Common Errors:**
- 409: Email already registered
- 400: Validation failed (check name, email, password)

---

### 3️⃣ Login

**Request:**
```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@smartpresentation.com",
  "password": "admin123"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**⚠️ IMPORTANT: Copy the token for next requests!**

**Common Errors:**
- 401: Invalid email or password
- 403: Account is deactivated

---

### 4️⃣ Get User Profile

**Request:**
```http
GET http://localhost:5000/api/auth/profile
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "name": "Admin User",
      "email": "admin@smartpresentation.com",
      "role": "admin",
      "createdAt": "..."
    }
  }
}
```

**Common Errors:**
- 401: No token provided / Invalid token
- 401: Token expired

---

### 5️⃣ Get All Presentation Types

**Request:**
```http
GET http://localhost:5000/api/presentation-types
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "presentationTypes": [
      {
        "_id": "...",
        "name": "Feasibility Study",
        "description": "...",
        "criteria": [...],
        "sections": [...],
        "enablePlots": true,
        "isActive": true
      }
    ],
    "count": 1
  }
}
```

**⚠️ Copy the `_id` for next requests!**

---

### 6️⃣ Get Form Schema

**Request:**
```http
GET http://localhost:5000/api/presentation-types/{ID}/form-schema
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "formSchema": {
      "presentationTypeId": "...",
      "presentationTypeName": "Feasibility Study",
      "enablePlots": true,
      "criteria": [
        {
          "name": "City",
          "type": "single",
          "options": ["Riyadh", "Dubai", "Abu Dhabi", "Jeddah", "Doha"],
          "required": true
        },
        ...
      ]
    }
  }
}
```

---

### 7️⃣ Create API Key

**Request:**
```http
POST http://localhost:5000/api/api-keys
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "My Gemini Key",
  "provider": "gemini",
  "key": "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "API key created successfully",
  "data": {
    "apiKey": {
      "_id": "...",
      "name": "My Gemini Key",
      "provider": "gemini",
      "isActive": true,
      "usageCount": 0
    }
  }
}
```

**Note:** The actual key is not returned for security

---

### 8️⃣ Browse Library Folder

**Request:**
```http
GET http://localhost:5000/api/files/browse?folderPath=
Authorization: Bearer YOUR_TOKEN
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "currentPath": "",
    "contents": [
      {
        "name": "Feasibility Study",
        "path": "Feasibility Study",
        "type": "folder",
        "size": null,
        "modified": "...",
        "extension": null
      }
    ],
    "count": 1
  }
}
```

---

### 9️⃣ Upload PPTX File

**Request:**
```http
POST http://localhost:5000/api/upload
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

Form Data:
- file: [Select .pptx file]
- destinationPath: Feasibility Study/06_Market Overview
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "file": {
      "name": "riyadh + residential + apartments + luxury.pptx",
      "path": "Feasibility Study/06_Market Overview/...",
      "size": 123456,
      "type": "file",
      "extension": ".pptx"
    }
  }
}
```

**Common Errors:**
- 400: No file uploaded
- 400: Only PowerPoint files allowed
- 400: File size too large (max 50MB)

---

### 🔟 Generate Presentation

**Request:**
```http
POST http://localhost:5000/api/presentations/generate
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "presentationTypeId": "PASTE_ID_FROM_STEP_5",
  "formData": {},
  "plots": [
    {
      "plotNumber": 1,
      "criteria": {
        "City": "Riyadh",
        "Asset Type": "Residential",
        "Category": "Apartments",
        "Specifications": "Luxury"
      }
    },
    {
      "plotNumber": 2,
      "criteria": {
        "City": "Dubai",
        "Asset Type": "Office",
        "Category": "Grade A",
        "Specifications": "Premium"
      }
    }
  ]
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Presentation generated successfully",
  "data": {
    "presentation": {
      "id": "...",
      "fileName": "Feasibility_Study_1738612345678.pptx",
      "filePath": "...",
      "fileSize": 234567,
      "downloadUrl": "/api/presentations/download/..."
    }
  }
}
```

**Common Errors:**
- 404: Presentation type not found
- 400: Plots are required
- 500: No presentation files found to merge

---

### 1️⃣1️⃣ Get Presentation History

**Request:**
```http
GET http://localhost:5000/api/presentations/history
Authorization: Bearer YOUR_TOKEN
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "presentations": [
      {
        "_id": "...",
        "presentationTypeName": "Feasibility Study",
        "generatedFileName": "Feasibility_Study_1738612345678.pptx",
        "status": "completed",
        "downloadCount": 0,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
}
```

---

### 1️⃣2️⃣ Download Presentation

**Request:**
```http
GET http://localhost:5000/api/presentations/download/{PRESENTATION_ID}
Authorization: Bearer YOUR_TOKEN
```

**Expected Response:**
- File download starts
- Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation

**Common Errors:**
- 404: Presentation not found
- 400: Presentation is not ready for download
- 404: Presentation file not found

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

---

## Status Codes Reference

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET/PUT/DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate entry |
| 500 | Server Error | Internal error |

---

## Testing Checklist

### Authentication
- [ ] Register new user
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Get profile with valid token
- [ ] Get profile without token (should fail)
- [ ] Update profile

### API Keys
- [ ] Create API key
- [ ] Get all API keys
- [ ] Get single API key
- [ ] Update API key
- [ ] Validate API key
- [ ] Delete API key

### Presentation Types
- [ ] Get all presentation types
- [ ] Get single presentation type
- [ ] Get form schema
- [ ] Create new type (admin only)
- [ ] Update type (admin only)
- [ ] Delete type (admin only)

### File Management
- [ ] Browse Library root
- [ ] Browse subfolder
- [ ] Create folder (admin only)
- [ ] Upload single file (admin only)
- [ ] Upload multiple files (admin only)
- [ ] Download file
- [ ] Delete file (admin only)

### Presentations
- [ ] Generate presentation (single plot)
- [ ] Generate presentation (multiple plots)
- [ ] Generate presentation (duplicate plots - check deduplication)
- [ ] Get history
- [ ] Get single history item
- [ ] Download presentation
- [ ] Delete from history

---

## Troubleshooting

### "Cannot connect to server"
- Check if server is running (`npm run dev`)
- Verify port 5000 is not blocked
- Check `baseUrl` in Postman

### "MongoDB connection error"
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env`

### "Invalid token"
- Token might be expired (default: 7 days)
- Login again to get new token
- Check Authorization header format: `Bearer TOKEN`

### "Presentation generation failed"
- Check if Library folder exists
- Verify PPTX files are in correct folders
- Check file naming matches criteria format

### "File upload failed"
- Check file type (.pptx only)
- Verify file size (max 50MB)
- Ensure destination path exists

---

## Next Steps After Testing

1. ✅ All endpoints working? → Start building frontend
2. ❌ Some errors? → Check logs in terminal
3. 📁 Need PPTX files? → Upload using `/api/upload`
4. 🎨 Ready for production? → Update `.env` with production values

---

**Happy Testing! 🚀**
