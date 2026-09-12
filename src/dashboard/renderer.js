/**
 * @module renderer
 * @description Renders the CarbonIntel dashboard by populating DOM sections
 * with data from the pipeline: calcResult, complianceTags, matchResult, impactResult, facilityData
 */
import {
  renderHorizontalBarChart,
  renderDonutChart,
  renderComparisonBar,
  renderScoreRing,
  renderProgressBar,
  animateNumber
} from './charts.js';

/**
 * Main render function — populates all 7 dashboard sections.
 * @param {Object} calcResult - Output from calculateHotspots
 * @param {Object} complianceTags - Output from tagCompliance (keyed by source_type)
 * @param {Object} matchResult - Output from matchRecommendations
 * @param {Object} impactResult - Output from projectImpact
 * @param {Object} facilityData - Raw facility data from dataLayer
 */
export function renderDashboard(calcResult, complianceTags, matchResult, impactResult, facilityData) {
  // --- Loading transition ---
  const loader = document.getElementById('loading-screen');
  const dashboard = document.getElementById('dashboard');

  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => { loader.style.display = 'none'; }, 500);
  }
  if (dashboard) {
    dashboard.classList.remove('hidden');
  }

  // --- Header ---
  renderHeader(calcResult, facilityData);

  // --- Section 1: Facility Overview ---
  renderFacilityOverview(calcResult, facilityData);

  // --- Section 2: Scope Donut ---
  renderScopeDonut(calcResult);

  // --- Section 3: Hotspot Chart ---
  renderHotspotChart(calcResult, complianceTags);

  // --- Section 4: Recommendations ---
  renderRecommendations(matchResult);

  // --- Section 5: Impact Projection ---
  renderImpactProjection(impactResult, calcResult);

  // --- Section 6: Data Quality ---
  renderDataQuality(facilityData);

  // --- Section 7: Regulatory Context ---
  renderRegulatoryContext();

  // Stagger card animations
  document.querySelectorAll('.card').forEach((card, i) => {
    card.style.animationDelay = `${i * 0.1}s`;
    card.classList.add('animate-fade-in-up');
  });
}

// ──────────────────────────────────────────────────────────────
// HEADER
// ──────────────────────────────────────────────────────────────
function renderHeader(calcResult, facilityData) {
  const badge = document.getElementById('header-intensity-badge');
  if (badge) {
    badge.textContent = `${calcResult.intensity.toFixed(2)} ${calcResult.intensity_unit}`;
    badge.classList.add('badge', 'badge-cyan');
  }

  const tags = document.getElementById('header-framework-tags');
  if (tags) {
    const frameworks = ['CCTS', 'PAT', 'CEA', 'CPCB', 'India GHG'];
    frameworks.forEach(fw => {
      const tag = document.createElement('span');
      tag.className = 'badge badge-emerald';
      tag.textContent = fw;
      tag.style.marginLeft = '4px';
      tags.appendChild(tag);
    });
  }
}

// ──────────────────────────────────────────────────────────────
// SECTION 1: Facility Overview
// ──────────────────────────────────────────────────────────────
function renderFacilityOverview(calcResult, facilityData) {
  const container = document.getElementById('facility-overview');
  if (!container) return;

  const f = facilityData.facility;
  const totalSources = calcResult.ranking.length + calcResult.skipped_sources.length;

  const title = el('h2', 'card-title', '🏭 Facility Overview');
  const grid = el('div', 'stat-grid');

  const stats = [
    { label: '🏭 Facility', value: f.name, numeric: false },
    { label: '🏢 Industry', value: f.industry_type, numeric: false },
    { label: '📦 Production', value: `${f.production_volume.toLocaleString()} ${f.production_unit}`, numeric: false },
    { label: '☁️ Total Emissions', value: calcResult.facility_baseline, suffix: ' tCO₂e', decimals: 1, numeric: true },
    { label: '⚡ Intensity', value: calcResult.intensity, suffix: ' ' + calcResult.intensity_unit, decimals: 3, numeric: true },
    { label: '🔍 Sources Analyzed', value: totalSources, numeric: false }
  ];

  stats.forEach((s, i) => {
    const item = el('div', 'stat-item animate-fade-in-up');
    item.style.animationDelay = `${i * 0.08}s`;

    const lbl = el('div', 'stat-label', s.label);
    const val = el('div', 'stat-value');

    if (s.numeric) {
      const numSpan = document.createElement('span');
      numSpan.textContent = '0';
      val.appendChild(numSpan);
      animateNumber(numSpan, s.value, 1200, s.decimals || 0, '', s.suffix || '');
    } else {
      val.textContent = s.value;
    }

    item.appendChild(lbl);
    item.appendChild(val);
    grid.appendChild(item);
  });

  container.appendChild(title);
  container.appendChild(grid);
}

