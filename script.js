/* ── DOM refs ─────────────────────────────────────── */
const form        = document.getElementById('form');
const urlInput    = document.getElementById('url-input');
const inputWrap   = document.getElementById('input-wrapper');
const clearBtn    = document.getElementById('clear-btn');
const submitBtn   = document.getElementById('submit-btn');
const btnIcon     = document.getElementById('btn-icon');
const btnText     = document.getElementById('btn-text');

const resultSection = document.getElementById('result-section');
const resultCard    = document.getElementById('result-card');
const resultTop     = document.getElementById('result-top');
const resultIcon    = document.getElementById('result-icon');
const resultLabel   = document.getElementById('result-label');
const resultUrl     = document.getElementById('result-url');
const checklist     = document.getElementById('checklist');
const alertBanner   = document.getElementById('alert-banner');
const alertHeader   = document.getElementById('alert-header');
const alertTitle    = document.getElementById('alert-title');
const alertSteps    = document.getElementById('alert-steps');
const resetBtn      = document.getElementById('reset-btn');

/* ── Config ───────────────────────────────────────── */
const SOURCES = [
  { key: 'gsb',        label: 'Google Safe Browsing', icon: 'globe' },
  { key: 'vt',         label: 'VirusTotal',            icon: 'bug' },
  { key: 'phishtank',  label: 'PhishTank',             icon: 'fish' },
  { key: 'urlhaus',    label: 'URLhaus',               icon: 'link-2' },
  { key: 'local',      label: 'Análise local',         icon: 'scan' },
];

const STATUS_CONFIG = {
  safe:       { icon: 'shield-check', label: 'Site Seguro' },
  suspicious: { icon: 'shield-alert', label: 'Site Suspeito' },
  danger:     { icon: 'shield-x',     label: 'Site Perigoso' },
};

const ALERT_CONFIG = {
  danger: {
    icon: 'triangle-alert',
    title: 'O que fazer agora',
    steps: [
      'Não insira senha, CPF ou dados bancários neste site',
      'Feche esta aba imediatamente',
      'Se já inseriu dados, entre em contato com seu banco',
    ],
  },
  suspicious: {
    icon: 'triangle-alert',
    title: 'Atenção — proceda com cuidado',
    steps: [
      'Não insira dados pessoais ou financeiros por ora',
      'Confira o endereço com atenção antes de continuar',
      'Em caso de dúvida, acesse o serviço pelo aplicativo oficial',
    ],
  },
};

/* ── Heuristics ───────────────────────────────────── */
const DIGIT_MAP  = { '0':'o','1':'l','3':'e','4':'a','5':'s','8':'b' };
const KNOWN_BAD  = ['phishing','malware','golpe','fraude','hackme','scam'];
const BRANDS     = [
  'bradesco','itau','santander','caixa','bb','nubank',
  'mercadolivre','amazon','paypal','netflix','ifood','correios',
];

function extractHostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return url.replace(/^https?:\/\/(www\.)?/i,'').split('/')[0].toLowerCase(); }
}

function digitNormalize(s) {
  return s.replace(/[0-9]/g, d => DIGIT_MAP[d] ?? d);
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1}, (_,i) => Array.from({length:n+1}, (_,j) => i||j));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

function localAnalysis(hostname) {
  const domain = hostname.split('.')[0];
  const norm   = digitNormalize(domain);

  for (const brand of BRANDS) {
    // subdomain trick: brand appears in subdomain but not as registered domain
    if (hostname.includes(brand) && !hostname.startsWith(brand + '.')) {
      return { status: 'bad', detail: `imita "${brand}"` };
    }
    // digit substitution / levenshtein
    if (norm !== domain && norm.includes(brand)) {
      return { status: 'bad', detail: `"${domain}" imita "${brand}"` };
    }
    if (levenshtein(norm, brand) <= 1 && norm !== brand) {
      return { status: 'warn', detail: `similar a "${brand}"` };
    }
  }

  if (!hostname.startsWith('https') && /^http:/.test(hostname)) {
    return { status: 'warn', detail: 'sem HTTPS' };
  }

  return { status: 'ok', detail: 'domínio legítimo' };
}

/* ── Mock API (replace with fetch('/verificar') later) ── */
function mockResult(key, isPhishy, isBad) {
  if (isBad) {
    const details = {
      gsb:       'phishing detectado',
      vt:        '12/90 engines',
      phishtank: 'verificado',
      urlhaus:   'não encontrado',
    };
    return { status: 'bad', detail: details[key] ?? 'detectado' };
  }
  if (isPhishy && key === 'vt') {
    return { status: 'warn', detail: '1/90 engines' };
  }
  const clean = { gsb:'sem ameaças', vt:'0/90 engines', phishtank:'não encontrado', urlhaus:'não encontrado' };
  return { status: 'ok', detail: clean[key] ?? 'limpo' };
}

/* ── State ────────────────────────────────────────── */
let resolved = {};

function resetState() { resolved = {}; }

function computeOverall() {
  const statuses = Object.values(resolved).map(r => r.status);
  if (statuses.includes('bad'))  return 'danger';
  if (statuses.includes('warn')) return 'suspicious';
  return 'safe';
}

