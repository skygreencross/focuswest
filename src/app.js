/* ─── Boot ─── */
let DATA = null;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

/* ─── Backend ────────────────────────────────────────────────────────────────
   Google Sheets-backed pitch data. The Apps Script reads the Pitches sheet
   and returns this client's row as JSON in the shape the deck expects.

   To repoint at a different sheet/script, replace SHEET_API_URL with the new
   deployment URL. To go fully offline, set it to empty string — bundled data
   will be used unconditionally.

   URL shape:  SHEET_API_URL?client=<clientId>
   Visit the deck as:  https://yourhost/?client=aroma
─────────────────────────────────────────────────────────────────────────── */
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbz8JxwoIASjU51ch1dB_fchnPIwem3soQuHL7rqndSf97Lh9sPGWPCu8nefiCw7isGr/exec';

async function loadData() {
  // 1. Inline bundled data — always available, loads synchronously. This is
  //    our offline / fallback dataset. If the live fetch succeeds below, we
  //    overwrite DATA with the fresh content.
  const bundled = document.getElementById('bundled-data');
  if (bundled) {
    try { DATA = JSON.parse(bundled.textContent); }
    catch (e) { console.warn('Bundled JSON parse failed:', e); }
  }

  // 2. Determine clientId from URL (?client=aroma). If absent, we'll keep
  //    the bundled data so the deck still renders when opened via file://
  //    without a query string.
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = (urlParams.get('client') || '').toLowerCase().trim();

  // 3. If we have a sheet endpoint AND a clientId, fetch live data.
  if (SHEET_API_URL && clientId) {
    try {
      const apiUrl = SHEET_API_URL + '?client=' + encodeURIComponent(clientId);
      const res = await fetch(apiUrl, { redirect: 'follow' });
      if (res.ok) {
        const live = await res.json();
        if (live && !live.error) {
          DATA = live;
          console.log('Loaded live data for client:', clientId);
        } else if (live && live.error) {
          console.warn('Sheet API error:', live.error, '— falling back to bundled data');
        }
      }
    } catch (e) {
      console.warn('Sheet fetch failed, using bundled data:', e);
    }
  }

  // 4. Dev-mode override: when serving src/ via HTTP without a ?client= param,
  //    prefer a local data.json if one is present alongside the page.
  if (!clientId) {
    try {
      const res = await fetch('./data.json');
      if (res.ok) {
        const overlay = await res.json();
        if (overlay && typeof overlay === 'object') DATA = overlay;
      }
    } catch (e) { /* fine — bundled data is in play */ }
  }

  // 5. Last-resort minimal fallback (only if bundled was somehow stripped)
  if (!DATA) DATA = FALLBACK_DATA;
  return DATA;
}

function renderAndWire() {
  render(DATA);
  wireNav();
  wireReveal();
  wireKeyboard();
  wirePresent();
  buildValAxis();
  positionPlot(DATA.valuation);
  wireSensitivity();
  bootValuationAnimations();
  bootStatsAnimations();
  bootFunnelAnimations();
  bootRoadmapAnimations();
  wireRoadmapToday();
  wireCoverSizzle();
  wireFeeCalc();
  wireValuesDrag();
  wireScenarios();
  wireWaterfall();
  wireShareButton();
  wireAudioPlayer();
  autoNumberEyebrows();
}

async function boot() {
  await loadData();
  renderAndWire();
}

/* ─── Auto-number section eyebrows from DOM order ─── */
function autoNumberEyebrows() {
  const sections = $$('section.deck-section');
  let n = 1;
  sections.forEach(sec => {
    const eb = sec.querySelector('.eyebrow');
    if (!eb) return;
    const topic = eb.textContent.replace(/^\s*(\d+\s*)?—\s*/, '').trim();
    eb.textContent = `${String(n).padStart(2, '0')} — ${topic}`;
    n++;
  });
}

