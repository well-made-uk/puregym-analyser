const fs = require('fs').promises;

async function analyzePrices() {
    // Read the gym data
    const gymData = JSON.parse(await fs.readFile('gym-prices.json', 'utf-8'));

    // Filter out gyms with null prices
    const validGyms = gymData.filter(gym => gym.price !== null);

    // Get unique price points sorted ascending
    const uniquePrices = [...new Set(validGyms.map(gym => gym.price))].sort((a, b) => a - b);

    const seenGyms = new Set();
    let cumulativeCount = 0;

    console.log('\nPureGym Price Analysis (Cumulative Summary)\n');
    for (const price of uniquePrices) {
        // Gyms exactly at this price
        const gymsAtPrice = validGyms.filter(gym => gym.price === price && !seenGyms.has(gym.name));

        // Update seen gyms
        gymsAtPrice.forEach(gym => seenGyms.add(gym.name));

        // Update cumulative count
        cumulativeCount = seenGyms.size;

        console.log(`£${price}: ${cumulativeCount} gyms`);
        gymsAtPrice.forEach(gym => {
            console.log(`- ${gym.name}`);
        });
        console.log(); // spacing
    }
}

analyzePrices().catch(console.error);
