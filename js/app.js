// v102 final app.js - Home Back/Welcome stability + final UI polish
// Shared code for the Hilton IPTV prototype: TV scale, remote keys, Home/Welcome navigation,
// carousel, clock, weather header, site config, and favourites storage.
window.IPTV_APP_VERSION = "102_final_command_polish";

// =========================
// 1) Keep the TV design size
// =========================
function fitStage() {
  // v95 TV-safe scale:
  // Use the smallest reliable viewport value, because some TV APK/WebView devices
  // report a temporary large visualViewport when returning to Home. That wrong
  // value makes Home look zoomed/cropped. The scale can shrink to fit, but never
  // grows above 1.
  const widths = [
    window.innerWidth,
    document.documentElement ? document.documentElement.clientWidth : 0,
    document.body ? document.body.clientWidth : 0,
    window.visualViewport ? window.visualViewport.width : 0
  ].filter((value) => value && value > 0);

  const heights = [
    window.innerHeight,
    document.documentElement ? document.documentElement.clientHeight : 0,
    document.body ? document.body.clientHeight : 0,
    window.visualViewport ? window.visualViewport.height : 0
  ].filter((value) => value && value > 0);

  const width = widths.length ? Math.min(...widths) : 1280;
  const height = heights.length ? Math.min(...heights) : 720;
  const scale = Math.min(1, width / 1280, height / 720);

  document.documentElement.style.setProperty("--stage-scale", String(scale));
  document.documentElement.classList.add("stage-ready", "tv-fit-render");
}

// Run immediately. The same no-scale guard is also placed in each HTML head.
fitStage();

// During the first moment after a page opens, disable CSS transitions.
// This prevents selected cards/buttons from animating as the new page appears.
document.documentElement.classList.add("no-entry-motion");
window.setTimeout(() => {
  document.documentElement.classList.remove("no-entry-motion");
}, 1000);

window.addEventListener("resize", fitStage);
window.addEventListener("pageshow", fitStage);
window.addEventListener("focus", fitStage);
document.addEventListener("visibilitychange", function () { if (!document.hidden) fitStage(); });
if (window.visualViewport) window.visualViewport.addEventListener("resize", fitStage);
// Re-check once after page load because some TV WebViews change viewport size
// a short moment after navigation.
window.setTimeout(fitStage, 80);
window.setTimeout(fitStage, 300);

// =========================
// 2) Shared TV remote helper
// =========================
function normalizeRemoteKey(event) {
  const key = event.key;
  const code = event.code;
  const keyCode = event.keyCode || event.which;

  if (key === "ArrowUp" || key === "Up" || code === "ArrowUp") return "ArrowUp";
  if (key === "ArrowDown" || key === "Down" || code === "ArrowDown") return "ArrowDown";
  if (key === "ArrowLeft" || key === "Left" || code === "ArrowLeft") return "ArrowLeft";
  if (key === "ArrowRight" || key === "Right" || code === "ArrowRight") return "ArrowRight";
  if (key === "Enter" || key === "NumpadEnter" || key === "OK" || key === "Accept") return "Enter";
  if (key === "Backspace" || key === "BrowserBack" || key === "GoBack" || key === "Return") return "Backspace";
  if (key === "Home" || key === "BrowserHome") return "Home";
  if (key === "Escape" || key === "Esc") return "Escape";

  // Fallbacks for some TV / Android remote controls.
  const tvKeyMap = {
    19: "ArrowUp", 20: "ArrowDown", 21: "ArrowLeft", 22: "ArrowRight",
    23: "Enter", 66: "Enter", 4: "Backspace", 461: "Backspace",
    10009: "Backspace", 166: "Backspace", 172: "Home"
  };

  return tvKeyMap[keyCode] || key;
}

function stopRemoteEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  if (event.stopImmediatePropagation) event.stopImmediatePropagation();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function goHome() {
  // Use replace() so TV Back does not restore an old cached Home state.
  // fromApp=1 tells home.html this is an in-app Home action, not a fresh APK launch.
  window.location.replace("home.html?fromApp=1");
}

function goWelcomeFromHome() {
  // On the Home page, Return/Back should bring the guest back to the Welcome page.
  // Before routing, freeze the current scale and hide entry motion so TV WebView
  // does not show a temporary zoomed Home state during the Back/Return action.
  fitStage();
  document.documentElement.classList.add("no-entry-motion", "route-leaving");
  window.setTimeout(function () {
    window.location.replace("index.html?fromHomeBack=1");
  }, 0);
}


