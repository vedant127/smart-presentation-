# 🎯 Smart Presentation Machine - Complete Backend Implementation

## 📋 Project Overview

**Smart Presentation Machine** is a sophisticated backend system that dynamically generates PowerPoint presentations by intelligently merging PPTX files from a library based on user-defined criteria. Think of it as a "presentation assembly line" that builds custom presentations on demand.

## 🎓 How It Works (Explained Simply)

### The Big Picture

Imagine you have a **Library** (like a real library with books) that contains PowerPoint slides organized in folders. When someone wants a presentation, they fill out a form saying what they need. The system then:

1. **Reads the form** to understand what the user wants
2. **Finds the right slides** from the Library
3. **Combines them** in the correct order
4. **Delivers a complete presentation** ready to download

### Real-World Example

**Scenario:** You're a real estate company creating feasibility studies for different projects.

**The Problem:** Each project is different (different city, different building type), but the presentation structure is always the same (cover page, market analysis, recommendations, etc.).

**The Solution:** 
- Store template slides for each variation in the Library
- When a user requests a presentation for "Riyadh + Residential + Luxury Apartments", the system automatically picks the right slides
- If they need 3 plots with different characteristics, it creates one presentation with all of them (without duplicates!)

## 🏗️ Architecture

### Database Models

#### 1. **User Model**
Stores user accounts with authentication.
```javascript
{
  name: "John Doe",
  email: "john@example.com",
  password: "hashed_password",
  role: "user" or "admin"
}
```

#### 2. **PresentationType Model**
Defines the "template" for a presentation type.
```javascript
{
  name: "Feasibility Study",
  criteria: [
    { name: "city", options: ["Riyadh", "Dubai"] },
    { name: "assetType", options: ["Residential", "Office"] }
  ],
  sections: [
    { name: "Cover Page", isVarying: false },
    { name: "Market Overview", isVarying: true, varyingCriteria: ["city", "assetType"] }
  ]
}
```

#### 3. **Presentation Model**
Records of generated presentations.
```javascript
{
  user: "user_id",
  presentationType: "type_id",
  plots: [
    { plotNumber: 1, criteriaAnswers: { city: "Riyadh", assetType: "Residential" } }
  ],
  status: "completed",
  downloadUrl: "/api/presentations/download/file.pptx"
}
```

#### 4. **ApiKey Model**
For external software integration.
```javascript
{
  key: "spk_abc123...",
  user: "user_id",
  permissions: ["generate", "read"],
  usageCount: 42
}
```

### Key Concepts

#### **Varying vs Unvarying Sections**

**Unvarying Section:**
- Same for all presentations
- Example: Cover Page, Disclaimer
- Library has **1 file** per section

**Varying Section:**
- Changes based on criteria
- Example: Market Overview (different for each city/asset type)
- Library has **multiple files** (one per combination)

#### **The Key Generation System**

When a user fills the form with:
```javascript
{
  city: "Riyadh",
  assetType: "Residential",
  category: "Apartments",
  specifications: "Luxury"
}
```

The system generates a **key**:
```
"riyadh + residential + apartments + luxury"
```

Then looks for a file named:
```
riyadh + residential + apartments + luxury.pptx
```

#### **Deduplication Magic**

If you have 3 plots:
- Plot 1: Riyadh + Residential
- Plot 2: Dubai + Office
- Plot 3: Riyadh + Residential (duplicate!)

The system is smart enough to include the "Riyadh + Residential" slides only **once**, not twice!

#### **Multiple Choice Criteria**

Some criteria allow multiple selections:
```javascript
{
  teamMembers: ["John Doe", "Jane Smith", "Bob Johnson"]
}
```

The system fetches **3 separate files**:
- `john doe.pptx`
- `jane smith.pptx`
- `bob johnson.pptx`

## 📂 Complete File Structure

