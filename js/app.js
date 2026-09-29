/**
 * AetherWeather — Main Application Controller & View Orchestrator
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    currentLocation: {
      name: 'Tokyo',
      country: 'Japan',
      countryCode: 'JP',
      latitude: 35.6895,
      longitude: 139.6917
    },
    unit: localStorage.getItem('aether_unit') || 'celsius', // 'celsius' or 'fahrenheit'
    weatherData: null,
    savedCities: JSON.parse(localStorage.getItem('aether_saved_cities') || '[]'),
    canvasEngine: null,
    searchDebounceTimer: null
  };

  // DOM Elements
  const elements = {
    canvas: document.getElementById('weather-canvas'),
    cityName: document.getElementById('city-name'),
    countryBadge: document.getElementById('country-badge'),
    liveDatetime: document.getElementById('live-datetime'),
    coordsTag: document.getElementById('coords-tag'),
    conditionTag: document.getElementById('condition-tag'),
    heroIconContainer: document.getElementById('hero-icon-container'),
    currentTemp: document.getElementById('current-temp'),
    tempUnitDisplay: document.getElementById('temp-unit-display'),
    weatherConditionDesc: document.getElementById('weather-condition-desc'),
    todayHigh: document.getElementById('today-high'),
    todayLow: document.getElementById('today-low'),
    feelsLikeTemp: document.getElementById('feels-like-temp'),
    aiWeatherSummary: document.getElementById('ai-weather-summary'),
    
    // Hourly & 7-Day
    hourlyForecastList: document.getElementById('hourly-forecast-list'),
    weeklyForecastList: document.getElementById('weekly-forecast-list'),

    // Metrics
    aqiVal: document.getElementById('aqi-val'),
    aqiStatus: document.getElementById('aqi-status'),
    aqiMeterFill: document.getElementById('aqi-meter-fill'),
    pm25Val: document.getElementById('pm25-val'),
    pm10Val: document.getElementById('pm10-val'),
    o3Val: document.getElementById('o3-val'),

    windSpeed: document.getElementById('wind-speed'),
    windUnit: document.getElementById('wind-unit'),
    windDirectionText: document.getElementById('wind-direction-text'),
    windGusts: document.getElementById('wind-gusts'),
    windNeedle: document.getElementById('wind-needle'),

    uvIndexVal: document.getElementById('uv-index-val'),
    uvTier: document.getElementById('uv-tier'),
    uvThumb: document.getElementById('uv-thumb'),
    uvAdvice: document.getElementById('uv-advice'),

    sunriseTime: document.getElementById('sunrise-time'),
    sunsetTime: document.getElementById('sunset-time'),
    sunArcOrb: document.getElementById('sun-arc-orb'),
    sunPathPassed: document.getElementById('sun-path-passed'),

    humidityVal: document.getElementById('humidity-val'),
    humidityBar: document.getElementById('humidity-bar'),
    dewPointVal: document.getElementById('dew-point-val'),
    humidityDesc: document.getElementById('humidity-desc'),

    pressureVal: document.getElementById('pressure-val'),
    cloudCoverVal: document.getElementById('cloud-cover-val'),
    baroTrendText: document.getElementById('baro-trend-text'),

    // Moon & Advisory
    moonPhaseName: document.getElementById('moon-phase-name'),
    moonIllumination: document.getElementById('moon-illumination'),
    nextFullMoon: document.getElementById('next-full-moon'),
    moonShadowOverlay: document.getElementById('moon-shadow-overlay'),
    attireText: document.getElementById('attire-text'),
    activityText: document.getElementById('activity-text'),

    // Controls & Inputs
    searchInput: document.getElementById('city-search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    searchDropdown: document.getElementById('search-dropdown'),
    searchResultsList: document.getElementById('search-results-list'),
    geoBtn: document.getElementById('geo-location-btn'),
    unitCBtn: document.getElementById('unit-c-btn'),
    unitFBtn: document.getElementById('unit-f-btn'),
    particlesToggleBtn: document.getElementById('particles-toggle-btn'),
    bookmarkBtn: document.getElementById('bookmark-btn'),
    savedCitiesContainer: document.getElementById('saved-cities-container'),
    toast: document.getElementById('toast-notification'),
    toastText: document.getElementById('toast-text'),
    toastCloseBtn: document.getElementById('toast-close-btn')
  };

  // Initialize Canvas Atmospheric Physics
  try {
    state.canvasEngine = new WeatherCanvasEngine('weather-canvas');
  } catch (e) {
    console.warn('Canvas initialisation skipped', e);
  }

  // --- Temperature Conversion Utilities ---
  function toFahrenheit(c) {
    return Math.round((c * 9) / 5 + 32);
  }

  function formatTemp(celsiusVal) {
    if (celsiusVal === undefined || celsiusVal === null || isNaN(celsiusVal)) return '--';
    const temp = Math.round(celsiusVal);
    if (state.unit === 'fahrenheit') {
      return toFahrenheit(temp);
    }
    return temp;
  }

  function formatSpeed(kmhVal) {
    if (kmhVal === undefined || kmhVal === null || isNaN(kmhVal)) return { value: '--', unit: 'km/h' };
    if (state.unit === 'fahrenheit') {
      return { value: Math.round(kmhVal * 0.621371), unit: 'mph' };
    }
    return { value: Math.round(kmhVal), unit: 'km/h' };
  }

  // --- Toast Notifications ---
  let toastTimer = null;
  function showToast(message, icon = 'ℹ️') {
    if (toastTimer) clearTimeout(toastTimer);
    elements.toastText.textContent = message;
    elements.toast.querySelector('.toast-icon').textContent = icon;
    elements.toast.style.display = 'flex';
    toastTimer = setTimeout(() => {
      elements.toast.style.display = 'none';
    }, 4000);
  }

  elements.toastCloseBtn.addEventListener('click', () => {
    elements.toast.style.display = 'none';
  });

  // --- Bookmark Management ---
  function isLocationSaved(loc) {
    return state.savedCities.some(
      c => Math.abs(c.latitude - loc.latitude) < 0.05 && Math.abs(c.longitude - loc.longitude) < 0.05
    );
  }

  function updateBookmarkIcon() {
    const isSaved = isLocationSaved(state.currentLocation);
    if (isSaved) {
      elements.bookmarkBtn.classList.add('active');
      elements.bookmarkBtn.title = 'Remove from saved locations';
    } else {
      elements.bookmarkBtn.classList.remove('active');
      elements.bookmarkBtn.title = 'Save location to favorites';
    }
  }

  elements.bookmarkBtn.addEventListener('click', () => {
    const isSaved = isLocationSaved(state.currentLocation);
    if (isSaved) {
      state.savedCities = state.savedCities.filter(
        c => !(Math.abs(c.latitude - state.currentLocation.latitude) < 0.05 && Math.abs(c.longitude - state.currentLocation.longitude) < 0.05)
      );
      showToast(`Removed ${state.currentLocation.name} from saved favorites`, '🗑️');
    } else {
      state.savedCities.push({ ...state.currentLocation });
      showToast(`Saved ${state.currentLocation.name} to favorites`, '⭐');
    }
    localStorage.setItem('aether_saved_cities', JSON.stringify(state.savedCities));
    updateBookmarkIcon();
    renderQuickCities();
  });

  // --- Render Quick Cities Bar ---
  function renderQuickCities() {
    elements.savedCitiesContainer.innerHTML = '';

    // Merge saved custom cities with popular preset cities
    const list = [...state.savedCities];
    WeatherAPI.popularCities.forEach(p => {
      if (!list.some(item => item.name.toLowerCase() === p.name.toLowerCase())) {
        list.push(p);
      }
    });

    list.forEach(city => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'city-chip';
      const isActive = city.name.toLowerCase() === state.currentLocation.name.toLowerCase();
      if (isActive) chip.classList.add('active');

      const isUserSaved = state.savedCities.some(s => s.name.toLowerCase() === city.name.toLowerCase());

      chip.innerHTML = `
        <span>${isUserSaved ? '★ ' : ''}${city.name}</span>
      `;

      chip.addEventListener('click', () => {
        loadLocation(city);
      });

      elements.savedCitiesContainer.appendChild(chip);
    });
  }

  // --- Unit Toggle Handling ---
  function setUnit(unit) {
    if (state.unit === unit) return;
    state.unit = unit;
    localStorage.setItem('aether_unit', unit);

    if (unit === 'celsius') {
      elements.unitCBtn.classList.add('active');
      elements.unitCBtn.setAttribute('aria-pressed', 'true');
      elements.unitFBtn.classList.remove('active');
      elements.unitFBtn.setAttribute('aria-pressed', 'false');
      elements.tempUnitDisplay.textContent = '°C';
    } else {
      elements.unitFBtn.classList.add('active');
      elements.unitFBtn.setAttribute('aria-pressed', 'true');
      elements.unitCBtn.classList.remove('active');
      elements.unitCBtn.setAttribute('aria-pressed', 'false');
      elements.tempUnitDisplay.textContent = '°F';
    }

    if (state.weatherData) {
      renderAllWeatherData(state.weatherData);
    }
  }

  elements.unitCBtn.addEventListener('click', () => setUnit('celsius'));
  elements.unitFBtn.addEventListener('click', () => setUnit('fahrenheit'));

  // Initialize UI unit state
  if (state.unit === 'fahrenheit') {
    elements.unitFBtn.classList.add('active');
    elements.unitCBtn.classList.remove('active');
    elements.tempUnitDisplay.textContent = '°F';
  }

  // Toggle Canvas Visual Particle Effects
  elements.particlesToggleBtn.addEventListener('click', () => {
    if (!state.canvasEngine) return;
    const isRunning = state.canvasEngine.toggle();
    elements.particlesToggleBtn.classList.toggle('active', !isRunning);
    showToast(isRunning ? 'Atmospheric particle animation enabled' : 'Particle animation paused for performance', '✨');
  });

  // --- Live Autocomplete Search ---
  elements.searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    elements.clearSearchBtn.style.display = query.length > 0 ? 'flex' : 'none';

    if (state.searchDebounceTimer) clearTimeout(state.searchDebounceTimer);

    if (query.length < 2) {
      elements.searchDropdown.style.display = 'none';
      return;
    }

    state.searchDebounceTimer = setTimeout(async () => {
      const results = await WeatherAPI.searchCities(query);
      renderSearchResults(results);
    }, 280);
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.clearSearchBtn.style.display = 'none';
    elements.searchDropdown.style.display = 'none';
    elements.searchInput.focus();
  });

  function renderSearchResults(results) {
    elements.searchResultsList.innerHTML = '';
    if (!results || results.length === 0) {
      elements.searchResultsList.innerHTML = `
        <li class="search-item" style="cursor: default; opacity: 0.7;">
          <div class="search-item-info">
            <span class="search-item-city">No matching locations found</span>
            <span class="search-item-country">Try another city name or coordinates</span>
          </div>
        </li>
      `;
      elements.searchDropdown.style.display = 'block';
      return;
    }

    results.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'search-item';
      li.tabIndex = 0;
      li.innerHTML = `
        <div class="search-item-info">
          <span class="search-item-city">${item.name}</span>
          <span class="search-item-country">${item.admin1 ? item.admin1 + ', ' : ''}${item.country}</span>
        </div>
        <span class="search-item-coords">${item.latitude.toFixed(2)}°, ${item.longitude.toFixed(2)}°</span>
      `;

      const selectItem = () => {
        elements.searchInput.value = '';
        elements.clearSearchBtn.style.display = 'none';
        elements.searchDropdown.style.display = 'none';
        loadLocation({
          name: item.name,
          country: item.country,
          countryCode: item.countryCode,
          latitude: item.latitude,
          longitude: item.longitude
        });
      };

      li.addEventListener('click', selectItem);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') selectItem();
      });

      elements.searchResultsList.appendChild(li);
    });

    elements.searchDropdown.style.display = 'block';
  }

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-section')) {
      elements.searchDropdown.style.display = 'none';
    }
  });

  // --- GPS Location Button ---
  elements.geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', '⚠️');
      return;
    }

    elements.geoBtn.style.opacity = '0.5';
    showToast('Detecting atmospheric coordinates via GPS...', '🛰️');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        elements.geoBtn.style.opacity = '1';
        const { latitude, longitude } = pos.coords;
        const place = await WeatherAPI.reverseGeocode(latitude, longitude);
        loadLocation({
          name: place.city,
          country: place.country,
          countryCode: '',
          latitude,
          longitude
        });
        showToast(`Located: ${place.city}`, '📍');
      },
      (err) => {
        elements.geoBtn.style.opacity = '1';
        console.warn('Geolocation failed:', err);
        showToast('Location access denied or unavailable', '⚠️');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });

  // --- Astronomical Moon Phase Calculator ---
  function calculateMoonPhase(date = new Date()) {
    // Known new moon: Jan 11, 2024
    const knownNewMoon = new Date('2024-01-11T11:57:00Z');
    const synodicMonth = 29.53058867; // days
    const diffDays = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
    const phaseValue = (diffDays % synodicMonth + synodicMonth) % synodicMonth;
    const fraction = phaseValue / synodicMonth;
    const illumination = Math.round((1 - Math.cos(fraction * 2 * Math.PI)) / 2 * 100);

    let phaseName = 'New Moon';
    if (fraction >= 0.03 && fraction < 0.22) phaseName = 'Waxing Crescent';
    else if (fraction >= 0.22 && fraction < 0.28) phaseName = 'First Quarter';
    else if (fraction >= 0.28 && fraction < 0.47) phaseName = 'Waxing Gibbous';
    else if (fraction >= 0.47 && fraction < 0.53) phaseName = 'Full Moon';
    else if (fraction >= 0.53 && fraction < 0.72) phaseName = 'Waning Gibbous';
    else if (fraction >= 0.72 && fraction < 0.78) phaseName = 'Last Quarter';
    else if (fraction >= 0.78 && fraction < 0.97) phaseName = 'Waning Crescent';

    const daysToFull = Math.round((0.5 - fraction + 1) % 1 * synodicMonth);

    return {
      name: phaseName,
      illumination,
      fraction,
      daysToFull
    };
  }

  // --- Core Location Loader ---
  async function loadLocation(loc) {
    state.currentLocation = loc;
    updateBookmarkIcon();
    renderQuickCities();

    // Visual loading indication
    elements.cityName.textContent = loc.name;
    elements.countryBadge.textContent = loc.country || 'METEO';
    elements.coordsTag.textContent = `Lat: ${loc.latitude.toFixed(2)}°  Lon: ${loc.longitude.toFixed(2)}°`;
    elements.conditionTag.textContent = 'Updating...';

    const data = await WeatherAPI.getWeatherData(loc.latitude, loc.longitude);
    state.weatherData = data;
    renderAllWeatherData(data);
  }

  // --- Render All Weather Data to UI ---
  function renderAllWeatherData(data) {
    if (!data || !data.forecast) return;

    const current = data.forecast.current;
    const hourly = data.forecast.hourly;
    const daily = data.forecast.daily;
    const aqi = data.airQuality?.current || {};

    const weatherInfo = WeatherAPI.interpretWeatherCode(current.weather_code, current.is_day);

    // 1. Update Body Theme & Canvas Particle Engine
    document.body.className = `theme-${weatherInfo.mode}`;
    if (state.canvasEngine) {
      state.canvasEngine.setMode(weatherInfo.mode);
    }

    // 2. Hero Card Data
    elements.cityName.textContent = state.currentLocation.name;
    elements.countryBadge.textContent = state.currentLocation.country || 'LIVE';
    elements.conditionTag.textContent = weatherInfo.title;
    elements.weatherConditionDesc.textContent = weatherInfo.description;
    elements.heroIconContainer.innerHTML = weatherInfo.iconSvg;
    elements.currentTemp.textContent = formatTemp(current.temperature_2m);
    elements.feelsLikeTemp.textContent = `${formatTemp(current.apparent_temperature)}°`;

    // High and Low for today
    const highToday = daily?.temperature_2m_max?.[0];
    const lowToday = daily?.temperature_2m_min?.[0];
    elements.todayHigh.textContent = `${formatTemp(highToday)}°`;
    elements.todayLow.textContent = `${formatTemp(lowToday)}°`;

    // Local Date & Time
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    elements.liveDatetime.textContent = now.toLocaleDateString('en-US', options);

    // AI Weather Narrative Synthesis
    const windSpeedObj = formatSpeed(current.wind_speed_10m);
    elements.aiWeatherSummary.textContent = generateWeatherNarrative(current, weatherInfo, windSpeedObj);

    // 3. Hourly Forecast Ribbon (24 hours)
    renderHourlyForecast(hourly);

    // 4. 7-Day Forecast Outlook
    renderWeeklyForecast(daily);

    // 5. Air Quality Index
    renderAirQuality(aqi);

    // 6. Wind Dynamics
    renderWind(current);

    // 7. UV Index
    renderUV(daily?.uv_index_max?.[0] || hourly?.uv_index?.[0] || 3);

    // 8. Solar Arc (Sunrise & Sunset)
    renderSunCycle(daily?.sunrise?.[0], daily?.sunset?.[0]);

    // 9. Humidity & Dew Point
    renderHumidity(current.temperature_2m, current.relative_humidity_2m);

    // 10. Pressure & Clouds
    elements.pressureVal.textContent = Math.round(current.pressure_msl || 1013);
    elements.cloudCoverVal.textContent = Math.round(current.cloud_cover || 20);
    elements.baroTrendText.textContent = current.pressure_msl >= 1015
      ? 'High pressure system: Stable, dry atmosphere.'
      : current.pressure_msl <= 1005
      ? 'Low pressure trough: Precipitation potential elevated.'
      : 'Standard atmospheric pressure.';

    // 11. Moon Phase
    const moon = calculateMoonPhase(now);
    elements.moonPhaseName.textContent = moon.name;
    elements.moonIllumination.textContent = `${moon.illumination}%`;
    elements.nextFullMoon.textContent = moon.daysToFull === 0 ? 'Tonight!' : `In ${moon.daysToFull} days`;

    // Adjust visual moon shadow clip
    const shadowPct = Math.round((1 - moon.illumination / 100) * 100);
    elements.moonShadowOverlay.style.clipPath = `inset(0 0 0 ${moon.fraction < 0.5 ? shadowPct : 0}% / 0 ${moon.fraction >= 0.5 ? shadowPct : 0}% 0 0)`;

    // 12. Smart Lifestyle & Clothing Advisory
    renderSmartAdvisories(current, weatherInfo);
  }

  // --- Dynamic Atmospheric Narrative Generator ---
  function generateWeatherNarrative(current, info, wind) {
    const tempC = current.temperature_2m;
    let summary = '';

    if (current.weather_code >= 95) {
      summary = `Thunderstorm warning active. Expect lightning activity and wind gusts up to ${Math.round(current.wind_gusts_10m)} km/h. Keep indoors.`;
    } else if (current.weather_code >= 60 && current.weather_code < 70) {
      summary = `Rain showers ongoing. Atmospheric humidity is high at ${current.relative_humidity_2m}%. Carry an umbrella.`;
    } else if (current.weather_code >= 70 && current.weather_code < 80) {
      summary = `Snowfall recorded with icy conditions. Dress in thermal layers and drive cautiously.`;
    } else if (tempC > 30) {
      summary = `Intense warmth prevailing. Ensure regular hydration and seek shaded areas during peak solar radiation.`;
    } else if (tempC < 5) {
      summary = `Brisk, chilly air mass in place. Cold winds of ${wind.value} ${wind.unit} will enhance windchill.`;
    } else {
      summary = `Atmospheric conditions are pleasant with ${info.description.toLowerCase()}. Moderate ${wind.value} ${wind.unit} airflow.`;
    }

    return summary;
  }

  // --- Render Hourly Forecast Ribbon ---
  function renderHourlyForecast(hourly) {
    if (!hourly || !hourly.time) return;
    elements.hourlyForecastList.innerHTML = '';

    const currentHourIndex = 0;
    const hoursToDisplay = Math.min(24, hourly.time.length);

    for (let i = 0; i < hoursToDisplay; i++) {
      const timeStr = hourly.time[i];
      const hourDate = new Date(timeStr);
      const hourNum = hourDate.getHours();
      const isCurrentHour = i === 0;

      let displayHour = isCurrentHour ? 'Now' : hourDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      const tempVal = formatTemp(hourly.temperature_2m[i]);
      const wCode = hourly.weather_code[i];
      const isDay = hourNum >= 6 && hourNum <= 19 ? 1 : 0;
      const wInfo = WeatherAPI.interpretWeatherCode(wCode, isDay);
      const precipProb = hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0;

      const card = document.createElement('div');
      card.className = `hourly-card-item ${isCurrentHour ? 'current-hour' : ''}`;
      card.innerHTML = `
        <span class="hourly-time">${displayHour}</span>
        <div class="hourly-icon">${wInfo.iconSvg}</div>
        <div class="hourly-precip">
          ${precipProb > 15 ? `<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg> ${precipProb}%` : ''}
        </div>
        <span class="hourly-temp">${tempVal}°</span>
      `;

      elements.hourlyForecastList.appendChild(card);
    }
  }

  // --- Render 7-Day Forecast Outlook ---
  function renderWeeklyForecast(daily) {
    if (!daily || !daily.time) return;
    elements.weeklyForecastList.innerHTML = '';

    const daysCount = Math.min(7, daily.time.length);
    // Find min and max for range calculation across the week
    const weekMax = Math.max(...daily.temperature_2m_max.slice(0, daysCount));
    const weekMin = Math.min(...daily.temperature_2m_min.slice(0, daysCount));
    const rangeSpan = Math.max(weekMax - weekMin, 1);

    for (let i = 0; i < daysCount; i++) {
      const dateStr = daily.time[i];
      const dateObj = new Date(dateStr + 'T12:00:00');
      const isToday = i === 0;
      const dayName = isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      const maxTemp = daily.temperature_2m_max[i];
      const minTemp = daily.temperature_2m_min[i];
      const wCode = daily.weather_code[i];
      const wInfo = WeatherAPI.interpretWeatherCode(wCode, 1);

      // Relative bar position calculations
      const leftPct = ((minTemp - weekMin) / rangeSpan) * 100;
      const widthPct = Math.max(((maxTemp - minTemp) / rangeSpan) * 100, 8);

      const row = document.createElement('div');
      row.className = 'weekly-day-row';
      row.innerHTML = `
        <span class="day-name ${isToday ? 'is-today' : ''}">${dayName}</span>
        <div class="day-icon">${wInfo.iconSvg}</div>
        <div class="day-temp-bar-wrap">
          <div class="day-temp-bar-fill" style="left: ${leftPct}%; width: ${widthPct}%;"></div>
        </div>
        <div class="day-extremes">
          <span class="day-high">${formatTemp(maxTemp)}°</span>
          <span class="day-low">${formatTemp(minTemp)}°</span>
        </div>
      `;

      elements.weeklyForecastList.appendChild(row);
    }
  }

  // --- Render Air Quality ---
  function renderAirQuality(aqi) {
    const usAqi = aqi.us_aqi || 32;
    elements.aqiVal.textContent = usAqi;
    elements.pm25Val.textContent = aqi.pm2_5 ? `${aqi.pm2_5.toFixed(1)} μg/m³` : '--';
    elements.pm10Val.textContent = aqi.pm10 ? `${aqi.pm10.toFixed(1)} μg/m³` : '--';
    elements.o3Val.textContent = aqi.ozone ? `${aqi.ozone.toFixed(1)} μg/m³` : '--';

    let status = 'Good';
    let color = 'var(--accent-good)';
    let meterWidth = Math.min((usAqi / 300) * 100, 100);

    if (usAqi <= 50) {
      status = 'Good';
      color = 'var(--accent-good)';
    } else if (usAqi <= 100) {
      status = 'Moderate';
      color = 'var(--accent-warn)';
    } else if (usAqi <= 150) {
      status = 'Unhealthy for Sensitive';
      color = '#f97316';
    } else {
      status = 'Unhealthy';
      color = 'var(--accent-danger)';
    }

    elements.aqiStatus.textContent = status;
    elements.aqiStatus.style.color = color;
    elements.aqiStatus.style.borderColor = color;
    elements.aqiMeterFill.style.width = `${meterWidth}%`;
  }

  // --- Render Wind Dynamics ---
  function renderWind(current) {
    const windSpeedObj = formatSpeed(current.wind_speed_10m);
    elements.windSpeed.textContent = windSpeedObj.value;
    elements.windUnit.textContent = windSpeedObj.unit;

    const gustSpeedObj = formatSpeed(current.wind_gusts_10m || current.wind_speed_10m * 1.4);
    elements.windGusts.textContent = `${gustSpeedObj.value} ${gustSpeedObj.unit}`;

    const dirDeg = current.wind_direction_10m || 0;
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const dirIdx = Math.round(dirDeg / 22.5) % 16;
    elements.windDirectionText.textContent = `${directions[dirIdx]} (${dirDeg}°)`;

    // Rotate compass needle smoothly
    elements.windNeedle.style.transform = `rotate(${dirDeg}deg)`;
  }

  // --- Render UV Index ---
  function renderUV(uvVal) {
    const uv = Math.round(uvVal || 0);
    elements.uvIndexVal.textContent = uv;

    let tier = 'Low';
    let advice = 'No protection needed. Safe to enjoy sunshine.';
    if (uv <= 2) {
      tier = 'Low';
      advice = 'Minimal danger for average individuals.';
    } else if (uv <= 5) {
      tier = 'Moderate';
      advice = 'Wear SPF 30+ sunglasses and hat during peak daylight.';
    } else if (uv <= 7) {
      tier = 'High';
      advice = 'Cover up, wear SPF 50+, reduce midday sun exposure.';
    } else if (uv <= 10) {
      tier = 'Very High';
      advice = 'Take extra precautions. Unprotected skin burns swiftly.';
    } else {
      tier = 'Extreme';
      advice = 'Avoid sun exposure around midday. Seek shade.';
    }

    elements.uvTier.textContent = tier;
    elements.uvAdvice.textContent = advice;
    const thumbPct = Math.min((uv / 11) * 100, 100);
    elements.uvThumb.style.left = `${thumbPct}%`;
  }

  // --- Render Solar Cycle (Sunrise / Sunset) ---
  function renderSunCycle(sunriseIso, sunsetIso) {
    if (!sunriseIso || !sunsetIso) {
      elements.sunriseTime.textContent = '06:15 AM';
      elements.sunsetTime.textContent = '06:45 PM';
      return;
    }

    const sunrise = new Date(sunriseIso);
    const sunset = new Date(sunsetIso);
    const now = new Date();

    elements.sunriseTime.textContent = sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    elements.sunsetTime.textContent = sunset.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const totalDaylight = sunset.getTime() - sunrise.getTime();
    const passed = now.getTime() - sunrise.getTime();
    let progress = passed / totalDaylight;
    progress = Math.max(0, Math.min(progress, 1));

    // Calculate arc coordinate along SVG ellipse: center (100, 80), rx = 80, ry = 60
    const angle = Math.PI * (1 - progress);
    const orbX = 100 + 80 * Math.cos(angle);
    const orbY = 80 - 60 * Math.sin(angle);

    elements.sunArcOrb.setAttribute('cx', orbX);
    elements.sunArcOrb.setAttribute('cy', orbY);

    if (now < sunrise || now > sunset) {
      elements.sunArcOrb.setAttribute('fill', '#94A3B8');
      elements.sunArcOrb.style.filter = 'none';
    } else {
      elements.sunArcOrb.setAttribute('fill', '#FBBF24');
      elements.sunArcOrb.style.filter = 'drop-shadow(0 0 8px #F59E0B)';
    }
  }

  // --- Render Humidity & Dew Point ---
  function renderHumidity(tempC, humidity) {
    elements.humidityVal.textContent = Math.round(humidity);
    elements.humidityBar.style.width = `${humidity}%`;

    // Dew point approximation: Td = T - ((100 - RH) / 5)
    const dewPoint = Math.round(tempC - (100 - humidity) / 5);
    elements.dewPointVal.textContent = `${formatTemp(dewPoint)}°`;

    if (humidity < 30) {
      elements.humidityDesc.textContent = 'Dry Air';
    } else if (humidity <= 60) {
      elements.humidityDesc.textContent = 'Comfortable';
    } else if (humidity <= 80) {
      elements.humidityDesc.textContent = 'Humid';
    } else {
      elements.humidityDesc.textContent = 'Very Muggy';
    }
  }

  // --- Render Smart Lifestyle & Attire Advisories ---
  function renderSmartAdvisories(current, weatherInfo) {
    const tempC = current.temperature_2m;
    const rain = current.precipitation || current.rain || 0;
    const wind = current.wind_speed_10m;

    let attire = 'Comfortable casual clothing suited for current temperature.';
    let activity = 'Great conditions for walks, exercise, or commuting.';

    if (rain > 0.5 || weatherInfo.mode === 'rain' || weatherInfo.mode === 'thunder') {
      attire = 'Waterproof raincoat, boots, and a sturdy wind-resistant umbrella.';
      activity = 'Outdoor running not recommended; wet pavements and slick roads.';
    } else if (tempC <= 0) {
      attire = 'Thermal innerwear, insulated winter coat, wool scarf, and gloves.';
      activity = 'Limit extended exposure; freezing conditions with frostbite risk.';
    } else if (tempC < 14) {
      attire = 'Layered warm jacket, cozy knit sweater, and long trousers.';
      activity = 'Crisp air; ideal for jogging if wearing windproof outerwear.';
    } else if (tempC >= 28) {
      attire = 'Light breathable cotton/linen apparel, UV-filtering sunglasses, sunhat.';
      activity = 'Carry hydration; schedule intense workouts for early morning or dusk.';
    }

    if (wind > 35) {
      activity = 'High wind advisory: Hold onto loose belongings and cycle with care.';
    }

    elements.attireText.textContent = attire;
    elements.activityText.textContent = activity;
  }

  // --- Initial Launch Setup ---
  renderQuickCities();
  loadLocation(state.currentLocation);
});
