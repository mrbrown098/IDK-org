// docs/app.js - client script for IDK.org
// Loads configuration from config.js (window.IDK_CONFIG.API_URL)
// Implements login/register, quiz flow, the Learnprint result screen (radar chart + share image),
// tutor chat and a simple menu.
// All DOM manipulation uses textContent / createElement / createElementNS / replaceChildren only.
// No innerHTML is used.

const $ = id => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';

// Helper to show a temporary banner after the server has been pending >3s
let warmupTimer = null;
function maybeShowWarmup() {
  clearTimeout(warmupTimer);
  warmupTimer = setTimeout(() => showMessage('Waking up the server, this can take up to a minute on the free plan…'), 3000);
}
function clearWarmup() {
  clearTimeout(warmupTimer);
  warmupTimer = null;
}

let hideTimer = null;
function showMessage(text) {
  clearWarmup();
  const el = $('message');
  el.textContent = text;
  el.style.display = 'block';
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { el.style.display = 'none'; }, 4000);
}

let toastTimer = null;
function showToast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
}

function getToken() { try { return localStorage.getItem('jwt'); } catch (_) { return null; } }
function setToken(tok) { try { localStorage.setItem('jwt', tok); } catch (_) {} }
function clearToken() { try { localStorage.removeItem('jwt'); } catch (_) {} }

function authHeaders() { const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}; }

function handleAuthError(resp) { if (resp.status === 401) logout(); }

function logout() { clearToken(); showScreen('login'); }

function showScreen(id) {
  ['login', 'quiz', 'result', 'tutor', 'menu'].forEach(s => {
    $(s).style.display = 'none';
  });
  const el = $(id);
  el.style.display = 'block';
  el.classList.remove('screen-in');
  void el.offsetWidth; // restart the entrance animation
  el.classList.add('screen-in');
  $('message').style.display = 'none';
  window.scrollTo(0, 0);
}

// Header with a Menu button at the top of the quiz, result and tutor screens
function addHeader() {
  document.querySelectorAll('#quiz, #result, #tutor').forEach(card => {
    const header = document.createElement('div');
    header.className = 'topbar';
    const menuBtn = document.createElement('button');
    menuBtn.className = 'ghost';
    menuBtn.textContent = 'Menu';
    menuBtn.addEventListener('click', () => showScreen('menu'));
    header.appendChild(menuBtn);
    card.insertBefore(header, card.firstChild);
  });
}

function login() {
  const email = $('email').value.trim();
  const password = $('password').value;
  maybeShowWarmup();
  fetchWithTimeout(`${window.IDK_CONFIG.API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
    .then(r => { clearWarmup(); if (!r.ok) return r.json().then(j => { throw new Error(j.message || 'Login failed'); }); return r.json(); })
    .then(data => { setToken(data.token); initApp(); })
    .catch(err => showMessage(err.message));
}

function register() {
  const name = $('name').value.trim();
  const email = $('email').value.trim();
  const password = $('password').value;
  const confirmPassword = $('confirm').value;
  if (password !== confirmPassword) { showMessage('Passwords do not match'); return; }
  maybeShowWarmup();
  fetchWithTimeout(`${window.IDK_CONFIG.API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, confirmPassword })
  })
    .then(r => { clearWarmup(); if (!r.ok) return r.json().then(j => { throw new Error(j.message || 'Register failed'); }); return r.json(); })
    .then(data => { setToken(data.token); initApp(); })
    .catch(err => showMessage(err.message));
}

// Loads the saved result and shows the Learnprint screen. If there is no result yet, starts the quiz.
function showSavedResult() {
  maybeShowWarmup();
  fetchWithTimeout(`${window.IDK_CONFIG.API_URL}/api/quiz/result`, { headers: { ...authHeaders() } })
    .then(r => {
      clearWarmup();
      handleAuthError(r);
      if (r.ok) return r.json().then(data => renderResult(data.result || data.ideotype || data));
      if (r.status === 404) { showScreen('quiz'); loadQuiz(); return; }
      if (r.status !== 401) showMessage('Could not load your result. Please try again.');
    })
    .catch(err => showMessage(err.message));
}