// Hardware Back/Return on many TV APKs does not always send keydown.
// Sometimes it triggers browser history back directly. This guard keeps feature
// pages inside the IPTV flow so Back can return to the selection panel first.
let iptvBackHandler = null;
let iptvBackGuardActive = false;
let iptvHomeBackGuardActive = false;

function isHomePage() {
  return !!document.querySelector(".home-page");
}

function setBackHandler(handler) {
  iptvBackHandler = handler;
  setupBrowserBackGuard();
}

function runBackHandler() {
  if (typeof iptvBackHandler === "function") {
    // Return true when the page stayed open, false when the handler navigated away.
    return iptvBackHandler() !== false;
  }
  return false;
}

function setupBrowserBackGuard() {
  if (!isFeaturePage()) return;
  if (iptvBackGuardActive) return;

  try {
    history.replaceState({ iptvPageBase: true }, "", location.href);
    history.pushState({ iptvBackGuard: true }, "", location.href);
    iptvBackGuardActive = true;
  } catch (error) {}
}

function setupHomeBackGuard() {
  // Some TV APKs send the physical Return button as browser history instead of keydown.
  // Add one dummy state so hardware Back can be caught and routed to Welcome smoothly.
  if (!isHomePage()) return;
  if (iptvHomeBackGuardActive) return;

  try {
    history.replaceState({ iptvHomeBase: true }, "", location.href);
    history.pushState({ iptvHomeBackGuard: true }, "", location.href);
    iptvHomeBackGuardActive = true;
  } catch (error) {}
}

window.addEventListener("popstate", function () {
  if (isHomePage()) {
    // Hardware Back on Home should go to Welcome, not browser history.
    // Freeze the scale first so the Home page does not visibly zoom before leaving.
    goWelcomeFromHome();
    return;
  }

  if (!isFeaturePage()) return;

  const stayedOnPage = runBackHandler();
  if (stayedOnPage) {
    // Put the guard back so the next hardware Back can also be handled.
    window.setTimeout(function () {
      try { history.pushState({ iptvBackGuard: true }, "", location.href); } catch (error) {}
    }, 0);
  }
});

const WELCOME_DONE_KEY = "IPTV_WELCOME_DONE";

function canUseStorage(storage) {
  try {
    const testKey = "IPTV_TEST_STORAGE";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

function markWelcomeAsSeen() {
  // Save in both sessionStorage and localStorage because some TV WebViews
  // handle one better than the other. If one fails, the page still continues.
  try { sessionStorage.setItem(WELCOME_DONE_KEY, "yes"); } catch (error) {}
  try { localStorage.setItem(WELCOME_DONE_KEY, "yes"); } catch (error) {}
}

function openHomeFromWelcome() {
  markWelcomeAsSeen();
  // The query value is only a safe backup for TV APK/WebView storage issues.
  // home.html removes it from the address after the page opens.
  window.location.href = "home.html?fromWelcome=1";
}

window.IPTVWelcome = {
  markAsSeen: markWelcomeAsSeen,
  openHome: openHomeFromWelcome
};

window.IPTVRemote = {
  normalize: normalizeRemoteKey,
  stop: stopRemoteEvent,
  clamp,
  goHome,
  goWelcomeFromHome,
  setBackHandler,
  setupBackGuard: setupBrowserBackGuard,
  setupHomeBackGuard,
  runBackHandler,
  isArrow: (key) => ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key),
  isConfirm: (key) => key === "Enter",
  isBack: (key) => key === "Backspace" || key === "Escape",
  isHome: (key) => key === "Home",
  isRemoteKey: (key) => ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Backspace", "Home", "Escape"].includes(key)
};

// v100: catch Home Back/Return as early as possible.
// Some TV remotes send Back as Escape/Backspace, and the browser may otherwise
// restore an old Home history state that visually looks zoomed.
document.addEventListener("keydown", function (event) {
  if (!isHomePage()) return;
  const key = normalizeRemoteKey(event);
  if (key === "Backspace" || key === "Escape") {
    stopRemoteEvent(event);
    goWelcomeFromHome();
  }
}, true);

// ====================================
// 3) Shared favourites localStorage API
// ====================================
const FAVOURITES_KEY = "IPTV_FAVOURITES";

function defaultFavourites() {
  const config = window.IPTV_FAVOURITES_CONFIG || {};
  return {
    channels: Array.isArray(config.defaultChannels) ? [...config.defaultChannels] : [],
    movies: Array.isArray(config.defaultMovies) ? [...config.defaultMovies] : []
  };
}

function loadFavourites() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVOURITES_KEY));
    if (saved && Array.isArray(saved.channels) && Array.isArray(saved.movies)) return saved;
  } catch (error) {}
  return defaultFavourites();
}

