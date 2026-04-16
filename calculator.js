// ── State ──────────────────────────────────────────────────────────────────
const state = { itemize: false, filing: 'single', realMode: false };

function setFiling(val) {
  state.filing = val;
  document.getElementById('btn-single').classList.toggle('active', val === 'single');
  document.getElementById('btn-married').classList.toggle('active', val === 'married');
  calculate();
}

function setItemize(val) {
  state.itemize = val;
  document.getElementById('btn-itemize-yes').classList.toggle('active', val);
  document.getElementById('btn-itemize-no').classList.toggle('active', !val);
  calculate();
}

function setRealMode(val) {
  state.realMode = val;
  document.getElementById('btn-nominal').classList.toggle('active', !val);
  document.getElementById('btn-real').classList.toggle('active', val);
  calculate();
}

// ── Formatters ─────────────────────────────────────────────────────────────
const fmt = (n, d = 0) =>
  n < 0 ? '-$' + Math.abs(n).toLocaleString('en-US', {maximumFractionDigits: d})
        : '$'  + n.toLocaleString('en-US', {maximumFractionDigits: d});

function labelFor(id, val) {
  const pct = ['invest','appreciate','rentincrease','inflation','proptaxgrowth',
               'rate','tax','maintenance','closing','selling','pmi','marginalrate','capgains'];
  const mo  = ['rent','renterins','homeins','hoa'];
  if (id === 'years')   return val + (val == 1 ? ' yr' : ' yrs');
  if (id === 'down')    return val + '%';
  if (id === 'term')    return val + ' yrs';
  if (id === 'deposit') return val + ' mo.';
  if (id === 'price')   return fmt(val);
  if (pct.includes(id)) return val + '%';
  if (mo.includes(id))  return fmt(val) + '/mo';
  return val;
}

// ── Tooltips ───────────────────────────────────────────────────────────────
const tooltips = {
  years:        'How long you plan to stay. Buying typically needs 5–7+ years to break even vs. renting.',
  invest:       'Expected annual return if you invest the down payment instead. S&P 500 has averaged ~7%/yr after inflation historically.',
  appreciate:   'US homes have appreciated ~3–4%/yr historically, though this varies widely by market.',
  rentincrease: 'US rents have risen ~2–3%/yr on average; recent years saw spikes of 5–10% in many metros.',
  inflation:    'Used to convert results to "real" (today\'s) dollars. US long-run average CPI inflation is ~3%.',
  proptaxgrowth:'Rate at which your property tax bill grows each year. CA (Prop 13) caps at 2%; many other states reassess annually at market value.',
  rent:         'Current US median rent is ~$1,900/mo nationally. Adjust to your local market.',
  renterins:    'Average US renter\'s insurance is ~$15–20/mo for standard coverage.',
  deposit:      'Most US landlords require 1–2 months\' rent upfront as a security deposit.',
  price:        'US median home price is ~$420k nationally; varies widely by metro.',
  down:         '20% avoids PMI. FHA loans allow as low as 3.5% down.',
  rate:         'Approximate 30-yr fixed mortgage rate as of early 2025. Check current rates with your lender.',
  term:         '30-year is the most common US mortgage. A 15-year saves significant interest but raises monthly payments.',
  pmi:          'Private Mortgage Insurance: required when down < 20%. Typically 0.5–1.5% of loan/yr. Automatically drops when you reach 20% equity of the original home price.',
  tax:          'US average property tax is ~1.0–1.1% of home value/yr. Ranges from ~0.3% (Hawaii) to 2.5%+ (NJ).',
  homeins:      'Average US homeowner\'s insurance is ~$1,400–1,800/yr (~$120–150/mo) for a median-priced home.',
  hoa:          'Varies widely — many single-family homes have no HOA. Condos often charge $200–600/mo.',
  maintenance:  'Common "1% rule": budget 1% of home value/yr for repairs, appliances, and general upkeep.',
  closing:      'Buyer closing costs typically run 2–5% of purchase price (title, escrow, lender fees, etc.).',
  selling:      'When you sell, agent commissions alone are typically 4–6% of sale price, plus closing costs. Often 5.5–6.5% total — a major cost frequently overlooked.',
  marginalrate: 'Your federal + state marginal income tax rate. Used to calculate mortgage interest deduction savings if you itemize. Common federal brackets: 22% (middle income), 24–32% (higher income).',
  capgains:     'Long-term capital gains rate on home profit above the exclusion ($250k single / $500k married). Most homeowners pay 0% or 15%; high earners pay 20%.',
};

