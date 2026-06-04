(function () {
  const page = document.querySelector('.hotel-features-page');
  if (!page) return;

  const categories = window.IPTV_HOTEL_FEATURE_CATEGORIES || [];
  const items = window.IPTV_HOTEL_FEATURE_ITEMS || [];
  const promotions = window.IPTV_HOTEL_PROMOTIONS || [];
  const contentConfig = (window.IPTV_CONTENT_CONFIG && window.IPTV_CONTENT_CONFIG.hotelFeatures) || {};
  const categoryList = document.getElementById('featureCategoryList');
  const grid = document.getElementById('featureGrid');
  const detailPanel = document.getElementById('featureDetailPanel');
  const hint = document.getElementById('featureFooterHint');

  const params = new URLSearchParams(window.location.search);
  const startCategory = params.get('category');
  const startPromo = params.get('promo') || params.get('type');

  let categoryIndex = Math.max(0, categories.findIndex(cat => cat.id === startCategory));
  if (categoryIndex < 0) categoryIndex = 0;
  let categoryFocusIndex = categoryIndex; // highlighted category; content previews while browsing
  let featureIndex = 0;
  let timeIndex = 4;
  let promoIndex = Math.max(0, promotions.findIndex(promo => promo.id === startPromo));
  if (promoIndex < 0) promoIndex = 0;
  let promoActionIndex = 0; // 0 view details, 1 book now
  let promoLocked = false;
  let focusArea = currentCategoryId() === 'promotions' ? (promoIndex > 0 ? 'promoOffers' : 'promoHero') : 'categories';
  const FEATURE_PAGE_SIZE = Number(contentConfig.featurePageSize) || 4;

  function currentCategory() { return categories[categoryIndex] || categories[0]; }
  function currentCategoryId() { return currentCategory() ? currentCategory().id : ''; }
  function isPromoMode() { return currentCategoryId() === 'promotions'; }
  function categoryItems() {
    const cat = currentCategory();
    if (!cat) return [];
    return items.filter(item => item.category === cat.id);
  }
  function currentFeature() { return categoryItems()[featureIndex] || categoryItems()[0]; }
  function featurePageStart() { return Math.floor(Math.max(0, featureIndex) / FEATURE_PAGE_SIZE) * FEATURE_PAGE_SIZE; }
  function currentPromo() { return promotions[promoIndex] || promotions[0]; }
  function heroPromo() { return promotions[0] || currentPromo(); }
  function currentTime() {
    const feature = currentFeature();
    if (!feature || !feature.times || !feature.times.length) return '';
    return feature.times[Math.max(0, Math.min(timeIndex, feature.times.length - 1))];
  }

  function showToast(message) {
    let toast = document.querySelector('.feature-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'feature-toast';
      page.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 1500);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
    }[ch]));
  }

  function renderCategories() {
    categoryList.innerHTML = '';
    categories.forEach((cat, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'feature-category-btn';
      btn.classList.toggle('active', index === categoryIndex);
      btn.classList.toggle('focused', focusArea === 'categories' && index === categoryFocusIndex);
      btn.textContent = cat.label;
      btn.addEventListener('click', () => {
        // Pointer click previews the section only. OK / Enter opens the option area.
        categoryFocusIndex = index;
        focusArea = 'categories';
        previewFocusedCategory();
      });
      categoryList.appendChild(btn);
    });
  }

  function renderGrid() {
    if (isPromoMode()) return renderPromotionsGrid();

    const list = categoryItems();
    const start = featurePageStart();
    const visible = list.slice(start, start + FEATURE_PAGE_SIZE);
    const pages = Math.max(1, Math.ceil(list.length / FEATURE_PAGE_SIZE));
    const currentPage = Math.floor(start / FEATURE_PAGE_SIZE);
    grid.className = 'feature-grid feature-grid-scrollable';
    detailPanel.className = 'feature-detail-panel';
    grid.innerHTML = '';
    visible.forEach((item, localIndex) => {
      const index = start + localIndex;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'feature-card';
      card.classList.toggle('focused', focusArea === 'features' && index === featureIndex);
      card.innerHTML = `
        <img class="feature-card-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" />
        <div class="feature-card-shade"></div>
        <div class="feature-card-copy">
          <h2>${escapeHtml(item.name)}</h2>
          <p><span class="feature-clock">◷</span> ${escapeHtml(item.hours)}</p>
          <small><span></span>${escapeHtml(item.status)}</small>
        </div>
      `;
      card.addEventListener('click', () => {
        featureIndex = index;
        focusArea = 'features';
        updateAll();
      });
      grid.appendChild(card);
    });

    const bar = document.createElement('div');
    bar.className = 'feature-option-scrollbar';
    const thumb = document.createElement('span');
    const height = pages <= 1 ? 100 : Math.max(22, 100 / pages);
    const top = pages <= 1 ? 0 : (currentPage / (pages - 1)) * (100 - height);
    thumb.style.height = `${height}%`;
    thumb.style.top = `${top}%`;
    bar.style.display = pages > 1 ? 'block' : 'none';
    bar.appendChild(thumb);
    grid.appendChild(bar);
  }

  function renderPromotionsGrid() {
    const hero = heroPromo();
    grid.className = 'feature-grid promotions-layout';
    detailPanel.className = 'feature-detail-panel promo-detail-panel';
    grid.innerHTML = `
      <button type="button" class="promo-hero-card ${focusArea === 'promoHero' ? 'focused' : ''}" aria-label="${escapeHtml(hero.title)}">
        <img src="${escapeHtml(hero.image)}" alt="${escapeHtml(hero.title)}" />
        <div class="promo-hero-fade"></div>
        <span class="promo-tag">${escapeHtml(hero.tag || 'SPECIAL')}</span>
        <div class="promo-hero-copy">
          <h2>${escapeHtml(hero.title)}</h2>
          <div class="promo-hero-rule"></div>
          <p>Up to</p>
          <strong>${escapeHtml(hero.discount)}</strong>
          <small>${escapeHtml(hero.subtitle)}</small>
          <em>${escapeHtml(hero.date || '')}</em>
        </div>
      </button>
      <h3 class="promo-offers-title">More Offers For You</h3>
      <div class="promo-offer-row">
        ${promotions.slice(1, 5).map((promo, index) => {
          const actualIndex = index + 1;
          return `
            <button type="button" class="promo-offer-card ${focusArea === 'promoOffers' && promoIndex === actualIndex ? 'focused' : ''}" data-promo-index="${actualIndex}">
              <img src="${escapeHtml(promo.image)}" alt="${escapeHtml(promo.title)}" />
              <div class="promo-offer-shade"></div>
              <span>${escapeHtml(promo.title)}</span>
              <strong>${escapeHtml(promo.discount)}</strong>
            </button>
          `;
        }).join('')}
      </div>
    `;

    const heroBtn = grid.querySelector('.promo-hero-card');
    heroBtn && heroBtn.addEventListener('click', () => {
      promoIndex = 0;
      promoLocked = false;
      focusArea = 'promoHero';
      updateAll();
    });
    grid.querySelectorAll('.promo-offer-card').forEach(btn => {
      btn.addEventListener('click', () => {
        promoIndex = Number(btn.dataset.promoIndex) || 0;
        promoLocked = false;
        focusArea = 'promoOffers';
        updateAll();
      });
    });
  }

  function renderDetail() {
    if (isPromoMode()) return renderPromoDetail();

    const item = currentFeature();
    if (!item) return;
    const times = item.times || [];
    if (timeIndex >= times.length) timeIndex = 0;
    const image = item.detailImage || item.image;

    detailPanel.innerHTML = `
      <img class="feature-detail-image" src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}" />
      <h2>${escapeHtml(item.name)}</h2>
      <p>${escapeHtml(item.subtitle || '')}</p>
      <div class="feature-detail-divider"></div>
      <h3>Available Time</h3>
      <div class="feature-time-grid">
        ${times.map((time, index) => `<button type="button" class="feature-time-btn ${focusArea === 'times' && index === timeIndex ? 'focused' : ''} ${index === timeIndex ? 'active' : ''}" data-time-index="${index}">${escapeHtml(time)}</button>`).join('')}
      </div>
      <button type="button" class="feature-request-btn ${focusArea === 'request' ? 'focused' : ''}">
        <span class="feature-request-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32"><path d="M9 5.5h14a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-18a2 2 0 0 1 2-2Z"/><path d="M11 3v6M21 3v6M7 12h18M11 17h4M17 17h4M11 21h4M17 21h4"/></svg>
        </span>
        <span><strong>${escapeHtml(item.action || 'Request Booking')}</strong><small>${escapeHtml(item.hint || 'A staff member will confirm your request.')}</small></span>
      </button>
    `;

    detailPanel.querySelectorAll('.feature-time-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        timeIndex = Number(btn.dataset.timeIndex) || 0;
        focusArea = 'times';
        updateAll();
      });
    });
    const request = detailPanel.querySelector('.feature-request-btn');
    request && request.addEventListener('click', () => {
      focusArea = 'request';
      updateAll();
    });
  }

  function renderPromoDetail() {
    const promo = currentPromo();
    if (!promo) return;
    const terms = promo.terms || [];
    detailPanel.innerHTML = `
      <h2>${escapeHtml(promo.title)}</h2>
      <div class="promo-detail-line"></div>
      <p class="promo-date">${escapeHtml(promo.valid || '')}</p>
      <div class="promo-detail-icon-row">
        <span class="promo-detail-tag-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32"><path d="M4 17.6 16.9 4.7h8.4v8.4L12.4 26a2.4 2.4 0 0 1-3.4 0L4 21a2.4 2.4 0 0 1 0-3.4Z"/><circle cx="21.8" cy="8.2" r="1.5"/></svg>
        </span>
        <span>${escapeHtml(promo.iconLabel || promo.discount)}</span>
      </div>
      <ul class="promo-terms">
        ${terms.map(term => `<li>${escapeHtml(term)}</li>`).join('')}
      </ul>
      <button type="button" class="promo-action-btn ${focusArea === 'promoActions' && promoActionIndex === 0 ? 'focused' : ''}" data-action-index="0">View Details</button>
      <button type="button" class="promo-action-btn ${focusArea === 'promoActions' && promoActionIndex === 1 ? 'focused' : ''}" data-action-index="1">${escapeHtml(promo.action || 'Book Now')}</button>
    `;
    detailPanel.querySelectorAll('.promo-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        promoActionIndex = Number(btn.dataset.actionIndex) || 0;
        focusArea = 'promoActions';
        updateAll();
      });
    });
  }

  function setHint() {
    if (!hint) return;
    if (isPromoMode()) {
      if (focusArea === 'categories') {
        hint.innerHTML = '<span>Choose a section</span><span class="hint-divider"></span><span>Right / OK to open</span>';
      } else if (focusArea === 'promoActions') {
        hint.innerHTML = '<span>Choose details or booking</span><span class="hint-divider"></span><span>Press</span><b>OK</b><span>to select</span>';
      } else {
        hint.innerHTML = '<span>Choose a promotion</span><span class="hint-divider"></span><span>Press</span><b>OK</b><span>to lock selection</span>';
      }
      return;
    }

    if (focusArea === 'categories') {
      hint.innerHTML = '<span>Choose a section</span><span class="hint-divider"></span><span>Right / OK to open</span>';
    } else if (focusArea === 'features') {
      hint.innerHTML = '<span>Use arrows to navigate</span><span class="hint-divider"></span><span>Press</span><b>OK</b><span>to choose time</span>';
    } else if (focusArea === 'times') {
      hint.innerHTML = '<span>Select available time</span><span class="hint-divider"></span><span>Press</span><b>OK</b><span>to confirm time</span>';
    } else {
      hint.innerHTML = '<span>Press</span><b>OK</b><span>to request</span>';
    }
  }

  function updateAll() {
    if (isPromoMode()) {
      if (promoIndex >= promotions.length) promoIndex = Math.max(0, promotions.length - 1);
    } else {
      const list = categoryItems();
      if (featureIndex >= list.length) featureIndex = Math.max(0, list.length - 1);
      const feature = currentFeature();
      if (feature && feature.times && timeIndex >= feature.times.length) timeIndex = 0;
    }
    renderCategories();
    renderGrid();
    renderDetail();
    setHint();
  }

  function previewFocusedCategory() {
    categoryIndex = categoryFocusIndex;
    featureIndex = 0;
    timeIndex = 0;
    promoActionIndex = 0;
    promoLocked = false;
    focusArea = 'categories';
    updateAll();
  }

  function moveCategory(delta) {
    const next = Math.max(0, Math.min(categories.length - 1, categoryFocusIndex + delta));
    if (next === categoryFocusIndex) return;
    categoryFocusIndex = next;
    previewFocusedCategory();
  }

  function focusCategories() {
    categoryFocusIndex = categoryIndex;
    focusArea = 'categories';
    updateAll();
  }

  function enterCurrentCategory() {
    // Right or OK enters the currently previewed option area.
    promoLocked = false;
    focusArea = isPromoMode() ? (promoIndex > 0 ? 'promoOffers' : 'promoHero') : 'features';
    updateAll();
  }

  function moveFeatureHorizontal(delta) {
    const list = categoryItems();
    if (!list.length) return;
    const col = featureIndex % 2;
    if (delta > 0) {
      if (col === 0 && featureIndex + 1 < list.length) featureIndex += 1;
      else focusArea = 'times';
    } else {
      if (col === 1) featureIndex -= 1;
      else focusCategories();
    }
    updateAll();
  }

  function moveFeatureVertical(delta) {
    const list = categoryItems();
    if (!list.length) return;
    const next = featureIndex + delta * 2;
    if (next >= 0 && next < list.length) featureIndex = next;
    else if (delta < 0) focusCategories();
    updateAll();
  }

  function moveTimeHorizontal(delta) {
    const item = currentFeature();
    const count = item && item.times ? item.times.length : 0;
    if (!count) return;
    if (delta > 0 && timeIndex < count - 1) timeIndex += 1;
    else if (delta < 0 && timeIndex > 0) timeIndex -= 1;
    else if (delta < 0) focusArea = 'features';
    updateAll();
  }

  function moveTimeVertical(delta) {
    const item = currentFeature();
    const count = item && item.times ? item.times.length : 0;
    if (!count) return;
    const next = timeIndex + delta * 3;
    if (next >= 0 && next < count) timeIndex = next;
    else if (delta > 0) focusArea = 'request';
    else focusArea = 'features';
    updateAll();
  }

  function movePromoHorizontal(delta) {
    if (focusArea === 'promoActions') {
      if (delta < 0) {
        promoLocked = false;
        focusArea = promoIndex === 0 ? 'promoHero' : 'promoOffers';
      }
      updateAll();
      return;
    }

    if (focusArea === 'promoHero') {
      if (delta < 0) focusCategories();
      // Right stays inside the promotion area until OK locks the promotion.
      updateAll();
      return;
    }

    if (focusArea === 'promoOffers') {
      const min = 1;
      const max = Math.min(promotions.length - 1, 4);
      if (delta > 0 && promoIndex < max) promoIndex += 1;
      else if (delta < 0 && promoIndex > min) promoIndex -= 1;
      else if (delta < 0) focusCategories();
      // Right at the last offer now stops instead of jumping into another area.
      updateAll();
    }
  }

  function movePromoVertical(delta) {
    if (focusArea === 'promoActions') {
      promoActionIndex = Math.max(0, Math.min(1, promoActionIndex + delta));
      updateAll();
      return;
    }

    if (focusArea === 'promoHero') {
      if (delta > 0) {
        promoIndex = Math.max(1, Math.min(promoIndex || 1, promotions.length - 1));
        focusArea = 'promoOffers';
      } else {
        /* stay on the promotion hero; use Return for category panel */
      }
    } else if (focusArea === 'promoOffers') {
      if (delta < 0) {
        promoIndex = 0;
        focusArea = 'promoHero';
      }
      // Down is intentionally disabled because there is no second offer row in the Figma layout.
    }
    updateAll();
  }

  function pulseSelector(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 160);
  }

  function returnToSelectionPanel() {
    if (focusArea === 'categories') {
      window.IPTVRemote.goHome();
      return false;
    }
    promoLocked = false;
    categoryFocusIndex = categoryIndex;
    focusArea = 'categories';
    updateAll();
    return true;
  }

  if (window.IPTVRemote && window.IPTVRemote.setBackHandler) {
    window.IPTVRemote.setBackHandler(returnToSelectionPanel);
  }

  function activate() {
    if (focusArea === 'categories') {
      enterCurrentCategory();
      return;
    }

    if (isPromoMode()) {
      const promo = currentPromo();
      if (!promo) return;
      if (focusArea === 'promoHero' || focusArea === 'promoOffers') {
        promoLocked = true;
        promoActionIndex = 0;
        focusArea = 'promoActions';
        updateAll();
        showToast(`${promo.title} selected`);
        return;
      }
      if (focusArea === 'promoActions') {
        pulseSelector('.promo-action-btn.focused');
        if (promoActionIndex === 0) showToast(`${promo.title}: ${promo.discount}`);
        else showToast(`${promo.title} request sent`);
        return;
      }
      return;
    }

    const feature = currentFeature();
    if (!feature) return;
    if (focusArea === 'features') {
      focusArea = 'times';
      updateAll();
      return;
    }
    if (focusArea === 'times') {
      focusArea = 'request';
      updateAll();
      return;
    }
    if (focusArea === 'request') {
      pulseSelector('.feature-request-btn');
      showToast(`${feature.name} requested${currentTime() ? ' at ' + currentTime() : ''}`);
    }
  }

  document.addEventListener('keydown', function (event) {
    const key = window.IPTVRemote.normalize(event);
    if (window.IPTVRemote.isHome(key)) {
      window.IPTVRemote.stop(event);
      window.IPTVRemote.goHome();
      return;
    }
    if (!page) return;
    if (key === 'ArrowUp') {
      window.IPTVRemote.stop(event);
      if (isPromoMode() && focusArea !== 'categories') movePromoVertical(-1);
      else if (focusArea === 'categories') moveCategory(-1);
      else if (focusArea === 'features') moveFeatureVertical(-1);
      else if (focusArea === 'times') moveTimeVertical(-1);
      else { focusArea = 'times'; updateAll(); }
    } else if (key === 'ArrowDown') {
      window.IPTVRemote.stop(event);
      if (isPromoMode() && focusArea !== 'categories') movePromoVertical(1);
      else if (focusArea === 'categories') moveCategory(1);
      else if (focusArea === 'features') moveFeatureVertical(1);
      else if (focusArea === 'times') moveTimeVertical(1);
      else { focusArea = 'request'; updateAll(); }
    } else if (key === 'ArrowLeft') {
      window.IPTVRemote.stop(event);
      if (isPromoMode() && focusArea !== 'categories') movePromoHorizontal(-1);
      else if (focusArea === 'categories') { /* stay on categories */ }
      else if (focusArea === 'features') moveFeatureHorizontal(-1);
      else if (focusArea === 'times') moveTimeHorizontal(-1);
      else { focusArea = 'times'; updateAll(); }
    } else if (key === 'ArrowRight') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'categories') enterCurrentCategory();
      else if (isPromoMode()) movePromoHorizontal(1);
      else if (focusArea === 'features') moveFeatureHorizontal(1);
      else if (focusArea === 'times') moveTimeHorizontal(1);
      else { focusArea = 'request'; updateAll(); }
    } else if (window.IPTVRemote.isConfirm(key)) {
      window.IPTVRemote.stop(event);
      activate();
    } else if (window.IPTVRemote.isBack(key)) {
      window.IPTVRemote.stop(event);
      returnToSelectionPanel();
    }
  }, true);

  updateAll();
})();
