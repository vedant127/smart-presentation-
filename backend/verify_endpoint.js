const fs = require('fs');

async function testEndpoint() {
    console.log('Testing /api/presentations/create-download endpoint...');

    // Simulate frontend payload
    const payload = {
        presentationTypeId: '', // Will be found by name 'Feasibility Study'
        formData: {
            title: 'Endpoint Verification Test',
            subtitle: 'Checking if Fixes are Live',
            clientName: 'Test Client',
            city: 'Dubai',
            projectName: 'Endpoint Verification Test'
        },
        plots: [
            {
                criteria: {
                    City: 'Dubai',
                    'Asset Type': 'Residential',
                    Category: 'Apartments',
                    Specifications: 'Luxury'
                },
                data: {}
            }
        ]
    };

    try {
        const fetch = (await import('node-fetch')).default; // Dynamic import for node-fetch

        const response = await fetch('http://localhost:5000/api/presentations/create-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`HTTP ${response.status}: ${txt}`);
        }

        const buffer = await response.arrayBuffer();
        const fileName = `verification_result_${Date.now()}.pptx`;
        fs.writeFileSync(fileName, Buffer.from(buffer));

        const sizeMB = (fs.statSync(fileName).size / 1024 / 1024).toFixed(2);
        console.log(`\n✅ SUCCESS! Downloaded: ${fileName}`);
        console.log(`   Size: ${sizeMB} MB`);

        if (parseFloat(sizeMB) < 0.1) {
            console.error('❌ FAILURE: File is too small (likely empty/corrupt)');
        } else {
            console.log('   Status: LOOKS GOOD (Size indicates real content)');
        }

    } catch (err) {
        console.error('❌ ERROR:', err.message);
    }
}

testEndpoint();
