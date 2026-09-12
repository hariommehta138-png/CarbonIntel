export function renderHorizontalBarChart(container, data, options = {}) {
  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'h-bar-container';

  data.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'h-bar-row animate-fade-in-up';
    row.style.animationDelay = `${index * 0.1}s`;

    const labelArea = document.createElement('div');
    labelArea.className = 'h-bar-label-area';
    
    const labelTitle = document.createElement('div');
    labelTitle.className = 'h-bar-label';
    labelTitle.textContent = item.label;
    labelArea.appendChild(labelTitle);

    if (item.badges && item.badges.length > 0) {
      const badgeContainer = document.createElement('div');
      badgeContainer.style.display = 'flex';
      badgeContainer.style.gap = '4px';
      
      item.badges.forEach(badge => {
        const badgeEl = document.createElement('span');
        badgeEl.className = `badge ${badge.class || 'badge-emerald'}`;
        badgeEl.textContent = badge.text;
        badgeContainer.appendChild(badgeEl);
      });
      labelArea.appendChild(badgeContainer);
    }

    const track = document.createElement('div');
    track.className = 'h-bar-track';
    
    const fill = document.createElement('div');
    fill.className = `h-bar-fill scope-${item.scope || 1}`;
    
    const percent = (item.value / item.maxValue) * 100;
    fill.style.setProperty('--target-width', `${percent}%`);
    track.appendChild(fill);

    const valStr = document.createElement('div');
    valStr.className = 'h-bar-value';
    
    const valText = document.createElement('span');
    valText.textContent = item.value.toLocaleString(undefined, { maximumFractionDigits: 1 });
    valStr.appendChild(valText);
    
    const pctText = document.createElement('div');
    pctText.style.fontSize = '0.7rem';
    pctText.style.color = 'var(--text-muted)';
    pctText.textContent = `${percent.toFixed(1)}%`;
    valStr.appendChild(pctText);

    row.appendChild(labelArea);
    row.appendChild(track);
    row.appendChild(valStr);
    
    wrapper.appendChild(row);
  });
  
  container.appendChild(wrapper);
}

export function renderDonutChart(container, segments, options = {}) {
  container.innerHTML = '';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'donut-container';
  
  const svgWrapper = document.createElement('div');
  svgWrapper.className = 'donut-svg-wrapper';
  
  const size = 200;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  
  let currentOffset = 0;
  
  segments.forEach((seg, i) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', size / 2);
    circle.setAttribute('cy', size / 2);
    circle.setAttribute('r', radius);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', seg.color);
    circle.setAttribute('stroke-width', strokeWidth);
    
    const dasharray = `${(seg.percent / 100) * circumference} ${circumference}`;
    circle.setAttribute('stroke-dasharray', dasharray);
    
    const offset = circumference - currentOffset;
    circle.setAttribute('stroke-dashoffset', circumference);
    circle.style.transform = 'rotate(-90deg)';
    circle.style.transformOrigin = '50% 50%';
    
    circle.style.setProperty('--donut-circumference', circumference);
    circle.style.setProperty('--target-offset', circumference - ((seg.percent / 100) * circumference) + currentOffset);
    
    circle.style.animation = `donutFill 1s ease-out forwards ${i * 0.2}s`;
    
    svg.appendChild(circle);
    currentOffset += (seg.percent / 100) * circumference;
  });
  
  const centerText = document.createElement('div');
  centerText.className = 'donut-center-text';
  
  const totalVal = document.createElement('div');
  totalVal.style.fontSize = '1.5rem';
  totalVal.style.fontWeight = '700';
  totalVal.className = 'total-val-anim';
  totalVal.textContent = '0';
  
  const totalLabel = document.createElement('div');
  totalLabel.style.fontSize = '0.75rem';
  totalLabel.style.color = 'var(--text-muted)';
  totalLabel.textContent = options.centerLabel || 'Total';
  
  centerText.appendChild(totalVal);
  centerText.appendChild(totalLabel);
  
  svgWrapper.appendChild(svg);
  svgWrapper.appendChild(centerText);
  
  const legend = document.createElement('div');
  legend.className = 'donut-legend';
  
  segments.forEach(seg => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    
    const colorBox = document.createElement('div');
    colorBox.className = 'legend-color';
    colorBox.style.backgroundColor = seg.color;
    
    const label = document.createElement('span');
    label.textContent = `${seg.label} (${seg.percent.toFixed(1)}%)`;
    
    item.appendChild(colorBox);
    item.appendChild(label);
    legend.appendChild(item);
  });
  
  wrapper.appendChild(svgWrapper);
  wrapper.appendChild(legend);
  container.appendChild(wrapper);
  
  if (options.totalValue) {
    animateNumber(totalVal, options.totalValue, 1000, 0, '', '');
  }
}

