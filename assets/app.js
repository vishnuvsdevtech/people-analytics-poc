/* The Assessment — a simulation of the workforce-analytics stack.
 *
 * The point of the whole thing: a "risk score" is a weighted sum, and the
 * weights are a choice. Move them and a different set of people gets cut,
 * with the same data. Everything here is computed from the synthetic dataset
 * in assets/data.js; nothing is fetched.
 */
(() => {
  const D = window.DATA.employees;
  const $ = (s, r = document) => r.querySelector(s);
  const fmt = (n, d = 0) => Number(n).toFixed(d);

  /* ---------------- scoring ---------------- */
  const W = { att: 0.20, logs: 0.20, perf: 0.30, util: 0.20, eng: 0.10 };
  let cutPct = 20, sortKey = 'risk', sortDir = -1;

  const PRESETS = {
    balanced:  { att: 0.20, logs: 0.20, perf: 0.30, util: 0.20, eng: 0.10 },
    compliance:{ att: 0.50, logs: 0.30, perf: 0.10, util: 0.05, eng: 0.05 },
    performance:{ att: 0.05, logs: 0.05, perf: 0.50, util: 0.30, eng: 0.10 },
  };
  let presetName = 'balanced';

  const norm = (o) => { const s = o.att + o.logs + o.perf + o.util + o.eng; return { att: o.att / s, logs: o.logs / s, perf: o.perf / s, util: o.util / s, eng: o.eng / s }; };

  function penalties(e) {
    const att = Math.min(1, e.late_30d / 18) * 0.72 + Math.min(1, e.missing_punch / 4) * 0.18
              + Math.min(1, Math.max(0, 9 - Number(e.avg_in.slice(3))) / 40) * 0.10;
    const logs = (1 - e.logs_days / 30) * 0.50 + (1 - e.log_quality / 100) * 0.35
               + Math.min(1, e.auto_entries / 12) * 0.15;
    const perf = (5 - e.rating) / 4;
    const util = Math.max(0, (100 - e.utilisation) / 65);
    const eng = (5 - e.engagement) / 4;
    return { att, logs, perf, util, eng };
  }

  function scored(w = W) {
    const n = norm(w);
    return D.map((e) => {
      const p = penalties(e);
      const risk = 100 * (p.att * n.att + p.logs * n.logs + p.perf * n.perf + p.util * n.util + p.eng * n.eng);
      return { ...e, p, risk };
    });
  }

  const cutSet = (w, pct) => {
    const s = [...scored(w)].sort((a, b) => b.risk - a.risk);
    const k = Math.round(D.length * pct / 100);
    return new Set(s.slice(0, k).map((e) => e.id));
  };

  /* ---------------- tiny svg helpers ---------------- */
  const el = (t, a = {}, kids = []) => {
    const n = document.createElementNS('http://www.w3.org/2000/svg', t);
    for (const k in a) n.setAttribute(k, a[k]);
    kids.forEach((c) => n.appendChild(c));
    return n;
  };
  const txt = (s, x, y, cls = 'axis', anchor = 'start') => {
    const t = el('text', { x, y, class: cls, 'text-anchor': anchor });
    t.textContent = s; return t;
  };

  function bars(items, { w = 640, h = 190, pad = 26, color = '#5eead4', unit = '' } = {}) {
    const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'xMidYMid meet' });
    const max = Math.max(...items.map((i) => i.value), 1);
    const bw = (w - pad * 2) / items.length;
    items.forEach((it, i) => {
      const bh = ((h - pad * 2) * it.value) / max;
      const x = pad + i * bw + bw * 0.16;
      svg.appendChild(el('rect', { x, y: h - pad - bh, width: bw * 0.68, height: bh, rx: 2, fill: it.color || color, opacity: 0.85 }));
      svg.appendChild(txt(fmt(it.value) + unit, x + bw * 0.34, h - pad - bh - 5, 'axis', 'middle'));
      svg.appendChild(txt(it.label, x + bw * 0.34, h - pad + 13, 'axis', 'middle'));
    });
    return svg;
  }

  function scatter(points, { w = 640, h = 300, pad = 38, xLab = '', yLab = '' } = {}) {
    const svg = el('svg', { viewBox: `0 0 ${w} ${h}` });
    svg.appendChild(el('rect', { x: pad, y: pad * 0.4, width: w - pad * 2, height: h - pad * 1.4, fill: 'rgba(200,220,255,.02)', stroke: 'rgba(200,220,255,.10)' }));
    const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const px = (v) => pad + ((v - x0) / ((x1 - x0) || 1)) * (w - pad * 2);
    const py = (v) => h - pad + 10 - ((v - y0) / ((y1 - y0) || 1)) * (h - pad * 1.5);
    points.forEach((p) => {
      const c = el('circle', { cx: px(p.x), cy: py(p.y), r: p.r || 4.5, fill: p.color, opacity: 0.75 });
      c.appendChild(el('title')).textContent = p.tip;
      svg.appendChild(c);
    });
    svg.appendChild(txt(xLab, w / 2, h - 4, 'axis', 'middle'));
    svg.appendChild(txt(yLab, 10, 14));
    svg.appendChild(txt(fmt(x0), pad, h - pad + 12, 'axis', 'middle'));
    svg.appendChild(txt(fmt(x1), w - pad, h - pad + 12, 'axis', 'middle'));
    return svg;
  }

  /* ---------------- views ---------------- */
  const deptColor = { 'Edge AI': '#5eead4', Platform: '#8ea2ff', Mobile: '#f5b455', QA: '#f26d6d', DevOps: '#79d67c', 'Data Eng': '#c99bff' };

  function viewOverview() {
    const avg = (k) => D.reduce((s, e) => s + e[k], 0) / D.length;
    const bench = D.filter((e) => !e.billable).length;
    const highRisk = scored().filter((e) => e.risk > 55).length;
    const logsComplete = D.filter((e) => e.logs_days >= 28).length;

    const buckets = [40, 50, 60, 70, 80, 90, 100];
    const hist = buckets.map((b, i) => ({
      label: b + (i === buckets.length - 1 ? '+' : ''),
      value: D.filter((e) => e.utilisation >= b && e.utilisation < b + 10).length,
      color: b < 60 ? '#f26d6d' : b < 80 ? '#f5b455' : '#5eead4',
    }));

    const cutCards = ['compliance', 'balanced', 'performance'].map((k) => {
      const c = cutSet(PRESETS[k], cutPct);
      const hi = D.filter((e) => c.has(e.id) && e.rating >= 4.3).length;
      const named = D.filter((e) => c.has(e.id) && e.rating >= 4.3).map((e) => e.name).slice(0, 3).join(', ');
      return `<div class="card kpi ${hi > 0 ? 'warn' : 'good'}">
        <span>${k}-led</span><b>${hi}</b>
        <em>high performers (≥4.3) in the cut${named ? ' — ' + named : ''}</em></div>`;
    }).join('');

    return `
      <h2>Organisation snapshot — one row per record the HRMS holds</h2>
      <div class="grid g4">
        <div class="card kpi"><span>headcount</span><b>${D.length}</b><em>6 departments, Kochi-weighted</em></div>
        <div class="card kpi ${avg('utilisation') < 80 ? 'warn' : 'good'}"><span>avg utilisation</span><b>${fmt(avg('utilisation'), 1)}%</b><em>${bench} on bench (${fmt(100 * bench / D.length)}%)</em></div>
        <div class="card kpi ${avg('late_30d') > 3 ? 'warn' : 'good'}"><span>late arrivals /30d</span><b>${fmt(avg('late_30d'), 1)}</b><em>after 09:00, punch-based</em></div>
        <div class="card kpi ${logsComplete < D.length * 0.6 ? 'bad' : 'good'}"><span>logs complete</span><b>${logsComplete}/${D.length}</b><em>28+ of 30 days logged</em></div>
      </div>

      <h2>Utilisation distribution</h2>
      <div class="card" id="utilchart"></div>

      <h2>The same 48 people, three weighting choices, ${cutPct}% cut</h2>
      <div class="grid g4">${cutCards}</div>
      <p class="note" style="margin-top:12px">
        This is the whole argument. Nothing about the employees changed between those three
        numbers — only the weights did. A compliance-led model protects the top performers' work and
        cuts the irregular ones; a performance-led model does the opposite. Whoever configures the
        weights is the one deciding who leaves, and that decision is not in any dashboard.
      </p>`;
  }

  function viewAttendance() {
    const pts = D.map((e) => ({
      x: e.late_30d, y: e.rating, color: deptColor[e.dept] || '#8ea2ff',
      tip: `${e.name} — ${e.late_30d} late, rating ${e.rating}, logs ${e.logs_days}/30`,
      r: 3.4 + (100 - e.log_quality) / 40,
    }));
    const worst = [...D].sort((a, b) => b.late_30d - a.late_30d).slice(0, 8);
    const rows = worst.map((e) => `<tr class="row" data-id="${e.id}">
      <td class="name">${e.name}</td><td>${e.dept}</td>
      <td class="num">${e.late_30d}</td><td class="num">${e.avg_in}</td>
      <td class="num">${e.missing_punch}</td><td class="num">${e.logs_days}/30</td>
      <td class="num">${e.rating.toFixed(1)}</td>
      <td class="num">${e.utilisation}%</td></tr>`).join('');

    return `
      <h2>Late arrivals vs performance rating — the case that decides the argument</h2>
      <div class="card"><div id="scatter"></div>
        <div class="legend"><span>dot size = weaker worklog quality</span><span>colour = department</span></div>
      </div>
      <p class="note" style="margin-top:12px">
        The top-right of this plot is the uncomfortable one: people rated above 4 arriving late far
        more often than the average. If a compliance model gets a vote, those are the names that
        move first — and their manager's evidence is a punch log, not a project outcome.
      </p>
      <h2>Attendance exceptions, worst first</h2>
      <div class="card" style="padding:0;overflow-x:auto"><table>
        <thead><tr><th>name</th><th>dept</th><th>late</th><th>avg in</th><th>missed punch</th><th>logs</th><th>rating</th><th>util</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
  }

  function viewLogs() {
    const depts = [...new Set(D.map((e) => e.dept))];
    const items = depts.map((d) => {
      const list = D.filter((e) => e.dept === d);
      return { label: d.split(' ')[0], value: Math.round(list.reduce((s, e) => s + e.log_quality, 0) / list.length) };
    });
    const autos = [...D].sort((a, b) => b.auto_entries - a.auto_entries).slice(0, 8);
    const rows = autos.map((e) => `<tr class="row" data-id="${e.id}">
      <td class="name">${e.name}</td><td>${e.dept}</td>
      <td class="num">${e.auto_entries}</td><td class="num">${e.logs_days}/30</td>
      <td class="num">${e.log_quality}</td><td class="num">${e.misassigned}</td>
      <td class="num">${e.rating.toFixed(1)}</td></tr>`).join('');

    return `
      <h2>Worklog quality by department (0–100)</h2>
      <div class="card"><div id="bars"></div></div>
      <p class="note" style="margin-top:12px">
        Quality here means the description is specific enough to bill against — a task, a module, a
        client deliverable. A log that says "worked on project" scores near zero on that basis, and
        a system ranking on this metric cannot tell the difference between someone who did nothing
        and someone who did everything but hated admin.
      </p>
      <h2>Auto-populated entries that were never edited</h2>
      <div class="card" style="padding:0;overflow-x:auto"><table>
        <thead><tr><th>name</th><th>dept</th><th>auto</th><th>logged</th><th>quality</th><th>misassigned</th><th>rating</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
  }

  function viewWork() {
    const projs = [...new Set(D.map((e) => e.project))];
    const items = projs.map((p) => {
      const list = D.filter((e) => e.project === p);
      return { label: p.replace('None (bench)', 'bench'), value: Math.round(list.reduce((s, e) => s + e.utilisation, 0) / list.length), color: p === 'None (bench)' ? '#f26d6d' : '#5eead4' };
    });
    const top = [...D].sort((a, b) => b.client_rating - a.client_rating).slice(0, 10);
    const rows = top.map((e) => `<tr class="row" data-id="${e.id}">
      <td class="name">${e.name}</td><td>${e.project}</td>
      <td class="num">${e.client_rating.toFixed(1)}</td><td class="num">${e.rating.toFixed(1)}</td>
      <td class="num">${e.utilisation}%</td><td class="num">${e.tickets}</td><td class="num">${e.prs}</td>
      <td class="num">${e.ctc_lpa}</td></tr>`).join('');

    return `
      <h2>Average utilisation by project</h2>
      <div class="card"><div id="bars"></div></div>
      <h2>Highest client-rated people — the ones a cost model cannot see</h2>
      <div class="card" style="padding:0;overflow-x:auto"><table>
        <thead><tr><th>name</th><th>project</th><th>client</th><th>rating</th><th>util</th><th>tickets</th><th>PRs</th><th>CTC</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      <p class="note" style="margin-top:12px">
        Note that client rating and cost are only loosely related here. A model that optimises cost
        per head will happily select against the people a client would name — because the model has
        never spoken to the client.
      </p>`;
  }

  function viewCalibration() {
    const boxes = Array.from({ length: 9 }, () => []);
    D.forEach((e) => {
      const x = e.rating < 3 ? 0 : e.rating < 4.2 ? 1 : 2;   // performance
      const y = e.potential - 1;                               // potential 1..3
      boxes[y * 3 + x].push(e);
    });
    const labels = ['low potential', 'medium', 'high potential'];
    const perfLabels = ['developing', 'solid', 'strong'];
    let cells = '';
    for (let y = 2; y >= 0; y--) {
      for (let x = 0; x < 3; x++) {
        const list = boxes[y * 3 + x];
        const names = list.map((e) => `<tspan x="${26 + x * 210}" dy="14">· ${e.name} (${e.rating.toFixed(1)})</tspan>`).join('');
        cells += `<rect x="${12 + x * 210}" y="${10 + (2 - y) * 108}" width="200" height="100" rx="8"
            fill="rgba(94,234,212,${0.02 + list.length * 0.012})" stroke="rgba(200,220,255,.12)"/>
          <text x="${22 + x * 210}" y="${30 + (2 - y) * 108}" class="axis">${list.length} people</text>
          <text x="${22 + x * 210}" y="${46 + (2 - y) * 108}" fill="#8fa3b8" font-size="9" font-family="ui-monospace">${names || '—'}</text>`;
      }
      cells += `<text x="2" y="${30 + (2 - y) * 108}" class="axis">${labels[y].split(' ')[0]}</text>`;
    }
    return `
      <h2>Nine-box calibration — performance × potential</h2>
      <div class="card"><svg viewBox="0 0 650 350">${cells}
        <text x="325" y="342" class="axis" text-anchor="middle">performance → ${perfLabels.join(' · ')}</text></svg></div>
      <p class="note" style="margin-top:12px">
        This is the SuccessFactors "Matrix Grid" idea, and the reason it matters here: the grid is
        usually generated first and the forced distribution applied afterwards. Once a department is
        required to put 10% in the bottom row, someone lands there whether or not the distribution
        exists in reality.
      </p>`;
  }

  function viewRisk() {
    const s = scored().sort((a, b) => (sortDir === -1 ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
    const cut = cutSet(W, cutPct);
    const rows = s.map((e) => {
      const cls = e.risk > 60 ? 'hi' : e.risk > 40 ? 'mid' : 'lo';
      return `<tr class="row ${cut.has(e.id) ? 'is-cut' : ''}" data-id="${e.id}">
        <td class="name">${e.name}${cut.has(e.id) ? ' <span class="pill cut">cut</span>' : ''}</td>
        <td>${e.dept}</td>
        <td class="num">${fmt(e.risk, 1)}</td>
        <td class="num">${e.rating.toFixed(1)}</td>
        <td class="num">${e.utilisation}%</td>
        <td class="num">${e.late_30d}</td>
        <td class="num">${e.logs_days}/30</td>
        <td class="num">${e.log_quality}</td>
        <td><span class="pill ${cls}">${cls === 'hi' ? 'high' : cls === 'mid' ? 'watch' : 'low'}</span></td>
      </tr>`;
    }).join('');

    const wctl = [
      ['att', 'attendance'], ['logs', 'worklogs'], ['perf', 'performance'], ['util', 'utilisation'], ['eng', 'engagement'],
    ].map(([k, label]) => `<div class="ctl"><span>${label}</span><b id="v-${k}">${Math.round(W[k] * 100)}</b>
        <input type="range" min="0" max="100" value="${Math.round(W[k] * 100)}" data-w="${k}"></div>`).join('');

    return `
      <h2>Risk model — weights are the entire policy</h2>
      <div class="presets">
        ${Object.keys(PRESETS).map((k) => `<button data-preset="${k}" class="${presetName === k ? 'on' : ''}">${k}-led</button>`).join('')}
        <span class="hint" style="align-self:center">cut the bottom ${cutPct}% by risk</span>
      </div>
      <div class="controls">${wctl}
        <div class="ctl"><span>cut size</span><b id="v-cut">${cutPct}%</b>
          <input type="range" min="5" max="40" step="5" value="${cutPct}" data-cut></div>
      </div>
      <div class="card" style="padding:0;overflow-x:auto;margin-top:12px"><table>
        <thead><tr>
          <th data-sort="name">name</th><th>dept</th><th data-sort="risk">risk</th>
          <th data-sort="rating">rating</th><th data-sort="utilisation">util</th>
          <th data-sort="late_30d">late</th><th>logs</th><th data-sort="log_quality">quality</th><th></th>
        </tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  /* ---------------- drawer ---------------- */
  function evidence(e) {
    const bits = [];
    bits.push(`Logged <strong>${e.logs_days} of 30</strong> working days; mean worklog quality <strong>${e.log_quality}/100</strong>${e.auto_entries > 5 ? `, with ${e.auto_entries} auto-populated entries left unedited` : ''}.`);
    bits.push(`Arrived after 09:00 on <strong>${e.late_30d}</strong> days and missed ${e.missing_punch} punches.`);
    bits.push(`Utilisation <strong>${e.utilisation}%</strong> against ${e.project}; client rating ${e.client_rating.toFixed(1)}.`);
    bits.push(`Last rating <strong>${e.rating.toFixed(1)}</strong>, potential ${['low', 'medium', 'high'][e.potential - 1]}, compa-ratio ${e.compa_ratio}.`);
    return bits.join(' ');
  }

  function openDrawer(id) {
    const e = scored().find((x) => x.id === id);
    if (!e) return;
    const flags = [];
    if (e.rating >= 4.3 && e.late_30d >= 8) flags.push(['bad', 'High performer with a compliance record that will outlive the project.']);
    if (e.auto_entries >= 6) flags.push(['', `${e.auto_entries} auto-populated entries never corrected — silent consent to a record you did not write.`]);
    if (!e.billable) flags.push(['bad', 'Unassigned. In any cost-led model this is the first filter applied.']);
    if (e.log_quality < 55) flags.push(['', 'Worklog prose too generic to bill or audit against.']);
    if (e.compa_ratio > 1.12 && e.rating < 3.5) flags.push(['bad', 'Paid above band midpoint with a below-average rating.']);
    if (e.rating >= 4.5 && e.engagement >= 4) flags.push(['good', 'Strong and engaged — the profile a retention model is built to keep.']);
    if (!flags.length) flags.push(['good', 'No exceptions in any of the tracked dimensions.']);

    $('#drawerBody').innerHTML = `
      <div class="dsub">${e.id} · ${e.dept} · ${e.band}</div>
      <h3 class="dname">${e.name}</h3>
      <div class="dsub">${e.role} · ${e.project} · reports to ${e.manager}</div>

      <div class="dsec"><h4>Score</h4>
        <div class="kv"><span>risk (current weights)</span><b>${fmt(e.risk, 1)} / 100</b>
          <span>attendance penalty</span><b>${fmt(e.p.att * 100)}%</b>
          <span>worklog penalty</span><b>${fmt(e.p.logs * 100)}%</b>
          <span>performance penalty</span><b>${fmt(e.p.perf * 100)}%</b></div></div>

      <div class="dsec"><h4>Signals</h4>
        <div class="kv">
          <span>late arrivals (30d)</span><b>${e.late_30d}</b>
          <span>average arrival</span><b>${e.avg_in}</b>
          <span>missed punches</span><b>${e.missing_punch}</b>
          <span>days logged</span><b>${e.logs_days}/30</b>
          <span>log quality</span><b>${e.log_quality}/100</b>
          <span>auto entries</span><b>${e.auto_entries}</b>
          <span>utilisation</span><b>${e.utilisation}%</b>
          <span>tickets / PRs</span><b>${e.tickets} / ${e.prs}</b>
          <span>client rating</span><b>${e.client_rating.toFixed(1)}</b>
          <span>rating / potential</span><b>${e.rating.toFixed(1)} / ${['low','med','high'][e.potential-1]}</b>
          <span>compa-ratio</span><b>${e.compa_ratio}</b>
          <span>CTC</span><b>₹${e.ctc_lpa}L</b>
          <span>tenure</span><b>${e.tenure_m} months</b>
          <span>engagement</span><b>${e.engagement.toFixed(1)}/5</b>
        </div></div>

      <div class="dsec"><h4>Flags</h4>
        ${flags.map(([k, t]) => `<div class="flag ${k}">${t}</div>`).join('')}</div>

      <div class="dsec"><h4>Generated evidence summary</h4>
        <div class="evidence">${evidence(e)}<br><br>
          <em>synthetic — this is the shape an LLM summary takes when it is fed a timesheet and a punch log</em></div></div>`;
    $('#drawer').classList.add('open');
    $('#drawer').setAttribute('aria-hidden', 'false');
  }

  /* ---------------- router ---------------- */
  const VIEWS = { overview: viewOverview, attendance: viewAttendance, logs: viewLogs, work: viewWork, calibration: viewCalibration, risk: viewRisk };
  let current = 'overview';

  function render() {
    const v = $('#view');
    v.innerHTML = VIEWS[current]();

    // charts that need the DOM
    if (current === 'overview') {
      const buckets = [40, 50, 60, 70, 80, 90, 100];
      const items = buckets.map((b, i) => ({
        label: b + (i === 6 ? '+' : ''),
        value: D.filter((e) => e.utilisation >= b && e.utilisation < b + 10).length,
        color: b < 60 ? '#f26d6d' : b < 80 ? '#f5b455' : '#5eead4',
      }));
      const host = $('#utilchart');
      if (host) host.appendChild(bars(items, { h: 180, unit: '' }));
    }
    if (current === 'attendance') {
      const pts = D.map((e) => ({
        x: e.late_30d, y: e.rating, color: deptColor[e.dept] || '#8ea2ff',
        tip: `${e.name} — ${e.late_30d} late, rating ${e.rating}`,
        r: 3.4 + (100 - e.log_quality) / 45,
      }));
      const host = $('#scatter');
      if (host) host.appendChild(scatter(pts, { xLab: 'late arrivals in 30 days', yLab: 'rating' }));
    }
    if (current === 'logs' || current === 'work') {
      const depts = current === 'logs' ? [...new Set(D.map((e) => e.dept))] : [...new Set(D.map((e) => e.project))];
      const items = depts.map((d) => {
        const list = current === 'logs' ? D.filter((e) => e.dept === d) : D.filter((e) => e.project === d);
        const val = current === 'logs'
          ? Math.round(list.reduce((s, e) => s + e.log_quality, 0) / list.length)
          : Math.round(list.reduce((s, e) => s + e.utilisation, 0) / list.length);
        return { label: current === 'logs' ? d.split(' ')[0] : d.replace('None (bench)', 'bench'), value: val, color: current === 'work' && d.includes('bench') ? '#f26d6d' : '#5eead4' };
      });
      const host = $('#bars');
      if (host) host.appendChild(bars(items, { h: 200 }));
    }

    // interactions
    v.querySelectorAll('tr.row').forEach((tr) => tr.addEventListener('click', () => openDrawer(tr.dataset.id)));
    v.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
      presetName = b.dataset.preset;
      Object.assign(W, PRESETS[presetName]);
      render();
    }));
    v.querySelectorAll('input[data-w]').forEach((r) => r.addEventListener('input', () => {
      W[r.dataset.w] = Number(r.value) / 100;
      presetName = 'custom';
      render();
    }));
    const cutR = v.querySelector('input[data-cut]');
    if (cutR) cutR.addEventListener('input', () => { cutPct = Number(cutR.value); render(); });
    v.querySelectorAll('th[data-sort]').forEach((th) => th.addEventListener('click', () => {
      const k = th.dataset.sort;
      if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = k === 'name' ? 1 : -1; }
      render();
    }));
  }

  $('#tabs').addEventListener('click', (ev) => {
    const b = ev.target.closest('.tab');
    if (!b) return;
    current = b.dataset.view;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t === b));
    render();
  });
  $('#close').addEventListener('click', () => {
    $('#drawer').classList.remove('open');
    $('#drawer').setAttribute('aria-hidden', 'true');
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#close').click(); });

  render();
  document.documentElement.dataset.ready = '1';
})();
