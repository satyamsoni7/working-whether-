/**
 * Global Search Routing for non-dashboard pages
 */
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('city-search-input');
  const searchDropdown = document.getElementById('search-dropdown');
  const searchResultsList = document.getElementById('search-results-list');
  let searchDebounceTimer = null;

  if (searchInput && searchDropdown && searchResultsList && window.WeatherAPI) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

      if (query.length < 2) {
        searchDropdown.style.display = 'none';
        return;
      }

      searchDebounceTimer = setTimeout(async () => {
        const results = await window.WeatherAPI.searchCities(query);
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
              window.location.href = 'index.html';
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
});
