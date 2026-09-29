/**
 * AetherWeather — Meteorology API Engine
 */

const WeatherAPI = {
  GEO_ENDPOINT: 'https://geocoding-api.open-meteo.com/v1/search',
  FORECAST_ENDPOINT: 'https://api.open-meteo.com/v1/forecast',

  async searchCities(query) {
    if (!query || query.trim().length < 2) return [];
    try {
      const url = `${this.GEO_ENDPOINT}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
      const response = await fetch(url);
      const data = await response.json();
      return (data.results || []).map(r => ({
        name: r.name,
        country: r.country || '',
        admin1: r.admin1 || '',
        latitude: r.latitude,
        longitude: r.longitude
      }));
    } catch (err) {
      console.warn('Geocoding search error:', err);
      return [];
    }
  },

  async getWeatherData(latitude, longitude) {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        current: [
          'temperature_2m',
          'apparent_temperature',
          'is_day',
          'precipitation',
          'weather_code',
          'wind_speed_10m'
        ].join(','),
        hourly: [
          'time',
          'temperature_2m',
          'weather_code'
        ].join(','),
        daily: [
          'time',
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'uv_index_max',
          'precipitation_probability_max'
        ].join(','),
        timezone: 'auto'
      });

      const response = await fetch(`${this.FORECAST_ENDPOINT}?${params.toString()}`);
      if (!response.ok) throw new Error(`Forecast API HTTP ${response.status}`);
      const data = await response.json();
      return { forecast: data };
    } catch (err) {
      console.warn('API error:', err);
      return null;
    }
  },

  interpretWeatherCode(code, isDay = 1) {
    // 3D-styled SVGs for icons
    let iconSvg = '';
    let title = 'Sunny';

    // A gorgeous large SVG for a 3D sun
    const sunSvg = `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="24" fill="url(#sun-grad)"/>
        <g stroke="url(#ray-grad)" stroke-width="6" stroke-linecap="round">
          <line x1="50" y1="10" x2="50" y2="18"/>
          <line x1="50" y1="82" x2="50" y2="90"/>
          <line x1="10" y1="50" x2="18" y2="50"/>
          <line x1="82" y1="50" x2="90" y2="50"/>
          <line x1="21" y1="21" x2="27" y2="27"/>
          <line x1="73" y1="73" x2="79" y2="79"/>
          <line x1="21" y1="79" x2="27" y2="73"/>
          <line x1="73" y1="27" x2="79" y2="21"/>
        </g>
        <defs>
          <linearGradient id="sun-grad" x1="26" y1="26" x2="74" y2="74" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FCD34D"/>
            <stop offset="1" stop-color="#F59E0B"/>
          </linearGradient>
          <linearGradient id="ray-grad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FDE047"/>
            <stop offset="1" stop-color="#F59E0B"/>
          </linearGradient>
        </defs>
      </svg>
    `;

    const cloudSvg = `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M25 65C19.5 65 15 60.5 15 55C15 49.5 19.5 45 25 45C26 45 27 45.2 28 45.5C30.5 37 38 30 47.5 30C58 30 67 37.5 69.5 47.5C70 47.2 71 47 72 47C79.5 47 85 52.5 85 60C85 67.5 79.5 73 72 73H25C25 73 25 65 25 65Z" fill="url(#cloud-grad)" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"/>
        <defs>
          <linearGradient id="cloud-grad" x1="15" y1="30" x2="85" y2="73" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFFFFF"/>
            <stop offset="1" stop-color="#94A3B8"/>
          </linearGradient>
        </defs>
      </svg>
    `;

    const rainSvg = `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M25 55C19.5 55 15 50.5 15 45C15 39.5 19.5 35 25 35C26 35 27 35.2 28 35.5C30.5 27 38 20 47.5 20C58 20 67 27.5 69.5 37.5C70 37.2 71 37 72 37C79.5 37 85 42.5 85 50C85 57.5 79.5 63 72 63H25C25 63 25 55 25 55Z" fill="#64748B"/>
        <line x1="35" y1="70" x2="30" y2="85" stroke="#38BDF8" stroke-width="4" stroke-linecap="round"/>
        <line x1="50" y1="70" x2="45" y2="85" stroke="#38BDF8" stroke-width="4" stroke-linecap="round"/>
        <line x1="65" y1="70" x2="60" y2="85" stroke="#38BDF8" stroke-width="4" stroke-linecap="round"/>
      </svg>
    `;
    
    const stormSvg = `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M25 50C19.5 50 15 45.5 15 40C15 34.5 19.5 30 25 30C26 30 27 30.2 28 30.5C30.5 22 38 15 47.5 15C58 15 67 22.5 69.5 32.5C70 32.2 71 32 72 32C79.5 32 85 37.5 85 45C85 52.5 79.5 58 72 58H25C25 58 25 50 25 50Z" fill="#475569"/>
        <polygon points="50,55 40,75 52,75 45,95 65,65 52,65 60,55" fill="#FACC15" filter="drop-shadow(0 0 8px #FACC15)"/>
      </svg>
    `;

    if (code === 0 || code === 1) {
      title = 'Sunny';
      iconSvg = sunSvg;
    } else if (code === 2 || code === 3 || code === 45 || code === 48) {
      title = 'Cloudy';
      iconSvg = cloudSvg;
    } else if (code >= 51 && code <= 82) {
      title = 'Rainy';
      iconSvg = rainSvg;
    } else if (code >= 95) {
      title = 'Storm';
      iconSvg = stormSvg;
    } else {
      title = 'Clear';
      iconSvg = sunSvg;
    }

    return { title, iconSvg };
  }
};

window.WeatherAPI = WeatherAPI;
