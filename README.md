# 🎯 Smart Presentation Machine

> **Intelligent PowerPoint Generation System** - Dynamically create professional presentations based on user-defined criteria and templates.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-4.18+-blue.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

## 📋 Overview

Smart Presentation Machine is a powerful backend API that enables dynamic PowerPoint presentation generation. It intelligently merges PPTX templates based on user-defined criteria, supporting complex scenarios like feasibility studies with multiple plots and varying sections.

### 🎥 How It Works

1. **Admin creates presentation types** (e.g., Feasibility Study, Credential Report)
2. **Define criteria and sections** (varying/unvarying)
3. **Upload PPTX templates** to Library folder
4. **Users fill dynamic forms** based on presentation type
5. **System generates presentations** by intelligently merging templates
6. **Download and track** all generated presentations

---

## ✨ Key Features

### 🔐 1. User Authentication
- JWT-based authentication with bcrypt password hashing
- Role-based access control (Admin/User)
- Secure profile management

### 📊 2. User History
- Track all generated presentations
- Download statistics and analytics
- Pagination support for large datasets

### 📎 3. PowerPoint Merging
- Intelligent PPTX file merging
- Support for varying and unvarying sections
- Automatic deduplication for multiple plots
- File naming convention: `criterion1 + criterion2 + criterion3.pptx`

### 🔑 4. API Key Management
- Store and validate external service API keys
- Support for Gemini, OpenAI, Anthropic
- Usage tracking and statistics

### 📁 5. File Browser
- Navigate Library folder structure
- Create, delete, and manage folders
- Secure file operations with path validation

### 📤 6. File Upload (Multer)
- Upload PPTX files to Library
- File type and size validation (max 50MB)
- Single and multiple file upload support

### 🎨 7. Dynamic Presentation Generation
- Form-based presentation creation
- Support for single-choice and multiple-choice criteria
- Plot-based generation with deduplication

### ⬇️ 8. Download Handling
- Secure file downloads
- Download count tracking
- Last downloaded timestamp

### 🔄 9. Multiple Topics Support
- Handle multiple plots in single request
- Automatic deduplication of duplicate criteria
- Efficient section processing

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP Requests
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS SERVER (Port 5000)                 │
├─────────────────────────────────────────────────────────────────┤
│  Routes → Controllers → Services → Models → MongoDB             │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │         MongoDB Database               │
        │  • users                               │
        │  • apikeys                             │
        │  • presentationtypes                   │
        │  • presentationhistories               │
        └────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
