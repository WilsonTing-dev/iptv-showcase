(function () {
  const page = document.querySelector(".weather-page");
  if (!page) return;

  const contentConfig = (window.IPTV_CONTENT_CONFIG && window.IPTV_CONTENT_CONFIG.weather) || {};
  const config = window.HILTON_WEATHER_CONFIG || {
    city: "Kuala Lumpur",
    country: "Malaysia",
    latitude: 3.139,
    longitude: 101.6869,
    timezone: "auto",
    refreshMinutes: 15,
  };

  const panels = Array.isArray(contentConfig.panels) && contentConfig.panels.length
    ? contentConfig.panels
    : ["current", "hourly", "weekly", "details"];
  const panelTitles = contentConfig.panelTitles || {
    current: "Current Weather",
    hourly: "Hourly Forecast",
    weekly: "7-Day Forecast",
    details: "Weather Details",
  };
  const menuOptions = Array.from(document.querySelectorAll(".weather-menu-option"));
  const dynamicPanel = document.getElementById("weatherDynamicPanel");
  const panelTitle = document.getElementById("weatherPanelTitle");
  const cityEl = document.getElementById("weatherCity");
  const tempEl = document.getElementById("weatherTemperature");
  const conditionEl = document.getElementById("weatherCondition");
  const updatedEl = document.getElementById("weatherUpdated");
  const symbolEl = document.getElementById("weatherSymbol");
  const feelsEl = document.getElementById("weatherFeelsLike");
  const highEl = document.getElementById("weatherHigh");
  const lowEl = document.getElementById("weatherLow");
  const liveLabelEl = document.getElementById("weatherLiveLabel");

  let menuIndex = 0;
  let activePanel = "current";
  let weatherData = createFallbackWeather();

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
  }

  function tempText(value) {
    const rounded = roundNumber(value);
    return rounded === null ? "--°C" : `${rounded}°C`;
  }

  function percentText(value) {
    const rounded = roundNumber(value);
    return rounded === null ? "--%" : `${rounded}%`;
  }

  function speedText(value) {
    const rounded = roundNumber(value);
    return rounded === null ? "-- km/h" : `${rounded} km/h`;
  }

  function weatherInfo(code, isDay) {
    const day = isDay !== 0;
    const map = {
      0: [day ? "☀" : "☾", "Clear Sky"],
      1: [day ? "◐" : "☾", "Mainly Clear"],
      2: ["☁", "Partly Cloudy"],
      3: ["☁", "Overcast"],
      45: ["≋", "Foggy"],
      48: ["≋", "Rime Fog"],
      51: ["☂", "Light Drizzle"],
      53: ["☂", "Drizzle"],
      55: ["☂", "Heavy Drizzle"],
      61: ["☔", "Light Rain"],
      63: ["☔", "Rain"],
      65: ["☔", "Heavy Rain"],
      80: ["☔", "Rain Showers"],
      81: ["☔", "Rain Showers"],
      82: ["☔", "Heavy Showers"],
      95: ["ϟ", "Thunderstorm"],
      96: ["ϟ", "Thunderstorm"],
      99: ["ϟ", "Thunderstorm"],
    };
    const result = map[code] || ["☁", "Weather Update"];
    return { symbol: result[0], label: result[1] };
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatClockFromDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "--:--";
    let hours = date.getHours();
    const minutes = pad(date.getMinutes());
    const period = hours >= 12 ? "P.M" : "A.M";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  }

  function parseOpenMeteoTime(value) {
    if (!value) return null;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
    const fixed = new Date(`${value}:00`);
    return Number.isNaN(fixed.getTime()) ? null : fixed;
  }

  function formatHourLabel(value) {
    const date = parseOpenMeteoTime(value);
    if (!date) return "--";
    let hours = date.getHours();
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}${period}`;
  }

  function formatDateLabel(value, style) {
    const date = parseOpenMeteoTime(value);
    if (!date) return "--";
    return date.toLocaleDateString("en-US", {
      weekday: style === "long" ? "long" : "short",
      month: style === "long" ? "short" : undefined,
      day: style === "long" ? "numeric" : undefined,
    });
  }

  function findCurrentHourIndex(hourly) {
    if (!hourly || !Array.isArray(hourly.time)) return 0;
    const now = Date.now();
    let bestIndex = 0;
    let bestDiff = Infinity;
    hourly.time.forEach((time, index) => {
      const date = parseOpenMeteoTime(time);
      if (!date) return;
      const diff = Math.abs(date.getTime() - now);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function createFallbackWeather() {
    const now = new Date();
    const hourlyTimes = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getTime() + index * 60 * 60 * 1000);
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
    });
    const dailyTimes = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now.getTime() + index * 24 * 60 * 60 * 1000);
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    });

    return {
      offline: true,
      current: {
        time: now.toISOString(),
        temperature_2m: 31,
        apparent_temperature: 34,
        relative_humidity_2m: 74,
        precipitation: 0,
        rain: 0,
        weather_code: 2,
        wind_speed_10m: 8,
        wind_direction_10m: 220,
        is_day: 1,
      },
      hourly: {
        time: hourlyTimes,
        temperature_2m: [31, 31, 30, 30, 29, 29, 28, 28, 28, 27, 27, 27],
        precipitation_probability: [28, 30, 35, 38, 42, 45, 38, 30, 24, 20, 18, 16],
        weather_code: [2, 2, 3, 61, 61, 3, 2, 2, 1, 1, 1, 2],
      },
      daily: {
        time: dailyTimes,
        weather_code: [2, 61, 3, 61, 2, 1, 2],
        temperature_2m_max: [33, 32, 32, 31, 33, 34, 33],
        temperature_2m_min: [25, 25, 24, 24, 25, 25, 24],
        precipitation_probability_max: [45, 62, 55, 64, 40, 28, 38],
        sunrise: dailyTimes.map((day) => `${day}T07:04`),
        sunset: dailyTimes.map((day) => `${day}T19:15`),
      },
    };
  }

  function card(label, value, note, extraClass) {
    return `
      <div class="weather-content-card ${extraClass || ""}">
        <span class="weather-card-label">${label}</span>
        <span class="weather-card-value">${value}</span>
        <span class="weather-card-note">${note}</span>
      </div>`;
  }

  function renderCurrentPanel() {
    const current = weatherData.current || {};
    const daily = weatherData.daily || {};
    dynamicPanel.dataset.weatherLayout = "current";
    dynamicPanel.dataset.weatherColumns = "4";
    dynamicPanel.innerHTML = [
      card("Temperature", tempText(current.temperature_2m), "Current now"),
      card("Humidity", percentText(current.relative_humidity_2m), "Comfort level"),
      card("Rain", `${tempText(current.precipitation).replace("°C", " mm")}`, "Precipitation"),
      card("Wind", speedText(current.wind_speed_10m), "Current wind"),
      card("Feels Like", tempText(current.apparent_temperature), "Feels now"),
      card("Rain Chance", percentText((daily.precipitation_probability_max || [])[0]), "Today max"),
      card("Sunrise", formatHourLabel((daily.sunrise || [])[0]), "Morning light"),
      card("Sunset", formatHourLabel((daily.sunset || [])[0]), "Evening light"),
    ].join("");
  }

  function renderHourlyPanel() {
    const hourly = weatherData.hourly || {};
    const startIndex = findCurrentHourIndex(hourly);
    const times = (hourly.time || []).slice(startIndex, startIndex + 8);
    dynamicPanel.dataset.weatherLayout = "hourly";
    dynamicPanel.dataset.weatherColumns = "4";
    dynamicPanel.innerHTML = times.map((time, offset) => {
      const index = startIndex + offset;
      const info = weatherInfo((hourly.weather_code || [])[index], 1);
      return `
        <div class="weather-content-card weather-hour-card">
          <span class="weather-card-label">${offset === 0 ? "Now" : formatHourLabel(time)}</span>
          <span class="weather-hour-icon">${info.symbol}</span>
          <span class="weather-card-value">${tempText((hourly.temperature_2m || [])[index])}</span>
          <span class="weather-card-note">Rain ${percentText((hourly.precipitation_probability || [])[index])}</span>
        </div>`;
    }).join("");
  }

  function renderWeeklyPanel() {
    const daily = weatherData.daily || {};
    const days = (daily.time || []).slice(0, 7);
    dynamicPanel.dataset.weatherLayout = "weekly";
    dynamicPanel.dataset.weatherColumns = "7";
    dynamicPanel.innerHTML = days.map((day, index) => {
      const info = weatherInfo((daily.weather_code || [])[index], 1);
      const label = index === 0 ? "Today" : formatDateLabel(day);
      return `
        <div class="weather-content-card weather-forecast-card">
          <span class="weather-card-label">${label}</span>
          <span class="weather-forecast-icon">${info.symbol}</span>
          <span class="weather-forecast-temp">${tempText((daily.temperature_2m_max || [])[index])} / ${tempText((daily.temperature_2m_min || [])[index])}</span>
          <span class="weather-forecast-rain">Rain ${percentText((daily.precipitation_probability_max || [])[index])}</span>
        </div>`;
    }).join("");
  }

  function renderDetailsPanel() {
    const current = weatherData.current || {};
    const daily = weatherData.daily || {};
    dynamicPanel.dataset.weatherLayout = "details";
    dynamicPanel.dataset.weatherColumns = "3";
    dynamicPanel.innerHTML = [
      card("Humidity", percentText(current.relative_humidity_2m), "Outdoor level"),
      card("Wind Speed", speedText(current.wind_speed_10m), "Current speed"),
      card("Wind Direction", `${roundNumber(current.wind_direction_10m) ?? "--"}°`, "Direction"),
      card("Precipitation", `${roundNumber(current.precipitation) ?? "--"} mm`, "Rain now"),
      card("Today High", tempText((daily.temperature_2m_max || [])[0]), "Maximum"),
      card("Today Low", tempText((daily.temperature_2m_min || [])[0]), "Minimum"),
      card("Sunrise", formatHourLabel((daily.sunrise || [])[0]), "Local time"),
      card("Sunset", formatHourLabel((daily.sunset || [])[0]), "Local time"),
      card("Refresh", `${config.refreshMinutes || 15} min`, "Auto update"),
    ].join("");
  }

  function renderHero() {
    const current = weatherData.current || {};
    const daily = weatherData.daily || {};
    const info = weatherInfo(current.weather_code, current.is_day);
    const cityText = config.country ? `${config.city}, ${config.country}` : config.city;
    const currentTemp = tempText(current.temperature_2m);

    cityEl.textContent = cityText;
    tempEl.textContent = currentTemp;
    conditionEl.textContent = info.label;
    symbolEl.textContent = info.symbol;
    feelsEl.textContent = tempText(current.apparent_temperature);
    highEl.textContent = tempText((daily.temperature_2m_max || [])[0]);
    lowEl.textContent = tempText((daily.temperature_2m_min || [])[0]);
    liveLabelEl.textContent = weatherData.offline ? "Weather Preview" : "Live Weather";

    const updateTime = weatherData.updatedAt || parseOpenMeteoTime(current.time) || new Date();
    updatedEl.textContent = weatherData.offline
      ? "Offline preview"
      : `Updated ${formatClockFromDate(updateTime)}`;

    document.querySelectorAll("[data-weather-city]").forEach((element) => {
      element.textContent = config.city;
    });
    document.querySelectorAll("[data-weather-temp]").forEach((element) => {
      element.textContent = currentTemp;
    });
  }

  function renderPanel() {
    panelTitle.textContent = panelTitles[activePanel] || "Weather";
    if (activePanel === "current") renderCurrentPanel();
    if (activePanel === "hourly") renderHourlyPanel();
    if (activePanel === "weekly") renderWeeklyPanel();
    if (activePanel === "details") renderDetailsPanel();
    updateFocus();
  }

  function getContentCards() {
    return Array.from(dynamicPanel.querySelectorAll(".weather-content-card"));
  }

  function updateFocus() {
    // Weather page has one selectable area only: the Weather Menu.
    // All weather information cards are display-only, so they never receive a selected border.
    menuOptions.forEach((option, index) => {
      const optionPanel = option.dataset.weatherPanel;
      option.classList.toggle("active", optionPanel === activePanel);
      option.classList.toggle("selected", index === menuIndex);
    });

    getContentCards().forEach((cardElement) => {
      cardElement.classList.remove("selected");
    });
  }

  function previewMenuSelection() {
    activePanel = panels[menuIndex] || "current";
    renderPanel();
  }

  function applyMenuSelection() {
    // Weather cards are display-only, so OK confirms the previewed menu section
    // without moving focus away from the Weather Menu.
    previewMenuSelection();
  }

  function moveMenu(direction) {
    const previousIndex = menuIndex;
    if (direction === "up") menuIndex = clamp(menuIndex - 1, 0, menuOptions.length - 1);
    if (direction === "down") menuIndex = clamp(menuIndex + 1, 0, menuOptions.length - 1);
    if (menuIndex !== previousIndex) previewMenuSelection();
    else updateFocus();
  }

  function normalizeWeatherKey(event) {
    return window.IPTVRemote.normalize(event);
  }

  function handleBackReturn() {
    window.IPTVRemote.goHome();
    return false;
  }

  if (window.IPTVRemote && window.IPTVRemote.setBackHandler) {
    window.IPTVRemote.setBackHandler(handleBackReturn);
  }

  function handleRemote(event) {
    const key = normalizeWeatherKey(event);
    const remoteKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Backspace", "Home", "Escape"];
    if (!remoteKeys.includes(key)) return;

    window.IPTVRemote.stop(event);

    if (window.IPTVRemote.isHome(key)) {
      window.IPTVRemote.goHome();
      return;
    }

    if (window.IPTVRemote.isBack(key)) {
      handleBackReturn();
      return;
    }

    // Weather has no selectable content cards. Only the Weather Menu can move.
    // Up / Down previews the highlighted weather section immediately.
    if (key === "ArrowUp") moveMenu("up");
    if (key === "ArrowDown") moveMenu("down");
    if (window.IPTVRemote.isConfirm(key)) applyMenuSelection();
    // Arrow Left / Right intentionally do nothing on the Weather Menu.
  }

  function handlePointerClick(event) {
    const menuOption = event.target.closest(".weather-menu-option");
    if (menuOption) {
      event.preventDefault();
      menuIndex = clamp(menuOptions.indexOf(menuOption), 0, menuOptions.length - 1);
      previewMenuSelection();
    }
  }

  function buildWeatherUrl() {
    const params = new URLSearchParams({
      latitude: String(config.latitude),
      longitude: String(config.longitude),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m",
      hourly: "temperature_2m,precipitation_probability,weather_code",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
      timezone: config.timezone || "auto",
      forecast_days: "7",
    });
    return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  }

  function refreshWeather() {
    updatedEl.textContent = "Updating live weather...";
    fetch(buildWeatherUrl(), { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Weather service unavailable");
        return response.json();
      })
      .then((data) => {
        weatherData = data || createFallbackWeather();
        weatherData.updatedAt = new Date();
        renderHero();
        renderPanel();
      })
      .catch(() => {
        weatherData = createFallbackWeather();
        renderHero();
        renderPanel();
      });
  }

  document.addEventListener("keydown", handleRemote, true);
  document.addEventListener("click", handlePointerClick, true);

  renderHero();
  renderPanel();
  updateFocus();
  refreshWeather();
  window.setInterval(refreshWeather, Math.max(5, Number(config.refreshMinutes) || 15) * 60 * 1000);
})();
