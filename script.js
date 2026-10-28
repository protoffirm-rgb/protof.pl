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

  // 5. Contact Form Submission Handling
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('form-name').value.trim();
      const email = document.getElementById('form-email').value.trim();
      const message = document.getElementById('form-message').value.trim();

      const subject = encodeURIComponent(`Zapytanie ze strony protof.pl od: ${name}`);
      const body = encodeURIComponent(`Nadawca: ${name}\nEmail: ${email}\n\nWiadomość:\n${message}`);

      // Open mailto link
      window.location.href = `mailto:kontakt@protof.pl?subject=${subject}&body=${body}`;

      showToast('Otwieranie programu pocztowego...');
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

});
