import assembleReportModule from './src/services/assembleReport.js';

const { assembleReport } = assembleReportModule;

async function runTest() {
    try {
        const formData = {
            title: "Test Project",
            clientName: "Test Client",
        };
        // Plot keys should match library filenames format: "city + asset type + category + specs"
        // e.g., Library/06_Market Overview/dubai + residential + apartments + luxury.pptx
        const plots = [
            {
                city: "Dubai",
                assetType: "Residential",
                category: "Apartments",
                specs: "Luxury"
            },
            {
                city: "Jeddah",
                assetType: "Residential",
                category: "Apartments",
                specs: "Luxury"
            },
            {
                city: "Riyadh",
                assetType: "Retail",
                category: "Small Regional Mall",
                specs: "Business"
            }
        ];
        console.log("Starting testAssemble script...");
        console.log("Plot keys that will be generated:");
        for (const plot of plots) {
            const key = [plot.city, plot.assetType, plot.category, plot.specs]
                .map(s => s.trim())
                .join(' + ')
                .toLowerCase();
            console.log(`  → "${key}.pptx"`);
        }
        console.log("");
        await assembleReport(formData, plots);
        console.log("Assemble script completed.");
    } catch (e) {
        console.error("Test failed:", e);
    }
}

runTest();
