(function () {
  const page = document.querySelector('.radio-page');
  if (!page) return;

  const stations = Array.isArray(window.IPTV_RADIO_STATIONS) ? window.IPTV_RADIO_STATIONS : [];
  const contentConfig = (window.IPTV_CONTENT_CONFIG && window.IPTV_CONTENT_CONFIG.radio) || {};
  const categories = Array.isArray(contentConfig.categories) && contentConfig.categories.length
    ? contentConfig.categories
    : ['All Stations', 'Local', 'News', 'Jazz', 'Pop', 'Relax'];

  const categoryPanel = document.getElementById('radioCategories');
  const stationGrid = document.getElementById('radioStationGrid');
  const stationDots = document.getElementById('radioStationDots');
  const playerPanel = document.getElementById('radioPlayerPanel');
  const centerPlay = document.getElementById('radioCenterPlay');
  const audio = document.getElementById('radioAudio');
  const progressWrap = document.getElementById('radioProgressWrap');
  const progressTrack = document.getElementById('radioProgressTrack');
  const progressFill = document.getElementById('radioProgressFill');
  const progressThumb = document.getElementById('radioProgressThumb');
  const elapsed = document.getElementById('radioElapsed');
  const duration = document.getElementById('radioDuration');
  const gridTitle = document.getElementById('radioGridTitle');
  const counter = document.getElementById('radioCounter');
  const kicker = document.getElementById('radioKicker');
  const nowTitle = document.getElementById('radioNowTitle');
  const nowSubtitle = document.getElementById('radioNowSubtitle');
  const disc = document.getElementById('radioDisc');
  const discInitial = document.getElementById('radioDiscInitial');
  const detailLogo = document.getElementById('radioDetailLogo');
  const detailCategory = document.getElementById('radioDetailCategory');
  const detailName = document.getElementById('radioDetailName');
  const detailDesc = document.getElementById('radioDetailDesc');
  const frequency = document.getElementById('radioFrequency');
  const mood = document.getElementById('radioMood');
  const nowProgram = document.getElementById('radioNowProgram');
  const nextProgram = document.getElementById('radioNextProgram');
  const playButton = document.getElementById('radioPlayButton');
  const stopButton = document.getElementById('radioStopButton');
  const note = document.getElementById('radioNote');
  const footerHint = document.getElementById('radioFooterHint');

  const STATIONS_PER_PAGE = Number(contentConfig.stationsPerPage) || 4;
  const COLUMNS = Number(contentConfig.columns) || 2;
  let categoryIndex = 0;       // previewed category; follows the highlighted selection panel item
  let categoryFocusIndex = 0;  // border highlight in the left panel
  let stationIndex = 0;
  let actionIndex = 0;
  let focusArea = 'categories'; // categories | stations | player | progress | actions
  let filtered = [];

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function initials(name) {
    return String(name || 'R')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'R';
  }

  function activeCategory() {
    return categories[categoryIndex] || categories[0];
  }

  function activeStation() {
    return filtered[stationIndex] || filtered[0] || stations[0] || null;
  }

  function countByCategory(category) {
    if (category === 'All Stations') return String(stations.length);
    return String(stations.filter(station => station.category === category).length);
  }

  function categoryStations() {
    const category = activeCategory();
    if (category === 'All Stations') return stations.slice();
    return stations.filter(station => station.category === category);
  }

  function renderCategories() {
    categoryPanel.innerHTML = '';
    categories.forEach((category, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'radio-category-item';
      button.classList.toggle('active', index === categoryIndex);
      button.classList.toggle('focused', focusArea === 'categories' && index === categoryFocusIndex);
      button.innerHTML = `<span>${escapeHtml(category)}</span><small>${countByCategory(category)}</small>`;
      button.addEventListener('click', () => {
        categoryFocusIndex = index;
        focusArea = 'categories';
        previewFocusedCategory();
      });
      categoryPanel.appendChild(button);
    });
  }

  function getStationPage() {
    return filtered.length ? Math.floor(stationIndex / STATIONS_PER_PAGE) : 0;
  }

  function clampStation() {
    stationIndex = Math.max(0, Math.min(Math.max(0, filtered.length - 1), stationIndex));
  }

  function renderStationDots(page, totalPages) {
    if (!stationDots) return;
    stationDots.innerHTML = '';
    if (totalPages <= 1) return;
    for (let i = 0; i < totalPages; i += 1) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'radio-station-dot';
      dot.classList.toggle('active', i === page);
      dot.setAttribute('aria-label', `Radio page ${i + 1}`);
      stationDots.appendChild(dot);
    }
  }

  function stationCardMarkup(station) {
    const init = initials(station.name);
    const color = station.color || '#F5F5F7';
    return `
      <div class="radio-station-logo" style="--station-color:${escapeHtml(color)}"><span>${escapeHtml(init)}</span></div>
      <div class="radio-station-copy">
        <h3>${escapeHtml(station.name)}</h3>
        <p>${escapeHtml(station.frequency)} · ${escapeHtml(station.category)}</p>
        <small>${escapeHtml(station.now)}</small>
      </div>`;
  }

  function renderStations() {
    stationGrid.innerHTML = '';
    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'radio-empty-result';
      empty.textContent = 'No stations available';
      stationGrid.appendChild(empty);
      if (stationDots) stationDots.innerHTML = '';
      return;
    }

    clampStation();
    const totalPages = Math.ceil(filtered.length / STATIONS_PER_PAGE);
    const pageNo = getStationPage();
    const start = pageNo * STATIONS_PER_PAGE;
    const visible = filtered.slice(start, start + STATIONS_PER_PAGE);

    visible.forEach((station, localIndex) => {
      const actualIndex = start + localIndex;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'radio-station-card';
      card.classList.toggle('selected', actualIndex === stationIndex);
      card.classList.toggle('focused', focusArea === 'stations' && actualIndex === stationIndex);
      card.dataset.index = String(actualIndex);
      card.innerHTML = stationCardMarkup(station);
      card.addEventListener('click', () => {
        stationIndex = actualIndex;
        focusArea = 'stations';
        updateAll(true);
      });
      stationGrid.appendChild(card);
    });

    renderStationDots(pageNo, totalPages);
  }

  function updateStations() {
    Array.from(stationGrid.querySelectorAll('.radio-station-card')).forEach((card) => {
      const index = Number(card.dataset.index);
      card.classList.toggle('selected', index === stationIndex);
      card.classList.toggle('focused', focusArea === 'stations' && index === stationIndex);
    });
  }

  function loadStation(resetTime) {
    const station = activeStation();
    if (!station) return;
    if (audio.dataset.stationId !== station.id) {
      audio.dataset.stationId = station.id;
      audio.src = station.audio;
      if (resetTime) audio.currentTime = 0;
      updateProgress();
    }
  }

  function updateDetail() {
    const station = activeStation();
    if (!station) {
      gridTitle.textContent = 'Available Stations';
      counter.textContent = '0 of 0';
      kicker.textContent = 'Radio';
      nowTitle.textContent = 'No station selected';
      nowSubtitle.textContent = 'Choose another category';
      detailName.textContent = 'No station selected';
      detailDesc.textContent = 'Choose another category.';
      frequency.textContent = '-';
      mood.textContent = '-';
      nowProgram.textContent = '-';
      nextProgram.textContent = '-';
      return;
    }

    const pageStart = getStationPage() * STATIONS_PER_PAGE + 1;
    const pageEnd = Math.min(filtered.length, getStationPage() * STATIONS_PER_PAGE + STATIONS_PER_PAGE);
    gridTitle.textContent = `${activeCategory()} Radio`;
    counter.textContent = `${pageStart}-${pageEnd} of ${filtered.length}`;
    kicker.textContent = station.category || 'Radio';
    nowTitle.textContent = station.name;
    nowSubtitle.textContent = station.now;
    const init = initials(station.name);
    const color = station.color || '#F5F5F7';
    disc.style.setProperty('--station-color', color);
    detailLogo.style.setProperty('--station-color', color);
    discInitial.textContent = init;
    detailLogo.innerHTML = `<span>${escapeHtml(init)}</span>`;
    detailCategory.textContent = String(station.category || 'Radio').toUpperCase();
    detailName.textContent = station.name;
    detailDesc.textContent = station.desc;
    frequency.textContent = station.frequency;
    mood.textContent = station.mood;
    nowProgram.textContent = station.now;
    nextProgram.textContent = station.next;
    playButton.innerHTML = `<span class="radio-play-icon"></span> ${audio.paused ? 'Play Station' : 'Pause Station'}`;
  }

  function updateFocus() {
    playerPanel.classList.toggle('focused', focusArea === 'player');
    progressWrap.classList.toggle('focused', focusArea === 'progress');
    centerPlay.classList.toggle('focused', focusArea === 'player');
    playButton.classList.toggle('focused', focusArea === 'actions' && actionIndex === 0);
    stopButton.classList.toggle('focused', focusArea === 'actions' && actionIndex === 1);
    renderCategories();
    updateStations();
  }

  function updateFooter() {
    if (!footerHint) return;
    if (focusArea === 'categories') footerHint.innerHTML = '<span>Use</span><b>▲ ▼</b><span>to choose radio category</span><span>·</span><span>Stations preview now</span><span>·</span><span>Press</span><b>OK</b><span>to enter</span>';
    else if (focusArea === 'stations') footerHint.innerHTML = '<span>Browse stations</span><span>·</span><span>Press</span><b>OK</b><span>to load station</span>';
    else if (focusArea === 'player') footerHint.innerHTML = '<span>Press</span><b>OK</b><span>to play or pause</span>';
    else if (focusArea === 'progress') footerHint.innerHTML = '<span>Use</span><b>◀ ▶</b><span>to seek sample audio</span>';
    else footerHint.innerHTML = '<span>Select action</span><span>·</span><span>Press</span><b>OK</b><span>to confirm</span>';
  }

  function updateAll(rebuildStations) {
    if (rebuildStations) renderStations();
    updateDetail();
    updateFocus();
    updateFooter();
  }

  function previewFocusedCategory() {
    categoryIndex = categoryFocusIndex;
    filtered = categoryStations();
    stationIndex = 0;
    focusArea = 'categories';
    updateAll(true);
  }

  function enterFocusedCategory() {
    // OK enters the currently previewed stations area.
    focusArea = filtered.length ? 'stations' : 'categories';
    updateAll(false);
  }

  function moveCategory(delta) {
    const next = Math.max(0, Math.min(categories.length - 1, categoryFocusIndex + delta));
    if (next === categoryFocusIndex) return;
    categoryFocusIndex = next;
    previewFocusedCategory();
  }

  function moveStation(delta) {
    if (!filtered.length) return;
    const next = Math.max(0, Math.min(filtered.length - 1, stationIndex + delta));
    if (next === stationIndex) return;
    stationIndex = next;
    updateAll(true);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.floor(seconds);
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  }

  function updateProgress() {
    const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    const cur = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const pct = dur ? Math.max(0, Math.min(100, (cur / dur) * 100)) : 0;
    progressFill.style.width = `${pct}%`;
    progressThumb.style.left = `${pct}%`;
    elapsed.textContent = formatTime(cur);
    duration.textContent = dur ? formatTime(dur) : 'Live';
  }

  function seekBy(seconds) {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
    updateProgress();
  }

  function seekToRatio(ratio) {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.duration * ratio));
    updateProgress();
  }

  function togglePlay() {
    const station = activeStation();
    if (!station) return;
    loadStation(false);
    if (audio.paused) {
      audio.play().catch(() => {});
      page.classList.add('radio-playing');
      note.textContent = `${station.name} is now playing.`;
    } else {
      audio.pause();
      page.classList.remove('radio-playing');
      note.textContent = `${station.name} paused.`;
    }
    updateDetail();
  }

  function stopRadio() {
    const station = activeStation();
    audio.pause();
    if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = 0;
    page.classList.remove('radio-playing');
    note.textContent = station ? `${station.name} stopped.` : 'Radio stopped.';
    updateProgress();
    updateDetail();
  }

  function returnToSelectionPanel() {
    if (focusArea === 'categories') {
      window.IPTVRemote.goHome();
      return false;
    }
    categoryFocusIndex = categoryIndex;
    focusArea = 'categories';
    updateAll(false);
    return true;
  }

  if (window.IPTVRemote && window.IPTVRemote.setBackHandler) {
    window.IPTVRemote.setBackHandler(returnToSelectionPanel);
  }

  function activate() {
    if (focusArea === 'categories') {
      enterFocusedCategory();
    } else if (focusArea === 'stations') {
      loadStation(true);
      focusArea = 'player';
      updateAll(false);
    } else if (focusArea === 'player' || focusArea === 'progress') {
      togglePlay();
      updateAll(false);
    } else if (focusArea === 'actions') {
      if (actionIndex === 0) togglePlay();
      else stopRadio();
      updateAll(false);
    }
  }

  document.addEventListener('keydown', function (event) {
    const key = window.IPTVRemote.normalize(event);
    if (window.IPTVRemote.isHome(key)) {
      window.IPTVRemote.stop(event);
      window.IPTVRemote.goHome();
      return;
    }
    if (key === 'ArrowUp') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'categories') moveCategory(-1);
      else if (focusArea === 'stations') {
        if (stationIndex >= COLUMNS) moveStation(-COLUMNS);
        else focusArea = 'player';
        updateAll(false);
      } else if (focusArea === 'progress') { focusArea = 'player'; updateAll(false); }
      else if (focusArea === 'actions') { actionIndex = Math.max(0, actionIndex - 1); updateAll(false); }
    } else if (key === 'ArrowDown') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'categories') moveCategory(1);
      else if (focusArea === 'player') { focusArea = 'progress'; updateAll(false); }
      else if (focusArea === 'progress') { focusArea = 'stations'; updateAll(false); }
      else if (focusArea === 'stations' && stationIndex + COLUMNS < filtered.length) moveStation(COLUMNS);
      else if (focusArea === 'actions') { actionIndex = Math.min(1, actionIndex + 1); updateAll(false); }
    } else if (key === 'ArrowRight') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'categories') {
        // Left category panel is locked to Up / Down. Press OK to open it.
      } else if (focusArea === 'stations') {
        if (stationIndex % COLUMNS === 0 && stationIndex + 1 < filtered.length) moveStation(1);
        else { focusArea = 'actions'; actionIndex = 0; updateAll(false); }
      } else if (focusArea === 'player') { focusArea = 'actions'; actionIndex = 0; updateAll(false); }
      else if (focusArea === 'progress') seekBy(10);
      else if (focusArea === 'actions') { actionIndex = Math.min(1, actionIndex + 1); updateAll(false); }
    } else if (key === 'ArrowLeft') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'categories') {
        // ArrowLeft never leaves the page.
      } else if (focusArea === 'stations') {
        if (stationIndex % COLUMNS === 1) moveStation(-1);
        else { updateAll(false); /* stay inside option area; use Return for category panel */ }
      } else if (focusArea === 'player') { updateAll(false); /* stay inside option area; use Return for category panel */ }
      else if (focusArea === 'progress') seekBy(-10);
      else if (focusArea === 'actions') {
        if (actionIndex > 0) { actionIndex -= 1; updateAll(false); }
        else { focusArea = 'player'; updateAll(false); }
      }
    } else if (window.IPTVRemote.isConfirm(key)) {
      window.IPTVRemote.stop(event);
      activate();
    } else if (window.IPTVRemote.isBack(key)) {
      window.IPTVRemote.stop(event);
      returnToSelectionPanel();
    }
  }, true);

  centerPlay.addEventListener('click', () => {
    focusArea = 'player';
    updateAll(false);
  });

  playButton.addEventListener('click', () => {
    focusArea = 'actions';
    actionIndex = 0;
    updateAll(false);
  });

  stopButton.addEventListener('click', () => {
    focusArea = 'actions';
    actionIndex = 1;
    updateAll(false);
  });

  progressTrack.addEventListener('click', (event) => {
    const rect = progressTrack.getBoundingClientRect();
    seekToRatio((event.clientX - rect.left) / rect.width);
    focusArea = 'progress';
    updateAll(false);
  });

  audio.addEventListener('loadedmetadata', updateProgress);
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('play', () => { page.classList.add('radio-playing'); updateDetail(); });
  audio.addEventListener('pause', () => { page.classList.remove('radio-playing'); updateDetail(); });
  audio.addEventListener('ended', () => {
    try { audio.currentTime = 0; audio.play().catch(() => {}); } catch (e) {}
  });

  filtered = categoryStations();
  renderCategories();
  renderStations();
  loadStation(false);
  updateAll(false);
})();
