const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const fetch = require("node-fetch");

// Utility function to extract postcode from address with better handling
function extractPostcode(address) {
  if (!address) return null;

  // UK postcode regex with more flexible matching
  const postcodeRegex = /[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/gi;

  // Clean the address
  const cleanAddress = address
    .replace(/\s+/g, " ") // Normalize spaces
    .replace(/,/g, " ") // Replace commas with spaces
    .trim();

  const matches = cleanAddress.match(postcodeRegex);
  if (!matches) {
    // Try to extract the last part that might be a postcode
    const parts = cleanAddress.split(" ");
    const lastTwo = parts.slice(-2).join(" ");
    if (lastTwo.match(/[A-Z0-9]{5,8}/i)) {
      return lastTwo;
    }
    return null;
  }

  // Return the last matching postcode (usually the most relevant)
  return matches[matches.length - 1].trim();
}

// Geocoding function with retries and location name fallback
async function geocodePostcode(postcode) {
  if (!postcode) return null;

  // Try original postcode
  let result = await tryGeocodePostcode(postcode);
  if (result) {
    console.log(`Successfully geocoded ${postcode}`);
    return result;
  }

  // Try up to 2 alternative postcodes by changing last letter
  const lastChar = postcode.slice(-1);
  const basePostcode = postcode.slice(0, -1);

  // Get ASCII value of last character and try previous letters
  const asciiVal = lastChar.charCodeAt(0);
  for (let i = 1; i <= 2; i++) {
    if (asciiVal - i < 65) break; // Stop if we go before 'A'
    const altPostcode = basePostcode + String.fromCharCode(asciiVal - i);
    console.log(`Trying alternative postcode: ${altPostcode}`);
    result = await tryGeocodePostcode(altPostcode);
    if (result) {
      console.log(
        `Successfully geocoded alternative postcode ${altPostcode} for ${postcode}`,
      );
      return result;
    }
  }

  console.log(`Failed to geocode ${postcode} and its alternatives`);
  return null;
}

async function tryGeocodePostcode(postcode) {
  try {
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`,
    );
    if (response.ok) {
      const data = await response.json();
      if (data.status === 200) {
        return {
          latitude: data.result.latitude,
          longitude: data.result.longitude,
          source: "postcode",
        };
      }
    }
  } catch (error) {
    console.error(`Error geocoding postcode ${postcode}:`, error.message);
  }
  return null;
}

// Geocode using location name as fallback
async function geocodeLocationName(locationName) {
  try {
    // Add "UK" to improve accuracy
    const searchQuery = `${locationName}, UK`;
    const response = await fetch(
      `https://api.postcodes.io/postcodes?q=${encodeURIComponent(searchQuery)}`,
    );
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status === 200 && data.result && data.result.length > 0) {
      // Use the first result
      return {
        latitude: data.result[0].latitude,
        longitude: data.result[0].longitude,
        source: "location_name",
      };
    }
    return null;
  } catch (error) {
    console.error(`Error geocoding location name ${locationName}:`, error);
    return null;
  }
}

// Rate limiter utility
async function rateLimit() {
  await new Promise((resolve) => setTimeout(resolve, 100)); // 10 requests per second max
}

// Process a single gym with retries
async function processGym(gym, browser, retries = 3) {
  // Skip "coming soon" gyms
  if (gym.name.toLowerCase().includes("coming soon")) {
    return null;
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    const page = await browser.newPage();
    try {
      await page.goto(gym.url, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      // Extract price using the data-testid attribute
      const priceText = await page.evaluate(() => {
        const element = document.querySelector(
          '[data-testid="monthlyPrice-Premium"]',
        );
        if (!element) throw new Error("Price element not found");
        return element.textContent.trim();
      });
      const price = parseFloat(priceText.replace("£", ""));

      // Get address using the address element
      const address = await page.evaluate(() => {
        const addressEl = document.querySelector("address");
        return addressEl ? addressEl.textContent.trim() : null;
      });
      const postcode = address ? extractPostcode(address) : null;

      // Try geocoding with fallback
      const geocodeResult = postcode
        ? await geocodePostcode(postcode)
        : await geocodeLocationName(gym.name);

      await page.close();

      return {
        name: gym.name,
        url: gym.url,
        price,
        address,
        latitude: geocodeResult ? geocodeResult.latitude : null,
        longitude: geocodeResult ? geocodeResult.longitude : null,
        postcode,
        geocodeSource: geocodeResult ? geocodeResult.source : null,
      };
    } catch (error) {
      await page.close();
      if (
        error.message.includes("detached") ||
        error.message.includes("timeout")
      ) {
        if (attempt === retries - 1) {
          throw error;
        }
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000));
        // Create a new browser instance if we hit a detached frame error
        if (error.message.includes("detached")) {
          try {
            await browser.close();
          } catch (e) {}
          browser = await puppeteer.launch({ headless: "new" });
        }
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Failed to process gym after ${retries} attempts`);
}

async function scrapeGymData() {
  let browser = await puppeteer.launch({ headless: "new" });
  const gyms = [];
  let page = await browser.newPage();

  try {
    // Navigate to the gyms listing page
    await page.goto("https://www.puregym.com/gyms/", {
      waitUntil: "networkidle0",
    });

    // Get all gym links
    const gymLinks = await page.$$eval("a.sc-1tbcnxx-5", (links) =>
      links.map((link) => ({
        name: link.textContent.trim(),
        url: link.href,
      })),
    );

    await page.close();

    // Filter out "opening soon" gyms
    const activeGyms = gymLinks.filter(
      (gym) => !gym.name.toLowerCase().includes("opening soon"),
    );
    console.log(
      `Found ${activeGyms.length} active gyms. Starting to collect data...`,
    );

    // Process gyms in batches of 10
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < activeGyms.length; i += batchSize) {
      const batch = activeGyms.slice(i, i + batchSize);

      // Process each gym in the batch
      for (const gym of batch) {
        const progress = (
          ((i + batch.indexOf(gym) + 1) / activeGyms.length) *
          100
        ).toFixed(1);
        try {
          const result = await processGym(gym, browser);
          results.push(result);
          console.log(
            `[${progress}%] Processed: ${gym.name} - £${result.price} - ${result.latitude ? `Geocoded (${result.geocodeSource})` : "No coordinates"}`,
          );
        } catch (error) {
          console.error(
            `[${progress}%] Error processing gym ${gym.name}:`,
            error.message,
          );
          results.push({
            name: gym.name,
            url: gym.url,
            price: null,
            address: null,
            latitude: null,
            longitude: null,
            error: error.message,
          });
        }
      }

      // Save progress after each batch
      await fs.writeFile("gym-prices.json", JSON.stringify(results, null, 2));
      console.log(
        `Progress saved: ${results.length}/${activeGyms.length} gyms processed`,
      );

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("Data saved to gym-prices.json");
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await browser.close();
  }
}

scrapeGymData();
