// Mock data for FELIX Report Generation App

export interface CriteriaOption {
  id: string;
  label: string;
}

export interface Criteria {
  id: string;
  name: string;
  type: "single" | "multiple";
  options: CriteriaOption[];
}

export interface Section {
  id: string;
  name: string;
  order: number;
  varying: boolean;
  varyingCriteria?: string[]; // criteria IDs that drive variation
  folderPath?: string;
  filename?: string | null;
}

export interface PresentationType {
  id: string;
  name: string;
  enablePlots: boolean;
  criteria: Criteria[];
  sections: Section[];
}

export interface PlotData {
  id: number;
  criteria: Record<string, string | string[]>;
}

export interface LibraryFolder {
  id: string;
  name: string;
  path: string;
  children?: LibraryFolder[];
  files?: LibraryFile[];
}

export interface LibraryFile {
  id: string;
  name: string;
  size: string;
  modified: string;
}

export const CITIES = ["Riyadh", "Jeddah", "Dubai", "Abu Dhabi", "Doha", "Muscat", "Manama"];

export const ASSET_TYPES: Record<string, { categories: Record<string, string[]> }> = {
  Residential: {
    categories: {
      Apartments: ["Luxury", "High-end", "Upper-mid end", "Mid-end", "Low-end", "Affordable", "Social"],
      Townhouses: ["Luxury", "High-end", "Upper-mid end", "Mid-end", "Low-end", "Affordable"],
      Villas: ["Luxury", "High-end", "Upper-mid end", "Mid-end", "Low-end", "Affordable"],
    },
  },
  Office: {
    categories: {
      "Grade A": ["High-Rise", "Business Park", "Mid-Rise", "Low-rise"],
      "Grade B": ["High-Rise", "Business Park", "Mid-Rise", "Low-rise"],
    },
  },
  Retail: {
    categories: {
      "Grade A": ["Regional Mall", "Small Regional Mall", "Community Mall", "Neighbourhood Center", "Convenience Center"],
      "Grade B": ["Regional Mall", "Small Regional Mall", "Community Mall", "Neighbourhood Center", "Convenience Center"],
    },
  },
  Hotel: {
    categories: {
      "3-star": ["Business", "City", "Beach resort", "Leisure"],
      "4-star": ["Business", "City", "Beach resort", "Leisure"],
      "5-star": ["Business", "City", "Beach resort", "Leisure"],
      Hostel: ["Hostel"],
    },
  },
};

export const feasibilityStudy: PresentationType = {
  id: "feasibility-study",
  name: "Feasibility Study",
  enablePlots: true,
  criteria: [
    {
      id: "city",
      name: "City",
      type: "single",
      options: CITIES.map((c) => ({ id: c.toLowerCase(), label: c })),
    },
    {
      id: "asset-type",
      name: "Asset Type",
      type: "single",
      options: Object.keys(ASSET_TYPES).map((a) => ({ id: a.toLowerCase().replace(/\s/g, "-"), label: a })),
    },
    {
      id: "category",
      name: "Category",
      type: "single",
      options: [], // Dynamic based on asset type
    },
    {
      id: "specifications",
      name: "Specifications",
      type: "single",
      options: [], // Dynamic based on category
    },
  ],
  sections: [
    { id: "cover", name: "Cover Page", order: 1, varying: false },
    { id: "toc", name: "Table of Contents", order: 2, varying: false },
    { id: "project-bg", name: "Project Background", order: 3, varying: false },
    { id: "exec-summary", name: "Executive Summary", order: 4, varying: false },
    { id: "site-assessment", name: "Site Assessment", order: 5, varying: false },
    { id: "market-overview", name: "Market Overview", order: 6, varying: true, varyingCriteria: ["city", "asset-type", "category", "specifications"] },
    { id: "dev-rec-1", name: "Development Recommendations Part 1", order: 7, varying: false },
    { id: "dev-rec-2", name: "Development Recommendations Part 2", order: 8, varying: true, varyingCriteria: ["city", "asset-type", "category", "specifications"] },
    { id: "dev-rec-3", name: "Development Recommendations Part 3", order: 9, varying: false },
    { id: "financial", name: "Financial & Investment Analysis", order: 10, varying: false },
    { id: "disclaimer", name: "Disclaimer", order: 11, varying: false },
  ],
};