// ── Slider wiring ──────────────────────────────────────────────────────────
const sliderIds = [
  'years','invest','appreciate','rentincrease','inflation','proptaxgrowth',
  'rent','renterins','deposit',
  'price','down','rate','term','pmi',
  'tax','homeins','hoa','maintenance','closing','selling',
  'marginalrate','capgains',
];

sliderIds.forEach(id => {
  const el  = document.getElementById(id);
  const vEl = document.getElementById('v-' + id);

  // Inject tooltip icon
  const field = el.closest('.field');
  const label = field.querySelector('label');
  if (label && tooltips[id]) {
    const firstNode = label.firstChild;
    const wrapper   = document.createElement('span');
    wrapper.className = 'label-left';
    const textSpan  = document.createElement('span');
    textSpan.textContent = firstNode.textContent;
    const tip       = document.createElement('span');
    tip.className   = 'tip';
    tip.setAttribute('tabindex', '0');
    tip.textContent = 'i';
    const tipText   = document.createElement('span');
    tipText.className   = 'tip-text';
    tipText.textContent = tooltips[id];
    tip.appendChild(tipText);
    wrapper.appendChild(textSpan);
    wrapper.appendChild(tip);
    label.replaceChild(wrapper, firstNode);
  }

  el.addEventListener('input', () => {
    vEl.textContent = labelFor(id, parseFloat(el.value));
    if (id === 'down') {
      document.getElementById('pmi-note').classList.toggle('show', parseFloat(el.value) < 20);
    }
    calculate();
  });
  vEl.textContent = labelFor(id, parseFloat(el.value));
});

// ── Core calc helpers ──────────────────────────────────────────────────────
function g(id) { return parseFloat(document.getElementById(id).value); }