/* ─── Snapshot section ─── */
function renderSnapshot(d) {
  const sec = $('#snapshot');
  if (!sec || !d.snapshot) { if (sec) sec.style.display = 'none'; return; }
  const s = d.snapshot;
  $('#snapTitle').innerHTML = `${d.client.company_name} · <em>at a glance.</em>`;
  $('#snapSub').textContent = s.subhead;
  $('#snapStats').innerHTML = s.stats.map(st => `
    <div class="snapshot-stat">
      <div class="snapshot-stat-val">${st.value}</div>
      <div class="snapshot-stat-lbl">${st.label}</div>
    </div>
  `).join('');

  // ─── Waikiki street map: hand-drawn, real geography, with numbered pins ───
  const locs = s.locations || [];
  const dots = locs.map((loc, i) => {
    const num = i + 1;
    return `
      <g class="snapshot-map-pin" data-loc="${i}">
        <circle class="snapshot-map-dot-ring" cx="${loc.x}" cy="${loc.y}" r="3.4" />
        <circle class="snapshot-map-dot" cx="${loc.x}" cy="${loc.y}" r="2.0">
          <title>${num}. ${loc.name || loc.neighborhood || ''}${loc.address ? ' · ' + loc.address : ''}</title>
        </circle>
        <text class="snapshot-map-dot-num" x="${loc.x}" y="${loc.y}">${num}</text>
      </g>
    `;
  }).join('');

  // Cross streets (N-S) — thin grid
  const crossStreets = [11, 17, 24, 30, 36, 42, 48, 60, 66, 72]
    .map(x => `<line x1="${x}" y1="9" x2="${x}" y2="38" stroke="rgba(255,255,255,0.09)" stroke-width="0.28" />`).join('');

  $('#snapMap').innerHTML = `
    <svg viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
      <!-- Ala Wai Canal (NW to NE, gentle curve) -->
      <path d="M 4,3 Q 30,3.4 60,4 T 90,5.2" stroke="#1A2C3E" stroke-width="2" fill="none" stroke-linecap="round" />

      <!-- Ocean (south band, hugging the south shore curve) -->
      <path d="M 0,50 L 0,42 Q 30,40.4 60,40.4 T 100,38.8 L 100,50 Z" fill="#15233A" />

      <!-- Beach strip -->
      <path d="M 4,40.4 Q 30,38.9 60,38.9 T 96,37.4" stroke="#A88A65" stroke-width="0.85" fill="none" opacity="0.45" />

      <!-- Magic Island / Ala Moana Beach Park (W peninsula) -->
      <path d="M 0,38 L 5,38 Q 7.5,40 6.5,42 Q 4,43 0,42 Z" fill="#2F4435" opacity="0.6" />

      <!-- Fort DeRussy Park -->
      <rect x="11" y="29" width="11" height="9" fill="#2F4435" opacity="0.5" rx="0.5" />

      <!-- Kapiolani Park (east) -->
      <path d="M 79,28 L 95,28 L 96.5,32 L 94,40 L 79,38 Z" fill="#2F4435" opacity="0.55" />

      <!-- Diamond Head crater outline + interior shading -->
      <ellipse cx="94" cy="44" rx="4" ry="2.4" fill="none" stroke="#5C6B7A" stroke-width="0.4" />
      <ellipse cx="94" cy="44" rx="2.3" ry="1.4" fill="#5C6B7A" opacity="0.32" />

      <!-- Major E-W streets -->
      <line x1="5"  y1="8"  x2="80" y2="8"  stroke="rgba(255,255,255,0.18)" stroke-width="0.5" />
      <line x1="5"  y1="15" x2="80" y2="15" stroke="rgba(255,255,255,0.10)" stroke-width="0.32"/>
      <line x1="5"  y1="22" x2="80" y2="22" stroke="rgba(255,255,255,0.24)" stroke-width="0.6" />
      <line x1="5"  y1="28" x2="80" y2="28" stroke="rgba(255,255,255,0.12)" stroke-width="0.36"/>
      <line x1="5"  y1="33" x2="80" y2="33" stroke="rgba(255,255,255,0.30)" stroke-width="0.78"/>

      <!-- Ala Moana Blvd curving around the west end -->
      <path d="M 22,8 L 22,28 Q 18,30 11,32 L 4,32" stroke="rgba(255,255,255,0.22)" stroke-width="0.6" fill="none" />

      <!-- Cross streets N-S -->
      ${crossStreets}
      <line x1="54" y1="9" x2="54" y2="38" stroke="rgba(255,255,255,0.16)" stroke-width="0.4" />
      <line x1="78" y1="9" x2="78" y2="38" stroke="rgba(255,255,255,0.16)" stroke-width="0.4" />

      <!-- Map labels -->
      <text class="snapshot-map-label subtle" x="42" y="2.6" font-size="1.9" text-anchor="middle">ALA WAI CANAL</text>
      <text class="snapshot-map-label" x="78" y="21.2" font-size="2" text-anchor="end">KUHIO AVE</text>
      <text class="snapshot-map-label major" x="78" y="32.2" font-size="2.1" text-anchor="end">KALAKAUA AVE</text>
      <text class="snapshot-map-label" x="87" y="33.5" font-size="1.85" text-anchor="middle">KAPIOLANI</text>
      <text class="snapshot-map-label" x="87" y="35.6" font-size="1.85" text-anchor="middle">PARK</text>
      <text class="snapshot-map-label" x="94" y="48.6" font-size="1.85" text-anchor="middle">DIAMOND HEAD</text>
      <text class="snapshot-map-label subtle" x="50" y="47.8" font-size="1.85" text-anchor="middle">P A C I F I C   O C E A N</text>
      <text class="snapshot-map-label subtle" x="16" y="35" font-size="1.65" text-anchor="middle">FORT</text>
      <text class="snapshot-map-label subtle" x="16" y="37" font-size="1.65" text-anchor="middle">DERUSSY</text>

      <!-- Pins -->
      ${dots}
    </svg>
  `;

  // Geography line + numbered store list (replaces market chips)
  const geographyLine = s.geography
    ? `<div class="snapshot-map-geography"><span class="accent">●</span> ${s.geography}</div>`
    : '';
  const storeList = locs.length ? `
    <div class="snapshot-map-stores">
      ${locs.map((loc, i) => `
        <div class="snapshot-map-store" data-loc="${i}">
          <span class="num">${String(i + 1).padStart(2, '0')}</span>
          <div>
            <div class="name">${loc.name || loc.neighborhood || ''}</div>
            <div class="addr">${loc.address || ''}</div>
          </div>
        </div>
      `).join('')}
    </div>
  ` : '';
  $('#snapMapMarkets').innerHTML = geographyLine + storeList;

  // List-row hover ↔ map-dot highlight cross-link
  $$('.snapshot-map-store', $('#snapMapMarkets')).forEach(row => {
    const i = row.dataset.loc;
    const pin = sec.querySelector(`.snapshot-map-pin[data-loc="${i}"] .snapshot-map-dot`);
    const ring = sec.querySelector(`.snapshot-map-pin[data-loc="${i}"] .snapshot-map-dot-ring`);
    row.addEventListener('mouseenter', () => {
      if (pin)  { pin.setAttribute('r', '3.4'); pin.style.fill = 'var(--text)'; }
      if (ring) { ring.setAttribute('r', '5'); ring.style.opacity = '0.9'; }
    });
    row.addEventListener('mouseleave', () => {
      if (pin)  { pin.setAttribute('r', '2.4'); pin.style.fill = ''; }
      if (ring) { ring.setAttribute('r', '3.6'); ring.style.opacity = ''; }
    });
  });

  // ─── Trajectory chart: HTML/CSS bars (no SVG distortion) ───
  const td = s.trajectory_data;
  const ty = s.trajectory_years;
  if (td && ty && td.length > 1) {
    const max = Math.max(...td);
    // Compute bar heights in pixels so percent-height parent constraints can't mess us up.
    // chartH 150 - val(14) - valGap(6) - yrGap(8) - yr(14) = 108 available for bars
    const barAreaH = 108;
    $('#snapTrajChart').innerHTML = `
      <div class="snap-traj-bars">
        ${td.map((v, i) => {
          const barH = (v / max) * barAreaH;
          const isLatest = i === td.length - 1;
          return `
            <div class="snap-traj-col ${isLatest ? 'latest' : ''}">
              <div class="snap-traj-val">$${v.toFixed(2)}M</div>
              <div class="snap-traj-bar-fill" style="height: ${barH.toFixed(1)}px;"></div>
              <div class="snap-traj-yr">${ty[i]}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    const span = td.length - 1;
    const cagr = (Math.pow(td[td.length - 1] / td[0], 1 / span) - 1) * 100;
    $('#snapCagr').textContent = cagr.toFixed(0);
    $('#snapTrajCaption').textContent = s.trajectory_caption || '';
  }
}

/* ─── Deals wall (Platform) ─── */
function renderDealsWall(d) {
  const wall = $('.deals-wall');
  if (!wall || !d.platform_deals || !d.platform_deals.length) { if (wall) wall.style.display = 'none'; return; }
  const tilesHTML = d.platform_deals.map(deal => `
    <div class="deal-tile">
      <div class="deal-tile-year">${deal.year}</div>
      <div class="deal-tile-sector">${deal.sector}</div>
      <div class="deal-tile-meta">
        <span class="deal-tile-value">${deal.value}</span>
        <span class="deal-tile-buyer">${deal.buyer_type}</span>
      </div>
    </div>
  `).join('');
  $('#dealsStrip').innerHTML = tilesHTML + tilesHTML;
}

/* ─── Risks section ─── */
function renderRisks(d) {
  const sec = $('#risks');
  if (!sec || !d.risks || !d.risks.length) { if (sec) sec.style.display = 'none'; return; }
  $('#risksGrid').innerHTML = d.risks.map(r => `
    <div class="risk-row">
      <div class="risk-title">${r.title}</div>
      <div class="risk-body">${r.risk}</div>
      <div class="risk-mit">${r.mitigation}</div>
    </div>
  `).join('');
}

/* ─── Comparable transactions ─── */
function renderComparables(d) {
  const sec = $('#comparables');
  if (!sec || !d.comparables || !d.comparables.length) { if (sec) sec.style.display = 'none'; return; }
  const multLo = d.valuation.ebitda_multiple_low;
  const multHi = d.valuation.ebitda_multiple_high;
  $('#compsRows').innerHTML = d.comparables.map(c => {
    const inRange = c.ev_ebitda >= multLo && c.ev_ebitda <= multHi;
    return `
      <div class="comp-row ${inRange ? 'in-range' : ''}">
        <div class="comp-target">${c.target}<span class="sector">${c.sector}</span></div>
        <div class="comp-year">${c.year}</div>
        <div class="comp-ev">$${c.ev_m}M</div>
        <div class="comp-mult-eb">${c.ev_ebitda.toFixed(1)}x</div>
        <div class="comp-mult-rev">${c.ev_revenue.toFixed(2)}x</div>
        <div class="comp-buyer">${c.buyer_type}</div>
        ${c.note ? `<div class="comp-note">${c.note}</div>` : ''}
      </div>
    `;
  }).join('');
  const median = (arr) => {
    const s = arr.slice().sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const medianMult = median(d.comparables.map(c => c.ev_ebitda));
  const inSet = d.comparables.filter(c => c.ev_ebitda >= multLo && c.ev_ebitda <= multHi).length;
  $('#compsSummary').innerHTML = `Median EBITDA multiple across the set is <strong>${medianMult.toFixed(1)}x</strong>. Our preliminary range of <strong>${multLo}–${multHi}x</strong> captures <strong>${inSet} of ${d.comparables.length}</strong> comparable transactions — the cluster that aligns with your size and growth profile.`;
}

/* ─── Scenarios ─── */
function renderScenarios(d) {
  const sec = $('#scenarios');
  if (!sec || !d.scenarios || !d.scenarios.length) { if (sec) sec.style.display = 'none'; return; }
  $('#scenarioGrid').innerHTML = d.scenarios.map((s, i) => `
    <div class="scenario-card ${i === 0 ? 'selected' : ''}" data-scenario="${s.id}">
      <div class="scenario-name">${s.name}</div>
      <div class="scenario-headline">${s.headline}</div>
      <div class="scenario-ev"><span class="cur">$</span>${s.ev_low_m.toFixed(1)}<span style="font-size:0.6em;color:var(--text-3);margin:0 6px;">—</span><span class="cur">$</span>${s.ev_high_m.toFixed(1)}<span style="font-family:var(--font-mono);font-size:0.32em;color:var(--text-3);margin-left:6px;letter-spacing:0.06em;">M</span></div>
      <div class="scenario-ev-lbl">Expected EV range</div>
      <div class="scenario-meta-row"><span class="lbl">Founder retention</span><span class="val">${s.retention_pct}%</span></div>
      <div class="scenario-meta-row"><span class="lbl">Hold period</span><span class="val">${s.hold_period}</span></div>
      <div class="scenario-meta-row"><span class="lbl">Founder role</span><span class="val">${s.founder_role_post}</span></div>
      <ul class="scenario-impl">
        ${s.implications.map(im => `<li>${im}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}
function wireScenarios() {
  const grid = $('#scenarioGrid');
  if (!grid) return;
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.scenario-card');
    if (!card) return;
    $$('.scenario-card', grid).forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    const sid = card.dataset.scenario;
    const s = (DATA.scenarios || []).find(x => x.id === sid);
    if (s) {
      const mid = (s.ev_low_m + s.ev_high_m) / 2;
      const tv = $('#wfTv');
      if (tv) {
        tv.value = mid.toFixed(2);
        tv.dispatchEvent(new Event('input'));
      }
    }
  });
}

