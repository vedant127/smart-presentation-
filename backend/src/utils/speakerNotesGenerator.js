/**
 * Speaker Notes Generation Service
 * Generates AI-powered presenter notes for each slide
 */

/**
 * Generate speaker notes for Investment Assumptions slide
 */
export const generateInvestmentNotes = (city, projectType, data) => {
    if (!data) {
        return `Present the investment assumptions for this ${city} ${projectType} project. Highlight the key cost components and total investment required.`;
    }

    const notes = `
SPEAKER NOTES - Investment Assumptions

Opening:
"Good morning/afternoon. Let me walk you through the investment assumptions for our ${city} ${projectType} project."

Key Points to Cover:

1. LAND ACQUISITION (${data.landCost})
   - Say: "We've allocated ${data.landCost} for land acquisition in ${city}'s prime ${projectType.toLowerCase()} zone."
   - Emphasize: Strategic location with high appreciation potential
   - Mention: Current market rates justify this investment

2. CONSTRUCTION COSTS (${data.constructionCost})
   - Say: "Construction costs are estimated at ${data.constructionCost}, based on current ${city} market rates."
   - Note: Includes all structural work, MEP systems, and finishing
   - Highlight: We've factored in a 10% buffer for cost escalations

3. PERMITS & APPROVALS (${data.permitsAmount})
   - Say: "Regulatory costs including permits and approvals total ${data.permitsAmount}."
   - Mention: This covers all municipal approvals and statutory clearances
   - Reassure: Our timeline accounts for the typical ${city} approval process

4. TOTAL INVESTMENT (${data.totalCost})
   - Say: "The total project investment comes to ${data.totalCost}."
   - Emphasize: This is a comprehensive figure including all contingencies
   - Transition: "Now let's look at the returns this investment will generate..."

Closing:
"These assumptions are based on current ${city} market conditions and conservative estimates. We've built in adequate buffers to ensure project viability even in challenging scenarios."

Anticipated Questions:
Q: Why is land cost so high?
A: ${city}'s ${projectType.toLowerCase()} real estate has shown consistent appreciation. This location offers excellent connectivity and infrastructure.

Q: Can construction costs be reduced?
A: We've optimized costs while maintaining quality standards. Any significant reduction would compromise the project's premium positioning.

Q: What if permits take longer?
A: Our timeline includes buffer periods. We have strong relationships with local authorities to expedite approvals.
`;

    return notes.trim();
};

/**
 * Generate speaker notes for ROI Analysis slide
 */
export const generateROINotes = (city, projectType, data) => {
    if (!data) {
        return `Present the ROI analysis for this ${city} ${projectType} project. Focus on the strong returns and payback period.`;
    }

    const notes = `
SPEAKER NOTES - ROI Analysis

Opening:
"Now let's examine the return on investment for this ${city} ${projectType} project."

Key Metrics to Highlight:

1. RENTAL YIELD (${data.rentalYield})
   - Say: "We're projecting a rental yield of ${data.rentalYield}, which is ${data.rentalYieldComparison} the ${city} market average."
   - Emphasize: Strong rental demand in this micro-market
   - Data point: Current occupancy rates in the area are ${data.occupancyRate}

2. CAPITAL APPRECIATION (${data.appreciationRate})
   - Say: "Historical data shows ${data.appreciationRate} annual appreciation in this ${city} ${projectType.toLowerCase()} corridor."
   - Mention: This is conservative compared to recent 3-year trends
   - Highlight: Infrastructure developments will further boost values

3. IRR (${data.irr})
   - Say: "Our internal rate of return is projected at ${data.irr} over the investment horizon."
   - Compare: "This significantly exceeds typical ${projectType.toLowerCase()} project returns in ${city}."
   - Reassure: Conservative assumptions ensure achievable targets

4. PAYBACK PERIOD (${data.paybackPeriod})
   - Say: "Investors can expect full capital recovery in ${data.paybackPeriod}."
   - Emphasize: Faster than industry average for ${city} ${projectType.toLowerCase()} projects
   - Note: Post-payback, all cash flows are pure profit

Investment Highlights:
- Strong rental demand from ${city}'s growing ${projectType.toLowerCase()} sector
- Limited supply in this premium micro-market
- Excellent exit opportunities given location and quality
- Diversified revenue streams reduce risk

Closing:
"These returns are based on conservative assumptions. The actual performance could exceed these projections given ${city}'s robust economic growth and infrastructure development."

Anticipated Questions:
Q: What if rental rates don't meet projections?
A: We've used current market rates with minimal escalation. Even a 10% shortfall keeps the project viable.

Q: How does this compare to other investments?
A: The ${data.irr} IRR significantly outperforms fixed deposits, bonds, and most equity investments on a risk-adjusted basis.

Q: What are the exit options?
A: Multiple exit strategies: hold for rental income, sell after appreciation, or partial stake sale to institutional investors.
`;

    return notes.trim();
};

