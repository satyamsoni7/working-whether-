/**
 * Interactive Map Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const mapContainer = document.getElementById('weather-map');
  const mapLocationTitle = document.getElementById('map-location-title');
  if (!mapContainer) return;

  // 1. Get saved location from localStorage (fallback to New Delhi)
  const defaultLocation = { name: 'New Delhi', country: 'India', admin1: 'Delhi', latitude: 28.6139, longitude: 77.2090 };
  const loc = JSON.parse(localStorage.getItem('weather_app_location')) || defaultLocation;

  // Update Title
  const stateStr = loc.admin1 ? `${loc.admin1}, ` : '';
  mapLocationTitle.textContent = `${loc.name}, ${stateStr}${loc.country}`;

  // 2. Initialize Leaflet Map
  const map = L.map('weather-map').setView([loc.latitude, loc.longitude], 10);

  // Use standard OpenStreetMap (Original Map) which does not require an API key
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  // 3. Custom weather icon marker
  // Fetch current weather to show an icon on the map
  let iconHtml = `<div style="background: var(--accent-blue); width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`;
  let tempText = "";
  
  if (window.WeatherAPI) {
    try {
      const data = await window.WeatherAPI.getWeatherData(loc.latitude, loc.longitude);
      if (data && data.forecast) {
        const current = data.forecast.current;
        const wInfo = window.WeatherAPI.interpretWeatherCode(current.weather_code, current.is_day);
        const temp = Math.round(current.temperature_2m);
        tempText = `${temp}°C`;
        iconHtml = `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 50px; height: 50px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));">
              ${wInfo.iconSvg}
            </div>
            <div style="background: var(--bg-card); color: white; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 14px; margin-top: -5px; border: 1px solid rgba(255,255,255,0.2);">
              ${tempText}
            </div>
          </div>
        `;
      }
    } catch (e) {
      console.warn("Failed to fetch weather for map marker", e);
    }
  }

  const weatherIcon = L.divIcon({
    html: iconHtml,
    className: 'custom-weather-marker',
    iconSize: [60, 60],
    iconAnchor: [30, 30]
  });

  // Add marker to map
  L.marker([loc.latitude, loc.longitude], { icon: weatherIcon }).addTo(map)
    .bindPopup(`<b>${loc.name}</b><br>Current condition`)
    .openPopup();
});