function saveFavourites(data) {
  try { localStorage.setItem(FAVOURITES_KEY, JSON.stringify(data)); } catch (error) {}
}

function hasFavourite(type, id) {
  const data = loadFavourites();
  const list = type === "channel" ? data.channels : data.movies;
  return list.includes(id);
}

function toggleFavourite(type, id) {
  const data = loadFavourites();
  const key = type === "channel" ? "channels" : "movies";
  const index = data[key].indexOf(id);
  const shouldAdd = index === -1;

  if (shouldAdd) data[key].push(id);
  else data[key].splice(index, 1);

  saveFavourites(data);
  return shouldAdd;
}

window.IPTVFavourites = {
  load: loadFavourites,
  save: saveFavourites,
  has: hasFavourite,
  toggle: toggleFavourite
};

// ==================================
// 4) Simple Home / Welcome navigation
// ==================================
const NAV_ITEM = ".nav-item";

function getNavItems() {
  return Array.from(document.querySelectorAll(NAV_ITEM)).filter((item) => {
    const rect = item.getBoundingClientRect();
    const style = window.getComputedStyle(item);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  });
}

function getSelectedItem() {
  return document.querySelector(`${NAV_ITEM}.selected`) || getNavItems()[0];
}

function selectItem(item) {
  if (!item) return;
  getNavItems().forEach((nav) => nav.classList.remove("selected"));
  item.classList.add("selected");
  updateHomeMenu(item);
  if (item.focus) item.focus({ preventScroll: true });
}

function activateSelectedItem() {
  const item = getSelectedItem();
  if (!item) return;

  // Open the page directly. No pressed/scale animation here, because page changes
  // should feel instant and clean on a TV system.
  const target = item.dataset.href || item.getAttribute("href");
  if (target) {
    if (document.querySelector(".welcome-page") && target.includes("home.html")) {
      openHomeFromWelcome();
      return;
    }
    window.location.href = target;
  }
}

function updateHomeMenu(selectedItem) {
  const menuWindow = document.querySelector(".home-menu-window");
  const track = document.querySelector("[data-home-menu-track]");
  if (!menuWindow || !track || !selectedItem.classList.contains("home-menu-card")) return;

  const cards = Array.from(track.querySelectorAll(".home-menu-card"));
  const selectedIndex = cards.indexOf(selectedItem);
  const maxOffset = Math.max(0, track.scrollWidth - menuWindow.clientWidth);
  const showEnd = selectedIndex >= 5;

  track.style.transform = `translateX(${showEnd ? -maxOffset : 0}px)`;
  menuWindow.classList.toggle("is-peeking", !showEnd && maxOffset > 0);
  menuWindow.classList.toggle("is-shifted", showEnd);
  menuWindow.classList.toggle("at-end", showEnd);
  menuWindow.classList.toggle("has-left-fade", showEnd && maxOffset > 0);
  menuWindow.classList.toggle("has-right-fade", !showEnd && maxOffset > 0);
}

function moveHomeMenu(direction) {
  const cards = Array.from(document.querySelectorAll(".home-menu-card"));
  const current = getSelectedItem();
  const index = cards.indexOf(current);
  if (index === -1) return false;

  if (direction === "ArrowLeft") selectItem(cards[clamp(index - 1, 0, cards.length - 1)]);
  if (direction === "ArrowRight") selectItem(cards[clamp(index + 1, 0, cards.length - 1)]);
  return true; // Home menu ignores Up/Down because it is one horizontal row.
}

