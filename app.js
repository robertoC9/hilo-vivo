const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const normalizeText = (value) =>
  value
    .toLocaleLowerCase('es-CL')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const formatCLP = (amount) => `$${new Intl.NumberFormat('es-CL').format(amount)} CLP`;

const header = $('.site-header');
const menuToggle = $('#menu-toggle');
const mainMenu = $('#main-menu');
const searchOverlay = $('#search-overlay');
const searchInput = $('#search-input');
const searchHint = $('#search-hint');
const cartDrawer = $('#cart-drawer');
const productDialog = $('#product-dialog');
const productModal = window.bootstrap ? window.bootstrap.Modal.getOrCreateInstance(productDialog) : null;
const productGrid = $('#product-grid');
const productCards = $$('.product-card', productGrid);
const resultsStatus = $('#results-status');
const productSort = $('#product-sort');
const toast = $('#toast');
const toastMessage = $('#toast-message');
let toastTimer;
let lastFocusedElement = null;
let activeFilter = 'all';
let searchTerm = '';
let cart = [];

const categoryLabels = {
  arpilleras: 'Arpilleras',
  textiles: 'Textiles',
  ceramica: 'Cerámica',
  cesteria: 'Cestería',
  madera: 'Madera',
  piedra: 'Piedra tallada',
};

function syncBodyLock() {
  const shouldLock =
    searchOverlay.classList.contains('is-open') ||
    cartDrawer.classList.contains('is-open') ||
    productDialog.classList.contains('show');
  document.body.classList.toggle('is-locked', shouldLock);
}

function showToast(title, message) {
  const titleElement = $('strong', toast);
  titleElement.textContent = title;
  toastMessage.textContent = message;
  toast.classList.add('is-visible');
  toast.setAttribute('aria-hidden', 'false');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.setAttribute('aria-hidden', 'true');
  }, 3000);
}