// ──────────────────────────────────────────────────────────────
// SECTION 2: Scope Donut
// ──────────────────────────────────────────────────────────────
function renderScopeDonut(calcResult) {
  const container = document.getElementById('scope-donut');
  if (!container) return;

  const title = el('h2', 'card-title', '📊 Emissions by Scope');
  container.appendChild(title);

  // Aggregate emissions by scope
  const scopeTotals = { 1: 0, 2: 0, 3: 0 };
  calcResult.ranking.forEach(r => {
    if (r.scope >= 1 && r.scope <= 3) {
      scopeTotals[r.scope] += r.emissions_tco2e;
    }
  });

  const total = calcResult.facility_baseline;
  const scopeColors = {
    1: 'var(--scope1-color)',
    2: 'var(--scope2-color)',
    3: 'var(--scope3-color)'
  };
  const scopeLabels = {
    1: 'Scope 1 (Direct)',
    2: 'Scope 2 (Indirect)',
    3: 'Scope 3 (Value Chain)'
  };

  const segments = [1, 2, 3]
    .map(s => ({
      label: scopeLabels[s],
      value: scopeTotals[s],
      color: scopeColors[s],
      percent: total > 0 ? (scopeTotals[s] / total) * 100 : 0
    }))
    .filter(s => s.value > 0);

  const chartWrapper = el('div', '');
  container.appendChild(chartWrapper);
  renderDonutChart(chartWrapper, segments, {
    totalValue: total,
    centerLabel: 'Total tCO₂e'
  });
}

// ──────────────────────────────────────────────────────────────
// SECTION 3: Hotspot Chart
// ──────────────────────────────────────────────────────────────
function renderHotspotChart(calcResult, complianceTags) {
  const container = document.getElementById('hotspot-chart');
  if (!container) return;

  const title = el('h2', 'card-title', '🔥 Emission Hotspots — Ranked by Contribution');
  container.appendChild(title);

  const maxEmissions = Math.max(...calcResult.ranking.map(r => r.emissions_tco2e));

  const barData = calcResult.ranking.map(r => {
    const tag = complianceTags[r.source_type] || {};
    const badges = [];

    // Compliance badge
    if (tag.compliance_status) {
      const isCCTS = tag.compliance_status.includes('CCTS');
      badges.push({
        text: isCCTS ? 'CCTS-mandatory' : 'Voluntary',
        class: isCCTS ? 'badge-ccts' : 'badge-voluntary'
      });
    }

    // Waste flag
    if (tag.waste_compliance_flag) {
      badges.push({ text: 'CPCB', class: 'badge-rose' });
    }

    // Data type badge
    if (r.data_type === 'assumption') {
      badges.push({ text: 'assumption', class: 'badge-warning' });
    }

    return {
      label: formatSourceType(r.source_type),
      value: r.emissions_tco2e,
      maxValue: maxEmissions,
      scope: r.scope,
      badges
    };
  });

  const chartWrapper = el('div', '');
  container.appendChild(chartWrapper);
  renderHorizontalBarChart(chartWrapper, barData);
}

