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

    // Add metrics table
    slide.addTable(metricsData, {
        x: 0.5,
        y: 2.2,
        w: 6,
        h: 2.5,
        colW: [3.5, 2.5],
        border: { pt: 1, color: 'CCCCCC' },
        fontSize: 14,
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
 */
export const addMarketAnalysisContent = (slide, city, projectType) => {
    const data = getCityData(city, projectType);
    if (!data) {
        console.warn(`⚠️  No data found for ${city} ${projectType} - using placeholder`);
        slide.addText(`${city} ${projectType} Market Overview`, {
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
    slide.addText(`${city} ${projectType} Market Overview`, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.75,
        fontSize: 28,
        bold: true,
        color: '234874'
    });

    // Add market summary
    const summary = `The ${city} ${projectType.toLowerCase()} market demonstrates robust growth with average rental rates of ${data.avgRent} and occupancy levels at ${data.occupancy}. Current market conditions show ${data.appreciation} annual appreciation, making it an attractive investment opportunity.`;

    slide.addText(summary, {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 1.2,
        fontSize: 14,
        color: '333333'
    });

    // Add market highlights
    slide.addText('Market Highlights:', {
        x: 0.5,
        y: 3,
        w: 9,
        h: 0.4,
        fontSize: 18,
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
        y: 3.5,
        w: 9,
        h: 2,
        fontSize: 14,
        color: '333333',
        bullet: { type: 'bullet' }
    });
};