function setMenu(open) {
  mainMenu.classList.toggle('is-open', open);
  menuToggle.classList.toggle('is-active', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
}

menuToggle.addEventListener('click', () => {
  setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
});

$$('a', mainMenu).forEach((link) => link.addEventListener('click', () => setMenu(false)));

window.addEventListener(
  'scroll',
  () => header.classList.toggle('is-scrolled', window.scrollY > 18),
  { passive: true },
);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initMotion() {
  if (prefersReducedMotion) {
    $$('.reveal').forEach((element) => element.classList.add('is-visible'));
    $$('.hero__image-label, .hero__caption').forEach((element) => {
      element.style.opacity = '1';
    });
    return;
  }

  if (!window.gsap || !window.ScrollTrigger) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -45px' },
    );
    $$('.reveal').forEach((element) => revealObserver.observe(element));
    $$('.hero__image-label, .hero__caption').forEach((element) => {
      element.style.opacity = '1';
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  const titleZoom = window.innerWidth < 700 ? 1.07 : 1.14;
  const titleSettle = window.innerWidth < 700 ? 1.01 : 1.03;

  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero .eyebrow', { y: 16, duration: 0.55 })
    .fromTo(
      '.hero__image-wrap img',
      { scale: 1, opacity: 0.86, transformOrigin: '50% 50%' },
      { scale: 1.12, opacity: 1, duration: 1.25, ease: 'power2.inOut' },
      0,
    )
    .to('.hero__image-wrap img', { scale: 1.03, duration: 1.1, ease: 'power3.out' }, '-=0.18')
    .fromTo(
      '.hero h1',
      { y: 34, scale: 0.82, opacity: 0.78, transformOrigin: '0% 50%' },
      { y: 0, scale: titleZoom, opacity: 1, duration: 1.25, ease: 'power2.inOut' },
      0,
    )
    .to('.hero h1', { scale: titleSettle, duration: 1.1, ease: 'power3.out' }, '-=0.18')
    .fromTo(
      '.hero__image-label',
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      1.55,
    )
    .fromTo(
      '.hero__caption',
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      1.72,
    )
    .from('.hero__lead', { y: 24, duration: 0.7 }, '-=0.5')
    .from('.hero__actions', { y: 20, duration: 0.6 }, '-=0.45')
    .from('.hero__proof', { y: 18, duration: 0.55 }, '-=0.4')
    .from('.hero__visual', { y: 45, duration: 1.1 }, '-=1.1')
    .from('.handmade-stamp', { scale: 0.7, rotation: -20, duration: 0.65 }, '-=0.55');

  $$('.reveal').forEach((element) => {
    gsap.fromTo(
      element,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: element,
          start: 'top 88%',
          once: true,
        },
      },
    );
  });

  const storyTitleZoom = window.innerWidth < 700 ? 1.08 : 1.16;
  const storyTitleSettle = window.innerWidth < 700 ? 1.02 : 1.04;
  gsap
    .timeline({
      scrollTrigger: {
        trigger: '.story__content',
        start: 'top 92%',
        once: true,
      },
      defaults: { ease: 'power3.out' },
    })
    .fromTo(
      '.story__content h2',
      { scale: 0.8, opacity: 0.65, transformOrigin: '0% 50%' },
      { scale: storyTitleZoom, opacity: 1, duration: 1.35, ease: 'power2.inOut' },
    )
    .to('.story__content h2', { scale: storyTitleSettle, duration: 1.05, ease: 'power3.out' }, '-=0.2');

  const storyTitle = $('.story__content h2');
  if (storyTitle) {
    storyTitle.addEventListener('pointermove', (event) => {
      const bounds = storyTitle.getBoundingClientRect();
      const relativeX = (event.clientX - bounds.left) / bounds.width - 0.5;
      const relativeY = (event.clientY - bounds.top) / bounds.height - 0.5;
      const shiftX = Math.max(-18, Math.min(18, relativeX * 30));
      const shiftY = Math.max(-10, Math.min(10, relativeY * 16));
      const hoverScale = window.innerWidth < 700 ? storyTitleSettle + 0.035 : storyTitleSettle + 0.07;

      gsap.to(storyTitle, {
        x: shiftX,
        y: shiftY,
        scale: hoverScale,
        rotation: shiftX * 0.035,
        duration: 0.45,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    });

    storyTitle.addEventListener('pointerleave', () => {
      gsap.to(storyTitle, {
        x: 0,
        y: 0,
        scale: storyTitleSettle,
        rotation: 0,
        duration: 0.7,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    });
  }

  gsap.to('.hero__image-wrap img', {
    yPercent: 5,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });

  gsap.to('.handmade-stamp', {
    rotation: 3,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });
}

function initThreadScene() {
  const canvas = $('#threads-canvas');
  const hero = $('.hero');
  if (!canvas || !hero || !window.THREE || prefersReducedMotion) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 50);
  const cameraRestZ = window.innerWidth > 700 ? 8.8 : 9.2;
  const cameraIntroZ = window.innerWidth > 700 ? 12.4 : 13.1;
  const cameraRestFov = 46;
  const cameraIntroFov = window.innerWidth > 700 ? 54 : 56;
  camera.fov = cameraIntroFov;
  camera.position.set(0, 0, cameraIntroZ);
  camera.updateProjectionMatrix();
  camera.lookAt(0, 0, 0);

  const threadGroup = new THREE.Group();
  threadGroup.position.x = window.innerWidth > 880 ? 2.1 : 0;
  scene.add(threadGroup);

  const palette = [0xc95d46, 0xe0aa3c, 0x2c5a4c, 0x173f35];
  const strands = [];
  const pointCount = 92;
  const strandCount = 19;

  for (let strandIndex = 0; strandIndex < strandCount; strandIndex += 1) {
    const positions = new Float32Array(pointCount * 3);
    const basePositions = new Float32Array(pointCount * 3);
    const yBase = -3.65 + strandIndex * 0.4;

    for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
      const progress = pointIndex / (pointCount - 1);
      const x = -7 + progress * 14;
      const y = yBase + Math.sin(progress * Math.PI * 3.4 + strandIndex * 0.23) * 0.16;
      const z = Math.cos(progress * Math.PI * 2.3 + strandIndex * 0.38) * 0.25;
      const offset = pointIndex * 3;
      positions[offset] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = z;
      basePositions[offset] = x;
      basePositions[offset + 1] = y;
      basePositions[offset + 2] = z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: palette[strandIndex % palette.length],
      transparent: true,
      opacity: strandIndex % 3 === 0 ? 0.2 : 0.11,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.userData = {
      positions,
      basePositions,
      pointCount,
      phase: strandIndex * 0.61,
      speed: 0.24 + (strandIndex % 4) * 0.035,
      amplitude: 0.06 + (strandIndex % 3) * 0.025,
    };
    strands.push(line);
    threadGroup.add(line);
  }

  const knotGeometry = new THREE.OctahedronGeometry(0.055, 0);
  const knotMaterial = new THREE.MeshBasicMaterial({
    color: 0xe0aa3c,
    transparent: true,
    opacity: 0.28,
  });
  const knots = new THREE.InstancedMesh(knotGeometry, knotMaterial, 26);
  const dummy = new THREE.Object3D();

  for (let knotIndex = 0; knotIndex < 26; knotIndex += 1) {
    dummy.position.set(
      -5.8 + ((knotIndex * 1.71) % 11.6),
      -3.2 + ((knotIndex * 1.37) % 6.9),
      Math.sin(knotIndex * 1.2) * 0.42,
    );
    dummy.rotation.set(knotIndex * 0.3, knotIndex * 0.5, knotIndex * 0.2);
    dummy.scale.setScalar(0.65 + (knotIndex % 4) * 0.18);
    dummy.updateMatrix();
    knots.setMatrixAt(knotIndex, dummy.matrix);
    knots.setColorAt(knotIndex, new THREE.Color(palette[knotIndex % palette.length]));
  }
  knots.instanceMatrix.needsUpdate = true;
  if (knots.instanceColor) knots.instanceColor.needsUpdate = true;
  threadGroup.add(knots);

  const stitchGeometry = new THREE.BoxGeometry(0.24, 0.035, 0.035);
  const stitchMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.22,
    vertexColors: true,
    depthWrite: false,
  });
  const stitchCount = 34;
  const stitches = new THREE.InstancedMesh(stitchGeometry, stitchMaterial, stitchCount);
  const stitchDummy = new THREE.Object3D();
  const stitchData = [];

  for (let stitchIndex = 0; stitchIndex < stitchCount; stitchIndex += 1) {
    const stitch = {
      x: -6.9 + ((stitchIndex * 1.93) % 13.8),
      y: -3.7 + ((stitchIndex * 1.47) % 7.4),
      z: Math.sin(stitchIndex * 1.37) * 0.55,
      phase: stitchIndex * 0.73,
      speed: 0.18 + (stitchIndex % 5) * 0.025,
      scale: 0.55 + (stitchIndex % 4) * 0.16,
    };
    stitchData.push(stitch);
    stitchDummy.position.set(stitch.x, stitch.y, stitch.z);
    stitchDummy.rotation.set(stitch.phase * 0.4, stitch.phase * 0.7, stitch.phase);
    stitchDummy.scale.setScalar(stitch.scale);
    stitchDummy.updateMatrix();
    stitches.setMatrixAt(stitchIndex, stitchDummy.matrix);
    stitches.setColorAt(stitchIndex, new THREE.Color(palette[stitchIndex % palette.length]));
  }
  stitches.instanceMatrix.needsUpdate = true;
  if (stitches.instanceColor) stitches.instanceColor.needsUpdate = true;
  threadGroup.add(stitches);

  const pointer = { x: 0, y: 0 };
  const scrollTarget = { x: 0, y: 0 };
  const clock = new THREE.Clock();
  let sceneVisible = true;

  function resizeScene() {
    const { width, height } = hero.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    threadGroup.position.x = width > 880 ? 2.1 : 0;
    threadGroup.scale.setScalar(width <= 640 ? 1.18 : 1);
  }

  function updateScrollParallax() {
    const bounds = hero.getBoundingClientRect();
    const scrollableDistance = Math.max(bounds.height + window.innerHeight, 1);
    const progress = Math.min(1, Math.max(0, (window.innerHeight - bounds.top) / scrollableDistance));
    const strength = window.innerWidth > 700 ? 1 : 0.55;

    scrollTarget.x = (0.5 - progress) * 0.72 * strength;
    scrollTarget.y = (progress - 0.5) * 0.32 * strength;
  }

  function renderThreads() {
    requestAnimationFrame(renderThreads);
    if (!sceneVisible || document.hidden) return;

    const elapsed = clock.getElapsedTime();
    camera.position.x += (scrollTarget.x + pointer.x * 0.12 - camera.position.x) * 0.035;
    camera.position.y += (scrollTarget.y + pointer.y * 0.08 - camera.position.y) * 0.035;
    camera.position.z += (cameraRestZ - camera.position.z) * 0.025;
    camera.fov += (cameraRestFov - camera.fov) * 0.025;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
    threadGroup.rotation.y += (pointer.x * 0.08 - threadGroup.rotation.y) * 0.025;
    threadGroup.rotation.x += (-pointer.y * 0.045 - threadGroup.rotation.x) * 0.025;
    knots.rotation.y = elapsed * 0.025;
    threadGroup.position.y = Math.sin(elapsed * 0.2) * 0.045;

    stitchData.forEach((stitch, stitchIndex) => {
      stitchDummy.position.set(
        stitch.x + Math.sin(elapsed * stitch.speed + stitch.phase) * 0.14,
        stitch.y + Math.cos(elapsed * stitch.speed * 0.85 + stitch.phase) * 0.1,
        stitch.z + Math.sin(elapsed * stitch.speed * 0.6 + stitch.phase) * 0.08,
      );
      stitchDummy.rotation.set(
        stitch.phase * 0.4 + elapsed * 0.08,
        stitch.phase * 0.7 + elapsed * 0.12,
        stitch.phase + Math.sin(elapsed * stitch.speed + stitch.phase) * 0.18,
      );
      stitchDummy.scale.setScalar(stitch.scale);
      stitchDummy.updateMatrix();
      stitches.setMatrixAt(stitchIndex, stitchDummy.matrix);
    });
    stitches.instanceMatrix.needsUpdate = true;

    strands.forEach((line) => {
      const { positions, basePositions, pointCount, phase, speed, amplitude } = line.userData;
      for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
        const offset = pointIndex * 3;
        const wave = Math.sin(elapsed * speed + phase + pointIndex * 0.105);
        positions[offset + 1] = basePositions[offset + 1] + wave * amplitude;
        positions[offset + 2] = basePositions[offset + 2] + Math.cos(elapsed * speed + phase + pointIndex * 0.09) * amplitude * 0.7;
      }
      line.geometry.attributes.position.needsUpdate = true;
    });

    renderer.render(scene, camera);
  }

  window.addEventListener('scroll', updateScrollParallax, { passive: true });
  window.addEventListener('resize', updateScrollParallax, { passive: true });

  hero.addEventListener('pointermove', (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
  });
  hero.addEventListener('pointerleave', () => {
    pointer.x = 0;
    pointer.y = 0;
  });

  const resizeObserver = new ResizeObserver(resizeScene);
  resizeObserver.observe(hero);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    sceneVisible = entry.isIntersecting;
  });
  visibilityObserver.observe(hero);

  resizeScene();
  updateScrollParallax();
  renderThreads();
}

