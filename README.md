# PureGym Price Scraper

This Node.js script scrapes pricing information from all active PureGym locations in the UK.

## Requirements

- Node.js
- npm

## Installation

```bash
npm install
```

## Usage

Run the script with:

```bash
node scraper.js
```

The script will:
1. Visit the PureGym locations page
2. Collect all active gym locations (excluding "opening soon" locations)
3. Visit each gym's page to collect:
   - Membership price
   - Address
4. Save the results in `gym-prices.json`

The output JSON file will contain an array of objects with the following structure:
```json
{
  "name": "Gym Name",
  "url": "https://www.puregym.com/gyms/location",
  "price": 19.99,
  "address": "123 Example Street, City, Postcode"
}
```

Note: If there's an error processing a particular gym, the price and address will be null and an error message will be included.
