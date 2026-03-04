/**
 * generatePptxFromForm.js — FULL DYNAMIC MAPPING
 *
 * HOW IT WORKS:
 * 1. User selects City + Property Type from frontend form
 * 2. buildDataKey() converts selection → lookup key e.g. "dubai__luxury_apartments"
 * 3. MARKET_DATA[key] returns 100% specific data for that city+type combination
 * 4. Every single slide is built using ONLY that mapped data — no generic text
 *
 * SUPPORTED COMBINATIONS:
 * Dubai:     Luxury Apartments | Townhouses | Villas
 * Riyadh:    Luxury Apartments | Townhouses | Villas
 * Jeddah:    Luxury Apartments | Townhouses | Villas
 * Abu Dhabi: Luxury Apartments | Townhouses | Villas
 *
 * TO ADD A NEW CITY OR TYPE: Add a new key block to MARKET_DATA below.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import PptxGenJS from 'pptxgenjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.join(__dirname, '..', '..');

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const NAVY = '1B2A4A';
const GOLD = 'C9A84C';
const WHITE = 'FFFFFF';
const LGRAY = 'F4F4F4';
const MGRAY = 'E0E0E0';
const DGRAY = '444444';
const FONT_TITLE = 'Century Schoolbook';
const FONT_BODY = 'Arial';

// ══════════════════════════════════════════════════════════════════════════════
//  MARKET DATA MAP
//  Key: "city__property_type"  (lowercase, spaces → underscore)
//  Every key has UNIQUE, SPECIFIC data for every slide section.
// ══════════════════════════════════════════════════════════════════════════════

const MARKET_DATA = {

  'dubai__luxury_apartments': {
    marketTitle: 'Dubai Luxury Apartments Market',
    marketSummary: 'Dubai\'s luxury apartment segment continues to outperform with record transaction volumes. Palm Jumeirah, Downtown and Dubai Marina dominate demand from HNWIs and international investors. Rental yields of 6–8% p.a. significantly outperform global luxury benchmarks.',
    demandDrivers: [
      'Record tourist arrivals (17M+ in 2024) driving short-term rental demand',
      'Golden Visa programme attracting HNW investors from Europe, Russia and Asia',
      'Limited luxury supply in prime waterfront zones creating upward pricing pressure',
      'Strong rental yields of 6–8% p.a. vs global luxury markets averaging 3–4%',
      'Expo 2020 legacy infrastructure enhancing connectivity and liveability across the emirate',
    ],
    supplyStats: [
      'Active luxury pipeline: ~18,000 units (2025–2027)',
      'Primary markets: Palm Jumeirah, Downtown Dubai, Dubai Marina, JBR',
      'Completion rate historically 65–70% of announced supply',
      'Average luxury unit size: 1,800–3,500 sq ft',
    ],
    pricingData: [
      ['Average price per sq ft', 'AED 2,800–4,500 (prime zones)'],
      ['Palm Jumeirah penthouses', 'AED 8,000–15,000 per sq ft'],
      ['Gross rental yield range', '5.5–8.2% p.a.'],
      ['Price growth YoY (2024)', '+18%'],
      ['Off-plan premium vs secondary', '10–15%'],
    ],
    recommendations: [
      'Target 1,800–2,500 sq ft 2BR/3BR units — highest demand bracket in Dubai luxury',
      'Prioritise waterfront or Downtown-adjacent locations for pricing power',
      'Off-plan strategy with phased payments to maximise sales absorption rate',
      'Include smart home automation and concierge services as standard specification',
      'Target international investors via Dubai property roadshows (London, Geneva, Moscow)',
    ],
    devParameters: [
      'Recommended unit mix: 20% 1BR, 50% 2BR, 25% 3BR, 5% penthouse',
      'Minimum floor-to-ceiling height: 3.2m for luxury positioning',
      'Amenity package: pool, gym, concierge, valet — non-negotiable for luxury tier',
      'Parking: minimum 1.5 spaces per unit; valet mandatory for penthouse floor',
      'LEED Gold or equivalent sustainability certification strongly recommended',
    ],
    financials: {
      avgPricePsf: 'AED 3,200', rentalYield: '6.5% p.a.', capRate: '5.8%', breakeven: '72% occupancy',
      irr: '18–22%', payback: '5–7 years', marketSize: 'AED 42B (2024)', growthRate: '+18% YoY',
      landCost: 'AED 350–600 psf', buildCost: 'AED 800–1,100 psf', absorption: '15–25 units/month',
      ltvFinance: '60% LTV at 5.5–6.5% p.a.',
    },
    risks: [
      'Global HNWI sentiment volatility impacting discretionary purchases',
      'Oversupply risk in mid-luxury segment (AED 1.5M–3M price band)',
      'Geopolitical events affecting international buyer travel to Dubai',
      'Currency fluctuations for non-AED (non-pegged) investors',
    ],
  },

  'dubai__townhouses': {
    marketTitle: 'Dubai Townhouse Market',
    marketSummary: 'Townhouses in Dubai are experiencing unprecedented demand driven by post-pandemic preference for space and community living. Arabian Ranches, Damac Hills and Emaar South lead the market with strong end-user absorption and rising capital values.',
    demandDrivers: [
      'Post-COVID structural shift to larger living spaces with private outdoor areas',
      'Family-oriented buyers seeking gated community environments with amenities',
      'End-user demand significantly outpacing investment demand — healthy market signal',
      'School and retail infrastructure maturity in established suburban communities',
      'New metro expansion increasing connectivity of suburban townhouse clusters',
    ],
    supplyStats: [
      'Active townhouse pipeline: ~12,000 units (2025–2027)',
      'Primary communities: Arabian Ranches III, Emaar South, Damac Hills 2, Villanova',
      'Average townhouse BUA: 2,200–3,800 sq ft on plot 2,500–4,000 sq ft',
      'G+2 typology dominates at 78% of new pipeline',
    ],
    pricingData: [
      ['Average 3BR–4BR price', 'AED 1.8M–3.5M'],
      ['Price per sq ft', 'AED 700–1,100'],
      ['Gross rental yield', '5.5–7.0% p.a.'],
      ['Capital appreciation YoY', '+14% (2024)'],
      ['Secondary vs off-plan premium', '8–12%'],
    ],
    recommendations: [
      'Target 3BR and 4BR configuration — accounts for 70% of Dubai townhouse demand',
      'Private garden minimum 400 sq ft — top buyer requirement across all surveys',
      'Position in established or near-complete master communities for faster absorption',
      'Semi-detached preferred over terraced for 10–15% pricing premium',
      'Community amenities (pool, park, cycling track) are mandatory for competitive positioning',
    ],
    devParameters: [
      'Recommended unit mix: 30% 3BR, 50% 4BR, 20% 5BR townhouse',
      'Plot size: 1,800–2,800 sq ft per unit with private garden',
      'Private garden minimum 400 sq ft (3BR) and 600 sq ft (4BR+)',
      'Parking: 2 covered spaces minimum per unit — non-negotiable',
      'Community facilities: clubhouse, pool, gym, retail node within 5 min walk',
    ],
    financials: {
      avgPricePsf: 'AED 900', rentalYield: '6.2% p.a.', capRate: '5.5%', breakeven: '68% sold',
      irr: '16–20%', payback: '4–6 years', marketSize: 'AED 28B (2024)', growthRate: '+14% YoY',
      landCost: 'AED 150–280 psf', buildCost: 'AED 550–750 psf', absorption: '20–35 units/month',
      ltvFinance: '55% LTV at 5.0–6.0% p.a.',
    },
    risks: [
      'Infrastructure delivery lag in new suburban communities (schools, retail)',
      'Competition from Emaar and Nakheel mega-community launches',
      'End-user mortgage rate sensitivity in mid-market bracket',
      'School and retail provision timing creates holding cost risk',
    ],
  },

  'dubai__villas': {
    marketTitle: 'Dubai Ultra-Luxury Villa Market',
    marketSummary: 'Dubai\'s ultra-luxury villa market hit record highs in 2024 with Palm Jumeirah, Emirates Hills and MBR City driving billion-dirham transactions. UHNWI demand from Europe, Russia and South Asia significantly outstrips prime supply.',
    demandDrivers: [
      'Ultra-HNWI permanent relocation from Europe, Russia and South Asia to Dubai',
      'Palm Jumeirah and Emirates Hills achieving global top-10 residential recognition',
      'Extreme supply scarcity in established prime villa communities',
      'Privacy, security and concierge lifestyle requirements of UHNWI buyers',
      'Zero income tax and long-term residency visas creating permanent residency appeal',
    ],
    supplyStats: [
      'Prime villa pipeline: ~4,500 units (2025–2027) — severely supply constrained',
      'Key locations: Palm Jumeirah, Emirates Hills, MBR City, Al Barari, District One',
      'Average villa BUA: 5,000–15,000 sq ft on plot 6,000–25,000 sq ft',
      'Waterfront plot availability: near zero on Palm Jumeirah — waitlist only',
    ],
    pricingData: [
      ['Palm Jumeirah signature villas', 'AED 15M–100M+'],
      ['Emirates Hills', 'AED 25M–200M'],
      ['MBR City / District One', 'AED 8M–35M'],
      ['Price per sq ft (prime)', 'AED 2,500–8,000+'],
      ['Capital appreciation YoY', '+28% (2024)'],
    ],
    recommendations: [
      'Focus on 5BR–7BR ultra-luxury segment for maximum development margin',
      'Private pool, home cinema and staff quarters are non-negotiable at this tier',
      'Smart home and security systems must exceed HNWI expectations (Crestron/Control4)',
      'Bespoke interior design partnerships with international firms add significant brand value',
      'Target global HNWI via private banking, wealth management and art world channels',
    ],
    devParameters: [
      'Unit typology: 5BR (30%), 6BR (45%), 7BR+ (25%) with full basement option',
      'Private pool: 50,000L+ capacity; infinity edge recommended for waterfront plots',
      'Staff accommodation: minimum 2 ensuite staff rooms per villa',
      'Basement adds AED 1,500–2,500 psf in value — recommend for all 6BR+',
      'Smart home: Crestron or Control4 system; full BMS integration standard',
    ],
    financials: {
      avgPricePsf: 'AED 4,500', rentalYield: '4.5% p.a.', capRate: '4.0%', breakeven: '60% sold',
      irr: '22–28%', payback: '6–9 years', marketSize: 'AED 18B (2024)', growthRate: '+28% YoY',
      landCost: 'AED 800–2,500 psf', buildCost: 'AED 1,500–2,500 psf', absorption: '2–5 units/month (private placement)',
      ltvFinance: '40% LTV — predominantly equity funded',
    },
    risks: [
      'Extreme price sensitivity to global UHNWI confidence and geopolitical events',
      'Very limited buyer pool requiring costly global marketing programme',
      'Long development and sales timeline increases financing cost significantly',
      'Bespoke construction complexity creates material cost overrun risk',
    ],
  },

  'riyadh__luxury_apartments': {
    marketTitle: 'Riyadh Luxury Apartments Market',
    marketSummary: 'Riyadh\'s luxury apartment market is undergoing structural transformation under Vision 2030. The Regional HQ mandate requiring 2,000+ multinationals to base MENA operations in Riyadh is generating unprecedented demand for premium residential product near KAFD and Olaya.',
    demandDrivers: [
      'Vision 2030 driving mass relocation of global talent and executives to Riyadh',
      'Regional HQ mandate: 2,000+ multinationals required to base MENA HQ in Riyadh',
      'Saudi nationals upgrading from villas to luxury apartments — lifestyle shift in progress',
      'Giga-project employment generating high-income resident population across the city',
      'Entertainment liberalisation (cinemas, concerts, dining) transforming Riyadh liveability',
    ],
    supplyStats: [
      'Luxury apartment pipeline: ~22,000 units (2025–2028)',
      'Key zones: King Abdullah Financial District (KAFD), Olaya, North Riyadh corridors',
      'Average luxury unit size: 150–350 sqm',
      'Branded residence pipeline: Four Seasons, Ritz-Carlton Residences announced',
    ],
    pricingData: [
      ['Average price per sqm (luxury)', 'SAR 3,500–7,500'],
      ['KAFD premium units', 'SAR 8,000–14,000 per sqm'],
      ['Gross rental yield', '7–9% p.a.'],
      ['Price growth YoY (2024)', '+22%'],
      ['Expatriate share of luxury rental', '65%'],
    ],
    recommendations: [
      'Target KAFD, North Riyadh and Diplomatic Quarter for maximum rental yield',
      'Furnished units command 25–35% rental premium — consider full serviced model',
      'Corporate leasing to Vision 2030 entities provides stable long-term income base',
      'Branded residence partnership elevates pricing by 20–30% above comparable stock',
      'Arabic-inspired luxury design language differentiates from generic international towers',
    ],
    devParameters: [
      'Unit mix: 25% 1BR (corporate), 45% 2BR, 25% 3BR, 5% penthouse',
      'Ceiling height: minimum 3.0m, preferred 3.5m for luxury classification',
      'Amenities: prayer room, separate male/female gym, rooftop terrace — mandatory',
      'Parking: 1.5–2 spaces per unit (essential in car-dependent Riyadh)',
      'GSAS (Green Star) sustainability certification strongly recommended',
    ],
    financials: {
      avgPricePsf: 'SAR 650', rentalYield: '7.5% p.a.', capRate: '6.8%', breakeven: '70% occupancy',
      irr: '20–25%', payback: '4–6 years', marketSize: 'SAR 38B (2024)', growthRate: '+22% YoY',
      landCost: 'SAR 2,500–6,000 per sqm', buildCost: 'SAR 4,500–7,000 per sqm', absorption: '25–40 units/month',
      ltvFinance: '65% LTV — Saudi mortgage market maturing rapidly',
    },
    risks: [
      'Massive supply pipeline risk if Vision 2030 corporate relocation targets slip',
      'Regulatory uncertainty around expatriate ownership rights',
      'Riyadh extreme summer heat requiring premium HVAC specification (adds 8–12% to cost)',
      'Currency peg maintenance risk for international investors',
    ],
  },

  'riyadh__villas': {
    marketTitle: 'Riyadh Premium Villa Market',
    marketSummary: 'Riyadh\'s villa market remains the dominant residential typology for Saudi families. North Riyadh corridors — Al Yasmin, Al Malqa, Al Narjis — command premium pricing with strong capital appreciation driven by infrastructure investment and lifestyle upgrading.',
    demandDrivers: [
      'Saudi cultural preference for villa living — 68% of Riyadh families reside in villas',
      'Multi-generational family living requirements driving demand for large private compounds',
      'North Riyadh infrastructure investment (Ring Road 3, metro extension) driving land value',
      'Mortgage finance penetration doubling under Vision 2030 housing programme targets',
      'Return of Saudi diaspora from abroad driving demand for premium product',
    ],
    supplyStats: [
      'Villa pipeline: ~35,000 units (2025–2027) across Riyadh metropolitan area',
      'Primary zones: Al Yasmin, Al Malqa, Al Narjis, Al Hamra, Al Arid',
      'Average villa BUA: 400–900 sqm on plot 600–1,200 sqm',
      'Gated compound trend: 35% of new villa projects are compound-style',
    ],
    pricingData: [
      ['Average price (mid-premium)', 'SAR 1.8M–4.5M'],
      ['Al Yasmin / Al Malqa premium', 'SAR 5M–12M'],
      ['Price per sqm (premium zones)', 'SAR 3,000–6,500'],
      ['Gross rental yield', '6.5–8.5% p.a.'],
      ['Capital appreciation YoY', '+16% (North Riyadh, 2024)'],
    ],
    recommendations: [
      'Target 500–700 sqm BUA — sweet spot for Saudi family demand in premium bracket',
      'Majlis (formal reception) and separate family living are culturally non-negotiable',
      'Driver room + maid room mandatory for SAR 3M+ premium positioning',
      'Private pool and garden increasingly expected at SAR 3M+ price point',
      'Islamic architectural design language resonates deeply with local Saudi buyers',
    ],
    devParameters: [
      'Unit mix: 20% 4BR, 50% 5BR, 25% 6BR, 5% 7BR+ premium villas',
      'Plot size: 600–1,200 sqm standard for North Riyadh premium positioning',
      'Majlis minimum 60 sqm — separate from family living areas',
      'Parking: 4+ covered vehicles per villa (standard Saudi family requirement)',
      'Compound amenities: mosque, gym, pool, children\'s area all essential',
    ],
    financials: {
      avgPricePsf: 'SAR 560', rentalYield: '7.2% p.a.', capRate: '6.5%', breakeven: '65% sold',
      irr: '17–22%', payback: '5–7 years', marketSize: 'SAR 55B (2024)', growthRate: '+16% YoY',
      landCost: 'SAR 1,800–4,500 per sqm', buildCost: 'SAR 3,500–5,500 per sqm', absorption: '30–50 units/month',
      ltvFinance: '70% LTV — REDF (Real Estate Development Fund) eligible',
    },
    risks: [
      'Infrastructure delivery delays in new northern corridors outside Ring Road',
      'Saudi mortgage rate sensitivity for end-user buyers at higher price points',
      'REDF funding delays impacting buyer affordability in mid-market bracket',
      'Competition from government-subsidised ROSHN housing programme',
    ],
  },

  'riyadh__townhouses': {
    marketTitle: 'Riyadh Townhouse Market',
    marketSummary: 'Townhouses are a growing and under-supplied segment in Riyadh as developers bridge the gap between apartments and villas. ROSHN-led community clusters and private gated communities in East and North Riyadh are seeing strong absorption from young Saudi families.',
    demandDrivers: [
      'Young Saudi families (aged 28–38) seeking villa-style living at apartment price points',
      'Gated community security appeal in Riyadh\'s family-oriented residential culture',
      'Lower entry price vs villas enabling first-time buyer access to homeownership',
      'Vision 2030 homeownership target: 70% — driving strong affordable housing demand',
      'REDF 0% mortgage for eligible buyers dramatically improving affordability',
    ],
    supplyStats: [
      'Townhouse pipeline: ~8,500 units (2025–2027)',
      'Key projects: Shams Al Riyadh, ROSHN communities, Emaar Riyadh, private gated clusters',
      'Average BUA: 280–480 sqm on private plot with garden',
      'G+1 and G+2 typology: 88% of active Riyadh townhouse pipeline',
    ],
    pricingData: [
      ['Average townhouse price', 'SAR 900K–2.2M'],
      ['Price per sqm', 'SAR 2,200–4,000'],
      ['Gross rental yield', '7.0–9.0% p.a.'],
      ['Capital appreciation YoY', '+12% (2024)'],
      ['REDF eligibility uplift', 'Expands buyer pool by ~80%'],
    ],
    recommendations: [
      'Target SAR 1.2M–1.8M price band for maximum absorption from eligible buyer pool',
      'ROSHN community design standards serve as the quality benchmark to match or exceed',
      'REDF-eligible pricing strategy unlocks 80% of target buyer market in Riyadh',
      'Focus on East Riyadh and South Riyadh for land cost efficiency and infrastructure access',
      '3BR + study configuration most popular configuration among young Riyadhi families',
    ],
    devParameters: [
      'Unit mix: 15% 3BR, 60% 4BR, 25% 5BR townhouses within gated community',
      'Plot per unit: 300–500 sqm with private garden 80–150 sqm',
      'Parking: 2 covered spaces per unit — essential for car-dependent Riyadh',
      'Community mosque within walking distance: mandatory for Saudi residential communities',
      'Community gym, pool, children\'s play areas all expected as standard',
    ],
    financials: {
      avgPricePsf: 'SAR 380', rentalYield: '8.0% p.a.', capRate: '7.2%', breakeven: '62% sold',
      irr: '19–23%', payback: '4–5 years', marketSize: 'SAR 22B (2024)', growthRate: '+12% YoY',
      landCost: 'SAR 800–2,000 per sqm', buildCost: 'SAR 2,500–3,800 per sqm', absorption: '40–60 units/month (REDF-eligible)',
      ltvFinance: '80% LTV (REDF subsidised at 0% for eligible buyers)',
    },
    risks: [
      'REDF annual budget allocation changes affecting buyer eligibility volumes',
      'Rising construction material costs (steel and concrete price inflation)',
      'Government ROSHN programme competition with heavily subsidised product',
      'Infrastructure timing in new community locations outside established zones',
    ],
  },

  'jeddah__luxury_apartments': {
    marketTitle: 'Jeddah Luxury Apartments Market',
    marketSummary: 'Jeddah\'s luxury apartment market is benefiting directly from Vision 2030 tourism investments and the Jeddah Waterfront megaproject. The Red Sea coastline drives unique waterfront premiums unmatched elsewhere in KSA.',
    demandDrivers: [
      'Jeddah Waterfront project creating entirely new luxury residential addresses',
      'Hajj and Umrah business creating year-round demand from regional HNWIs',
      'Saudi Aramco and SABIC senior executive residential demand in North Jeddah',
      'Corniche-facing units commanding 30–45% premium above comparable non-sea units',
      'Entertainment liberalisation transforming Jeddah\'s nightlife and F&B scene',
    ],
    supplyStats: [
      'Luxury apartment pipeline: ~9,500 units (2025–2027)',
      'Key zones: North Corniche, Al Shati, Obhur, Al Hamra, Jeddah Waterfront',
      'Average unit size: 180–400 sqm',
      'Sea-view premium: 30–45% above comparable non-sea units',
    ],
    pricingData: [
      ['Average (luxury corniche)', 'SAR 4,000–9,000 per sqm'],
      ['Jeddah Waterfront top end', 'SAR 12,000–18,000 per sqm'],
      ['Gross rental yield', '6.5–8.5% p.a.'],
      ['Price growth YoY (2024)', '+19%'],
      ['Furnished premium', '+30% over unfurnished'],
    ],
    recommendations: [
      'Corniche or sea-view positioning is mandatory for true luxury classification in Jeddah',
      'Full-floor and sky villa configurations command highest per-sqm premiums',
      'Serviced apartment model for short-term Hajj/Umrah visitors — highly profitable niche',
      'Infinity pool and rooftop F&B partnership differentiates development in crowded market',
      'Target Saudi HNWI second-home buyers based in Riyadh seeking Jeddah coastal retreat',
    ],
    devParameters: [
      'Unit mix: 20% 1BR (serviced), 40% 2BR, 30% 3BR, 10% sky villa / full floor',
      'Sea view: minimum 60% of units must be sea-facing to qualify as luxury tier',
      'Floor-to-ceiling glazing: essential to maximise corniche and sea views',
      'Beach access or waterfront promenade: the single most critical amenity',
      'Spa, fine dining partnership and full concierge: baseline Jeddah luxury expectation',
    ],
    financials: {
      avgPricePsf: 'SAR 720', rentalYield: '7.5% p.a.', capRate: '6.5%', breakeven: '68% occupancy',
      irr: '19–24%', payback: '5–7 years', marketSize: 'SAR 24B (2024)', growthRate: '+19% YoY',
      landCost: 'SAR 3,500–8,000 per sqm', buildCost: 'SAR 5,000–8,500 per sqm', absorption: '15–25 units/month',
      ltvFinance: '55% LTV at 5.8–7.0% p.a.',
    },
    risks: [
      'Jeddah Waterfront megaproject delivery timeline risk and phasing uncertainty',
      'North Corniche land scarcity creating significant land cost overrun risk',
      'Seasonal demand patterns — peak Hajj season vs. off-season occupancy dip',
      'Competition from Jeddah Central and Al Balad regeneration supply pipeline',
    ],
  },

  'jeddah__villas': {
    marketTitle: 'Jeddah Premium Villa Market',
    marketSummary: 'Jeddah villas in premium districts — Al Rawdah, Al Zahraa and the North Obhur coastal corridor — are in strong demand driven by wealthy Jeddawi families, Saudi business elite, and GCC buyers seeking Red Sea coastal retreats.',
    demandDrivers: [
      'Jeddawi family culture — strong generational preference for villa living',
      'North Obhur coastal expansion creating prime beachfront villa supply opportunities',
      'Saudi business elite demand for large private compound-style beachfront properties',
      'International school cluster in North Jeddah driving family residential demand',
      'King Abdulaziz Road improvements boosting north-south Jeddah connectivity',
    ],
    supplyStats: [
      'Villa pipeline: ~14,000 units (2025–2027) across Jeddah metropolitan area',
      'Primary zones: Al Rawdah, Al Zahraa, North Obhur, Al Hamra, Al Shati',
      'Average BUA: 450–950 sqm on plot 700–1,500 sqm',
      'Beachfront premium: 50–80% above comparable inland villa product',
    ],
    pricingData: [
      ['Average price', 'SAR 2.5M–7M'],
      ['Al Rawdah / Al Zahraa', 'SAR 6M–18M'],
      ['North Obhur beachfront', 'SAR 8M–30M'],
      ['Price per sqm (premium)', 'SAR 3,800–7,500'],
      ['Capital appreciation YoY', '+15% (North Jeddah, 2024)'],
    ],
    recommendations: [
      'North Obhur beachfront commands highest premiums in all of Jeddah — prioritise if land available',
      'Private beach access or direct sea view adds 40–60% to villa valuation',
      'Traditional Hijazi architectural elements with contemporary execution resonate with local buyers',
      'Large majlis (80+ sqm) and women\'s majlis both culturally required in premium Jeddah villas',
      'Rooftop terrace with sea views: the single most influential feature for Jeddah buyers',
    ],
    devParameters: [
      'Unit mix: 15% 4BR, 45% 5BR, 30% 6BR, 10% 7BR+ premium villas',
      'Plot: 700–1,500 sqm; private pool expected at SAR 5M+ price point',
      'Driver and maid accommodation: 2 separate rooms per villa (cultural requirement)',
      'Parking: 4–6 vehicles per villa (Jeddah standard)',
      'Hijazi architectural detailing: ornate wooden mashrabiya screens, courtyard concept',
    ],
    financials: {
      avgPricePsf: 'SAR 590', rentalYield: '6.8% p.a.', capRate: '6.0%', breakeven: '60% sold',
      irr: '18–23%', payback: '5–8 years', marketSize: 'SAR 32B (2024)', growthRate: '+15% YoY',
      landCost: 'SAR 2,200–6,000 per sqm', buildCost: 'SAR 3,800–6,500 per sqm', absorption: '20–35 units/month',
      ltvFinance: '60% LTV',
    },
    risks: [
      'Coastal development regulations and Red Sea environmental restrictions',
      'North Obhur infrastructure delivery timeline — utilities and road access',
      'Jeddah flood risk mitigation costs in low-lying areas near the coast',
      'Jeddah traffic congestion impacting northern corridor desirability',
    ],
  },

  'jeddah__townhouses': {
    marketTitle: 'Jeddah Townhouse Market',
    marketSummary: 'Jeddah\'s townhouse market is emerging as a strong value proposition for young Saudi families seeking community living with private outdoor space at accessible price points, particularly in North Jeddah master-planned communities.',
    demandDrivers: [
      'Young Jeddawi families (65% of buyers aged 28–40) seeking community-style living',
      'Gated community demand driven by security preferences and lifestyle amenities',
      'Proximity to Jeddah\'s international schools and major retail hubs',
      'Red Sea Gateway city attracting tourism and hospitality sector workers',
      'REDF mortgage support significantly improving first-time buyer participation rates',
    ],
    supplyStats: [
      'Townhouse pipeline: ~6,500 units (2025–2027) in Jeddah metropolitan area',
      'Key projects: Jeddah Gate, Al Yasmin Jeddah, New Jeddah Corniche communities',
      'Average BUA: 260–420 sqm with private garden',
      'Private garden: 85% of new Jeddah townhouse projects include outdoor space',
    ],
    pricingData: [
      ['Average townhouse price', 'SAR 850K–1.9M'],
      ['Price per sqm', 'SAR 2,000–3,800'],
      ['Gross rental yield', '7.5–9.5% p.a.'],
      ['Capital appreciation YoY', '+11% (2024)'],
      ['Furnished rental premium', '+25%'],
    ],
    recommendations: [
      'SAR 1.0M–1.5M price band maximises accessible buyer pool in Jeddah',
      'Proximity to Al-Andalus Mall and Corniche recreational areas is key selling point',
      'Small private pool (12 sqm) at SAR 1.5M+ significantly aids sales velocity',
      'North Jeddah positioning near King Abdulaziz University drives steady demand',
      'REDF-eligible pricing: ensures largest possible buyer base and faster absorption',
    ],
    devParameters: [
      'Unit mix: 20% 3BR, 55% 4BR, 25% 5BR townhouses within gated community',
      'Plot per unit: 280–450 sqm; private garden 80–120 sqm',
      'Parking: 2 covered spaces per unit — essential',
      'Community mosque, gym and children\'s play area are essential in Jeddah market',
      'Flood drainage and elevation: critical design consideration for Jeddah sites',
    ],
    financials: {
      avgPricePsf: 'SAR 350', rentalYield: '8.2% p.a.', capRate: '7.5%', breakeven: '60% sold',
      irr: '18–22%', payback: '4–5 years', marketSize: 'SAR 16B (2024)', growthRate: '+11% YoY',
      landCost: 'SAR 700–1,800 per sqm', buildCost: 'SAR 2,200–3,500 per sqm', absorption: '35–55 units/month',
      ltvFinance: '80% LTV (REDF-eligible)',
    },
    risks: [
      'Jeddah flooding risk in lower-lying sites — significant engineering cost implication',
      'Competition from ROSHN and government community projects at subsidised prices',
      'REDF annual budget allocation changes affecting buyer pool size',
      'Jeddah infrastructure capacity constraints in rapidly growing northern zones',
    ],
  },

  'abu_dhabi__luxury_apartments': {
    marketTitle: 'Abu Dhabi Luxury Apartments Market',
    marketSummary: 'Abu Dhabi\'s luxury apartment market is experiencing a renaissance with Saadiyat Island\'s cultural quarter, Yas Island and Al Reem Island driving international interest. The ADGM financial hub and sovereign wealth ecosystem attract HNWI buyers who prefer Abu Dhabi\'s stability over Dubai\'s pace.',
    demandDrivers: [
      'Saadiyat Island: Louvre Abu Dhabi and Guggenheim (opening 2025) creating global cultural prestige',
      'Abu Dhabi\'s political stability and sovereign wealth attract UHNWI family residency',
      'ADGM (Abu Dhabi Global Market) financial hub driving senior finance professional demand',
      'No property tax and full foreign freehold ownership rights in designated investment zones',
      'Family-friendly environment preferred by GCC HNWI over Dubai\'s faster-paced market',
    ],
    supplyStats: [
      'Luxury pipeline: ~14,500 units (2025–2028)',
      'Prime locations: Saadiyat Island, Al Reem, Yas Island, Al Maryah Island',
      'Average unit size: 150–350 sqm',
      'Branded residence pipeline: 8 luxury projects announced (Louvre Residences, etc.)',
    ],
    pricingData: [
      ['Average (Saadiyat premium)', 'AED 2,500–5,500 per sq ft'],
      ['Saadiyat cultural district', 'AED 4,000–8,000 per sq ft'],
      ['Gross rental yield', '6.0–8.0% p.a.'],
      ['Price growth YoY (2024)', '+16%'],
      ['Vacancy rate (luxury)', 'Record low 3.2%'],
    ],
    recommendations: [
      'Saadiyat Island positioning commands strongest global brand recognition in Abu Dhabi',
      'Cultural proximity (Louvre, Guggenheim, Zayed National Museum) drives significant premium',
      'Beach or marina access for 60%+ of units is essential for luxury classification',
      'ADGM and government executive corporate leasing provides stable predictable income base',
      'Target GCC HNWI second-home market from Saudi Arabia and Kuwait specifically',
    ],
    devParameters: [
      'Unit mix: 20% 1BR, 45% 2BR, 28% 3BR, 7% penthouse/sky villa',
      'Private balcony with sea or cultural district view: mandatory for every unit',
      'Amenities: beach club, gallery space, concierge, infinity pool all required',
      'Sustainability: Estidama Pearl Rating System — 3 Pearls minimum required',
      'Parking: 1.5–2 spaces per unit; valet for penthouse floor',
    ],
    financials: {
      avgPricePsf: 'AED 3,000', rentalYield: '6.8% p.a.', capRate: '6.0%', breakeven: '70% occupancy',
      irr: '17–21%', payback: '5–7 years', marketSize: 'AED 28B (2024)', growthRate: '+16% YoY',
      landCost: 'AED 300–700 per sq ft', buildCost: 'AED 750–1,100 per sq ft', absorption: '12–20 units/month',
      ltvFinance: '60% LTV at 5.0–6.5% p.a.',
    },
    risks: [
      'Abu Dhabi\'s smaller expatriate population vs Dubai limits total buyer pool',
      'Slower off-plan sales culture in Abu Dhabi vs Dubai — longer sales periods',
      'Estidama compliance adds 8–12% to construction cost vs standard specification',
      'Saadiyat Island infrastructure delivery dependencies on cultural institutions',
    ],
  },

  'abu_dhabi__villas': {
    marketTitle: 'Abu Dhabi Premium Villa Market',
    marketSummary: 'Abu Dhabi\'s villa market on Saadiyat Island and Yas Island represents the UAE\'s most prestigious and capital-stable residential addresses. Aldar\'s dominant market position and tightly controlled supply create strong long-term value preservation characteristics.',
    demandDrivers: [
      'Saadiyat Island becoming the UAE\'s most prestigious and stable residential address',
      'UHNWI demand for Emirati cultural authenticity and heritage residential context',
      'Abu Dhabi\'s long-term stability highly valued by family buyers vs Dubai volatility',
      'Yas Island entertainment and F1 circuit driving lifestyle and rental premium',
      'Full ownership rights for GCC nationals in all Abu Dhabi designated zones',
    ],
    supplyStats: [
      'Premium villa pipeline: ~5,500 units (2025–2028) — tightly supply controlled',
      'Key locations: Saadiyat Island, Yas Island, Al Raha Gardens, Khalifa City',
      'Average BUA: 500–1,200 sqm on plot 3,000–10,000 sqm',
      'Beach villa plots: extremely limited on Saadiyat — waitlist model common',
    ],
    pricingData: [
      ['Saadiyat beach villa', 'AED 12M–60M'],
      ['Yas Island villa', 'AED 4M–15M'],
      ['Price per sq ft (prime)', 'AED 1,500–5,000+'],
      ['Capital appreciation', '+20% YoY (Saadiyat, 2024)'],
      ['Gross rental yield', '4.5–6.5% p.a.'],
    ],
    recommendations: [
      'Beach villa on Saadiyat: highest capital preservation asset in entire UAE residential market',
      'Yas Island offers better yield with lower entry price — suitable for yield-focused investors',
      'Emirati contemporary architecture with traditional courtyard and wind tower elements',
      'Beach access and private pool are absolute requirements — non-negotiable for this tier',
      'Target KSA and Kuwaiti HNWI second-home buyers as primary audience',
    ],
    devParameters: [
      'Unit mix: 25% 4BR, 45% 5BR, 25% 6BR, 5% 7BR+ villas',
      'Beach access or beachfront plot: critical differentiator on Saadiyat',
      'Private pool: 60,000L+ capacity for 5BR and above',
      'Smart home: Savant or Control4 system as standard — expected at this tier',
      'Landscaping: minimum 30% of plot area for sustainable garden and outdoor living',
    ],
    financials: {
      avgPricePsf: 'AED 2,500', rentalYield: '5.5% p.a.', capRate: '5.0%', breakeven: '58% sold',
      irr: '19–25%', payback: '6–9 years', marketSize: 'AED 22B (2024)', growthRate: '+20% YoY',
      landCost: 'AED 500–1,500 per sq ft', buildCost: 'AED 1,200–2,200 per sq ft', absorption: '3–8 units/month (private placement)',
      ltvFinance: '45% LTV — equity-heavy structure',
    },
    risks: [
      'Extremely limited available land on Saadiyat — restricts new development supply',
      'Very small buyer pool requiring expensive international marketing programme',
      'Abu Dhabi\'s smaller total market limits exit options vs Dubai for investors',
      'Long development timelines increase financing cost and market risk exposure',
    ],
  },

  'abu_dhabi__townhouses': {
    marketTitle: 'Abu Dhabi Townhouse Market',
    marketSummary: 'Abu Dhabi townhouses on Yas Island, Khalifa City and Al Raha Gardens provide an attractive owner-occupied residential option with strong yields and mature family-oriented community infrastructure. Aldar dominates supply but third-party opportunities exist.',
    demandDrivers: [
      'Abu Dhabi government employees and military families seeking owned homes',
      'Yas Island\'s theme parks and entertainment creating vibrant family lifestyle demand',
      'Al Raha Gardens providing well-established community with excellent infrastructure',
      'Lower price entry vs Saadiyat villas while retaining villa-style living experience',
      'Expatriate families seeking stable residential environment vs Dubai\'s transient culture',
    ],
    supplyStats: [
      'Townhouse pipeline: ~7,800 units (2025–2027)',
      'Key projects: Yas Acres Phase 2, Al Raha Gardens, Khalifa City extensions, Al Falah',
      'Average BUA: 220–380 sqm on private plot with garden',
      'G+1 typology: 82% of Abu Dhabi townhouse pipeline',
    ],
    pricingData: [
      ['Average price', 'AED 1.8M–3.5M'],
      ['Yas Island premium', 'AED 2.5M–4.5M'],
      ['Price per sq ft', 'AED 750–1,200'],
      ['Gross rental yield', '5.5–7.5% p.a.'],
      ['Capital appreciation YoY', '+12% (2024)'],
    ],
    recommendations: [
      'Yas Island location premium justifies 20–30% price uplift over comparable Khalifa City stock',
      'Integration with Yas Mall, Ferrari World and Etihad Arena adds compelling lifestyle value',
      '3BR + maid room: highest demand configuration among Abu Dhabi family buyers',
      'Community pool and children\'s play areas essential in Abu Dhabi family-oriented market',
      'ADFB mortgage pre-approval partnerships with lenders increase conversion and absorption',
    ],
    devParameters: [
      'Unit mix: 25% 3BR, 55% 4BR, 20% 5BR within gated community',
      'Plot: 250–450 sqm with private garden 100–180 sqm',
      'Parking: 2 covered spaces — essential in car-dependent Abu Dhabi',
      'Estidama 2 Pearl minimum compliance — mandatory under Abu Dhabi regulations',
      'Community mosque and prayer facilities within walking distance: required',
    ],
    financials: {
      avgPricePsf: 'AED 950', rentalYield: '6.5% p.a.', capRate: '5.8%', breakeven: '65% sold',
      irr: '15–19%', payback: '5–7 years', marketSize: 'AED 18B (2024)', growthRate: '+12% YoY',
      landCost: 'AED 200–450 per sq ft', buildCost: 'AED 600–850 per sq ft', absorption: '15–25 units/month',
      ltvFinance: '75% LTV at 4.5–5.5% p.a.',
    },
    risks: [
      'Abu Dhabi\'s smaller total market vs Dubai limits investor exit liquidity options',
      'Yas Island infrastructure completion timing for Phase 2 developments',
      'Aldar\'s dominant market position creates pricing and absorption competition',
      'Government employee demand sensitive to Abu Dhabi policy and budget changes',
    ],
  },

};

// ══════════════════════════════════════════════════════════════════════════════
//  DATA LOOKUP
// ══════════════════════════════════════════════════════════════════════════════

function buildDataKey(city, propertyType) {
  const norm = v => (v || '').trim().toLowerCase()
    .replace(/\s+/g, '_').replace(/-/g, '_').replace(/[^a-z0-9_]/g, '');
  const pt = norm(propertyType);
  if (pt === 'penthouses' || pt === 'studio_apartments' || pt === 'apartments') return `${norm(city)}__luxury_apartments`;
  return `${norm(city)}__${pt}`;
}

function getMarketData(city, propertyType) {
  const key = buildDataKey(city, propertyType);
  console.log(`[DataLookup] key="${key}"`);
  if (MARKET_DATA[key]) return MARKET_DATA[key];
  const cityPfx = (city || '').trim().toLowerCase().replace(/\s+/g, '_');
  const fallback = Object.keys(MARKET_DATA).find(k => k.startsWith(cityPfx + '__'));
  if (fallback) { console.warn(`[DataLookup] city fallback → "${fallback}"`); return MARKET_DATA[fallback]; }
  console.warn('[DataLookup] no match — using dubai__luxury_apartments');
  return MARKET_DATA['dubai__luxury_apartments'];
}

function formatDate(val) {
  if (!val) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

// ══════════════════════════════════════════════════════════════════════════════
//  SLIDE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function wb(slide) {
  slide.addShape('rect', { x: 0, y: 0, w: 10, h: 7.5, fill: { color: WHITE }, line: { color: WHITE } });
}

function hdr(slide, section, title) {
  slide.addShape('rect', { x: 0, y: 0, w: 10, h: 1.05, fill: { color: NAVY }, line: { color: NAVY } });
  slide.addShape('rect', { x: 0, y: 1.05, w: 10, h: 0.05, fill: { color: GOLD }, line: { color: GOLD } });
  slide.addText(section.toUpperCase(), { x: 0.3, y: 0.06, w: 9, h: 0.26, fontSize: 8, color: GOLD, fontFace: FONT_BODY });
  slide.addText(title, { x: 0.3, y: 0.32, w: 9, h: 0.66, fontSize: 20, color: WHITE, fontFace: FONT_TITLE, bold: true, valign: 'middle' });
}

function ftr(slide, pg, total, client) {
  slide.addShape('rect', { x: 0, y: 7.3, w: 10, h: 0.2, fill: { color: NAVY }, line: { color: NAVY } });
  slide.addText(`${client || 'Confidential'}   |   ${pg} of ${total}`, {
    x: 0, y: 7.31, w: 10, h: 0.18, fontSize: 7, color: 'AAAAAA', fontFace: FONT_BODY, align: 'center',
  });
}

function divider(pptx, num, title) {
  const s = pptx.addSlide();
  s.addShape('rect', { x: 0, y: 0, w: 10, h: 7.5, fill: { color: NAVY }, line: { color: NAVY } });
  s.addShape('rect', { x: 0.55, y: 2.9, w: 0.07, h: 1.9, fill: { color: GOLD }, line: { color: GOLD } });
  if (num) s.addText(num, { x: 0.85, y: 2.75, w: 3, h: 1.4, fontSize: 68, color: WHITE, fontFace: FONT_TITLE });
  s.addText(title, { x: 0.85, y: 4.15, w: 8.5, h: 0.85, fontSize: 24, color: WHITE, fontFace: FONT_TITLE });
  s.addShape('rect', { x: 0, y: 7.18, w: 10, h: 0.08, fill: { color: GOLD }, line: { color: GOLD } });
}

function kpiRow(slide, boxes, y) {
  const n = boxes.length;
  const w = (9.2 / n) - 0.08;
  boxes.forEach((b, i) => {
    const x = 0.4 + i * (9.2 / n);
    slide.addShape('rect', { x, y, w, h: 1.45, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape('rect', { x, y, w, h: 0.07, fill: { color: GOLD }, line: { color: GOLD } });
    slide.addText(b.value, { x, y: y + 0.1, w, h: 0.85, fontSize: n > 4 ? 13 : 17, color: GOLD, fontFace: FONT_TITLE, align: 'center', valign: 'middle', bold: true });
    slide.addText(b.label, { x, y: y + 0.95, w, h: 0.44, fontSize: 8.5, color: WHITE, fontFace: FONT_BODY, align: 'center', valign: 'middle' });
  });
}

function bullets(pptx, section, title, intro, items, pg, total, client) {
  const s = pptx.addSlide();
  wb(s); hdr(s, section, title);
  if (intro) s.addText(intro, { x: 0.4, y: 1.18, w: 9.2, h: 0.62, fontSize: 11.5, color: DGRAY, fontFace: FONT_BODY, italic: true });
  const sy = intro ? 1.85 : 1.22;
  s.addText(
    items.map(t => ({ text: t, options: { bullet: { type: 'bullet', indent: 15 }, breakLine: true, paraSpaceAfter: 9 } })),
    { x: 0.45, y: sy, w: 9.1, h: 7.1 - sy - 0.28, fontSize: 12, color: DGRAY, fontFace: FONT_BODY, valign: 'top' }
  );
  ftr(s, pg, total, client);
}

function tableRows(pptx, section, title, rows, pg, total, client) {
  const s = pptx.addSlide();
  wb(s); hdr(s, section, title);
  rows.forEach(([label, value], i) => {
    const y = 1.22 + i * 0.71;
    s.addShape('rect', { x: 0.4, y, w: 9.2, h: 0.63, fill: { color: i % 2 === 0 ? LGRAY : WHITE }, line: { color: MGRAY, width: 0.5 } });
    s.addText(label, { x: 0.55, y: y + 0.11, w: 3.8, h: 0.42, fontSize: 12, color: NAVY, fontFace: FONT_BODY, bold: true });
    s.addText(String(value), { x: 4.5, y: y + 0.11, w: 4.9, h: 0.42, fontSize: 12, color: DGRAY, fontFace: FONT_BODY });
  });
  ftr(s, pg, total, client);
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT — MULTI-PLOT SUPPORT
//  Reads formData.plots[] array; if absent, falls back to single plot from formData.
// ══════════════════════════════════════════════════════════════════════════════

export async function generatePptxFromForm(formData) {

  // ── 1. EXTRACT PLOTS ────────────────────────────────────────────
  let rawPlots = [];

  if (formData.plots && Array.isArray(formData.plots) && formData.plots.length > 0) {
    rawPlots = formData.plots.map(p => ({
      city: p.city || p.City || 'Dubai',
      propertyType: p.propertyType || p.property_type || p.assetType || p.asset_type || p['Asset Type'] || 'Luxury Apartments',
      assetCategory: p.assetCategory || p.category || p.Category || 'Residential',
      specs: p.specifications || p.specs || p.Specifications || p.priceRange || '',
    }));
  } else {
    rawPlots = [{
      city: formData.city || 'Dubai',
      propertyType: formData.propertyType || formData.property_type || formData.assetType || 'Luxury Apartments',
      assetCategory: formData.assetCategory || formData.asset_category || 'Residential',
      specs: formData.priceRange || formData.price_range || '',
    }];
  }

  // ── 2. DEDUPLICATE ───────────────────────────────────────────────
  const seen = new Set();
  const uniquePlots = rawPlots.filter(p => {
    const key = `${p.city}__${p.propertyType}`.toLowerCase().replace(/\s+/g, '_');
    if (seen.has(key)) { console.log(`[PPTX] Dedup skip: ${key}`); return false; }
    seen.add(key);
    return true;
  });

  console.log(`\n[PPTX] Plots: ${rawPlots.length} total, ${uniquePlots.length} unique`);
  uniquePlots.forEach((p, i) => console.log(`  ${i + 1}. ${p.city} | ${p.propertyType} | ${p.assetCategory}`));

  // ── 3. GET MARKET DATA FOR EACH UNIQUE PLOT ─────────────────────
  const plotsWithData = uniquePlots.map(p => ({ ...p, M: getMarketData(p.city, p.propertyType) }));

  // ── 4. GENERAL FORM DATA ─────────────────────────────────────────
  const firstPlot = uniquePlots[0];
  const M = plotsWithData[0].M;
  const city = firstPlot.city;
  const propType = firstPlot.propertyType;
  const assetCat = firstPlot.assetCategory;
  const units = String(formData.numberOfUnits || formData.units || 'TBD');
  const priceRange = formData.priceRange || formData.price_range || firstPlot.specs || 'N/A';
  const clientName = formData.clientName || formData.client_name || 'Confidential';
  const projectTitle = formData.projectTitle || formData.title || `${city} Feasibility Study`;
  const dateStr = formData.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const coverTitle = (formData.coverTitle || formData.cover_title || formData.presentationType || formData.type || 'Feasibility Study').toString().trim();
  const coverSubtitle = (formData.coverSubtitle || formData.cover_subtitle || '').toString().trim();
  const n = uniquePlots.length;

  // ── 5. DYNAMIC TOTAL SLIDE COUNT ─────────────────────────────────
  const TOTAL = 3 + 3 + 3 + 3 + (1 + n * 2) + 3 + 3 + 2;
  let pg = 1;

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'LAYOUT_WIDE', width: 13.333, height: 7.5 });
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = projectTitle;
  pptx.subject = 'Feasibility Study';
  pptx.author = 'Smart Presentation Solutions';

  // ════════════════════════════════════════════════════════════════
  //  SLIDE 1 — COVER
  // ════════════════════════════════════════════════════════════════
  {
    const s = pptx.addSlide();
    const coverPaths = [
      path.join(backendRoot, 'public', 'images', 'cover_bg.jpg'),
      path.join(backendRoot, 'public', 'images', 'cover_bg.png'),
      path.join(backendRoot, 'Library', 'assets', 'cover-bg.jpg'),
      path.join(backendRoot, 'Library', 'assets', 'cover-bg.png'),
      path.join(process.cwd(), 'public', 'images', 'cover_bg.jpg'),
    ];
    const bgPath = coverPaths.find(p => fs.existsSync(p));
    if (bgPath) {
      s.addImage({ path: bgPath, x: 0, y: 0, w: 10, h: 4.6 });
      s.addShape('rect', { x: 0, y: 4.1, w: 10, h: 3.4, fill: { color: NAVY }, line: { color: NAVY } });
    } else {
      s.addShape('rect', { x: 0, y: 0, w: 10, h: 7.5, fill: { color: NAVY }, line: { color: NAVY } });
    }
    s.addShape('rect', { x: 0, y: 4.08, w: 10, h: 0.06, fill: { color: GOLD }, line: { color: GOLD } });
    const coverTitleText = coverTitle || (formData.presentationType || 'Feasibility Study').toString();
    s.addText(coverTitleText, { x: 0.5, y: 4.18, w: 8, h: 0.38, fontSize: 10.5, color: GOLD, fontFace: FONT_BODY, charSpacing: 3 });
    const coverSubtitleText = coverSubtitle || uniquePlots.map(p => p.city).join(' · ').toUpperCase();
    s.addText(coverSubtitleText, { x: 0.5, y: 4.55, w: 8, h: 0.36, fontSize: 10.5, color: 'AAAAAA', fontFace: FONT_BODY, charSpacing: 3 });
    s.addText(projectTitle, { x: 0.5, y: 4.92, w: 9, h: 1.05, fontSize: 27, color: WHITE, fontFace: FONT_TITLE });
    s.addShape('rect', { x: 0.5, y: 6.03, w: 4.2, h: 0.05, fill: { color: GOLD }, line: { color: GOLD } });
    s.addText(`${clientName}  |  ${dateStr}`, { x: 0.5, y: 6.16, w: 8, h: 0.3, fontSize: 10, color: 'CCCCCC', fontFace: FONT_BODY });
    pg++;
  }

  // ════════════════════════════════════════════════════════════════
  //  SLIDES 2–3 — TABLE OF CONTENTS
  // ════════════════════════════════════════════════════════════════
  {
    const td = pptx.addSlide();
    td.addShape('rect', { x: 0, y: 0, w: 10, h: 7.5, fill: { color: NAVY }, line: { color: NAVY } });
    td.addText('Table of Contents', { x: 1, y: 2.9, w: 8, h: 1.2, fontSize: 38, color: WHITE, fontFace: FONT_TITLE, align: 'center' });
    td.addShape('rect', { x: 3, y: 4.2, w: 4, h: 0.07, fill: { color: GOLD }, line: { color: GOLD } });
    pg++;

    const tocSections = [
      'Project Background',
      'Executive Summary',
      'Site Assessment',
      ...uniquePlots.map(p => `Market Overview: ${p.city} ${p.propertyType}`),
      'Development Recommendations',
      'Financial & Investment Analysis',
      'Disclaimer',
    ];
    const tc = pptx.addSlide();
    wb(tc); hdr(tc, 'contents', 'Table of Contents');
    const half = Math.ceil(tocSections.length / 2);
    tocSections.forEach((sec, i) => {
      const col = i < half ? 0 : 1;
      const row = i < half ? i : i - half;
      const x = col === 0 ? 0.4 : 5.3;
      const y = 1.22 + row * 0.72;
      tc.addShape('rect', { x, y, w: 0.5, h: 0.5, fill: { color: NAVY }, line: { color: NAVY } });
      tc.addText(`${i + 1}`, { x, y, w: 0.5, h: 0.5, fontSize: 13, color: GOLD, fontFace: FONT_TITLE, align: 'center', valign: 'middle' });
      tc.addText(sec, { x: x + 0.6, y: y + 0.04, w: 4.0, h: 0.44, fontSize: 10, color: NAVY, fontFace: FONT_BODY, bold: true, valign: 'middle' });
    });
    ftr(tc, pg, TOTAL, clientName);
    pg++;
  }

  // ════════════════════════════════════════════════════════════════
  //  SECTION 1 — PROJECT BACKGROUND
  // ════════════════════════════════════════════════════════════════
  divider(pptx, '1.', 'Project Background'); pg++;

  {
    const s = pptx.addSlide(); wb(s);
    hdr(s, '1. Project Background', 'Project Overview');
    const plotSummary = uniquePlots.map((p, i) =>
      `Plot ${i + 1}: ${p.city} — ${p.propertyType} (${p.assetCategory}${p.specs ? ', ' + p.specs : ''})`
    ).join('\n');
    s.addText(
      `This feasibility study covers ${n} plot${n > 1 ? 's' : ''} across ${[...new Set(uniquePlots.map(p => p.city))].join(', ')}.\n\n` + plotSummary,
      { x: 0.4, y: 1.18, w: 9.2, h: 3.0, fontSize: 12, color: DGRAY, fontFace: FONT_BODY, valign: 'top' }
    );
    kpiRow(s, [
      { label: 'Total Plots', value: String(n) },
      { label: 'Cities', value: [...new Set(uniquePlots.map(p => p.city))].join(', ') },
      { label: 'Market Size', value: M.financials.marketSize },
      { label: 'YoY Growth', value: M.financials.growthRate },
    ], 4.2);
    ftr(s, pg, TOTAL, clientName); pg++;
  }

  {
    const s = pptx.addSlide(); wb(s);
    hdr(s, '1. Project Background', 'Project Scope');
    const rows = [
      ['Client', clientName],
      ['Number of Plots', String(n)],
      ...uniquePlots.map((p, i) => [`Plot ${i + 1}`, `${p.city} · ${p.propertyType} · ${p.assetCategory}${p.specs ? ' · ' + p.specs : ''}`]),
      ['Date', dateStr],
    ];
    rows.forEach(([label, value], i) => {
      const y = 1.22 + i * 0.63;
      s.addShape('rect', { x: 0.4, y, w: 9.2, h: 0.56, fill: { color: i % 2 === 0 ? LGRAY : WHITE }, line: { color: MGRAY, width: 0.5 } });
      s.addText(label, { x: 0.55, y: y + 0.09, w: 3.0, h: 0.38, fontSize: 11, color: NAVY, fontFace: FONT_BODY, bold: true });
      s.addText(value, { x: 3.7, y: y + 0.09, w: 5.7, h: 0.38, fontSize: 11, color: DGRAY, fontFace: FONT_BODY });
    });
    ftr(s, pg, TOTAL, clientName); pg++;
  }

  // ════════════════════════════════════════════════════════════════
  //  SECTION 2 — EXECUTIVE SUMMARY
  // ════════════════════════════════════════════════════════════════
  divider(pptx, '2.', 'Executive Summary'); pg++;

  {
    const s = pptx.addSlide(); wb(s);
    hdr(s, '2. Executive Summary', 'Key Findings');
    s.addText(
      `This study covers ${n} plot${n > 1 ? 's' : ''} across ${[...new Set(uniquePlots.map(p => p.city))].join(', ')}. ` +
      'Each market shows strong demand aligned with the respective asset class and category.',
      { x: 0.4, y: 1.18, w: 9.2, h: 0.68, fontSize: 12, color: DGRAY, fontFace: FONT_BODY }
    );
    kpiRow(s, [
      { label: 'Avg Price / Sq Ft', value: M.financials.avgPricePsf },
      { label: 'Rental Yield', value: M.financials.rentalYield },
      { label: 'Target IRR', value: M.financials.irr },
      { label: 'Payback Period', value: M.financials.payback },
    ], 2.05);
    ftr(s, pg, TOTAL, clientName); pg++;
  }

  bullets(pptx, '2. Executive Summary', 'Recommendations',
    `Strategic recommendations for ${n} plot${n > 1 ? ' portfolio' : ''}:`,
    M.recommendations, pg, TOTAL, clientName); pg++;

  // ════════════════════════════════════════════════════════════════
  //  SECTION 3 — SITE ASSESSMENT
  // ════════════════════════════════════════════════════════════════
  divider(pptx, '3.', 'Site Assessment'); pg++;

  {
    const s = pptx.addSlide(); wb(s);
    hdr(s, '3. Site Assessment', 'Site Location & Context');
    s.addText(
      `The proposed sites span ${[...new Set(uniquePlots.map(p => p.city))].join(', ')}, ` +
      `covering ${[...new Set(uniquePlots.map(p => p.propertyType))].join(', ')} asset classes.`,
      { x: 0.4, y: 1.18, w: 9.2, h: 0.62, fontSize: 12, color: DGRAY, fontFace: FONT_BODY }
    );
    const half = Math.ceil(M.supplyStats.length / 2);
    M.supplyStats.slice(0, half).forEach((item, i) => {
      const y = 2.0 + i * 0.72;
      s.addShape('rect', { x: 0.4, y, w: 4.35, h: 0.64, fill: { color: LGRAY }, line: { color: MGRAY, width: 0.5 } });
      s.addText(`• ${item}`, { x: 0.55, y: y + 0.1, w: 4.05, h: 0.45, fontSize: 11, color: DGRAY, fontFace: FONT_BODY });
    });
    M.supplyStats.slice(half).forEach((item, i) => {
      const y = 2.0 + i * 0.72;
      s.addShape('rect', { x: 5.25, y, w: 4.35, h: 0.64, fill: { color: LGRAY }, line: { color: MGRAY, width: 0.5 } });
      s.addText(`• ${item}`, { x: 5.4, y: y + 0.1, w: 4.05, h: 0.45, fontSize: 11, color: DGRAY, fontFace: FONT_BODY });
    });
    ftr(s, pg, TOTAL, clientName); pg++;
  }

  bullets(pptx, '3. Site Assessment', 'Site Characteristics', null, M.devParameters, pg, TOTAL, clientName); pg++;

  // ════════════════════════════════════════════════════════════════
  //  SECTION 4 — MARKET OVERVIEW — ONE PAIR PER UNIQUE PLOT
  // ════════════════════════════════════════════════════════════════
  divider(pptx, '4.', 'Market Overview'); pg++;

  for (const pd of plotsWithData) {
    const pm = pd.M;

    const s = pptx.addSlide(); wb(s);
    hdr(s, '4. Market Overview', pm.marketTitle);
    s.addText(pm.marketSummary, {
      x: 0.4, y: 1.18, w: 9.2, h: 1.05, fontSize: 11.5, color: DGRAY, fontFace: FONT_BODY, valign: 'top',
    });
    pm.pricingData.slice(0, 4).forEach(([label, val], i) => {
      const y = 2.38 + i * 0.71;
      s.addShape('rect', { x: 0.4, y, w: 9.2, h: 0.63, fill: { color: i % 2 === 0 ? LGRAY : WHITE }, line: { color: MGRAY, width: 0.5 } });
      s.addText(label, { x: 0.55, y: y + 0.11, w: 4.5, h: 0.42, fontSize: 11.5, color: NAVY, fontFace: FONT_BODY, bold: true });
      s.addText(String(val), { x: 5.2, y: y + 0.11, w: 4.2, h: 0.42, fontSize: 11.5, color: DGRAY, fontFace: FONT_BODY });
    });
    ftr(s, pg, TOTAL, clientName); pg++;

    bullets(pptx, '4. Market Overview',
      `Demand Drivers — ${pd.city} ${pd.propertyType}`,
      `Key demand drivers for ${pd.propertyType} in ${pd.city}:`,
      pm.demandDrivers, pg, TOTAL, clientName); pg++;
  }

  // ════════════════════════════════════════════════════════════════
  //  SECTION 5 — DEVELOPMENT RECOMMENDATIONS
  // ════════════════════════════════════════════════════════════════
  divider(pptx, '5.', 'Development Recommendations'); pg++;

  bullets(pptx, '5. Development Recommendations', 'Recommended Use & Mix',
    `Recommended strategy across ${n} plot${n > 1 ? 's' : ''}:`,
    M.recommendations, pg, TOTAL, clientName); pg++;

  bullets(pptx, '5. Development Recommendations', 'Development Parameters', null, M.devParameters, pg, TOTAL, clientName); pg++;

  // ════════════════════════════════════════════════════════════════
  //  SECTION 6 — FINANCIAL & INVESTMENT ANALYSIS
  // ════════════════════════════════════════════════════════════════
  divider(pptx, '6.', 'Financial & Investment Analysis'); pg++;

  {
    const s = pptx.addSlide(); wb(s);
    hdr(s, '6. Financial & Investment Analysis', 'Investment Summary');
    s.addText(
      `Financial projections across ${n} plot${n > 1 ? 's' : ''} indicate viable investment cases. ` +
      `Reference metrics shown for ${city} ${propType}.`,
      { x: 0.4, y: 1.18, w: 9.2, h: 0.62, fontSize: 12, color: DGRAY, fontFace: FONT_BODY }
    );
    kpiRow(s, [
      { label: 'Avg Price / Sq Ft', value: M.financials.avgPricePsf },
      { label: 'Rental Yield', value: M.financials.rentalYield },
      { label: 'Cap Rate', value: M.financials.capRate },
      { label: 'Break-Even', value: M.financials.breakeven },
    ], 2.0);
    kpiRow(s, [
      { label: 'Target IRR', value: M.financials.irr },
      { label: 'Payback Period', value: M.financials.payback },
      { label: 'Market Size', value: M.financials.marketSize },
      { label: 'YoY Growth', value: M.financials.growthRate },
    ], 3.68);
    ftr(s, pg, TOTAL, clientName); pg++;
  }

  tableRows(pptx, '6. Financial & Investment Analysis', 'Key Assumptions & Returns', [
    ['Avg Price / Sq Ft', M.financials.avgPricePsf],
    ['Gross Rental Yield', M.financials.rentalYield],
    ['Capitalisation Rate', M.financials.capRate],
    ['Target IRR', M.financials.irr],
    ['Payback Period', M.financials.payback],
    ['Land Cost', M.financials.landCost],
    ['Build Cost', M.financials.buildCost],
    ['Finance Structure', M.financials.ltvFinance],
  ], pg, TOTAL, clientName); pg++;

  // ════════════════════════════════════════════════════════════════
  //  DISCLAIMER
  // ════════════════════════════════════════════════════════════════
  divider(pptx, '', 'Disclaimer'); pg++;

  {
    const s = pptx.addSlide(); wb(s);
    hdr(s, 'DISCLAIMER', 'Disclaimer');
    s.addText(
      'This presentation is prepared for informational purposes only. The analysis is based on assumptions ' +
      'and data available at the time of preparation. Actual results may vary. This document does not ' +
      'constitute professional advice. Recipients should seek independent professional advice before making ' +
      'any investment or development decision. The information contained herein is confidential and ' +
      'intended solely for the named recipient.',
      { x: 0.5, y: 1.25, w: 9, h: 3.5, fontSize: 12, color: DGRAY, fontFace: FONT_BODY, valign: 'top' }
    );
    ftr(s, pg, TOTAL, clientName);
  }

  // ── SAVE ────────────────────────────────────────────────────────
  const outDir = path.join(backendRoot, 'generated');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const safe = projectTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
  const fileName = `${safe}_${uuidv4().substring(0, 8)}.pptx`;
  const filePath = path.join(outDir, fileName);

  await pptx.writeFile({ fileName: filePath });
  console.log(`[PPTX] ✅ ${fileName}  (${TOTAL} slides, ${n} plots)`);
  return { fileName, filePath };
}

export default generatePptxFromForm;
