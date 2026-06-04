(function () {
  const page = document.querySelector('[data-youtube-direct="true"]');
  if (!page) return;

  const YOUTUBE_URL = 'https://www.youtube.com/';
  const HOME_URL = 'home.html?fromApp=1';
  let cancelled = false;
  let launchTimer = null;

  function goHome() {
    cancelled = true;
    if (launchTimer) window.clearTimeout(launchTimer);
    window.location.href = HOME_URL;
  }

  // Keep this page as a clean IPTV launcher: no categories, no search, no extra states.
  // It opens YouTube directly, while Home or Return/Esc still works before the browser leaves localhost.
  function launchYouTube() {
    if (cancelled) return;
    window.location.replace(YOUTUBE_URL);
  }

  if (window.IPTVRemote && window.IPTVRemote.setBackHandler) {
    window.IPTVRemote.setBackHandler(function () { goHome(); return false; });
  }

  document.addEventListener('keydown', function (event) {
    const key = window.IPTVRemote.normalize(event);
    if (window.IPTVRemote.isHome(key) || window.IPTVRemote.isBack(key)) {
      window.IPTVRemote.stop(event);
      goHome();
    }
  }, true);

  window.addEventListener('load', function () {
    launchTimer = window.setTimeout(launchYouTube, 550);
  });
})();
