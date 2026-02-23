// City-specific data for presentations
export const cityData = {
    Mumbai: {
        Residential: {
            landCost: '₹15,000/sq ft',
            landCostAmount: '₹7.50 Cr',
            constructionCost: '₹6,500/sq ft',
            constructionAmount: '₹3.25 Cr',
            permits: '5%',
            permitsAmount: '₹54 Lakhs',
            marketing: '2%',
            marketingAmount: '₹22 Lakhs',
            totalCost: '₹11.51 Cr',
            avgRent: '₹65-75/sq ft/month',
            occupancy: '88%',
            appreciation: '6%',
            roi: '14-16%',
            breakEven: '6.5 years'
        },
        Commercial: {
            landCost: '₹18,000/sq ft',
            landCostAmount: '₹9.00 Cr',
            constructionCost: '₹7,500/sq ft',
            constructionAmount: '₹3.75 Cr',
            permits: '6%',
            permitsAmount: '₹76 Lakhs',
            marketing: '3%',
            marketingAmount: '₹38 Lakhs',
            totalCost: '₹13.89 Cr',
            avgRent: '₹95-110/sq ft/month',
            occupancy: '91%',
            appreciation: '7%',
            roi: '16-18%',
            breakEven: '5.5 years'
        }
    },
    Bangalore: {
        Residential: {
            landCost: '₹12,000/sq ft',
            landCostAmount: '₹6.00 Cr',
            constructionCost: '₹5,500/sq ft',
            constructionAmount: '₹2.75 Cr',
            permits: '4%',
            permitsAmount: '₹35 Lakhs',
            marketing: '2%',
            marketingAmount: '₹18 Lakhs',
            totalCost: '₹9.28 Cr',
            avgRent: '₹55-65/sq ft/month',
            occupancy: '90%',
            appreciation: '8%',
            roi: '15-17%',
            breakEven: '6 years'
        },
        Commercial: {
            landCost: '₹14,000/sq ft',
            landCostAmount: '₹7.00 Cr',
            constructionCost: '₹6,500/sq ft',
            constructionAmount: '₹3.25 Cr',
            permits: '4%',
            permitsAmount: '₹41 Lakhs',
            marketing: '2.5%',
            marketingAmount: '₹26 Lakhs',
            totalCost: '₹10.92 Cr',
            avgRent: '₹85-95/sq ft/month',
            occupancy: '92%',
            appreciation: '9%',
            roi: '17-19%',
            breakEven: '5 years'
        }
    },
    Delhi: {
        Residential: {
            landCost: '₹13,500/sq ft',
            landCostAmount: '₹6.75 Cr',
            constructionCost: '₹6,000/sq ft',
            constructionAmount: '₹3.00 Cr',
            permits: '5%',
            permitsAmount: '₹49 Lakhs',
            marketing: '2%',
            marketingAmount: '₹20 Lakhs',
            totalCost: '₹10.44 Cr',
            avgRent: '₹60-70/sq ft/month',
            occupancy: '87%',
            appreciation: '7%',
            roi: '14-16%',
            breakEven: '6.5 years'
        },
        Commercial: {
            landCost: '₹16,000/sq ft',
            landCostAmount: '₹8.00 Cr',
            constructionCost: '₹7,000/sq ft',
            constructionAmount: '₹3.50 Cr',
            permits: '5%',
            permitsAmount: '₹58 Lakhs',
            marketing: '3%',
            marketingAmount: '₹35 Lakhs',
            totalCost: '₹12.43 Cr',
            avgRent: '₹90-105/sq ft/month',
            occupancy: '89%',
            appreciation: '8%',
            roi: '16-18%',
            breakEven: '5.5 years'
        },
        'Mixed-Use': {
            landCost: '₹17,000/sq ft',
            landCostAmount: '₹8.50 Cr',
            constructionCost: '₹7,500/sq ft',
            constructionAmount: '₹3.75 Cr',
            permits: '6%',
            permitsAmount: '₹74 Lakhs',
            marketing: '3%',
            marketingAmount: '₹37 Lakhs',
            totalCost: '₹13.36 Cr',
            avgRent: '₹80-100/sq ft/month (blended)',
            occupancy: '90%',
            appreciation: '8%',
            roi: '15-17%',
            breakEven: '6 years'
        }
    }
};

// Get city-specific data
export const getCityData = (city, projectType) => {
    // FIX: Auto-correct common city name typos
    const cityCorrections = {
        'Bangaloree': 'Bangalore',
        'Banglore': 'Bangalore',
        'Bengaluru': 'Bangalore',
        'Mumbay': 'Mumbai',
        'Bombay': 'Mumbai',
        'Dehli': 'Delhi',
        'Dilli': 'Delhi'
    };

    // Correct the city name if it's a known typo
    const correctedCity = cityCorrections[city] || city;

    if (correctedCity !== city) {
        console.log(`Auto-corrected city name: "${city}" → "${correctedCity}"`);
    }

    const cityInfo = cityData[correctedCity];
    if (!cityInfo) {
        console.error(`No data found for city: "${correctedCity}" (original: "${city}")`);
        console.error(`Available cities:`, Object.keys(cityData));
        return null;
    }

    const typeInfo = cityInfo[projectType];
    if (!typeInfo) {
        console.error(`No data found for project type: "${projectType}" in city: "${correctedCity}"`);
        console.error(`Available types for ${correctedCity}:`, Object.keys(cityInfo));
        return null;
    }

    return {
        city: correctedCity,  
        projectType,
        ...typeInfo
    };
};