/**
 * Generate speaker notes for Market Analysis slide
 */
export const generateMarketNotes = (city, projectType, data) => {
    const notes = `
SPEAKER NOTES - Market Analysis

Opening:
"Let me share key insights about the ${city} ${projectType.toLowerCase()} market that make this opportunity compelling."

Market Overview:

1. MARKET SIZE & GROWTH
   - Say: "The ${city} ${projectType.toLowerCase()} market is valued at approximately ₹1,200 crores and growing at 12% annually."
   - Highlight: Outpacing national average growth rates
   - Drivers: Economic expansion, infrastructure development, demographic shifts

2. DEMAND DYNAMICS
   - Say: "Demand is driven by ${city}'s position as a major ${projectType === 'Commercial' ? 'business hub' : 'residential destination'}."
   - Key factors:
     * ${projectType === 'Commercial' ? 'Corporate expansion and job creation' : 'Population growth and urbanization'}
     * ${projectType === 'Commercial' ? 'Limited Grade A office supply' : 'Nuclear family trend and aspirational buyers'}
     * ${projectType === 'Commercial' ? 'Multinational companies setting up operations' : 'Improving connectivity and infrastructure'}

3. SUPPLY SCENARIO
   - Say: "Current supply is constrained, with limited new launches in premium segments."
   - Opportunity: Supply-demand gap creates pricing power
   - Timeline: Our project enters market at optimal time

4. COMPETITIVE LANDSCAPE
   - Say: "We've analyzed competing projects in the ${city} ${projectType.toLowerCase()} space."
   - Advantage: Our location, amenities, and pricing offer superior value
   - Differentiation: [Highlight unique selling points]

5. PRICING TRENDS
   - Say: "Average prices have appreciated ${data?.appreciationRate || '9%'} annually over the past 3 years."
   - Current rates: ₹${projectType === 'Commercial' ? '85-95' : '12,000-15,000'} per sq ft
   - Projection: Sustained growth expected given demand-supply dynamics

Market Risks & Mitigation:
- Economic slowdown: Diversified tenant/buyer base reduces impact
- Regulatory changes: Strong compliance and adaptable design
- Competition: Superior location and quality provide competitive moat

Closing:
"The ${city} ${projectType.toLowerCase()} market fundamentals are strong. Our project is positioned to capitalize on sustained demand growth while offering investors attractive risk-adjusted returns."

Anticipated Questions:
Q: What if the market softens?
A: Our conservative pricing and phased approach allow flexibility. Historical data shows ${city} recovers quickly from downturns.

Q: How do you ensure occupancy/sales?
A: Pre-leasing/pre-sales strategy, competitive pricing, and strong channel partnerships de-risk absorption.

Q: What about new supply coming in?
A: We've mapped all upcoming projects. Our location and timing give us first-mover advantage in this micro-market.
`;

    return notes.trim();
};

/**
 * Generate speaker notes for Cash Flow slide
 */
