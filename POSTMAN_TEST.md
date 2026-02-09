# POSTMAN TEST - PRESENTATION DOWNLOAD API

## 📍 **URL:**
```
POST http://localhost:5000/api/presentations/create-download
```

## 📋 **Headers:**
```
Content-Type: application/json
```

## 📦 **Body (raw JSON):**

### Test 1: Mumbai Residential (Simple Test)
```json
{
  "presentationTypeId": "6984e7141d1b6926a8ee5729",
  "formData": {
    "title": "Mumbai Residential Project",
    "subtitle": "Market Analysis Report",
    "city": "Mumbai",
    "projectType": "Residential",
    "requirements": ["Financial Analysis"]
  },
  "plots": []
}
```

### Test 2: Bangalore Commercial
```json
{
  "presentationTypeId": "6984e7141d1b6926a8ee5729",
  "formData": {
    "title": "Bangalore Commercial Project",
    "subtitle": "Tech Park Development",
    "city": "Bangalore",
    "projectType": "Commercial",
    "requirements": ["Market Analysis", "Financial Analysis"]
  },
  "plots": []
}
```

### Test 3: Delhi Mixed-Use
```json
{
  "presentationTypeId": "6984e7141d1b6926a8ee5729",
  "formData": {
    "title": "Delhi Mixed Use Development",
    "subtitle": "Comprehensive Analysis",
    "city": "Delhi",
    "projectType": "Mixed-Use",
    "requirements": ["Market Analysis"]
  },
  "plots": []
}
```

## ✅ **Expected Response:**

- **Status Code**: 200 OK
- **Response Type**: File Download (application/vnd.openxmlformats-officedocument.presentationml.presentation)
- **File Name**: `Mumbai_Residential_Project_[timestamp].pptx`

## 🔍 **How to Test in Postman:**

1. **Create New Request**
   - Method: POST
   - URL: `http://localhost:5000/api/presentations/create-download`

2. **Set Headers**
   - Key: `Content-Type`
   - Value: `application/json`

3. **Set Body**
   - Select: `raw`
   - Type: `JSON`
   - Paste one of the JSON payloads above

4. **Send Request**
   - Click "Send"
   - If successful, Postman will prompt you to save the PPTX file
   - Save it and open to verify city-specific slides

## 🐛 **Current Error:**

The error you're seeing is because the slide library references slide numbers that don't exist in the actual PPTX files. I'm fixing this now by updating the slide library to use only slide #1 from each file (which always exists).

## 📊 **Check Server Logs:**

After sending the request, check your backend terminal for detailed logs showing:
- Which slides were selected
- Which city-specific slides are being merged
- Any errors during the merge process