/* ─── Net proceeds waterfall ─── */
function renderWaterfall(d) {
  const sec = $('#waterfall');
  if (!sec || !d.waterfall) { if (sec) sec.style.display = 'none'; return; }
  const w = d.waterfall;
  const sel = $('#wfState');
  if (sel && !sel.dataset.built) {
    sel.innerHTML = (w.states || []).map(s => `<option value="${s.rate}" ${s.name === w.default_state ? 'selected' : ''}>${s.name} · ${s.rate}%</option>`).join('');
    sel.dataset.built = '1';
  }
  $('#wfTv').value    = w.default_tv_m;
  $('#wfOwn').value   = w.default_ownership_pct;
  $('#wfBasis').value = w.default_basis_k;
  updateWaterfall();
}
function updateWaterfall() {
  const w = DATA.waterfall;
  if (!w) return;
  const tv = parseFloat($('#wfTv').value);
  const own = parseFloat($('#wfOwn').value);
  const ownFrac = own / 100;
  const basisK = parseFloat($('#wfBasis').value);
  const state = parseFloat($('#wfState').value);

  const wcPct = w.working_capital_peg_pct;
  const debt = w.debt_outstanding_m;
  const closing = w.closing_costs_m;
  const feePct = (DATA.success_fee_pct || 3.5) / 100;
  const fedPct = (w.federal_cap_gains_pct || 20) / 100;

  const wc = tv * wcPct / 100;
  const fee = tv * feePct;
  const afterDeductions = tv - wc - debt - fee - closing;
  const founderGross = afterDeductions * ownFrac;
  const basisM = (basisK / 1000) * ownFrac;
  const taxable = Math.max(0, founderGross - basisM);
  const fedTax = taxable * fedPct;
  const stateTax = taxable * (state / 100);
  const founderNet = founderGross - fedTax - stateTax;

  const steps = [
    { lbl: ['Transaction', 'value'],            t: 'pos',   top: tv,              bot: 0,                          val: tv },
    { lbl: ['Working', 'capital peg'],          t: 'neg',   top: tv,              bot: tv - wc,                    val: -wc },
    { lbl: ['Existing', 'debt'],                t: 'neg',   top: tv - wc,         bot: tv - wc - debt,             val: -debt },
    { lbl: ['Success', `fee ${(feePct*100).toFixed(1)}%`], t: 'neg', top: tv - wc - debt, bot: tv - wc - debt - fee, val: -fee },
    { lbl: ['Closing', 'costs'],                t: 'neg',   top: afterDeductions + closing, bot: afterDeductions,  val: -closing },
    { lbl: [`× ${own}%`, 'ownership'],          t: 'split', top: founderGross,    bot: 0,                          val: founderGross },
    { lbl: ['Federal', `cap gains ${(fedPct*100).toFixed(0)}%`], t: 'neg', top: founderGross,    bot: founderGross - fedTax, val: -fedTax },
    { lbl: ['State', `tax ${state}%`],          t: 'neg',   top: founderGross - fedTax, bot: founderNet,           val: -stateTax },
    { lbl: ['Founder', 'net'],                  t: 'net',   top: founderNet,      bot: 0,                          val: founderNet }
  ];
  const maxH = tv;
  const fmt = (v) => {
    const abs = Math.abs(v);
    if (abs >= 1) return '$' + abs.toFixed(2) + 'M';
    return '$' + Math.round(abs * 1000) + 'K';
  };
  $('#wfChart').innerHTML = steps.map(s => {
    const topPct = (s.top / maxH) * 100;
    const heightPct = ((s.top - s.bot) / maxH) * 100;
    const offsetPct = Math.max(0, 100 - topPct);
    const valStr = (s.val < 0 ? '−' : '') + fmt(s.val);
    return `
      <div class="wf-step ${s.t}">
        <div class="wf-bar-track">
          <div class="wf-bar ${s.t}" style="top:${offsetPct.toFixed(2)}%;height:${Math.max(heightPct, 0.4).toFixed(2)}%;"></div>
        </div>
        <div class="wf-step-lbl">${s.lbl[0]}<br>${s.lbl[1]}</div>
        <div class="wf-step-val ${s.t}">${valStr}</div>
      </div>
    `;
  }).join('');
  $('#wfTvOut').textContent = tv.toFixed(2);
  $('#wfOwnOut').textContent = own.toFixed(0);
  $('#wfBasisOut').textContent = basisK.toFixed(0);
  $('#wfBannerTv').textContent = '$' + tv.toFixed(2) + 'M';
  $('#wfBannerNet').textContent = founderNet.toFixed(2);
}
function wireWaterfall() {
  if (!DATA.waterfall) return;
  ['#wfTv', '#wfOwn', '#wfBasis', '#wfState'].forEach(sel => {
    const el = $(sel);
    if (!el) return;
    el.addEventListener('input', updateWaterfall);
    el.addEventListener('change', updateWaterfall);
  });
  $('#wfReset')?.addEventListener('click', () => {
    const w = DATA.waterfall;
    $('#wfTv').value = w.default_tv_m;
    $('#wfOwn').value = w.default_ownership_pct;
    $('#wfBasis').value = w.default_basis_k;
    const sel = $('#wfState');
    const def = w.states.find(s => s.name === w.default_state);
    if (sel && def) sel.value = def.rate;
    updateWaterfall();
  });
}

