(function(){
  if (window.__scriptorInteractives) return; window.__scriptorInteractives = true;

  function decode(b64){
    try {
      var json = decodeURIComponent(escape(window.atob(b64)));
      return JSON.parse(json);
    } catch(e) { return null; }
  }

  function el(tag, cls, html){ var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  function mountFlashcards(host, data){
    var wrap = el('div', 'si-flash');
    (data.cards || []).forEach(function(c){
      var card = el('div', 'si-flash-card');
      card.setAttribute('role', 'button'); card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', 'Tarjeta: pulsa para voltear');
      var inner = el('div', 'si-flash-inner');
      inner.appendChild(el('div', 'si-flash-face si-flash-front', c.front || ''));
      inner.appendChild(el('div', 'si-flash-face si-flash-back', c.back || ''));
      card.appendChild(inner);
      function toggle(){ card.classList.toggle('flipped'); }
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle(); } });
      wrap.appendChild(card);
    });
    host.appendChild(wrap);
  }

  function mountAccordion(host, data){
    var sections = data.sections || [];
    if (data.mode === 'tabs'){
      var nav = el('div', 'si-tabs-nav');
      var panels = [];
      sections.forEach(function(s, i){
        var b = el('button', i === 0 ? 'active' : '', s.title || ('Sección ' + (i+1)));
        b.type = 'button';
        var p = el('div', 'si-tabs-panel' + (i === 0 ? ' active' : ''), s.body || '');
        b.addEventListener('click', function(){
          nav.querySelectorAll('button').forEach(function(x){ x.classList.remove('active'); });
          panels.forEach(function(x){ x.classList.remove('active'); });
          b.classList.add('active'); p.classList.add('active');
        });
        nav.appendChild(b); panels.push(p);
      });
      host.appendChild(nav);
      panels.forEach(function(p){ host.appendChild(p); });
    } else {
      var acc = el('div', 'si-acc');
      sections.forEach(function(s, i){
        var item = el('div', 'si-acc-item' + (i === 0 ? ' open' : ''));
        var head = el('button', 'si-acc-head', s.title || ('Sección ' + (i+1)));
        head.type = 'button';
        var body = el('div', 'si-acc-body', s.body || '');
        head.addEventListener('click', function(){ item.classList.toggle('open'); });
        item.appendChild(head); item.appendChild(body);
        acc.appendChild(item);
      });
      host.appendChild(acc);
    }
  }

  function mountHotspots(host, data){
    var wrap = el('div', 'si-hot');
    var img = document.createElement('img');
    img.src = data.image || '';
    img.alt = data.alt || '';
    wrap.appendChild(img);
    var tip = el('div', 'si-hot-tip');
    (data.hotspots || []).forEach(function(h, i){
      var pin = el('button', 'si-hot-pin', (h.label || String(i+1)));
      pin.type = 'button';
      pin.style.left = (h.x || 0) + '%';
      pin.style.top = (h.y || 0) + '%';
      pin.setAttribute('aria-label', 'Punto ' + (h.label || (i+1)));
      pin.addEventListener('click', function(){
        wrap.querySelectorAll('.si-hot-pin').forEach(function(x){ x.classList.remove('active'); });
        pin.classList.add('active');
        tip.innerHTML = h.body || '';
        tip.classList.add('visible');
      });
      wrap.appendChild(pin);
    });
    host.appendChild(wrap);
    host.appendChild(tip);
  }

  function shuffle(arr){ var a = arr.slice(); for (var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

  function mountDragFill(host, data){
    var wrap = el('div', 'si-df');
    var textNode = el('div', 'si-df-text');
    var raw = String(data.text || '');
    var slots = [];
    // Parse [[answer]] tokens
    var parts = raw.split(/(\[\[[^\]]+\]\])/g);
    parts.forEach(function(p){
      var m = /^\[\[([^\]]+)\]\]$/.exec(p);
      if (m){
        var slot = el('span', 'si-df-slot');
        slot.setAttribute('data-answer', m[1]);
        slot.setAttribute('data-current', '');
        slots.push(slot);
        textNode.appendChild(slot);
      } else if (p){
        textNode.appendChild(document.createTextNode(p));
      }
    });
    wrap.appendChild(textNode);

    var bank = el('div', 'si-df-bank');
    var answers = slots.map(function(s){ return s.getAttribute('data-answer'); });
    var words = shuffle(answers.concat(data.distractors || []));
    var wordEls = [];
    words.forEach(function(w, i){
      var wEl = el('span', 'si-df-word', w);
      wEl.setAttribute('draggable', 'true');
      wEl.setAttribute('data-word', w);
      wEl.setAttribute('data-wid', 'w'+i);
      wEl.addEventListener('dragstart', function(ev){ ev.dataTransfer.setData('text/plain', wEl.getAttribute('data-wid')); ev.dataTransfer.effectAllowed = 'move'; });
      // touch fallback: click to fill first empty slot
      wEl.addEventListener('click', function(){
        if (wEl.classList.contains('used')) return;
        for (var i2=0;i2<slots.length;i2++){ if (!slots[i2].getAttribute('data-current')){ fillSlot(slots[i2], wEl); return; } }
      });
      bank.appendChild(wEl);
      wordEls.push(wEl);
    });

    function findWordEl(wid){ for (var i=0;i<wordEls.length;i++) if (wordEls[i].getAttribute('data-wid')===wid) return wordEls[i]; return null; }
    function clearSlot(slot){
      var wid = slot.getAttribute('data-wid');
      if (wid){ var w = findWordEl(wid); if (w) w.classList.remove('used'); }
      slot.textContent = '';
      slot.setAttribute('data-current','');
      slot.setAttribute('data-wid','');
      slot.classList.remove('filled','ok','ko');
    }
    function fillSlot(slot, wEl){
      clearSlot(slot);
      slot.textContent = wEl.getAttribute('data-word');
      slot.setAttribute('data-current', wEl.getAttribute('data-word'));
      slot.setAttribute('data-wid', wEl.getAttribute('data-wid'));
      slot.classList.add('filled');
      wEl.classList.add('used');
    }

    slots.forEach(function(slot){
      slot.addEventListener('dragover', function(ev){ ev.preventDefault(); slot.classList.add('over'); });
      slot.addEventListener('dragleave', function(){ slot.classList.remove('over'); });
      slot.addEventListener('drop', function(ev){
        ev.preventDefault(); slot.classList.remove('over');
        var wid = ev.dataTransfer.getData('text/plain');
        var wEl = findWordEl(wid); if (!wEl) return;
        fillSlot(slot, wEl);
      });
      slot.addEventListener('click', function(){ if (slot.getAttribute('data-current')) clearSlot(slot); });
    });

    wrap.appendChild(bank);

    var actions = el('div', 'si-df-actions');
    var check = el('button', 'si-df-btn', 'Check'); check.type='button';
    var reset = el('button', 'si-df-btn secondary', 'Reset'); reset.type='button';
    var msg = el('span', 'si-df-msg');
    check.addEventListener('click', function(){
      var okAll = true;
      slots.forEach(function(s){
        var cur = (s.getAttribute('data-current')||'').trim();
        var ans = (s.getAttribute('data-answer')||'').trim();
        s.classList.remove('ok','ko');
        if (cur && cur.toLowerCase() === ans.toLowerCase()) s.classList.add('ok');
        else { s.classList.add('ko'); okAll = false; }
      });
      msg.textContent = okAll ? 'Correct.' : 'Review the marked words.';
      msg.className = 'si-df-msg ' + (okAll ? 'ok' : 'ko');
    });
    reset.addEventListener('click', function(){
      slots.forEach(clearSlot);
      msg.textContent=''; msg.className='si-df-msg';
    });
    actions.appendChild(check); actions.appendChild(reset); actions.appendChild(msg);
    wrap.appendChild(actions);
    host.appendChild(wrap);
  }

  function openLightbox(src, caption){
    var prev = document.querySelector('.si-lb'); if (prev) prev.parentNode.removeChild(prev);
    var lb = el('div','si-lb');
    lb.setAttribute('role','dialog'); lb.setAttribute('aria-modal','true');
    var close = el('button','si-lb-close','×'); close.type='button'; close.setAttribute('aria-label','Cerrar');
    var img = document.createElement('img'); img.src = src || ''; img.alt = caption || '';
    lb.appendChild(close); lb.appendChild(img);
    if (caption) lb.appendChild(el('div','si-lb-caption', caption));
    function destroy(){ if (lb.parentNode) lb.parentNode.removeChild(lb); document.removeEventListener('keydown', onKey); }
    function onKey(e){ if (e.key === 'Escape') destroy(); }
    close.addEventListener('click', destroy);
    lb.addEventListener('click', function(e){ if (e.target === lb) destroy(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(lb);
  }

  function mountImageQuiz(host, data){
    var wrap = el('div', 'si-iq');
    wrap.appendChild(el('div', 'si-iq-q', data.question || ''));
    var grid = el('div', 'si-iq-grid');
    var multiple = !!data.multiple;
    var opts = (data.options || []).map(function(o, i){
      var card = el('div', 'si-iq-opt');
      card.setAttribute('data-i', String(i));
      card.setAttribute('role','button'); card.setAttribute('tabindex','0');
      var imgWrap = el('div','si-iq-opt-imgwrap');
      var img = document.createElement('img');
      img.src = o.image || ''; img.alt = o.label || '';
      imgWrap.appendChild(img);
      var zoom = el('button','si-iq-zoom',''); zoom.type='button';
      zoom.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
      zoom.setAttribute('aria-label','Ampliar imagen');
      zoom.addEventListener('click', function(ev){ ev.stopPropagation(); openLightbox(o.image || '', o.label || ''); });
      imgWrap.appendChild(zoom);
      card.appendChild(imgWrap);
      card.appendChild(el('div','si-iq-opt-label', o.label || ''));
      card.addEventListener('click', function(){
        if (!multiple){
          grid.querySelectorAll('.si-iq-opt').forEach(function(x){ x.classList.remove('selected'); });
        }
        card.classList.toggle('selected');
      });
      grid.appendChild(card);
      return { card: card, correct: !!o.correct };
    });
    wrap.appendChild(grid);
    var actions = el('div','si-iq-actions');
    var check = el('button','si-df-btn','Check'); check.type='button';
    var reset = el('button','si-df-btn secondary','Reset'); reset.type='button';
    var msg = el('span','si-df-msg');
    check.addEventListener('click', function(){
      var okAll = true, anySel = false;
      opts.forEach(function(o){
        o.card.classList.remove('ok','ko');
        var sel = o.card.classList.contains('selected');
        if (sel) anySel = true;
        if (sel && o.correct) o.card.classList.add('ok');
        else if (sel && !o.correct){ o.card.classList.add('ko'); okAll = false; }
        else if (!sel && o.correct) okAll = false;
      });
      if (!anySel){ msg.textContent = 'Select at least one option.'; msg.className='si-df-msg ko'; return; }
      msg.textContent = okAll ? (data.feedbackOk || 'Correct.') : (data.feedbackKo || 'Try again.');
      msg.className = 'si-df-msg ' + (okAll ? 'ok' : 'ko');
    });
    reset.addEventListener('click', function(){
      opts.forEach(function(o){ o.card.classList.remove('selected','ok','ko'); });
      msg.textContent=''; msg.className='si-df-msg';
    });
    actions.appendChild(check); actions.appendChild(reset); actions.appendChild(msg);
    wrap.appendChild(actions);
    host.appendChild(wrap);
  }

  function mount(node){
    if (node.getAttribute('data-mounted') === '1') return;
    node.setAttribute('data-mounted', '1');
    var type = node.getAttribute('data-type');
    var data = decode(node.getAttribute('data-payload') || '');
    if (!type || !data) return;
    // Clear fallback content
    node.innerHTML = '';
    if (type === 'flashcards') mountFlashcards(node, data);
    else if (type === 'accordion') mountAccordion(node, data);
    else if (type === 'hotspots') mountHotspots(node, data);
    else if (type === 'dragfill') mountDragFill(node, data);
    else if (type === 'imagequiz') mountImageQuiz(node, data);
  }

  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function renderChoiceOpts(item, nameAttr){
    return (item.options || []).map(function(o){
      return '<label class="sq-opt"><input type="radio" name="'+esc(nameAttr)+'" value="'+esc(o.value)+'"><span>'+esc(o.value)+'. '+esc(o.label)+'</span></label>';
    }).join('');
  }

  function mountAssessment(host, data){
    var panel = el('div','sq-panel');
    var items = data.items || [];
    items.forEach(function(item, i){
      var q = el('div','sq-q');
      var num = (i+1) + '. ';
      if (item.kind === 'short'){
        q.classList.add('sq-short');
        q.innerHTML = '<p class="sq-prompt">'+num+esc(item.prompt||'')+'</p>'+
          '<textarea data-save="'+esc(item.id||('short_'+(i+1)))+'" rows="4"></textarea>'+
          (item.guide ? '<div class="sq-guide"><strong>Guidance:</strong> '+esc(item.guide)+'</div>' : '');
      } else {
        var name = item.id || ('q'+(i+1));
        q.setAttribute('data-q', name);
        q.setAttribute('data-answer', item.answer || '');
        q.innerHTML = '<p class="sq-prompt">'+num+esc(item.prompt||'')+'</p>'+
          '<div class="sq-opts">'+renderChoiceOpts(item, name)+'</div>';
      }
      panel.appendChild(q);
    });
    var actions = el('div','sq-actions');
    var submit = el('button','sq-btn','Submit'); submit.type='button';
    var reset = el('button','sq-btn secondary','Reset'); reset.type='button';
    actions.appendChild(submit); actions.appendChild(reset);
    panel.appendChild(actions);
    var fb = el('div','sq-feedback');
    panel.appendChild(fb);

    submit.addEventListener('click', function(){
      var total = 0, correct = 0;
      panel.querySelectorAll('.sq-q[data-q]').forEach(function(q){
        total++;
        var expected = (q.getAttribute('data-answer') || '').trim();
        var picked = q.querySelector('input[type=radio]:checked');
        var pickedVal = picked ? picked.value : '';
        q.querySelectorAll('.sq-opt').forEach(function(o){ o.classList.remove('ok','ko'); });
        if (pickedVal && pickedVal === expected){
          correct++;
          if (picked) picked.closest('.sq-opt').classList.add('ok');
        } else if (pickedVal){
          picked.closest('.sq-opt').classList.add('ko');
          // Highlight correct answer
          q.querySelectorAll('.sq-opt input').forEach(function(inp){
            if (inp.value === expected) inp.closest('.sq-opt').classList.add('ok');
          });
        } else {
          q.querySelectorAll('.sq-opt input').forEach(function(inp){
            if (inp.value === expected) inp.closest('.sq-opt').classList.add('ok');
          });
        }
      });
      var pct = total ? Math.round((correct/total)*100) : 0;
      var ok = pct >= 70;
      fb.className = 'sq-feedback visible ' + (ok ? 'ok' : 'ko');
      fb.textContent = 'Score: ' + correct + ' / ' + total + ' (' + pct + '%) — ' + (ok ? 'Passed.' : 'You need at least 70%.');
      if (window.recordAssessmentScore) window.recordAssessmentScore(pct, ok);
    });

    reset.addEventListener('click', function(){
      panel.querySelectorAll('input[type=radio]').forEach(function(i){ i.checked = false; });
      panel.querySelectorAll('textarea').forEach(function(t){ t.value=''; });
      panel.querySelectorAll('.sq-opt').forEach(function(o){ o.classList.remove('ok','ko'); });
      fb.className = 'sq-feedback'; fb.textContent = '';
    });

    host.appendChild(panel);
  }

  function mountKnowledgeCheck(host, data){
    var item = (data.items && data.items[0]) || null;
    if (!item || item.kind !== 'choice') return;
    var panel = el('div','sq-panel');
    if (data.title) panel.appendChild(el('h3','',esc(data.title)));
    var q = el('div','sq-q');
    var name = item.id || data.anchor || 'kc';
    q.setAttribute('data-q', name);
    q.setAttribute('data-answer', item.answer || '');
    q.innerHTML = '<p class="sq-prompt">'+esc(item.prompt||'')+'</p>'+
      '<div class="sq-opts">'+renderChoiceOpts(item, name)+'</div>';
    panel.appendChild(q);
    var actions = el('div','sq-actions');
    var check = el('button','sq-btn','Check answer'); check.type='button';
    actions.appendChild(check);
    panel.appendChild(actions);
    var fb = el('div','sq-feedback');
    panel.appendChild(fb);
    check.addEventListener('click', function(){
      var picked = q.querySelector('input[type=radio]:checked');
      var expected = (item.answer || '').trim();
      q.querySelectorAll('.sq-opt').forEach(function(o){ o.classList.remove('ok','ko'); });
      if (!picked){
        fb.className = 'sq-feedback visible ko'; fb.textContent = 'Select one option.'; return;
      }
      var ok = picked.value === expected;
      picked.closest('.sq-opt').classList.add(ok ? 'ok' : 'ko');
      if (!ok){
        q.querySelectorAll('.sq-opt input').forEach(function(inp){
          if (inp.value === expected) inp.closest('.sq-opt').classList.add('ok');
        });
      }
      fb.className = 'sq-feedback visible ' + (ok ? 'ok' : 'ko');
      fb.textContent = ok ? (data.feedback || 'Correct.') : (data.feedback || 'Incorrect. Review the option highlighted in green.');
    });
    host.appendChild(panel);
  }

  function mountQuiz(node){
    if (node.getAttribute('data-mounted') === '1') return;
    node.setAttribute('data-mounted','1');
    var type = node.getAttribute('data-type');
    var data = decode(node.getAttribute('data-payload') || '');
    if (!type || !data) return;
    node.innerHTML = '';
    if (type === 'assessment') mountAssessment(node, data);
    else if (type === 'kc' || type === 'knowledge-check') mountKnowledgeCheck(node, data);
  }

  function mountAll(){
    document.querySelectorAll('div.scriptor-interactive').forEach(mount);
    document.querySelectorAll('div.scriptor-quiz').forEach(mountQuiz);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
})();