export const presentationTypes: PresentationType[] = [feasibilityStudy];

export const libraryStructure: LibraryFolder = {
  id: "root",
  name: "Library",
  path: "/Library",
  children: [
    {
      id: "fs",
      name: "Feasibility Study",
      path: "/Library/Feasibility Study",
      children: [
        {
          id: "fs-1",
          name: "01_Cover Page",
          path: "/Library/Feasibility Study/01_Cover Page",
          files: [{ id: "f1", name: "cover.pptx", size: "2.4 MB", modified: "2026-01-15" }],
        },
        {
          id: "fs-2",
          name: "02_Table of Contents",
          path: "/Library/Feasibility Study/02_Table of Contents",
          files: [{ id: "f2", name: "toc.pptx", size: "1.1 MB", modified: "2026-01-15" }],
        },
        {
          id: "fs-3",
          name: "03_Project Background",
          path: "/Library/Feasibility Study/03_Project Background",
          files: [{ id: "f3", name: "project_background.pptx", size: "3.2 MB", modified: "2026-01-14" }],
        },
        {
          id: "fs-4",
          name: "04_Executive Summary",
          path: "/Library/Feasibility Study/04_Executive Summary",
          files: [{ id: "f4", name: "executive_summary.pptx", size: "1.8 MB", modified: "2026-01-14" }],
        },
        {
          id: "fs-5",
          name: "05_Site Assessment",
          path: "/Library/Feasibility Study/05_Site Assessment",
          files: [{ id: "f5", name: "site_assessment.pptx", size: "4.1 MB", modified: "2026-01-13" }],
        },
        {
          id: "fs-6",
          name: "06_Market Overview",
          path: "/Library/Feasibility Study/06_Market Overview",
          files: [
            { id: "f6a", name: "riyadh + residential + apartments + luxury.pptx", size: "5.2 MB", modified: "2026-01-12" },
            { id: "f6b", name: "riyadh + residential + apartments + high-end.pptx", size: "4.8 MB", modified: "2026-01-12" },
            { id: "f6c", name: "dubai + office + grade a + high rise.pptx", size: "5.0 MB", modified: "2026-01-11" },
            { id: "f6d", name: "jeddah + residential + townhouses + luxury.pptx", size: "4.5 MB", modified: "2026-01-11" },
          ],
        },
        {
          id: "fs-7",
          name: "07_Development Recommendations Part 1",
          path: "/Library/Feasibility Study/07_Development Recommendations Part 1",
          files: [{ id: "f7", name: "devrec_part1.pptx", size: "2.9 MB", modified: "2026-01-10" }],
        },
        {
          id: "fs-8",
          name: "08_Development Recommendations Part 2",
          path: "/Library/Feasibility Study/08_Development Recommendations Part 2",
          files: [
            { id: "f8a", name: "riyadh + residential + apartments + luxury.pptx", size: "3.1 MB", modified: "2026-01-10" },
            { id: "f8b", name: "dubai + office + grade a + high rise.pptx", size: "3.3 MB", modified: "2026-01-10" },
          ],
        },
        {
          id: "fs-9",
          name: "09_Development Recommendations Part 3",
          path: "/Library/Feasibility Study/09_Development Recommendations Part 3",
          files: [{ id: "f9", name: "devrec_part3.pptx", size: "2.2 MB", modified: "2026-01-09" }],
        },
        {
          id: "fs-10",
          name: "10_Financial & Investment Analysis",
          path: "/Library/Feasibility Study/10_Financial & Investment Analysis",
          files: [{ id: "f10", name: "financial_investment_analysis.pptx", size: "6.1 MB", modified: "2026-01-08" }],
        },
        {
          id: "fs-11",
          name: "11_Disclaimer",
          path: "/Library/Feasibility Study/11_Disclaimer",
          files: [{ id: "f11", name: "disclaimer.pptx", size: "0.8 MB", modified: "2026-01-08" }],
        },
      ],
    },
  ],
};