/* ─── Share button + toast ─── */
function wireShareButton() {
  const btn = $('#shareBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const url = window.location.href;
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        copied = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (err) {}
    }
    showToast(copied ? 'Link copied to clipboard' : 'Could not copy — please copy URL manually');
  });
}
function showToast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ─── Audio narration player ─── */
async function wireAudioPlayer() {
  const player = $('#audioPlayer');
  const audio  = $('#audioEl');
  if (!player || !audio) return;
  const sections = $$('section.deck-section');
  const audioPathFor = (sec) => `audio-narration/${sec.id}.mp3`;

  // Probe a single file to decide if narration is available at all.
  let probeOk = false;
  try {
    const r = await fetch(audioPathFor(sections[0]), { method: 'HEAD' });
    probeOk = r.ok;
  } catch {}
  if (!probeOk) return; // silent — no audio files dropped in yet

  // Cache HEAD availability for each section
  const availability = {};
  await Promise.all(sections.map(async (sec) => {
    try {
      const r = await fetch(audioPathFor(sec), { method: 'HEAD' });
      availability[sec.id] = r.ok;
    } catch { availability[sec.id] = false; }
  }));

  let currentSection = null;
  let dismissed = false;
  let autoAdvance = false;

  function switchTo(sec) {
    if (!sec || sec === currentSection || dismissed) return;
    currentSection = sec;
    if (!availability[sec.id]) {
      player.classList.remove('available');
      audio.pause(); audio.src = '';
      return;
    }
    audio.src = audioPathFor(sec);
    player.classList.add('available');
    $('#audioSec').textContent = `Section ${sec.dataset.section || ''}`;
    $('#audioTitle').textContent = sec.dataset.label || sec.id;
    $('#audioBar').style.width = '0';
    $('#audioPlay').textContent = '▶';
  }
  const io = new IntersectionObserver((entries) => {
    let best = null, bestRatio = 0;
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio > bestRatio) {
        bestRatio = e.intersectionRatio; best = e.target;
      }
    });
    if (best) switchTo(best);
  }, { threshold: [0.3, 0.6, 0.9] });
  sections.forEach(s => io.observe(s));

  $('#audioPlay').addEventListener('click', () => {
    if (!audio.src) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });
  audio.addEventListener('play',  () => $('#audioPlay').textContent = '⏸');
  audio.addEventListener('pause', () => $('#audioPlay').textContent = '▶');
  audio.addEventListener('timeupdate', () => {
    if (audio.duration > 0) {
      $('#audioBar').style.width = ((audio.currentTime / audio.duration) * 100) + '%';
    }
  });
  audio.addEventListener('ended', () => {
    $('#audioPlay').textContent = '▶';
    $('#audioBar').style.width = '0';
    if (autoAdvance && currentSection) {
      const idx = sections.indexOf(currentSection);
      if (idx >= 0 && idx < sections.length - 1) {
        sections[idx + 1].scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
  $('#audioAuto').addEventListener('click', () => {
    autoAdvance = !autoAdvance;
    $('#audioAuto').classList.toggle('on', autoAdvance);
  });
  $('#audioClose').addEventListener('click', () => {
    dismissed = true;
    audio.pause();
    player.classList.remove('available');
  });
}

/* ─── Founder values: drag-to-reorder ─── */
function wireValuesDrag() {
  const grid = $('#valuesGrid');
  if (!grid) return;
  const originalHTML = grid.innerHTML;
  let dragSrc = null;

  function renumber() {
    $$('.value-card', grid).forEach((card, i) => {
      const num = card.querySelector('.value-num');
      if (num) num.textContent = String(i + 1).padStart(2, '0');
    });
  }
  function clearOverState() {
    $$('.value-card', grid).forEach(c => {
      c.classList.remove('drag-over-left', 'drag-over-right');
    });
  }
  function attach() {
    $$('.value-card', grid).forEach(card => {
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', (e) => {
        dragSrc = card;
        // brief delay so the browser captures the current visual state for the ghost
        setTimeout(() => card.classList.add('dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ''); // Firefox requires data
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        clearOverState();
        dragSrc = null;
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!dragSrc || card === dragSrc) return;
        const r = card.getBoundingClientRect();
        const isLeft = e.clientX < r.left + r.width / 2;
        card.classList.toggle('drag-over-left',  isLeft);
        card.classList.toggle('drag-over-right', !isLeft);
      });
      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over-left', 'drag-over-right');
      });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!dragSrc || card === dragSrc) return;
        const r = card.getBoundingClientRect();
        const before = e.clientX < r.left + r.width / 2;
        grid.insertBefore(dragSrc, before ? card : card.nextSibling);
        renumber();
        clearOverState();
        const reset = $('#valuesReset');
        if (reset) reset.classList.add('touched');
      });
    });
  }
  attach();
  const reset = $('#valuesReset');
  if (reset) reset.addEventListener('click', () => {
    grid.innerHTML = originalHTML;
    reset.classList.remove('touched');
    attach();
  });
}

/* ─── Sparklines for value drivers ─── */
function renderSpark(spark) {
  if (!spark) return '';
  if (spark.type === 'line') {
    const data = spark.data;
    if (!data || data.length < 2) return '';
    const W = 100, H = 28, PAD = 2;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
      return [x, y];
    });
    const lineStr = pts.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const areaStr = `0,${H} ${lineStr} ${W},${H}`;
    const last = pts[pts.length - 1];
    const trend = data[data.length - 1] - data[0];
    const trendStr = (trend > 0 ? '+' : '') + (trend < 10 ? trend.toFixed(1) : Math.round(trend)) + (spark.unit || '');
    return `
      <div class="driver-spark">
        <div class="driver-spark-vis">
          <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
            <polygon class="spark-area" points="${areaStr}" />
            <polyline class="spark-line" points="${lineStr}" />
            <circle class="spark-dot" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="1.8" />
          </svg>
        </div>
        ${spark.caption ? `<div class="driver-spark-caption"><span>${spark.caption}</span><span class="delta">${trendStr}</span></div>` : ''}
      </div>
    `;
  } else if (spark.type === 'stacked') {
    const segs = spark.segments || [];
    if (!segs.length) return '';
    const total = segs.reduce((s, x) => s + x.value, 0) || 1;
    const colors = ['var(--accent)', 'var(--accent-2)', 'var(--secondary)', '#5C8870'];
    const segHTML = segs.map((s, i) =>
      `<span style="width:${(s.value/total*100).toFixed(1)}%;background:${colors[i % colors.length]};" title="${s.label}: ${s.value}%">${s.value >= 12 ? Math.round(s.value)+'%' : ''}</span>`
    ).join('');
    const labelStr = segs.map(s => `${s.label} ${s.value}%`).join(' · ');
    return `
      <div class="driver-spark">
        <div class="spark-stacked" role="img" aria-label="${spark.caption || ''}">${segHTML}</div>
        ${spark.caption ? `<div class="driver-spark-caption"><span>${spark.caption}</span><span class="delta">${labelStr}</span></div>` : ''}
      </div>
    `;
  }
  return '';
}

/* ─── Engagement fee calculator ─── */
function wireFeeCalc() {
  const tv = $('#feeTv');
  if (!tv) return;
  const pct  = DATA.success_fee_pct || 3.5;
  const fill = $('#feeFill');
  const lbl  = $('#feeTvLbl');
  const amt  = $('#feeAmount');
  const pctE = $('#feePct');
  const min  = parseFloat(tv.min);
  const max  = parseFloat(tv.max);
  pctE.textContent = `${pct}%`;
  function update() {
    const v = parseFloat(tv.value);
    const feeK = Math.round(v * (pct / 100) * 1000);
    lbl.textContent = `$${v.toFixed(2)}M`;
    amt.textContent = feeK.toLocaleString();
    fill.style.width = `${((v - min) / (max - min)) * 100}%`;
  }
  tv.addEventListener('input', update);
  $('#feeReset').addEventListener('click', () => { tv.value = '5.25'; update(); });
  update();
}

/* ─── Cover sizzle: word reveal + parallax glow ─── */
function wireCoverSizzle() {
  // Trigger the headline word reveal shortly after load
  const h = $('.cover-headline');
  if (h) {
    requestAnimationFrame(() => {
      setTimeout(() => h.classList.add('in'), 220);
    });
  }
  // Cursor-following glow: lerp target → current so motion feels smooth, not snappy
  const cover = $('#cover');
  if (!cover) return;
  let targetX = 78, targetY = 72;
  let curX = 78, curY = 72;
  let rafActive = false;
  function loop() {
    curX += (targetX - curX) * 0.08;
    curY += (targetY - curY) * 0.08;
    cover.style.setProperty('--glow-x', curX.toFixed(2) + '%');
    cover.style.setProperty('--glow-y', curY.toFixed(2) + '%');
    if (Math.abs(targetX - curX) > 0.05 || Math.abs(targetY - curY) > 0.05) {
      requestAnimationFrame(loop);
    } else {
      rafActive = false;
    }
  }
  cover.addEventListener('pointermove', (e) => {
    const r = cover.getBoundingClientRect();
    targetX = ((e.clientX - r.left) / r.width) * 100;
    targetY = ((e.clientY - r.top) / r.height) * 100;
    if (!rafActive) { rafActive = true; requestAnimationFrame(loop); }
  });
  cover.addEventListener('pointerleave', () => {
    targetX = 78; targetY = 72; // return to resting position
    if (!rafActive) { rafActive = true; requestAnimationFrame(loop); }
  });
}