function initApp() { showSavedResult(); }

/* ------------------------------ Quiz ------------------------------ */

let quizData = [];
let answers = [];
let currentIdx = 0;

function loadQuiz() {
  maybeShowWarmup();
  fetchWithTimeout(`${window.IDK_CONFIG.API_URL}/api/quiz/questions`, { headers: { ...authHeaders() } })
    .then(r => { clearWarmup(); handleAuthError(r); if (!r.ok) return r.json().then(j => { throw new Error(j.message || 'Failed to load questions'); }); return r.json(); })
    .then(data => {
      quizData = data.questions;
      currentIdx = 0;
      answers = [];
      renderQuestion();
    })
    .catch(err => showMessage(err.message));
}

function renderQuestion() {
  const q = quizData[currentIdx];
  const container = $('quizQuestion');
  container.replaceChildren();

  const qEl = document.createElement('p');
  qEl.className = 'q-text';
  qEl.textContent = q.question;
  container.appendChild(qEl);

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'answer';
    btn.setAttribute('aria-pressed', 'false');
    const dot = document.createElement('span');
    dot.className = 'dot';
    const label = document.createElement('span');
    label.textContent = opt.text;
    btn.append(dot, label);
    btn.onclick = () => {
      container.querySelectorAll('button.answer').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
      answers[currentIdx] = { questionId: q.id, optionId: opt.id };
      $('nextBtn').disabled = false;
    };
    container.appendChild(btn);
  });

  $('quizBar').max = quizData.length;
  $('quizBar').value = currentIdx + 1;
  $('quizProgress').textContent = `${currentIdx + 1} of ${quizData.length}`;
  const last = currentIdx === quizData.length - 1;
  $('nextBtn').textContent = last ? 'See my Learnprint' : 'Next';
  $('nextBtn').disabled = true;

  container.classList.remove('enter');
  void container.offsetWidth; // restart the slide-in animation
  container.classList.add('enter');
}

function nextStep() {
  if (currentIdx < quizData.length - 1) {
    currentIdx++;
    renderQuestion();
  } else {
    submitQuiz();
  }
}

