/* ===================================================================
   PROTOF Interactive Experience, Canvas Animation & OmniDesk Tabs
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // 1. Dynamic Interactive Particle Mesh Canvas
  const canvas = document.getElementById('bg-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let particles = [];
    const particleCount = Math.min(Math.floor((width * height) / 18000), 70);

    const mouse = {
      x: null,
      y: null,
      radius: 120
    };

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    window.addEventListener('mouseout', () => {
      mouse.x = null;
      mouse.y = null;
    });

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.radius = Math.random() * 1.8 + 0.8;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx = -this.vx;
        if (this.y < 0 || this.y > height) this.vy = -this.vy;

        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            this.x -= (dx / dist) * force * 1.5;
            this.y -= (dy / dist) * force * 1.5;
          }
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 206, 209, 0.65)';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00ced1';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      // Connect near particles with lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const alpha = (1 - dist / 130) * 0.18;
            ctx.strokeStyle = `rgba(0, 206, 209, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      requestAnimationFrame(animate);
    }

    animate();
  }

  // 2. Navbar Scroll Shadow Effect
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // 3. Mobile Navigation Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });
  }

  // 4. Copy Email with Toast Notification
  const copyBtn = document.getElementById('btn-copy-email');
  const toast = document.getElementById('toast');

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const email = 'kontakt@protof.pl';
      navigator.clipboard.writeText(email).then(() => {
        showToast('Skopiowano adres: kontakt@protof.pl');
      }).catch(() => {
        showToast('Adres: kontakt@protof.pl');
      });
    });
  }

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // 5. Contact Form Submission Handling (Cloudflare Worker + Microsoft Graph)
  // =========================================================================
  // KONFIGURACJA ENDPOINTU FORMULARZA:
  const CONTACT_API_URL = 'https://contact-api.protof.pl';
  // Klucz Site Key z Cloudflare Turnstile (aktywny widżet anty-bot):
  const TURNSTILE_SITE_KEY = '0x4AAAAAAFt9mY2GRw1-dw8m';
  // =========================================================================

  const contactForm = document.getElementById('contact-form');
  const turnstileContainer = document.getElementById('turnstile-container');
  let turnstileWidgetId = null;

  if (TURNSTILE_SITE_KEY && turnstileContainer) {
    window.onProtofTurnstileLoad = () => {
      if (window.turnstile) {
        turnstileWidgetId = window.turnstile.render(turnstileContainer, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark'
        });
      }
    };
    const tsScript = document.createElement('script');
    tsScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onProtofTurnstileLoad&render=explicit';
    tsScript.async = true;
    tsScript.defer = true;
    document.head.appendChild(tsScript);
  }

  if (contactForm) {
    const submitBtn = document.getElementById('btn-submit-contact');
    const submitText = document.getElementById('btn-submit-text');
    const submitIcon = document.getElementById('btn-submit-icon');
    const statusBox = document.getElementById('form-status');

    function setFormStatus(type, message) {
      if (!statusBox) return;
      statusBox.className = 'form-status' + (type ? ` ${type}` : '');
      statusBox.textContent = message || '';
    }

    function setSubmitting(isSubmitting) {
      if (!submitBtn || !submitText) return;
      submitBtn.disabled = isSubmitting;
      if (isSubmitting) {
        submitText.textContent = 'Wysyłanie wiadomości...';
        if (submitIcon) submitIcon.style.display = 'none';
        if (!submitBtn.querySelector('.btn-spinner')) {
          const spinner = document.createElement('span');
          spinner.className = 'btn-spinner';
          submitBtn.appendChild(spinner);
        }
      } else {
        submitText.textContent = 'Wyślij zapytanie';
        if (submitIcon) submitIcon.style.display = '';
        const spinner = submitBtn.querySelector('.btn-spinner');
        if (spinner) spinner.remove();
      }
    }

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setFormStatus('', '');

      const name = document.getElementById('form-name').value.trim();
      const email = document.getElementById('form-email').value.trim();
      const message = document.getElementById('form-message').value.trim();
      const sendCopyEl = document.getElementById('form-send-copy');
      const websiteEl = document.getElementById('form-website');

      const sendCopy = sendCopyEl ? sendCopyEl.checked : false;
      const website = websiteEl ? websiteEl.value : '';

      let turnstileToken = '';
      if (TURNSTILE_SITE_KEY && window.turnstile && turnstileWidgetId !== null) {
        turnstileToken = window.turnstile.getResponse(turnstileWidgetId) || '';
        if (!turnstileToken) {
          setFormStatus('error', 'Potwierdź krótką weryfikację anty-spam powyżej przed wysłaniem.');
          return;
        }
      }

      setSubmitting(true);

      try {
        const res = await fetch(CONTACT_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            message,
            sendCopy,
            website,
            turnstileToken
          })
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.ok) {
          contactForm.reset();
          if (TURNSTILE_SITE_KEY && window.turnstile && turnstileWidgetId !== null) {
            window.turnstile.reset(turnstileWidgetId);
          }

          const successMsg = sendCopy
            ? `Dziękujemy! Wiadomość została wysłana do zespołu PROTOF, a kopia potwierdzenia trafiła na adres ${email}.`
            : 'Dziękujemy! Wiadomość została wysłana na kontakt@protof.pl — odpowiemy najszybciej, jak to możliwe.';

          setFormStatus('success', successMsg);
          showToast('Wiadomość została wysłana!');
        } else {
          setFormStatus('error', data.error || 'Nie udało się wysłać wiadomości. Spróbuj ponownie lub napisz bezpośrednio na kontakt@protof.pl.');
        }
      } catch (err) {
        setFormStatus('error', 'Brak połączenia z serwerem formularza. Napisz bezpośrednio na adres kontakt@protof.pl.');
      } finally {
        setSubmitting(false);
      }
    });
  }

  // 6. OMNIDESK INTERACTIVE TABS SWITCHING
  function switchOmniDeskTab(targetTab) {
    if (!targetTab) return;

    // A. Update Top Workspace Tabs
    const topTabs = document.querySelectorAll('.workspace-tab');
    topTabs.forEach(t => {
      if (t.getAttribute('data-target') === targetTab) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    // B. Update Sidebar Items
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
      if (item.getAttribute('data-target') === targetTab) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // C. Switch View Panels
    const panels = document.querySelectorAll('.view-panel');
    panels.forEach(p => {
      if (p.id === 'panel-' + targetTab) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    // Recalculate scaled height after switching tab
    if (typeof updateOmniDeskScale === 'function') {
      updateOmniDeskScale();
    }
  }

  // Bind clicks on Top Tabs
  document.querySelectorAll('.workspace-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      // Don't switch if clicking the close icon
      if (e.target.classList.contains('tab-close')) return;
      const target = tab.getAttribute('data-target');
      switchOmniDeskTab(target);
    });
  });

  // Bind clicks on Sidebar Items
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      switchOmniDeskTab(target);
    });
  });

  // Bind clicks on Feature Cards below Mockup
  document.querySelectorAll('.feat-card[data-switch]').forEach(card => {
    card.addEventListener('click', () => {
      const target = card.getAttribute('data-switch');
      switchOmniDeskTab(target);
      // Smooth scroll to mockup
      const mockupEl = document.querySelector('.omnidesk-mockup-wrapper');
      if (mockupEl) {
        mockupEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // 7. OMNIDESK MOBILE SCALING & PROPORTIONAL DESKTOP FIT
  const mockupWrapper = document.getElementById('omnidesk-mockup-wrapper') || document.querySelector('.omnidesk-mockup-wrapper');
  const mockupWindow = document.querySelector('.mockup-window');
  const zoomBtn = document.getElementById('btn-toggle-mockup-zoom');
  const zoomIcon = zoomBtn ? zoomBtn.querySelector('.zoom-icon') : null;
  const zoomLabel = zoomBtn ? zoomBtn.querySelector('.zoom-label') : null;

  let isMockupZoomed = false;

  function updateOmniDeskScale() {
    if (!mockupWrapper || !mockupWindow) return;

    if (window.innerWidth <= 992) {
      if (isMockupZoomed) {
        // Mode: Scrollable full width (1000px)
        mockupWrapper.classList.add('mode-scroll');
        mockupWrapper.style.height = '';
        mockupWindow.style.transform = '';
        mockupWindow.style.transformOrigin = '';
        mockupWindow.style.width = '1160px';
        mockupWindow.style.minWidth = '1160px';
        mockupWindow.style.maxWidth = '1160px';
      } else {
        // Mode: Scaled to fit mobile container width (identic to PC)
        mockupWrapper.classList.remove('mode-scroll');
        mockupWrapper.scrollLeft = 0;

        const availableWidth = mockupWrapper.getBoundingClientRect().width || mockupWrapper.clientWidth;
        const baseWidth = 1160;
        const scale = Math.min(availableWidth / baseWidth, 1);

        mockupWindow.style.transform = 'scale(' + scale + ')';
        mockupWindow.style.transformOrigin = 'top left';
        mockupWindow.style.width = baseWidth + 'px';
        mockupWindow.style.minWidth = baseWidth + 'px';
        mockupWindow.style.maxWidth = baseWidth + 'px';

        const unscaledHeight = mockupWindow.offsetHeight;
        if (unscaledHeight > 0) {
          mockupWrapper.style.height = Math.ceil(unscaledHeight * scale) + 'px';
        }
      }
    } else {
      // Desktop (> 992px): Reset all scaling
      mockupWrapper.classList.remove('mode-scroll');
      mockupWrapper.style.height = '';
      mockupWindow.style.transform = '';
      mockupWindow.style.transformOrigin = '';
      mockupWindow.style.width = '';
      mockupWindow.style.minWidth = '';
      mockupWindow.style.maxWidth = '';
    }
  }

  if (zoomBtn) {
    zoomBtn.addEventListener('click', () => {
      isMockupZoomed = !isMockupZoomed;
      if (isMockupZoomed) {
        if (zoomIcon) zoomIcon.textContent = '📱';
        if (zoomLabel) zoomLabel.textContent = 'Dopasuj do ekranu';
      } else {
        if (zoomIcon) zoomIcon.textContent = '🔍';
        if (zoomLabel) zoomLabel.textContent = 'Powiększ (przewijaj)';
      }
      updateOmniDeskScale();
    });
  }

  window.addEventListener('resize', updateOmniDeskScale);
  window.addEventListener('orientationchange', updateOmniDeskScale);

  updateOmniDeskScale();
  setTimeout(updateOmniDeskScale, 150);
  setTimeout(updateOmniDeskScale, 600);

  if (window.ResizeObserver && mockupWindow) {
    const ro = new ResizeObserver(() => {
      updateOmniDeskScale();
    });
    ro.observe(mockupWindow);
  }

});