```
backend/
├── src/
│   ├── controllers/              # Handle HTTP requests
│   │   ├── authController.js     # Login, register, profile
│   │   ├── presentationController.js  # Generate, download presentations
│   │   ├── presentationTypeController.js  # Manage presentation types
│   │   ├── libraryController.js  # Browse, upload files
│   │   ├── historyController.js  # User history tracking
│   │   └── apiKeyController.js   # API key management
│   │
│   ├── models/                   # Database schemas
│   │   ├── User.js
│   │   ├── Presentation.js
│   │   ├── PresentationType.js
│   │   └── ApiKey.js
│   │
│   ├── routes/                   # API endpoints
│   │   ├── authRoutes.js         # /api/auth/*
│   │   ├── presentationRoutes.js # /api/presentations/*
│   │   ├── presentationTypeRoutes.js  # /api/presentation-types/*
│   │   ├── libraryRoutes.js      # /api/library/*
│   │   ├── historyRoutes.js      # /api/history/*
│   │   └── apiKeyRoutes.js       # /api/api-keys/*
│   │
│   ├── middleware/               # Request processing
│   │   ├── auth.js               # JWT & API key authentication
│   │   ├── errorHandler.js       # Global error handling
│   │   ├── rateLimiter.js        # Prevent abuse
│   │   ├── validation.js         # Input validation (Joi)
│   │   └── upload.js             # File upload (Multer)
│   │
│   ├── services/                 # Business logic
│   │   └── presentationService.js  # Core generation logic
│   │
│   ├── server.js                 # Application entry point
│   └── seed.js                   # Database initialization
│
├── Library/                      # PPTX file storage
│   ├── Feasibility Study/
│   │   ├── 01_Cover Page/
│   │   │   └── cover.pptx
│   │   ├── 06_Market Overview/   # Varying section
│   │   │   ├── riyadh + residential + apartments + luxury.pptx
│   │   │   ├── dubai + office + grade a + high rise.pptx
│   │   │   └── ...
│   │   └── ...
│   └── Credential Report/
│       └── ...
│
├── uploads/                      # Temporary uploads
├── generated/                    # Generated presentations
├── .env                          # Environment variables
├── .env.example                  # Template
├── .gitignore
├── package.json
├── README.md                     # Main documentation
└── API_TESTING.md               # Testing guide
```

## 🔌 API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /register` - Create account
- `POST /login` - Get JWT token
- `GET /me` - Get current user
- `PUT /profile` - Update profile
- `PUT /change-password` - Change password

### Presentation Types (`/api/presentation-types`)
- `GET /` - List all types
- `GET /:id` - Get specific type
- `GET /:id/form-schema` - Get form structure
- `POST /` - Create type (admin)
- `PUT /:id` - Update type (admin)
- `DELETE /:id` - Delete type (admin)

### Presentations (`/api/presentations`)
- `POST /generate` - Generate presentation (JWT or API key)
- `GET /download/:filename` - Download file
- `GET /` - List user's presentations
- `GET /:id` - Get specific presentation
- `DELETE /:id` - Delete presentation
- `GET /stats` - Get statistics

### Library (`/api/library`)
- `GET /browse` - Browse folders
- `GET /stats` - Get statistics
- `POST /upload` - Upload PPTX (admin)
- `POST /folder` - Create folder (admin)
- `PUT /rename` - Rename file/folder (admin)
- `DELETE /file` - Delete file (admin)

### History (`/api/history`)
- `GET /` - Get user history
- `GET /stats` - Get statistics
- `GET /:id` - Get specific item
- `DELETE /:id` - Delete item
- `DELETE /` - Clear all history

