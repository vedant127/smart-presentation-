# Smart Presentation Machine - Backend API

A powerful backend API for dynamically generating PowerPoint presentations based on user-defined criteria and templates.

## 🚀 Features

1. **User Authentication** - Secure JWT-based authentication with role-based access
2. **User History** - Track all generated presentations with download statistics
3. **PowerPoint Merging** - Intelligent PPTX file merging based on criteria
4. **API Key Management** - Manage external service API keys (Gemini, OpenAI, etc.)
5. **File Browser** - Navigate and manage Library folder structure
6. **File Upload** - Upload PPTX files using Multer
7. **Dynamic Presentation Generation** - Generate presentations based on form data
8. **Download Handling** - Secure presentation download with tracking
9. **Multiple Topics Support** - Handle multiple plots with automatic deduplication

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   └── multer.js             # File upload configuration
│   ├── models/
│   │   ├── User.js               # User model
│   │   ├── ApiKey.js             # API key model
│   │   ├── PresentationType.js   # Presentation type model
│   │   └── PresentationHistory.js # History model
│   ├── controllers/
│   │   ├── authController.js     # Authentication logic
│   │   ├── apiKeyController.js   # API key management
│   │   ├── presentationTypeController.js
│   │   ├── presentationController.js
│   │   ├── fileController.js     # File browser
│   │   └── uploadController.js   # File uploads
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── apiKeyRoutes.js
│   │   ├── presentationTypeRoutes.js
│   │   ├── presentationRoutes.js
│   │   ├── fileRoutes.js
│   │   └── uploadRoutes.js
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication
│   │   ├── errorHandler.js       # Error handling
│   │   └── validation.js         # Request validation
│   ├── services/
│   │   └── presentationService.js # PPTX merging logic
│   ├── utils/
│   │   └── response.js           # Response helpers
│   ├── seed.js                   # Database seeder
│   └── server.js                 # Entry point
├── Library/                      # PPTX template storage
├── generated/                    # Generated presentations
├── uploads/                      # Temporary uploads
├── .env                          # Environment variables
├── .gitignore
└── package.json
```

## 🛠️ Installation

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (running locally or remote)
- npm or yarn

### Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   
   Update `.env` file with your settings:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/smart-presentation-machine
   JWT_SECRET=your-secret-key
   ```

3. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running
   mongod
   ```

4. **Seed Database**
   ```bash
   npm run seed
   ```
   
   This creates:
   - Admin user (admin@smartpresentation.com / admin123)
   - Feasibility Study presentation type

5. **Start Server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| GET | `/api/auth/profile` | Get user profile | Private |
| PUT | `/api/auth/profile` | Update profile | Private |

### API Keys

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/api-keys` | Create API key | Private |
| GET | `/api/api-keys` | Get all API keys | Private |
| GET | `/api/api-keys/:id` | Get single API key | Private |
| PUT | `/api/api-keys/:id` | Update API key | Private |
| DELETE | `/api/api-keys/:id` | Delete API key | Private |
| POST | `/api/api-keys/:id/validate` | Validate API key | Private |

### Presentation Types

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/presentation-types` | Get all types | Public |
| GET | `/api/presentation-types/:id` | Get single type | Public |
| GET | `/api/presentation-types/:id/form-schema` | Get form schema | Public |
| POST | `/api/presentation-types` | Create type | Admin |
| PUT | `/api/presentation-types/:id` | Update type | Admin |
| DELETE | `/api/presentation-types/:id` | Delete type | Admin |

### Presentations

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/presentations/generate` | Generate presentation | Private |
| GET | `/api/presentations/history` | Get history | Private |
| GET | `/api/presentations/history/:id` | Get single history | Private |
| GET | `/api/presentations/download/:id` | Download presentation | Private |
| DELETE | `/api/presentations/history/:id` | Delete from history | Private |

### File Browser

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/files/browse` | Browse Library | Private |
| GET | `/api/files/download` | Download file | Private |
| POST | `/api/files/folder` | Create folder | Admin |
| DELETE | `/api/files` | Delete item | Admin |

### File Upload

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/upload` | Upload single file | Admin |
| POST | `/api/upload/multiple` | Upload multiple files | Admin |

## 🧪 Testing with Postman

### 1. Register User

```http
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### 2. Login

```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
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

### 3. Generate Presentation

```http
POST http://localhost:5000/api/presentations/generate
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "presentationTypeId": "PRESENTATION_TYPE_ID",
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
    }
  ]
}
```

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📚 Library Folder Structure

```
Library/
└── Feasibility Study/
    ├── 01_Cover Page/
    │   └── cover.pptx
    ├── 02_Table of Contents/
    │   └── toc.pptx
    ├── 06_Market Overview/
    │   ├── riyadh + residential + apartments + luxury.pptx
    │   ├── dubai + office + grade a + high rise.pptx
    │   └── ...
    └── ...
```

## 🎯 Key Concepts

### Varying vs Unvarying Sections

- **Unvarying**: Same content for all presentations (e.g., Cover Page)
- **Varying**: Content changes based on criteria (e.g., Market Overview)

### Plot Deduplication

When multiple plots have the same criteria values, only one section is included in the final presentation.

### File Naming Convention

Varying section files must be named using the pattern:
```
<criterion1> + <criterion2> + <criterion3>.pptx
```

Example: `riyadh + residential + apartments + luxury.pptx`

## 🐛 Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

Common status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/smart-presentation-machine |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRES_IN | Token expiration | 7d |
| CORS_ORIGIN | CORS allowed origin | * |

## 📝 License

ISC

## 👨‍💻 Author

Smart Presentation Machine Team
