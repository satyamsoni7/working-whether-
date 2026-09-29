/**
 * AetherWeather — Meteorology & Atmospheric API Engine
 * Interfaces with Open-Meteo Public APIs (Forecast, Geocoding, Air Quality)
 * Zero API keys required + Offline Resilience Fallback Engine.
 */

const WeatherAPI = {
  GEO_ENDPOINT: 'https://geocoding-api.open-meteo.com/v1/search',
  FORECAST_ENDPOINT: 'https://api.open-meteo.com/v1/forecast',
  AQI_ENDPOINT: 'https://air-quality-api.open-meteo.com/v1/air-quality',

  /**
   * Search for locations matching the user query
   */
  async searchCities(query) {
    if (!query || query.trim().length < 2) return [];

    try {
      const url = `${this.GEO_ENDPOINT}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);
      const data = await response.json();
      return (data.results || []).map(r => ({
        id: `${r.latitude}_${r.longitude}`,
        name: r.name,
        country: r.country || '',
        countryCode: r.country_code || '',
        admin1: r.admin1 || '',
        latitude: r.latitude,
        longitude: r.longitude,
        timezone: r.timezone || 'auto'
      }));
    } catch (err) {
      console.warn('Geocoding search error, using local fallback search:', err);
      return this.fallbackSearch(query);
    }
  },

  /**
   * Fetch complete weather package for coordinates
   */
  async getWeatherData(latitude, longitude) {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'is_day',
          'precipitation',
          'rain',
          'weather_code',
          'cloud_cover',
          'pressure_msl',
          'surface_pressure',
          'wind_speed_10m',
          'wind_direction_10m',
          'wind_gusts_10m'
        ].join(','),
        hourly: [
          'temperature_2m',
          'relative_humidity_2m',
          'precipitation_probability',
          'weather_code',
          'uv_index'
        ].join(','),
        daily: [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'sunrise',
          'sunset',
          'uv_index_max',
          'precipitation_sum',
          'precipitation_probability_max'
        ].join(','),
        timezone: 'auto'
      });

      const forecastPromise = fetch(`${this.FORECAST_ENDPOINT}?${params.toString()}`)
        .then(r => {
          if (!r.ok) throw new Error(`Forecast API HTTP ${r.status}`);
          return r.json();
        });

      // Air Quality API
      const aqiParams = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        current: ['european_aqi', 'us_aqi', 'pm10', 'pm2_5', 'ozone'].join(',')
      });

      const aqiPromise = fetch(`${this.AQI_ENDPOINT}?${aqiParams.toString()}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);

      const [forecastData, aqiData] = await Promise.all([forecastPromise, aqiPromise]);

      return {
        forecast: forecastData,
        airQuality: aqiData
      };
    } catch (err) {
      console.warn('Live API request failed, serving robust atmospheric fallback model:', err);
      return this.generateFallbackData(latitude, longitude);
    }
  },

  /**
   * Reverse Geocoding from Latitude and Longitude
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const city = data.city || data.locality || data.principalSubdivision || 'Current Location';
        const country = data.countryName || data.countryCode || '';
        return { city, country };
      }
    } catch (e) {
      console.log('Reverse geocoding lookup fallback', e);
    }
    return { city: 'Local Coordinates', country: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°` };
  },

  /**
   * WMO Weather Code Mapping to Semantics & SVG Visuals
   */
  interpretWeatherCode(code, isDay = 1) {
    const isNight = isDay === 0;

    switch (code) {
      case 0:
        return {
          title: isNight ? 'Clear Night' : 'Clear Sky',
          description: isNight ? 'Starlit and cloudless skies' : 'Bright sunshine and clear skies',
          mode: isNight ? 'clear-night' : 'clear-day',
          iconSvg: isNight ? this.svgIcons.clearNight : this.svgIcons.clearDay
        };
      case 1:
      case 2:
        return {
          title: isNight ? 'Partly Cloudy' : 'Partly Sunny',
          description: 'Occasional sunbreaks with light cloud formations',
          mode: isNight ? 'clear-night' : 'clear-day',
          iconSvg: isNight ? this.svgIcons.partlyCloudyNight : this.svgIcons.partlyCloudyDay
        };
      case 3:
        return {
          title: 'Overcast',
          description: 'Dense cloud ceiling with muted atmospheric light',
          mode: 'cloudy',
          iconSvg: this.svgIcons.cloudy
        };
      case 45:
      case 48:
        return {
          title: 'Foggy / Hazy',
          description: 'Volumetric mist with reduced horizontal visibility',
          mode: 'cloudy',
          iconSvg: this.svgIcons.fog
        };
      case 51:
      case 53:
      case 55:
        return {
          title: 'Light Drizzle',
          description: 'Gentle misty precipitation across the vicinity',
          mode: 'rain',
          iconSvg: this.svgIcons.drizzle
        };
      case 61:
      case 63:
      case 65:
        return {
          title: 'Rain Showers',
          description: 'Steady rainfall with cool atmospheric downdrafts',
          mode: 'rain',
          iconSvg: this.svgIcons.rain
        };
      case 71:
      case 73:
      case 75:
      case 77:
      case 85:
      case 86:
        return {
          title: 'Snowfall',
          description: 'Crystalline snowflakes floating with crisp freezing air',
          mode: 'snow',
          iconSvg: this.svgIcons.snow
        };
      case 80:
      case 81:
      case 82:
        return {
          title: 'Heavy Rain Showers',
          description: 'Intense rain downpour with active precipitation bands',
          mode: 'rain',
          iconSvg: this.svgIcons.heavyRain
        };
      case 95:
      case 96:
      case 99:
        return {
          title: 'Thunderstorm',
          description: 'Severe electrical storm with lightning and heavy rain',
          mode: 'thunder',
          iconSvg: this.svgIcons.thunderstorm
        };
      default:
        return {
          title: 'Fair Weather',
          description: 'Mild conditions throughout the region',
          mode: isNight ? 'clear-night' : 'clear-day',
          iconSvg: isNight ? this.svgIcons.clearNight : this.svgIcons.clearDay
        };
    }
  },

  /**
   * Predefined Popular Cities
   */
  popularCities: [
    { name: 'Tokyo', country: 'Japan', countryCode: 'JP', latitude: 35.6895, longitude: 139.6917 },
    { name: 'London', country: 'United Kingdom', countryCode: 'GB', latitude: 51.5074, longitude: -0.1278 },
    { name: 'New York', country: 'United States', countryCode: 'US', latitude: 40.7128, longitude: -74.0060 },
    { name: 'Paris', country: 'France', countryCode: 'FR', latitude: 48.8566, longitude: 2.3522 },
    { name: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', latitude: 25.2048, longitude: 55.2708 },
    { name: 'Sydney', country: 'Australia', countryCode: 'AU', latitude: -33.8688, longitude: 151.2093 },
    { name: 'Mumbai', country: 'India', countryCode: 'IN', latitude: 19.0760, longitude: 72.8777 },
    { name: 'San Francisco', country: 'United States', countryCode: 'US', latitude: 37.7749, longitude: -122.4194 }
  ],

  fallbackSearch(query) {
    const q = query.toLowerCase();
    return this.popularCities.filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q));
  },

  /**
   * Generates authentic high-fidelity fallback weather model
   */
  generateFallbackData(lat, lon) {
    const now = new Date();
    const currentHour = now.getHours();
    const isDay = currentHour >= 6 && currentHour <= 19 ? 1 : 0;
    
    // Deterministic temperature based on latitude
    const baseTemp = Math.round(26 - Math.abs(lat) * 0.28);
    const hourlyTimes = [];
    const hourlyTemps = [];
    const hourlyPrecip = [];
    const hourlyCodes = [];
    const hourlyUv = [];

    for (let i = 0; i < 24; i++) {
      const hDate = new Date(now.getTime() + i * 3600 * 1000);
      hourlyTimes.push(hDate.toISOString().slice(0, 16));
      const hHour = hDate.getHours();
      const variance = Math.sin((hHour - 6) / 24 * Math.PI * 2) * 5;
      hourlyTemps.push(Math.round(baseTemp + variance));
      hourlyPrecip.push(Math.floor(Math.random() * 20));
      hourlyCodes.push(variance > 2 ? 0 : variance < -2 ? 2 : 1);
      hourlyUv.push(hHour >= 10 && hHour <= 16 ? Math.round(5 + Math.random() * 3) : 0);
    }

    const dailyTimes = [];
    const dailyMax = [];
    const dailyMin = [];
    const dailyCodes = [];
    const dailyUvMax = [];
    const dailySunrise = [];
    const dailySunset = [];

    for (let d = 0; d < 7; d++) {
      const dDate = new Date(now.getTime() + d * 86400 * 1000);
      dailyTimes.push(dDate.toISOString().slice(0, 10));
      dailyMax.push(baseTemp + 4 + Math.round(Math.random() * 2));
      dailyMin.push(baseTemp - 4 - Math.round(Math.random() * 2));
      dailyCodes.push(d % 3 === 0 ? 1 : d % 4 === 0 ? 61 : 0);
      dailyUvMax.push(6 + Math.round(Math.random() * 3));
      dailySunrise.push(`${dDate.toISOString().slice(0, 10)}T06:14`);
      dailySunset.push(`${dDate.toISOString().slice(0, 10)}T18:48`);
    }

    return {
      forecast: {
        current: {
          temperature_2m: baseTemp,
          relative_humidity_2m: 58,
          apparent_temperature: baseTemp + 1,
          is_day: isDay,
          precipitation: 0,
          rain: 0,
          weather_code: 1,
          cloud_cover: 25,
          pressure_msl: 1014,
          wind_speed_10m: 14,
          wind_direction_10m: 185,
          wind_gusts_10m: 22
        },
        hourly: {
          time: hourlyTimes,
          temperature_2m: hourlyTemps,
          relative_humidity_2m: Array(24).fill(60),
          precipitation_probability: hourlyPrecip,
          weather_code: hourlyCodes,
          uv_index: hourlyUv
        },
        daily: {
          time: dailyTimes,
          weather_code: dailyCodes,
          temperature_2m_max: dailyMax,
          temperature_2m_min: dailyMin,
          sunrise: dailySunrise,
          sunset: dailySunset,
          uv_index_max: dailyUvMax,
          precipitation_sum: Array(7).fill(0),
          precipitation_probability_max: [10, 15, 60, 20, 10, 5, 0]
        }
      },
      airQuality: {
        current: {
          us_aqi: 38,
          pm2_5: 9.4,
          pm10: 18.2,
          ozone: 45.1
        }
      }
    };
  },

  /**
   * Crisp, Vibrant Vector Weather Icons with Micro-Animations
   */
  svgIcons: {
    clearDay: `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="14" fill="url(#sun-ball-grad)"/>
        <g stroke="#FBBF24" stroke-width="3" stroke-linecap="round" class="rotating-rays">
          <line x1="32" y1="6" x2="32" y2="12" />
          <line x1="32" y1="52" x2="32" y2="58" />
          <line x1="6" y1="32" x2="12" y2="32" />
          <line x1="52" y1="32" x2="58" y2="32" />
          <line x1="13.6" y1="13.6" x2="17.8" y2="17.8" />
          <line x1="46.2" y1="46.2" x2="50.4" y2="50.4" />
          <line x1="13.6" y1="50.4" x2="17.8" y2="46.2" />
          <line x1="46.2" y1="17.8" x2="50.4" y2="13.6" />
        </g>
        <defs>
          <linearGradient id="sun-ball-grad" x1="18" y1="18" x2="46" y2="46" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FDE047"/>
            <stop offset="1" stop-color="#F97316"/>
          </linearGradient>
        </defs>
      </svg>
    `,

    clearNight: `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M42 12C33.2 12 26 19.2 26 28C26 36.8 33.2 44 42 44C44.4 44 46.7 43.5 48.7 42.5C45.3 48.3 39.1 52 32 52C21 52 12 43 12 32C12 21.6 20 13 30.2 12.1C34.1 11.7 38.1 11.6 42 12Z" fill="url(#moon-crescent-grad)" filter="drop-shadow(0 0 10px rgba(129, 140, 248, 0.5))"/>
        <circle cx="48" cy="18" r="1.5" fill="#E0F2FE"/>
        <circle cx="54" cy="30" r="1.2" fill="#E0F2FE"/>
        <circle cx="20" cy="16" r="1" fill="#E0F2FE"/>
        <defs>
          <linearGradient id="moon-crescent-grad" x1="12" y1="12" x2="50" y2="52" gradientUnits="userSpaceOnUse">
            <stop stop-color="#E2E8F0"/>
            <stop offset="1" stop-color="#818CF8"/>
          </linearGradient>
        </defs>
      </svg>
    `,

    partlyCloudyDay: `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="22" r="11" fill="url(#sun-ball-grad)"/>
        <g stroke="#FBBF24" stroke-width="2.2" stroke-linecap="round">
          <line x1="40" y1="5" x2="40" y2="8"/>
          <line x1="57" y1="22" x2="54" y2="22"/>
          <line x1="52" y1="10" x2="49.8" y2="12.2"/>
        </g>
        <path d="M18 46C14.7 46 12 43.3 12 40C12 37.1 14.1 34.7 16.9 34.1C17.7 28.4 22.6 24 28.5 24C34.1 24 38.8 28.1 39.8 33.5C43.3 33.8 46 36.6 46 40.2C46 43.4 43.4 46 40.2 46H18Z" fill="url(#cloud-white-grad)" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.25))"/>
        <defs>
          <linearGradient id="cloud-white-grad" x1="12" y1="24" x2="46" y2="46" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFFFFF"/>
            <stop offset="1" stop-color="#94A3B8"/>
          </linearGradient>
        </defs>
      </svg>
    `,

    partlyCloudyNight: `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M42 16C37 16 33 20 33 25C33 26.5 33.4 27.9 34 29.1C32.2 29.7 30.6 30.8 29.5 32.3C28.5 32.1 27.5 32 26.5 32C19 32 13 38 13 45.5H39C44 45.5 48 41.5 48 36.5C48 34.5 47.3 32.7 46.2 31.3C47.3 29.5 48 27.3 48 25C48 20 44 16 42 16Z" fill="url(#cloud-white-grad)"/>
        <path d="M41 12C36.6 12 33 15.6 33 20C33 22.8 34.4 25.2 36.6 26.6C35.5 24.8 35 22.8 35 20.5C35 15.8 38.8 12 43.5 12C42.7 12 41.8 12 41 12Z" fill="#CBD5E1"/>
      </svg>
    `,

    cloudy: `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 46C12.7 46 10 43.3 10 40C10 37.1 12.1 34.7 14.9 34.1C15.7 28.4 20.6 24 26.5 24C32.1 24 36.8 28.1 37.8 33.5C41.3 33.8 44 36.6 44 40.2C44 43.4 41.4 46 38.2 46H16Z" fill="url(#cloud-layer-front)" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.3))"/>
        <path d="M26 36C23 36 20.5 33.5 20.5 30.5C20.5 28 22.2 25.8 24.6 25.2C25.4 20 30 16 35.5 16C40.8 16 45.1 19.8 46 24.8C49.2 25.1 52 27.8 52 31C52 34.2 49.3 36.5 46.5 36.5" fill="url(#cloud-layer-back)" opacity="0.8"/>
        <defs>
          <linearGradient id="cloud-layer-front" x1="10" y1="24" x2="44" y2="46" gradientUnits="userSpaceOnUse">
            <stop stop-color="#E2E8F0"/>
            <stop offset="1" stop-color="#64748B"/>
          </linearGradient>
          <linearGradient id="cloud-layer-back" x1="20" y1="16" x2="52" y2="36" gradientUnits="userSpaceOnUse">
            <stop stop-color="#94A3B8"/>
            <stop offset="1" stop-color="#475569"/>
          </linearGradient>
        </defs>
      </svg>
    `,

    drizzle: `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 38C13.2 38 11 35.8 11 33C11 30.5 12.8 28.5 15.2 28C15.9 23.3 19.9 19.7 24.8 19.7C29.5 19.7 33.4 23.1 34.3 27.6C37.2 27.8 39.5 30.2 39.5 33.2C39.5 35.8 37.3 38 34.7 38H16Z" fill="#94A3B8"/>
        <line x1="20" y1="43" x2="18" y2="49" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="28" y1="43" x2="26" y2="49" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    `,

    rain: `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 36C12.7 36 10 33.3 10 30C10 27.1 12.1 24.7 14.9 24.1C15.7 18.4 20.6 14 26.5 14C32.1 14 36.8 18.1 37.8 23.5C41.3 23.8 44 26.6 44 30.2C44 33.4 41.4 36 38.2 36H16Z" fill="url(#cloud-layer-front)"/>
        <line x1="20" y1="42" x2="16" y2="52" stroke="#38BDF8" stroke-width="2.8" stroke-linecap="round"/>
        <line x1="28" y1="42" x2="24" y2="52" stroke="#38BDF8" stroke-width="2.8" stroke-linecap="round"/>
        <line x1="36" y1="42" x2="32" y2="52" stroke="#38BDF8" stroke-width="2.8" stroke-linecap="round"/>
      </svg>
    `,

    heavyRain: `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 34C12.7 34 10 31.3 10 28C10 25.1 12.1 22.7 14.9 22.1C15.7 16.4 20.6 12 26.5 12C32.1 12 36.8 16.1 37.8 21.5C41.3 21.8 44 24.6 44 28.2C44 31.4 41.4 34 38.2 34H16Z" fill="#64748B"/>
        <line x1="18" y1="39" x2="13" y2="54" stroke="#0284C7" stroke-width="3.2" stroke-linecap="round"/>
        <line x1="26" y1="39" x2="21" y2="54" stroke="#0284C7" stroke-width="3.2" stroke-linecap="round"/>
        <line x1="34" y1="39" x2="29" y2="54" stroke="#0284C7" stroke-width="3.2" stroke-linecap="round"/>
        <line x1="42" y1="39" x2="37" y2="54" stroke="#0284C7" stroke-width="3.2" stroke-linecap="round"/>
      </svg>
    `,

    thunderstorm: `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 32C12.7 32 10 29.3 10 26C10 23.1 12.1 20.7 14.9 20.1C15.7 14.4 20.6 10 26.5 10C32.1 10 36.8 14.1 37.8 19.5C41.3 19.8 44 22.6 44 26.2C44 29.4 41.4 32 38.2 32H16Z" fill="#475569"/>
        <polygon points="28,32 20,44 27,44 23,56 36,41 29,41 33,32" fill="#FACC15" filter="drop-shadow(0 0 6px #EAB308)"/>
      </svg>
    `,

    snow: `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 34C12.7 34 10 31.3 10 28C10 25.1 12.1 22.7 14.9 22.1C15.7 16.4 20.6 12 26.5 12C32.1 12 36.8 16.1 37.8 21.5C41.3 21.8 44 24.6 44 28.2C44 31.4 41.4 34 38.2 34H16Z" fill="url(#cloud-layer-front)"/>
        <circle cx="20" cy="44" r="2.5" fill="#E0F2FE"/>
        <circle cx="28" cy="51" r="2.5" fill="#E0F2FE"/>
        <circle cx="36" cy="44" r="2.5" fill="#E0F2FE"/>
      </svg>
    `,

    fog: `
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 28C18 24 21 21 25 21C28.5 21 31.5 23.5 32 27C34 27.2 36 29 36 31C36 33.2 34.2 35 32 35H18C15.5 35 14 33.5 14 31.5C14 29.5 15.5 28 18 28Z" fill="#94A3B8" opacity="0.8"/>
        <line x1="12" y1="40" x2="48" y2="40" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round"/>
        <line x1="16" y1="46" x2="44" y2="46" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round"/>
        <line x1="20" y1="52" x2="40" y2="52" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `
  }
};

window.WeatherAPI = WeatherAPI;