function submitQuiz() {
  maybeShowWarmup();
  $('nextBtn').disabled = true;
  fetchWithTimeout(`${window.IDK_CONFIG.API_URL}/api/quiz/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ answers })
  })
    .then(r => { clearWarmup(); handleAuthError(r); if (!r.ok) return r.json().then(j => { throw new Error(j.message || 'Submit failed'); }); return r.json(); })
    .then(res => renderResult(res.result || res.ideotype || res))
    .catch(err => { $('nextBtn').disabled = false; showMessage(err.message); });
}

/* ------------------------- Learnprint result ------------------------- */

const AXES = [
  { key: 'visual', label: 'Visual' },
  { key: 'auditory', label: 'Auditory' },
  { key: 'readingWriting', label: 'Read/Write' },
  { key: 'handsOn', label: 'Hands-on' },
  { key: 'social', label: 'Social' }
];
const PREF_NAME = {
  visual: 'seeing',
  auditory: 'listening',
  readingWriting: 'reading and writing',
  handsOn: 'doing'
};
const PREF_TIP = {
  visual: 'Try diagrams, mind maps and videos.',
  auditory: 'Try explaining ideas out loud and listening to lessons.',
  readingWriting: 'Try notes, summaries and written practice.',
  handsOn: 'Try examples, experiments and building things.'
};
const SOCIAL_LINE = {
  group: 'You like learning with other people.',
  solo: 'You focus best on your own.',
  flexible: 'You are comfortable both alone and in a group.'
};

let currentResult = null;

const clampPct = n => Math.max(0, Math.min(100, Math.round(n)));

// Returns { values: [5 numbers or null], legacy: boolean }. Old results (10-question quiz) have no social value.
function getValues(result) {
  const p = result && result.percentages;
  const s = result && result.scores;
  const values = AXES.map(a => {
    if (p && Number.isFinite(p[a.key])) return clampPct(p[a.key]);
    if (a.key !== 'social' && s && Number.isFinite(s[a.key])) return clampPct(s[a.key] * 10);
    return null;
  });
  return { values, legacy: values[4] === null };
}

// Point on the radar for axis i at fraction f (0-1) of radius r, starting at the top.
function polar(i, f, cx, cy, r) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / AXES.length;
  return [cx + Math.cos(angle) * r * f, cy + Math.sin(angle) * r * f];
}
const pointsString = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

function svgEl(name, attrs = {}, parent) {
  const el = document.createElementNS(SVG_NS, name);
  Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
  if (parent) parent.appendChild(el);
  return el;
}

function buildRadar(values) {
  const cx = 170, cy = 172, R = 100;
  const svg = svgEl('svg', { viewBox: '0 0 340 340', role: 'img' });
  const summary = AXES.map((a, i) => `${a.label} ${values[i] === null ? 'not available' : values[i] + ' percent'}`).join(', ');
  svg.setAttribute('aria-label', 'Learnprint radar chart. ' + summary);

  const defs = svgEl('defs', {}, svg);
  const grad = svgEl('linearGradient', { id: 'radarFill', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  svgEl('stop', { offset: '0%', 'stop-color': '#7c5cff', 'stop-opacity': '0.75' }, grad);
  svgEl('stop', { offset: '100%', 'stop-color': '#22d3ee', 'stop-opacity': '0.55' }, grad);

  [0.25, 0.5, 0.75, 1].forEach(f => {
    const ring = AXES.map((_, i) => polar(i, f, cx, cy, R));
    svgEl('polygon', { class: 'radar-ring', points: pointsString(ring) }, svg);
  });
  AXES.forEach((_, i) => {
    const [x, y] = polar(i, 1, cx, cy, R);
    svgEl('line', { class: 'radar-axis', x1: cx, y1: cy, x2: x, y2: y }, svg);
  });

  const shape = svgEl('g', { class: 'radar-shape' }, svg);
  const dataPts = values.map((v, i) => polar(i, (v === null ? 0 : v) / 100, cx, cy, R));
  svgEl('polygon', { points: pointsString(dataPts), fill: 'url(#radarFill)', stroke: '#a998ff', 'stroke-width': '2', 'stroke-linejoin': 'round' }, shape);
  dataPts.forEach((p, i) => {
    if (values[i] !== null) svgEl('circle', { cx: p[0], cy: p[1], r: 4.5, fill: '#ffffff', stroke: '#7c5cff', 'stroke-width': 2 }, shape);
  });

  svgEl('circle', { cx, cy, r: 9, fill: 'rgba(124,92,255,0.25)' }, svg);
  svgEl('circle', { class: 'radar-core', cx, cy, r: 4, fill: '#22d3ee' }, svg);

  AXES.forEach((a, i) => {
    const [x, y] = polar(i, 1, cx, cy, R + (i === 0 ? 30 : 26));
    const name = svgEl('text', { class: 'radar-label', x, y: y - 1 }, svg);
    name.textContent = a.label;
    const val = svgEl('text', { class: 'radar-value', x, y: y + 14 }, svg);
    val.textContent = values[i] === null ? '–' : values[i] + '%';
  });
  return svg;
}

function headlineParts(result) {
  const p = PREF_NAME[result.primary];
  const s = result.secondary && PREF_NAME[result.secondary];
  return { primary: p || 'a mix of ways', secondary: s || null };
}

function renderResult(result) {
  currentResult = result || {};
  const { values, legacy } = getValues(currentResult);
  $('radarChart').replaceChildren(buildRadar(values));

  const box = $('resultText');
  box.replaceChildren();

  const parts = headlineParts(currentResult);
  const head = document.createElement('p');
  head.className = 'headline';
  head.append('You learn best by ');
  const em = document.createElement('em');
  em.textContent = parts.primary + (parts.secondary ? ' and ' + parts.secondary : '');
  head.appendChild(em);
  box.appendChild(head);

  const tip = PREF_TIP[currentResult.primary];
  if (tip) {
    const t = document.createElement('p');
    t.className = 'subline';
    t.textContent = tip;
    box.appendChild(t);
  }
  const socialLine = SOCIAL_LINE[currentResult.socialStyle];
  if (socialLine) {
    const s = document.createElement('p');
    s.className = 'subline';
    s.textContent = socialLine;
    box.appendChild(s);
  }

  const stats = document.createElement('div');
  stats.className = 'stats';
  AXES.forEach((a, i) => {
    const row = document.createElement('div');
    row.className = 'stat';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = a.label;
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('i');
    fill.style.setProperty('--w', (values[i] === null ? 0 : values[i]) + '%');
    bar.appendChild(fill);
    const val = document.createElement('span');
    val.className = 'val';
    val.textContent = values[i] === null ? '–' : values[i] + '%';
    row.append(name, bar, val);
    stats.appendChild(row);
  });
  box.appendChild(stats);

  if (legacy) {
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = 'Retake the quiz to unlock your 5th dimension.';
    box.appendChild(note);
  }
  const disc = document.createElement('p');
  disc.className = 'disclaimer';
  disc.textContent = 'Everyday preferences, not a diagnosis.';
  box.appendChild(disc);

  showScreen('result');
}

/* ------------------------- Share image (canvas) ------------------------- */

const CANVAS_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach(w => {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else { line = test; }
  });
  if (line) lines.push(line);
  return lines;
}

function drawLearnprintCanvas(result) {
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const { values } = getValues(result);

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0e1f');
  bg.addColorStop(1, '#1a1650');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  [[160, 140, 520, '#7c5cff', 0.35], [940, 1180, 560, '#22d3ee', 0.22]].forEach(([x, y, r, c, a]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#b9a8ff';
  ctx.font = `800 44px ${CANVAS_FONT}`;
  ctx.fillText('IDK.org', W / 2, 120);
  ctx.fillStyle = '#f4f6ff';
  ctx.font = `800 84px ${CANVAS_FONT}`;
  ctx.fillText('My Learnprint', W / 2, 215);

  const cx = W / 2, cy = 690, R = 280;
  ctx.lineWidth = 2;
  [0.25, 0.5, 0.75, 1].forEach(f => {
    ctx.beginPath();
    AXES.forEach((_, i) => { const [x, y] = polar(i, f, cx, cy, R); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.stroke();
  });
  AXES.forEach((_, i) => {
    const [x, y] = polar(i, 1, cx, cy, R);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.stroke();
  });
  const fill = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  fill.addColorStop(0, 'rgba(124,92,255,0.8)');
  fill.addColorStop(1, 'rgba(34,211,238,0.6)');
  ctx.beginPath();
  values.forEach((v, i) => { const [x, y] = polar(i, (v === null ? 0 : v) / 100, cx, cy, R); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = '#a998ff';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  values.forEach((v, i) => {
    if (v === null) return;
    const [x, y] = polar(i, v / 100, cx, cy, R);
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#7c5cff'; ctx.stroke();
  });
  AXES.forEach((a, i) => {
    const [x, y] = polar(i, 1, cx, cy, R + (i === 0 ? 78 : 66));
    ctx.fillStyle = '#f4f6ff';
    ctx.font = `700 34px ${CANVAS_FONT}`;
    ctx.fillText(a.label, x, y);
    ctx.fillStyle = '#8be8ff';
    ctx.font = `700 30px ${CANVAS_FONT}`;
    ctx.fillText(values[i] === null ? '–' : values[i] + '%', x, y + 38);
  });

  const parts = headlineParts(result);
  const headline = 'I learn best by ' + parts.primary + (parts.secondary ? ' and ' + parts.secondary : '');
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 54px ${CANVAS_FONT}`;
  let y = 1105;
  wrapLines(ctx, headline, W - 160).forEach(l => { ctx.fillText(l, W / 2, y); y += 62; });
  const social = SOCIAL_LINE[result.socialStyle];
  if (social) {
    ctx.fillStyle = '#b4bbd8';
    ctx.font = `500 36px ${CANVAS_FONT}`;
    ctx.fillText(social, W / 2, y + 4);
  }
  ctx.fillStyle = '#8d95b5';
  ctx.font = `500 32px ${CANVAS_FONT}`;
  ctx.fillText('Find yours at ' + location.host, W / 2, 1312);
  return canvas;
}

async function shareLearnprint() {
  if (!currentResult) return;
  try {
    const canvas = drawLearnprintCanvas(currentResult);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png');
    });
    const file = new File([blob], 'my-learnprint.png', { type: 'image/png' });
    const parts = headlineParts(currentResult);
    const text = 'I learn best by ' + parts.primary + (parts.secondary ? ' and ' + parts.secondary : '') + '. Find your Learnprint at ' + location.origin;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'My Learnprint', text });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-learnprint.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast('Image saved. Share it from your gallery.');
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return; // the person closed the share sheet
    showToast('Could not share. Please try again.');
  }
}

