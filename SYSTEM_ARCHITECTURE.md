# 🏗️ SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SMART PRESENTATION MACHINE                       │
│                         Complete System Architecture                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ GeneratePage │  │ BuilderPage  │  │ LibraryPage  │                 │
│  │   (Wizard)   │  │   (Admin)    │  │  (Browser)   │                 │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
│         │                  │                  │                          │
│         └──────────────────┴──────────────────┘                          │
│                            │                                             │
│                    ┌───────▼────────┐                                   │
│                    │  React Router  │                                   │
│                    └───────┬────────┘                                   │
│                            │                                             │
│         ┌──────────────────┼──────────────────┐                        │
│         │                  │                  │                          │
│  ┌──────▼──────┐  ┌────────▼────────┐  ┌─────▼──────┐                 │
│  │  AppLayout  │  │ shadcn/ui (49)  │  │ React Query│                 │
│  │  (Sidebar)  │  │   Components    │  │   (State)  │                 │
│  └─────────────┘  └─────────────────┘  └────────────┘                 │
│                                                                          │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             │ HTTP/REST API
                             │
┌────────────────────────────▼─────────────────────────────────────────────┐
│                         BACKEND (Node.js/Express)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         API ROUTES                               │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  /api/presentation-types     │  Get types, form schemas         │   │
│  │  /api/presentations/generate │  Generate PPTX                   │   │
│  │  /api/templates              │  CRUD templates                  │   │
│  │  /api/library                │  Browse library files            │   │
│  └────────────────┬─────────────────────────────────────────────────┘   │
│                   │                                                      │
│  ┌────────────────▼─────────────────────────────────────────────────┐   │
│  │                        CONTROLLERS                               │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  presentationController  │  Handle generation requests          │   │
│  │  presentationTypeController │  Manage types & schemas          │   │
│  │  templateController      │  Template CRUD operations            │   │
│  └────────────────┬─────────────────────────────────────────────────┘   │
│                   │                                                      │
│  ┌────────────────▼─────────────────────────────────────────────────┐   │
│  │                         SERVICES                                 │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │  presentationService.js (ENHANCED)                       │   │   │
│  │  ├──────────────────────────────────────────────────────────┤   │   │
│  │  │  • assemblePresentation() - Main assembly function       │   │   │
│  │  │  • createEnhancedReplacer() - Placeholder replacement    │   │   │
│  │  │  • Uses pptx-automizer for slide copying                 │   │   │
│  │  │  • Handles varying/fixed sections                        │   │   │
│  │  │  • Deduplication logic                                   │   │   │
│  │  │  • Layout/theme preservation                             │   │   │
│  │  └────────────────┬─────────────────────────────────────────┘   │   │
│  │                   │                                              │   │
│  │  ┌────────────────▼─────────────────────────────────────────┐   │   │
│  │  │  aiContentGenerator.js (UNIFIED)                         │   │   │
│  │  ├──────────────────────────────────────────────────────────┤   │   │
│  │  │  • generateContent() - Main entry point                  │   │   │
│  │  │  • Fallback chain: Gemini → OpenAI → Placeholder        │   │   │
│  │  │  • generateSlideContent() - Section-specific content     │   │   │
│  │  └────────┬──────────────────────┬──────────────────────────┘   │   │
│  │           │                      │                              │   │
│  │  ┌────────▼────────┐  ┌─────────▼────────┐                     │   │
│  │  │ geminiService.js│  │ openaiService.js │                     │   │
│  │  ├─────────────────┤  ├──────────────────┤                     │   │
│  │  │ • Gemini Pro    │  │ • GPT-4          │                     │   │
│  │  │ • Market analysis│  │ • Market analysis│                     │   │
│  │  │ • Exec summary  │  │ • Exec summary   │                     │   │
│  │  │ • Financial     │  │ • Financial      │                     │   │
│  │  │ • Recommendations│  │ • Recommendations│                     │   │
│  │  └─────────────────┘  └──────────────────┘                     │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         UTILITIES                                │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  fileMatcher.js       │  Smart file matching algorithm          │   │
│  │  slideContentHelpers  │  Content generation helpers             │   │
│  │  chartGenerator       │  Chart creation utilities               │   │
│  │  inputValidator       │  Form data validation                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             │
┌────────────────────────────▼─────────────────────────────────────────────┐
│                         DATABASE (MongoDB)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │ PresentationType │  │     Section      │  │    Criteria      │     │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤     │
│  │ • name           │  │ • name           │  │ • name           │     │
│  │ • enablePlots    │  │ • order          │  │ • type           │     │
│  │ • criteria[]     │  │ • isVarying      │  │ • options[]      │     │
│  │ • sections[]     │  │ • varyingCriteria│  │                  │     │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘     │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │ LibraryItem      │  │ Template         │  │ User             │     │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤     │
│  │ • path           │  │ • city           │  │ • email          │     │
│  │ • name           │  │ • assetType      │  │ • password       │     │
│  │ • type           │  │ • slides[]       │  │ • role           │     │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                         LIBRARY FOLDER STRUCTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Library/                                                                │
│  ├── RootTemplate.pptx (20" × 11.2" dimensions)                         │
│  │                                                                       │
│  └── Feasibility Study/                                                 │
│      ├── 01_Cover Page/                                                 │
│      │   └── cover.pptx (with {{PROJECT_NAME}}, {{CLIENT_NAME}})       │
│      │                                                                   │
│      ├── 02_Table of Contents/                                          │
│      │   └── toc.pptx                                                   │
│      │                                                                   │
│      ├── 03_Project Background/                                         │
│      │   └── project_background.pptx                                    │
│      │                                                                   │
│      ├── 04_Executive Summary/                                          │
│      │   └── executive_summary.pptx                                     │
│      │                                                                   │
│      ├── 05_Site Assessment/                                            │
│      │   └── site_assessment.pptx                                       │
│      │                                                                   │
│      ├── 06_Market Overview/ (VARYING)                                  │
│      │   ├── Dubai + Residential.pptx                                   │
│      │   ├── Dubai + Office.pptx                                        │
│      │   ├── Riyadh + Residential.pptx                                  │
│      │   ├── Riyadh + Office.pptx                                       │
│      │   └── ...                                                        │
│      │                                                                   │
│      ├── 07_Development Recommendations Part 1/ (VARYING)               │
│      │   ├── Residential + Apartments + Luxury.pptx                     │
│      │   ├── Office + Grade A + Business Park.pptx                      │
│      │   └── ...                                                        │
│      │                                                                   │
│      ├── 08_Development Recommendations Part 2/ (VARYING)               │
│      │   └── ...                                                        │
│      │                                                                   │
│      ├── 09_Development Recommendations Part 3/ (VARYING)               │
│      │   └── ...                                                        │
│      │                                                                   │
│      ├── 10_Financial & Investment Analysis/ (VARYING)                  │
│      │   └── ...                                                        │
│      │                                                                   │
│      └── 11_Disclaimer/                                                 │
│          └── disclaimer.pptx                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. USER fills form in GeneratePage                                     │
│     ↓                                                                    │
│  2. Frontend sends POST /api/presentations/generate                     │
│     ↓                                                                    │
│  3. Backend controller receives request                                 │
│     ↓                                                                    │
│  4. presentationService.assemblePresentation() called                   │
│     ↓                                                                    │
│  5. Load RootTemplate.pptx (20" × 11.2")                                │
│     ↓                                                                    │
│  6. Iterate through sections:                                           │
│     │                                                                    │
│     ├─ FIXED SECTIONS:                                                  │
│     │  • Find file in section folder                                    │
│     │  • Load with automizer.load()                                     │
│     │  • Add with automizer.addSlide()                                  │
│     │  • Replace placeholders ({{PROJECT_NAME}}, etc.)                  │
│     │                                                                    │
│     └─ VARYING SECTIONS:                                                │
│        • For each unique plot combination:                              │
│        │  ├─ Build search tokens (City + Asset Type + Category)        │
│        │  ├─ Find best matching file (fileMatcher.js)                  │
│        │  ├─ Check deduplication (skip if already added)               │
│        │  ├─ Load with automizer.load()                                │
│        │  ├─ Add with automizer.addSlide()                             │
│        │  └─ Replace placeholders with plot-specific data              │
│        │                                                                 │
│        └─ If file not found:                                            │
│           ├─ Try Gemini AI content generation                           │
│           ├─ If fails, try OpenAI                                       │
│           └─ If fails, use placeholder content                          │
│     ↓                                                                    │
│  7. automizer.write() creates final PPTX                                │
│     ↓                                                                    │
│  8. Return file info to frontend                                        │
│     ↓                                                                    │
│  9. Frontend triggers download                                          │
│     ↓                                                                    │
│  10. USER opens professional PPTX in PowerPoint                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                         KEY TECHNOLOGIES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Frontend:                                                               │
│  • React 18 + TypeScript                                                │
│  • Vite (build tool)                                                    │
│  • React Router (routing)                                               │
│  • shadcn/ui (component library)                                        │
│  • Tailwind CSS (styling)                                               │
│  • React Hook Form + Zod (forms & validation)                           │
│  • React Query (state management)                                       │
│  • Sonner (toast notifications)                                         │
│                                                                          │
│  Backend:                                                                │
│  • Node.js + Express                                                    │
│  • MongoDB + Mongoose                                                   │
│  • pptx-automizer (slide assembly)                                      │
│  • @google/generative-ai (Gemini)                                       │
│  • openai (GPT-4)                                                       │
│  • fs-extra (file operations)                                           │
│  • uuid (unique IDs)                                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🎯 System Highlights

### 1. **Modular Architecture**
- Clear separation between frontend, backend, database
- Service-oriented design
- Reusable components and utilities

### 2. **Smart File Matching**
- Flexible token-based matching
- Partial match support
- Case-insensitive
- Handles missing files gracefully

### 3. **AI Integration**
- Automatic fallback chain
- Multiple providers (Gemini, OpenAI)
- Professional content generation
- Seamless integration

### 4. **Dynamic Configuration**
- Database-driven structure
- Admin panel for management
- No code changes needed
- Flexible and scalable

### 5. **Professional Output**
- Correct dimensions (20" × 11.2")
- Real slide content
- Dynamic placeholders
- Preserved layouts/themes
- Images and charts intact

---

**This architecture ensures a robust, scalable, and maintainable system!** 🚀