// ──────────────────────────────────────────────────────────────
// SECTION 4: Recommendations
// ──────────────────────────────────────────────────────────────
function renderRecommendations(matchResult) {
  const container = document.getElementById('recommendations-panel');
  if (!container) return;

  const title = el('h2', 'card-title', '💡 Recommended Interventions');
  container.appendChild(title);

  // Heuristic disclaimer
  const disclaimer = el('div', 'text-muted');
  disclaimer.style.fontSize = '0.75rem';
  disclaimer.style.marginBottom = '16px';
  const disclaimerBadge = el('span', 'badge badge-heuristic', matchResult.scoring_method);
  disclaimer.textContent = 'Methodology: ';
  disclaimer.appendChild(disclaimerBadge);
  container.appendChild(disclaimer);

  const list = el('div', 'rec-list');

  matchResult.recommendations.forEach((rec, i) => {
    const card = el('div', 'rec-card animate-fade-in-up');
    card.style.animationDelay = `${i * 0.1}s`;

    // Score ring
    const ringContainer = el('div', 'rec-score-ring');
    renderScoreRing(ringContainer, rec.score, 1.0);

    // Content
    const content = el('div', 'rec-content');

    // Title
    const recTitle = el('div', 'rec-title', rec.name);

    // Meta badges
    const meta = el('div', 'rec-meta');

    const sourceTag = el('span', 'badge badge-cyan', formatSourceType(rec.source_type));

    const costClass = rec.cost_tier === 'low' ? 'badge-emerald' : (rec.cost_tier === 'high' ? 'badge-rose' : 'badge-amber');
    const costBadge = el('span', `badge ${costClass}`, `${rec.cost_tier} cost`);

    const feasClass = rec.feasibility_tier === 'high' ? 'badge-emerald' : (rec.feasibility_tier === 'low' ? 'badge-rose' : 'badge-amber');
    const feasBadge = el('span', `badge ${feasClass}`, `${rec.feasibility_tier} feasibility`);

    meta.appendChild(sourceTag);
    meta.appendChild(costBadge);
    meta.appendChild(feasBadge);
    if (rec.justification && rec.justification.financial_data_available === false) {
      meta.appendChild(el('span', 'badge badge-nodata', 'cost data not provided'));
    }

    // Reduction info
    const reduction = el('div', '');
    reduction.style.fontSize = '0.875rem';
    reduction.style.color = 'var(--text-secondary)';
    reduction.textContent = `Reduction: ${(rec.reduction_pct * 100).toFixed(0)}% · ${rec.potential_reduction_tco2e.toFixed(2)} tCO₂e`;

    content.appendChild(recTitle);
    content.appendChild(meta);
    content.appendChild(reduction);

    // Numeric justification (TASK 2) — built entirely from pipeline numbers
    if (rec.justification && rec.justification.justification_text) {
      content.appendChild(el('div', 'rec-justification', rec.justification.justification_text));
    }

    card.appendChild(ringContainer);
    card.appendChild(content);
    list.appendChild(card);
  });

  container.appendChild(list);
}

