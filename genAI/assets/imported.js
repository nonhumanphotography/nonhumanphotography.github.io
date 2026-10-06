/* assets/js/scorm_api.js */
(function(){
  function findAPI(win){
    var attempts = 0;
    while(win && !win.API && win.parent && win.parent !== win && attempts < 7){ attempts++; win = win.parent; }
    if(win && win.API) return win.API;
    if(window.opener) return findAPI(window.opener);
    return null;
  }
  window.SCORM12 = {
    api:null, initialized:false,
    init:function(){
      this.api = findAPI(window);
      if(this.api){
        var ok = this.api.LMSInitialize('');
        this.initialized = (ok === 'true' || ok === true);
      }
      return this.initialized;
    },
    get:function(k){ if(this.initialized && this.api) return this.api.LMSGetValue(k); return ''; },
    set:function(k,v){ if(this.initialized && this.api) return this.api.LMSSetValue(k,String(v)); return false; },
    commit:function(){ if(this.initialized && this.api) return this.api.LMSCommit(''); return false; },
    finish:function(){ if(this.initialized && this.api) { this.commit(); return this.api.LMSFinish(''); } return false; }
  };
  window.SCORM = window.SCORM12; // compatibility for interactive widgets
})();

window.MODULE_META = { totalScreens: 0, passMark: 70 };

let state = {
  current:'welcome',
  visited:{},
  activities:{},
  answers:{},
  text:{},
  score:null,
  assessmentSubmitted:false
};
let screenIds = [];
let saveTimer = null;

function getStoredState(){
  const suspend = SCORM12.get('cmi.suspend_data');
  const local = localStorage.getItem('lesson10_scorm_state');
  let parsed = null;
  try { if(suspend) parsed = JSON.parse(suspend); } catch(e) { parsed = null; }
  if(!parsed){ try { if(local) parsed = JSON.parse(local); } catch(e) { parsed = null; } }
  return parsed || {};
}

function readSaveValue(el){
  if(el.type === 'checkbox') return !!el.checked;
  if(el.type === 'radio') return !!el.checked;
  if(el.isContentEditable) return el.textContent || '';
  return el.value || '';
}

function writeSaveValue(el, val){
  if(val === undefined || val === null) return;
  if(el.type === 'checkbox') { el.checked = !!val; return; }
  if(el.type === 'radio') { el.checked = !!val; return; }
  if(el.isContentEditable) { el.textContent = String(val); return; }
  el.value = String(val);
}

function loadState(){
  SCORM12.init();
  const saved = getStoredState();
  state = Object.assign(state, saved);
  const loc = SCORM12.get('cmi.core.lesson_location');
  if(loc) state.current = loc;
}

function compactStateForScorm(){
  // SCORM 1.2 suspend_data is small in many LMSs, so keep learner text mainly in localStorage.
  return {
    current: state.current,
    visited: state.visited || {},
    activities: state.activities || {},
    answers: state.answers || {},
    score: state.score,
    assessmentSubmitted: !!state.assessmentSubmitted
  };
}

function captureInputs(){
  document.querySelectorAll('[data-save]').forEach(function(el){
    state.text[el.dataset.save] = readSaveValue(el);
  });
}

function saveState(commit=false){
  captureInputs();
  localStorage.setItem('lesson10_scorm_state', JSON.stringify(state));
  SCORM12.set('cmi.core.lesson_location', state.current || 'welcome');
  try { SCORM12.set('cmi.suspend_data', JSON.stringify(compactStateForScorm())); } catch(e) {}
  updateProgress(false);
  if(commit) SCORM12.commit();
}

function debouncedSave(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function(){ saveState(false); }, 250);
}

function restoreInputs(){
  document.querySelectorAll('[data-save]').forEach(function(el){
    if(state.text && Object.prototype.hasOwnProperty.call(state.text, el.dataset.save)) {
      writeSaveValue(el, state.text[el.dataset.save]);
    }
    el.addEventListener('input', debouncedSave);
    el.addEventListener('change', function(){ saveState(false); });
  });
  Object.entries(state.answers || {}).forEach(function(entry){
    var name = entry[0], value = entry[1];
    var input = document.querySelector('input[name="'+CSS.escape(name)+'"][value="'+CSS.escape(value)+'"]');
    if(input) input.checked = true;
  });
}

