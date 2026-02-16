// Dark Mode Handler - Auto-apply on page load
(function() {
  const DARK_MODE_KEY = 'cashAppDarkMode';

  function applyDarkMode(enabled) {
    const bodyEl = document.body;
    if (!bodyEl) return;
    bodyEl.classList.toggle('dark-mode', enabled);
  }

  function initDarkMode() {
    const darkModeEnabled = localStorage.getItem(DARK_MODE_KEY) === 'true';
    applyDarkMode(darkModeEnabled);
    if (darkModeEnabled) {
      document.documentElement.classList.remove('dark-boot');
    }
  }

  // If body exists now, set immediately; otherwise wait for DOM ready
  if (document.body) {
    initDarkMode();
  } else {
    document.addEventListener('DOMContentLoaded', initDarkMode, { once: true });
  }

  // Re-check when storage changes (in case another tab updates it)
  window.addEventListener('storage', function(e) {
    if (e.key === DARK_MODE_KEY) {
      applyDarkMode(e.newValue === 'true');
    }
  });
})();