initMotion();
initThreadScene();

function sortProducts(mode = productSort.value) {
  const sorted = [...productCards].sort((a, b) => {
    const priceA = Number(a.dataset.price);
    const priceB = Number(b.dataset.price);
    const nameA = normalizeText(a.dataset.name);
    const nameB = normalizeText(b.dataset.name);

    if (mode === 'price-asc') return priceA - priceB;
    if (mode === 'price-desc') return priceB - priceA;
    if (mode === 'name') return nameA.localeCompare(nameB, 'es');
    return productCards.indexOf(a) - productCards.indexOf(b);
  });

  sorted.forEach((card) => productGrid.append(card));
}

function cardMatches(card) {
  const searchable = normalizeText(
    [card.dataset.name, card.dataset.origin, card.dataset.material, card.dataset.category, card.dataset.description].join(' '),
  );
  const matchesFilter = activeFilter === 'all' || card.dataset.category === activeFilter;
  const matchesSearch = !searchTerm || searchable.includes(normalizeText(searchTerm));
  return matchesFilter && matchesSearch;
}

function updateResultsStatus() {
  const visibleCards = productCards.filter((card) => !card.classList.contains('is-hidden'));
  const total = visibleCards.length;
  resultsStatus.textContent = total === 1 ? 'Mostrando 1 pieza' : `Mostrando ${total} piezas`;

  if (searchTerm) {
    const pieces = visibleCards.length === 1 ? '1 coincidencia' : `${visibleCards.length} coincidencias`;
    searchHint.textContent = `Encontramos ${pieces} para “${searchTerm}”. Pulsa Buscar para verlas.`;
    searchHint.classList.add('is-result');
  } else {
    searchHint.textContent = 'Escribe para encontrar piezas de toda la colección.';
    searchHint.classList.remove('is-result');
  }
}