function updateNavButtons(){
  const i = screenIds.indexOf(state.current);
  const back = document.getElementById('backBtn');
  const next = document.getElementById('nextBtn');
  if(back) back.disabled = i <= 0;
  if(next) next.disabled = i < 0 || i >= screenIds.length - 1;
}

function updateProgress(writeStatus=true){
  const total = screenIds.length || document.querySelectorAll('.screen').length || 1;
  const visitedCount = Object.keys(state.visited || {}).filter(function(id){ return screenIds.includes(id); }).length;
  const pct = Math.min(100, Math.round((visitedCount / total) * 100));
  const text = document.getElementById('progressText');
  const bar = document.getElementById('progressBar');
  if(text) text.textContent = pct + '%';
  if(bar) bar.style.width = pct + '%';
  document.querySelectorAll('.menu-btn').forEach(function(b){
    b.classList.toggle('completed', !!(state.visited || {})[b.dataset.screen]);
  });
  if(writeStatus){
    if(pct >= 100){
      if(state.assessmentSubmitted && state.score !== null){
        SCORM12.set('cmi.core.score.min', '0');
        SCORM12.set('cmi.core.score.max', '100');
        SCORM12.set('cmi.core.score.raw', String(state.score));
        SCORM12.set('cmi.core.lesson_status', state.score >= window.MODULE_META.passMark ? 'passed' : 'failed');
      } else {
        SCORM12.set('cmi.core.lesson_status', 'completed');
      }
    } else {
      SCORM12.set('cmi.core.lesson_status', 'incomplete');
    }
  }
  return pct;
}

function goToScreen(id){
  if(!screenIds.includes(id)) id = screenIds[0] || 'welcome';
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  const screen = document.getElementById(id);
  if(!screen) return;
  screen.classList.add('active');
  screen.setAttribute('tabindex','-1');
  try { screen.focus({preventScroll:true}); } catch(e) {}
  state.current = id;
  state.visited = state.visited || {};
  state.visited[id] = true;
  document.querySelectorAll('.menu-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset.screen === id);
  });
  updateNavButtons();
  saveState(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextScreen(){
  const i = screenIds.indexOf(state.current);
  if(i < screenIds.length - 1) goToScreen(screenIds[i + 1]);
}

function previousScreen(){
  const i = screenIds.indexOf(state.current);
  if(i > 0) goToScreen(screenIds[i - 1]);
}

function prevScreen(){ previousScreen(); }

function toggleMenu(){
  const panel = document.getElementById('menuPanel');
  if(!panel) return;
  const collapsed = panel.classList.toggle('collapsed');
  const toggle = document.querySelector('.menu-toggle');
  if(toggle) toggle.setAttribute('aria-expanded', String(!collapsed));
}

function recordAssessmentScore(score, passed){
  state.score = Number(score) || 0;
  state.assessmentSubmitted = true;
  SCORM12.set('cmi.core.score.min', '0');
  SCORM12.set('cmi.core.score.max', '100');
  SCORM12.set('cmi.core.score.raw', String(state.score));
  const pct = updateProgress(false);
  if(pct >= 100){
    SCORM12.set('cmi.core.lesson_status', passed ? 'passed' : 'failed');
  } else {
    SCORM12.set('cmi.core.lesson_status', 'incomplete');
  }
  saveState(true);
}
window.recordAssessmentScore = recordAssessmentScore;

function markActivityComplete(name){
  state.activities[name] = true;
  saveState(true);
}

window.addEventListener('load', function(){
  screenIds = Array.from(document.querySelectorAll('.screen')).map(function(s){ return s.id; });
  window.MODULE_META.totalScreens = screenIds.length;
  loadState();
  restoreInputs();
  if(!SCORM12.get('cmi.core.lesson_status')) SCORM12.set('cmi.core.lesson_status', 'incomplete');
  goToScreen(state.current || screenIds[0] || 'welcome');
});

window.addEventListener('beforeunload', function(){ saveState(true); SCORM12.finish(); });
