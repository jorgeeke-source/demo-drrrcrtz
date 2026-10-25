/* Yeritzell González — comportamiento. Clásico + IIFE, sin dependencias. */
(function () {
  'use strict';

  var B = window.__BRAND__ || {};
  var doc = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  function safe(name, fn) {
    try { fn(); } catch (e) { if (window.console) console.warn('[init] ' + name, e); }
  }
  function $(s, ctx) { return (ctx || document).querySelector(s); }
  function $$(s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- Fondo vivo reactivo al ratón ---------- */
  function initField() {
    var canvas = $('#field');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, pts = [], gap = 32;
    var mouse = { x: -9999, y: -9999, tx: 0, ty: 0, last: 0 };
    var soft = !finePointer || window.innerWidth < 860;
    var COLORS = soft
      ? { far: 'rgba(138, 91, 61, .18)', mid: 'rgba(138, 91, 61, .45)', near: 'rgba(92, 15, 34, .55)' }
      : { far: 'rgba(138, 91, 61, .26)', mid: '#8A5B3D', near: '#5C0F22' };

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gap = W < 700 ? 28 : 34;
      pts = [];
      var ox = (W % gap) / 2, oy = (H % gap) / 2;
      for (var y = oy; y <= H; y += gap) {
        for (var x = ox; x <= W; x += gap) pts.push({ x: x, y: y });
      }
      if (mouse.x < -999) { mouse.x = mouse.tx = W * .7; mouse.y = mouse.ty = H * .4; }
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      var idle = (t - mouse.last) > 2600;
      if (idle && !reduced) {
        mouse.tx = W * (.5 + .34 * Math.sin(t * .00021));
        mouse.ty = H * (.46 + .3 * Math.sin(t * .00029 + 1.3));
      }
      mouse.x += (mouse.tx - mouse.x) * .08;
      mouse.y += (mouse.ty - mouse.y) * .08;

      var R = Math.max(220, Math.min(W, H) * .38);
      var paths = { far: new Path2D(), mid: new Path2D(), near: new Path2D() };
      var drift = reduced ? 0 : t * .00025;

      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var dx = mouse.x - p.x, dy = mouse.y - p.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        var k = d < R ? 1 - d / R : 0;
        k = k * k * (3 - 2 * k);
        var base = Math.sin(p.x * .006 + drift) + Math.cos(p.y * .007 - drift);
        var ang = k > 0 ? Math.atan2(dy, dx) * k + base * (1 - k) : base;
        var len = 5 + k * 17;
        var push = k * 14;
        var cx = p.x - (d ? dx / d : 0) * push;
        var cy = p.y - (d ? dy / d : 0) * push;
        var hx = Math.cos(ang) * len / 2, hy = Math.sin(ang) * len / 2;
        var bucket = k > .5 ? paths.near : k > .12 ? paths.mid : paths.far;
        bucket.moveTo(cx - hx, cy - hy);
        bucket.lineTo(cx + hx, cy + hy);
      }
      ctx.lineCap = 'butt';
      ctx.lineWidth = 1.4; ctx.strokeStyle = COLORS.far; ctx.stroke(paths.far);
      ctx.lineWidth = 1.6; ctx.strokeStyle = COLORS.mid; ctx.stroke(paths.mid);
      ctx.lineWidth = 2.2; ctx.strokeStyle = COLORS.near; ctx.stroke(paths.near);
    }

    var running = true;
    function loop(t) {
      if (running) draw(t || 0);
      requestAnimationFrame(loop);
    }
    function move(x, y) { mouse.tx = x; mouse.ty = y; mouse.last = performance.now(); }

    window.addEventListener('pointermove', function (e) { move(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 150); });
    document.addEventListener('visibilitychange', function () { running = !document.hidden; });
    build();
    requestAnimationFrame(loop);
  }

  /* ---------- Reveal al hacer scroll ---------- */
  function initReveal() {
    var els = $$('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el, i) {
      var sib = el.parentElement ? $$(':scope > .reveal', el.parentElement).indexOf(el) : 0;
      el.style.transitionDelay = (Math.max(0, sib) * 90) + 'ms';
      io.observe(el);
    });
  }

  /* ---------- Contador 70 → 140 ---------- */
  function initCounters() {
    var els = $$('[data-count]');
    if (!els.length || reduced || !('IntersectionObserver' in window)) return;
    els.forEach(function (el) { el.textContent = '0'; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, end = +el.getAttribute('data-count'), t0 = null, dur = 1600;
        (function step(t) {
          if (!t0) t0 = t;
          var p = clamp((t - t0) / dur, 0, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        })(performance.now());
      });
    }, { threshold: 0.05 });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(function () { els.forEach(function (el) { if (el.textContent === '0') el.textContent = el.getAttribute('data-count'); }); }, 5000);
  }

  /* ---------- Nav, menú y barra de progreso ---------- */
  function initNav() {
    var nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
    var bar = $('.progress span');
    var links = $$('.nav__links a');
    var secs = links.map(function (a) { return $(a.getAttribute('href')); });

    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      nav.classList.toggle('is-scrolled', y > 20);
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      var mid = window.innerHeight * .4, cur = -1;
      secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < mid) cur = i; });
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === cur); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function setMenu(open) {
      doc.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.style.overflow = open ? 'hidden' : '';
    }
    burger.addEventListener('click', function () { setMenu(!doc.classList.contains('menu-open')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- Línea de tiempo: El Ciclo del Infinito Asesor ---------- */
  function initLoop() {
    var path = $('#loopPath'), dot = $('#loopDot'), list = $('.steps');
    if (!path || !list) return;
    var steps = $$('.step', list), tabs = $$('.loop__tabs button');
    var num = $('#loopNum'), name = $('#loopName');
    var L = path.getTotalLength();
    path.style.strokeDasharray = L + ' ' + L;
    var active = -1;

    function setActive(i) {
      if (i === active) return;
      active = i;
      steps.forEach(function (s, j) {
        s.classList.toggle('is-on', j === i);
        $('.step__head', s).setAttribute('aria-current', j === i ? 'step' : 'false');
      });
      tabs.forEach(function (b, j) { b.classList.toggle('is-on', j === i); });
      num.textContent = steps[i].getAttribute('data-num');
      name.textContent = steps[i].getAttribute('data-name');
    }

    // Línea de lectura: la fase activa es la que la cruza
    function anchor() {
      var vis = $('.metodo__visual');
      if (window.innerWidth <= 860 && vis) return (parseFloat(getComputedStyle(vis).top) || 72) + vis.offsetHeight + 48;
      return window.innerHeight * .36;
    }

    function update() {
      var a = anchor(), cur = 0, local = 0;
      var first = steps[0].getBoundingClientRect();
      var last = steps[steps.length - 1].getBoundingClientRect();
      if (a < first.top) { cur = 0; local = 0; }
      else if (a >= last.bottom) { cur = steps.length - 1; local = 1; }
      else {
        steps.forEach(function (s, j) {
          var r = s.getBoundingClientRect();
          if (a >= r.top && a < r.bottom) { cur = j; local = (a - r.top) / r.height; }
        });
      }
      var p = clamp((cur + local) / steps.length, 0, 1);
      path.style.strokeDashoffset = L * (1 - p);
      var pt = path.getPointAtLength(L * p);
      dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
      setActive(cur);
    }

    function goTo(i) {
      var y = steps[i].getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - anchor() + 24;
      window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    }
    tabs.forEach(function (b) { b.addEventListener('click', function () { goTo(+b.getAttribute('data-go')); }); });
    steps.forEach(function (s, j) { $('.step__head', s).addEventListener('click', function () { goTo(j); }); });
    $$('.step__head').forEach(function (h) { h.removeAttribute('aria-expanded'); });

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Manifiesto: palabras que se encienden ---------- */
  function initManifest() {
    var box = $('#manifest');
    if (!box) return;
    var words = [];
    function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement('span');
            s.className = 'w'; s.textContent = part;
            frag.appendChild(s); words.push(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) wrap(n);
      });
    }
    wrap(box);
    if (reduced) { words.forEach(function (w) { w.classList.add('on'); }); return; }
    function update() {
      var vh = window.innerHeight, r = box.getBoundingClientRect();
      var p = clamp((vh * .82 - r.top) / (r.height + vh * .1), 0, 1);
      var n = Math.round(p * words.length);
      for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < n);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------- Botones magnéticos + libro 3D ---------- */
  function initMagnetic() {
    if (!finePointer || reduced) return;
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * .22;
        var y = (e.clientY - r.top - r.height / 2) * .3;
        el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    var cover = $('.ebook__cover'), book = $('.book');
    if (cover && book) {
      cover.addEventListener('pointermove', function (e) {
        var r = cover.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
        book.style.transform = 'rotateY(' + (-18 + nx * 26).toFixed(1) + 'deg) rotateX(' + (4 - ny * 14).toFixed(1) + 'deg)';
      });
      cover.addEventListener('pointerleave', function () { book.style.transform = ''; });
    }
  }

  /* ---------- Vídeo: carga el reproductor al pulsar ---------- */
  function initVideo() {
    var frame = $('#video'), poster = frame && $('.video__poster', frame);
    if (!poster || !B.videoId) return;
    poster.addEventListener('click', function (e) {
      e.preventDefault();
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + B.videoId + '?autoplay=1&rel=0';
      f.title = 'Entrenamiento gratuito: planificación financiera y familiar';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      frame.innerHTML = '';
      frame.appendChild(f);
    });
  }

  /* ---------- Ebook: registro y descarga ---------- */
  function initLead() {
    var form = $('#leadForm'), msg = $('#leadMsg');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nombre = form.nombre, email = form.email, ok = form.ok;
      var bad = false;
      [nombre, email, ok].forEach(function (f) { f.classList.remove('is-bad'); });
      if (!nombre.value.trim()) { nombre.classList.add('is-bad'); bad = true; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { email.classList.add('is-bad'); bad = true; }
      if (!ok.checked) { ok.classList.add('is-bad'); bad = true; }
      msg.classList.remove('is-ok');
      if (bad) { msg.textContent = 'Revisa tu nombre, tu correo y la casilla de aceptación.'; return; }

      var data = { nombre: nombre.value.trim(), email: email.value.trim(), whatsapp: (form.whatsapp ? form.whatsapp.value.trim() : ''), recurso: 'Ebook Metodología del Agente Exitoso' };
      var first = data.nombre.split(' ')[0];

      function done() {
        msg.classList.add('is-ok');
        msg.innerHTML = '';
        var p = document.createElement('span');
        p.textContent = '¡Gracias, ' + first + '! Tu ebook está listo.';
        msg.appendChild(p);
        if (B.ebookUrl) {
          var a = document.createElement('a');
          a.href = B.ebookUrl; a.setAttribute('download', ''); a.className = 'btn btn--hueso';
          a.textContent = 'Descargar el PDF ↓';
          msg.appendChild(a);
        }
        if (B.whatsapp) {
          var w = document.createElement('a');
          w.href = 'https://wa.me/' + B.whatsapp + '?text=' + encodeURIComponent('Hola Yeritzell, soy ' + data.nombre + '. Ya descargué el ebook.');
          w.target = '_blank'; w.rel = 'noopener'; w.className = 'wa';
          w.textContent = 'Escríbele a Yeritzell por WhatsApp →';
          msg.appendChild(w);
        }
        form.reset();
        $$('input, button[type=submit]', form).forEach(function (el) { if (el.type !== 'submit') el.blur(); });
      }

      if (B.leadEndpoint) {
        fetch(B.leadEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        }).then(function (r) { if (!r.ok) throw new Error(r.status); done(); })
          .catch(function () { msg.textContent = 'No se pudo enviar. Inténtalo de nuevo en un momento.'; });
      } else {
        // Demo: no se envía ni se guarda ningún dato.
        done();
      }
    });
  }

  /* ---------- Vídeo en bucle: solo se reproduce cuando se ve ---------- */
  function initReel() {
    var v = $('#reel');
    if (!v || reduced || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.05 });
    io.observe(v);
  }

  /* ---------- Redes desde el manifiesto ---------- */
  function initSocials() {
    var S = B.socials || {};
    $$('[data-social]').forEach(function (li) {
      var url = S[li.getAttribute('data-social')];
      if (!url) return;
      $('a', li).href = url;
      li.hidden = false;
    });
  }

  function boot() {
    safe('field', initField);
    safe('reveal', initReveal);
    safe('counters', initCounters);
    safe('nav', initNav);
    safe('loop', initLoop);
    safe('manifest', initManifest);
    safe('magnetic', initMagnetic);
    safe('video', initVideo);
    safe('lead', initLead);
    safe('reel', initReel);
    safe('socials', initSocials);
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
    doc.classList.add('ready');
    requestAnimationFrame(function () { requestAnimationFrame(function () { doc.classList.add('loaded'); }); });
    setTimeout(function () { doc.classList.add('loaded'); }, 120);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
