# 🚀 Quick Start Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Windows (if installed as service)
net start MongoDB

# Or run manually
mongod
```

## Step 3: Seed the Database

```bash
npm run seed
```

This will create:
- ✅ Admin user: `admin@smartpresentation.com` / `admin123`
- ✅ Feasibility Study presentation type

## Step 4: Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

You should see:
```
✅ MongoDB Connected: localhost
🚀 Server started on port 5000
📍 Environment: development
🌐 Health check: http://localhost:5000/health
```

## Step 5: Test the API

### Option 1: Using Postman

1. Import `postman_collection.json` into Postman
2. Test the endpoints

### Option 2: Using cURL

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@smartpresentation.com\",\"password\":\"admin123\"}"
```

**Get Presentation Types:**
```bash
curl http://localhost:5000/api/presentation-types
```

## 📁 Library Folder Setup

Create the following folder structure in `Library/`:

```
Library/
└── Feasibility Study/
    ├── 01_Cover Page/
    ├── 02_Table of Contents/
    ├── 03_Project Background/
    ├── 04_Executive Summary/
    ├── 05_Site Assessment/
    ├── 06_Market Overview/
    ├── 07_Development Recommendations Part 1/
    ├── 08_Development Recommendations Part 2/
    ├── 09_Development Recommendations Part 3/
    ├── 10_Financial & Investment Analysis/
    └── 11_Disclaimer/
```

Then add your PPTX files to each folder.

## 🎯 Next Steps

1. **Upload PPTX Templates** - Use the upload API to add your presentation templates
2. **Create Users** - Register users via `/api/auth/register`
3. **Generate Presentations** - Use `/api/presentations/generate` to create presentations
4. **Build Frontend** - Connect your React frontend to these APIs

## ⚠️ Common Issues

### MongoDB Connection Error
- Make sure MongoDB is running
- Check `MONGODB_URI` in `.env`

### Port Already in Use
- Change `PORT` in `.env` to a different port

### File Upload Errors
- Ensure `uploads/` and `Library/` folders exist
- Check file size limits (max 50MB)

## 📚 Documentation

- Full API documentation: See `README.md`
- API Reference: See `API_REFERENCE.md`
- Postman Collection: `postman_collection.json`

## 🆘 Need Help?

Check the logs in the terminal for detailed error messages. All errors are logged with proper context.
