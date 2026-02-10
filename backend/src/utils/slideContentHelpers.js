import { getCityData } from '../data/cityData.js';

/**
 * Add Investment Assumptions table to a slide
 */
export const addInvestmentAssumptionsTable = (slide, city, projectType) => {
    const data = getCityData(city, projectType);
    if (!data) {
        console.warn(`⚠️  No data found for ${city} ${projectType} - using placeholder`);
        slide.addText(`Investment Assumptions - ${city} ${projectType}`, {
            x: 0.5,
            y: 2.5,
            w: 9,
            h: 1,
            fontSize: 24,
            bold: true,
            color: '234874',
            align: 'center'
        });
        slide.addText('Data not available for this city/project type combination', {
            x: 0.5,
            y: 3.5,
            w: 9,
            h: 0.5,
            fontSize: 14,
            color: '666666',
            align: 'center'
        });
        return;
    }

    // Add title
    slide.addText(`Investment Assumptions - ${city} ${projectType}`, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.75,
        fontSize: 28,
        bold: true,
        color: '234874' // AIRE Navy
    });

    // Add subtitle
    slide.addText(`Financial Projections for ${city} Market`, {
        x: 0.5,
        y: 1.3,
        w: 9,
        h: 0.4,
        fontSize: 16,
        color: '666666'
    });

    // Create table data
    const tableData = [
        [
            { text: 'Assumption Item', options: { bold: true, fill: '234874', color: 'FFFFFF' } },
            { text: 'Rate', options: { bold: true, fill: '234874', color: 'FFFFFF' } },
            { text: 'Amount', options: { bold: true, fill: '234874', color: 'FFFFFF' } }
        ],
        ['Land Cost', data.landCost, data.landCostAmount],
        ['Construction Cost', data.constructionCost, data.constructionAmount],
        ['Permits & Approvals', data.permits, data.permitsAmount],
        ['Marketing & Sales', data.marketing, data.marketingAmount],
        [
            { text: 'TOTAL PROJECT COST', options: { bold: true } },
            { text: '', options: {} },
            { text: data.totalCost, options: { bold: true, fill: 'E8F4F8' } }
        ]
    ];

    // Add table
    slide.addTable(tableData, {
        x: 0.5,
        y: 2.2,
        w: 9,
        h: 3,
        colW: [4.5, 2.25, 2.25],
        border: { pt: 1, color: 'CCCCCC' },
        fontSize: 14,
        align: 'left',
        valign: 'middle'
    });

    // Add footer note
    slide.addText(`*Rates based on ${city} market analysis as of ${new Date().getFullYear()}`, {
        x: 0.5,
        y: 5.5,
        w: 9,
        h: 0.3,
        fontSize: 10,
        color: '999999',
        italic: true
    });
};

/**
 * Add ROI Analysis table to a slide
 */