function getCenter(item) {
  const rect = item.getBoundingClientRect();
  return { item, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function moveSimple(direction) {
  if (document.querySelector(".home-page") && moveHomeMenu(direction)) return;

  const current = getSelectedItem();
  const currentPoint = getCenter(current);

  const candidates = getNavItems()
    .filter((item) => item !== current)
    .map(getCenter)
    .filter((point) => {
      if (direction === "ArrowLeft") return point.x < currentPoint.x - 8;
      if (direction === "ArrowRight") return point.x > currentPoint.x + 8;
      if (direction === "ArrowUp") return point.y < currentPoint.y - 8;
      if (direction === "ArrowDown") return point.y > currentPoint.y + 8;
      return false;
    })
    .map((point) => {
      const dx = Math.abs(point.x - currentPoint.x);
      const dy = Math.abs(point.y - currentPoint.y);
      const score = direction === "ArrowLeft" || direction === "ArrowRight" ? dx + dy * 2 : dy + dx * 2;
      return { ...point, score };
    })
    .sort((a, b) => a.score - b.score);

  if (candidates[0]) selectItem(candidates[0].item);
}

function goBackPage() {
  const page = document.querySelector(".page[data-back-href]");
  if (!page) return false;
  var target = page.dataset.backHref;
  if (target === "home.html") target = "home.html?fromApp=1";
  if (target.includes("home.html")) window.location.replace(target);
  else window.location.href = target;
  return true;
}

function isFeaturePage() {
  return !!document.querySelector(".movies-page, .movie-player-page, .live-tv-page, .room-service-page, .hotel-features-page, .favourites-page, .radio-page, .weather-page, .youtube-launcher-page");
}

document.addEventListener("keydown", function (event) {
  const key = window.IPTVRemote.normalize(event);

  // Feature pages have their own detailed remote navigation logic.
  if (isFeaturePage()) return;

  if (window.IPTVRemote.isHome(key)) {
    window.IPTVRemote.stop(event);
    window.IPTVRemote.goHome();
  } else if (window.IPTVRemote.isArrow(key)) {
    window.IPTVRemote.stop(event);
    moveSimple(key);
  } else if (window.IPTVRemote.isConfirm(key)) {
    window.IPTVRemote.stop(event);
    activateSelectedItem();
  } else if (window.IPTVRemote.isBack(key)) {
    if (isHomePage()) {
      // Home Return/Back goes to Welcome. Do not let the browser restore a zoomed Home state.
      window.IPTVRemote.stop(event);
      goWelcomeFromHome();
      return;
    }
    if (goBackPage()) window.IPTVRemote.stop(event);
  }
});

document.addEventListener("click", function (event) {
  const item = event.target.closest(NAV_ITEM);
  if (!item) return;

  const target = item.dataset.href || item.getAttribute("href");
  if (target) event.preventDefault();

  selectItem(item);

  // Touch/mouse users on APK or laptop may tap Continue instead of pressing OK.
  // Keep the IPTV rule for normal menu items, but allow Welcome Continue to open Home.
  if (document.querySelector(".welcome-page") && target && target.includes("home.html")) {
    openHomeFromWelcome();
  }
});

// ==================
// 5) Welcome carousel
// ==================
function initHeroCarousel() {
  const carousel = document.querySelector("[data-hero-carousel]");
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll(".hero-slide"));
  const dots = Array.from(carousel.querySelectorAll("[data-slide-dot]"));
  if (!slides.length) return;

  let index = slides.findIndex((slide) => slide.classList.contains("active"));
  if (index < 0) index = 0;

  function showSlide(nextIndex) {
    index = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle("active", i === index));
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
      dot.setAttribute("aria-pressed", i === index ? "true" : "false");
    });
  }

  function nextSlide() { showSlide(index + 1); }

  let timer = setInterval(nextSlide, 3000);
  function restartTimer() {
    clearInterval(timer);
    timer = setInterval(nextSlide, 3000);
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", (event) => {
      event.stopPropagation();
      showSlide(Number(dot.dataset.slideDot));
      restartTimer();
    });
  });

  carousel.addEventListener("click", (event) => {
    if (event.target.closest(".hero-dots")) return;
    nextSlide();
    restartTimer();
  });

  let startX = 0;
  carousel.addEventListener("pointerdown", (event) => { startX = event.clientX; });
  carousel.addEventListener("pointerup", (event) => {
    if (Math.abs(event.clientX - startX) < 35) return;
    showSlide(event.clientX < startX ? index + 1 : index - 1);
    restartTimer();
  });

  showSlide(index);
}

