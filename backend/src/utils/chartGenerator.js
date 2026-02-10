/**
 * Chart Generation Service
 * Creates visual charts for financial data in presentations
 * Charts are positioned on the RIGHT side of slides to avoid overlap with tables
 */

/**
 * Add ROI Chart to slide (positioned on RIGHT side)
 * Shows visual representation of ROI over 5 years
 * NO TITLE - table already has title
 */
export const addROIChart = (slide, city, projectType, data) => {
    if (!data) {
        console.warn(`⚠️  No data for ROI chart - ${city} ${projectType}`);
        return;
    }

    // ROI data for chart
    const chartData = [
        {
            name: 'ROI %',
            labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'],
            values: [12, 15, 17, 18, 19]
        }
    ];

    // Add bar chart - POSITIONED ON RIGHT SIDE
    slide.addChart('bar', chartData, {
        x: 5.2,      // RIGHT side (table ends at ~5.0)
        y: 2.2,      // Aligned with table top
        w: 4.3,      // Wider to use available space
        h: 3.5,      // Taller for better visibility
        chartColors: ['234874'],
        showLegend: false,  // No legend needed (single series)
        showTitle: false,
        valAxisMaxVal: 25,
        valAxisMinVal: 0,
        catAxisLabelFontSize: 11,
        valAxisLabelFontSize: 11,
        dataLabelFontSize: 12,
        showValue: true
    });

    console.log(`✅ Added ROI chart for ${city} ${projectType}`);
};

/**
 * Add Cash Flow Chart to slide (positioned on RIGHT side)
 * Shows revenue, expenses, and net cash flow over 5 years
 * NO TITLE - table already has title
 */
export const addCashFlowChart = (slide, city, projectType, data) => {
    if (!data) {
        console.warn(`⚠️  No data for Cash Flow chart - ${city} ${projectType}`);
        return;
    }

    // Cash flow data for chart
    const chartData = [
        {
            name: 'Revenue',
            labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'],
            values: [2.5, 3.2, 3.8, 4.2, 4.8]
        },
        {
            name: 'Expenses',
            labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'],
            values: [1.8, 2.0, 2.1, 2.2, 2.3]
        },
        {
            name: 'Net Cash Flow',
            labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'],
            values: [0.7, 1.2, 1.7, 2.0, 2.5]
        }
    ];

    // Add line chart - POSITIONED ON RIGHT SIDE
    slide.addChart('line', chartData, {
        x: 5.2,      // RIGHT side (table is on left 0.5-5.0)
        y: 1.5,      // Below title
        w: 4.3,      // Wider for line chart
        h: 4.0,      // Same height as table
        chartColors: ['234874', 'E74C3C', '27AE60'],
        showLegend: true,
        legendPos: 'b',  // Legend at bottom
        showTitle: false,
        valAxisMaxVal: 5.0,
        valAxisMinVal: 0,
        catAxisLabelFontSize: 10,
        valAxisLabelFontSize: 10,
        dataLabelFontSize: 9,
        showValue: false,
        lineDataSymbol: 'circle',
        lineDataSymbolSize: 5
    });

    console.log(`✅ Added Cash Flow chart for ${city} ${projectType}`);
};

/**
 * Add Market Growth Chart to slide (BELOW content)
 * Shows market size and growth trends
 * Positioned BELOW the market analysis text
 */
export const addMarketGrowthChart = (slide, city, projectType) => {
    // Market growth data
    const chartData = [
        {
            name: 'Market Size (₹ Cr)',
            labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
            values: [850, 920, 1050, 1180, 1320, 1480]
        }
    ];

    // Add area chart - POSITIONED BELOW TEXT CONTENT
    slide.addChart('area', chartData, {
        x: 0.5,      // Left aligned
        y: 4.3,      // ✅ MOVED UP (was 4.5)
        w: 9.0,      // Full width
        h: 2.2,      // ✅ REDUCED height (was 2.5) - ends at 6.5"
        chartColors: ['27AE60'],
        showLegend: true,
        legendPos: 'r',  // Legend on right
        showTitle: false,  // ✅ No chart title
        title: '',  // ✅ Empty title
        chartArea: { fill: { color: 'FFFFFF' } },  // ✅ White chart area
        plotArea: { fill: { color: 'FFFFFF' } },  // ✅ White plot area
        valAxisMaxVal: 1600,
        valAxisMinVal: 800,
        catAxisLabelFontSize: 10,  // ✅ SMALLER (was 11)
        valAxisLabelFontSize: 10,  // ✅ SMALLER (was 11)
        dataLabelFontSize: 9,  // ✅ SMALLER (was 10)
        showValue: false,
        border: { pt: 0 }  // ✅ No border
    });

    console.log(`✅ Added Market Growth chart for ${city} ${projectType}`);
};

/**
 * Add Investment Breakdown Pie Chart (positioned on RIGHT side)
 * Shows distribution of investment costs
 * NO TITLE - table already has title
 */