/* ─── Stats count-up (Platform section) ─── */
function bootStatsAnimations() {
  observeOnce('.stats-grid', (grid) => {
    $$('.stat-value', grid).forEach((el, i) => {
      const raw = el.textContent.trim();
      const m = raw.match(/^(\D*)([\d.,]+)(.*)$/);
      if (!m) return;
      const [, pre, numStr, post] = m;
      if (!pre && !post) return; // skip bare years like 1982
      const cleanNum = numStr.replace(/,/g, '');
      const target = parseFloat(cleanNum);
      if (isNaN(target)) return;
      const decimals = cleanNum.includes('.') ? cleanNum.split('.')[1].length : 0;
      const start = performance.now();
      const dur = 1300 + i * 120;
      function tick(now) {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = target * eased;
        el.textContent = pre + (decimals === 0 ? Math.round(v) : v.toFixed(decimals)) + post;
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = raw;
      }
      requestAnimationFrame(tick);
    });
  });
}

/* ─── Process funnel ─── */
function bootFunnelAnimations() {
  observeOnce('.funnel', (el) => el.classList.add('in'));
}

/* ─── Roadmap bars + today label ─── */
function bootRoadmapAnimations() {
  observeOnce('.roadmap-bars', () => {
    $$('.roadmap-bar').forEach(b => b.classList.add('in'));
    setTimeout(() => {
      const marker = $('#roadmapToday');
      if (marker) marker.classList.add('ready');
    }, 1300);
  });
}

function wireRoadmapToday() {
  const bars = $('#roadmapBars');
  const marker = $('#roadmapToday');
  if (!bars || !marker) return;
  const TOTAL_WEEKS = 26;
  let weekVal = 4; // default position

  function phaseForWeek(w) {
    const r = (DATA.roadmap || []).find(s => w >= s.weeks_start && w <= s.weeks_end);
    return r ? r.label : '—';
  }
  function update() {
    const pct = ((weekVal - 0.5) / TOTAL_WEEKS) * 100;
    marker.style.left = `${pct}%`;
    $('#roadmapTodayWeek').textContent = `Week ${weekVal}`;
    $('#roadmapTodayPhase').textContent = phaseForWeek(weekVal);
  }
  function setFromX(clientX) {
    const rect = bars.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    weekVal = Math.max(1, Math.min(TOTAL_WEEKS, Math.round(ratio * TOTAL_WEEKS + 0.5)));
    update();
  }

  let dragging = false;
  marker.addEventListener('pointerdown', (e) => {
    dragging = true;
    marker.setPointerCapture(e.pointerId);
    marker.classList.add('dragging');
  });
  marker.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    setFromX(e.clientX);
  });
  marker.addEventListener('pointerup', (e) => {
    dragging = false;
    marker.classList.remove('dragging');
    marker.releasePointerCapture(e.pointerId);
  });
  // also let user click anywhere on the track to jump the marker
  bars.addEventListener('click', (e) => {
    if (e.target === marker || marker.contains(e.target)) return;
    setFromX(e.clientX);
  });
  update();
}

/* ─── Count-up animation ─── */
function animateCount(el, to, opts = {}) {
  if (!el) return;
  const duration = opts.duration || 1100;
  const decimals = opts.decimals != null ? opts.decimals : 1;
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = to * eased;
    el.textContent = val.toFixed(decimals);
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = to.toFixed(decimals);
  }
  requestAnimationFrame(tick);
}

function bootValuationAnimations() {
  const v = DATA.valuation;
  // Trigger count-ups when val-hero (the big number block) enters view
  observeOnce('.val-range-block', () => {
    animateCount($('#valLow'),  v.range_low_m,  { decimals: 1, duration: 1200 });
    animateCount($('#valHigh'), v.range_high_m, { decimals: 1, duration: 1200 });
    animateCount($('#rev2025'), v.revenue_2025_m, { decimals: 2, duration: 1300 });
    animateCount($('#ebitda2025'), v.ebitda_2025_m, { decimals: 2, duration: 1300 });
    animateCount($('#ebitdaMultLow'),  v.ebitda_multiple_low,  { decimals: 1, duration: 1400 });
    animateCount($('#ebitdaMultHigh'), v.ebitda_multiple_high, { decimals: 1, duration: 1400 });
    animateCount($('#revMultLow'),  v.revenue_multiple_low,  { decimals: 1, duration: 1400 });
    animateCount($('#revMultHigh'), v.revenue_multiple_high, { decimals: 1, duration: 1400 });
  });
  // Trigger plot-bar reveal when the methodology plot enters view (further down the page)
  observeOnce('.val-viz', () => {
    $$('.val-plot-bar').forEach((b, i) => {
      setTimeout(() => b.classList.add('in'), 100 + i * 120);
    });
  });
}

/* Generic "observe once and fire" helper — anchors animation to when the actual element is in view */
function observeOnce(selector, fn, threshold = 0.35) {
  const el = typeof selector === 'string' ? $(selector) : selector;
  if (!el) return;
  let fired = false;
  const io = new IntersectionObserver((entries) => {
    if (fired) return;
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= threshold) {
        fired = true;
        fn(el);
        io.disconnect();
      }
    });
  }, { threshold: [threshold, Math.min(0.99, threshold + 0.2)] });
  io.observe(el);
}

/* ─── Methodology plot ─── */
const PLOT_MAX = 10; // $10M ruler max
function buildValAxis() {
  const axis = $('#valAxis');
  if (!axis) return;
  axis.innerHTML = '';
  for (let i = 0; i <= PLOT_MAX; i++) {
    const tick = document.createElement('div');
    tick.className = 'val-axis-tick';
    tick.style.left = `${(i / PLOT_MAX) * 100}%`;
    axis.appendChild(tick);
    if (i % 2 === 0) {
      const lbl = document.createElement('div');
      lbl.className = 'val-axis-label';
      lbl.style.left = `${(i / PLOT_MAX) * 100}%`;
      lbl.textContent = i === 0 ? '$0' : `$${i}M`;
      axis.appendChild(lbl);
    }
  }
}
function positionPlot(v) {
  const setBar = (id, lo, hi) => {
    const el = $(id);
    if (!el) return;
    el.style.left = `${(lo / PLOT_MAX) * 100}%`;
    el.style.width = `${((hi - lo) / PLOT_MAX) * 100}%`;
  };
  setBar('#vpBarBlended', v.range_low_m, v.range_high_m);
  setBar('#vpBarEbitda',  v.ebitda_implied_low_m, v.ebitda_implied_high_m);
  setBar('#vpBarRevenue', v.revenue_implied_low_m, v.revenue_implied_high_m);
  const fmt = (a, b) => `$${a.toFixed(1)}M – $${b.toFixed(1)}M`;
  if ($('#vpHeadlineImpl')) $('#vpHeadlineImpl').textContent = fmt(v.range_low_m, v.range_high_m);
  if ($('#vpEbitdaImpl'))   $('#vpEbitdaImpl').textContent   = fmt(v.ebitda_implied_low_m, v.ebitda_implied_high_m);
  if ($('#vpRevenueImpl'))  $('#vpRevenueImpl').textContent  = fmt(v.revenue_implied_low_m, v.revenue_implied_high_m);
}

