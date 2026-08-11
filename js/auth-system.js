// EPhone auth bypass: login/account verification UI removed.
// Keep the intro animation, then enter the phone directly.
(function () {
  'use strict';

  function enterPhone() {
    const introScreen = document.getElementById('intro-screen');
    const authScreen = document.getElementById('ephone-auth-screen');
    const phoneScreen = document.getElementById('phone-screen');

    // Remove the old account/password login UI entirely from the live DOM.
    if (authScreen) authScreen.remove();

    if (introScreen) {
      introScreen.classList.add('fade-out');
      window.setTimeout(() => {
        introScreen.style.display = 'none';
        if (phoneScreen) phoneScreen.style.display = 'block';
      }, 500);
    } else if (phoneScreen) {
      phoneScreen.style.display = 'block';
    }
  }

  function init() {
    const introScreen = document.getElementById('intro-screen');
    const authScreen = document.getElementById('ephone-auth-screen');
    const phoneScreen = document.getElementById('phone-screen');

    // The verification screen is no longer used.
    if (authScreen) authScreen.remove();

    // Do not require or retain the old auth flag anymore.
    try {
      localStorage.removeItem('ephone_auth');
    } catch (_) {}

    if (phoneScreen) phoneScreen.style.display = 'none';

    // Preserve the original "Tap to Start" intro, but skip login afterward.
    if (introScreen) {
      introScreen.addEventListener('click', enterPhone, { once: true });
    } else if (phoneScreen) {
      phoneScreen.style.display = 'block';
    }

    // Compatibility: old code may call ephoneLogout(). It now simply reloads.
    window.ephoneLogout = function () {
      location.reload();
    };

    console.log('EPhone 登录验证已移除，启动后直接进入手机。');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
