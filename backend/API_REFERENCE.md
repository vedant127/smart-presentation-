# 📖 Complete API Reference

## Base URL
```
http://localhost:5000/api
```

## Authentication

All authenticated endpoints require either:
- **JWT Token**: `Authorization: Bearer <token>`
- **API Key**: `X-API-Key: <api-key>`

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"  // optional, defaults to "user"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "65abc...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": "65abc...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "65abc...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "createdAt": "2026-02-03T10:00:00.000Z"
    }
  }
}
```

### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Updated",
  "email": "john.new@example.com"
}
```

### Change Password
```http
PUT /api/auth/change-password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## 📊 Presentation Type Endpoints

### Get All Presentation Types
```http
GET /api/presentation-types
```

**Query Parameters:**
- `isActive` (optional): Filter by active status

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "presentationTypes": [
      {
        "_id": "65abc...",
        "name": "Feasibility Study",
        "displayName": "Feasibility Study Report",
        "description": "Comprehensive feasibility analysis",
        "hasPlotsCriterion": true,
        "isActive": true,
        "criteria": [...],
        "sections": [...],
        "createdAt": "2026-02-03T10:00:00.000Z"
      }
    ],
    "count": 2
  }
}
```

### Get Presentation Type by ID
```http
GET /api/presentation-types/:id
```

### Get Form Schema
```http
GET /api/presentation-types/:id/form-schema
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "formSchema": {
      "presentationType": {
        "id": "65abc...",
        "name": "Feasibility Study",
        "displayName": "Feasibility Study Report",
        "description": "..."
      },
      "hasPlotsCriterion": true,
      "criteria": [
        {
          "name": "city",
          "label": "City",
          "type": "single",
          "options": [
            { "value": "riyadh", "label": "Riyadh" },
            { "value": "dubai", "label": "Dubai" }
          ],
          "isRequired": true,
          "order": 1
        }
      ],
      "sections": [
        {
          "name": "cover_page",
          "displayName": "Cover Page",
          "order": 1,
          "isVarying": false,
          "varyingCriteria": []
        },
        {
          "name": "market_overview",
          "displayName": "Market Overview",
          "order": 6,
          "isVarying": true,
          "varyingCriteria": ["city", "assetType"]
        }
      ]
    }
  }
}
```

### Create Presentation Type (Admin Only)
```http
POST /api/presentation-types
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "name": "New Type",
  "displayName": "New Presentation Type",
  "description": "Description here",
  "hasPlotsCriterion": false,
  "criteria": [
    {
      "name": "criterion1",
      "label": "Criterion 1",
      "type": "single",
      "options": [
        { "value": "option1", "label": "Option 1" }
      ],
      "isRequired": true,
      "order": 1
    }
  ],
  "sections": [
    {
      "name": "section1",
      "displayName": "Section 1",
      "order": 1,
      "isVarying": false,
      "varyingCriteria": [],
      "folderPath": "01_Section 1"
    }
  ]
}
```

### Update Presentation Type (Admin Only)
```http
PUT /api/presentation-types/:id
Authorization: Bearer <admin-token>
```

### Delete Presentation Type (Admin Only)
```http
DELETE /api/presentation-types/:id
Authorization: Bearer <admin-token>
```

---

## 🎨 Presentation Endpoints

### Generate Presentation
```http
POST /api/presentations/generate
Authorization: Bearer <token>
# OR
X-API-Key: <api-key>
```

**Request Body (with plots):**
```json
{
  "presentationTypeId": "65abc...",
  "globalCriteriaAnswers": {},
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
}
```

**Request Body (without plots):**
```json
{
  "presentationTypeId": "65abc...",
  "globalCriteriaAnswers": {
    "companyName": "company a",
    "teamMembers": ["john doe", "jane smith"]
  },
  "numberOfPlots": 0,
  "plots": []
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Presentation generated successfully",
  "data": {
    "presentation": {
      "id": "65def...",
      "fileName": "Feasibility Study_abc123.pptx",
      "downloadUrl": "/api/presentations/download/Feasibility Study_abc123.pptx",
      "status": "completed",
      "metadata": {
        "totalSlides": 15,
        "sectionsIncluded": [
          {
            "sectionName": "01_Cover Page",
            "slideCount": 1,
            "sourceFile": "cover.pptx"
          }
        ],
        "generationTime": 1234,
        "filesProcessed": 11
      }
    }
  }
}
```

### Download Presentation
```http
GET /api/presentations/download/:filename
```

**Response:** PPTX file download

### Get All Presentations
```http
GET /api/presentations
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `status` (optional): pending, processing, completed, failed
- `presentationType` (optional): Filter by type ID

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "presentations": [...],
    "pagination": {
      "total": 25,
      "page": 1,
      "pages": 3
    }
  }
}
```

### Get Presentation by ID
```http
GET /api/presentations/:id
Authorization: Bearer <token>
```

### Delete Presentation
```http
DELETE /api/presentations/:id
Authorization: Bearer <token>
```

### Get Statistics
```http
GET /api/presentations/stats
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "stats": {
      "total": 25,
      "byStatus": {
        "completed": 20,
        "failed": 3,
        "processing": 2
      }
    }
  }
}
```

