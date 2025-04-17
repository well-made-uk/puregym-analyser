# PureGym Price Map

An interactive map tool that helps you find the best value PureGym membership for your area. View gym locations, filter by price, and see which gyms you can access with a Premium membership.

## 🎯 Features

- **Interactive Map**: See all PureGym locations across the UK
- **Price Filter**: Filter gyms by monthly membership price
- **Premium Access**: Easily see which gyms you can access with your membership
- **Detailed Information**: Click on any gym to see its details, price, and direct link
- **Mobile Friendly**: Works great on both desktop and mobile devices

## 🚀 Live Demo

Visit the live site at: [PureGym Price Map](https://puregym.well-made.uk)

## 💡 How It Works

1. Use the price slider to set your maximum monthly budget
2. Click on any pin to see detailed gym information
3. The map will show you all gyms available at or below your selected price
4. Premium memberships allow access to any gym at or below your home gym's price

## 🛠️ Developer Information

### Prerequisites

- Node.js 14+
- A modern web browser

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/well-made-uk/puregym-analyser.git
   cd puregym-analyser
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the scraper to update gym data:
   ```bash
   node scraper.js
   ```
   This will create/update `gym-prices.json` with the latest gym information.

4. Start a local server:
   ```bash
   python -m http.server 8080
   # or use any other static file server
   ```

5. Visit `http://localhost:8080` in your browser

### Project Structure

- `index.html` - Main application with map interface
- `scraper.js` - Scrapes PureGym website for location and price data
- `price-analyzer.js` - Analyzes price data and generates statistics
- `gym-prices.json` - Generated data file with gym information

## 📝 Notes

- Data is scraped from the PureGym website and is not officially affiliated with PureGym
- Prices and locations are updated periodically but may not reflect real-time changes
- Some gyms might not appear on the map due to address lookup limitations

## 📜 License

MIT License - See LICENSE file for details

## 🙏 Credits

Created by [Ben Found](https://well-made.uk)

Uses [Leaflet](https://leafletjs.com/) for mapping and [Tailwind CSS](https://tailwindcss.com/) for styling.