// =========================
// 6) Clock, weather, config
// =========================
function formatClock(date) {
  let hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, "0");
  const period = hour >= 12 ? "P.M" : "A.M";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${period}`;
}

function initLiveClock() {
  const clocks = document.querySelectorAll("[data-live-clock]");
  if (!clocks.length) return;

  function updateClock() {
    clocks.forEach((clock) => { clock.textContent = formatClock(new Date()); });
  }

  updateClock();
  setInterval(updateClock, 30000);
}

function setText(selector, value) {
  if (value === undefined || value === null) return;
  document.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
}

function setHtml(selector, value) {
  if (value === undefined || value === null) return;
  document.querySelectorAll(selector).forEach((element) => { element.innerHTML = value; });
}

function setImage(selector, src, alt) {
  if (!src) return;
  document.querySelectorAll(selector).forEach((image) => {
    image.src = src;
    if (alt) image.alt = alt;
  });
}

function setWelcomeTitle(name) {
  const title = document.querySelector("[data-welcome-title]");
  if (!title || !name) return;
  title.innerHTML = `Welcome,<br>${name}`;
}

function initSiteConfig() {
  const config = window.HILTON_SITE_CONFIG || {};
  const hotel = config.hotel || {};
  const guest = config.guest || {};
  const location = config.location || {};
  const home = config.home || {};
  const welcome = config.welcome || {};

  setImage("[data-site-logo]", hotel.logo, hotel.name || "Hilton");
  setImage("[data-guest-avatar]", guest.avatar, "Guest profile");
  setImage("[data-room-preview]", home.roomPreview, "Guest room preview");
  setImage("[data-wifi-qr]", home.wifiQr, "Wi-Fi QR code");

  setText("[data-guest-name]", guest.displayName);
  setText("[data-guest-member]", guest.membership);
  setText("[data-room-number]", guest.room);
  setText("[data-room-subtitle]", guest.roomSubtitle);
  setText("[data-room-checkout]", guest.checkoutTime ? `Check Out : ${guest.checkoutTime}` : undefined);
  setText("[data-weather-city]", location.city);
  setText("[data-weather-temp]", location.fallbackTemperature);
  setText("[data-wifi-title]", home.wifiTitle);
  setHtml("[data-wifi-desc]", home.wifiDescription);
  setText("[data-welcome-message]", welcome.message);
  setWelcomeTitle(guest.welcomeName);

  if (Array.isArray(welcome.heroSlides)) {
    welcome.heroSlides.forEach((slide, index) => {
      setImage(`[data-hero-slide="${index}"]`, slide && slide.src, slide && slide.alt);
    });
  }
}

function initLiveWeather() {
  const tempElement = document.querySelector("[data-weather-temp]");
  if (!tempElement) return;

  const location = (window.HILTON_SITE_CONFIG && window.HILTON_SITE_CONFIG.location) || {};
  const latitude = typeof location.latitude === "number" ? location.latitude : 3.139;
  const longitude = typeof location.longitude === "number" ? location.longitude : 101.6869;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`;

  fetch(url, { cache: "no-store" })
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((data) => {
      const temp = data && data.current && data.current.temperature_2m;
      if (typeof temp === "number") tempElement.textContent = `${Math.round(temp)}°C`;
    })
    .catch(() => {}); // Keep fallback temperature if internet/weather fails.
}

function initPlaceholderTitle() {
  const title = document.querySelector("[data-page-title]");
  if (!title) return;
  const params = new URLSearchParams(window.location.search);
  title.textContent = params.get("page") || "Menu Page";
}

function initPromotionTitle() {
  const title = document.querySelector("[data-promo-title]");
  if (!title) return;

  const type = new URLSearchParams(window.location.search).get("type");
  const titles = { breakfast: "Breakfast Buffet", spa: "Spa Retreat", checkout: "Late Check-out" };
  title.textContent = titles[type] || "Promotion";
}

window.addEventListener("load", function () {
  fitStage();
  initSiteConfig();
  selectItem(getSelectedItem());
  setupHomeBackGuard();
  setupBrowserBackGuard();
  initHeroCarousel();
  initLiveClock();
  initLiveWeather();
  initPlaceholderTitle();
  initPromotionTitle();
  // One more check after all Home content/images are ready. This prevents Home
  // from returning with a stale TV WebView scale.
  window.setTimeout(fitStage, 120);
});