/* ─── Sensitivity slider ─── */
function wireSensitivity() {
  const v = DATA.valuation;
  const lowEl = $('#multLow');
  const highEl = $('#multHigh');
  const rangeEl = $('#sliderRange');
  if (!lowEl || !highEl) return;
  // Initialize from data
  lowEl.value  = v.ebitda_multiple_low;
  highEl.value = v.ebitda_multiple_high;
  const min = parseFloat(lowEl.min);
  const max = parseFloat(lowEl.max);
  const ebitdaBar = $('#vpBarEbitda');
  const ebitdaImplLbl = $('#vpEbitdaImpl');

  function update(source) {
    let lo = parseFloat(lowEl.value);
    let hi = parseFloat(highEl.value);
    if (lo >= hi - 0.1) {
      if (source === 'low')  { lo = hi - 0.1; lowEl.value  = lo.toFixed(1); }
      else                   { hi = lo + 0.1; highEl.value = hi.toFixed(1); }
    }
    const implLo = v.ebitda_2025_m * lo;
    const implHi = v.ebitda_2025_m * hi;
    $('#multReadout').textContent = `${lo.toFixed(1)}x – ${hi.toFixed(1)}x`;
    $('#tweakLow').textContent  = implLo.toFixed(2);
    $('#tweakHigh').textContent = implHi.toFixed(2);
    const loPct = ((lo - min) / (max - min)) * 100;
    const hiPct = ((hi - min) / (max - min)) * 100;
    rangeEl.style.left = `${loPct}%`;
    rangeEl.style.width = `${hiPct - loPct}%`;
    // Update the EBITDA bar on the methodology plot live
    if (ebitdaBar) {
      ebitdaBar.style.left = `${(implLo / PLOT_MAX) * 100}%`;
      ebitdaBar.style.width = `${((implHi - implLo) / PLOT_MAX) * 100}%`;
    }
    if (ebitdaImplLbl) ebitdaImplLbl.textContent = `$${implLo.toFixed(1)}M – $${implHi.toFixed(1)}M`;
  }
  lowEl.addEventListener('input', () => update('low'));
  highEl.addEventListener('input', () => update('high'));
  $('#tweakReset').addEventListener('click', () => {
    lowEl.value  = v.ebitda_multiple_low;
    highEl.value = v.ebitda_multiple_high;
    update('low');
  });
  update('low');
}

/* ─── Render ─── */
function render(d) {
  // Cover
  $('#cv-prep').textContent = d.cover.eyebrow;
  $('#cv-client').textContent = d.client.company_name;
  $('#cv-industry').textContent = d.client.industry;
  $('#cv-date').textContent = fmtDate(d.client.prepared_date);
  $('#cv-type').textContent = d.client.deck_type;
  // Split headline into word-spans for staggered reveal. Continuous index across both lines.
  let wIdx = 0;
  const wrapWords = (text) => text.split(/\s+/).map(w => `<span class="word" style="--d:${(wIdx++)*70}ms">${w}</span>`).join(' ');
  $('#cv-h1').innerHTML = wrapWords(d.cover.headline_line_1);
  $('#cv-h2').innerHTML = wrapWords(d.cover.headline_line_2);
  $('#cv-sub').textContent = d.cover.subhead;
  $('#cv-team').innerHTML = d.team.map(m => `
    <div class="cover-team-member">${m.name}<span class="role">${m.title}</span></div>
  `).join('');

  // Team
  $('#teamGrid').innerHTML = d.team.map(m => `
    <div class="team-card">
      <div class="team-avatar">${m.photo ? `<img src="${m.photo}" alt="${m.name}" loading="lazy">` : m.initials}</div>
      <div class="team-name">${m.name}</div>
      <div class="team-title">${m.title}</div>
      <div class="team-role-tag">${m.accent_role}</div>
      <ul class="team-bullets">${m.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
    </div>
  `).join('');

  // Platform stats
  $('#statsGrid').innerHTML = d.platform_stats.map(s => `
    <div class="stat">
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
      <div class="stat-detail">${s.detail}</div>
    </div>
  `).join('');

  // Founder values
  $('#valuesGrid').innerHTML = d.founder_values.map(v => `
    <div class="value-card">
      <div class="value-num">${v.id}</div>
      <div class="value-title">${v.title}</div>
      <div class="value-body">${v.body}</div>
    </div>
  `).join('');
  $('#valuesQuote').textContent = `“${d.founder_values_pull_quote}”`;

  // Buyers
  $('#buyersGrid').innerHTML = d.buyers.map(b => `
    <div class="buyer-card">
      <div class="buyer-category">${b.category}</div>
      <div class="buyer-headline">${b.headline}</div>
      <div class="buyer-body">${b.body}</div>
      ${(b.stats && b.stats.length) ? `
        <div class="buyer-stats">
          ${b.stats.map(s => `
            <div class="buyer-stat">
              <div class="buyer-stat-lbl">${s.label}</div>
              <div class="buyer-stat-val">${s.value}</div>
            </div>
          `).join('')}
        </div>` : ''}
    </div>
  `).join('');
  $('#buyersTakeaway').textContent = `“${d.buyers_takeaway}”`;

  // Process
  $('#processGrid').innerHTML = d.process_steps.map(s => `
    <div class="process-step">
      <div class="process-num">${s.id}</div>
      <div class="process-title">${s.title}</div>
      <div class="process-body">${s.body}</div>
    </div>
  `).join('');
  // Funnel: width per tier based on midpoint of count range (sqrt scaling so the bottom doesn't disappear)
  function parseMid(s) {
    const m = s.match(/(\d+(?:\.\d+)?)\s*[–\-]\s*(\d+(?:\.\d+)?)/);
    if (m) return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
    const single = s.match(/(\d+(?:\.\d+)?)/);
    return single ? parseFloat(single[1]) : 1;
  }
  const mids = d.process_funnel.map(f => parseMid(f.value));
  const maxMid = Math.max(...mids);
  const widths = mids.map(m => Math.max(0.14, Math.sqrt(m / maxMid)));
  $('#funnelGrid').innerHTML = d.process_funnel.map((f, i) => `
    <div class="funnel-step">
      <div class="funnel-value">${f.value}</div>
      <div class="funnel-tier-wrap"><div class="funnel-tier" style="--w: ${(widths[i]*100).toFixed(1)}%;"></div></div>
      <div class="funnel-label">${f.label}</div>
    </div>
  `).join('');

  // Drivers
  $('#driversGrid').innerHTML = d.value_drivers.map(v => `
    <div class="driver-card">
      <div class="driver-icon"></div>
      <div class="driver-title">${v.title}</div>
      <div class="driver-body">${v.body}</div>
      ${renderSpark(v.spark)}
    </div>
  `).join('');

  // Valuation
  const v = d.valuation;
  $('#valLow').textContent = v.range_low_m.toFixed(1);
  $('#valHigh').textContent = v.range_high_m.toFixed(1);
  $('#valApproach').textContent = v.approach;
  $('#valCaveat').textContent = v.caveat;
  $('#rev2025').textContent = v.revenue_2025_m.toFixed(2);
  $('#revYoy').textContent = `+${v.revenue_yoy_pct}% YoY`;
  $('#ebitda2025').textContent = v.ebitda_2025_m.toFixed(2);
  $('#ebitdaMargin').textContent = `${v.ebitda_margin_pct}% margin`;
  $('#ebitdaMultLow').textContent = v.ebitda_multiple_low.toFixed(1);
  $('#ebitdaMultHigh').textContent = v.ebitda_multiple_high.toFixed(1);
  $('#ebitdaImpl').textContent = `$${v.ebitda_implied_low_m.toFixed(1)}M–$${v.ebitda_implied_high_m.toFixed(1)}M`;
  $('#revMultLow').textContent = v.revenue_multiple_low.toFixed(1);
  $('#revMultHigh').textContent = v.revenue_multiple_high.toFixed(1);
  $('#revImpl').textContent = `$${v.revenue_implied_low_m.toFixed(1)}M–$${v.revenue_implied_high_m.toFixed(1)}M`;
  $('#valNorm').textContent = v.normalization_note;
  $('#valSource').textContent = `Source: ${v.source}`;

  // Terms
  $('#termsTable').innerHTML = d.engagement_terms.map(t => `
    <div class="terms-row">
      <div class="terms-key">${t.term}</div>
      <div class="terms-value">${t.value}</div>
      <div class="terms-detail">${t.detail}</div>
    </div>
  `).join('');

  // Roadmap
  const totalWeeks = 26;
  const barsHTML = d.roadmap.map((r, i) => {
    const left = ((r.weeks_start - 1) / totalWeeks) * 100;
    const width = ((r.weeks_end - r.weeks_start + 1) / totalWeeks) * 100;
    return `<div class="roadmap-bar b${i+1}" style="left:${left}%;width:${width}%;">${r.label}</div>`;
  }).join('');
  $('#roadmapBars').innerHTML = barsHTML + `
    <div class="roadmap-today" id="roadmapToday">
      <div class="roadmap-today-line"></div>
      <div class="roadmap-today-handle"></div>
      <div class="roadmap-today-label">
        <span class="roadmap-today-week" id="roadmapTodayWeek">Week 4</span>
        <span class="roadmap-today-phase" id="roadmapTodayPhase">Readiness</span>
      </div>
    </div>`;
  $('#roadmapGrid').innerHTML = d.roadmap.map((r, i) => `
    <div class="roadmap-card c${i+1}">
      <div class="roadmap-label">${r.id} · ${r.window}</div>
      <div class="roadmap-title">${r.label}</div>
      <div class="roadmap-body">${r.body}</div>
    </div>
  `).join('');
  $('#roadmapCta').textContent = d.roadmap_cta;

  // Disclaimer
  $('#disclaimerBody').textContent = d.disclaimer;

  // New sections
  renderSnapshot(d);
  renderDealsWall(d);
  renderRisks(d);
  renderComparables(d);
  renderScenarios(d);
  renderWaterfall(d);
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

/* ─── Side nav build + scrollspy ─── */
function wireNav() {
  // Auto-number section data attribute from DOM order; hide any section that opted out via display:none
  const all = $$('section.deck-section');
  const sections = all.filter(s => s.style.display !== 'none');
  sections.forEach((sec, i) => {
    sec.dataset.section = String(i + 1).padStart(2, '0');
  });
  const tot = $('#totSec'); if (tot) tot.textContent = String(sections.length).padStart(2, '0');

  const nav = $('#sideNav');
  nav.innerHTML = sections.map(s => `
    <a class="dot" href="#${s.id}" data-target="${s.id}">
      <span class="label">${s.dataset.label}</span>
    </a>
  `).join('');

  const dots = $$('.dot', nav);
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio > 0.45) {
        const id = e.target.id;
        dots.forEach(d => d.classList.toggle('active', d.dataset.target === id));
        const num = e.target.dataset.section;
        $('#curSec').textContent = num;
      }
    });
  }, { threshold: [0.45, 0.6] });
  sections.forEach(s => io.observe(s));
}