/* ------------------------------ Tutor ------------------------------ */

function initTutor() {
  showScreen('tutor');
  $('chat').replaceChildren();
  $('suggestions').replaceChildren();
  addBubble('bot', 'Hi! I am your study coach. Tell me what you are learning and what feels tricky.');
}

function sendMessage() {
  const input = $('msgInput');
  const msg = input.value.trim();
  if (!msg) return;
  addBubble('user', msg);
  input.value = '';
  $('sendBtn').disabled = true;
  maybeShowWarmup();
  fetchWithTimeout(`${window.IDK_CONFIG.API_URL}/api/tutor/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ message: msg })
  })
    .then(r => { clearWarmup(); handleAuthError(r); if (!r.ok) return r.json().then(j => { throw new Error(j.message || 'Tutor failed'); }); return r.json(); })
    .then(res => {
      const reply = res.response || {};
      addBubble('bot', reply.tutorMessage || 'Sorry, I could not answer that.');
      // tutorMessage already contains the numbered steps; chips come from suggestions
      const suggDiv = $('suggestions');
      suggDiv.replaceChildren();
      (reply.suggestions || []).forEach(sug => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = sug;
        chip.onclick = () => { $('msgInput').value = sug; };
        suggDiv.appendChild(chip);
      });
    })
    .catch(err => showMessage(err.message))
    .finally(() => { $('sendBtn').disabled = false; });
}

function addBubble(type, text) {
  const chat = $('chat');
  const b = document.createElement('div');
  b.className = 'bubble ' + type;
  b.textContent = text;
  chat.appendChild(b);
  chat.scrollTop = chat.scrollHeight;
}

// Event listeners
$('loginBtn').onclick = login;
$('registerBtn').onclick = register;
$('nextBtn').onclick = nextStep;
$('sendBtn').onclick = sendMessage;
$('msgInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
$('toTutorBtn').onclick = initTutor;
$('tutorBtn').onclick = initTutor;
$('shareBtn').onclick = shareLearnprint;
$('retakeBtn').onclick = () => { showScreen('quiz'); loadQuiz(); };
$('learnprintBtn').onclick = showSavedResult;
$('againBtn').onclick = () => { showScreen('quiz'); loadQuiz(); };
$('logoutBtn').onclick = logout;

// Init
if (getToken()) initApp(); else showScreen('login');
addHeader();
