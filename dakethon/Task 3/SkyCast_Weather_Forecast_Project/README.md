# SkyCast — Real-Time Weather Forecast & Climate Telemetry App

A responsive weather dashboard built with HTML, CSS and vanilla JavaScript. It uses the OpenWeatherMap REST API to show current conditions and a five-day forecast for cities worldwide.

## Features
- Global city search.
- Current temperature, feels-like temperature, condition and dynamic weather emoji.
- Humidity, wind speed, atmospheric pressure and visibility.
- Five-day forecast cards using forecast API data.
- Loading indicator and friendly handling for invalid cities, missing/invalid API keys, network errors and API rate limits.
- Dynamic background theme based on weather conditions.
- Celsius/Fahrenheit display toggle and matching wind speed units.
- Responsive desktop and mobile layout.
- Asynchronous API requests using `fetch`, `async/await`, `Promise.all` and `try/catch`.

## Files
```text
weather_forecast_climate_telemetry/
├── index.html
├── README.md
├── css/
│   └── styles.css
└── js/
    ├── app.js
    └── config.js
```

## Setup and run
1. Create a free API key at [OpenWeatherMap](https://openweathermap.org/api).
2. Open `js/config.js`.
3. Replace `PASTE_YOUR_OPENWEATHERMAP_API_KEY_HERE` with your API key.
4. Save the file.
5. Open `index.html` in a browser, preferably with VS Code Live Server.
6. Search for a city such as Jaipur, London, Tokyo or New York.

**Note:** New OpenWeatherMap API keys may take some time to activate. If requests return an authorization error, check the key and try again later.

## API endpoints
- Current weather: `https://api.openweathermap.org/data/2.5/weather`
- Five-day forecast: `https://api.openweathermap.org/data/2.5/forecast`

The free forecast endpoint returns data in three-hour intervals. The app groups entries by local browser date and chooses a time slot near midday to represent each forecast day.

## Security note
This is a front-end learning project. An API key stored in `js/config.js` can be viewed by anyone who accesses the deployed source. Do not use a private or paid key in a public repository; for production, send API requests through a backend or another secure proxy. If publishing this repository publicly, consider leaving the placeholder in the committed file and adding your own key locally.

## Troubleshooting
- **Setup required message:** add your key to `js/config.js`.
- **City not found:** verify the city spelling.
- **401/unauthorized:** confirm the key is correct and active.
- **No network results:** check internet connectivity and retry.
