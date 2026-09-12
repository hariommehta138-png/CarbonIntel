/**
 * @module inputForm
 * @description Structured manual data-entry screen with live, per-field validation
 * plus a full-object cross-check on submit. Populates a facilityData-shaped object
 * and hands it to the caller via the onSubmit callback — it does not run the
 * calculation pipeline itself.
 */

// ──────────────────────────────────────────────────────────────
// MODULE STATE
// ──────────────────────────────────────────────────────────────
let state = null;        // facilityData-shaped working copy (rows carry an internal _rid)
let errors = {};         // fieldKey -> error message, only present while invalid
let touched = new Set(); // fieldKeys the user has already interacted with (controls when to *show* an error)
let ridCounter = 0;

const DATA_TYPES = ['measured', 'assumption'];
const TIERS = ['low', 'medium', 'high'];

// ──────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINT
// ──────────────────────────────────────────────────────────────
/**
 * @param {Object} opts
 * @param {HTMLElement} opts.container - element to render the form into
 * @param {Object} opts.demoData - facilityData shape used by the "Load demo data" button
 * @param {(facilityData: Object) => void} opts.onSubmit - called with a clean facilityData object
 *   once both the live per-field validation and the full-object cross-check pass
 */
export function initInputForm({ container, demoData, onSubmit }) {
  container.innerHTML = '';
  errors = {};
  touched = new Set();
  ridCounter = 0;
  state = makeBlankState();

  const root = el('div', 'data-entry-container');

  // Header + toolbar
  const header = el('div', 'data-entry-header');
  const titleWrap = el('div', '');
  titleWrap.innerHTML = `<h1 class="brand"><span class="logo-carbon">Carbon</span><span class="logo-intel">Intel</span></h1>
    <p class="text-secondary data-entry-subtitle">Enter facility emissions data to generate the dashboard</p>`;
  header.appendChild(titleWrap);

  const toolbar = el('div', 'data-entry-toolbar');
  const demoBtn = button('btn btn-secondary', 'Load demo data');
  const blankBtn = button('btn btn-secondary', 'Load blank');
  toolbar.appendChild(demoBtn);
  toolbar.appendChild(blankBtn);
  header.appendChild(toolbar);
  root.appendChild(header);

  const formBody = el('div', 'data-entry-body');
  root.appendChild(formBody);
  container.appendChild(root);

  const refs = { submitBtn: null, errorCountEl: null };

  demoBtn.addEventListener('click', () => {
    touched = new Set();
    state = stateFromFacilityData(demoData);
    rebuildForm(formBody, refs);
  });

  blankBtn.addEventListener('click', () => {
    touched = new Set();
    state = makeBlankState();
    rebuildForm(formBody, refs);
  });

  formBody.addEventListener('input', (e) => onFieldChange(e, refs));
  formBody.addEventListener('change', (e) => onFieldChange(e, refs));
  formBody.addEventListener('focusout', (e) => onFieldTouch(e));
  formBody.addEventListener('click', (e) => onFormClick(e, formBody, refs, onSubmit));

  rebuildForm(formBody, refs);
}

// ──────────────────────────────────────────────────────────────
// STATE FACTORIES
// ──────────────────────────────────────────────────────────────
function newRid() {
  ridCounter += 1;
  return 'r' + ridCounter;
}

function newScopeRow() {
  return { _rid: newRid(), source_type: '', quantity: '', unit: '', emission_factor: '', factor_source: '', data_type: '' };
}

function newInterventionRow() {
  return { _rid: newRid(), source_type: '', name: '', reduction_pct: '', cost_tier: '', feasibility_tier: '', capex_inr: '', annual_savings_inr: '' };
}

function makeBlankState() {
  return {
    facility: { name: '', industry_type: '', production_volume: '', production_unit: '' },
    scope1: [newScopeRow()],
    scope2: [newScopeRow()],
    scope3_optional: [],
    interventions: []
  };
}

