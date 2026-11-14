/* LYORA — lyora.beauty motion.
 *
 * GSAP + ScrollTrigger + MotionPath + Lenis, all self-hosted (assets/vendor).
 * One signature moment per section, nothing that loops for its own sake:
 *   1. Intro curtain (first visit per session) → hero entrance
 *   2. Hero: the booking flow plays inside the phone; blush gradient field
 *      drifts behind it and leans toward the cursor
 *   3. Marquee that answers scroll speed and direction
 *   4. Clients: sticky phone whose screen wipes between the four steps
 *   5. Artists: bookings leave her bio link and land in her week (scrubbed)
 *   6. Rolling-digit pricing, stacking trust cards, the footer wordmark draw
 *
 * The HTML is complete without this file: every element's resting state is
 * its final state. Reduced-motion visitors get that static page plus the
 * small UI behaviours (menu, FAQ, form).
 */
(function () {
  'use strict';

  var doc = document.documentElement;
  var rtl = (document.dir || doc.dir) === 'rtl';
  var q = function (s, r) { return (r || document).querySelector(s); };
  var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var mq = function (s) { return window.matchMedia && window.matchMedia(s).matches; };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var fine = mq('(pointer: fine)');
  var hasLibs = window.gsap && window.ScrollTrigger;

  /* ── Always-on UI ─────────────────────────────────────────────────── */
  var header = q('.site-header');
  var menuBtn = q('.menu-btn');
  if (menuBtn && header) {
    var closeMenu = function () { header.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); };
    menuBtn.addEventListener('click', function () {
      var open = header.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) header.classList.remove('hide');
    });
    qa('.nav-links a', header).forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('open')) { closeMenu(); menuBtn.focus(); }
    });
  }

  // Waitlist (the app isn't in the stores yet): phone (WhatsApp) + email (for the confirmation) + role,
  // sent to the joinWaitlist Cloud Function. Without JS the form posts there directly.
  var form = document.getElementById('notify-form');
  if (form) {
    var okMsg = q('.form-status.ok', form), errMsg = q('.form-status.err', form);
    var phoneIn = form.elements.phone, roleSel = form.elements.role;
    var phoneOk = function (v) {
      var s = String(v || '').replace(/[\s\-().]/g, '');
      return /^(?:\+20|0020|20)?0?1[0125]\d{8}$/.test(s) || /^(?:\+|00)[1-9]\d{7,14}$/.test(s);
    };
    var status = function (state) {
      if (okMsg) okMsg.classList.toggle('show', state === 'ok');
      if (errMsg) errMsg.classList.toggle('show', state === 'err');
    };
    if (phoneIn) phoneIn.addEventListener('input', function () { phoneIn.setCustomValidity(''); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (phoneIn && !phoneOk(phoneIn.value)) {
        phoneIn.setCustomValidity(form.getAttribute('data-phone-msg') || 'Enter a valid mobile number.');
        phoneIn.reportValidity();
        return;
      }
      var btn = q('button[type="submit"]', form);
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.whatsapp = !!(form.elements.whatsapp && form.elements.whatsapp.checked);
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      status('');
      fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (j) { if (!j || !j.ok) throw new Error('not ok'); status('ok'); form.reset(); })
        .catch(function () { status('err'); })
        .then(function () { btn.disabled = false; btn.removeAttribute('aria-busy'); });
    });
    // Back from the no-JS post, or arriving from "Join as an artist" on another page.
    var back = /[?&]waitlist=(joined|error)/.exec(location.search);
    if (back) status(back[1] === 'joined' ? 'ok' : 'err');
    var pickRole = function (r) {
      if (!roleSel || !r) return;
      for (var i = 0; i < roleSel.options.length; i++) {
        if (roleSel.options[i].value.toLowerCase() === String(r).toLowerCase()) roleSel.selectedIndex = i;
      }
    };
    var qRole = /[?&]role=(client|artist|salon)\b/i.exec(location.search);
    if (qRole) pickRole(qRole[1]);
    qa('[data-role]').forEach(function (a) { a.addEventListener('click', function () { pickRole(a.getAttribute('data-role')); }); });
  }

  // FAQ: animated open/close (native toggle when motion is reduced)
  qa('.faq details').forEach(function (d) {
    var sum = q('summary', d), ans = q('.answer', d);
    if (!sum || !ans || reduce || !ans.animate) return;
    var running = null;
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      if (running) running.cancel();
      if (!d.open) {
        d.open = true;
        var h = ans.scrollHeight;
        running = ans.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }],
          { duration: 460, easing: 'cubic-bezier(.16,1,.3,1)' });
      } else {
        running = ans.animate([{ height: ans.scrollHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
          { duration: 320, easing: 'cubic-bezier(.4,0,.2,1)' });
        running.onfinish = function () { d.open = false; running = null; };
      }
    });
  });

  // WhatsApp button (desktop) and bottom dock (phones: Join the waitlist + WhatsApp) slide in
  // once the visitor is past the hero. Both step aside at the footer's last row; the dock also
  // steps aside while the waitlist form itself is on screen.
  var fab = q('.wa-fab'), dock = q('.dock');
  if (fab || dock) {
    if (fab) fab.classList.add('armed');
    if (dock) dock.classList.add('armed');
    var fabHero = q('.hero, .page-hero');
    var fabEnd = false, formSeen = false;
    var fabUpdate = function () {
      var limit = fabHero ? fabHero.offsetTop + fabHero.offsetHeight * 0.55 : 160;
      var past = window.scrollY > limit;
      if (fab) fab.classList.toggle('show', past && !fabEnd);
      if (dock) dock.classList.toggle('show', past && !fabEnd && !formSeen);
    };
    if ('IntersectionObserver' in window) {
      var lastRow = q('.foot-bottom');
      if (lastRow) new IntersectionObserver(function (es) { fabEnd = es[0].isIntersecting; fabUpdate(); }).observe(lastRow);
      var wl = q('#notify-form');
      if (wl) new IntersectionObserver(function (es) { formSeen = es[0].isIntersecting; fabUpdate(); }, { threshold: 0.2 }).observe(wl);
    }
    window.addEventListener('scroll', fabUpdate, { passive: true });
    window.addEventListener('resize', fabUpdate);
    fabUpdate();
  }

  // Phone carousels (client steps, artist tools): progress dots, tap a dot to jump, and
  // keyboard focus only while the row actually scrolls (it's a normal grid on desktop).
  qa('[data-carousel]').forEach(function (track) {
    var cards = qa(':scope > .step, :scope > .tool', track);
    if (cards.length < 2) return;
    var dots = document.createElement('div');
    dots.className = 'dots';
    dots.setAttribute('aria-hidden', 'true');
    var startPad = function () { return parseFloat(getComputedStyle(track).scrollPaddingInlineStart) || 0; };
    cards.forEach(function (c) {
      var d = document.createElement('span');
      d.addEventListener('click', function () {
        var b = c.getBoundingClientRect(), r = track.getBoundingClientRect();
        var delta = rtl ? b.right - (r.right - startPad()) : b.left - (r.left + startPad());
        track.scrollBy({ left: delta, behavior: reduce ? 'auto' : 'smooth' });
      });
      dots.appendChild(d);
    });
    track.parentNode.insertBefore(dots, track.nextSibling);
    var mark = function () {
      var r = track.getBoundingClientRect(), best = 0, bestW = -1;
      cards.forEach(function (c, i) {
        var b = c.getBoundingClientRect();
        var w = Math.min(b.right, r.right) - Math.max(b.left, r.left);
        if (w > bestW + 1) { bestW = w; best = i; }
      });
      for (var i = 0; i < dots.children.length; i++) dots.children[i].classList.toggle('on', i === best);
    };
    var sync = function () {
      if (track.scrollWidth > track.clientWidth + 2) {
        track.setAttribute('tabindex', '0');
        track.setAttribute('role', 'region');
        track.setAttribute('aria-label', track.getAttribute('data-carousel'));
      } else {
        track.removeAttribute('tabindex');
        track.removeAttribute('role');
        track.removeAttribute('aria-label');
      }
      mark();
    };
    track.addEventListener('scroll', function () { window.requestAnimationFrame(mark); }, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });

  var onScrollBasic = function () { header && header.classList.toggle('scrolled', window.scrollY > 8); };

  if (reduce || !hasLibs) {
    window.addEventListener('scroll', onScrollBasic, { passive: true });
    onScrollBasic();
    doc.classList.remove('intro-pending', 'js-motion');
    return;
  }

  /* ── Motion setup ─────────────────────────────────────────────────── */
  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  if (window.MotionPathPlugin) gsap.registerPlugin(window.MotionPathPlugin);
  doc.classList.add('motion');

  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.on('scroll', function (e) {
      if (!header) return;
      header.classList.toggle('scrolled', e.scroll > 8);
      header.classList.toggle('hide', e.direction === 1 && e.scroll > 520 && !header.classList.contains('open'));
    });
    qa('a[href*="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (a.pathname !== location.pathname || a.search !== location.search || !a.hash || a.hash.length < 2) return;
        var t = q(a.hash);
        if (!t) return;
        e.preventDefault();
        lenis.scrollTo(t, { offset: -76, duration: 1.4 });
        if (history.replaceState) history.replaceState(null, '', a.hash);
      });
    });
  } else {
    window.addEventListener('scroll', onScrollBasic, { passive: true });
  }

  var X = rtl ? -1 : 1; // horizontal motion mirrors in Arabic

  /* ── 1. Intro curtain ─────────────────────────────────────────────── */
  function intro(done) {
    if (!doc.classList.contains('intro-pending')) { done(); return; }
    try { sessionStorage.setItem('lyora_intro', '1'); } catch (e) { /* private mode */ }
    var hero = q('.hero');
    var tag = (hero && hero.getAttribute('data-intro-tag')) || '';
    var el = document.createElement('div');
    el.className = 'intro-curtain';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="intro-mark">' + 'LYORA'.split('').map(function (c) {
      return '<span><i>' + c + '</i></span>';
    }).join('') + '</div><div class="intro-line"><b></b></div><div class="intro-tag">' + tag + '</div>';
    document.body.appendChild(el);
    doc.classList.remove('intro-pending');
    if (lenis) lenis.stop();
    var letters = qa('.intro-mark i', el);
    gsap.timeline({ onComplete: function () { el.remove(); if (lenis) lenis.start(); } })
      .fromTo(letters, { yPercent: 115 }, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.07 })
      .fromTo(q('.intro-line b', el), { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'power2.inOut' }, 0.2)
      .fromTo(q('.intro-tag', el), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.45)
      .to(letters, { yPercent: -115, duration: 0.55, ease: 'expo.in', stagger: 0.04 }, '+=0.2')
      .to(q('.intro-tag', el), { autoAlpha: 0, duration: 0.3 }, '<')
      .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' }, '-=0.15')
      .add(done, '-=0.62');
  }

  /* ── 2. Hero entrance, gradient field, live demo ──────────────────── */
  var demoTl = null;
  function heroIn() {
    doc.classList.remove('js-motion');
    // Home hero or a subpage's .page-hero — whichever this page has.
    var lines = qa('.hero h1 .line > span, .page-hero h1 .line > span');
    var bits = qa('.hero .eyebrow, .hero .lede, .hero .cta-row, .hero-note, .page-hero .eyebrow, .page-hero .lede');
    var phone = q('.demo-phone');
    var floats = qa('.stage .float:not(.toast)');
    var tl = gsap.timeline();
    if (lines.length) tl.fromTo(lines, { yPercent: 108 }, { yPercent: 0, duration: 1.25, ease: 'expo.out', stagger: 0.09 }, 0);
    if (bits.length) tl.fromTo(bits, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.25);
    if (phone) tl.fromTo(phone, { autoAlpha: 0, y: 90, rotationX: 18, rotationY: -16 * X, scale: 0.94 },
        { autoAlpha: 1, y: 0, rotationX: 0, rotationY: 0, scale: 1, duration: 1.6, ease: 'expo.out' }, 0.15);
    if (floats.length) tl.fromTo(floats, { autoAlpha: 0, scale: 0.85, y: 18 },
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.9, ease: 'back.out(1.7)', stagger: 0.14 }, 0.9);
    if (demoTl) tl.add(function () { demoTl.play(0); }, 1.1);
  }

  function heroField() {
    var c = q('.hero-bg');
    if (!c || !c.getContext) return;
    var ctx = c.getContext('2d');
    var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, time = 0, running = true;
    var blobs = [
      { c: '242,213,223', a: 0.95, r: 0.46, x: 0.74, y: 0.36, sx: 0.21, sy: 0.17, p: 0 },
      { c: '239,231,221', a: 0.9, r: 0.42, x: 0.28, y: 0.78, sx: 0.15, sy: 0.23, p: 2 },
      { c: '200,51,107', a: 0.12, r: 0.3, x: 0.82, y: 0.7, sx: 0.27, sy: 0.19, p: 4 },
      { c: '252,232,222', a: 0.8, r: 0.34, x: 0.5, y: 0.12, sx: 0.19, sy: 0.29, p: 1 }
    ];
    function size() {
      var r = c.getBoundingClientRect();
      w = r.width; h = r.height;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(dt) {
      if (!running || !w) return;
      time += (dt || 16) / 1000;
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      ctx.clearRect(0, 0, w, h);
      var m = Math.max(w, h);
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i];
        var bx = b.x + Math.sin(time * b.sx + b.p) * 0.07 + (mx - 0.5) * 0.08;
        var by = b.y + Math.cos(time * b.sy + b.p) * 0.06 + (my - 0.5) * 0.06;
        if (rtl) bx = 1 - bx;
        var x = bx * w, y = by * h, r = b.r * m;
        var g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(' + b.c + ',' + b.a + ')');
        g.addColorStop(1, 'rgba(' + b.c + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    }
    size();
    window.addEventListener('resize', size);
    if (fine) {
      q('.hero').addEventListener('pointermove', function (e) {
        tx = e.clientX / window.innerWidth; ty = e.clientY / window.innerHeight;
      });
    }
    gsap.ticker.add(function (t, dt) { draw(dt); });
    ScrollTrigger.create({ trigger: '.hero', start: 'top bottom', end: 'bottom top',
      onToggle: function (s) { running = s.isActive; } });
    draw(16);
  }

  function heroTilt() {
    if (!fine) return;
    var phone = q('.demo-phone');
    var floats = qa('.stage .float');
    if (!phone) return;
    var rx = gsap.quickTo(phone, 'rotationX', { duration: 0.9, ease: 'power3' });
    var ry = gsap.quickTo(phone, 'rotationY', { duration: 0.9, ease: 'power3' });
    var fx = floats.map(function (f) { return gsap.quickTo(f, 'x', { duration: 1.1, ease: 'power3' }); });
    var fy = floats.map(function (f) { return gsap.quickTo(f, 'y', { duration: 1.1, ease: 'power3' }); });
    q('.hero').addEventListener('pointermove', function (e) {
      var px = e.clientX / window.innerWidth - 0.5, py = e.clientY / window.innerHeight - 0.5;
      ry(px * 10); rx(-py * 8);
      floats.forEach(function (f, i) { var k = (i + 1) * 10; fx[i](-px * k); fy[i](-py * k); });
    });
    q('.hero').addEventListener('pointerleave', function () { rx(0); ry(0); fx.forEach(function (f) { f(0); }); fy.forEach(function (f) { f(0); }); });
  }

  // The booking flow, acted out: date → open times → time → policy → request
  // → sending → confirmed → deposit received. Loops while the hero is on screen.
  function buildDemo() {
    var demo = q('.demo');
    if (!demo) return null;
    var finger = q('.d-finger', demo);
    finger.innerHTML = '<i class="ring"></i>';
    var ring = q('.ring', finger);
    var dates = qa('.d-date', demo), slots = qa('.d-slot', demo);
    var date = q('.d-date[data-pick]', demo), slot = q('.d-slot[data-pick]', demo);
    var policy = q('.d-policy', demo), cta = q('.d-cta', demo);
    var s1 = q('.s1', cta), s2 = q('.s2', cta), s3 = q('.s3', cta);
    var check = q('.check path', cta), bar = q('.bar', cta);
    var toast = q('.stage .float.toast');

    function at(el) { return { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 }; }
    function reset() {
      dates.forEach(function (d) { d.classList.remove('on'); });
      slots.forEach(function (s) { s.classList.remove('on'); });
      policy.classList.remove('on');
      cta.classList.remove('ok');
      gsap.set(s1, { autoAlpha: 1, yPercent: 0 });
      gsap.set([s2, s3], { autoAlpha: 0, yPercent: 120 });
      gsap.set(check, { strokeDashoffset: 24 });
      gsap.set(bar, { scaleX: 0 });
      if (toast) gsap.set(toast, { autoAlpha: 0, x: 40 * X, scale: 0.92 });
      var p = at(cta);
      gsap.set(finger, { xPercent: -50, yPercent: -50, x: p.x + 40, y: p.y + 60, autoAlpha: 0, scale: 1 });
    }
    function tap(el, on) {
      var t = gsap.timeline();
      t.to(finger, { x: function () { return at(el).x; }, y: function () { return at(el).y; }, duration: 0.75, ease: 'power3.inOut' })
        .to(finger, { scale: 0.8, duration: 0.12, ease: 'power2.in' })
        .fromTo(ring, { scale: 0.6, autoAlpha: 0.9 }, { scale: 1.9, autoAlpha: 0, duration: 0.55, ease: 'power2.out' })
        .call(on, null, '<')
        .to(finger, { scale: 1, duration: 0.25, ease: 'power2.out' }, '<');
      return t;
    }
    var tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.3, onRepeat: reset });
    tl.call(reset)
      .to(finger, { autoAlpha: 1, duration: 0.35 }, 0.2)
      .add(tap(date, function () { date.classList.add('on'); }))
      .fromTo(slots, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.035, ease: 'power2.out' }, '+=0.05')
      .add(tap(slot, function () { slot.classList.add('on'); }), '+=0.15')
      .call(function () { policy.classList.add('on'); }, null, '+=0.35')
      .add(tap(cta, function () {}), '+=0.6')
      .to(s1, { yPercent: -120, autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, '-=0.5')
      .to(s2, { yPercent: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out' }, '<0.15')
      .to(finger, { autoAlpha: 0, duration: 0.3 }, '<')
      .fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'power1.inOut' })
      .call(function () { cta.classList.add('ok'); })
      .to(s2, { yPercent: -120, autoAlpha: 0, duration: 0.3, ease: 'power2.in' })
      .to(s3, { yPercent: 0, autoAlpha: 1, duration: 0.45, ease: 'back.out(2)' }, '<0.12')
      .to(check, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, '<0.15');
    if (toast) {
      tl.to(toast, { autoAlpha: 1, x: 0, scale: 1, duration: 0.8, ease: 'back.out(1.6)' }, '+=0.35')
        .to(toast, { autoAlpha: 0, y: -12, duration: 0.45, ease: 'power2.in' }, '+=2.6')
        .set(toast, { y: 0 });
    } else {
      tl.to({}, { duration: 3 });
    }
    reset();
    ScrollTrigger.create({ trigger: '.hero', start: 'top bottom', end: 'bottom top',
      onToggle: function (s) { if (tl.progress() > 0 || tl.isActive()) { s.isActive ? tl.resume() : tl.pause(); } } });
    return tl;
  }

  /* ── 3. Marquee ───────────────────────────────────────────────────── */
  function marquee() {
    var track = q('.marquee-track');
    if (!track) return;
    var group = q('.marquee-group', track);
    while (track.scrollWidth < window.innerWidth * 2.2) track.appendChild(group.cloneNode(true));
    var gw = group.offsetWidth, x = 0, dir = -1 * X, vel = 0, skew = 0;
    var setSkew = gsap.quickSetter(track, 'skewX', 'deg');
    ScrollTrigger.create({ onUpdate: function (s) { vel = s.getVelocity(); dir = (s.direction === 1 ? -1 : 1) * X; } });
    var visible = true;
    ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onToggle: function (s) { visible = s.isActive; } });
    gsap.ticker.add(function (t, dt) {
      if (!visible) return;
      var boost = Math.min(Math.abs(vel) / 250, 7);
      x += dir * (40 + boost * 40) * (dt / 1000);
      if (x <= -gw) x += gw;
      if (x > 0) x -= gw;
      track.style.transform = 'translate3d(' + x + 'px,0,0)';
      skew += ((Math.max(-8, Math.min(8, -vel / 220)) * X) - skew) * 0.12;
      setSkew(skew);
      vel *= 0.92;
    });
    window.addEventListener('resize', function () { gw = group.offsetWidth; });
  }

  /* ── Section reveals (supporting, not the show) ───────────────────── */
  function reveals() {
    qa('[data-reveal]').forEach(function (el) {
      var parts = el.children.length ? Array.prototype.slice.call(el.children) : [el];
      gsap.fromTo(parts, { autoAlpha: 0, y: 34, clipPath: 'inset(0% 0% 100% 0%)' }, {
        autoAlpha: 1, y: 0, clipPath: 'inset(0% 0% -25% 0%)', duration: 1.1, ease: 'expo.out', stagger: 0.09,
        clearProps: 'clipPath', scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });
    qa('[data-stagger]').forEach(function (el) {
      gsap.fromTo(el.children, { autoAlpha: 0, y: 26 }, {
        autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });
  }

  /* ── Pull quotes: words fill in as they scroll through (Our story) ── */
  function words() {
    qa('[data-words]').forEach(function (el) {
      var split = function (node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 1) { split(n); return; }
          if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
          var frag = document.createDocumentFragment();
          n.nodeValue.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span');
            w.className = 'w';
            w.textContent = part;
            frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        });
      };
      split(el);
      gsap.fromTo(qa('.w', el), { opacity: 0.14 }, { opacity: 1, ease: 'none', stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: 0.5 } });
    });
  }

  /* ── 4. Clients story: sticky phone, screens wipe per step ────────── */
  function story(mm) {
    mm.add('(min-width: 861px)', function () {
      var steps = qa('.step'), shots = qa('.shots img'), glare = q('.shots .shot-glare');
      var list = q('.steps');
      if (!steps.length || !shots.length) return;
      list.classList.add('story-on');
      shots.forEach(function (img, i) {
        gsap.set(img, { zIndex: i, clipPath: i === 0 ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)', scale: 1 });
      });
      var cur = 0;
      steps[0].classList.add('active');
      function show(i) {
        if (i === cur) return;
        steps.forEach(function (s, k) { s.classList.toggle('active', k === i); });
        shots.forEach(function (img, k) {
          if (k === 0) return;
          var visible = k <= i, was = k <= cur;
          if (visible === was) return;
          if (visible) {
            gsap.fromTo(img, { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.12 },
              { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.05, ease: 'expo.inOut', overwrite: true });
          } else {
            gsap.to(img, { clipPath: 'inset(100% 0% 0% 0%)', duration: 0.85, ease: 'expo.inOut', overwrite: true });
          }
        });
        if (glare) gsap.fromTo(glare, { xPercent: -120 * X }, { xPercent: 120 * X, duration: 1.2, ease: 'power2.inOut', delay: 0.25 });
        cur = i;
      }
      steps.forEach(function (s, i) {
        ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%',
          onToggle: function (st) { if (st.isActive) show(i); } });
      });
      var rail = gsap.fromTo('.steps-rail b', { scaleY: 0 }, { scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: list, start: 'top 55%', end: 'bottom 55%', scrub: 0.4 } });
      var tilt = gsap.fromTo('.story-phone .phone', { rotation: -2 * X, y: 30 }, { rotation: 2 * X, y: -30, ease: 'none',
        scrollTrigger: { trigger: list, start: 'top bottom', end: 'bottom top', scrub: 1 } });
      return function () {
        list.classList.remove('story-on');
        steps.forEach(function (s) { s.classList.remove('active'); });
        gsap.set(shots, { clearProps: 'clipPath,zIndex,scale' });
        rail.kill(); tilt.kill();
      };
    });
    mm.add('(max-width: 860px)', function () {
      qa('.step .inline-shot').forEach(function (p) {
        gsap.fromTo(p, { autoAlpha: 0, y: 50, rotation: 3 * X }, { autoAlpha: 1, y: 0, rotation: 0, duration: 1.1, ease: 'expo.out',
          scrollTrigger: { trigger: p, start: 'top 88%', once: true } });
      });
    });
  }

  /* ── 5. Artists: bio link → week ──────────────────────────────────── */
  function flow(mm) {
    var root = q('[data-flow]');
    if (!root || !window.MotionPathPlugin) return;
    var svg = q('.flow-svg', root), link = q('.ig-link', root);
    var cells = qa('.cell[data-t]', root).sort(function (a, b) { return a.dataset.t - b.dataset.t; });
    var tokens = qa('.token', root), count = q('[data-count]', root);
    var NS = 'http://www.w3.org/2000/svg';

    function center(el) {
      var f = root.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height / 2 };
    }
    function build(desktop) {
      svg.innerHTML = '';
      svg.setAttribute('viewBox', '0 0 ' + root.clientWidth + ' ' + root.clientHeight);
      var s = center(link);
      var proxy = { n: 0 };
      cells.forEach(function (c) { c.classList.remove('filled'); });
      var tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: desktop
          ? { trigger: root.closest('.flow-stage') || root, start: 'top 88px', end: '+=140%', pin: true, scrub: 0.7, anticipatePin: 1 }
          : { trigger: root, start: 'top 70%', end: 'bottom 40%', scrub: 0.7 }
      });
      tl.fromTo(link, { boxShadow: '0 0 0 0 rgba(240,167,194,0)' }, { boxShadow: '0 0 0 10px rgba(240,167,194,.18)', duration: 0.4 }, 0);
      cells.forEach(function (cell, i) {
        var e = center(cell);
        var c = desktop
          ? { x: s.x + (e.x - s.x) * 0.5, y: Math.min(s.y, e.y) - 70 - i * 14 }
          : { x: (s.x + e.x) / 2 + (i % 2 ? 60 : -60), y: s.y + (e.y - s.y) * 0.45 };
        var path = document.createElementNS(NS, 'path');
        path.setAttribute('d', 'M' + s.x + ',' + s.y + ' Q' + c.x + ',' + c.y + ' ' + e.x + ',' + e.y);
        svg.appendChild(path);
        var len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
        var tok = tokens[i];
        var t0 = 0.3 + i * 0.55;
        gsap.set(tok, { autoAlpha: 0, scale: 0.4 });
        tl.to(path, { strokeDashoffset: 0, duration: 0.6 }, t0)
          .to(tok, { autoAlpha: 1, scale: 1, duration: 0.15 }, t0)
          .to(tok, { duration: 0.6, ease: 'power1.inOut',
            motionPath: { path: path, align: path, alignOrigin: [0.5, 0.5] } }, t0)
          .to(tok, { scale: 0.5, autoAlpha: 0, duration: 0.12 }, t0 + 0.6)
          .fromTo(cell, { backgroundColor: '#2a2524' }, { backgroundColor: '#c8336b', duration: 0.12 }, t0 + 0.58)
          .to(proxy, { n: i + 1, duration: 0.12, onUpdate: function () { if (count) count.textContent = Math.round(proxy.n); } }, t0 + 0.6)
          .to(path, { opacity: 0.18, duration: 0.4 }, t0 + 0.75);
      });
      tl.to({}, { duration: 0.6 });
      return tl;
    }
    mm.add({ desktop: '(min-width: 861px)', mobile: '(max-width: 860px)' }, function (ctx) {
      var tl = build(ctx.conditions.desktop);
      var onResize = gsap.delayedCall(0.3, function () { ScrollTrigger.refresh(); }).pause();
      return function () {
        onResize.kill();
        if (tl.scrollTrigger) tl.scrollTrigger.kill(true);
        tl.kill();
        svg.innerHTML = '';
        gsap.set(tokens, { clearProps: 'all' });
        gsap.set(cells, { clearProps: 'backgroundColor' });
        cells.forEach(function (c) { c.classList.add('filled'); });
        if (count) count.textContent = cells.length;
      };
    });
  }

  /* ── 6a. Parallax phones in the artist tools ──────────────────────── */
  function parallax(mm) {
    qa('[data-parallax]').forEach(function (el) {
      var n = parseFloat(el.getAttribute('data-parallax')) || 0;
      mm.add('(min-width: 861px)', function () {
        gsap.fromTo(el, { yPercent: n }, { yPercent: -n, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      var img = q('img', el);
      if (img) gsap.fromTo(img, { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.15 }, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.4, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
  }

  /* ── 6b. Rolling digits ───────────────────────────────────────────── */
  function odometers() {
    qa('.odo[data-to]').forEach(function (odo, k) {
      var val = String(odo.getAttribute('data-to'));
      var sr = document.createElement('span');
      sr.className = 'sr';
      sr.textContent = val;
      var cols = [];
      var html = '';
      for (var i = 0; i < val.length; i++) {
        var col = '<span class="odo-col" aria-hidden="true" style="display:inline-block">';
        for (var d = 0; d < 20; d++) col += '<span>' + (d % 10) + '</span>';
        html += col + '</span>';
      }
      odo.innerHTML = html;
      odo.appendChild(sr);
      cols = qa('.odo-col', odo);
      cols.forEach(function (c, i) {
        var target = 10 + parseInt(val[i], 10);
        gsap.fromTo(c, { yPercent: 0 }, { yPercent: -100 * target / 20, duration: 2 + i * 0.25, ease: 'expo.out',
          delay: k * 0.15, scrollTrigger: { trigger: odo, start: 'top 88%', once: true } });
      });
    });
  }

  /* ── 6c. Trust cards stack ────────────────────────────────────────── */
  function stack(mm) {
    mm.add('(min-width: 861px)', function () {
      var cards = qa('.stack-card');
      cards.forEach(function (card, i) {
        var next = cards[i + 1];
        if (!next) return;
        gsap.fromTo(card, { scale: 1, '--tint': '#fbf9f7' }, { scale: 0.94, '--tint': '#f1ece6', ease: 'none',
          scrollTrigger: { trigger: next, start: 'top bottom', end: 'top ' + (110 + (i + 1) * 22) + 'px', scrub: true } });
      });
    });
  }

  /* ── 6d. Footer wordmark: line draws, letters rise and trace, ink fills ── */
  function giant() {
    var svg = q('.giant-svg');
    var src = svg && q('text', svg);
    if (!src || !src.getStartPositionOfChar) return;
    var NS = 'http://www.w3.org/2000/svg';
    var mk = function (tag, attrs) {
      var el = document.createElementNS(NS, tag);
      for (var k in attrs) el.setAttribute(k, attrs[k]);
      return el;
    };
    var build = function () {
      var word = src.textContent, base = parseFloat(src.getAttribute('y')), xs = [];
      try { for (var i = 0; i < word.length; i++) xs.push(src.getStartPositionOfChar(i).x); } catch (e) { return; }
      var vb = svg.viewBox.baseVal;
      var defs = mk('defs', {});
      // Letters live above this edge; they start below it and rise through it.
      defs.appendChild(mk('clipPath', { id: 'giant-clip' }))
        .appendChild(mk('rect', { x: vb.x - 60, y: vb.y - 240, width: vb.width + 120, height: base + 8 - (vb.y - 240) }));
      var group = mk('g', { 'clip-path': 'url(#giant-clip)' });
      var letters = [], fills = [];
      for (var j = 0; j < word.length; j++) {
        var grad = defs.appendChild(mk('linearGradient', { id: 'giant-fill-' + j, x1: 0, y1: 1, x2: 0, y2: 0 }));
        var s1 = grad.appendChild(mk('stop', { offset: 0 }));
        var s2 = grad.appendChild(mk('stop', { offset: 0, 'stop-opacity': 0 }));
        var t = group.appendChild(mk('text', { x: xs[j], y: base, 'class': 'gl' }));
        t.style.fill = 'url(#giant-fill-' + j + ')';
        t.textContent = word[j];
        letters.push(t);
        fills.push([s1, s2]);
      }
      var line = mk('line', { 'class': 'giant-line', x1: vb.x + 6, x2: vb.x + vb.width - 6, y1: base + 12, y2: base + 12 });
      svg.appendChild(defs);
      svg.appendChild(group);
      svg.appendChild(line);
      src.parentNode.removeChild(src);

      gsap.set(line, { scaleX: 0, transformOrigin: '50% 50%' });
      gsap.set(letters, { y: 170, strokeDasharray: 1200, strokeDashoffset: 1200 });
      var tl = gsap.timeline({ paused: true });
      tl.to(line, { scaleX: 1, duration: 0.9, ease: 'power3.inOut' }, 0)
        .to(letters, { y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.08 }, 0.35)
        .to(letters, { strokeDashoffset: 0, duration: 1.7, ease: 'power2.inOut', stagger: 0.08 }, 0.35);
      fills.forEach(function (f, k) {
        var o = { p: -0.14 };
        tl.to(o, { p: 1, duration: 1.05, ease: 'power2.inOut', onUpdate: function () {
          f[0].setAttribute('offset', Math.max(0, o.p));
          f[1].setAttribute('offset', Math.min(1, Math.max(0, o.p + 0.14)));
        } }, 1.1 + k * 0.09);
      });
      tl.to(letters, { strokeOpacity: 0, duration: 0.7, ease: 'power1.out' }, '-=0.35')
        .to(line, { opacity: 0, duration: 0.7, ease: 'power1.out' }, '<');

      ScrollTrigger.create({ trigger: svg, start: 'top 90%', once: true, onEnter: function () { tl.play(); } });

      // Desktop: letters lift in a soft wave under the cursor once the word has settled.
      if (fine) {
        var lifts = letters.map(function (el) { return gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3' }); });
        var centers = letters.map(function (el) { var b = el.getBBox(); return b.x + b.width / 2; });
        var pt = svg.createSVGPoint();
        svg.addEventListener('pointermove', function (e) {
          var m = svg.getScreenCTM();
          if (tl.progress() < 1 || !m) return;
          pt.x = e.clientX; pt.y = e.clientY;
          var px = pt.matrixTransform(m.inverse()).x;
          letters.forEach(function (el, i) { var d = (centers[i] - px) / 110; lifts[i](-16 * Math.exp(-d * d)); });
        });
        svg.addEventListener('pointerleave', function () { lifts.forEach(function (f) { f(0); }); });
      }
    };
    if (document.fonts && document.fonts.load) document.fonts.load('500 200px "Cormorant Garamond"').then(build, build);
    else build();
  }

  /* ── 6e. Magnetic primary buttons ─────────────────────────────────── */
  function magnetic() {
    if (!fine) return;
    qa('.magnetic').forEach(function (b) {
      var xTo = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'power3' });
      var yTo = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'power3' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.22);
        yTo((e.clientY - r.top - r.height / 2) * 0.3);
      });
      b.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });
  }

  /* ── Go ───────────────────────────────────────────────────────────── */
  var mm = gsap.matchMedia();
  demoTl = buildDemo();
  heroField();
  heroTilt();
  marquee();
  reveals();
  words();
  story(mm);
  flow(mm);
  parallax(mm);
  odometers();
  stack(mm);
  giant();
  magnetic();
  intro(heroIn);

  var refresh = function () { ScrollTrigger.refresh(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh);
})();
