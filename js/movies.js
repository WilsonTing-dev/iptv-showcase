(function () {
  const page = document.querySelector('.movies-page');
  if (!page) return;

  const movies = window.IPTV_MOVIES || [];
  const contentConfig = (window.IPTV_CONTENT_CONFIG && window.IPTV_CONTENT_CONFIG.movies) || {};
  const categories = window.IPTV_MOVIE_CATEGORIES || ['All Movies'];
  const categoryList = document.getElementById('movieCategories');
  const heroImage = document.getElementById('movieHeroImage');
  const heroTitle = document.getElementById('movieHeroTitle');
  const heroDesc = document.getElementById('movieHeroDesc');
  const heroYear = document.getElementById('movieHeroYear');
  const heroDuration = document.getElementById('movieHeroDuration');
  const heroRating = document.getElementById('movieHeroRating');
  const watchButton = document.getElementById('movieWatchButton');
  const favButton = document.getElementById('movieFavButton');
  const posterTrack = document.getElementById('moviePosterTrack');
  const movieCounter = document.getElementById('movieCounter');
  const footerHint = document.getElementById('moviesFooterHint');
  const nextArrow = document.getElementById('movieNextArrow');

  let categoryIndex = 0; // previewed category; follows the highlighted selection panel item
  let categoryFocusIndex = categoryIndex; // highlighted category, moves with arrows
  let filtered = movies.slice();
  let movieIndex = 0;

  const categoryIcons = {
    'All Movies': 'assets/icons/movie-categories/all.svg',
    'Action': 'assets/icons/movie-categories/action.svg',
    'Drama': 'assets/icons/movie-categories/drama.svg',
    'Comedy': 'assets/icons/movie-categories/comedy.svg',
    'Sci-Fi': 'assets/icons/movie-categories/sci-fi.svg',
    'Family': 'assets/icons/movie-categories/family.svg'
  };

  let focusArea = 'categories'; // categories | posters | watch | favourite

  function normalizeRemoteKey(event) {
    return window.IPTVRemote.normalize(event);
  }

  function stopRemoteEvent(event) {
    window.IPTVRemote.stop(event);
  }

  function categoryPanelLockedNotice() {
    // The left movie category panel is a root selection panel.
    // It must never enter the movie poster area with Left/Right. OK/Enter is required.
    updateAll(false);
  }

  function categoryMovies() {
    const category = categories[categoryIndex];
    if (category === 'All Movies') return movies.slice();
    return movies.filter(movie => movie.category === category);
  }

  function activeMovie() {
    return filtered[movieIndex] || filtered[0] || movies[0];
  }

  function setFooter() {
    if (!footerHint) return;
    if (focusArea === 'watch') {
      footerHint.innerHTML = '<span>Watch selected movie</span>';
    } else if (focusArea === 'favourite') {
      footerHint.innerHTML = '<span>Save or remove favourite</span>';
    } else if (focusArea === 'posters') {
      footerHint.innerHTML = '<span>Use arrows to browse movies</span>';
    } else {
      footerHint.innerHTML = '<span>Choose a category</span>';
    }
  }

  function renderCategories() {
    categoryList.innerHTML = '';
    categories.forEach((name, index) => {
      const btn = document.createElement('button');
      btn.className = 'movie-category';
      btn.type = 'button';
      const icon = categoryIcons[name] || categoryIcons['All Movies'];
      btn.innerHTML = `<img src="${icon}" alt="" aria-hidden="true" /><span>${name}</span>`;
      btn.dataset.index = String(index);
      btn.classList.toggle('active', index === categoryIndex);
      btn.classList.toggle('focused', focusArea === 'categories' && index === categoryFocusIndex);
      btn.addEventListener('click', () => {
        categoryFocusIndex = index;
        focusArea = 'categories';
        previewFocusedCategory();
      });
      categoryList.appendChild(btn);
    });
  }

  function renderPosters() {
    posterTrack.innerHTML = '';
    filtered.forEach((movie, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'movie-poster-card';
      card.dataset.id = movie.id;
      card.classList.toggle('selected', index === movieIndex);
      card.classList.toggle('focused', focusArea === 'posters' && index === movieIndex);
      card.innerHTML = `<img src="${movie.poster}" alt="${movie.title}" />`;
      card.addEventListener('click', () => {
        movieIndex = index;
        focusArea = 'posters';
        updateAll(false);
      });
      posterTrack.appendChild(card);
    });
    movePosterTrack();
  }

  function movePosterTrack() {
    // Keep selected poster visible; 7 posters are visible in the Figma layout.
    const visible = Number(contentConfig.visiblePosters) || 7;
    const posterWidth = 122;
    const gap = 12;
    const maxStart = Math.max(0, filtered.length - visible);
    const start = Math.min(Math.max(0, movieIndex - 1), maxStart);
    const x = -(start * (posterWidth + gap));
    posterTrack.style.transform = `translateX(${x}px)`;
  }

  function updateHero() {
    const movie = activeMovie();
    if (!movie) return;
    heroImage.src = movie.backdrop;
    heroImage.alt = `${movie.title} backdrop`;
    heroTitle.textContent = movie.title;
    heroDesc.textContent = movie.desc;
    heroYear.textContent = movie.year;
    heroDuration.textContent = movie.duration;
    heroRating.textContent = movie.rating;
    movieCounter.textContent = `${movieIndex + 1} of ${filtered.length}`;
    watchButton.classList.toggle('selected', focusArea === 'watch');
    updateFavouriteButton(movie);
  }


  function updateFavouriteButton(movie) {
    if (!favButton || !movie || !window.IPTVFavourites) return;
    const active = window.IPTVFavourites.has('movie', movie.id);
    favButton.classList.toggle('selected', focusArea === 'favourite');
    favButton.classList.toggle('active', active);
    favButton.innerHTML = `<span>${active ? '♥' : '♡'}</span>${active ? 'Saved' : 'Favourite'}`;
  }

  function toggleFavouriteMovie() {
    const movie = activeMovie();
    if (!movie || !window.IPTVFavourites || !favButton) return;
    const active = window.IPTVFavourites.toggle('movie', movie.id);
    favButton.classList.add('pressed');
    window.setTimeout(() => favButton.classList.remove('pressed'), 160);
    updateFavouriteButton(movie);
    setFooter();
  }

  function updateAll(rebuildPosters) {
    renderCategories();
    if (rebuildPosters) renderPosters();
    else {
      Array.from(document.querySelectorAll('.movie-poster-card')).forEach((card, index) => {
        card.classList.toggle('selected', index === movieIndex);
        card.classList.toggle('focused', focusArea === 'posters' && index === movieIndex);
      });
      movePosterTrack();
    }
    updateHero();
    setFooter();
  }

  function previewFocusedCategory() {
    categoryIndex = categoryFocusIndex;
    filtered = categoryMovies();
    movieIndex = 0;
    updateAll(true);
  }

  function activateCategory() {
    // OK enters the poster option area. The category content has already previewed while browsing.
    focusArea = filtered.length ? 'posters' : 'categories';
    updateAll(false);
  }

  function moveCategory(delta) {
    const next = Math.max(0, Math.min(categories.length - 1, categoryFocusIndex + delta));
    if (next === categoryFocusIndex) return;
    categoryFocusIndex = next;
    previewFocusedCategory();
  }

  function moveMovie(delta) {
    if (!filtered.length) return;
    const next = Math.max(0, Math.min(filtered.length - 1, movieIndex + delta));
    if (next === movieIndex) return;
    movieIndex = next;
    updateAll(false);
  }

  function watchMovie() {
    const movie = activeMovie();
    if (!movie) return;
    // Open directly without zoom/pressed animation when switching pages.
    window.location.href = `movie-player.html?id=${encodeURIComponent(movie.id)}`;
  }

  function focusCategories() {
    focusArea = 'categories';
    categoryFocusIndex = categoryIndex;
    updateAll(false);
  }

  function returnToSelectionPanel() {
    if (focusArea === 'categories') {
      window.IPTVRemote.goHome();
      return false;
    }
    focusCategories();
    return true;
  }

  if (window.IPTVRemote && window.IPTVRemote.setBackHandler) {
    window.IPTVRemote.setBackHandler(returnToSelectionPanel);
  }

  function focusPosters() {
    focusArea = 'posters';
    updateAll(false);
  }

  function focusWatch() {
    focusArea = 'watch';
    updateAll(false);
  }

  function focusFavourite() {
    focusArea = 'favourite';
    updateAll(false);
  }

  document.addEventListener('keydown', function(event) {
    const key = normalizeRemoteKey(event);

    if (window.IPTVRemote.isHome(key)) {
      stopRemoteEvent(event);
      window.IPTVRemote.goHome();
      return;
    }

    if (key === 'ArrowUp') {
      stopRemoteEvent(event);
      if (focusArea === 'categories') moveCategory(-1);
      else if (focusArea === 'posters') focusWatch();
      else if (focusArea === 'watch' || focusArea === 'favourite') updateAll(false); // stay inside option area; use Return for category panel
    } else if (key === 'ArrowDown') {
      stopRemoteEvent(event);
      if (focusArea === 'categories') moveCategory(1);
      else if (focusArea === 'watch' || focusArea === 'favourite') focusPosters();
      else focusPosters();
    } else if (key === 'ArrowRight') {
      stopRemoteEvent(event);
      if (focusArea === 'categories') {
        categoryPanelLockedNotice();
      } else if (focusArea === 'posters') {
        moveMovie(1);
      } else if (focusArea === 'watch') {
        focusFavourite();
      } else if (focusArea === 'favourite') {
        focusPosters();
      } else {
        focusPosters();
      }
    } else if (key === 'ArrowLeft') {
      stopRemoteEvent(event);
      if (focusArea === 'categories') {
        categoryPanelLockedNotice();
      } else if (focusArea === 'posters') {
        if (movieIndex === 0) updateAll(false); // stay inside option area; use Return for category panel
        else moveMovie(-1);
      } else if (focusArea === 'watch') {
        updateAll(false); // stay inside option area; use Return for category panel
      } else if (focusArea === 'favourite') {
        focusWatch();
      }
    } else if (window.IPTVRemote.isConfirm(key)) {
      stopRemoteEvent(event);
      if (focusArea === 'categories') activateCategory();
      else if (focusArea === 'favourite') toggleFavouriteMovie();
      else watchMovie();
    } else if (window.IPTVRemote.isBack(key)) {
      stopRemoteEvent(event);
      returnToSelectionPanel();
    }
  }, true);

  if (watchButton) watchButton.addEventListener('click', focusWatch);
  if (favButton) favButton.addEventListener('click', () => { focusFavourite(); });
  if (nextArrow) nextArrow.addEventListener('click', () => { focusPosters(); moveMovie(1); });

  previewFocusedCategory();
})();
