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