export const addROIAnalysisTable = (slide, city, projectType) => {
    const data = getCityData(city, projectType);
    if (!data) {
        console.warn(`⚠️  No data found for ${city} ${projectType} - using placeholder`);
        slide.addText(`ROI Analysis - ${city} ${projectType}`, {
            x: 0.5,
            y: 2.5,
            w: 9,
            h: 1,
            fontSize: 24,
            bold: true,
            color: '234874',
            align: 'center'
        });
        slide.addText('Data not available for this city/project type combination', {
            x: 0.5,
            y: 3.5,
            w: 9,
            h: 0.5,
            fontSize: 14,
            color: '666666',
            align: 'center'
        });
        return;
    }

    // Add title
    slide.addText(`ROI Analysis - ${city} ${projectType}`, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.75,
        fontSize: 28,
        bold: true,
        color: '234874' // AIRE Navy
    });

    // Add subtitle
    slide.addText(`Return on Investment Projections`, {
        x: 0.5,
        y: 1.3,
        w: 9,
        h: 0.4,
        fontSize: 16,
        color: '666666'
    });

    // Create metrics table
    const metricsData = [
        [
            { text: 'Metric', options: { bold: true, fill: '234874', color: 'FFFFFF' } },
            { text: 'Value', options: { bold: true, fill: '234874', color: 'FFFFFF' } }
        ],
        ['Average Rental Rate', data.avgRent],
        ['Expected Occupancy', data.occupancy],
        ['Annual Appreciation', data.appreciation],
        [
            { text: 'Expected ROI', options: { bold: true } },
            { text: data.roi, options: { bold: true, fill: 'E8F4F8', color: '00AA00' } }
        ],
        ['Break-Even Period', data.breakEven]
    ];

    // Add metrics table - NARROWER to fit with chart
    slide.addTable(metricsData, {
        x: 0.5,      // LEFT side
        y: 2.2,      // Below subtitle
        w: 4.5,      // NARROWER (was 6) - leaves room for chart
        colW: [2.7, 1.8],  // Adjusted column widths
        border: { pt: 1, color: 'CCCCCC' },
        fontSize: 13,  // Slightly smaller
        align: 'left',
        valign: 'middle'
    });

    // Add key insights box
    slide.addText('Key Insights:', {
        x: 0.5,
        y: 5,
        w: 9,
        h: 0.4,
        fontSize: 16,
        bold: true,
        color: '234874'
    });

    const insights = [
        `• ${city} ${projectType} market shows strong potential with ${data.roi} ROI`,
        `• High occupancy rate of ${data.occupancy} indicates strong demand`,
        `• Annual appreciation of ${data.appreciation} above national average`,
        `• Break-even expected in ${data.breakEven}, faster than market average`
    ];

    slide.addText(insights.join('\n'), {
        x: 0.5,
        y: 5.5,
        w: 9,
        h: 1,
        fontSize: 12,
        color: '333333',
        bullet: false
    });
};

/**
 * Add Market Analysis content to a slide
 * ULTRA-COMPACT layout to fit chart below
 */
export const addMarketAnalysisContent = (slide, city, projectType) => {
    const data = getCityData(city, projectType);
    if (!data) {
        console.warn(`⚠️  No data found for ${city} ${projectType} - using placeholder`);
        // Title INSIDE navy header bar
        slide.addText(`${city} ${projectType} Market Overview`, {
            x: 0.5,
            y: 0.3,
            w: 9,
            h: 0.8,
            fontSize: 24,
            bold: true,
            color: 'FFFFFF'
        });

        // Subtitle on white background
        slide.addText(`Market Analysis`, {
            x: 0.5,
            y: 1.5,
            w: 9,
            h: 0.25,
            fontSize: 12,
            color: '666666'
        });

        slide.addText('Data not available for this city/project type combination', {
            x: 0.5,
            y: 2.0,
            w: 9,
            h: 0.5,
            fontSize: 14,
            color: '666666',
            align: 'center'
        });
        return;
    }

    // Title INSIDE navy header bar
    slide.addText(`${city} ${projectType} Market Overview`, {
        x: 0.5,
        y: 0.3,  // ✅ INSIDE navy header
        w: 9,
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: 'FFFFFF'  // ✅ WHITE text
    });

    // Subtitle on white background
    slide.addText(`Market Analysis`, {
        x: 0.5,
        y: 1.5,  // ✅ Below gold bar
        w: 9,
        h: 0.25,  // ✅ COMPACT
        fontSize: 12,  // ✅ SMALLER
        color: '666666'
    });

    // Add market summary - ULTRA-COMPACT for chart space
    const summary = `The ${city} ${projectType.toLowerCase()} market demonstrates robust growth with average rental rates of ${data.avgRent} and occupancy levels at ${data.occupancy}. Current market conditions show ${data.appreciation} annual appreciation, making it an attractive investment opportunity.`;

    slide.addText(summary, {
        x: 0.5,
        y: 1.8,  // ✅ RIGHT after subtitle
        w: 9,
        h: 0.7,  // ✅ VERY COMPACT (was 0.9)
        fontSize: 11,  // ✅ SMALLER (was 12)
        color: '333333'
    });

    // Add market highlights - ULTRA-COMPACT
    slide.addText('Market Highlights:', {
        x: 0.5,
        y: 2.6,  // ✅ After summary
        w: 9,
        h: 0.2,  // ✅ VERY COMPACT
        fontSize: 13,  // ✅ SMALLER (was 14)
        bold: true,
        color: '234874'
    });

    const highlights = [
        `Strong rental demand with ${data.occupancy} occupancy`,
        `Competitive rental rates: ${data.avgRent}`,
        `Healthy appreciation rate: ${data.appreciation} annually`,
        `Attractive ROI: ${data.roi}`,
        `Quick break-even: ${data.breakEven}`
    ];

    slide.addText(highlights.join('\n'), {
        x: 0.5,
        y: 2.9,  // ✅ After highlights title
        w: 9,
        h: 1.2,  // ✅ COMPACT (ends at 4.1)
        fontSize: 10,  // ✅ SMALLER (was 11)
        color: '333333',
        bullet: { type: 'bullet' }
    });

    // Chart will be added at y: 4.3 by chartGenerator
};