function stateFromFacilityData(data) {
  const mapRows = (arr) => (arr || []).map(r => ({ _rid: newRid(), ...r }));
  return {
    facility: { ...(data.facility || {}) },
    scope1: mapRows(data.scope1),
    scope2: mapRows(data.scope2),
    scope3_optional: mapRows(data.scope3_optional),
    interventions: mapRows(data.interventions)
  };
}

function updateStateValue(group, rid, field, value) {
  if (group === 'facility') {
    state.facility[field] = value;
    return;
  }
  const row = (state[group] || []).find(r => r._rid === rid);
  if (row) row[field] = value;
}

// ──────────────────────────────────────────────────────────────
// FIELD-LEVEL VALIDATION (live, as the user types)
// ──────────────────────────────────────────────────────────────
function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === '';
}

function toNum(v) {
  return isBlank(v) ? NaN : Number(v);
}

function validateFacilityField(field, value) {
  switch (field) {
    case 'name': return isBlank(value) ? 'Facility name is required.' : null;
    case 'industry_type': return isBlank(value) ? 'Industry type is required.' : null;
    case 'production_volume': {
      if (isBlank(value)) return 'Production volume is required.';
      const n = toNum(value);
      return (!Number.isNaN(n) && n > 0) ? null : 'Production volume must be a positive number.';
    }
    case 'production_unit': return isBlank(value) ? 'Production unit is required.' : null;
    default: return null;
  }
}

function validateScopeField(field, value) {
  switch (field) {
    case 'source_type': return isBlank(value) ? 'Source type is required.' : null;
    case 'quantity': {
      if (isBlank(value)) return 'Quantity is required.';
      const n = toNum(value);
      return (!Number.isNaN(n) && n > 0) ? null : 'Quantity must be a positive number.';
    }
    case 'unit': return isBlank(value) ? 'Unit is required.' : null;
    case 'emission_factor': {
      if (isBlank(value)) return null; // optional
      const n = toNum(value);
      return (!Number.isNaN(n) && n > 0) ? null : 'Emission factor must be a positive number if provided.';
    }
    case 'factor_source': return isBlank(value) ? 'Factor source is required.' : null;
    case 'data_type': return DATA_TYPES.includes(value) ? null : 'Select measured or assumption.';
    default: return null;
  }
}

function validateInterventionField(field, value) {
  switch (field) {
    case 'source_type': return isBlank(value) ? 'Source type is required.' : null;
    case 'name': return isBlank(value) ? 'Intervention name is required.' : null;
    case 'reduction_pct': {
      if (isBlank(value)) return 'Reduction % is required (as a decimal, e.g. 0.25).';
      const n = toNum(value);
      return (!Number.isNaN(n) && n >= 0 && n <= 1) ? null : 'Reduction % must be a decimal between 0 and 1 (e.g. 0.25 for 25%).';
    }
    case 'cost_tier': return TIERS.includes(value) ? null : 'Select a cost tier.';
    case 'feasibility_tier': return TIERS.includes(value) ? null : 'Select a feasibility tier.';
    case 'capex_inr': {
      if (isBlank(value)) return null; // optional
      const n = toNum(value);
      return (!Number.isNaN(n) && n > 0) ? null : 'Capex must be a positive number if provided.';
    }
    case 'annual_savings_inr': {
      if (isBlank(value)) return null; // optional
      const n = toNum(value);
      return (!Number.isNaN(n) && n > 0) ? null : 'Annual savings must be a positive number if provided.';
    }
    default: return null;
  }
}

function computeFieldError(group, field, value) {
  if (group === 'facility') return validateFacilityField(field, value);
  if (group === 'interventions') return validateInterventionField(field, value);
  return validateScopeField(field, value); // scope1 / scope2 / scope3_optional share the same rules
}

function fieldKey(group, rid, field) {
  return group === 'facility' ? `facility.${field}` : `${group}.${rid}.${field}`;
}

function setFieldValidity(key, group, field, value) {
  const msg = computeFieldError(group, field, value);
  if (msg) errors[key] = msg; else delete errors[key];
  return msg;
}

