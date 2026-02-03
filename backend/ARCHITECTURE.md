# 🏗️ Backend Architecture

## System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
│                    (Frontend Application)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP Requests
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS SERVER                             │
│                    (Port 5000 - CORS)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    MIDDLEWARE LAYER                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • CORS                                                  │  │
│  │  • JSON Parser                                           │  │
│  │  • Authentication (JWT)                                  │  │
│  │  • Validation (express-validator)                        │  │
│  │  • Error Handler                                         │  │
│  │  • Multer (File Upload)                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      ROUTES LAYER                        │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  /api/auth              → authRoutes                     │  │
│  │  /api/api-keys          → apiKeyRoutes                   │  │
│  │  /api/presentation-types → presentationTypeRoutes        │  │
│  │  /api/presentations     → presentationRoutes             │  │
│  │  /api/files             → fileRoutes                     │  │
│  │  /api/upload            → uploadRoutes                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   CONTROLLERS LAYER                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • authController        → User auth logic               │  │
│  │  • apiKeyController      → API key management            │  │
│  │  • presentationTypeController → Type management          │  │
│  │  • presentationController → Generation logic             │  │
│  │  • fileController        → File browsing                 │  │
│  │  • uploadController      → File uploads                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    SERVICES LAYER                        │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • presentationService  → PPTX merging logic             │  │
│  │  • File key generation                                   │  │
│  │  • Deduplication logic                                   │  │
│  │  • Section processing                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     MODELS LAYER                         │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • User                 → User schema                    │  │
│  │  • ApiKey               → API key schema                 │  │
│  │  • PresentationType     → Presentation type schema       │  │
│  │  • PresentationHistory  → History schema                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │         MONGODB DATABASE                │
        ├─────────────────────────────────────────┤
        │  Collections:                           │
        │  • users                                │
        │  • apikeys                              │
        │  • presentationtypes                    │
        │  • presentationhistories                │
        └─────────────────────────────────────────┘

        ┌─────────────────────────────────────────┐
        │         FILE SYSTEM                     │
        ├─────────────────────────────────────────┤
        │  • Library/          (Templates)        │
        │  • generated/        (Output)           │
        │  • uploads/          (Temp)             │
        └─────────────────────────────────────────┘
```

## Request Flow Example: Generate Presentation

```
1. CLIENT sends POST /api/presentations/generate
   ↓
2. MIDDLEWARE validates JWT token
   ↓
3. MIDDLEWARE validates request body
   ↓
4. ROUTE forwards to presentationController.generate()
   ↓
5. CONTROLLER validates presentationTypeId
   ↓
6. CONTROLLER calls presentationService.generatePresentation()
   ↓
7. SERVICE processes sections (varying/unvarying)
   ↓
8. SERVICE builds file keys from criteria
   ↓
9. SERVICE finds PPTX files in Library/
   ↓
10. SERVICE merges PPTX files
    ↓
11. SERVICE saves to generated/
    ↓
12. CONTROLLER saves to PresentationHistory
    ↓
13. CONTROLLER returns success response
    ↓
14. CLIENT receives presentation ID and download URL
```

## Data Models Relationships

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ 1:N
       │
       ├──────────────────────────────────┐
       │                                  │
       ▼                                  ▼
┌─────────────┐                  ┌──────────────────┐
│   ApiKey    │                  │ PresentationHistory│
└─────────────┘                  └────────┬──────────┘
                                          │
                                          │ N:1
                                          │
                                          ▼
                                 ┌──────────────────┐
                                 │ PresentationType │
                                 └──────────────────┘
```

## Authentication Flow

