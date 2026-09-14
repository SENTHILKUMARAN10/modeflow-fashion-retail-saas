/* Salesventory — light motion layer (scroll reveal, cursor glow, magnetic, tilt, load progress).
   Dependency-free. Respects prefers-reduced-motion. Never hides content without JS. */
(function () {
  'use strict';
  var reduce = false;
  var fine = false;
  try {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch (e) { reduce = false; fine = false; }

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  /* Scroll progress bar + reveal-on-scroll: gated behind html.fx so content stays visible without JS. */
  onReady(function () {
    document.documentElement.classList.add('fx');
    if (reduce) return;

    var prog = document.getElementById('fx-progress');
    if (!prog) {
      prog = document.createElement('div');
      prog.id = 'fx-progress';
      document.body.appendChild(prog);
    }
    if (prog) {
      var ticking = false;
      function tick() {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var pct = max > 0 ? (window.scrollY || document.documentElement.scrollTop) / max : 0;
        prog.style.width = (pct * 100).toFixed(2) + '%';
        ticking = false;
      }
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(tick); }
      }, { passive: true });
      tick();
    }

    /* Reveal on scroll */
    var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if ('IntersectionObserver' in window && reveals.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      reveals.forEach(function (el, i) {
        var group = el.closest('[data-stagger]');
        var idx = group ? Array.prototype.indexOf.call(group.children, el) : i;
        el.style.transitionDelay = Math.min(idx * 70, 560) + 'ms';
        io.observe(el);
      });
    } else {
      reveals.forEach(function (el) { el.classList.add('in'); });
    }
  });

  /* Custom cursor glow (desktop only) */
  onReady(function () {
    if (!fine || reduce) return;
    var glow = document.createElement('div');
    glow.className = 'fx-glow';
    glow.style.display = 'none';
    document.body.appendChild(glow);
    var x = -400, y = -400, tx = -400, ty = -400, raf = null;
    function move(e) {
      tx = e.clientX; ty = e.clientY;
      glow.style.display = 'block';
      if (!raf) raf = requestAnimationFrame(loop);
    }
    function loop() {
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      glow.style.transform = 'translate3d(' + (x - 170) + 'px,' + (y - 170) + 'px,0)';
      raf = null;
    }
    document.addEventListener('mousemove', move, { passive: true });
    document.addEventListener('mouseleave', function () { glow.style.display = 'none'; });
    document.addEventListener('mouseenter', function () { glow.style.display = 'block'; });
  });

  /* Magnetic buttons */
  onReady(function () {
    if (!fine || reduce) return;
    var magnets = Array.prototype.slice.call(document.querySelectorAll('[data-magnetic]'));
    magnets.forEach(function (el) {
      var strength = parseInt(el.getAttribute('data-magnetic') || '8', 10);
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + dx * (strength / 100) + 'px,' + dy * (strength / 100) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  });

  /* 3D perspective tilt */
  onReady(function () {
    if (!fine || reduce) return;
    var tiles = Array.prototype.slice.call(document.querySelectorAll('[data-tilt]'));
    tiles.forEach(function (el) {
      var maxDeg = parseInt(el.getAttribute('data-tilt') || '5', 10);
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(1100px) rotateX(' + (-py * maxDeg).toFixed(2) + 'deg) rotateY(' + (px * maxDeg).toFixed(2) + 'deg) translateY(-2px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  });
})();