smart-presentation-machine/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & Multer configuration
│   │   ├── models/          # MongoDB models (4)
│   │   ├── controllers/     # Business logic (6)
│   │   ├── routes/          # API routes (6)
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── services/        # PowerPoint merging service
│   │   ├── utils/           # Helper functions
│   │   ├── seed.js          # Database seeder
│   │   └── server.js        # Entry point
│   ├── Library/             # PPTX template storage
│   ├── generated/           # Generated presentations
│   ├── uploads/             # Temporary uploads
│   ├── README.md            # Backend documentation
│   ├── QUICK_START.md       # Setup guide
│   ├── TESTING_GUIDE.md     # Testing instructions
│   ├── ARCHITECTURE.md      # System architecture
│   └── postman_collection.json  # API testing
└── README.md                # This file
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MongoDB** 6.0+ ([Download](https://www.mongodb.com/try/download/community))
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/vedant127/smart-presentation-.git
   cd smart-presentation-
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   # Copy .env.example to .env
   cp .env.example .env
   
   # Update .env with your settings
   # MONGODB_URI=mongodb://localhost:27017/smart-presentation-machine
   # JWT_SECRET=your-secret-key
   ```

4. **Start MongoDB**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   ```

5. **Seed the database**
   ```bash
   npm run seed
   ```
   
   This creates:
   - Admin user: `admin@smartpresentation.com` / `admin123`
   - Feasibility Study presentation type

6. **Start the server**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

7. **Verify it's running**
   ```bash
   curl http://localhost:5000/health
   ```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| GET | `/api/auth/profile` | Get user profile | Private |
| PUT | `/api/auth/profile` | Update profile | Private |

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
| GET | `/api/presentations/download/:id` | Download | Private |

### API Keys
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/api-keys` | Create API key | Private |
| GET | `/api/api-keys` | Get all keys | Private |
| PUT | `/api/api-keys/:id` | Update key | Private |
| DELETE | `/api/api-keys/:id` | Delete key | Private |

### File Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/files/browse` | Browse Library | Private |
| POST | `/api/files/folder` | Create folder | Admin |
| POST | `/api/upload` | Upload PPTX | Admin |
| DELETE | `/api/files` | Delete item | Admin |

**Total: 30+ endpoints** | [Full API Documentation →](backend/README.md)

---

## 🧪 Testing

### Using Postman

1. Import `backend/postman_collection.json`
2. Set environment variables:
   - `baseUrl`: `http://localhost:5000`
   - `token`: (will be set after login)
3. Test endpoints in order

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartpresentation.com","password":"admin123"}'
```

**Generate Presentation:**
```bash
curl -X POST http://localhost:5000/api/presentations/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "presentationTypeId": "...",
    "plots": [{
      "plotNumber": 1,
      "criteria": {
        "City": "Riyadh",
        "Asset Type": "Residential",
        "Category": "Apartments",
        "Specifications": "Luxury"
      }
    }]
  }'
```

[Complete Testing Guide →](backend/TESTING_GUIDE.md)

---

## 📚 Library Folder Structure

```
Library/
└── Feasibility Study/
    ├── 01_Cover Page/
    │   └── cover.pptx
    ├── 02_Table of Contents/
    │   └── toc.pptx
    ├── 03_Project Background/
    │   └── project_background.pptx
    ├── 04_Executive Summary/
    │   └── executive_summary.pptx
    ├── 05_Site Assessment/
    │   └── site_assessment.pptx
    ├── 06_Market Overview/ (VARYING)
    │   ├── riyadh + residential + apartments + luxury.pptx
    │   ├── dubai + office + grade a + high rise.pptx
    │   └── ...
    ├── 07_Development Recommendations Part 1/
    │   └── devrec_part1.pptx
    ├── 08_Development Recommendations Part 2/ (VARYING)
    │   ├── riyadh + residential + apartments + luxury.pptx
    │   └── ...
    ├── 09_Development Recommendations Part 3/
    │   └── devrec_part3.pptx
    ├── 10_Financial & Investment Analysis/
    │   └── financial_investment_analysis.pptx
    └── 11_Disclaimer/
        └── disclaimer.pptx
```

### File Naming Convention

For **varying sections**, files must be named using criteria values:
```
<criterion1> + <criterion2> + <criterion3>.pptx
```

**Example:**
```
riyadh + residential + apartments + luxury.pptx
dubai + office + grade a + high rise.pptx
```

---

## 🎯 Use Cases

### 1. Feasibility Study Generation
- Multiple plots with different locations and asset types
- Automatic deduplication of duplicate criteria
- Varying sections based on plot characteristics

### 2. Credential Report
- Team member CVs based on project requirements
- Multiple-choice criteria for team selection
- Dynamic section inclusion

### 3. Custom Presentations
- Create your own presentation types
- Define custom criteria and sections
- Upload templates and generate

---

## 🔐 Security Features

- ✅ JWT authentication with secure token generation
- ✅ Password hashing using bcrypt (10 salt rounds)
- ✅ Role-based access control (Admin/User)
- ✅ Input validation on all endpoints
- ✅ Path traversal prevention for file operations
- ✅ File type and size validation
- ✅ CORS configuration
- ✅ Secure API key storage

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js 4.18
- **Database:** MongoDB 6.0+
- **ODM:** Mongoose 8.0
- **Authentication:** JWT + bcrypt
- **File Upload:** Multer
- **Validation:** express-validator

### Tools
- **API Testing:** Postman
- **Development:** Nodemon
- **Version Control:** Git

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [README.md](backend/README.md) | Complete backend documentation |
| [QUICK_START.md](backend/QUICK_START.md) | Step-by-step setup guide |
| [TESTING_GUIDE.md](backend/TESTING_GUIDE.md) | API testing instructions |
| [ARCHITECTURE.md](backend/ARCHITECTURE.md) | System architecture diagrams |
| [API_REFERENCE.md](backend/API_REFERENCE.md) | Detailed API reference |

---

## 🎓 Key Concepts

### Varying vs Unvarying Sections

- **Unvarying Sections:** Same content for all presentations (e.g., Cover Page, Disclaimer)
- **Varying Sections:** Content changes based on criteria (e.g., Market Overview, Development Recommendations)

### Plot Deduplication

When multiple plots have identical criteria values, the system includes the section only once in the final presentation.

**Example:**
```javascript
// Input: 3 plots
plots: [
  { City: "Riyadh", AssetType: "Residential" },
  { City: "Dubai", AssetType: "Office" },
  { City: "Riyadh", AssetType: "Residential" }  // Duplicate!
]

// Output: Only 2 unique sections included
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/smart-presentation-machine |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Token expiration time | 7d |
| `CORS_ORIGIN` | CORS allowed origin | * |
| `MAX_FILE_SIZE` | Max upload file size | 52428800 (50MB) |

---

## 🐛 Troubleshooting

### Server won't start
- Check if MongoDB is running
- Verify port 5000 is not in use
- Check `.env` configuration

### Database connection error
- Ensure MongoDB is running
- Verify `MONGODB_URI` in `.env`
- Check MongoDB service status

### File upload fails
- Check file type (.pptx only)
- Verify file size (max 50MB)
- Ensure destination folder exists

### Presentation generation fails
- Verify Library folder structure
- Check PPTX file naming convention
- Ensure templates exist for criteria

[More troubleshooting →](backend/TESTING_GUIDE.md#troubleshooting)

---

## 📊 Project Status

- ✅ Backend API: **Complete**
- ✅ Authentication: **Complete**
- ✅ File Management: **Complete**
- ✅ Presentation Generation: **Complete**
- ✅ Documentation: **Complete**
- 🚧 Frontend: **In Progress**
- 🚧 AI Integration: **Planned**

---

## 📄 License

This project is licensed under the ISC License.

---

## 👨‍💻 Author

**Smart Presentation Machine Team**

- GitHub: [@vedant127](https://github.com/vedant127)
- Repository: [smart-presentation-](https://github.com/vedant127/smart-presentation-)

---

## 🙏 Acknowledgments

- Built with ❤️ using Node.js and Express
- Powered by MongoDB
- Inspired by the need for dynamic presentation generation

---

## 📞 Support

For support, please:
1. Check the [documentation](backend/README.md)
2. Review the [testing guide](backend/TESTING_GUIDE.md)
3. Open an issue on GitHub

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with 💪 by the Smart Presentation Machine Team

</div>
