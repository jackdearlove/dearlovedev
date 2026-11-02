(function () {
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Tubemoji departure board ---------- */

  var clock = document.getElementById('clock');
  function tick() {
    var now = new Date();
    clock.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  }
  tick();
  setInterval(tick, 1000);

  // Easter egg: between midnight and 5am the board closes for the night.
  // Add ?night to the URL to see it at any time.
  var hour = new Date().getHours();
  var night = hour < 5 || /[?&]night\b/.test(location.search);

  if (night) {
    document.getElementById('dep-time').textContent = '--:--';
    document.querySelector('.dep-dest [data-scramble]').textContent = 'No further departures';
    document.querySelector('.dep-fare').textContent = '';
    document.querySelector('.dep-calling').innerHTML = '<b>Calling at:</b> bed. Tubemoji will be back first thing — get some sleep.';
    document.querySelector('.board-cta').firstChild.nodeValue = 'Plan tomorrow: ';
    document.querySelectorAll('.status li').forEach(function (li) {
      li.children[1].textContent = '😴';
      li.children[2].textContent = 'Closed';
    });
    document.querySelectorAll('.ticker-track span').forEach(function (s) {
      s.innerHTML = 'This station is now closed · The first service will depart in the morning · Please take all your belongings with you · Sweet dreams ·&nbsp;';
    });
  } else {
    // Next departure is the coming 5-minute mark
    var dep = new Date();
    dep.setSeconds(0, 0);
    dep.setMinutes(Math.ceil((dep.getMinutes() + 1) / 5) * 5);
    document.getElementById('dep-time').textContent = pad(dep.getHours()) + ':' + pad(dep.getMinutes());
  }

  // Letters shuffle into place. Timed from the clock rather than counting
  // frames, so it still finishes on schedule if the browser throttles timers.
  if (!reduceMotion) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$.';
    var began = Date.now();
    document.querySelectorAll('[data-scramble]').forEach(function (el, i) {
      var target = el.textContent;
      var delay = 200 + i * 120;
      var timer = setInterval(function () {
        var settled = Math.max(0, Math.floor((Date.now() - began - delay) / 45));
        el.textContent = target.split('').map(function (c, j) {
          if (c === ' ' || j < settled) return c;
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        if (settled >= target.length) {
          el.textContent = target;
          clearInterval(timer);
        }
      }, 45);
    });
  }

  /* ---------- Mountain map contours ---------- */

  // Small seeded random so the map looks the same on every visit
  var seed = 7;
  function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

  var svg = document.getElementById('contours');
  var paths = [];
  function hill(cx, cy, levels, step, stretch) {
    var ph = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
    for (var k = 1; k <= levels; k++) {
      var r = k * step, pts = [];
      for (var a = 0; a < 64; a++) {
        var th = (a / 64) * Math.PI * 2;
        var wob = 1 + 0.16 * Math.sin(2 * th + ph[0] + k * 0.12)
                    + 0.09 * Math.sin(3 * th + ph[1] - k * 0.1)
                    + 0.05 * Math.sin(5 * th + ph[2] + k * 0.2);
        pts.push([cx + Math.cos(th) * r * wob * stretch, cy + Math.sin(th) * r * wob]);
      }
      // Smooth closed curve through the points using midpoints
      var d = '';
      for (var i = 0; i < pts.length; i++) {
        var p0 = pts[i], p1 = pts[(i + 1) % pts.length];
        var mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
        d += (i === 0 ? 'M' + mx.toFixed(1) + ' ' + my.toFixed(1) : '') + ' Q' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' ';
        var p2 = pts[(i + 2) % pts.length];
        d += ((p1[0] + p2[0]) / 2).toFixed(1) + ' ' + ((p1[1] + p2[1]) / 2).toFixed(1);
      }
      paths.push('<path d="' + d + 'Z"' + (k % 5 === 0 ? ' class="index"' : '') + '/>');
    }
  }
  hill(260, 470, 24, 18, 1.25);
  hill(780, 430, 20, 18, 1.1);
  hill(560, 60, 9, 16, 1.4);
  hill(980, 60, 8, 15, 1);
  svg.innerHTML = paths.join('');

  // Easter egg: click a trig point to "reach the summit"
  document.querySelectorAll('.trig').forEach(function (trig) {
    var clicks = 0, hideTimer;
    trig.addEventListener('click', function () {
      var holder = trig.closest('div');
      var flag = holder.querySelector('.summit-flag');
      if (!flag) {
        flag = document.createElement('span');
        flag.className = 'summit-flag';
        flag.setAttribute('role', 'status');
        holder.appendChild(flag);
      }
      clicks++;
      flag.textContent = clicks % 2
        ? '🚩 Summit reached! ' + trig.dataset.height + ' 🎉'
        : '🥾 Don’t forget the descent.';
      // Restart the pop-up animation
      flag.style.animation = 'none';
      void flag.offsetWidth;
      flag.style.animation = '';
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { flag.remove(); }, 3500);
    });
  });

  /* ---------- Planet Dodger: Konami code fly-by ---------- */

  var konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var progress = 0, flying = false;

  document.addEventListener('keydown', function (e) {
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    progress = key === konami[progress] ? progress + 1 : (key === konami[0] ? 1 : 0);
    if (progress === konami.length) {
      progress = 0;
      if (!flying) flyBy();
    }
  });

  function sprite(src, w) {
    var img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.className = 'egg-sprite';
    img.style.width = w + 'px';
    return img;
  }

  function flyBy() {
    flying = true;
    var layer = document.createElement('div');
    layer.className = 'egg-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);

    var W = window.innerWidth, H = window.innerHeight;
    var baseY = H * 0.55, swing = Math.min(H * 0.18, 120);
    var duration = 3600;

    // The ship weaves along a sine wave; planets sit on the far side of each swerve
    var path = function (p) { return baseY + Math.sin(p * Math.PI * 3) * swing; };
    var planets = [1 / 6, 3 / 6].map(function (p) {
      var size = 110 + Math.random() * 40;
      var el = sprite('images/egg-planet.jpg', size);
      el.style.left = (p * (W + 200) - 100 - size / 2) + 'px';
      el.style.top = (path(p) - Math.sign(Math.sin(p * Math.PI * 3)) * (swing + size * 0.35) - size / 2) + 'px';
      layer.appendChild(el);
      return el;
    });
    // The last planet is right on the ship's path
    var crashAt = 0.74;
    var last = sprite('images/egg-planet.jpg', 130);
    last.style.left = (crashAt * (W + 200) - 100 + 40) + 'px';
    last.style.top = (path(crashAt) - 65) + 'px';
    layer.appendChild(last);

    var ship = sprite('images/egg-ship.jpg', 90);
    layer.appendChild(ship);

    requestAnimationFrame(function () { layer.classList.add('is-on'); });

    if (reduceMotion) return finish();

    var start = performance.now();
    (function step(now) {
      var p = (now - start) / duration;
      if (p >= crashAt) return finish();
      var x = p * (W + 200) - 100, y = path(p);
      // Lean into the turns
      var lean = Math.cos(p * Math.PI * 3) * 25;
      ship.style.transform = 'translate(' + (x - 45) + 'px,' + (y - 31) + 'px) rotate(' + (90 + lean) + 'deg)';
      requestAnimationFrame(step);
    })(start);

    function finish() {
      ship.remove();
      var boom = sprite('images/egg-boom.jpg', 140);
      boom.classList.add('egg-boom');
      boom.style.left = (crashAt * (W + 200) - 100 - 30) + 'px';
      boom.style.top = (path(crashAt) - 80) + 'px';
      layer.appendChild(boom);

      var text = document.createElement('div');
      text.className = 'egg-text';
      text.textContent = 'Don’t get toasted';
      layer.appendChild(text);

      setTimeout(function () { layer.classList.remove('is-on'); }, 2200);
      setTimeout(function () { layer.remove(); flying = false; }, 2700);
    }
  }
})();