---

## 📁 Library Endpoints

### Browse Library
```http
GET /api/library/browse
Authorization: Bearer <token>
```

**Query Parameters:**
- `path` (optional): Relative path to browse (e.g., "Feasibility Study/06_Market Overview")

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "currentPath": "Feasibility Study",
    "contents": [
      {
        "name": "01_Cover Page",
        "type": "directory",
        "size": 0,
        "modified": "2026-02-03T10:00:00.000Z",
        "path": "Feasibility Study/01_Cover Page"
      },
      {
        "name": "cover.pptx",
        "type": "file",
        "size": 524288,
        "modified": "2026-02-03T10:00:00.000Z",
        "path": "Feasibility Study/01_Cover Page/cover.pptx"
      }
    ]
  }
}
```

### Upload File (Admin Only)
```http
POST /api/library/upload
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: PPTX file
- `presentationType`: "Feasibility Study"
- `section`: "06_Market Overview"
- `filename`: "riyadh + residential + apartments + luxury.pptx"

### Create Folder (Admin Only)
```http
POST /api/library/folder
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "folderPath": "Feasibility Study/12_New Section"
}
```

### Rename File/Folder (Admin Only)
```http
PUT /api/library/rename
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "oldPath": "Feasibility Study/old_name.pptx",
  "newName": "new_name.pptx"
}
```

### Delete File (Admin Only)
```http
DELETE /api/library/file
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "filePath": "Feasibility Study/06_Market Overview/file.pptx"
}
```

### Get Library Statistics
```http
GET /api/library/stats
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "stats": {
      "totalFiles": 45,
      "totalFolders": 22,
      "totalSize": 52428800,
      "presentationTypes": [
        {
          "name": "Feasibility Study",
          "files": 30,
          "folders": 11,
          "size": 31457280
        }
      ]
    }
  }
}
```

---

## 📜 History Endpoints

### Get History
```http
GET /api/history
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (optional)
- `presentationType` (optional)
- `startDate` (optional): ISO date
- `endDate` (optional): ISO date

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "history": [...],
    "pagination": {
      "total": 50,
      "page": 1,
      "pages": 3,
      "limit": 20
    }
  }
}
```

### Get History Item
```http
GET /api/history/:id
Authorization: Bearer <token>
```

### Delete History Item
```http
DELETE /api/history/:id
Authorization: Bearer <token>
```

### Clear All History
```http
DELETE /api/history
Authorization: Bearer <token>
```

### Get History Statistics
```http
GET /api/history/stats
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "stats": {
      "total": 50,
      "byStatus": {
        "completed": 45,
        "failed": 5
      },
      "byType": [
        { "type": "Feasibility Study", "count": 30 },
        { "type": "Credential Report", "count": 20 }
      ],
      "recentActivity": [
        { "date": "2026-02-03", "count": 5 },
        { "date": "2026-02-02", "count": 8 }
      ]
    }
  }
}
```

---

## 🔑 API Key Endpoints

### Create API Key
```http
POST /api/api-keys
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "External Integration",
  "description": "For automated presentation generation",
  "permissions": ["generate", "read"],
  "expiresAt": "2027-02-03T10:00:00.000Z"  // optional
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "API key created successfully",
  "data": {
    "apiKey": {
      "id": "65abc...",
      "key": "spk_abc123def456...",
      "name": "External Integration",
      "description": "...",
      "permissions": ["generate", "read"],
      "expiresAt": "2027-02-03T10:00:00.000Z",
      "createdAt": "2026-02-03T10:00:00.000Z"
    }
  },
  "warning": "Please save this API key securely. You will not be able to see it again."
}
```

### Get All API Keys
```http
GET /api/api-keys
Authorization: Bearer <token>
```

**Response:** List of API keys (without the actual key value)

### Get API Key by ID
```http
GET /api/api-keys/:id
Authorization: Bearer <token>
```

### Update API Key
```http
PUT /api/api-keys/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "permissions": ["generate", "read", "write"],
  "isActive": true
}
```

### Delete API Key
```http
DELETE /api/api-keys/:id
Authorization: Bearer <token>
```

### Revoke API Key
```http
POST /api/api-keys/:id/revoke
Authorization: Bearer <token>
```

### Get API Key Statistics
```http
GET /api/api-keys/:id/stats
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "stats": {
      "usageCount": 142,
      "lastUsedAt": "2026-02-03T09:30:00.000Z",
      "isActive": true,
      "isExpired": false,
      "createdAt": "2026-01-01T10:00:00.000Z"
    }
  }
}
```

---

## ❌ Error Responses

### 400 Bad Request
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

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Not authorized to access this route. Please provide a valid token."
}
```

### 403 Forbidden
```json
{
  "status": "error",
  "message": "User role 'user' is not authorized to access this route"
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "status": "error",
  "message": "Too many requests from this IP, please try again later."
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Internal Server Error"
}
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- All IDs are MongoDB ObjectIds
- File sizes are in bytes
- Pagination starts at page 1
- Default limits apply if not specified
- Admin-only endpoints require `role: "admin"`
