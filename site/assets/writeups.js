(function () {
  'use strict';
  const buttons = document.querySelectorAll('.filter-pill');
  const sections = document.querySelectorAll('.archive-section[data-categories]');
  if (!buttons.length || !sections.length) return;

  function setFilter(cat) {
    buttons.forEach((b) => {
      const active = b.getAttribute('data-filter') === cat;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    sections.forEach((sec) => {
      const cats = (sec.getAttribute('data-categories') || '').split(',');
      const match = cat === 'all' || cats.includes(cat);
      sec.hidden = !match;
    });
  }

  buttons.forEach((b) => {
    b.addEventListener('click', () => {
      const filter = b.getAttribute('data-filter') || 'all';
      setFilter(filter);
    });
  });
})();
