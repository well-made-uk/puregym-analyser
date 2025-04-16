const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function scrapeGymData() {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    const gyms = [];

    try {
        // Navigate to the gyms listing page
        await page.goto('https://www.puregym.com/gyms/', {
            waitUntil: 'networkidle0'
        });

        // Get all gym links
        const gymLinks = await page.$$eval('a.sc-1tbcnxx-5.fXaSor', links =>
            links.map(link => ({
                name: link.textContent.trim(),
                url: link.href
            }))
        );

        // Filter out "opening soon" gyms
        const activeGyms = gymLinks.filter(gym => !gym.name.toLowerCase().includes('opening soon'));

        console.log(`Found ${activeGyms.length} active gyms. Starting to collect data...`);

        // Visit each gym page and get the price
        for (let i = 0; i < activeGyms.length; i++) {
            const gym = activeGyms[i];
            const progress = ((i + 1) / activeGyms.length * 100).toFixed(1);
            
            try {
                await page.goto(gym.url, { waitUntil: 'networkidle0' });
                
                // Get price using the data-testid attribute
                const priceText = await page.evaluate(() => {
                    const element = document.querySelector('[data-testid="monthlyPrice-Premium"]');
                    if (!element) throw new Error('Price element not found');
                    return element.textContent.trim();
                });
                
                // Get address
                const address = await page.evaluate(() => {
                    const addressEl = document.querySelector('address');
                    return addressEl ? addressEl.textContent.trim() : null;
                });
                
                // Convert price text (e.g., "£14.99") to number
                const price = parseFloat(priceText.replace('£', ''));
                
                gyms.push({
                    name: gym.name,
                    url: gym.url,
                    price: price,
                    address: address
                });

                console.log(`[${progress}%] Processed: ${gym.name} - £${price} - ${address ? 'Address found' : 'No address'}`);
            } catch (error) {
                console.error(`[${progress}%] Error processing gym ${gym.name}:`, error.message);
                gyms.push({
                    name: gym.name,
                    url: gym.url,
                    price: null,
                    address: null,
                    error: error.message
                });
            }
        }

        // Save the results to a JSON file
        await fs.writeFile('gym-prices.json', JSON.stringify(gyms, null, 2));
        console.log('Data saved to gym-prices.json');

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await browser.close();
    }
}

scrapeGymData();
