import assembleReportModule from './src/services/assembleReport.js';

const { assembleReport } = assembleReportModule;

async function runTest() {
    try {
        const formData = {
            title: "Test Project",
            clientName: "Test Client",
        };
        const plots = [
            {
                city: "dubai",
                assetType: "residential",
                category: "apartments",
                specs: "luxury"
            },
            {
                city: "jeddah",
                assetType: "residential",
                category: "apartments",
                specs: "luxury"
            },
            {
                city: "riyadh",
                assetType: "residential",
                category: "small regional mall",
                specs: "business"
            }
        ];
        console.log("Starting testAssemble script...");
        await assembleReport(formData, plots);
        console.log("Assemble script completed.");
    } catch (e) {
        console.error("Test failed:", e);
    }
}

runTest();