export const generateCashFlowNotes = (city, projectType) => {
    const notes = `
SPEAKER NOTES - Cash Flow Projections

Opening:
"Let's examine the cash flow projections for this ${city} ${projectType} project over a 5-year horizon."

Year-by-Year Breakdown:

YEAR 1:
- Revenue: ₹2.5 Cr (Initial occupancy/sales)
- Expenses: ₹1.8 Cr (Operations, maintenance, marketing)
- Net Cash Flow: ₹0.7 Cr
- Say: "Year 1 focuses on stabilization. We achieve positive cash flow from month 6."

YEAR 2:
- Revenue: ₹3.2 Cr (Improved occupancy/sales velocity)
- Expenses: ₹2.0 Cr
- Net Cash Flow: ₹1.2 Cr
- Say: "Year 2 shows 28% revenue growth as the project gains market traction."

YEAR 3:
- Revenue: ₹3.8 Cr (Stabilized operations)
- Expenses: ₹2.1 Cr
- Net Cash Flow: ₹1.7 Cr
- Say: "By Year 3, we reach optimal occupancy with strong cash generation."

YEAR 4:
- Revenue: ₹4.2 Cr (Rental escalations/price appreciation)
- Expenses: ₹2.2 Cr
- Net Cash Flow: ₹2.0 Cr
- Say: "Year 4 benefits from rental escalations and improved operational efficiency."

YEAR 5:
- Revenue: ₹4.8 Cr (Peak performance)
- Expenses: ₹2.3 Cr
- Net Cash Flow: ₹2.5 Cr
- Say: "Year 5 represents peak cash generation with potential for exit or refinancing."

Key Assumptions:
- Conservative occupancy ramp-up
- Market-aligned rental/pricing escalations
- Controlled expense growth
- No major capital expenditure post-stabilization

Cash Flow Highlights:
- Cumulative 5-year cash flow: ₹8.1 Cr
- Consistent year-on-year growth
- Strong cash conversion ratio
- Multiple exit windows for investors

Closing:
"These projections demonstrate robust cash generation capability. The project delivers both stable income and capital appreciation, making it an attractive investment proposition."

Anticipated Questions:
Q: What if revenue projections aren't met?
A: We've built in 15% buffer. Even with lower revenues, the project remains cash-positive.

Q: How are expenses controlled?
A: Professional property management, bulk procurement, and energy-efficient systems optimize costs.

Q: When can investors expect distributions?
A: Quarterly distributions begin from Year 2, with annual returns increasing progressively.
`;

    return notes.trim();
};

/**
 * Generate speaker notes for Cover slide
 */
export const generateCoverNotes = (title, city, projectType) => {
    const notes = `
SPEAKER NOTES - Opening Slide

Opening:
"Good morning/afternoon, everyone. Thank you for joining us today."

Introduction:
"I'm pleased to present our investment opportunity in ${city}'s ${projectType.toLowerCase()} sector - ${title}."

Set the Context:
"${city} is experiencing unprecedented growth in the ${projectType.toLowerCase()} space, driven by:
- Strong economic fundamentals
- Infrastructure development
- Demographic tailwinds
- Limited premium supply"

Preview:
"Today, I'll walk you through:
1. The investment thesis and market opportunity
2. Detailed financial projections and returns
3. Risk mitigation strategies
4. Next steps for interested investors"

Build Credibility:
"Our team has successfully delivered [X] projects in ${city}, with a track record of:
- On-time delivery
- Superior returns for investors
- Strong occupancy/sales performance"

Engagement:
"I encourage you to ask questions as we go through the presentation. Our goal is to provide complete transparency and address all your concerns."

Transition:
"Let's begin by examining the ${city} ${projectType.toLowerCase()} market dynamics..."

Tone & Body Language:
- Confident and professional
- Make eye contact with key decision-makers
- Use hand gestures to emphasize key points
- Smile and show enthusiasm for the project
- Pause after important statements for impact
`;

    return notes.trim();
};
