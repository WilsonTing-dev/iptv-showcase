(function () {
  const channels = Array.isArray(window.IPTV_CHANNELS) ? window.IPTV_CHANNELS : [];
  const contentConfig = (window.IPTV_CONTENT_CONFIG && window.IPTV_CONTENT_CONFIG.liveTv) || {};
  const listEl = document.getElementById('channelList');
  const videoEl = document.getElementById('liveVideo');
  const programLogo = document.getElementById('programLogo');
  const programChannelName = document.getElementById('programChannelName');
  const programTitle = document.getElementById('programTitle');
  const programStatus = document.getElementById('programStatus');
  const footerHint = document.querySelector('.live-footer-hint');
  const favButton = document.getElementById('liveFavButton');
  const fullscreenButton = document.getElementById('liveFullscreenButton');

  if (!listEl || !channels.length) return;

  const PAGE_SIZE = Number(contentConfig.pageSize) || 5;
  const params = new URLSearchParams(window.location.search);
  // If a specific channel is opened from Favourites, use it. Otherwise start on the first channel.
  const requestedId = params.get('channel');
  const requestedIndex = requestedId ? channels.findIndex(channel => channel.id === requestedId) : -1;

  // Always start Live TV on the first channel unless a Favourites link gives ?channel=id.
  // This stops the page from jumping to the old/default fourth channel.
  let focusIndex = requestedIndex >= 0 ? requestedIndex : 0;       // remote border / highlighted row
  let activeIndex = requestedIndex >= 0 ? requestedIndex : 0;      // confirmed channel/video, changes after OK
  let pageIndex = 0;
  let focusArea = 'channels'; // channels | actions
  let actionIndex = 1; // 0 favourite, 1 fullscreen

  function activeChannel() {
    return channels[activeIndex] || channels[0];
  }

  function focusedChannel() {
    return channels[focusIndex] || channels[0];
  }

  function pageCount() {
    return Math.max(1, Math.ceil(channels.length / PAGE_SIZE));
  }

  function clampFocus() {
    focusIndex = Math.max(0, Math.min(channels.length - 1, focusIndex));
    pageIndex = Math.max(0, Math.min(Math.floor(focusIndex / PAGE_SIZE), pageCount() - 1));
  }


  function updateFooter() {
    if (!footerHint) return;
    footerHint.innerHTML = focusArea === 'actions'
      ? '<span>Choose Favourite or Fullscreen</span><span class="hint-divider"></span><span>Press</span><b>OK</b><span>to select</span><span class="hint-divider"></span><span>Return to channels</span>'
      : '<span>Use</span><b>▲ ▼</b><span>to preview channels</span><span class="hint-divider"></span><span>OK opens options</span>';
  }

  function renderChannels() {
    clampFocus();
    const start = pageIndex * PAGE_SIZE;
    const visible = channels.slice(start, start + PAGE_SIZE);
    listEl.innerHTML = '';

    visible.forEach((channel, localIndex) => {
      const index = start + localIndex;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'live-channel';
      button.classList.toggle('selected', focusArea === 'channels' && index === focusIndex);
      button.classList.toggle('previewing', focusArea !== 'channels' && index === focusIndex);
      button.classList.toggle('playing', index === activeIndex);
      button.dataset.channelId = channel.id;
      button.innerHTML = `
        <span class="channel-number">${channel.number}</span>
        <span class="channel-line"></span>
        <img class="channel-logo" src="${channel.logo}" alt="${channel.name}" />
        <span class="channel-copy"><strong>${channel.name}</strong><small>${channel.subtitle}</small></span>
      `;
      button.addEventListener('click', () => {
        focusIndex = index;
        focusArea = 'channels';
        renderChannels();
        renderFocusedPreview();
      });
      listEl.appendChild(button);
    });

    if (channels.length > PAGE_SIZE) {
      const bar = document.createElement('div');
      bar.className = 'live-channel-scrollbar';
      const thumb = document.createElement('span');
      const pages = pageCount();
      const height = pages <= 1 ? 100 : Math.max(24, 100 / pages);
      const top = pages <= 1 ? 0 : (pageIndex / (pages - 1)) * (100 - height);
      thumb.style.height = `${height}%`;
      thumb.style.top = `${top}%`;
      bar.appendChild(thumb);
      listEl.appendChild(bar);
    }
  }

  function renderProgramInfo(channel) {
    if (!channel) return;
    if (programLogo) programLogo.src = channel.logo;
    if (programChannelName) programChannelName.textContent = channel.name;
    if (programTitle) programTitle.textContent = channel.programTitle || channel.subtitle;
    if (programStatus) programStatus.textContent = channel.status || 'Now Playing';
  }

  function updateLiveActions() {
    const channel = focusedChannel();
    if (!channel) return;
    const buttons = [favButton, fullscreenButton];
    buttons.forEach((button, index) => {
      if (!button) return;
      button.classList.toggle('focused', focusArea === 'actions' && index === actionIndex);
    });
    if (favButton && window.IPTVFavourites) {
      const active = window.IPTVFavourites.has('channel', channel.id);
      favButton.classList.toggle('active', active);
      favButton.innerHTML = `<span>${active ? '♥' : '♡'}</span>${active ? 'Saved' : 'Favourite'}`;
    }
  }

  function loadChannel(channel, playNow) {
    if (!channel) return;
    if (videoEl && videoEl.dataset.src !== channel.video) {
      videoEl.dataset.src = channel.video;
      videoEl.src = channel.video;
      videoEl.load();
    }
    renderProgramInfo(channel);
    updateLiveActions();
    if (playNow && videoEl) videoEl.play().catch(() => {});
  }

  function renderFocusedPreview() {
    // Preview must stay visually consistent: program banner and screen preview
    // both follow the highlighted channel while browsing the selection panel.
    if (videoEl && focusArea === 'channels') videoEl.muted = true;
    loadChannel(focusedChannel(), true);
  }

  function showLiveToast(message) {
    let toast = document.querySelector('.live-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'live-toast';
      document.querySelector('.live-tv-page').appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    window.clearTimeout(showLiveToast.timer);
    showLiveToast.timer = window.setTimeout(() => toast.classList.remove('show'), 1300);
  }

  function toggleFavouriteChannel() {
    const channel = focusedChannel();
    if (!channel || !window.IPTVFavourites) return;
    const active = window.IPTVFavourites.toggle('channel', channel.id);
    if (favButton) {
      favButton.classList.add('pressed');
      window.setTimeout(() => favButton.classList.remove('pressed'), 150);
    }
    updateLiveActions();
    showLiveToast(active ? `${channel.name} saved to favourites` : `${channel.name} removed from favourites`);
  }

  function requestFullscreen() {
    const target = videoEl || document.querySelector('.live-preview-panel');
    if (!target) return;
    const fn = target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen;
    if (fn) {
      const result = fn.call(target);
      if (result && typeof result.catch === 'function') result.catch(() => showLiveToast('Fullscreen unavailable'));
    } else {
      showLiveToast('Fullscreen unavailable on this browser');
    }
  }


  function moveFocus(delta) {
    const next = Math.max(0, Math.min(channels.length - 1, focusIndex + delta));
    if (next === focusIndex) return;
    focusIndex = next;
    focusArea = 'channels';
    renderChannels();
    renderFocusedPreview();
    updateLiveActions();
    updateFooter();
  }

  function activateFocusedChannel() {
    activeIndex = focusIndex;
    focusArea = 'actions';
    actionIndex = 1;
    loadChannel(focusedChannel(), true);
    if (videoEl) {
      videoEl.muted = false;
      videoEl.play().catch(() => {});
    }
    renderChannels();
    renderFocusedPreview();
    const selected = document.querySelector('.live-channel.selected');
    if (selected) {
      selected.classList.add('pressed');
      window.setTimeout(() => selected.classList.remove('pressed'), 150);
    }
  }

  function handleBackReturn() {
    if (focusArea === 'actions') {
      focusArea = 'channels';
      renderChannels();
      updateLiveActions();
      updateFooter();
      return true;
    }
    window.IPTVRemote.goHome();
    return false;
  }

  if (window.IPTVRemote && window.IPTVRemote.setBackHandler) {
    window.IPTVRemote.setBackHandler(handleBackReturn);
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
      if (focusArea === 'channels') moveFocus(-1);
      else { /* actions stay horizontal; use Return for channel list */ }
    } else if (key === 'ArrowDown') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'channels') moveFocus(1);
      else { /* actions stay horizontal; use Return for channel list */ }
    } else if (key === 'ArrowLeft') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'actions') {
        actionIndex = Math.max(0, actionIndex - 1);
        updateLiveActions();
        updateFooter();
      }
      // Channel selection panel is locked to Up / Down only.
    } else if (key === 'ArrowRight') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'actions') {
        actionIndex = Math.min(1, actionIndex + 1);
        updateLiveActions();
        updateFooter();
      }
      // Channel selection panel is locked to Up / Down only.
    } else if (window.IPTVRemote.isConfirm(key)) {
      window.IPTVRemote.stop(event);
      if (focusArea === 'channels') activateFocusedChannel();
      else if (actionIndex === 0) toggleFavouriteChannel();
      else requestFullscreen();
    } else if (window.IPTVRemote.isBack(key)) {
      window.IPTVRemote.stop(event);
      handleBackReturn();
    }
  }, true);

  renderChannels();
  loadChannel(activeChannel(), true);
  updateLiveActions();
  updateFooter();
  if (favButton) favButton.addEventListener('click', () => { focusArea = 'actions'; actionIndex = 0; updateLiveActions(); updateFooter(); });
  if (fullscreenButton) fullscreenButton.addEventListener('click', () => { focusArea = 'actions'; actionIndex = 1; updateLiveActions(); updateFooter(); });
})();