/**
 * Add Market Overview content (NEW!)
 * High-level market summary
 */
export const addMarketOverviewContent = (slide, city, projectType) => {
    const data = getCityData(city, projectType);

    // Add title
    // Title INSIDE navy header bar
    slide.addText(`${city} ${projectType} Market Overview`, {
        x: 0.5,
        y: 0.3,  // ✅ INSIDE navy header (was 0.5)
        w: 9,
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: 'FFFFFF'  // ✅ WHITE text on navy background (was 234874)
    });

    // Subtitle on white background (below gold bar) - SMALLER
    slide.addText(`Market Size, Growth & Key Trends`, {
        x: 0.5,
        y: 1.5,  // ✅ Below gold bar (was 1.5)
        w: 9,
        h: 0.25,  // ✅ COMPACT
        fontSize: 12,  // ✅ SMALLER (was 14)
        color: '666666'
    });

    // Market summary - starts after subtitle
    const summary = `The ${city} ${projectType.toLowerCase()} market demonstrates robust growth with strong fundamentals. Current market size is estimated at ₹1,200 crores with a projected CAGR of 12% over the next 5 years. The market is characterized by strong demand drivers, limited supply in premium segments, and favorable regulatory environment.`;

    slide.addText(summary, {
        x: 0.5,
        y: 1.9,  // ✅ FIXED: After subtitle at 1.5 (was 2.0)
        w: 9,
        h: 1.0,  // ✅ COMPACT (was 1.2)
        fontSize: 13,  // ✅ SMALLER (was 14)
        color: '333333'
    });

    // Key metrics table - COMPACT
    const metricsData = [
        [
            { text: 'Metric', options: { bold: true, fill: '234874', color: 'FFFFFF' } },
            { text: 'Value', options: { bold: true, fill: '234874', color: 'FFFFFF' } }
        ],
        ['Market Size', '₹1,200 Cr'],
        ['Growth Rate (CAGR)', '12% p.a.'],
        ['Key Segments', projectType],
        ['Market Maturity', 'Growth Phase']
    ];

    slide.addTable(metricsData, {
        x: 0.5,
        y: 3.1,  // ✅ After summary (was 3.5)
        w: 5.5,  // ✅ COMPACT (was 6.0)
        colW: [3.2, 2.3],
        border: { pt: 1, color: 'CCCCCC' },
        fontSize: 13,  // ✅ SMALLER (was 14)
        align: 'left',
        valign: 'middle'
    });

    console.log(`Added Market Overview content for ${city} ${projectType}`);
};

/**
 * Add Supply Analysis content (NEW!)
 * Current supply and pipeline projects
 */
