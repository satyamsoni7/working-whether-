/**
 * Cities/States Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.WeatherAPI) {
    console.error('WeatherAPI is not loaded!');
    return;
  }

  const citiesContainer = document.getElementById('cities-grid');
  const searchInput = document.getElementById('city-search-input');
  const searchDropdown = document.getElementById('search-dropdown');
  const searchResultsList = document.getElementById('search-results-list');
  let searchDebounceTimer = null;

  // Search Logic for other pages
  if (searchInput && searchDropdown && searchResultsList) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

      if (query.length < 2) {
        searchDropdown.style.display = 'none';
        return;
      }

      searchDebounceTimer = setTimeout(async () => {
        const results = await WeatherAPI.searchCities(query);
        searchResultsList.innerHTML = '';
        if (!results || results.length === 0) {
          searchResultsList.innerHTML = '<li>No cities found</li>';
        } else {
          results.forEach(city => {
            const li = document.createElement('li');
            const stateStr = city.admin1 ? `${city.admin1}, ` : '';
            li.textContent = `${city.name}, ${stateStr}${city.country}`;
            li.addEventListener('click', () => {
              localStorage.setItem('weather_app_location', JSON.stringify(city));
              window.location.href = 'index.html'; // Redirect to main dashboard!
            });
            searchResultsList.appendChild(li);
          });
        }
        searchDropdown.style.display = 'block';
      }, 300);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        searchDropdown.style.display = 'none';
      }
    });
  }

  if (!citiesContainer) return;

  // Major Indian States & Cities
  const indianStates = [
    { name: 'Delhi', state: 'Delhi', lat: 28.6139, lon: 77.2090 },
    { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777 },
    { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639 },
    { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707 },
    { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lon: 77.5946 },
    { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lon: 78.4867 },
    { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lon: 72.5714 },
    { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lon: 75.7873 },
    { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lon: 80.9462 },
    { name: 'Srinagar', state: 'Jammu & Kashmir', lat: 34.0837, lon: 74.7973 },
    { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lon: 77.4126 },
    { name: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lon: 76.9366 }
  ];

  // Show a loading state
  citiesContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 16px;">Loading weather data across India...</div>';

  try {
    const promises = indianStates.map(async (location) => {
      const data = await WeatherAPI.getWeatherData(location.lat, location.lon);
      return { ...location, weatherData: data };
    });

    const results = await Promise.all(promises);
    citiesContainer.innerHTML = ''; // Clear loading

    results.forEach(item => {
      const current = item.weatherData?.forecast?.current;
      if (!current) return;

      const wInfo = WeatherAPI.interpretWeatherCode(current.weather_code, current.is_day);
      const temp = Math.round(current.temperature_2m);
      
      const card = document.createElement('div');
      card.className = 'city-weather-card';
      card.innerHTML = `
        <div class="card-info">
          <h3>${item.name}</h3>
          <p>${item.state}</p>
          <div class="temp-readout">${temp}°</div>
          <div class="condition">${wInfo.title}</div>
        </div>
        <div class="card-icon">
          ${wInfo.iconSvg}
        </div>
      `;

      citiesContainer.appendChild(card);
    });

  } catch (error) {
    console.error('Failed to load cities weather:', error);
    citiesContainer.innerHTML = '<div style="color: red;">Failed to load data. Please check your network.</div>';
  }
});
