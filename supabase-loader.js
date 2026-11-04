// ============================================
// SUPABASE LOADER: fills the portfolio with the content edited in admin.html
// Uses the same tables and keys as the dashboard. If anything fails, the
// text already written in index.html stays on the page.
// ============================================

const SUPABASE_URL = 'https://xqidbcjswefsslvhoxpe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxaWRiY2pzd2Vmc3NsdmhveHBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NTQ1NTcsImV4cCI6MjA5NTIzMDU1N30.FrEj8v5-T3x9SYyxBsJSMZXJ1zChK1XYXdm-jN9PEBQ';
const SB_HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function sbGet(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    headers: { ...SB_HEADERS, 'Cache-Control': 'no-cache' },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`Failed to fetch ${table}`);
  return res.json();
}

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function setText(id, value, split) {
  const el = $(id);
  if (!el || !value || !String(value).trim()) return;
  el.textContent = String(value).trim();
  if (split && window.Site) window.Site.resplit(el);
}

// ============================================
// SETTINGS: hero, about, contact, availability, CV
// ============================================
async function loadSiteSettings() {
  const rows = await sbGet('site_settings');
  const s = {};
  rows.forEach((r) => { s[r.key] = r.value; });

  setText('heroTitle', s.hero_title, true);
  setText('heroLead', s.hero_subtitle);
  setText('navRole', s.hero_label);
  setText('aboutTitle', s.about_title, true);
  setText('aboutLead', s.about_lead);
  setText('aboutBody', s.about_body);
  setText('footText', s.footer_text);

  // Availability: hidden when the dashboard switch is off
  const avail = $('avail');
  if (avail) {
    if ((s.availability_status || 'available') !== 'available') avail.hidden = true;
    else if (s.availability_text) avail.textContent = s.availability_text;
  }

  // Contact
  if (s.contact_email) {
    const mail = $('mail');
    if (mail) { mail.textContent = s.contact_email; mail.href = `mailto:${s.contact_email}`; }
  }
  if (s.linkedin_url) document.querySelectorAll('a[href*="linkedin.com"]').forEach((a) => { a.href = s.linkedin_url; });
  if (s.behance_url) document.querySelectorAll('a[href^="https://www.behance.net/Mersawy"]').forEach((a) => { a.href = s.behance_url; });

  // CV: switch, button text, file
  const cvOn = String(s.cv_enabled ?? 'true').toLowerCase() !== 'false';
  document.querySelectorAll('[data-cv],[data-cv-dl]').forEach((el) => { el.hidden = !cvOn; });
  if (s.cv_button_text) document.querySelectorAll('button[data-cv]').forEach((b) => {
    const icon = b.querySelector('svg');
    b.textContent = s.cv_button_text;
    if (icon) b.prepend(icon);
  });
  const cvUrl = (s.cv_url || '').trim();
  if (cvUrl && cvUrl !== 'cv/Magdy_Saad_CV.pdf') {
    // A new CV was uploaded from the dashboard: show that PDF and download it.
    const dl = cvUrl.includes('supabase.co/storage') ? `${cvUrl}${cvUrl.includes('?') ? '&' : '?'}download=Magdy_Saad_CV.pdf` : cvUrl;
    document.querySelectorAll('[data-cv-dl]').forEach((a) => { a.href = dl; });
    const pages = $('cvPages');
    if (pages) pages.innerHTML = `<iframe src="${esc(cvUrl)}#view=FitH" title="Magdy Saad CV" style="width:100%;height:calc(100vh - 160px);border:0;border-radius:4px;background:#fff"></iframe>`;
  }
}

// ============================================
// EXPERIENCE (timeline table) and CERTIFICATES
// ============================================
async function loadExperience() {
  const [events, certs] = await Promise.all([
    sbGet('timeline', '?order=sort_order&is_visible=eq.true'),
    sbGet('certifications', '?order=sort_order&is_visible=eq.true')
  ]);
  const box = $('expRows');
  if (!box || !events.length) return;
  const rows = events.map((e) => {
    const extra = e.description ? `, ${esc(e.description)}` : '';
    return `<div class="xrow"><span>${esc(e.date_label)}</span><b>${esc(e.heading)}${e.description && !e.is_ongoing ? extra : ''}</b></div>`;
  });
  const certList = certs
    .filter((c) => !/^cradis$/i.test((c.organization || '').trim()))
    .map((c) => `${esc(c.organization)}, ${esc(c.title)}`)
    .join('. ');
  if (certList) rows.push(`<div class="xrow" style="border-bottom:1px solid var(--line)"><span>Certificates</span><b style="font-weight:400">${certList}.</b></div>`);
  box.innerHTML = rows.join('');
}

// ============================================
// ANALYTICS (anonymous)
// ============================================
function sbInsert(table, row) {
  return fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...SB_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row)
  }).catch(() => {});
}
function getVisitorId() {
  try {
    let id = localStorage.getItem('visitor_id');
    if (!id) { id = 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('visitor_id', id); }
    return id;
  } catch (e) { return 'v_anon'; }
}
function detectEnv() {
  const ua = navigator.userAgent;
  let browser = 'Other';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  let os = 'Other';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  return { browser, os, device: /Mobi|Android|iPhone|iPad/.test(ua) ? 'Mobile' : 'Desktop' };
}
async function getGeo() {
  try {
    const cached = sessionStorage.getItem('geo_info');
    if (cached !== null) return JSON.parse(cached);
    const j = await (await fetch('https://ipapi.co/json/')).json();
    const info = { country: j.country_name || '', ip: j.ip || '' };
    sessionStorage.setItem('geo_info', JSON.stringify(info));
    return info;
  } catch (e) { return { country: '', ip: '' }; }
}
async function logEvent(type) {
  const env = detectEnv();
  const geo = await getGeo();
  sbInsert('analytics_events', {
    visitor_id: getVisitorId(), event_type: type, browser: env.browser, os: env.os, device: env.device,
    country: geo.country, ip: geo.ip, referrer: document.referrer || 'direct', path: location.pathname || '/'
  });
}
function initAnalytics() {
  try {
    if (!sessionStorage.getItem('pv_logged')) { logEvent('pageview'); sessionStorage.setItem('pv_logged', '1'); }
  } catch (e) { logEvent('pageview'); }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cv]')) { logEvent('click_cv'); return; }
    if (e.target.closest('[data-cv-dl]')) { logEvent('download_cv'); return; }
    const a = e.target.closest('a');
    if (!a) return;
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href.includes('linkedin')) logEvent('click_linkedin');
    else if (href.includes('behance')) logEvent('click_behance');
  }, true);
}

async function initSupabase() {
  const results = await Promise.allSettled([loadSiteSettings(), loadExperience()]);
  results.forEach((r) => { if (r.status === 'rejected') console.warn('Supabase load error:', r.reason && r.reason.message); });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initSupabase(); initAnalytics(); });
} else {
  initSupabase();
  initAnalytics();
}