export const addSupplyAnalysisContent = (slide, city, projectType) => {
    // Title INSIDE navy header bar
    slide.addText(`${city} ${projectType} Supply Analysis`, {
        x: 0.5,
        y: 0.3,  // ✅ INSIDE navy header
        w: 9,
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: 'FFFFFF'  // ✅ WHITE text
    });

    // Subtitle on white background - SMALLER
    slide.addText(`Current Supply & Pipeline Projects`, {
        x: 0.5,
        y: 1.5,  // ✅ Below gold bar
        w: 9,
        h: 0.25,  // ✅ COMPACT
        fontSize: 12,  // ✅ SMALLER (was 14)
        color: '666666'
    });

    // Supply summary - starts after subtitle
    const summary = `Current ${projectType.toLowerCase()} supply in ${city} stands at approximately 1,320 units with an additional 950 units in the pipeline expected to be delivered over the next 18-24 months. The supply is concentrated in premium micro-markets with limited availability in prime locations.`;

    slide.addText(summary, {
        x: 0.5,
        y: 1.9,  // ✅ FIXED: After subtitle (was 1.6)
        w: 9,
        h: 1.0,  // ✅ COMPACT (was 1.2)
        fontSize: 13,  // ✅ SMALLER (was 14)
        color: '333333'
    });

    // Supply breakdown - COMPACT to fit
    const supplyPoints = [
        `Current Supply: 1,320 units (Q1 2025)`,
        `Pipeline Projects: 950 units (18-24 months)`,
        `Absorption Rate: 85% annually`,
        `Premium Segment: 60% of total supply`,
        `Limited availability in prime locations`
    ];

    slide.addText(supplyPoints.join('\n'), {
        x: 0.5,
        y: 3.1,  // ✅ After summary
        w: 9,
        h: 3.0,  // ✅ Fits within boundary (ends at 6.1)
        fontSize: 13,  // ✅ SMALLER (was 14)
        color: '333333',
        bullet: { type: 'bullet' }
    });

    console.log(`✅ Added Supply Analysis content for ${city} ${projectType}`);
};

/**
 * Add Demand Drivers content (NEW!)
 * Factors driving market demand
 */
export const addDemandDriversContent = (slide, city, projectType) => {
    // Title INSIDE navy header bar
    slide.addText(`${city} ${projectType} Demand Drivers`, {
        x: 0.5,
        y: 0.3,  // ✅ INSIDE navy header
        w: 9,
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: 'FFFFFF'  // ✅ WHITE text
    });

    // Subtitle on white background - SMALLER for better proportions
    slide.addText(`Key Factors Driving Market Demand`, {
        x: 0.5,
        y: 1.5,  // ✅ Below gold bar
        w: 9,
        h: 0.25,  // ✅ COMPACT
        fontSize: 12,  // ✅ SMALLER (was 14)
        color: '666666'
    });

    // Demand drivers - COMPACT to fit all 4 drivers
    const drivers = projectType === 'Commercial' ? [
        {
            title: '1. Economic Growth',
            desc: `${city}'s GDP growing at 8-10% annually, driving corporate expansion and office space demand`
        },
        {
            title: '2. Job Creation',
            desc: `IT/ITES sector adding 50,000+ jobs annually, creating strong demand for Grade A office space`
        },
        {
            title: '3. Infrastructure Development',
            desc: `Metro expansion, new business districts, and improved connectivity enhancing accessibility`
        },
        {
            title: '4. Corporate Relocations',
            desc: `Multinational companies setting up operations, seeking premium office locations`
        }
    ] : [
        {
            title: '1. Population Growth',
            desc: `${city}'s population growing at 3-4% annually, driving residential demand`
        },
        {
            title: '2. Urbanization',
            desc: `Migration from tier-2/3 cities creating sustained demand for quality housing`
        },
        {
            title: '3. Nuclear Family Trend',
            desc: `Shift towards nuclear families increasing per-capita housing requirements`
        },
        {
            title: '4. Rising Incomes',
            desc: `Growing middle class with higher disposable incomes seeking premium homes`
        }
    ];

    // ✅ PROFESSIONAL SPACING: More white space for better readability
    const CONTENT_START_Y = 2.0;  // ✅ More space after subtitle (was 1.9)
    const FOOTER_Y = 6.9;
    const SAFE_MARGIN = 0.8;  // ✅ LARGE margin for safety (was 0.6)
    const AVAILABLE_HEIGHT = FOOTER_Y - CONTENT_START_Y - SAFE_MARGIN;
    // = 6.9 - 2.0 - 0.8 = 4.1 inches for 4 drivers

    const SPACE_PER_DRIVER = AVAILABLE_HEIGHT / drivers.length;
    // = 4.1 / 4 = 1.025 inches per driver

    let yPos = CONTENT_START_Y;
    drivers.forEach(driver => {
        slide.addText(driver.title, {
            x: 0.5,
            y: yPos,
            w: 9,
            h: 0.25,  // ✅ VERY COMPACT (was 0.3)
            fontSize: 12,  // ✅ SMALLER (was 13)
            bold: true,
            color: '234874'
        });

        slide.addText(driver.desc, {
            x: 0.5,
            y: yPos + 0.3,  // ✅ TIGHTER spacing (was 0.35)
            w: 9,
            h: 0.7,  // ✅ COMPACT
            fontSize: 10,  // ✅ SMALLER (was 11)
            color: '666666'
        });

        yPos += SPACE_PER_DRIVER;  // ✅ 1.1" per driver
    });

    console.log(`✅ Added Demand Drivers content for ${city} ${projectType}`);
};