```
┌────────────┐
│   Client   │
└─────┬──────┘
      │
      │ 1. POST /api/auth/register or /api/auth/login
      ▼
┌─────────────────┐
│ authController  │
└────────┬────────┘
         │
         │ 2. Hash password (bcrypt)
         │ 3. Save to database
         │ 4. Generate JWT token
         ▼
┌─────────────────┐
│   JWT Token     │
└────────┬────────┘
         │
         │ 5. Return to client
         ▼
┌─────────────────┐
│  Client stores  │
│  token in       │
│  localStorage   │
└─────────────────┘

For subsequent requests:
┌────────────┐
│   Client   │
└─────┬──────┘
      │
      │ Authorization: Bearer <token>
      ▼
┌─────────────────┐
│  authenticate   │
│   middleware    │
└────────┬────────┘
         │
         │ 1. Extract token
         │ 2. Verify JWT
         │ 3. Get user from DB
         │ 4. Attach to req.user
         ▼
┌─────────────────┐
│   Controller    │
│  (has access to │
│   req.user)     │
└─────────────────┘
```

## File Upload Flow

```
┌────────────┐
│   Client   │
└─────┬──────┘
      │
      │ 1. POST /api/upload (multipart/form-data)
      ▼
┌─────────────────┐
│ Multer          │
│ Middleware      │
└────────┬────────┘
         │
         │ 2. Validate file type (.pptx)
         │ 3. Check file size (max 50MB)
         │ 4. Save to uploads/
         ▼
┌─────────────────┐
│uploadController │
└────────┬────────┘
         │
         │ 5. Move to Library/<path>
         │ 6. Delete from uploads/
         ▼
┌─────────────────┐
│   Library/      │
│   <type>/       │
│   <section>/    │
│   file.pptx     │
└─────────────────┘
```

## Presentation Generation Flow

```
┌────────────────────────────────────────────────────────┐
│              PRESENTATION GENERATION                   │
└────────────────────────────────────────────────────────┘

Input:
  • presentationTypeId
  • formData
  • plots[] (if enabled)

Step 1: Load PresentationType from DB
  ↓
Step 2: Loop through sections (ordered)
  ↓
Step 3: For each section:
  │
  ├─ If UNVARYING:
  │   └─ Find single PPTX in section folder
  │       └─ Add to merge list
  │
  └─ If VARYING:
      │
      ├─ If plots enabled:
      │   └─ For each plot:
      │       ├─ Build key from criteria
      │       ├─ Check for duplicates
      │       └─ Find matching PPTX
      │           └─ Add to merge list
      │
      └─ If no plots:
          └─ Build key from formData
              └─ Find matching PPTX
                  └─ Add to merge list
  ↓
Step 4: Merge all PPTX files
  ↓
Step 5: Save to generated/
  ↓
Step 6: Save to PresentationHistory
  ↓
Step 7: Return download URL
```

## Error Handling Flow

```
┌────────────┐
│   Error    │
│  Occurs    │
└─────┬──────┘
      │
      ▼
┌─────────────────────────────────────┐
│     Error Handler Middleware        │
└─────────────────────────────────────┘
      │
      ├─ ValidationError → 400
      ├─ Duplicate Key → 409
      ├─ CastError → 400
      ├─ JWT Error → 401
      ├─ Multer Error → 400
      └─ Default → 500
      │
      ▼
┌─────────────────────────────────────┐
│  Standardized JSON Response         │
│  {                                  │
│    success: false,                  │
│    message: "...",                  │
│    errors: [...]                    │
│  }                                  │
└─────────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────┐
│                  SECURITY LAYERS                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. CORS                                            │
│     └─ Only allow specified origins                │
│                                                     │
│  2. JWT Authentication                              │
│     └─ Verify token on protected routes            │
│                                                     │
│  3. Password Hashing                                │
│     └─ bcrypt with salt rounds                     │
│                                                     │
│  4. Input Validation                                │
│     └─ express-validator on all inputs             │
│                                                     │
│  5. File Validation                                 │
│     └─ Type, size, and path checks                 │
│                                                     │
│  6. Role-Based Access                               │
│     └─ Admin-only routes protected                 │
│                                                     │
│  7. Path Traversal Prevention                       │
│     └─ Validate file paths                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```