/* ── Checklist UI ─────────────────────────────────── */
function renderChecklistLoading(url) {
  resultCard.className = 'result-card loading';
  resultIcon.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
  resultLabel.textContent = 'Analisando…';
  resultUrl.textContent   = url;
  checklist.innerHTML     = '';

  SOURCES.forEach((src, i) => {
    const li = document.createElement('li');
    li.className = 'check-item';
    li.dataset.key = src.key;
    li.style.animationDelay = `${i * 50}ms`;
    li.innerHTML = `
      <span class="check-item__src-icon"><i data-lucide="${src.icon}"></i></span>
      <span class="check-item__name">${src.label}</span>
      <span class="check-item__result" id="res-${src.key}">
        <i data-lucide="loader-2" class="spin"></i>verificando…
      </span>
    `;
    checklist.appendChild(li);
  });

  lucide.createIcons();
}

function resolveItem(key, result) {
  resolved[key] = result;

  const li = checklist.querySelector(`[data-key="${key}"]`);
  if (!li) return;

  const STATUS_ICON = { ok: 'circle-check', warn: 'triangle-alert', bad: 'circle-x' };
  const statusClass = result.status === 'bad' ? 'bad' : result.status;

  li.className = `check-item ${statusClass}`;

  const resSpan = li.querySelector(`#res-${key}`);
  resSpan.innerHTML = `<i data-lucide="${STATUS_ICON[result.status]}"></i>${result.detail}`;
  lucide.createIcons({ nodes: [resSpan] });
}

function showFinalResult(status) {
  const cfg = STATUS_CONFIG[status];

  resultCard.className = `result-card ${status}`;
  resultIcon.innerHTML = `<i data-lucide="${cfg.icon}"></i>`;
  resultLabel.textContent = cfg.label;
  lucide.createIcons({ nodes: [resultIcon] });

  if (status !== 'safe') {
    const alertCfg = ALERT_CONFIG[status];
    alertBanner.className = `alert-banner ${status}`;
    alertTitle.textContent = alertCfg.title;
    alertHeader.querySelector('svg')?.remove();
    const ico = document.createElement('i');
    ico.setAttribute('data-lucide', alertCfg.icon);
    alertHeader.insertAdjacentElement('afterbegin', ico);
    lucide.createIcons({ nodes: [alertHeader] });
    alertSteps.innerHTML = alertCfg.steps.map(s => `<li>${s}</li>`).join('');
    alertBanner.hidden = false;
  } else {
    alertBanner.hidden = true;
  }
}

/* ── Analysis flow ────────────────────────────────── */
async function runAnalysis(url) {
  const hostname = extractHostname(url);
  const local    = localAnalysis(hostname);
  const isBad    = KNOWN_BAD.some(w => hostname.includes(w)) || local.status === 'bad';
  const isPhishy = local.status === 'warn';

  // local is fast
  await delay(500);
  resolveItem('local', local);

  // APIs trickle in
  await delay(380);
  resolveItem('gsb',      mockResult('gsb',      isPhishy, isBad));

  await delay(260);
  resolveItem('vt',       mockResult('vt',       isPhishy, isBad));

  await delay(180);
  resolveItem('phishtank',mockResult('phishtank',isPhishy, isBad));

  await delay(140);
  resolveItem('urlhaus',  mockResult('urlhaus',  isPhishy, isBad && Math.random() > 0.6));

  await delay(160);
  const overall = computeOverall();
  showFinalResult(overall);
}

/* ── Input behavior ─────────────────────────────────── */
urlInput.addEventListener('input', () => {
  clearBtn.hidden = !urlInput.value.length;
  inputWrap.classList.remove('invalid');
});

clearBtn.addEventListener('click', () => {
  urlInput.value = '';
  clearBtn.hidden = true;
  inputWrap.classList.remove('invalid');
  urlInput.focus();
});

/* ── Form submit ─────────────────────────────────── */
form.addEventListener('submit', async e => {
  e.preventDefault();

  const raw = urlInput.value.trim();
  if (!raw) {
    inputWrap.classList.add('invalid');
    urlInput.focus();
    return;
  }

  const url = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;

  // show loading UI
  setLoading(true);
  resetState();
  alertBanner.hidden = true;
  resultSection.hidden = false;
  renderChecklistLoading(url);

  await runAnalysis(url);

  setLoading(false);
});

/* ── Reset ───────────────────────────────────────── */
resetBtn.addEventListener('click', () => {
  resultSection.hidden = true;
  urlInput.value = '';
  clearBtn.hidden = true;
  inputWrap.classList.remove('invalid');
  urlInput.focus();
});

/* ── Helpers ─────────────────────────────────────── */
function setLoading(on) {
  submitBtn.disabled = on;
  btnText.textContent = on ? 'Analisando…' : 'Verificar Site';
  btnIcon.setAttribute('data-lucide', on ? 'loader-2' : 'search');
  if (on) btnIcon.classList.add('spin');
  else btnIcon.classList.remove('spin');
  lucide.createIcons({ nodes: [submitBtn] });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
