// Browser-specific install steps, copy buttons, the "download started" hint,
// the update banner and the screenshot lightbox. The pages work without it.
(() => {
  const html = document.documentElement;
  const ua = navigator.userAgent;
  const detected = /Edg\//.test(ua) ? 'edge' : /Chrome\//.test(ua) && !/OPR\/|Firefox\//.test(ua) ? 'chrome' : 'other';

  function setBrowser(browser) {
    html.dataset.browser = browser;
    for (const tab of document.querySelectorAll('[data-browser-tab]')) {
      tab.setAttribute('aria-selected', String(tab.dataset.browserTab === browser));
    }
    for (const el of document.querySelectorAll('[data-ext-url]')) el.textContent = `${browser}://extensions`;
  }

  setBrowser(detected === 'chrome' ? 'chrome' : 'edge');
  if (detected === 'other') for (const note of document.querySelectorAll('.unsupported-note')) note.hidden = false;
  for (const tab of document.querySelectorAll('[data-browser-tab]')) {
    tab.addEventListener('click', () => setBrowser(tab.dataset.browserTab));
  }

  // Copy buttons
  async function copy(text, button) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    button.classList.add('copied');
    const label = button.querySelector('span');
    const before = label ? label.textContent : null;
    if (label) label.textContent = 'Copied';
    setTimeout(() => {
      button.classList.remove('copied');
      if (label) label.textContent = before;
    }, 1600);
  }
  document.addEventListener('click', (event) => {
    const extButton = event.target.closest('[data-copy-ext]');
    if (extButton) copy(`${html.dataset.browser}://extensions`, extButton);
    const hashButton = event.target.closest('[data-copy]');
    if (hashButton) copy(hashButton.dataset.copy, hashButton);
  });

  // After a download on an extension page, bring the install steps into view.
  const install = document.getElementById('install');
  for (const link of document.querySelectorAll('[data-download]')) {
    link.addEventListener('click', () => {
      if (!install) return;
      setTimeout(() => {
        install.querySelector('.download-started').hidden = false;
        install.scrollIntoView({ block: 'start' });
        install.classList.remove('flash');
        void install.offsetWidth;
        install.classList.add('flash');
      }, 250);
    });
  }

  // ?installed=<version>, set by the extensions' update notice.
  const installed = new URLSearchParams(location.search).get('installed');
  const banner = document.getElementById('update-banner');
  const latest = banner?.dataset.latest;
  const newer = (a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
    }
    return false;
  };
  if (banner && installed && /^[\d.]+$/.test(installed) && latest && newer(latest, installed)) {
    banner.querySelector('[data-installed]').textContent = installed;
    banner.hidden = false;
    const update = document.getElementById('update');
    if (update) update.open = true;
  }

  // Video thumbnails: swap in the player on click (privacy-enhanced mode).
  document.addEventListener('click', (event) => {
    const video = event.target.closest('[data-video]');
    if (!video) return;
    event.preventDefault();
    const player = document.createElement('iframe');
    player.src = `https://www.youtube-nocookie.com/embed/${video.dataset.video}?autoplay=1&rel=0`;
    player.title = video.getAttribute('aria-label') || 'Video';
    player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    player.allowFullscreen = true;
    player.className = 'video';
    video.replaceWith(player);
  });

  // Screenshot lightbox
  const box = document.getElementById('lightbox');
  if (box && box.showModal) {
    document.addEventListener('click', (event) => {
      const shot = event.target.closest('.shot');
      if (!shot) return;
      box.querySelector('img').src = shot.dataset.full;
      box.querySelector('img').alt = shot.dataset.caption;
      box.querySelector('.lightbox-caption').textContent = shot.dataset.caption;
      box.showModal();
    });
    box.addEventListener('click', (event) => {
      if (event.target === box) box.close();
    });
  }
})();
