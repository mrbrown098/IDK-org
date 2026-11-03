// docs/app.js - client script for IDK.org
// Loads configuration from config.js (window.IDK_CONFIG.API_URL)
// Implements login/register, quiz flow, result, tutor chat and a simple menu.
// All DOM manipulation uses textContent / createElement / replaceChildren only.
// No innerHTML is used.

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
  const el = document.getElementById('message');
  el.textContent = text;
  el.style.display = 'block';
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { el.style.display = 'none'; }, 4000);
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
    document.getElementById(s).style.display = 'none';
  });
  document.getElementById(id).style.display = 'block';
  document.getElementById('message').style.display = 'none';
}

// Header with a Menu button at the top of the quiz, result and tutor screens
function addHeader() {
  document.querySelectorAll('#quiz, #result, #tutor').forEach(card => {
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'flex-end';
    const menuBtn = document.createElement('button');
    menuBtn.textContent = 'Menu';
    menuBtn.style.width = 'auto';
    menuBtn.addEventListener('click', () => showScreen('menu'));
    header.appendChild(menuBtn);
    card.insertBefore(header, card.firstChild);
  });
}

function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
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
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm').value;
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

function initApp() {
  maybeShowWarmup();
  fetchWithTimeout(`${window.IDK_CONFIG.API_URL}/api/quiz/result`, { headers: { ...authHeaders() } })
    .then(r => {
      clearWarmup();
      handleAuthError(r);
      if (r.ok) { initTutor(); return; }
      if (r.status === 404) { showScreen('quiz'); loadQuiz(); return; }
      if (r.status !== 401) showMessage('Could not load your result. Please try again.');
    })
    .catch(err => showMessage(err.message));
}

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
  const container = document.getElementById('quizQuestion');
  container.replaceChildren();
  const qEl = document.createElement('div');
  qEl.textContent = `${currentIdx + 1}. ${q.question}`;
  container.appendChild(qEl);
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt.text;
    btn.onclick = () => {
      answers[currentIdx] = { questionId: q.id, optionId: opt.id };
      document.querySelectorAll('#quizQuestion button').forEach(b => b.disabled = true);
      document.getElementById('nextBtn').disabled = false;
    };
    container.appendChild(btn);
  });
  const progressEl = document.getElementById('quizProgress');
  progressEl.replaceChildren();
  const progressText = document.createElement('span');
  progressText.textContent = `${currentIdx + 1} of ${quizData.length} `;
  const progressBar = document.createElement('progress');
  progressBar.value = currentIdx + 1;
  progressBar.max = quizData.length;
  progressEl.appendChild(progressText);
  progressEl.appendChild(progressBar);
  document.getElementById('nextBtn').disabled = true;
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
  fetchWithTimeout(`${window.IDK_CONFIG.API_URL}/api/quiz/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ answers })
  })
    .then(r => { clearWarmup(); handleAuthError(r); if (!r.ok) return r.json().then(j => { throw new Error(j.message || 'Submit failed'); }); return r.json(); })
    .then(res => {
      showScreen('result');
      const primary = res.result?.primary || res.primary; // fallback for older shape
      const secondary = res.result?.secondary || res.secondary;
      const txt = `Primary: ${primary}\n${secondary ? 'Secondary: ' + secondary + '\n' : ''}This is an everyday‑preference quiz, not a medical diagnosis.`;
      document.getElementById('resultText').textContent = txt;
    })
    .catch(err => showMessage(err.message));
}

function initTutor() {
  showScreen('tutor');
  document.getElementById('chat').replaceChildren();
  document.getElementById('suggestions').replaceChildren();
  addBubble('bot', 'Hi! I am your study coach. Tell me what you are learning and what feels tricky.');
}

function sendMessage() {
  const input = document.getElementById('msgInput');
  const msg = input.value.trim();
  if (!msg) return;
  addBubble('user', msg);
  input.value = '';
  document.getElementById('sendBtn').disabled = true;
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
      const suggDiv = document.getElementById('suggestions');
      suggDiv.replaceChildren();
      (reply.suggestions || []).forEach(sug => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = sug;
        chip.onclick = () => { document.getElementById('msgInput').value = sug; };
        suggDiv.appendChild(chip);
      });
    })
    .catch(err => showMessage(err.message))
    .finally(() => { document.getElementById('sendBtn').disabled = false; });
}

function addBubble(type, text) {
  const chat = document.getElementById('chat');
  const b = document.createElement('div');
  b.className = 'bubble ' + type;
  b.textContent = text;
  chat.appendChild(b);
  chat.scrollTop = chat.scrollHeight;
}

// Event listeners
document.getElementById('loginBtn').onclick = login;
document.getElementById('registerBtn').onclick = register;
document.getElementById('nextBtn').onclick = nextStep;
document.getElementById('sendBtn').onclick = sendMessage;
document.getElementById('toTutorBtn').onclick = initTutor;
document.getElementById('tutorBtn').onclick = initTutor;
document.getElementById('againBtn').onclick = () => { showScreen('quiz'); loadQuiz(); };
document.getElementById('logoutBtn').onclick = logout;

// Init
if (getToken()) initApp(); else showScreen('login');
addHeader();