/**
 * Add Key Indicators content (NEW!)
 * Market metrics dashboard
 */
export const addKeyIndicatorsContent = (slide, city, projectType) => {
    const data = getCityData(city, projectType);

    // Add title - COMPACT
    // Title INSIDE navy header bar
    slide.addText(`${city} ${projectType} Key Indicators`, {
        x: 0.5,
        y: 0.3,  // ✅ INSIDE navy header
        w: 9,
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: 'FFFFFF'  // ✅ WHITE text
    });

    // Subtitle - SMALLER
    slide.addText(`Market Performance Metrics`, {
        x: 0.5,
        y: 1.5,  // ✅ Below gold bar
        w: 9,
        h: 0.25,  // ✅ COMPACT
        fontSize: 12,  // ✅ SMALLER (was 14)
        color: '666666'
    });

    // Key indicators table - COMPACT
    const indicatorsData = [
        [
            { text: 'Indicator', options: { bold: true, fill: '234874', color: 'FFFFFF' } },
            { text: 'Current', options: { bold: true, fill: '234874', color: 'FFFFFF' } },
            { text: 'Trend', options: { bold: true, fill: '234874', color: 'FFFFFF' } }
        ],
        ['Occupancy Rate', data?.occupancy || '88%', '↑ Increasing'],
        ['Average Rent', data?.avgRent || '₹65-75/sq ft/month', '↑ Growing'],
        ['Price Appreciation', data?.appreciation || '6%', '↑ Stable'],
        ['Absorption Rate', '85%', '↑ Strong'],
        ['Vacancy Rate', '9%', '↓ Declining'],
        ['Rental Yield', data?.rentalYield || '7.2%', '↑ Healthy']
    ];

    slide.addTable(indicatorsData, {
        x: 0.5,
        y: 1.6,  // MOVED UP from 2.0
        w: 9,
        colW: [3.5, 2.75, 2.75],
        border: { pt: 1, color: 'CCCCCC' },
        fontSize: 12,  // REDUCED from 13
        align: 'left',
        valign: 'middle'
    });

    // Market outlook - COMPACT to fit
    slide.addText('Market Outlook:', {
        x: 0.5,
        y: 4.5,  // After table
        w: 9,
        h: 0.25,  // ✅ VERY COMPACT
        fontSize: 12,  // ✅ SMALLER
        bold: true,
        color: '234874'
    });

    const outlook = `The ${city} ${projectType.toLowerCase()} market is expected to maintain strong momentum with sustained demand, controlled supply, and favorable pricing dynamics. Key indicators suggest a healthy market with attractive investment opportunities.`;

    slide.addText(outlook, {
        x: 0.5,
        y: 4.8,  // ✅ Right after title
        w: 9,
        h: 1.8,  // ✅ SAFE HEIGHT (ends at 6.6)
        fontSize: 11,  // ✅ SMALLER
        color: '666666'
    });

    console.log(`Added Key Indicators content for ${city} ${projectType}`);
};

