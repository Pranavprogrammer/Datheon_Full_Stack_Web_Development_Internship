(() => {
  'use strict';

  const config = window.SKYCAST_CONFIG || {};
  const API_KEY = (config.API_KEY || '').trim();
  const BASE_URL = 'https://api.openweathermap.org/data/2.5';
  const state = { unit: 'metric', lastWeather: null, lastForecast: null };
  const $ = (selector) => document.querySelector(selector);

  const weatherDashboard = $('#weatherDashboard');
  const welcomePanel = $('#welcomePanel');
  const loadingState = $('#loadingState');
  const errorMessage = $('#errorMessage');
  const searchButton = $('#searchButton');
  const cityInput = $('#cityInput');

  const icons = {
    clear: { day: '☀️', night: '🌙', theme: 'sunny' },
    clouds: { day: '☁️', night: '☁️', theme: 'cloudy' },
    rain: { day: '🌧️', night: '🌧️', theme: 'rainy' },
    drizzle: { day: '🌦️', night: '🌧️', theme: 'rainy' },
    thunderstorm: { day: '⛈️', night: '⛈️', theme: 'rainy' },
    snow: { day: '❄️', night: '❄️', theme: 'cloudy' },
    mist: { day: '🌫️', night: '🌫️', theme: 'cloudy' },
    smoke: { day: '🌫️', night: '🌫️', theme: 'cloudy' },
    haze: { day: '🌫️', night: '🌫️', theme: 'cloudy' },
    dust: { day: '🌫️', night: '🌫️', theme: 'cloudy' },
    fog: { day: '🌫️', night: '🌫️', theme: 'cloudy' },
    sand: { day: '🌫️', night: '🌫️', theme: 'cloudy' },
    ash: { day: '🌫️', night: '🌫️', theme: 'cloudy' },
    squall: { day: '🌬️', night: '🌬️', theme: 'cloudy' },
    tornado: { day: '🌪️', night: '🌪️', theme: 'rainy' }
  };

  function getIcon(condition, isNight = false) {
    const key = String(condition || '').toLowerCase();
    return (icons[key] || icons.clouds)[isNight ? 'night' : 'day'];
  }

  function toDisplayTemperature(celsius) {
    if (!Number.isFinite(celsius)) return '—';
    const value = state.unit === 'metric' ? celsius : celsius * 9 / 5 + 32;
    return `${Math.round(value)}°`;
  }

  function toDisplayWind(metersPerSecond) {
    if (!Number.isFinite(metersPerSecond)) return '—';
    const value = state.unit === 'metric' ? metersPerSecond * 3.6 : metersPerSecond * 2.23694;
    return `${value.toFixed(1)} ${state.unit === 'metric' ? 'km/h' : 'mph'}`;
  }

  function safeText(selector, value) {
    $(selector).textContent = value;
  }

  function showLoading(isLoading) {
    loadingState.hidden = !isLoading;
    searchButton.disabled = isLoading;
    searchButton.innerHTML = isLoading ? '<span>Loading…</span><span>↻</span>' : '<span>Search</span><span aria-hidden="true">→</span>';
    searchButton.setAttribute('aria-busy', String(isLoading));
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = !message;
  }

  function weatherTheme(main) {
    const lower = String(main || '').toLowerCase();
    const theme = (icons[lower] || icons.clouds).theme;
    document.dispatchEvent(new CustomEvent('weather:theme', { detail: theme }));
  }

  function friendlyDate(timestamp, options = { weekday: 'short', month: 'short', day: 'numeric' }) {
    return new Intl.DateTimeFormat(undefined, options).format(new Date(timestamp * 1000));
  }

  function formatLocalTime(timezoneOffsetSeconds) {
    const now = Date.now() + timezoneOffsetSeconds * 1000;
    return `Local time · ${new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC'
    }).format(new Date(now))}`;
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    let data;
    try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('The API key was rejected. Check js/config.js and make sure your OpenWeatherMap key is active.');
      }
      if (response.status === 404) throw new Error('We couldn’t find that city. Check the spelling and try again.');
      if (response.status === 429) throw new Error('Weather API request limit reached. Please wait a moment and try again.');
      throw new Error(data.message ? `Weather service: ${data.message}` : 'The weather service is temporarily unavailable. Please try again.');
    }
    return data;
  }

  async function searchWeather(city) {
    const trimmedCity = city.trim();
    if (!trimmedCity) {
      showError('Enter a city name to search.');
      cityInput.focus();
      return;
    }
    showError('');
    showLoading(true);
    try {
      if (!API_KEY || API_KEY === 'PASTE_YOUR_OPENWEATHERMAP_API_KEY_HERE') {
        throw new Error('Add your free OpenWeatherMap API key in js/config.js, then refresh the page. See README.md for setup instructions.');
      }
      const query = encodeURIComponent(trimmedCity);
      const [current, forecast] = await Promise.all([
        fetchJson(`${BASE_URL}/weather?q=${query}&appid=${encodeURIComponent(API_KEY)}&units=metric`),
        fetchJson(`${BASE_URL}/forecast?q=${query}&appid=${encodeURIComponent(API_KEY)}&units=metric`)
      ]);
      state.lastWeather = current;
      state.lastForecast = forecast;
      renderDashboard(current, forecast);
      weatherDashboard.hidden = false;
      welcomePanel.hidden = true;
      weatherTheme(current.weather?.[0]?.main);
    } catch (error) {
      console.error('Weather search failed:', error);
      showError(error.message || 'Unable to fetch weather. Please try again.');
    } finally {
      showLoading(false);
    }
  }

  function renderDashboard(current, forecast) {
    const condition = current.weather?.[0]?.main || 'Clouds';
    const description = current.weather?.[0]?.description || condition;
    const iconCode = current.weather?.[0]?.icon || '';
    const isNight = iconCode.endsWith('n');
    safeText('#cityName', `${current.name || 'Unknown city'}${current.sys?.country ? `, ${current.sys.country}` : ''}`);
    safeText('#localTime', formatLocalTime(current.timezone || 0));
    safeText('#currentIcon', getIcon(condition, isNight));
    safeText('#currentTemp', toDisplayTemperature(current.main?.temp));
    safeText('#conditionText', description.charAt(0).toUpperCase() + description.slice(1));
    safeText('#feelsLike', `Feels like ${toDisplayTemperature(current.main?.feels_like)}`);
    safeText('#highLow', `H: ${toDisplayTemperature(current.main?.temp_max)} · L: ${toDisplayTemperature(current.main?.temp_min)}`);
    safeText('#humidity', `${current.main?.humidity ?? '—'}%`);
    safeText('#windSpeed', toDisplayWind(current.wind?.speed));
    safeText('#pressure', `${current.main?.pressure ?? '—'} hPa`);
    safeText('#visibility', Number.isFinite(current.visibility) ? `${(current.visibility / 1000).toFixed(1)} km` : '—');
    renderForecast(forecast);
  }

  function groupForecastByDay(forecast) {
    const groups = new Map();
    const now = Date.now();
    for (const entry of (forecast.list || [])) {
      const date = new Date(entry.dt * 1000);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      // Prefer entries close to midday for a useful daily temperature/condition.
      const hour = date.getHours();
      const score = Math.abs(hour - 12);
      if (!groups.has(key) || score < groups.get(key).score) {
        groups.set(key, { entry, score, timestamp: entry.dt });
      }
    }
    return [...groups.values()]
      .filter(group => group.timestamp * 1000 > now - 3 * 60 * 60 * 1000)
      .slice(0, 5)
      .map(group => group.entry);
  }

  function renderForecast(forecast) {
    const days = groupForecastByDay(forecast);
    $('#forecastGrid').innerHTML = days.map((entry, index) => {
      const condition = entry.weather?.[0]?.main || 'Clouds';
      const description = entry.weather?.[0]?.description || condition;
      const icon = getIcon(condition, String(entry.weather?.[0]?.icon || '').endsWith('n'));
      const day = index === 0 ? 'Today' : friendlyDate(entry.dt, { weekday: 'short' });
      return `<article class="forecast-day">
        <div class="day-name">${day}</div>
        <div class="day-date">${friendlyDate(entry.dt, { month: 'short', day: 'numeric' })}</div>
        <div class="forecast-icon" aria-hidden="true">${icon}</div>
        <div class="forecast-condition">${escapeHtml(description)}</div>
        <div class="forecast-temps"><span>${toDisplayTemperature(entry.main?.temp_max)}</span><span class="low">${toDisplayTemperature(entry.main?.temp_min)}</span></div>
      </article>`;
    }).join('');
    if (!days.length) {
      $('#forecastGrid').innerHTML = '<p>Forecast data is not available for this location right now.</p>';
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  $('#searchForm').addEventListener('submit', event => {
    event.preventDefault();
    searchWeather(cityInput.value);
  });

  $('#unitToggle').addEventListener('click', () => {
    state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
    const toggle = $('#unitToggle');
    toggle.innerHTML = state.unit === 'metric'
      ? '<span class="selected">°C</span> <span>/</span> °F'
      : '°C <span>/</span> <span class="selected">°F</span>';
    if (state.lastWeather && state.lastForecast) renderDashboard(state.lastWeather, state.lastForecast);
  });

  // Start in a useful, clear state and offer a sample search after API key is configured.
  if (API_KEY && API_KEY !== 'PASTE_YOUR_OPENWEATHERMAP_API_KEY_HERE') {
    cityInput.value = 'Jaipur';
    searchWeather('Jaipur');
  } else {
    showError('Setup required: add your free OpenWeatherMap API key in js/config.js to load live weather data.');
  }
})();