/* ─── Reveal-on-scroll ─── */
function wireReveal() {
  const els = $$('.reveal, .reveal-stagger');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        if (e.target.classList.contains('reveal-stagger') === false) {
          io.unobserve(e.target);
        } else {
          io.unobserve(e.target);
        }
      }
    });
  }, { threshold: 0.18 });
  els.forEach(el => io.observe(el));
}

/* ─── Keyboard nav ─── */
function wireKeyboard() {
  const sections = $$('section.deck-section');
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (['ArrowDown','PageDown',' '].includes(e.key)) {
      e.preventDefault(); goTo(1, sections);
    } else if (['ArrowUp','PageUp'].includes(e.key)) {
      e.preventDefault(); goTo(-1, sections);
    } else if (e.key === 'Home') {
      sections[0].scrollIntoView({behavior:'smooth'});
    } else if (e.key === 'End') {
      sections[sections.length-1].scrollIntoView({behavior:'smooth'});
    } else if (e.key.toLowerCase() === 'f') {
      togglePresent();
    } else if (e.key === 'Escape') {
      document.body.classList.remove('present-mode');
    }
  });
}
function goTo(dir, sections) {
  const y = window.scrollY + window.innerHeight / 3;
  let curIdx = 0;
  sections.forEach((s, i) => { if (s.offsetTop <= y) curIdx = i; });
  const next = Math.max(0, Math.min(sections.length - 1, curIdx + dir));
  sections[next].scrollIntoView({behavior:'smooth'});
}

/* ─── Present toggle ─── */
function wirePresent() {
  $('#presentBtn').addEventListener('click', togglePresent);
}
function togglePresent() {
  const on = document.body.classList.toggle('present-mode');
  $('#presentBtn').textContent = on ? 'Exit' : 'Present';
  if (on && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(()=>{});
  } else if (!on && document.fullscreenElement) {
    document.exitFullscreen().catch(()=>{});
  }
}