function applyProductView() {
  productCards.forEach((card) => card.classList.toggle('is-hidden', !cardMatches(card)));
  sortProducts();
  updateResultsStatus();
}

function setActiveFilter(filter, updateButtons = true) {
  activeFilter = filter;
  if (updateButtons) {
    $$('.filter-button').forEach((button) => {
      const isActive = button.dataset.filter === filter;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }
  applyProductView();
}

$$('.filter-button').forEach((button) => {
  button.addEventListener('click', () => setActiveFilter(button.dataset.filter));
});

productSort.addEventListener('change', () => {
  sortProducts();
  showToast('Colección ordenada', productSort.options[productSort.selectedIndex].text);
});

$$('[data-jump-filter]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    searchTerm = '';
    searchInput.value = '';
    setActiveFilter(link.dataset.jumpFilter);
    $('#productos').scrollIntoView({ behavior: 'smooth' });
  });
});

function openSearch() {
  closeCart();
  setMenu(false);
  lastFocusedElement = document.activeElement;
  searchOverlay.classList.add('is-open');
  searchOverlay.setAttribute('aria-hidden', 'false');
  syncBodyLock();
  setTimeout(() => searchInput.focus(), 120);
}

function closeSearch({ restoreFocus = true } = {}) {
  searchOverlay.classList.remove('is-open');
  searchOverlay.setAttribute('aria-hidden', 'true');
  syncBodyLock();
  if (restoreFocus && lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
}

$('#open-search').addEventListener('click', openSearch);
$$('[data-close-search]').forEach((button) => button.addEventListener('click', () => closeSearch()));

searchInput.addEventListener('input', () => {
  searchTerm = searchInput.value.trim();
  applyProductView();
});

$('#search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  searchTerm = searchInput.value.trim();
  applyProductView();
  closeSearch({ restoreFocus: false });
  $('#productos').scrollIntoView({ behavior: 'smooth' });
});