// ──────────────────────────────────────────────────────────────
// SECTION 5: Impact Projection
// ──────────────────────────────────────────────────────────────
function renderImpactProjection(impactResult, calcResult) {
  const container = document.getElementById('impact-projection');
  if (!container) return;

  const title = el('h2', 'card-title', '📉 Impact Projection');
  container.appendChild(title);

  // Comparison bar
  const barWrapper = el('div', '');
  container.appendChild(barWrapper);
  renderComparisonBar(
    barWrapper,
    impactResult.original_baseline,
    impactResult.projected_baseline,
    'Total Emissions',
    'tCO₂e'
  );

  // Intensity comparison
  const intensitySection = el('div', '');
  intensitySection.style.marginTop = '20px';
  intensitySection.style.paddingTop = '16px';
  intensitySection.style.borderTop = '1px solid var(--border-subtle)';

  const intensityTitle = el('div', 'stat-label', '⚡ Intensity Change');
  intensitySection.appendChild(intensityTitle);

  const intensityRow = el('div', '');
  intensityRow.style.display = 'flex';
  intensityRow.style.gap = '24px';
  intensityRow.style.marginTop = '8px';

  const origI = el('div', '');
  origI.innerHTML = `<span style="color: var(--text-muted); font-size: 0.875rem;">Before</span><br><span style="font-size: 1.25rem; font-weight: 700; color: var(--text-secondary);">${impactResult.original_intensity.toFixed(3)}</span> <span style="font-size: 0.75rem; color: var(--text-muted);">${impactResult.intensity_unit}</span>`;

  const arrow = el('div', '');
  arrow.style.display = 'flex';
  arrow.style.alignItems = 'center';
  arrow.style.fontSize = '1.5rem';
  arrow.style.color = 'var(--accent-emerald)';
  arrow.textContent = '→';

  const newI = el('div', '');
  newI.innerHTML = `<span style="color: var(--text-muted); font-size: 0.875rem;">After</span><br><span style="font-size: 1.25rem; font-weight: 700; color: var(--accent-emerald);">${impactResult.new_intensity.toFixed(3)}</span> <span style="font-size: 0.75rem; color: var(--text-muted);">${impactResult.intensity_unit}</span>`;

  intensityRow.appendChild(origI);
  intensityRow.appendChild(arrow);
  intensityRow.appendChild(newI);
  intensitySection.appendChild(intensityRow);
  container.appendChild(intensitySection);

  // By-scope breakdown
  const scopeSection = el('div', '');
  scopeSection.style.marginTop = '16px';
  const scopeTitle = el('div', 'stat-label', '📊 Reduction by Scope');
  scopeSection.appendChild(scopeTitle);

  const scopeNames = { 1: 'Scope 1', 2: 'Scope 2', 3: 'Scope 3' };
  const scopeColors = { 1: 'var(--scope1-color)', 2: 'var(--scope2-color)', 3: 'var(--scope3-color)' };

  [1, 2, 3].forEach(scope => {
    const data = impactResult.by_scope[scope];
    if (!data || data.original === 0) return;

    const row = el('div', '');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '8px 0';
    row.style.borderBottom = '1px solid var(--border-subtle)';

    const label = el('span', '');
    label.style.fontSize = '0.875rem';
    label.innerHTML = `<span style="color: ${scopeColors[scope]};">●</span> ${scopeNames[scope]}`;

    const values = el('span', '');
    values.style.fontSize = '0.875rem';
    values.style.color = 'var(--text-secondary)';
    const reductionPct = data.original > 0 ? ((data.reduction / data.original) * 100).toFixed(1) : '0.0';
    values.textContent = `-${data.reduction.toFixed(2)} tCO₂e (${reductionPct}%)`;

    row.appendChild(label);
    row.appendChild(values);
    scopeSection.appendChild(row);
  });

  container.appendChild(scopeSection);
}

