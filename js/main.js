/* ============================================
   CNY 2026 — Main Controller
   ============================================ */

(function() {
  'use strict';

  const cardModules = {};
  const cardStarted = {};
  const CARD_COUNT = 8;
  const TITLE_FADE_MS = 3000;

  let currentCard = 0;
  let titleFadeTimer = null;
  let touchStartX = 0;
  let touchStartY = 0;

  const scrollContainer = document.getElementById('scroll-container');
  const introOverlay = document.getElementById('intro');
  const cardTitleEl = document.getElementById('card-title');
  const dotNav = document.getElementById('dot-nav');
  const dots = dotNav.querySelectorAll('.dot');
  const sections = document.querySelectorAll('.card-section');

  // ---- Card Registration ----

  window.registerCard = function(id, module) {
    cardModules[id] = module;
    const canvas = document.getElementById('canvas-' + id);
    if (canvas) {
      module.init(canvas);
    }
  };

  // ---- Intro ----

  function dismissIntro() {
    if (!introOverlay || introOverlay.classList.contains('fade-out')) return;
    introOverlay.classList.add('fade-out');
    setTimeout(function() {
      introOverlay.style.display = 'none';
      activateCard(0);
    }, 800);
  }

  if (introOverlay) {
    introOverlay.addEventListener('click', dismissIntro);
    setTimeout(dismissIntro, 3000);
  }

  // ---- Card Title ----

  function showCardTitle(index) {
    const section = sections[index];
    if (!section) return;
    const num = index + 1;
    const title = section.getAttribute('data-title');
    cardTitleEl.textContent = num + '/8 \u2014 ' + title;
    cardTitleEl.classList.remove('hidden');

    clearTimeout(titleFadeTimer);
    titleFadeTimer = setTimeout(function() {
      cardTitleEl.classList.add('hidden');
    }, TITLE_FADE_MS);
  }

  // ---- Dot Navigation ----

  function updateDots(index) {
    dots.forEach(function(dot, i) {
      dot.classList.toggle('active', i === index);
    });
  }

  dots.forEach(function(dot) {
    dot.addEventListener('click', function() {
      const index = parseInt(dot.getAttribute('data-index'), 10);
      scrollToCard(index);
    });
  });

  // ---- Scroll To Card ----

  function scrollToCard(index) {
    if (index < 0 || index >= CARD_COUNT) return;
    sections[index].scrollIntoView({ behavior: 'smooth', inline: 'start' });
  }

  // ---- Card Activation ----

  function activateCard(index) {
    const id = index + 1;
    currentCard = index;
    updateDots(index);
    showCardTitle(index);

    if (cardModules[id]) {
      if (!cardStarted[id]) {
        const canvas = document.getElementById('canvas-' + id);
        if (canvas) {
          cardModules[id].start(canvas);
          cardStarted[id] = true;
        }
      } else {
        cardModules[id].resume();
      }
    }
  }

  function deactivateCard(index) {
    const id = index + 1;
    if (cardModules[id] && cardStarted[id]) {
      cardModules[id].pause();
    }
  }

  // ---- Intersection Observer ----

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      const cardIndex = parseInt(entry.target.getAttribute('data-card'), 10) - 1;
      if (entry.isIntersecting) {
        activateCard(cardIndex);
      } else {
        deactivateCard(cardIndex);
      }
    });
  }, {
    root: scrollContainer,
    threshold: 0.5
  });

  sections.forEach(function(section) {
    observer.observe(section);
  });

  // ---- Keyboard Navigation ----

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      scrollToCard(Math.min(currentCard + 1, CARD_COUNT - 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      scrollToCard(Math.max(currentCard - 1, 0));
    }
  });

  // ---- Touch Swipe ----

  scrollContainer.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  scrollContainer.addEventListener('touchend', function(e) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) {
        scrollToCard(Math.min(currentCard + 1, CARD_COUNT - 1));
      } else {
        scrollToCard(Math.max(currentCard - 1, 0));
      }
    }
  }, { passive: true });

  // ---- Scroll listener for title re-show ----

  scrollContainer.addEventListener('scroll', function() {
    showCardTitle(currentCard);
  }, { passive: true });

})();