// ──────────────────────────────────────────────────────────────
// FULL-OBJECT VALIDATION (second pass, on submit only)
// ──────────────────────────────────────────────────────────────
function validateFullObject() {
  const issues = [];

  if (state.scope1.length === 0) {
    issues.push('Scope 1 must have at least one emission source row.');
  }
  if (state.scope2.length === 0) {
    issues.push('Scope 2 must have at least one emission source row.');
  }

  const knownSourceTypes = new Set(
    [...state.scope1, ...state.scope2, ...state.scope3_optional]
      .map(r => (r.source_type || '').trim())
      .filter(Boolean)
  );

  state.interventions.forEach((iv, i) => {
    const st = (iv.source_type || '').trim();
    if (st && !knownSourceTypes.has(st)) {
      const label = iv.name ? `"${iv.name}"` : `#${i + 1}`;
      issues.push(`Intervention ${label} targets source type "${st}", which doesn't match any Scope 1/2/3 entry's source type.`);
    }
  });

  return issues;
}

// ──────────────────────────────────────────────────────────────
// SUBMIT → BUILD CLEAN facilityData OBJECT
// ──────────────────────────────────────────────────────────────
function toNumberOrNull(v) {
  if (isBlank(v)) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function buildFacilityDataFromState() {
  const facility = {
    name: state.facility.name.trim(),
    industry_type: state.facility.industry_type.trim(),
    production_volume: Number(state.facility.production_volume),
    production_unit: state.facility.production_unit.trim()
  };

  const mapScopeRow = (r) => {
    const row = {
      source_type: r.source_type.trim(),
      quantity: Number(r.quantity),
      unit: r.unit.trim(),
      emission_factor: toNumberOrNull(r.emission_factor),
      factor_source: r.factor_source.trim(),
      data_type: r.data_type
    };
    if (r.fuel_type) row.fuel_type = r.fuel_type; // preserved from demo data only; no form field edits this
    return row;
  };

  const mapInterventionRow = (r) => {
    const row = {
      source_type: r.source_type.trim(),
      name: r.name.trim(),
      reduction_pct: Number(r.reduction_pct),
      cost_tier: r.cost_tier,
      feasibility_tier: r.feasibility_tier
    };
    const capex = toNumberOrNull(r.capex_inr);
    const savings = toNumberOrNull(r.annual_savings_inr);
    if (capex != null) row.capex_inr = capex;
    if (savings != null) row.annual_savings_inr = savings;
    return row;
  };

  return {
    facility,
    scope1: state.scope1.map(mapScopeRow),
    scope2: state.scope2.map(mapScopeRow),
    scope3_optional: state.scope3_optional.map(mapScopeRow),
    interventions: state.interventions.map(mapInterventionRow)
  };
}

// ──────────────────────────────────────────────────────────────
// EVENT HANDLERS
// ──────────────────────────────────────────────────────────────
function onFieldChange(e, refs) {
  const t = e.target;
  if (!t.dataset || !t.dataset.key) return;
  const { scope: group, rid, field, key } = t.dataset;
  updateStateValue(group, rid, field, t.value);
  touched.add(key);
  setFieldValidity(key, group, field, t.value);
  const wrap = t.closest('.form-field');
  if (wrap) applyValidityToField(wrap);
  updateSubmitState(refs);
}

function onFieldTouch(e) {
  const t = e.target;
  if (!t.dataset || !t.dataset.key) return;
  touched.add(t.dataset.key);
  const wrap = t.closest('.form-field');
  if (wrap) applyValidityToField(wrap);
}

function onFormClick(e, formBody, refs, onSubmit) {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === 'add-row') {
    const group = btn.dataset.scope;
    state[group].push(group === 'interventions' ? newInterventionRow() : newScopeRow());
    rebuildForm(formBody, refs);
  } else if (action === 'remove-row') {
    const group = btn.dataset.scope;
    const rid = btn.dataset.rid;
    state[group] = state[group].filter(r => r._rid !== rid);
    rebuildForm(formBody, refs);
  } else if (action === 'submit') {
    handleSubmit(formBody, onSubmit);
  }
}