export function renderComparisonBar(container, original, projected, label, unit) {
  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'comparison-container animate-fade-in-up';
  
  const group = document.createElement('div');
  group.className = 'comp-bar-group';
  
  const labels = document.createElement('div');
  labels.className = 'comp-labels';
  
  const l1 = document.createElement('span');
  l1.textContent = 'Projected';
  const l2 = document.createElement('span');
  l2.textContent = 'Baseline';
  
  labels.appendChild(l1);
  labels.appendChild(l2);
  
  const track = document.createElement('div');
  track.className = 'comp-track';
  
  const segProj = document.createElement('div');
  segProj.className = 'comp-segment comp-projected';
  segProj.style.width = '0%';
  
  const segOrig = document.createElement('div');
  segOrig.className = 'comp-segment comp-original';
  segOrig.style.width = '0%';
  
  track.appendChild(segProj);
  track.appendChild(segOrig);
  
  group.appendChild(labels);
  group.appendChild(track);
  
  const stats = document.createElement('div');
  stats.className = 'comp-stats';
  
  const reduction = original - projected;
  const redPct = (reduction / original) * 100;
  
  const s1 = createStatItem('Reduction', reduction, unit, 'text-emerald');
  const s2 = createStatItem('Savings', redPct, '%', 'text-emerald');
  const s3 = createStatItem('New Total', projected, unit, '');
  
  stats.appendChild(s1);
  stats.appendChild(s2);
  stats.appendChild(s3);
  
  wrapper.appendChild(group);
  wrapper.appendChild(stats);
  container.appendChild(wrapper);
  
  setTimeout(() => {
    const pPct = (projected / original) * 100;
    segProj.style.width = `${pPct}%`;
    segOrig.style.width = `${100 - pPct}%`;
  }, 100);
}

function createStatItem(label, value, unit, colorClass) {
  const div = document.createElement('div');
  div.className = 'stat-item';
  const l = document.createElement('div');
  l.className = 'stat-label';
  l.textContent = label;
  const v = document.createElement('div');
  v.className = `stat-value ${colorClass}`;
  const vSpan = document.createElement('span');
  vSpan.textContent = '0';
  animateNumber(vSpan, value, 1000, 1);
  const uSpan = document.createElement('span');
  uSpan.className = 'stat-unit';
  uSpan.textContent = unit;
  
  v.appendChild(vSpan);
  v.appendChild(uSpan);
  div.appendChild(l);
  div.appendChild(v);
  return div;
}

export function renderScoreRing(container, score, maxScore) {
  container.innerHTML = '';
  const size = 48;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  
  let color = 'var(--accent-rose)';
  if (score >= 0.4 && score < 0.7) color = 'var(--accent-amber)';
  if (score >= 0.7) color = 'var(--accent-emerald)';
  
  const pct = score / maxScore;
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg.setAttribute('cx', size/2);
  bg.setAttribute('cy', size/2);
  bg.setAttribute('r', r);
  bg.setAttribute('fill', 'none');
  bg.setAttribute('stroke', 'var(--chart-bg)');
  bg.setAttribute('stroke-width', stroke);
  
  const fg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  fg.setAttribute('cx', size/2);
  fg.setAttribute('cy', size/2);
  fg.setAttribute('r', r);
  fg.setAttribute('fill', 'none');
  fg.setAttribute('stroke', color);
  fg.setAttribute('stroke-width', stroke);
  fg.setAttribute('stroke-dasharray', circ);
  fg.setAttribute('stroke-dashoffset', circ);
  fg.style.transform = 'rotate(-90deg)';
  fg.style.transformOrigin = '50% 50%';
  fg.style.transition = 'stroke-dashoffset 1s ease-out';
  
  svg.appendChild(bg);
  svg.appendChild(fg);
  
  const text = document.createElement('div');
  text.style.position = 'absolute';
  text.style.inset = '0';
  text.style.display = 'flex';
  text.style.alignItems = 'center';
  text.style.justifyContent = 'center';
  text.style.fontSize = '0.75rem';
  text.style.fontWeight = '700';
  text.textContent = (score * 10).toFixed(1);
  
  container.style.position = 'relative';
  container.appendChild(svg);
  container.appendChild(text);
  
  setTimeout(() => {
    fg.setAttribute('stroke-dashoffset', circ - (pct * circ));
  }, 100);
}

export function renderProgressBar(container, value, max, label) {
  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'progress-container';
  
  const header = document.createElement('div');
  header.className = 'progress-header';
  const lText = document.createElement('span');
  lText.textContent = label;
  const vText = document.createElement('span');
  vText.textContent = `${value}/${max} (${((value/max)*100).toFixed(0)}%)`;
  
  header.appendChild(lText);
  header.appendChild(vText);
  
  const track = document.createElement('div');
  track.className = 'progress-track';
  const fill = document.createElement('div');
  fill.className = 'progress-fill';
  fill.style.setProperty('--target-width', `${(value/max)*100}%`);
  
  track.appendChild(fill);
  wrapper.appendChild(header);
  wrapper.appendChild(track);
  container.appendChild(wrapper);
}

export function animateNumber(element, target, duration = 1000, decimals = 0, prefix = '', suffix = '') {
  const start = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const current = start + (target - start) * easeOutQuart;
    
    element.textContent = prefix + current.toFixed(decimals) + suffix;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = prefix + target.toFixed(decimals) + suffix;
    }
  }
  
  requestAnimationFrame(update);
}