/* ─── Fallback (in case data.json fails to load from file:// in some browsers) ─── */
const FALLBACK_DATA = {
  client: { company_name: "Company A", industry: "Specialty Coffee, Multi-Unit Retail", prepared_date: "2026-05-15", deck_type: "Sell-Side Pitch" },
  cover: { eyebrow: "Prepared for", headline_line_1: "You built the business.", headline_line_2: "We help you choose the right outcome.", subhead: "Founder-led advice. Institutional banking execution." },
  team: [
    { name:"Conor Miller", title:"Managing Director", initials:"CM", photo:"team-photos/conor-miller.jpg", accent_role:"Operating", bullets:["20+ years C-level operating, strategy, and M&A","COO of Zamp Solar; scaled and exited to Dometic","Founder of xStrategy, LJ3 Media, and WakeMAKERS"]},
    { name:"Skyler Pinnick", title:"Senior Advisor", initials:"SP", photo:"team-photos/skyler-pinnick.jpg", accent_role:"Tech & Consumer", bullets:["20+ years building, scaling, and exiting in tech, media, and consumer","Co-founded Vidigo (acquired via RTO); scaled Phantom Farms (acquired by C21)","Former CMO and board member of two public companies"]},
    { name:"Jared Peterson", title:"Principal", initials:"JP", photo:"team-photos/jared-peterson.jpg", accent_role:"Strategy & Ops", bullets:["20+ years in business strategy, marketing, e-commerce, and operations","Co-founded Cairn; acquired by Outside, Inc. (2021)","Decade at Apple in IT/ops, including the Apple Watch launch"]}
  ],
  platform_stats: [
    { value:"1982", label:"Founded", detail:"Senior bankers lead every engagement"},
    { value:"400+", label:"Collective deals completed", detail:"Registered broker/dealer"},
    { value:"$6B", label:"Transaction volume", detail:"Buyer reach across types and geographies"},
    { value:"US + EU", label:"Nationwide + M&A Worldwide reach", detail:"Sector depth in consumer & multi-unit"}
  ],
  founder_values: [
    { id:"01", title:"Protect the brand", body:"The coffee, the experience, the reputation in every neighborhood you serve."},
    { id:"02", title:"Reward the risk", body:"A valuation and structure that reflects what you actually built — not a discount."},
    { id:"03", title:"Find the right buyer", body:"A partner whose vision for the next chapter aligns with the one you started."},
    { id:"04", title:"Minimize disruption", body:"A confidential, disciplined process that does not pull you off the floor."},
    { id:"05", title:"Preserve culture & team", body:"The baristas, managers, and roasters who made this work get a future too."},
    { id:"06", title:"Certainty to close", body:"A counterparty and structure that gets to signed, funded, and done."}
  ],
  founder_values_pull_quote: "We know what it feels like to build the business. Now we help you choose the right outcome.",
  buyers: [
    { category:"Strategics", headline:"Coffee operators & adjacent F&B", body:"Synergies on roasting, supply chain, and footprint. Move quickly when the fit is right.", stats:[{label:"Typical multiple",value:"5–7x EBITDA"},{label:"Decision speed",value:"4–8 weeks"},{label:"Hold period",value:"Permanent"}]},
    { category:"Private Equity", headline:"Platforms and add-on sponsors", body:"Underwrite store-model repeatability. Pay for clean economics and a credible growth runway.", stats:[{label:"Typical multiple",value:"4–6x EBITDA"},{label:"Hold period",value:"4–7 years"},{label:"Active sponsors",value:"100+ in F&B"}]},
    { category:"Family Offices", headline:"Patient capital, lifestyle conviction", body:"Often comfortable with operator-led structures and longer hold periods than PE.", stats:[{label:"Typical multiple",value:"4–5x EBITDA"},{label:"Hold period",value:"10+ years"},{label:"Structure flex",value:"Rollover-friendly"}]},
    { category:"International", headline:"European / Asian acquirers", body:"M&A Worldwide network reach. Premiums for brand stories that travel beyond the home market.", stats:[{label:"Typical multiple",value:"5–8x EBITDA"},{label:"Decision speed",value:"8–12 weeks"},{label:"Brand premium",value:"Yes"}]}
  ],
  buyers_takeaway: "Multiple credible bidders at the table is the single biggest determinant of price.",
  process_steps: [
    { id:"01", title:"Build the story", body:"Financial cleanup and QoE-readiness. Story development around brand, density, and unit economics. Buyer list across strategic, PE, family office, and international."},
    { id:"02", title:"Run the field", body:"Parallel outreach. Management meetings staged for tension. First-round bids guided to a tight, comparable structure so price emerges, not negotiated."},
    { id:"03", title:"Protect the outcome", body:"Best-and-final tightened against benchmarks. Diligence, working capital peg, structure, and rollover negotiated in parallel to get to signed, funded, done."}
  ],
  process_funnel: [
    { value:"40–60", label:"Buyers contacted"},
    { value:"8–12", label:"Management meetings"},
    { value:"3–5", label:"LOIs received"},
    { value:"1", label:"Signed deal"}
  ],
  value_drivers: [
    { title:"Same-store sales", body:"Trend, volatility, and seasonality — the floor under the multiple.", spark:{type:"line",data:[3.2,4.8,4.1,5.6,7.2,8.9],caption:"Same-store · last 6 Q",unit:"%"}},
    { title:"Store-level EBITDA", body:"Four-wall economics by vintage, format, and neighborhood.", spark:{type:"line",data:[12.1,13.4,14.0,15.2,16.1,17.4],caption:"4-wall margin · last 6 Q",unit:"pp"}},
    { title:"Unit economics", body:"AUVs, ticket, throughput, labor model, build cost, payback.", spark:{type:"line",data:[820,880,905,940,970,1010],caption:"AUV · last 6 Q ($K)",unit:"K"}},
    { title:"Brand & density", body:"Recognition in the markets you own; defensibility against entrants."},
    { title:"Real estate & lease", body:"Lease tail, occupancy cost, optionality on key locations."},
    { title:"Pipeline & whitespace", body:"Credible new-store roadmap with sites, capex, and ramp assumptions."},
    { title:"Team & systems", body:"Bench beyond the founder; POS, training, and supply chain that scale."},
    { title:"Channel mix", body:"Wholesale, e-comm, and CPG channels that diversify the platform.", spark:{type:"stacked",segments:[{label:"In-store",value:72},{label:"Wholesale",value:14},{label:"E-comm",value:9},{label:"CPG",value:5}],caption:"Revenue mix · 2025"}}
  ],
  valuation: {
    range_low_m:4.0, range_high_m:6.0,
    approach:"Blended EBITDA / revenue approach against trailing results.",
    caveat:"Subject to diligence, buyer feedback, working capital peg, and deal structure.",
    revenue_2025_m:10.0, revenue_yoy_pct:20.0,
    ebitda_2025_m:1.0, ebitda_margin_pct:10.0,
    ebitda_multiple_low:4.5, ebitda_multiple_high:6.0,
    ebitda_implied_low_m:4.5, ebitda_implied_high_m:6.0,
    revenue_multiple_low:0.5, revenue_multiple_high:0.8,
    revenue_implied_low_m:5.0, revenue_implied_high_m:8.0,
    normalization_note:"Sample normalization note. Actual figures load from the client sheet.",
    source:"Company A — illustrative only"
  },
  engagement_terms: [
    { term:"Retainer", value:"$8,000 monthly / launch", detail:"Keeps the process resourced; credit treatment finalized in the engagement letter."},
    { term:"Success Fee", value:"3.5% minimum of transaction value", detail:"Final schedule set in the engagement letter; majority of economics tied to a successful close."},
    { term:"Expenses", value:"Out-of-pocket only", detail:"Data room, travel, third-party diligence — with a budget agreed and approved up front."},
    { term:"Term", value:"Defined engagement period", detail:"Mutual termination rights and a tail covering buyers we introduced; exclusivity defined in the engagement letter."}
  ],
  engagement_closer:"We win when you win.",
  success_fee_pct: 3.5,
  retainer_monthly_usd: 8000,
  roadmap: [
    { id:"01", label:"Readiness", window:"Weeks 1–6", weeks_start:1, weeks_end:6, body:"Financials cleaned and normalized. QoE prep. Story, buyer list, and CIM drafted in parallel."},
    { id:"02", label:"Go to market", window:"Weeks 7–16", weeks_start:7, weeks_end:16, body:"Outreach, NDAs, CIM out, management meetings. First-round indications guided to a comparable structure."},
    { id:"03", label:"Close", window:"Weeks 17–26", weeks_start:17, weeks_end:26, body:"Best-and-final, exclusivity, diligence, working capital peg, definitive docs — signed and funded."}
  ],
  roadmap_cta:"Next step: a 60-minute working session to align on numbers, story, and timing.",
  disclaimer:"This presentation was prepared by FOCUS Investment Banking LLC for the benefit and internal use of the recipient. It is incomplete without reference to the oral briefing provided by FOCUS. Securities transactions are conducted by FOCUS Securities, LLC, an affiliated registered broker/dealer and member FINRA/SIPC."
};

/* ─── Password gate (client-side, free-tier friendly) ──────────────
   To CHANGE the access code: edit PITCH_PASSWORD below, then re-deploy.
   To DISABLE the gate entirely: set PITCH_PASSWORD = '' (empty string).
   Note: this is a casual gate, not network-level auth — anyone with
   browser dev tools can bypass it. For real auth, use Netlify Pro
   site protection or Vercel password-protected previews.
─────────────────────────────────────────────────────────────────── */
const PITCH_PASSWORD = 'aroma2026';
const GATE_KEY = 'fw-pitch-unlocked-v1';

/* While the gate is up we load data in the background. Rendering is deferred
   until the user enters the right access code so animations don't fire under
   the overlay. Two passwords are accepted: the per-client password from the
   loaded data (DATA.client.pitch_password), or the hardcoded fallback below
   (which also covers the offline / bundled-only case). */
let _dataPromise = null;
function ensureData() {
  if (!_dataPromise) _dataPromise = loadData();
  return _dataPromise;
}

function setupGate() {
  const gate = document.getElementById('pitchGate');
  if (!gate) return true;
  if (!PITCH_PASSWORD && !SHEET_API_URL) { gate.classList.add('hidden'); return true; }
  if (sessionStorage.getItem(GATE_KEY) === '1') {
    gate.classList.add('hidden');
    return true;
  }
  ensureData(); // warm up the network in the background
  const form = document.getElementById('gateForm');
  const input = document.getElementById('gateInput');
  const err = document.getElementById('gateErr');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.classList.remove('show');
    await ensureData();
    const liveCode = DATA && DATA.client && DATA.client.pitch_password;
    const ok = (liveCode && input.value === liveCode) || (input.value === PITCH_PASSWORD);
    if (ok) {
      sessionStorage.setItem(GATE_KEY, '1');
      gate.classList.add('hidden');
      renderAndWire();
    } else {
      err.textContent = 'Access code not recognized.';
      err.classList.add('show');
      input.select();
    }
  });
  return false;
}

if (setupGate()) boot();