// ──────────────────────────────────────────────────────────────
// SECTION 6: Data Quality
// ──────────────────────────────────────────────────────────────
function renderDataQuality(facilityData) {
  const container = document.getElementById('data-quality');
  if (!container) return;

  const title = el('h2', 'card-title', '🔍 Data Quality & Sourcing');
  container.appendChild(title);

  // Collect all sources across scopes
  const allSources = [
    ...facilityData.scope1.map(s => ({ ...s, scope: 1 })),
    ...facilityData.scope2.map(s => ({ ...s, scope: 2 })),
    ...facilityData.scope3_optional.map(s => ({ ...s, scope: 3 }))
  ];

  let sourcedCount = 0;
  const totalCount = allSources.length;

  // Progress bar first
  allSources.forEach(src => {
    if (src.emission_factor != null) sourcedCount++;
  });

  const progWrapper = el('div', '');
  renderProgressBar(progWrapper, sourcedCount, totalCount, 'Sourced Emission Factors');
  container.appendChild(progWrapper);

  // Source list
  const list = el('div', 'dq-list');
  list.style.marginTop = '16px';

  allSources.forEach(src => {
    const item = el('div', 'dq-item');
    const isSourced = src.emission_factor != null;

    const info = el('div', 'dq-info');

    const name = el('div', 'dq-name');
    name.textContent = `${formatSourceType(src.source_type)}${src.fuel_type ? ' (' + src.fuel_type + ')' : ''}`;

    const source = el('div', 'dq-source');
    source.textContent = src.factor_source;

    info.appendChild(name);
    info.appendChild(source);

    const status = el('div', 'dq-status');

    const dtBadge = el('span', `badge ${src.data_type === 'measured' ? 'badge-emerald' : 'badge-warning'}`, src.data_type);

    const icon = el('span', '');
    icon.style.fontSize = '1.25rem';
    if (isSourced) {
      icon.textContent = '✓';
      icon.style.color = 'var(--accent-emerald)';
    } else {
      icon.textContent = '⚠';
      icon.style.color = 'var(--accent-amber)';
    }

    status.appendChild(dtBadge);
    status.appendChild(icon);

    item.appendChild(info);
    item.appendChild(status);
    list.appendChild(item);
  });

  container.appendChild(list);
}

// ──────────────────────────────────────────────────────────────
// SECTION 7: Regulatory Context
// ──────────────────────────────────────────────────────────────
function renderRegulatoryContext() {
  const container = document.getElementById('regulatory-context');
  if (!container) return;

  const title = el('h2', 'card-title', '🏛️ Applicable Indian Regulatory Frameworks');
  container.appendChild(title);

  const frameworks = [
    {
      id: 'CCTS', title: 'Carbon Credit Trading Scheme',
      desc: 'Mandatory Scope 1 & 2 reporting for obligated entities — BEE compliance mechanism, July 2024',
      icon: '🏛️', colorClass: 'text-emerald'
    },
    {
      id: 'PAT', title: 'Perform Achieve Trade',
      desc: 'Specific energy consumption intensity targets for designated consumers',
      icon: '⚡', colorClass: 'text-cyan'
    },
    {
      id: 'CEA', title: 'CEA Baseline Database',
      desc: 'Grid emission factor updated annually — currently 0.710 tCO₂/MWh (FY24-25, Version 21.0)',
      icon: '🔌', colorClass: 'text-amber'
    },
    {
      id: 'CPCB', title: 'CPCB Waste Management',
      desc: 'Hazardous & Solid Waste Management Rules — flagged for waste-related sources, separate from carbon accounting',
      icon: '♻️', colorClass: 'text-rose'
    },
    {
      id: 'GHG', title: 'India GHG Program',
      desc: 'Voluntary Scope 3 reporting aligned with WRI India, TERI, CII sector methodologies',
      icon: '📊', colorClass: 'text-violet'
    }
  ];

  const list = el('div', 'reg-list');

  frameworks.forEach((fw, i) => {
    const item = el('div', 'reg-item animate-fade-in-up');
    item.style.animationDelay = `${i * 0.1}s`;

    const icon = el('div', `reg-icon ${fw.colorClass}`);
    icon.textContent = fw.icon;

    const content = el('div', 'reg-content');

    const h4 = document.createElement('h4');
    h4.textContent = fw.title;

    const badge = el('span', 'badge badge-emerald', fw.id);
    badge.style.marginLeft = '8px';
    badge.style.verticalAlign = 'middle';
    h4.appendChild(badge);

    const desc = document.createElement('p');
    desc.textContent = fw.desc;

    content.appendChild(h4);
    content.appendChild(desc);

    item.appendChild(icon);
    item.appendChild(content);
    list.appendChild(item);
  });

  container.appendChild(list);
}

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────

/** Create a DOM element with optional class and text content */
function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

/** Format source_type into readable label: "grid_electricity" → "Grid Electricity" */
function formatSourceType(type) {
  if (!type) return '';
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