export const addInvestmentBreakdownChart = (slide, city, projectType, data) => {
    if (!data) {
        console.warn(`⚠️  No data for Investment chart - ${city} ${projectType}`);
        return;
    }

    // Investment breakdown data
    const chartData = [
        {
            name: 'Investment Distribution',
            labels: ['Land', 'Construction', 'Permits', 'Marketing', 'Contingency'],
            values: [40, 35, 10, 8, 7]
        }
    ];

    // Add pie chart - POSITIONED ON RIGHT SIDE
    slide.addChart('pie', chartData, {
        x: 5.5,      // RIGHT side
        y: 1.5,      // Below title
        w: 4.0,      // Narrower to fit right side
        h: 4.0,      // Same height as table
        chartColors: ['234874', '3498DB', '27AE60', 'F39C12', 'E74C3C'],
        showLegend: true,
        legendPos: 'r',  // Legend on right
        showTitle: false,
        dataLabelFontSize: 11,
        showPercent: true,
        showValue: false
    });

    console.log(`✅ Added Investment Breakdown chart for ${city} ${projectType}`);
};

/**
 * Add Supply Analysis Chart (NEW!)
 * Shows current supply vs pipeline projects
 * Clustered bar chart
 */
export const addSupplyChart = (slide, city, projectType) => {
    // Supply data for chart
    const chartData = [
        {
            name: 'Current Supply',
            labels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025'],
            values: [850, 920, 1050, 1180, 1320]
        },
        {
            name: 'Pipeline Projects',
            labels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025'],
            values: [450, 520, 680, 820, 950]
        }
    ];

    // Add clustered bar chart - POSITIONED BELOW CONTENT
    slide.addChart('bar', chartData, {
        x: 0.5,
        y: 4.3,      // BELOW content (adjusted)
        w: 9.0,      // Full width
        h: 2.2,      // REDUCED to fit (was 2.5)
        chartColors: ['234874', '3498DB'],
        showLegend: true,
        legendPos: 't',  // Legend at top
        showTitle: false,
        barGrouping: 'clustered',
        valAxisMaxVal: 1500,
        valAxisMinVal: 0,
        catAxisLabelFontSize: 10,
        valAxisLabelFontSize: 10,
        dataLabelFontSize: 9,
        showValue: true
    });

    console.log(`✅ Added Supply Analysis chart for ${city} ${projectType}`);
};

/**
 * Add Demand Trends Chart (NEW!)
 * Shows demand growth over time
 * Line chart with markers
 */
export const addDemandChart = (slide, city, projectType) => {
    // Demand data for chart
    const chartData = [
        {
            name: 'Demand (Units)',
            labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
            values: [1200, 1450, 1680, 1920, 2180, 2450]
        },
        {
            name: 'Absorption Rate (%)',
            labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
            values: [65, 72, 78, 82, 85, 88]
        }
    ];

    // Add line chart - POSITIONED BELOW CONTENT
    slide.addChart('line', chartData, {
        x: 0.5,
        y: 4.3,      // BELOW content (adjusted)
        w: 9.0,      // Full width
        h: 2.2,      // REDUCED to fit (was 2.5)
        chartColors: ['27AE60', 'F39C12'],
        showLegend: true,
        legendPos: 't',  // Legend at top
        showTitle: false,
        valAxisMaxVal: 2600,
        valAxisMinVal: 0,
        catAxisLabelFontSize: 10,
        valAxisLabelFontSize: 10,
        dataLabelFontSize: 9,
        showValue: false,
        lineDataSymbol: 'circle',
        lineDataSymbolSize: 5,
        lineSmooth: true
    });

    console.log(`✅ Added Demand Trends chart for ${city} ${projectType}`);
};

/**
 * Add Price Trends Chart (NEW!)
 * Shows price appreciation over time
 * Area chart showing growth
 */
export const addPriceTrendsChart = (slide, city, projectType) => {
    // Price trends data
    const chartData = [
        {
            name: 'Average Price (₹/sq ft)',
            labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
            values: [8500, 9200, 10100, 11300, 12800, 14500]
        }
    ];

    // Add area chart - POSITIONED BELOW CONTENT
    slide.addChart('area', chartData, {
        x: 0.5,
        y: 4.3,      // BELOW content (adjusted)
        w: 9.0,      // Full width
        h: 2.2,      // REDUCED to fit (was 2.5)
        chartColors: ['E74C3C'],
        showLegend: true,
        legendPos: 't',  // Legend at top
        showTitle: false,
        valAxisMaxVal: 16000,
        valAxisMinVal: 8000,
        catAxisLabelFontSize: 10,
        valAxisLabelFontSize: 10,
        dataLabelFontSize: 9,
        showValue: false
    });

    console.log(`Added Price Trends chart for ${city} ${projectType}`);
};

