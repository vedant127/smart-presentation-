# 🚀 QUICK START GUIDE - Testing the Fixed Backend

## Prerequisites
✅ MongoDB running
✅ Node.js installed
✅ API keys configured in `.env`

---

## Step 1: Start Backend Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
Server running on port 5000
MongoDB connected
```

---

## Step 2: Seed Database (If Not Already Done)

```bash
cd backend
npm run seed
```

**This creates:**
- Presentation types (Feasibility Study, etc.)
- Sections with varying/fixed configuration
- Criteria definitions

---

## Step 3: Test API Endpoints

### A. Get Presentation Types
```bash
GET http://localhost:5000/api/presentation-types
```

**Expected:** List of presentation types with sections and criteria

### B. Get Form Schema (Dynamic Options)
```bash
GET http://localhost:5000/api/presentation-types/:id/form-schema
```

**Expected:** Dynamic dropdown options for City, Asset Type, Category, Specifications

### C. Generate Presentation (Single Plot)
```bash
POST http://localhost:5000/api/presentations/generate
Content-Type: application/json

{
  "presentationTypeId": "PASTE_ID_FROM_STEP_A",
  "formData": {
    "projectName": "Luxury Residences Dubai Marina",
    "clientName": "ABC Developments Ltd",
    "city": "Dubai",
    "assetType": "Residential",
    "category": "Apartments",
    "specifications": "Luxury"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "fileName": "Luxury_Residences_Dubai_Marina_xxx.pptx",
    "filePath": "/path/to/generated/file.pptx",
    "fileSize": 1234567,
    "slideCount": 11
  }
}
```

### D. Generate Presentation (Multiple Plots)
```bash
POST http://localhost:5000/api/presentations/generate
Content-Type: application/json

{
  "presentationTypeId": "PASTE_ID_FROM_STEP_A",
  "formData": {
    "projectName": "Multi-City Development Portfolio",
    "clientName": "XYZ Group"
  },
  "plots": [
    {
      "city": "Dubai",
      "assetType": "Residential",
      "category": "Apartments",
      "specifications": "Luxury"
    },
    {
      "city": "Riyadh",
      "assetType": "Office",
      "category": "Grade A",
      "specifications": "Business Park"
    },
    {
      "city": "Abu Dhabi",
      "assetType": "Retail",
      "category": "Mall",
      "specifications": "Premium"
    }
  ]
}
```

**Expected:** Presentation with varying sections for each unique city/asset combination

---

## Step 4: Download and Verify Output

1. **Find generated file:**
   - Location: `backend/generated/`
   - Filename: `{ProjectName}_{UUID}.pptx`

2. **Open in PowerPoint:**
   - Check slide dimensions (should be 20" × 11.2")
   - Verify placeholders are replaced
   - Check layouts are preserved
   - Verify images/charts are present

3. **Verify Content:**
   - Cover slide has project name, client name, date
   - Market Overview slides are different for each city/asset
   - No "Test Bangaloree Commercial" hardcoded text
   - Professional layouts maintained

---

## Step 5: Test AI Content Generation

### Scenario: Missing Library File

1. **Rename a library file** to simulate missing content:
   ```bash
   cd backend/Library/Feasibility Study/06_Market Overview
   ren "Dubai + Residential.pptx" "Dubai + Residential.pptx.backup"
   ```

2. **Generate presentation** with Dubai + Residential

3. **Check console logs:**
   ```
   🤖 Attempting AI content generation for missing section...
   ✅ AI Content Generated (1234 chars)
   ```

4. **Restore file:**
   ```bash
   ren "Dubai + Residential.pptx.backup" "Dubai + Residential.pptx"
   ```

---

## Step 6: Test Frontend Integration

1. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open browser:**
   ```
   http://localhost:5173/
   ```

3. **Navigate to Generate page** (`/`)

4. **Fill form:**
   - Select presentation type
   - Enter project details
   - Add plots (if multi-plot enabled)
   - Click "Generate Presentation"

5. **Verify:**
   - Form submits successfully
   - Loading state shows
   - Download starts automatically
   - File opens in PowerPoint

---

## 🔍 What to Look For

### ✅ Success Indicators
- [ ] Slides have correct dimensions (20" × 11.2")
- [ ] Real content from library files (not blank)
- [ ] Placeholders replaced with actual data
- [ ] Different slides for different city/asset combos
- [ ] Layouts and themes preserved
- [ ] Images and charts present
- [ ] No duplicate slides (deduplication working)
- [ ] Professional branding maintained
- [ ] AI content generated when library files missing

### ❌ Failure Indicators
- Blank slides with just filenames
- "Test Bangaloree Commercial" hardcoded text
- Wrong dimensions (10" × 5.6")
- Plain white slides (layouts not preserved)
- Missing images/charts
- Duplicate slides
- Placeholders not replaced

---

## 🐛 Debugging

### Check Console Logs
Backend console shows detailed assembly process:
```
🏭 ENHANCED SYSTEM: Starting Assembly for "Feasibility Study"
   Plots (Contexts): 3
   📋 Global Data: {...}

🎵 Processing Section 1: "01_Cover Page" (Fixed)
   ▶️ Adding Static Slide: "cover.pptx"

🎵 Processing Section 6: "06_Market Overview" (Varying)
   ▶️ Adding Varying Slide: "Dubai + Residential.pptx" (matched: Dubai+Residential)
   ⏭️ Skipping duplicate: "Dubai + Residential.pptx"
   ▶️ Adding Varying Slide: "Riyadh + Office.pptx" (matched: Riyadh+Office)

✅ ENHANCED SYSTEM: Assembly Complete!
   Output: Luxury_Residences_Dubai_Marina_xxx.pptx
   Total Slides: 11
```

### Check Library Structure
```bash
cd backend/Library
tree /F
```

Should show:
```
Library/
├── RootTemplate.pptx
└── Feasibility Study/
    ├── 01_Cover Page/
    │   └── cover.pptx
    ├── 02_Table of Contents/
    │   └── toc.pptx
    ├── 06_Market Overview/
    │   ├── Dubai + Residential.pptx
    │   ├── Riyadh + Office.pptx
    │   └── ...
    └── ...
```

### Check API Keys
```bash
cd backend
cat .env | findstr API_KEY
```

Should show:
```
GEMINI_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-proj-...
```

---

## 📊 Performance Benchmarks

### Expected Generation Times
- **Single plot, all library files exist:** 2-3 seconds
- **Multiple plots (3), all library files exist:** 5-8 seconds
- **With 1 AI-generated section:** +3-5 seconds
- **With 3 AI-generated sections:** +10-15 seconds

### File Sizes
- **Typical output:** 500KB - 2MB
- **With many images/charts:** 2MB - 10MB

---

## 🎯 Next Actions

1. **Test all scenarios** above
2. **Verify output quality** in PowerPoint
3. **Check console logs** for errors
4. **Report any issues** with specific details
5. **Iterate and improve** library files

---

## 🎉 Success Criteria

**The backend is working perfectly when:**
- ✅ All 12 problems are fixed
- ✅ AI integration works (Gemini → OpenAI → Placeholder)
- ✅ Placeholders are replaced dynamically
- ✅ Slides look professional (like reference PPTs)
- ✅ No hardcoded text appears
- ✅ Layouts and themes are preserved
- ✅ Deduplication works correctly

**You should now have a production-ready presentation generation system!** 🚀
