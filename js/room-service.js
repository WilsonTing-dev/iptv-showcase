(function () {
  const page = document.querySelector('.room-service-page');
  if (!page) return;

  const categories = window.IPTV_ROOM_SERVICE_CATEGORIES || [];
  const items = window.IPTV_ROOM_SERVICE_ITEMS || [];
  const contentConfig = (window.IPTV_CONTENT_CONFIG && window.IPTV_CONTENT_CONFIG.roomService) || {};
  const categoryList = document.getElementById('roomCategoryList');
  const featuredCard = document.getElementById('roomFeaturedCard');
  const itemGrid = document.getElementById('roomItemGrid');
  const orderPanel = document.getElementById('roomOrderPanel');
  const hint = document.getElementById('roomServiceHint');
  const dots = document.getElementById('roomPageDots');
  const scrollBar = document.getElementById('roomItemScrollBar');

  const PAGE_SIZE = Number(contentConfig.pageSize) || 6;
  let categoryIndex = 0; // previewed section; follows the highlighted selection panel item
  let categoryFocusIndex = categoryIndex; // highlighted section, moves with arrows
  let itemIndex = 0;
  let pageIndex = 0;
  let focusArea = 'categories'; // categories | items | qtyMinus | qtyPlus | add | checkout
  let selectedQty = 1;
  const cart = new Map();

  const currency = (value) => value === 0 ? 'Complimentary' : `RM ${Number(value).toFixed(value % 1 ? 2 : 0)}`;

  function currentCategory() { return categories[categoryIndex] || categories[0]; }
  function categoryItems() {
    const category = currentCategory();
    if (!category || category.id === 'cart') return [];
    return items.filter(item => item.category === category.id);
  }
  function cartEntries() {
    return Array.from(cart.entries())
      .map(([id, qty]) => ({ item: items.find(entry => entry.id === id), qty }))
      .filter(entry => entry.item && entry.qty > 0);
  }
  function sourceItems() {
    const cat = currentCategory();
    if (!cat) return [];
    return cat.id === 'cart' ? cartEntries().map(entry => entry.item) : categoryItems();
  }
  function currentItem() { return sourceItems()[itemIndex] || sourceItems()[0]; }
  function pageCount() { return Math.max(1, Math.ceil(sourceItems().length / PAGE_SIZE)); }
  function visibleItems() {
    const start = pageIndex * PAGE_SIZE;
    return sourceItems().slice(start, start + PAGE_SIZE);
  }
  function subtotal() { return cartEntries().reduce((sum, entry) => sum + entry.item.price * entry.qty, 0); }
  function serviceCharge() { return subtotal() * 0.10; }
  function sst() { return subtotal() * 0.088; }
  function total() { return subtotal() + serviceCharge() + sst(); }

  function imgOrIcon(item, className) {
    if (item && item.image) return `<img class="${className}" src="${item.image}" alt="${item.name}" />`;
    return `<div class="${className} room-emoji-art" aria-hidden="true">${item?.icon || '•'}</div>`;
  }

  function showToast(message) {
    let toast = document.querySelector('.room-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'room-toast';
      page.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 1300);
  }

  function resetQty() { selectedQty = 1; }

  function clampState() {
    const count = sourceItems().length;
    if (count <= 0) {
      itemIndex = 0;
      pageIndex = 0;
      if (focusArea === 'items') focusArea = 'categories';
      return;
    }
    itemIndex = Math.max(0, Math.min(itemIndex, count - 1));
    const maxPage = pageCount() - 1;
    pageIndex = Math.max(0, Math.min(pageIndex, maxPage));
    const itemPage = Math.floor(itemIndex / PAGE_SIZE);
    if (itemPage !== pageIndex) pageIndex = itemPage;
    selectedQty = Math.max(1, Math.min(9, selectedQty));
  }

  function renderCategories() {
    categoryList.innerHTML = '';
    categories.forEach((cat, index) => {
      const btn = document.createElement('button');
      btn.className = `room-category-btn ${cat.id === 'cart' ? 'cart-category' : ''}`;
      btn.type = 'button';
      btn.dataset.id = cat.id;
      btn.classList.toggle('active', index === categoryIndex);
      btn.classList.toggle('focused', focusArea === 'categories' && index === categoryFocusIndex);
      btn.innerHTML = `<img src="${cat.icon}" alt="" aria-hidden="true" /><span>${cat.label}</span>`;
      btn.addEventListener('click', () => {
        // Pointer click previews the section only. OK / Enter opens the option area.
        categoryFocusIndex = index;
        focusArea = 'categories';
        previewFocusedCategory();
      });
      categoryList.appendChild(btn);
    });
  }

  function featuredPill(label) {
    return `<span class="room-item-badge">${label}</span>`;
  }

  function renderFeatured() {
    // v76: the large BEST SELLER hero banner was removed.
    // Menu items now carry a small badge inside the photo instead.
    if (!featuredCard) return;
    featuredCard.innerHTML = '';
    featuredCard.style.display = 'none';
  }

  function renderItems() {
    const cat = currentCategory();
    itemGrid.innerHTML = '';
    itemGrid.className = 'room-item-grid';
    if (cat) itemGrid.classList.add(`${cat.id}-grid`);
    if (!cat) return;

    const list = visibleItems();

    if (cat.id === 'cart') {
      const entries = cartEntries();
      if (!entries.length) {
        itemGrid.innerHTML = '<div class="empty-cart-message">Your cart is empty. Choose Dining, Beverages, Desserts or Housekeeping to add items.</div>';
        return;
      }
      const visibleEntries = entries.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE);
      visibleEntries.forEach(({ item, qty }, localIndex) => {
        const index = pageIndex * PAGE_SIZE + localIndex;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'room-cart-row-card';
        card.classList.toggle('focused', focusArea === 'items' && index === itemIndex);
        card.innerHTML = `${imgOrIcon(item, 'cart-row-image')}<div><strong>${item.name}</strong><span>${currency(item.price)} × ${qty}</span></div><em class="cart-delete-label">Delete</em>`;
        card.addEventListener('click', () => { itemIndex = index; focusArea = 'items'; updateAll(); });
        itemGrid.appendChild(card);
      });
      return;
    }

    list.forEach((item, localIndex) => {
      const index = pageIndex * PAGE_SIZE + localIndex;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'room-item-card';
      card.classList.toggle('focused', focusArea === 'items' && index === itemIndex);
      card.innerHTML = `${imgOrIcon(item, 'room-item-image')}${item.badge ? featuredPill(item.badge) : ''}<div class="room-item-copy"><h3>${item.name}</h3><p>${currency(item.price)}</p></div>`;
      card.addEventListener('click', () => { itemIndex = index; focusArea = 'items'; resetQty(); updateAll(); });
      itemGrid.appendChild(card);
    });
  }

  function renderOrderPanel() {
    const cat = currentCategory();
    const entries = cartEntries();
    const selected = currentItem();
    const sub = subtotal();
    const svc = serviceCharge();
    const tax = sst();
    const grand = total();
    const isCart = cat && cat.id === 'cart';
    const isHousekeeping = cat && cat.id === 'housekeeping';
    const actionText = isCart ? 'Delete item' : (isHousekeeping ? 'Add request' : 'Add to cart');
    const actionIcon = isCart ? 'assets/room-service/icons/checkout.svg' : 'assets/room-service/icons/cart.svg';

    let orderContent = '';
    if (isCart) {
      const entry = entries[itemIndex];
      orderContent = entry ? `<div class="order-active-item v22-order-selected">
        ${imgOrIcon(entry.item, 'order-item-image')}
        <div class="order-item-copy"><strong>${entry.item.name}</strong><span>${currency(entry.item.price)} × ${entry.qty}</span></div>
        <div class="order-selected-count">Press OK to delete</div>
      </div>` : `<div class="order-empty-state">Your cart is empty</div>`;
    } else if (selected) {
      orderContent = `<div class="order-active-item order-selected-with-qty">
        ${imgOrIcon(selected, 'order-item-image')}
        <div class="order-item-copy"><strong>${selected.name}</strong><span>${currency(selected.price)}</span></div>
        ${isHousekeeping ? '<div class="request-note">Request will be sent to staff</div>' : `<div class="order-qty-control ${focusArea === 'qtyMinus' || focusArea === 'qtyPlus' ? 'focused' : ''}" aria-label="Select item quantity">
          <button id="roomQtyMinus" class="qty-step ${focusArea === 'qtyMinus' ? 'focused' : ''}" type="button">−</button>
          <strong>${selectedQty}</strong>
          <button id="roomQtyPlus" class="qty-step ${focusArea === 'qtyPlus' ? 'focused' : ''}" type="button">+</button>
        </div>`}
      </div>
      <div class="cart-summary-line">${entries.reduce((sum, entry) => sum + entry.qty, 0)} item${entries.reduce((sum, entry) => sum + entry.qty, 0) === 1 ? '' : 's'} in Item Cart</div>`;
    } else {
      orderContent = `<div class="order-empty-state">No items added yet</div>`;
    }

    orderPanel.innerHTML = `
      <h2>${isCart ? 'Item Cart' : 'Your Order'}</h2>
      <div class="order-divider"></div>
      ${orderContent}
      <div class="order-lines">
        <div><span>Subtotal</span><strong>RM ${sub.toFixed(2)}</strong></div>
        <div><span>Service Charge</span><strong>RM ${svc.toFixed(2)}</strong></div>
        <div><span>SST</span><strong>RM ${tax.toFixed(2)}</strong></div>
      </div>
      <div class="order-total"><span>Total</span><strong>RM ${grand.toFixed(2)}</strong></div>
      <button id="roomAddBtn" type="button" class="room-order-action add ${isCart ? 'remove' : ''} ${focusArea === 'add' ? 'focused' : ''}"><img src="${actionIcon}" alt="" />${actionText}</button>
      <button id="roomCheckoutBtn" type="button" class="room-order-action checkout ${focusArea === 'checkout' ? 'focused' : ''}"><img src="assets/room-service/icons/checkout.svg" alt="" />Checkout</button>
    `;

    const minusBtn = document.getElementById('roomQtyMinus');
    const plusBtn = document.getElementById('roomQtyPlus');
    const addBtn = document.getElementById('roomAddBtn');
    const checkoutBtn = document.getElementById('roomCheckoutBtn');
    minusBtn && minusBtn.addEventListener('click', () => { focusArea = 'qtyMinus'; adjustQty(-1); });
    plusBtn && plusBtn.addEventListener('click', () => { focusArea = 'qtyPlus'; adjustQty(1); });
    addBtn && addBtn.addEventListener('click', () => { focusArea = 'add'; updateAll(); });
    checkoutBtn && checkoutBtn.addEventListener('click', () => { focusArea = 'checkout'; updateAll(); });
  }

  function setDots() {
    const count = pageCount();
    const hasItems = sourceItems().length > 0;
    if (dots) dots.style.display = 'none';
    if (dots) dots.innerHTML = '';
    if (scrollBar) {
      scrollBar.style.display = count > 1 && hasItems ? 'block' : 'none';
      const thumb = scrollBar.querySelector('span');
      if (thumb) {
        const height = Math.max(20, 100 / count);
        const top = count <= 1 ? 0 : (pageIndex / (count - 1)) * (100 - height);
        thumb.style.height = `${height}%`;
        thumb.style.top = `${top}%`;
      }
    }
    for (let i = 0; i < count; i += 1) {
      const dot = document.createElement('span');
      dot.className = i === pageIndex ? 'active' : '';
      dot.addEventListener('click', () => {
        pageIndex = i;
        itemIndex = Math.min(i * PAGE_SIZE, Math.max(0, sourceItems().length - 1));
        focusArea = 'items';
        resetQty();
        updateAll();
      });
      if (dots) dots.appendChild(dot);
    }
  }

  function setHint() {
    if (!hint) return;
    const cat = currentCategory();
    if (focusArea === 'categories') {
      hint.innerHTML = '<span>Choose a section</span><span class="hint-divider"></span><span>Right to open menu</span>';
    } else if (focusArea === 'items' && cat && cat.id === 'cart') {
      hint.innerHTML = '<span>Up / Down choose item</span><span class="hint-divider"></span><span>OK deletes</span><span class="hint-divider"></span><span>Right for actions</span>';
    } else if (focusArea === 'items') {
      hint.innerHTML = `<span>Use arrows to navigate</span><span class="hint-divider"></span><span>Press</span><b>OK</b><span>${cat && cat.id === 'housekeeping' ? 'to prepare request' : 'to choose quantity'}</span>`;
    } else if (focusArea === 'qtyMinus' || focusArea === 'qtyPlus') {
      hint.innerHTML = '<span>Adjust quantity</span><span class="hint-divider"></span><span>Press</span><b>OK</b><span>on + / −</span><span class="hint-divider"></span><span>Down to add</span>'; 
    } else if (focusArea === 'checkout') {
      hint.innerHTML = '<span>Press</span><b>OK</b><span>to checkout</span>';
    } else {
      hint.innerHTML = `<span>Press</span><b>OK</b><span>${cat && cat.id === 'cart' ? 'to delete' : (cat && cat.id === 'housekeeping' ? 'to add request' : 'to add to cart')}</span>`;
    }
  }

  function updateAll() {
    clampState();
    renderCategories();
    renderFeatured();
    renderItems();
    renderOrderPanel();
    setDots();
    setHint();
  }

  function pulse(el) {
    if (!el) return;
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 160);
  }

  function adjustQty(delta) {
    selectedQty = Math.max(1, Math.min(9, selectedQty + delta));
    updateAll();
  }

  function addSelectedItem() {
    const item = currentItem();
    const cat = currentCategory();
    if (!item || (cat && cat.id === 'cart')) return;
    const amount = cat && cat.id === 'housekeeping' ? 1 : selectedQty;
    cart.set(item.id, (cart.get(item.id) || 0) + amount);
    showToast(cat && cat.id === 'housekeeping' ? 'Request added to cart' : `${amount} item${amount > 1 ? 's' : ''} added to cart`);
    pulse(document.getElementById('roomAddBtn'));
    resetQty();
    // After Add to Cart, always return the cursor to the food / housekeeping menu.
    // This avoids confusing the guest by leaving the border on quantity or action buttons.
    focusArea = 'items';
    updateAll();
  }

  function removeSelectedCartItem() {
    const entries = cartEntries();
    const entry = entries[itemIndex];
    if (!entry) return;
    cart.delete(entry.item.id);
    showToast('Item removed from cart');
    if (itemIndex >= cartEntries().length) itemIndex = Math.max(0, cartEntries().length - 1);
    updateAll();
  }

  function activateAction() {
    const cat = currentCategory();
    if (cat && cat.id === 'cart') removeSelectedCartItem();
    else addSelectedItem();
  }

  function checkout() {
    pulse(document.getElementById('roomCheckoutBtn'));
    if (!cartEntries().length) showToast('Cart is empty');
    else showToast('Checkout request prepared');
    setHint();
  }

  function previewFocusedCategory() {
    categoryIndex = categoryFocusIndex;
    itemIndex = 0;
    pageIndex = 0;
    resetQty();
    focusArea = 'categories';
    updateAll();
  }

  function moveCategory(delta) {
    const next = Math.max(0, Math.min(categories.length - 1, categoryFocusIndex + delta));
    if (next === categoryFocusIndex) return;
    categoryFocusIndex = next;
    previewFocusedCategory();
  }

  function openFocusedCategory() {
    // OK enters the currently previewed option area.
    focusArea = sourceItems().length ? 'items' : 'categories';
    updateAll();
  }

  function focusItems() { if (sourceItems().length) { focusArea = 'items'; updateAll(); } }
  function focusCategoryFromItems() { categoryFocusIndex = categoryIndex; focusArea = 'categories'; updateAll(); }
  function focusAmountMinus() { focusArea = 'qtyMinus'; updateAll(); }
  function focusAmountPlus() { focusArea = 'qtyPlus'; updateAll(); }
  function focusAdd() { focusArea = 'add'; updateAll(); }
  function focusCheckout() { focusArea = 'checkout'; updateAll(); }
  function hasQuantityControl() {
    const cat = currentCategory();
    return !(cat && (cat.id === 'cart' || cat.id === 'housekeeping'));
  }
  function focusFirstOrderControl() {
    if (hasQuantityControl()) focusAmountMinus();
    else focusAdd();
  }

  function setItemIndex(next) {
    if (next !== itemIndex) resetQty();
    itemIndex = next;
  }

  function isCartMode() {
    const cat = currentCategory();
    return !!(cat && cat.id === 'cart');
  }

  function moveCartItemVertical(direction) {
    const count = sourceItems().length;
    if (!count) return;
    if (direction > 0) {
      if (itemIndex < count - 1) setItemIndex(itemIndex + 1);
      else focusAdd();
    } else if (itemIndex > 0) {
      setItemIndex(itemIndex - 1);
    }
    updateAll();
  }

  function moveItemHorizontal(direction) {
    const count = sourceItems().length;
    if (!count) return;

    if (isCartMode()) {
      if (direction > 0) focusAdd();
      else focusCategoryFromItems();
      updateAll();
      return;
    }

    const local = itemIndex - pageIndex * PAGE_SIZE;
    const col = local % 2;
    const visibleCount = visibleItems().length;
    if (direction > 0) {
      if (col === 0 && local + 1 < visibleCount) setItemIndex(itemIndex + 1);
      else focusFirstOrderControl();
    } else {
      if (col === 1) setItemIndex(itemIndex - 1);
      else focusCategoryFromItems();
    }
    updateAll();
  }

  function moveItemVertical(direction) {
    const count = sourceItems().length;
    if (!count) return;

    if (isCartMode()) {
      moveCartItemVertical(direction);
      return;
    }

    const local = itemIndex - pageIndex * PAGE_SIZE;
    const col = local % 2;
    const visibleCount = visibleItems().length;
    if (direction > 0) {
      if (local + 2 < visibleCount) setItemIndex(itemIndex + 2);
      else if (pageIndex < pageCount() - 1) {
        pageIndex += 1;
        setItemIndex(Math.min(pageIndex * PAGE_SIZE + col, count - 1));
      }
      // Last visible menu item stays in the menu when Down is pressed.
    } else {
      if (local - 2 >= 0) setItemIndex(itemIndex - 2);
      else if (pageIndex > 0) {
        pageIndex -= 1;
        setItemIndex(Math.min(pageIndex * PAGE_SIZE + 2 + col, count - 1));
      }
      // At the top edge, stay inside the option area. Use Return to go back to the selection panel.
    }
    updateAll();
  }

  function activate() {
    const cat = currentCategory();
    if (focusArea === 'categories') openFocusedCategory();
    else if (focusArea === 'items') {
      if (cat && cat.id === 'cart') removeSelectedCartItem();
      else if (cat && cat.id === 'housekeeping') focusAdd();
      else focusAmountPlus();
    } else if (focusArea === 'qtyMinus') adjustQty(-1);
    else if (focusArea === 'qtyPlus') adjustQty(1);
    else if (focusArea === 'add') activateAction();
    else if (focusArea === 'checkout') checkout();
  }

  function goHome() { window.IPTVRemote.goHome(); }
  function goBack() {
    if (focusArea === 'categories') {
      window.IPTVRemote.goHome();
      return false;
    }
    categoryFocusIndex = categoryIndex;
    focusArea = 'categories';
    updateAll();
    return true;
  }

  if (window.IPTVRemote && window.IPTVRemote.setBackHandler) {
    window.IPTVRemote.setBackHandler(goBack);
  }

  document.addEventListener('keydown', function (event) {
    const key = window.IPTVRemote.normalize(event);
    if (window.IPTVRemote.isHome(key)) {
      window.IPTVRemote.stop(event); goHome();
    } else if (key === 'ArrowUp') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'categories') moveCategory(-1);
      else if (focusArea === 'items') moveItemVertical(-1);
      else if (focusArea === 'checkout') { /* stay on Checkout */ }
      else if (focusArea === 'add') {
        if (isCartMode()) focusItems();
        else if (hasQuantityControl()) focusAmountPlus();
        else focusItems();
      }
      else focusItems();
    } else if (key === 'ArrowDown') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'categories') moveCategory(1);
      else if (focusArea === 'items') moveItemVertical(1);
      else if (focusArea === 'qtyMinus' || focusArea === 'qtyPlus') focusAdd();
      else if (focusArea === 'add') focusCheckout();
      else if (focusArea === 'checkout') { /* stay on Checkout */ }
      else focusCheckout();
    } else if (key === 'ArrowRight') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'categories') focusItems();
      else if (focusArea === 'items') moveItemHorizontal(1);
      else if (focusArea === 'qtyMinus') focusAmountPlus();
      else if (focusArea === 'qtyPlus') { /* stay on + */ }
      else if (focusArea === 'add') { /* stay on Add to Cart */ }
      else if (focusArea === 'checkout') { /* stay on Checkout */ }
    } else if (key === 'ArrowLeft') {
      window.IPTVRemote.stop(event);
      if (focusArea === 'categories') { /* stay on categories */ }
      else if (focusArea === 'items') moveItemHorizontal(-1);
      else if (focusArea === 'qtyPlus') focusAmountMinus();
      else if (focusArea === 'qtyMinus') focusItems();
      else if (focusArea === 'add') focusItems();
      else if (focusArea === 'checkout') focusItems();
    } else if (window.IPTVRemote.isConfirm(key)) {
      window.IPTVRemote.stop(event);
      activate();
    } else if (window.IPTVRemote.isBack(key)) {
      window.IPTVRemote.stop(event);
      goBack();
    }
  }, true);

  updateAll();
})();