$$('[data-search-term]').forEach((button) => {
  button.addEventListener('click', () => {
    searchInput.value = button.dataset.searchTerm;
    searchTerm = button.dataset.searchTerm;
    applyProductView();
    searchInput.focus();
  });
});

function populateDialog(card) {
  $('#dialog-image').src = card.dataset.image;
  $('#dialog-image').alt = card.dataset.name;
  $('#dialog-origin').textContent = `${card.dataset.origin} · ${categoryLabels[card.dataset.category]}`;
  $('#dialog-name').textContent = card.dataset.name;
  $('#dialog-description').textContent = card.dataset.description;
  $('#dialog-material').textContent = card.dataset.material;
  $('#dialog-price').textContent = formatCLP(Number(card.dataset.price));

  const addButton = $('#dialog-add');
  addButton.dataset.name = card.dataset.name;
  addButton.dataset.price = card.dataset.price;
  addButton.dataset.image = card.dataset.image;
}

$$('.product-card__quick').forEach((button) => {
  button.addEventListener('click', () => {
    const card = button.closest('.product-card');
    populateDialog(card);
    productModal?.show();
    document.body.classList.add('is-locked');
  });
});

productDialog.addEventListener('click', (event) => {
  if (event.target === productDialog) productModal?.hide();
});

productDialog.addEventListener('hidden.bs.modal', () => {
  document.body.classList.toggle('is-locked', searchOverlay.classList.contains('is-open') || cartDrawer.classList.contains('is-open'));
});

function renderCart() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  $('#cart-count').textContent = count;
  $('#drawer-count').textContent = `(${count})`;
  $('#cart-total').textContent = formatCLP(subtotal);

  const cartItems = $('#cart-items');
  cartItems.replaceChildren();

  if (cart.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'cart-empty';
    const mark = document.createElement('span');
    mark.className = 'cart-empty__mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '+';
    const title = document.createElement('strong');
    title.textContent = 'Tu selección está vacía';
    const description = document.createElement('p');
    description.textContent = 'Descubre una pieza hecha a mano y agrégala aquí.';
    empty.append(mark, title, description);
    cartItems.append(empty);
    return;
  }

  cart.forEach((item, index) => {
    const article = document.createElement('article');
    article.className = 'cart-item';

    const image = document.createElement('img');
    image.src = item.image;
    image.alt = '';

    const copy = document.createElement('div');
    copy.className = 'cart-item__copy';
    const quantity = document.createElement('small');
    quantity.textContent = item.quantity > 1 ? `${item.quantity} unidades` : 'Pieza seleccionada';
    const name = document.createElement('strong');
    name.textContent = item.name;
    const price = document.createElement('p');
    price.textContent = formatCLP(item.price);
    copy.append(quantity, name, price);

    const remove = document.createElement('button');
    remove.className = 'cart-item__remove';
    remove.type = 'button';
    remove.setAttribute('aria-label', `Quitar ${item.name}`);
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      cart.splice(index, 1);
      renderCart();
    });

    article.append(image, copy, remove);
    cartItems.append(article);
  });
}