function handleSubmit(formBody, onSubmit) {
  if (Object.keys(errors).length > 0) return; // submit button should already be disabled

  const issues = validateFullObject();
  const crossBox = formBody.querySelector('#cross-error-box');

  if (issues.length > 0) {
    if (crossBox) {
      crossBox.classList.remove('hidden');
      crossBox.innerHTML = '';
      crossBox.appendChild(el('div', 'cross-error-title', '⚠️ Please fix the following before continuing:'));
      const list = document.createElement('ul');
      issues.forEach(msg => {
        const li = document.createElement('li');
        li.textContent = msg;
        list.appendChild(li);
      });
      crossBox.appendChild(list);
      crossBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  if (crossBox) {
    crossBox.classList.add('hidden');
    crossBox.innerHTML = '';
  }

  onSubmit(buildFacilityDataFromState());
}

// ──────────────────────────────────────────────────────────────
// DOM RENDERING
// ──────────────────────────────────────────────────────────────
function rebuildForm(formBody, refs) {
  formBody.innerHTML = '';
  errors = {};

  // Facility
  const facilityCard = el('div', 'card form-card');
  facilityCard.appendChild(el('h2', 'card-title', '🏭 Facility Details'));
  const facilityGrid = el('div', 'form-grid');
  facilityGrid.appendChild(buildField({ group: 'facility', field: 'name', label: 'Facility Name', value: state.facility.name }));
  facilityGrid.appendChild(buildField({ group: 'facility', field: 'industry_type', label: 'Industry Type', value: state.facility.industry_type }));
  facilityGrid.appendChild(buildField({ group: 'facility', field: 'production_volume', label: 'Production Volume', type: 'number', value: state.facility.production_volume }));
  facilityGrid.appendChild(buildField({ group: 'facility', field: 'production_unit', label: 'Production Unit', value: state.facility.production_unit, placeholder: 'e.g. tonnes' }));
  facilityCard.appendChild(facilityGrid);
  formBody.appendChild(facilityCard);
  ['name', 'industry_type', 'production_volume', 'production_unit'].forEach(f =>
    setFieldValidity(fieldKey('facility', null, f), 'facility', f, state.facility[f])
  );

  // Scopes
  formBody.appendChild(buildScopeSection('scope1', '🔥 Scope 1 — Direct Emissions'));
  formBody.appendChild(buildScopeSection('scope2', '⚡ Scope 2 — Indirect Emissions (Purchased Energy)'));
  formBody.appendChild(buildScopeSection('scope3_optional', '🌐 Scope 3 — Value Chain (Optional)'));

  // Interventions
  formBody.appendChild(buildInterventionsSection());

  // Cross-field error summary (hidden unless submit's second pass fails)
  const crossErrorBox = el('div', 'cross-error-box hidden');
  crossErrorBox.id = 'cross-error-box';
  formBody.appendChild(crossErrorBox);

  // Submit area
  const submitArea = el('div', 'submit-area');
  const errorCountEl = el('div', 'error-count');
  const submitBtn = button('btn btn-primary', 'Run Analysis →');
  submitBtn.dataset.action = 'submit';
  submitArea.appendChild(errorCountEl);
  submitArea.appendChild(submitBtn);
  formBody.appendChild(submitArea);

  refs.submitBtn = submitBtn;
  refs.errorCountEl = errorCountEl;

  refreshAllFieldDisplays(formBody);
  updateSubmitState(refs);
}

function buildScopeSection(group, titleText) {
  const card = el('div', 'card form-card');
  const headerRow = el('div', 'form-section-header');
  headerRow.appendChild(el('h2', 'card-title', titleText));
  const addBtn = button('btn btn-small btn-add', '+ Add Row');
  addBtn.dataset.action = 'add-row';
  addBtn.dataset.scope = group;
  headerRow.appendChild(addBtn);
  card.appendChild(headerRow);

  const rows = state[group];
  if (rows.length === 0) {
    card.appendChild(el('p', 'text-muted empty-hint', 'No rows yet — click "Add Row" to add an emission source.'));
  }

  rows.forEach((row, idx) => {
    const rowCard = el('div', 'row-card');
    const rowHeader = el('div', 'row-card-header');
    rowHeader.appendChild(el('span', 'row-index', `Row ${idx + 1}`));
    const removeBtn = button('btn btn-small btn-remove', 'Remove');
    removeBtn.dataset.action = 'remove-row';
    removeBtn.dataset.scope = group;
    removeBtn.dataset.rid = row._rid;
    rowHeader.appendChild(removeBtn);
    rowCard.appendChild(rowHeader);

    const grid = el('div', 'form-grid');
    grid.appendChild(buildField({ group, rid: row._rid, field: 'source_type', label: 'Source Type', value: row.source_type, placeholder: 'e.g. boiler' }));
    grid.appendChild(buildField({ group, rid: row._rid, field: 'quantity', label: 'Quantity', type: 'number', value: row.quantity }));
    grid.appendChild(buildField({ group, rid: row._rid, field: 'unit', label: 'Unit', value: row.unit, placeholder: 'e.g. liters' }));
    grid.appendChild(buildField({ group, rid: row._rid, field: 'emission_factor', label: 'Emission Factor', type: 'number', value: row.emission_factor, optionalNote: '(optional)' }));
    grid.appendChild(buildField({ group, rid: row._rid, field: 'factor_source', label: 'Factor Source', value: row.factor_source, placeholder: 'e.g. IPCC 2006 Guidelines' }));
    grid.appendChild(buildField({ group, rid: row._rid, field: 'data_type', label: 'Data Type', type: 'select', value: row.data_type, options: DATA_TYPES }));
    rowCard.appendChild(grid);
    card.appendChild(rowCard);

    ['source_type', 'quantity', 'unit', 'emission_factor', 'factor_source', 'data_type'].forEach(f =>
      setFieldValidity(fieldKey(group, row._rid, f), group, f, row[f])
    );
  });

  return card;
}

function buildInterventionsSection() {
  const card = el('div', 'card form-card');
  const headerRow = el('div', 'form-section-header');
  headerRow.appendChild(el('h2', 'card-title', '💡 Interventions'));
  const addBtn = button('btn btn-small btn-add', '+ Add Row');
  addBtn.dataset.action = 'add-row';
  addBtn.dataset.scope = 'interventions';
  headerRow.appendChild(addBtn);
  card.appendChild(headerRow);

  const rows = state.interventions;
  if (rows.length === 0) {
    card.appendChild(el('p', 'text-muted empty-hint', 'No interventions yet — click "Add Row" to add one.'));
  }

  rows.forEach((row, idx) => {
    const rowCard = el('div', 'row-card');
    const rowHeader = el('div', 'row-card-header');
    rowHeader.appendChild(el('span', 'row-index', `Row ${idx + 1}`));
    const removeBtn = button('btn btn-small btn-remove', 'Remove');
    removeBtn.dataset.action = 'remove-row';
    removeBtn.dataset.scope = 'interventions';
    removeBtn.dataset.rid = row._rid;
    rowHeader.appendChild(removeBtn);
    rowCard.appendChild(rowHeader);

    const grid = el('div', 'form-grid');
    grid.appendChild(buildField({ group: 'interventions', rid: row._rid, field: 'source_type', label: 'Source Type', value: row.source_type, placeholder: 'must match a scope source type' }));
    grid.appendChild(buildField({ group: 'interventions', rid: row._rid, field: 'name', label: 'Intervention Name', value: row.name }));
    grid.appendChild(buildField({ group: 'interventions', rid: row._rid, field: 'reduction_pct', label: 'Reduction (0–1)', type: 'number', value: row.reduction_pct, placeholder: 'e.g. 0.25' }));
    grid.appendChild(buildField({ group: 'interventions', rid: row._rid, field: 'cost_tier', label: 'Cost Tier', type: 'select', value: row.cost_tier, options: TIERS }));
    grid.appendChild(buildField({ group: 'interventions', rid: row._rid, field: 'feasibility_tier', label: 'Feasibility Tier', type: 'select', value: row.feasibility_tier, options: TIERS }));
    grid.appendChild(buildField({ group: 'interventions', rid: row._rid, field: 'capex_inr', label: 'CapEx (INR)', type: 'number', value: row.capex_inr, optionalNote: '(optional)' }));
    grid.appendChild(buildField({ group: 'interventions', rid: row._rid, field: 'annual_savings_inr', label: 'Annual Savings (INR)', type: 'number', value: row.annual_savings_inr, optionalNote: '(optional)' }));
    rowCard.appendChild(grid);
    card.appendChild(rowCard);

    ['source_type', 'name', 'reduction_pct', 'cost_tier', 'feasibility_tier', 'capex_inr', 'annual_savings_inr'].forEach(f =>
      setFieldValidity(fieldKey('interventions', row._rid, f), 'interventions', f, row[f])
    );
  });

  return card;
}

function buildField({ group, rid, field, label, type = 'text', value, options, placeholder, optionalNote }) {
  const key = fieldKey(group, rid, field);
  const wrap = el('div', 'form-field');

  const lbl = document.createElement('label');
  const inputId = 'f-' + key.replace(/[^a-zA-Z0-9]/g, '-');
  lbl.setAttribute('for', inputId);
  lbl.textContent = label;
  if (optionalNote) {
    const note = document.createElement('span');
    note.className = 'field-optional-note';
    note.textContent = ' ' + optionalNote;
    lbl.appendChild(note);
  }
  wrap.appendChild(lbl);

  let input;
  if (type === 'select') {
    input = document.createElement('select');
    const blankOpt = document.createElement('option');
    blankOpt.value = '';
    blankOpt.textContent = 'Select…';
    input.appendChild(blankOpt);
    (options || []).forEach(optVal => {
      const o = document.createElement('option');
      o.value = optVal;
      o.textContent = optVal;
      input.appendChild(o);
    });
    input.value = value || '';
  } else {
    input = document.createElement('input');
    input.type = type;
    if (type === 'number') input.step = 'any';
    if (placeholder) input.placeholder = placeholder;
    input.value = (value === undefined || value === null) ? '' : value;
  }

  input.id = inputId;
  input.dataset.scope = group;
  if (rid) input.dataset.rid = rid;
  input.dataset.field = field;
  input.dataset.key = key;
  wrap.appendChild(input);

  const errDiv = document.createElement('div');
  errDiv.className = 'field-error';
  wrap.appendChild(errDiv);

  return wrap;
}

function applyValidityToField(wrap) {
  const input = wrap.querySelector('input, select');
  const errDiv = wrap.querySelector('.field-error');
  if (!input || !errDiv) return;
  const key = input.dataset.key;
  const message = errors[key];
  const show = !!message && touched.has(key);
  input.classList.toggle('input-invalid', show);
  errDiv.textContent = show ? message : '';
}

function refreshAllFieldDisplays(formBody) {
  formBody.querySelectorAll('.form-field').forEach(applyValidityToField);
}

function updateSubmitState(refs) {
  if (!refs.submitBtn || !refs.errorCountEl) return;
  const count = Object.keys(errors).length;
  refs.submitBtn.disabled = count > 0;
  refs.errorCountEl.textContent = count > 0
    ? `${count} field${count === 1 ? '' : 's'} need attention before you can submit.`
    : 'All fields are valid — ready to submit.';
  refs.errorCountEl.classList.toggle('error-count-bad', count > 0);
  refs.errorCountEl.classList.toggle('error-count-good', count === 0);
}

// ──────────────────────────────────────────────────────────────
// SMALL DOM HELPERS
// ──────────────────────────────────────────────────────────────
function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

function button(className, text) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = text;
  return b;
}
