(function () {
  const page = document.querySelector('.favourites-page');
  if (!page) return;

  const channels = window.IPTV_CHANNELS || [];
  const movies = window.IPTV_MOVIES || [];
  const config = window.IPTV_FAVOURITES_CONFIG || { defaultChannels: [], defaultMovies: [] };
  const contentConfig = (window.IPTV_CONTENT_CONFIG && window.IPTV_CONTENT_CONFIG.favourites) || {};

  const filtersEl = document.getElementById('favFilters');
  const cardTrack = document.getElementById('favCardTrack');
  const heroImage = document.getElementById('favHeroImage');
  const heroVideo = document.getElementById('favHeroVideo');
  const heroType = document.getElementById('favHeroType');
  const heroTitle = document.getElementById('favHeroTitle');
  const heroDesc = document.getElementById('favHeroDesc');
  const heroMetaA = document.getElementById('favHeroMetaA');
  const heroMetaB = document.getElementById('favHeroMetaB');
  const openButton = document.getElementById('favOpenButton');
  const sideOpenButton = document.getElementById('favSideOpen');
  const removeButton = document.getElementById('favRemoveButton');
  const detailPreview = document.getElementById('favDetailPreview');
  const detailLabel = document.getElementById('favDetailLabel');
  const detailTitle = document.getElementById('favDetailTitle');
  const detailDesc = document.getElementById('favDetailDesc');
  const channelCount = document.getElementById('favChannelCount');
  const movieCount = document.getElementById('favMovieCount');
  const counter = document.getElementById('favCounter');
  const footerHint = document.getElementById('favFooterHint');
  const note = document.getElementById('favNote');
  const gridTitle = document.getElementById('favGridTitle');

  const filters = Array.isArray(contentConfig.filters) && contentConfig.filters.length
    ? contentConfig.filters
    : [
      { id: 'all', label: 'All Favourites' },
      { id: 'channels', label: 'Channels' },
      { id: 'movies', label: 'Movies' }
    ];

  let favouriteIds = loadFavourites();
  let filterIndex = 0; // previewed filter; follows the highlighted selection panel item
  let filterFocusIndex = filterIndex; // highlighted filter, moves with arrows
  let filtered = [];
  let itemIndex = 0;
  let actionIndex = 0;
  let focusArea = 'filters'; // filters | cards | hero | actions

  function loadFavourites() {
    const fallback = {
      channels: Array.isArray(config.defaultChannels) ? config.defaultChannels.slice() : [],
      movies: Array.isArray(config.defaultMovies) ? config.defaultMovies.slice() : []
    };
    try {
      const saved = JSON.parse(localStorage.getItem('IPTV_FAVOURITES'));
      if (saved && Array.isArray(saved.channels) && Array.isArray(saved.movies)) return saved;
    } catch (error) {}
    return fallback;
  }

  function saveFavourites() {
    try { localStorage.setItem('IPTV_FAVOURITES', JSON.stringify(favouriteIds)); } catch (error) {}
  }

  function allItems() {
    const channelItems = channels
      .filter(channel => favouriteIds.channels.includes(channel.id))
      .map(channel => ({
        type: 'channel',
        id: channel.id,
        title: channel.name,
        subtitle: channel.subtitle || channel.programTitle || channel.category || 'Channel',
        category: channel.category || 'Channel',
        image: channel.logo,
        video: channel.video,
        description: `${channel.programTitle || channel.subtitle || channel.name} · ${channel.status || 'Now Playing'}`,
        metaA: channel.number ? `Channel ${channel.number}` : 'Channel',
        metaB: channel.status || 'Now Playing',
        href: `live-tv.html?channel=${encodeURIComponent(channel.id)}`,
        source: channel
      }));

    const movieItems = movies
      .filter(movie => favouriteIds.movies.includes(movie.id))
      .map(movie => ({
        type: 'movie',
        id: movie.id,
        title: movie.title,
        subtitle: movie.category || movie.rating || 'Movie',
        category: movie.category || 'Movie',
        image: movie.poster,
        backdrop: movie.backdrop,
        video: movie.video,
        description: movie.desc || 'Favourite movie',
        metaA: movie.year || 'Movie',
        metaB: movie.duration || movie.rating || 'Watch Now',
        href: `movie-player.html?id=${encodeURIComponent(movie.id)}`,
        source: movie
      }));

    return channelItems.concat(movieItems);
  }

  function currentFilter() {
    return filters[filterIndex] || filters[0];
  }

  function filteredItems() {
    const items = allItems();
    if (currentFilter().id === 'channels') return items.filter(item => item.type === 'channel');
    if (currentFilter().id === 'movies') return items.filter(item => item.type === 'movie');
    return items;
  }

  function activeItem() {
    return filtered[itemIndex] || filtered[0] || null;
  }

  function renderFilters() {
    filtersEl.innerHTML = '';
    filters.forEach((filter, index) => {
      const button = document.createElement('button');
      button.className = 'fav-filter-item';
      button.type = 'button';
      const icons = {
        all: 'assets/icons/home/favourites.svg',
        channels: 'assets/icons/home/tv.svg',
        movies: 'assets/icons/home/movies.svg'
      };
      const icon = icons[filter.id] || icons.all;
      button.innerHTML = `<img src="${icon}" alt="" aria-hidden="true" /><span>${filter.label}</span>`;
      button.classList.toggle('active', index === filterIndex);
      button.classList.toggle('focused', focusArea === 'filters' && index === filterFocusIndex);
      button.addEventListener('click', () => {
        filterFocusIndex = index;
        focusArea = 'filters';
        previewFocusedFilter();
      });
      filtersEl.appendChild(button);
    });
  }

  function renderCards() {
    cardTrack.innerHTML = '';
    filtered.forEach((item, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `fav-card fav-card-${item.type}`;
      card.classList.toggle('selected', index === itemIndex);
      card.classList.toggle('focused', focusArea === 'cards' && index === itemIndex);
      card.dataset.index = String(index);

      if (item.type === 'movie') {
        card.innerHTML = `
          <img class="fav-card-poster" src="${item.image}" alt="${escapeHtml(item.title)} poster" />
          <span class="fav-type-pill">Movie</span>
          <div class="fav-card-gradient"></div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.category)}</p>`;
      } else {
        card.innerHTML = `
          <div class="fav-channel-logo-wrap"><img src="${item.image}" alt="${escapeHtml(item.title)} logo" /></div>
          <span class="fav-type-pill">Channel</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.subtitle)}</p>`;
      }

      card.addEventListener('click', () => {
        itemIndex = index;
        focusArea = 'cards';
        updateAll(false);
      });
      cardTrack.appendChild(card);
    });
    moveCardTrack();
  }

  function moveCardTrack() {
    const visible = 4;
    const cardWidth = 117;
    const gap = 12;
    const maxStart = Math.max(0, filtered.length - visible);
    const start = Math.min(Math.max(0, itemIndex - 1), maxStart);
    cardTrack.style.transform = `translateX(${-start * (cardWidth + gap)}px)`;
  }

  function renderDetailPreview(item) {
    if (!item) {
      detailPreview.innerHTML = '';
      return;
    }
    if (item.type === 'movie') {
      detailPreview.innerHTML = `<img src="${item.image}" alt="${escapeHtml(item.title)} poster" />`;
    } else {
      detailPreview.innerHTML = `<div class="fav-detail-channel-logo"><img src="${item.image}" alt="${escapeHtml(item.title)} logo" /></div>`;
    }
  }

  function updateHero() {
    const item = activeItem();
    const channelsTotal = favouriteIds.channels.length;
    const moviesTotal = favouriteIds.movies.length;
    channelCount.textContent = String(channelsTotal);
    movieCount.textContent = String(moviesTotal);

    gridTitle.textContent = currentFilter().id === 'all' ? 'Saved For You' : currentFilter().label;

    if (!item) {
      heroImage.removeAttribute('src');
      heroVideo.pause();
      heroVideo.removeAttribute('src');
      heroVideo.style.opacity = '0';
      heroImage.style.opacity = '0';
      heroType.textContent = 'Empty';
      heroTitle.textContent = 'No favourites yet';
      heroDesc.textContent = 'Saved channels and movies will appear here.';
      heroMetaA.textContent = '0 items';
      heroMetaB.textContent = 'Add from pages';
      detailLabel.textContent = 'Empty';
      detailTitle.textContent = 'No favourite selected';
      detailDesc.textContent = 'Choose another filter or add favourites later.';
      counter.textContent = '0 of 0';
      renderDetailPreview(null);
      return;
    }

    heroType.textContent = item.type === 'channel' ? 'Favourite Channel' : 'Favourite Movie';
    heroTitle.textContent = item.title;
    heroDesc.textContent = item.description;
    heroMetaA.textContent = item.metaA;
    heroMetaB.textContent = item.metaB;
    detailLabel.textContent = item.type === 'channel' ? 'Channel' : 'Movie';
    detailTitle.textContent = item.title;
    detailDesc.textContent = item.type === 'channel'
      ? `${item.subtitle} · ${item.category}`
      : `${item.category} · ${item.metaA} · ${item.metaB}`;
    counter.textContent = `${itemIndex + 1} of ${filtered.length}`;
    renderDetailPreview(item);

    if (item.type === 'channel') {
      heroImage.style.opacity = '0';
      heroImage.removeAttribute('src');
      if (heroVideo.dataset.src !== item.video) {
        heroVideo.dataset.src = item.video;
        heroVideo.src = item.video;
        heroVideo.load();
      }
      heroVideo.style.opacity = '0.72';
      heroVideo.play().catch(() => {});
    } else {
      heroVideo.pause();
      heroVideo.removeAttribute('src');
      heroVideo.removeAttribute('data-src');
      heroVideo.style.opacity = '0';
      const nextImage = item.backdrop || item.image;
      if (heroImage.getAttribute('src') !== nextImage) heroImage.src = nextImage;
      heroImage.style.opacity = '0.78';
    }

    const actionButtons = [sideOpenButton, removeButton];
    actionButtons.forEach((button, index) => {
      button.classList.toggle('selected', focusArea === 'actions' && index === actionIndex);
    });
    openButton.classList.toggle('selected', focusArea === 'hero');
  }

  function updateCardsNoRebuild() {
    Array.from(cardTrack.children).forEach((card, index) => {
      card.classList.toggle('selected', index === itemIndex);
      card.classList.toggle('focused', focusArea === 'cards' && index === itemIndex);
    });
    moveCardTrack();
  }

  function updateFooter() {
    if (!footerHint) return;
    const mode = focusArea;
    if (mode === 'filters') footerHint.innerHTML = '<span>Choose favourite type</span><span>·</span><span>Content previews now</span><span>·</span><span>Press</span><b>OK</b><span>to enter</span>';
    else if (mode === 'cards') footerHint.innerHTML = '<span>Browse saved channels and movies</span><span>·</span><span>Press</span><b>OK</b><span>to choose action</span>';
    else if (mode === 'hero') footerHint.innerHTML = '<span>Press</span><b>OK</b><span>to choose action</span>';
    else footerHint.innerHTML = '<span>Select action</span><span>·</span><span>Press</span><b>OK</b><span>to confirm</span>';
  }

  function updateAll(rebuildCards) {
    renderFilters();
    if (rebuildCards) renderCards();
    else updateCardsNoRebuild();
    updateHero();
    updateFooter();
  }

  function previewFocusedFilter() {
    filterIndex = filterFocusIndex;
    filtered = filteredItems();
    itemIndex = 0;
    focusArea = 'filters';
    updateAll(true);
  }

  function enterFocusedFilter() {
    // OK enters the currently previewed card option area.
    focusArea = filtered.length ? 'cards' : 'filters';
    updateAll(false);
  }

  function moveFilter(delta) {
    const next = Math.max(0, Math.min(filters.length - 1, filterFocusIndex + delta));
    if (next === filterFocusIndex) return;
    filterFocusIndex = next;
    previewFocusedFilter();
  }

  function moveItem(delta) {
    if (!filtered.length) return;
    const next = Math.max(0, Math.min(filtered.length - 1, itemIndex + delta));
    if (next === itemIndex) return;
    itemIndex = next;
    updateAll(false);
  }

  function openActive() {
    const item = activeItem();
    if (!item) return;
    // Open directly without zoom/pressed animation when switching pages.
    window.location.href = item.href;
  }

  function removeActive() {
    const item = activeItem();
    if (!item) return;
    if (item.type === 'channel') {
      favouriteIds.channels = favouriteIds.channels.filter(id => id !== item.id);
    } else {
      favouriteIds.movies = favouriteIds.movies.filter(id => id !== item.id);
    }
    saveFavourites();
    note.textContent = `${item.title} removed from favourites.`;
    filtered = filteredItems();
    itemIndex = Math.min(itemIndex, Math.max(0, filtered.length - 1));
    focusArea = filtered.length ? 'cards' : 'filters';
    updateAll(true);
  }

  function activateAction() {
    if (focusArea === 'filters') {
      enterFocusedFilter();
    } else if (focusArea === 'cards' || focusArea === 'hero') {
      focusArea = 'actions';
      actionIndex = 0;
      updateAll(false);
    } else if (focusArea === 'actions') {
      if (actionIndex === 1) removeActive();
      else openActive();
    }
  }

  function returnToSelectionPanel() {
    if (focusArea === 'filters') {
      window.IPTVRemote.goHome();
      return false;
    }
    filterFocusIndex = filterIndex;
    focusArea = 'filters';
    updateAll(false);
    return true;
  }

  if (window.IPTVRemote && window.IPTVRemote.setBackHandler) {
    window.IPTVRemote.setBackHandler(returnToSelectionPanel);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  document.addEventListener('keydown', function(event) {
    const key = window.IPTVRemote.normalize(event);
    if (window.IPTVRemote.isHome(key)) {
      window.IPTVRemote.stop(event);
      window.IPTVRemote.goHome();
      return;
    }
    if (key === 'ArrowUp') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'filters') moveFilter(-1);
      else if (focusArea === 'cards') focusArea = 'hero';
      else if (focusArea === 'actions') actionIndex = Math.max(0, actionIndex - 1);
      else { /* stay inside option area; use Return for filter panel */ }
      updateAll(false);
    } else if (key === 'ArrowDown') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'filters') moveFilter(1);
      else if (focusArea === 'hero') focusArea = 'cards';
      else if (focusArea === 'actions') actionIndex = Math.min(1, actionIndex + 1);
      else focusArea = 'cards';
      updateAll(false);
    } else if (key === 'ArrowRight') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'filters') {
        // Filter panel is locked to Up / Down. Press OK to apply the highlighted filter.
      }
      else if (focusArea === 'cards') moveItem(1);
      else if (focusArea === 'hero') { focusArea = 'actions'; actionIndex = 0; }
      else if (focusArea === 'actions') { /* stay in action panel */ }
      updateAll(false);
    } else if (key === 'ArrowLeft') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'cards') {
        if (itemIndex === 0) { /* stay inside option area; use Return for filter panel */ }
        else moveItem(-1);
      } else if (focusArea === 'hero') { /* stay inside option area; use Return for filter panel */ }
      else if (focusArea === 'actions') focusArea = 'cards';
      else { /* stay on this page; use Return or Home for page navigation */ }
      updateAll(false);
    } else if (window.IPTVRemote.isConfirm(key)) {
      window.IPTVRemote.stop(event);
      activateAction();
    } else if (window.IPTVRemote.isBack(key)) {
      window.IPTVRemote.stop(event);
      returnToSelectionPanel();
    }
  }, true);

  openButton.addEventListener('click', () => { focusArea = 'actions'; actionIndex = 0; updateAll(false); });
  sideOpenButton.addEventListener('click', () => { focusArea = 'actions'; actionIndex = 0; updateAll(false); });
  removeButton.addEventListener('click', () => { focusArea = 'actions'; actionIndex = 1; updateAll(false); });

  filtered = filteredItems();
  updateAll(true);
})();
