/**
 * CarbonIntel — Pipeline Orchestrator
 * Flow: data-entry screen (manual input) → dataLayer(demo, optional) → calcEngine →
 *       complianceTags → matchEngine → impactProjector → render
 */
import { facilityData } from './modules/dataLayer.js';
import { calculateHotspots } from './modules/calcEngine.js';
import { tagCompliance } from './modules/complianceTags.js';
import { matchRecommendations } from './modules/matchEngine.js';
import { projectImpact } from './modules/impactProjector.js';
import { renderDashboard } from './dashboard/renderer.js';
import { initInputForm } from './modules/inputForm.js';

let dataEntryScreenEl = null;
let loadingScreenEl = null;
let dashboardEl = null;

document.addEventListener('DOMContentLoaded', () => {
  dataEntryScreenEl = document.getElementById('data-entry-screen');
  loadingScreenEl = document.getElementById('loading-screen');
  dashboardEl = document.getElementById('dashboard');

  // Show the data-entry screen first; the pipeline only ever runs after a
  // successful submission from the form.
  if (loadingScreenEl) loadingScreenEl.classList.add('hidden');
  if (dashboardEl) dashboardEl.classList.add('hidden');
  if (dataEntryScreenEl) dataEntryScreenEl.classList.remove('hidden');

  initInputForm({
    container: dataEntryScreenEl,
    demoData: facilityData,
    onSubmit: (submittedFacilityData) => {
      if (dataEntryScreenEl) dataEntryScreenEl.classList.add('hidden');
      showLoadingScreen();

      // Brief transition before running the pipeline
      setTimeout(() => {
        runPipeline(submittedFacilityData);
      }, 800);
    }
  });
});

function showLoadingScreen() {
  if (!loadingScreenEl) return;
  loadingScreenEl.classList.remove('hidden');
  loadingScreenEl.style.display = '';
  // Restore the original loading markup in case a previous run left an error state here
  const content = loadingScreenEl.querySelector('.loading-content');
  if (content) {
    content.innerHTML = `
      <div class="loading-logo">
        <span class="logo-carbon">Carbon</span><span class="logo-intel">Intel</span>
      </div>
      <div class="loading-bar">
        <div class="loading-bar-fill"></div>
      </div>
      <p class="loading-text">Initializing emission analysis pipeline…</p>
    `;
  }
}

function runPipeline(facilityDataInput) {
  console.log('%c[CarbonIntel] Pipeline starting…', 'color: #10b981; font-weight: bold;');
  try {
    // Step 1: Data Layer (manual entry or demo data, already validated by inputForm)
    console.log('%c[Module 1] Data Layer', 'color: #06b6d4;', facilityDataInput);

    // Step 2: Calculation Engine
    const calcResult = calculateHotspots(facilityDataInput);
    console.log('%c[Module 2] Calc Engine', 'color: #06b6d4;', calcResult);

    // Step 3: Compliance Tags (Module 1.5)
    const complianceResult = tagCompliance(calcResult.ranking);
    console.log('%c[Module 1.5] Compliance Tags', 'color: #06b6d4;', complianceResult);

    // Step 4: Recommendation Matching (now also receives facility_baseline for justification math)
    const matchResult = matchRecommendations(calcResult.ranking, facilityDataInput.interventions, calcResult.facility_baseline);
    console.log('%c[Module 3] Match Engine', 'color: #06b6d4;', matchResult);

    // Step 5: Impact Projection
    const impactResult = projectImpact(calcResult, matchResult, facilityDataInput);
    console.log('%c[Module 4] Impact Projector', 'color: #06b6d4;', impactResult);

    // TASK 3: Cross-check before final render — a bad manual entry should produce
    // a clear message instead of a broken or blank dashboard.
    validateBeforeRender(calcResult, matchResult);

    // Step 6: Render Dashboard
    renderDashboard(calcResult, complianceResult, matchResult, impactResult, facilityDataInput);
    console.log('%c[Module 5] Dashboard rendered ✓', 'color: #10b981; font-weight: bold;');

  } catch (error) {
    console.error('[CarbonIntel] Pipeline Error:', error);
    showPipelineError(error);
  }
}

/**
 * TASK 3 — Cross-check before renderDashboard() runs.
 * Confirms: calcResult.ranking is non-empty, every recommendation's source_type
 * actually exists in calcResult.ranking, and facility_baseline > 0.
 */
function validateBeforeRender(calcResult, matchResult) {
  if (!Array.isArray(calcResult.ranking) || calcResult.ranking.length === 0) {
    throw new Error('No emission sources could be calculated. Check that at least one Scope 1/2/3 entry has both a quantity and an emission factor.');
  }

  const rankingSourceTypes = new Set(calcResult.ranking.map(r => r.source_type));
  const orphanRec = (matchResult.recommendations || []).find(rec => !rankingSourceTypes.has(rec.source_type));
  if (orphanRec) {
    throw new Error(`The intervention "${orphanRec.name}" targets source type "${orphanRec.source_type}", which was not found among the calculated emission hotspots.`);
  }

  if (!(calcResult.facility_baseline > 0)) {
    throw new Error('Facility baseline emissions must be greater than zero. Check your Scope 1/2/3 quantities and emission factors.');
  }
}

function showPipelineError(error) {
  if (!loadingScreenEl) return;
  loadingScreenEl.classList.remove('hidden');
  loadingScreenEl.style.display = '';
  const content = loadingScreenEl.querySelector('.loading-content');
  if (content) {
    content.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h2 style="color: var(--accent-rose); margin-bottom: 8px;">Pipeline Error</h2>
        <p style="color: var(--text-secondary); max-width: 400px; text-align: center;">${escapeHtml(error.message)}</p>
        <button type="button" id="error-edit-data-btn" class="btn btn-secondary" style="margin-top: 20px;">← Back to data entry</button>
      </div>
    `;
    const backBtn = document.getElementById('error-edit-data-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        loadingScreenEl.classList.add('hidden');
        if (dataEntryScreenEl) dataEntryScreenEl.classList.remove('hidden');
      });
    }
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