function addToCart({ name, price, image }) {
  const numericPrice = Number(price);
  const existing = cart.find((item) => item.name === name);
  if (existing) existing.quantity += 1;
  else cart.push({ name, price: numericPrice, image, quantity: 1 });

  renderCart();
  const cartCount = $('#cart-count');
  cartCount.classList.add('is-bumping');
  setTimeout(() => cartCount.classList.remove('is-bumping'), 260);
  showToast('Agregado a tu selección', name);
}

$$('[data-add-to-cart]').forEach((button) => {
  button.addEventListener('click', () => {
    addToCart({
      name: button.dataset.name,
      price: button.dataset.price,
      image: button.dataset.image,
    });
  });
});

$('#dialog-add').addEventListener('click', (event) => {
  addToCart({
    name: event.currentTarget.dataset.name,
    price: event.currentTarget.dataset.price,
    image: event.currentTarget.dataset.image,
  });
  productModal?.hide();
});

function openCart() {
  closeSearch({ restoreFocus: false });
  setMenu(false);
  lastFocusedElement = document.activeElement;
  cartDrawer.classList.add('is-open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  syncBodyLock();
  setTimeout(() => $('[data-close-cart]', cartDrawer)?.focus(), 120);
}

function closeCart({ restoreFocus = true } = {}) {
  cartDrawer.classList.remove('is-open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  syncBodyLock();
  if (restoreFocus && lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
}

$('#open-cart').addEventListener('click', openCart);
$$('[data-close-cart]').forEach((button) => button.addEventListener('click', () => closeCart()));

$('#checkout-button').addEventListener('click', () => {
  if (cart.length === 0) {
    showToast('Tu carrito está vacío', 'Agrega una pieza antes de continuar');
    return;
  }
  showToast('Demo de tienda', 'El pago se conectará a tu plataforma favorita');
});

$$('.favorite-button').forEach((button) => {
  button.addEventListener('click', () => {
    const isFavorite = button.classList.toggle('is-favorite');
    button.setAttribute('aria-pressed', String(isFavorite));
    const productName = button.closest('.product-card').dataset.name;
    showToast(isFavorite ? 'Guardado en favoritos' : 'Quitado de favoritos', productName);
  });
});

$$('.territory-row').forEach((button) => {
  button.addEventListener('click', () => {
    const filters = { norte: 'piedra', centro: 'ceramica', sur: 'textiles' };
    const territory = button.querySelector('small').textContent;
    searchTerm = '';
    searchInput.value = '';
    setActiveFilter(filters[button.dataset.territory]);
    $('#productos').scrollIntoView({ behavior: 'smooth' });
    showToast(`Pieces desde ${territory}`, categoryLabels[filters[button.dataset.territory]]);
  });
});

$('#newsletter-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('#newsletter-email');
  const message = $('#form-message');
  const email = input.value.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    message.textContent = 'Revisa el correo e inténtalo otra vez.';
    message.className = 'form-message is-error';
    input.focus();
    return;
  }

  message.textContent = '¡Listo! Soon recibirás nuevas historias en tu correo.';
  message.className = 'form-message is-success';
  input.value = '';
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (searchOverlay.classList.contains('is-open')) closeSearch();
  if (cartDrawer.classList.contains('is-open')) closeCart();
  if (mainMenu.classList.contains('is-open')) setMenu(false);
});

const navTargets = ['colecciones', 'productos', 'artesanias', 'historia']
  .map((id) => document.getElementById(id))
  .filter(Boolean);

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      $$('a', mainMenu).forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  },
  { rootMargin: '-35% 0px -55%', threshold: 0 },
);

navTargets.forEach((section) => sectionObserver.observe(section));

renderCart();