### API Keys (`/api/api-keys`)
- `POST /` - Create API key
- `GET /` - List user's keys
- `GET /:id` - Get specific key
- `GET /:id/stats` - Get usage stats
- `PUT /:id` - Update key
- `DELETE /:id` - Delete key
- `POST /:id/revoke` - Deactivate key

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
# .env file is already created with development settings
# Make sure MongoDB is running
```

### 3. Seed Database
```bash
npm run seed
```

Creates:
- Admin: `admin@smartpresentation.com` / `admin123`
- Demo: `demo@smartpresentation.com` / `demo123`
- Feasibility Study template
- Credential Report template

### 4. Start Server
```bash
npm run dev
```

Server runs on: http://localhost:5000

### 5. Test API
```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartpresentation.com","password":"admin123"}'
```

## 🔐 Security Features

1. **Password Hashing** - bcryptjs with salt
2. **JWT Authentication** - Secure token-based auth
3. **API Key System** - For external integration
4. **Rate Limiting** - Prevent abuse
5. **Input Validation** - Joi schemas
6. **CORS Protection** - Configurable origins
7. **Helmet** - Security headers
8. **Role-Based Access** - User vs Admin

## 📊 Business Logic Flow

### Presentation Generation Process

```
1. User Request
   ↓
2. Validate Input (Joi)
   ↓
3. Authenticate (JWT or API Key)
   ↓
4. Load Presentation Type Config
   ↓
5. Process Each Section:
   - Unvarying: Fetch single file
   - Varying: Generate keys → Find files → Deduplicate
   ↓
6. Merge All PPTX Files
   ↓
7. Save to Database
   ↓
8. Return Download URL
```

### Key Generation Algorithm

```javascript
// Input
criteriaAnswers = {
  city: "Riyadh",
  assetType: "Residential",
  category: "Apartments",
  specifications: "Luxury"
}

// Process
1. Extract values: ["Riyadh", "Residential", "Apartments", "Luxury"]
2. Convert to lowercase: ["riyadh", "residential", "apartments", "luxury"]
3. Join with " + ": "riyadh + residential + apartments + luxury"

// Output
key = "riyadh + residential + apartments + luxury"
filename = "riyadh + residential + apartments + luxury.pptx"
```

## 🎯 Integration Points

### Frontend Integration
```javascript
// Login
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { data } = await response.json();
const token = data.token;

// Generate Presentation
const response = await fetch('http://localhost:5000/api/presentations/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ presentationTypeId, plots })
});
```

### External AI Integration
```javascript
// Using API Key
const response = await fetch('http://localhost:5000/api/presentations/generate', {
  method: 'POST',
  headers: {
    'X-API-Key': 'spk_abc123...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ presentationTypeId, plots })
});
```

## 📦 NPM Packages Used

| Package | Purpose |
|---------|---------|
| express | Web framework |
| mongoose | MongoDB ODM |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT authentication |
| dotenv | Environment variables |
| cors | Cross-origin requests |
| multer | File uploads |
| joi | Input validation |
| pptxgenjs | PowerPoint generation |
| helmet | Security headers |
| express-rate-limit | Rate limiting |
| compression | Response compression |
| morgan | HTTP logging |
| archiver | File archiving |
| fs-extra | File system utilities |
| uuid | Unique IDs |

## 🎓 Key Takeaways

1. **Modular Architecture** - Clean separation of concerns
2. **Production-Ready** - Error handling, validation, security
3. **Scalable** - Easy to add new presentation types
4. **Flexible** - Supports both web and API integration
5. **Well-Documented** - Comprehensive README and testing guide

## 📝 Next Steps

1. ✅ **Upload PPTX Files** - Add your template slides to Library
2. ✅ **Test Generation** - Try generating presentations
3. ✅ **Build Frontend** - Connect React.js frontend
4. ✅ **Integrate AI** - Connect your AI system
5. ✅ **Deploy** - Move to production

## 🤝 Support

All code is production-ready and follows best practices. Each file has clear comments explaining the logic. Refer to:
- `README.md` - Main documentation
- `API_TESTING.md` - Testing guide
- Code comments - Inline documentation

---

**🎉 Your backend is complete and ready to use!**
