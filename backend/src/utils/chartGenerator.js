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
        x: 5.5,      // RIGHT side (table is on left 0.5-5.0)
        y: 1.5,      // Below title
        w: 4.0,      // Narrower to fit right side
        h: 4.0,      // Same height as table
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
        y: 4.5,      // BELOW market content (content ends ~4.0)
        w: 9.0,      // Full width
        h: 2.5,      // Shorter height to fit below
        chartColors: ['27AE60'],
        showLegend: true,
        legendPos: 'r',  // Legend on right
        showTitle: false,
        valAxisMaxVal: 1600,
        valAxisMinVal: 800,
        catAxisLabelFontSize: 11,
        valAxisLabelFontSize: 11,
        dataLabelFontSize: 10,
        showValue: false
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