function mortgagePayment(principal, annualRate, termYears) {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

// ── Main calculation ───────────────────────────────────────────────────────
function calculate() {
  const years          = g('years');
  const investRate     = g('invest')        / 100;
  const appreciateR    = g('appreciate')    / 100;
  const rentIncR       = g('rentincrease')  / 100;
  const inflationR     = g('inflation')     / 100;
  const propTaxGrowthR = g('proptaxgrowth') / 100;

  const monthlyRent    = g('rent');
  const renterIns      = g('renterins');
  const depositMo      = g('deposit');

  const homePrice      = g('price');
  const downPct        = g('down')          / 100;
  const mortRate       = g('rate');
  const termYears      = g('term');
  const propTaxRate    = g('tax')           / 100;
  const homeIns        = g('homeins');
  const hoa            = g('hoa');
  const maintPct       = g('maintenance')   / 100;
  const closingPct     = g('closing')       / 100;
  const sellingPct     = g('selling')       / 100;
  const pmiAnnualRate  = g('pmi')           / 100;
  const marginalRate   = g('marginalrate')  / 100;
  const capGainsRate   = g('capgains')      / 100;
  const { itemize, filing, realMode } = state;

  // Upfront costs
  const downPayment  = homePrice * downPct;
  const loanAmount   = homePrice - downPayment;
  const upfrontBuy   = downPayment + homePrice * closingPct;
  const upfrontRent  = monthlyRent * depositMo;
  const monthlyP     = mortgagePayment(loanAmount, mortRate, termYears);
  const monthlyMortR = mortRate / 100 / 12;
  const moInvReturn  = Math.pow(1 + investRate, 1 / 12) - 1;

  // Display-period accumulators
  let dispPMI = 0, dispTaxSavings = 0, dispPropTax = 0, dispMaint = 0, dispRentPaid = 0;

  // Final-year captures
  let homeEquityFinal = 0, renterPortFinal = 0, capGainsTaxFinal = 0, sellingCostFinal = 0;

  let breakEvenYear = null;
  const buyYearly = [], rentYearly = [];

  // Simulation state
  let bt = upfrontBuy, rt = upfrontRent;
  let rl = loanAmount, ri = upfrontBuy - upfrontRent;
  let cr = monthlyRent, hv = homePrice, yt = homePrice * propTaxRate;

  for (let yr = 1; yr <= 30; yr++) {
    const inPeriod    = yr <= years;
    const yearlyMaint = hv * maintPct;
    let yearBuy = 0, yearRent = 0;

    if (inPeriod) { dispPropTax += yt; dispMaint += yearlyMaint; dispRentPaid += cr * 12; }

    for (let mo = 0; mo < 12; mo++) {
      const ip     = rl * monthlyMortR;
      rl           = Math.max(0, rl - (monthlyP - ip));
      const pmiMo  = (downPct < 0.20 && rl > homePrice * 0.80) ? loanAmount * pmiAnnualRate / 12 : 0;
      const taxDed = itemize ? ip * marginalRate : 0;
      const buyMo  = monthlyP + homeIns + hoa + yearlyMaint / 12 + yt / 12 + pmiMo - taxDed;
      const rentMo = cr + renterIns;

      yearBuy  += buyMo;
      yearRent += rentMo;
      ri        = ri * (1 + moInvReturn) + (buyMo - rentMo);

      if (inPeriod) { dispPMI += pmiMo; dispTaxSavings += taxDed; }
    }

    bt += yearBuy;
    rt += yearRent;
    hv *= (1 + appreciateR);
    cr *= (1 + rentIncR);
    yt *= (1 + propTaxGrowthR);

    const sc   = hv * sellingPct;
    const cgt  = Math.max(0, hv - homePrice - (filing === 'married' ? 500000 : 250000)) * capGainsRate;
    const eq   = hv - rl - sc - cgt;
    const port = Math.max(0, ri - (upfrontBuy - upfrontRent));

    if (yr === years) {
      homeEquityFinal  = eq;
      renterPortFinal  = port;
      capGainsTaxFinal = cgt;
      sellingCostFinal = sc;
    }

    let buyNet  = bt - eq;
    let rentNet = rt - port;

    if (realMode) {
      const def = Math.pow(1 + inflationR, yr);
      buyNet  /= def;
      rentNet /= def;
    }

    buyYearly.push(buyNet);
    rentYearly.push(rentNet);

    if (breakEvenYear === null && buyNet <= rentNet) breakEvenYear = yr;
  }

  const buyNetFinal  = buyYearly[years - 1];
  const rentNetFinal = rentYearly[years - 1];
  const diff         = rentNetFinal - buyNetFinal;
  const suffix       = realMode ? ' (real $)' : '';

  // ── Update UI ──────────────────────────────────────────────────────────
  document.getElementById('res-years').textContent      = years;
  document.getElementById('res-mortgage').textContent   = fmt(Math.round(monthlyP));
  document.getElementById('res-buy-net').textContent    = fmt(Math.round(buyNetFinal));
  document.getElementById('res-rent-net').textContent   = fmt(Math.round(rentNetFinal));
  document.getElementById('res-equity').textContent     = fmt(Math.round(homeEquityFinal));
  document.getElementById('res-invest-val').textContent = fmt(Math.round(renterPortFinal));
  document.getElementById('res-breakeven').textContent  = breakEvenYear
    ? breakEvenYear + (breakEvenYear === 1 ? ' yr' : ' yrs') : '> 30 yrs';

  const verdict = document.getElementById('verdict');
  if (Math.abs(diff) < 5000) {
    verdict.className   = 'verdict tie';
    verdict.textContent = `Buying and renting are roughly equivalent over this period${suffix}.`;
  } else if (diff > 0) {
    verdict.className   = 'verdict buy-wins';
    verdict.textContent = `Buying saves ~${fmt(Math.round(Math.abs(diff)))} vs. renting over ${years} years${suffix}.`;
  } else {
    verdict.className   = 'verdict rent-wins';
    verdict.textContent = `Renting saves ~${fmt(Math.round(Math.abs(diff)))} vs. buying over ${years} years${suffix}.`;
  }

  // ── Breakdown table ────────────────────────────────────────────────────
  const tbody = document.getElementById('breakdown-body');

  function row(label, buy, rent, cls = '') {
    return `<tr class="${cls}"><td>${label}</td><td>${buy}</td><td>${rent}</td></tr>`;
  }

  const dash = '<span class="muted">—</span>';
  let html = '';
  html += row('Down payment',                fmt(Math.round(downPayment)),                                    dash);
  html += row('Closing costs (buy-in)',       fmt(Math.round(homePrice * closingPct)),                        dash);
  html += row('Security deposit',             dash,                                                            fmt(Math.round(upfrontRent)));
  html += row('Mortgage payments (P+I)',      fmt(Math.round(monthlyP * Math.min(termYears, years) * 12)),    dash);
  html += row('Rent paid',                    dash,                                                            fmt(Math.round(dispRentPaid)));
  html += row('Property taxes',              fmt(Math.round(dispPropTax)),                                    dash);
  html += row('PMI',                          dispPMI > 0 ? fmt(Math.round(dispPMI)) : '<span class="muted">n/a</span>', dash);
  html += row('Home insurance',              fmt(Math.round(homeIns * 12 * years)),                          fmt(Math.round(renterIns * 12 * years)));
  html += row('HOA fees',                    fmt(Math.round(hoa * 12 * years)),                              dash);
  html += row('Maintenance',                 fmt(Math.round(dispMaint)),                                      dash);
  html += row('Selling costs',               fmt(Math.round(sellingCostFinal)),                               dash);
  html += row('Capital gains tax',           capGainsTaxFinal > 0 ? fmt(Math.round(capGainsTaxFinal)) : '<span class="muted">$0</span>', dash);
  html += row('Mortgage interest tax savings',
    itemize && dispTaxSavings > 0 ? `<span class="green">+${fmt(Math.round(dispTaxSavings))}</span>` : '<span class="muted">not itemizing</span>',
    dash);
  html += row('Home equity gained (asset)',  `<span class="green">+${fmt(Math.round(homeEquityFinal))}</span>`, dash);
  html += row('Investment portfolio (asset)', dash, `<span class="green">+${fmt(Math.round(renterPortFinal))}</span>`);
  html += row('Net cost', fmt(Math.round(buyNetFinal)), fmt(Math.round(rentNetFinal)), 'net-row');

  tbody.innerHTML = html;

  drawChart(buyYearly.slice(0, years), rentYearly.slice(0, years), realMode);
}

// ── Chart ──────────────────────────────────────────────────────────────────
function drawChart(buyData, rentData, realMode) {
  const canvas = document.getElementById('chart');
  const ctx    = canvas.getContext('2d');
  const dpr    = window.devicePixelRatio || 1;
  const rect   = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width * dpr;
  canvas.height = 220 * dpr;
  ctx.scale(dpr, dpr);

  const W   = rect.width, H = 220;
  const pad = { top: 16, right: 20, bottom: 36, left: 70 };
  const iW  = W - pad.left - pad.right;
  const iH  = H - pad.top  - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  const allVals = [...buyData, ...rentData];
  const minV    = Math.min(0, ...allVals);
  const maxV    = Math.max(...allVals);
  const range   = maxV - minV || 1;

  const toY = v => pad.top + iH - ((v - minV) / range) * iH;
  const toX = i => pad.left + (i / (buyData.length - 1 || 1)) * iW;

  // Grid lines
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * iH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + iW, y); ctx.stroke();
    ctx.fillStyle = '#718096'; ctx.font = '11px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(fmt(Math.round((maxV - (i / 4) * range) / 1000)) + 'k', pad.left - 6, y + 4);
  }

  if (minV < 0) {
    const y0 = toY(0);
    ctx.strokeStyle = '#cbd5e0'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pad.left, y0); ctx.lineTo(pad.left + iW, y0); ctx.stroke();
    ctx.setLineDash([]);
  }

  const drawArea = (data, color) => {
    if (data.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(data[0]));
    data.forEach((v, i) => ctx.lineTo(toX(i), toY(v)));
    ctx.lineTo(toX(data.length - 1), toY(minV));
    ctx.lineTo(toX(0), toY(minV));
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  };

  const drawLine = (data, color) => {
    if (data.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(data[0]));
    data.forEach((v, i) => ctx.lineTo(toX(i), toY(v)));
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
  };

  drawArea(buyData,  'rgba(79,134,247,0.1)');
  drawArea(rentData, 'rgba(72,187,120,0.1)');
  drawLine(buyData,  '#4f86f7');
  drawLine(rentData, '#48bb78');

  // X-axis labels
  ctx.fillStyle = '#718096'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
  const step = Math.ceil(buyData.length / 6);
  for (let i = 0; i < buyData.length; i += step) {
    ctx.fillText('Yr ' + (i + 1), toX(i), H - pad.bottom + 16);
  }
  ctx.fillText('Yr ' + buyData.length, toX(buyData.length - 1), H - pad.bottom + 16);

  // Legend
  const tag = realMode ? ' (real $)' : '';
  ctx.font = '12px system-ui'; ctx.textAlign = 'left';
  ctx.fillStyle = '#4f86f7';  ctx.fillRect(pad.left, H - 14, 12, 3);
  ctx.fillText('Buy net cost' + tag, pad.left + 16, H - 10);
  ctx.fillStyle = '#48bb78';  ctx.fillRect(pad.left + 130, H - 14, 12, 3);
  ctx.fillText('Rent net cost' + tag, pad.left + 146, H - 10);
}

calculate();
window.addEventListener('resize', calculate);
