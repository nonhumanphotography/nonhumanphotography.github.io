(function(){
  if (window.__scriptorReadAloud) return; window.__scriptorReadAloud = true;
  if (!('speechSynthesis' in window)) return;
  var synth = window.speechSynthesis;
  var lang = document.documentElement.lang || 'es';
  var SELECTOR = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,td,figcaption';

  function collect(){
    var nodes = Array.prototype.slice.call(document.body.querySelectorAll(SELECTOR));
    return nodes.filter(function(n){
      if (n.closest('.scriptor-ra-bar')) return false;
      if (n.closest('.scorm-nav')) return false;
      if (!n.textContent || !n.textContent.trim()) return false;
      // Skip parents that already contain another readable descendant of the same type.
      if (n.querySelector(SELECTOR)) return false;
      return true;
    });
  }

  var queue = [];
  var current = -1;
  var state = 'idle'; // idle | playing | paused
  var voices = [];
  var voice = null;

  function loadVoices(){
    voices = synth.getVoices();
    var sel = document.getElementById('scriptor-ra-voice');
    if (!sel) return;
    var prev = sel.value;
    sel.innerHTML = '';
    var preferred = voices.filter(function(v){ return v.lang && v.lang.toLowerCase().indexOf(lang.slice(0,2).toLowerCase()) === 0; });
    var rest = voices.filter(function(v){ return preferred.indexOf(v) < 0; });
    (preferred.length ? preferred : voices).forEach(function(v){
      var o = document.createElement('option'); o.value = v.name; o.textContent = v.name + ' (' + v.lang + ')'; sel.appendChild(o);
    });
    if (preferred.length && rest.length){
      var sep = document.createElement('option'); sep.disabled = true; sep.textContent = '──────────'; sel.appendChild(sep);
      rest.forEach(function(v){ var o = document.createElement('option'); o.value = v.name; o.textContent = v.name + ' (' + v.lang + ')'; sel.appendChild(o); });
    }
    if (prev) sel.value = prev;
    voice = voices.find(function(v){ return v.name === sel.value; }) || preferred[0] || voices[0] || null;
  }

  function highlight(el){
    document.querySelectorAll('.scriptor-ra-highlight').forEach(function(n){ n.classList.remove('scriptor-ra-highlight'); });
    if (el){ el.classList.add('scriptor-ra-highlight'); try{ el.scrollIntoView({behavior:'smooth', block:'center'}); }catch(e){} }
  }

  function speak(el, onEnd){
    var u = new SpeechSynthesisUtterance(el.textContent.replace(/\s+/g,' ').trim());
    u.lang = (voice && voice.lang) || lang;
    if (voice) u.voice = voice;
    u.rate = 1; u.pitch = 1;
    u.onend = onEnd; u.onerror = onEnd;
    synth.speak(u);
  }

  function playAll(){
    stop();
    queue = collect();
    if (!queue.length) return;
    current = 0; state = 'playing'; render();
    step();
  }

  function step(){
    if (current >= queue.length){ stop(); return; }
    var el = queue[current];
    highlight(el);
    speak(el, function(){
      if (state !== 'playing') return;
      current++;
      step();
    });
  }

  function pauseOrResume(){
    if (state === 'playing'){ synth.pause(); state = 'paused'; }
    else if (state === 'paused'){ synth.resume(); state = 'playing'; }
    render();
  }

  function stop(){
    synth.cancel();
    queue = []; current = -1; state = 'idle';
    highlight(null); render();
  }

  function playOne(el){
    stop();
    queue = [el]; current = 0; state = 'playing'; render();
    step();
  }

  function render(){
    var bar = document.getElementById('scriptor-ra-bar'); if (!bar) return;
    var play = bar.querySelector('[data-a="play"]');
    var pause = bar.querySelector('[data-a="pause"]');
    var stopB = bar.querySelector('[data-a="stop"]');
    play.textContent = state === 'idle' ? '▶ Leer página' : '▶ Reiniciar';
    pause.textContent = state === 'paused' ? '▶ Reanudar' : '⏸ Pausar';
    pause.disabled = state === 'idle';
    stopB.disabled = state === 'idle';
  }

  function build(){
    var bar = document.createElement('div');
    bar.id = 'scriptor-ra-bar'; bar.className = 'scriptor-ra-bar';
    bar.setAttribute('role','toolbar'); bar.setAttribute('aria-label','Lectura en voz alta');
    bar.innerHTML = '<button class="primary" data-a="play" title="Leer toda la página">▶ Leer página</button>'
      + '<button data-a="pause" title="Pausar o reanudar" disabled>⏸ Pausar</button>'
      + '<button data-a="stop" title="Detener" disabled>■ Detener</button>'
      + '<select id="scriptor-ra-voice" title="Voz" aria-label="Voz"></select>';
    document.body.appendChild(bar);
    bar.querySelector('[data-a="play"]').addEventListener('click', playAll);
    bar.querySelector('[data-a="pause"]').addEventListener('click', pauseOrResume);
    bar.querySelector('[data-a="stop"]').addEventListener('click', stop);
    bar.querySelector('#scriptor-ra-voice').addEventListener('change', function(e){
      voice = voices.find(function(v){ return v.name === e.target.value; }) || voice;
    });

    // Per-paragraph: click to read that block. Uses a delegated handler so
    // it also covers content added by the imported page script.
    document.body.addEventListener('click', function(e){
      if (!(e.altKey || e.target.closest('[data-scriptor-ra-block]'))) return;
      var el = e.target.closest(SELECTOR);
      if (!el || el.closest('.scriptor-ra-bar')) return;
      e.preventDefault();
      playOne(el);
    });

    // Mark readable blocks so hovering feels alive when using alt+click.
    collect().forEach(function(n){ n.classList.add('scriptor-ra-readable'); n.title = n.title || 'Alt+clic: leer este párrafo'; });

    loadVoices();
    if (typeof synth.onvoiceschanged !== 'undefined') synth.onvoiceschanged = loadVoices;
  }

  window.addEventListener('beforeunload', stop);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();