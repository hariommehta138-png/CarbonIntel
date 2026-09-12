/**
 * @module matchEngine
 * @description Matches recommended interventions to emission hotspots based on heuristics.
 */

const COST_SCORE_MAP = {
  low: 1.0,
  medium: 0.5,
  high: 0.2
};

const FEASIBILITY_SCORE_MAP = {
  high: 1.0,
  medium: 0.6,
  low: 0.3
};

/**
 * Matches interventions to emission hotspots and scores them.
 * @param {Array<Object>} ranking - Ranked hotspots from the calculation engine.
 * @param {Array<Object>} interventions - List of possible interventions.
 * @param {number} facility_baseline - Total facility baseline emissions (tCO2e) from calculateHotspots(),
 *   used only to express each recommendation's reduction as a % of total facility footprint.
 * @returns {Object} Recommendations sorted by score.
 */
export function matchRecommendations(ranking, interventions, facility_baseline) {
  if (!Array.isArray(ranking) || !Array.isArray(interventions)) {
    throw new Error('Both ranking and interventions must be arrays.');
  }

  const recommendations = [];

  for (const intervention of interventions) {
    if (!intervention.source_type) continue;

    const matchedHotspot = ranking.find(r => r.source_type === intervention.source_type);
    if (!matchedHotspot) continue;

    const costScore = COST_SCORE_MAP[intervention.cost_tier] || 0;
    const feasibilityScore = FEASIBILITY_SCORE_MAP[intervention.feasibility_tier] || 0;
    const reductionPct = intervention.reduction_pct || 0;

    const score = (0.5 * reductionPct) + (0.3 * costScore) + (0.2 * feasibilityScore);
    const potential_reduction_tco2e = matchedHotspot.emissions_tco2e * reductionPct;

    const justification = buildJustification({
      source_type: intervention.source_type,
      reductionPct,
      potential_reduction_tco2e,
      facility_baseline,
      capex_inr: intervention.capex_inr,
      annual_savings_inr: intervention.annual_savings_inr
    });

    recommendations.push({
      source_type: intervention.source_type,
      name: intervention.name,
      score: score,
      reduction_pct: reductionPct,
      potential_reduction_tco2e: potential_reduction_tco2e,
      cost_tier: intervention.cost_tier,
      feasibility_tier: intervention.feasibility_tier,
      matched_emissions_tco2e: matchedHotspot.emissions_tco2e,
      justification
    });
  }

  recommendations.sort((a, b) => b.score - a.score);

  return {
    scoring_method: 'Internal MVP heuristic (weights: 0.5 reduction / 0.3 cost / 0.2 feasibility) — not from any regulation',
    recommendations
  };
}

/**
 * Builds a `justification` object using ONLY numbers already available in the pipeline —
 * no invented figures. Financial fields are only computed when both capex_inr and
 * annual_savings_inr were actually provided on the intervention.
 */
function buildJustification({ source_type, reductionPct, potential_reduction_tco2e, facility_baseline, capex_inr, annual_savings_inr }) {
  const pct_of_hotspot = reductionPct * 100;
  const pct_of_facility = (facility_baseline > 0) ? (potential_reduction_tco2e / facility_baseline) * 100 : 0;

  const hasCapex = capex_inr != null && capex_inr !== '';
  const hasSavings = annual_savings_inr != null && annual_savings_inr !== '';
  const financial_data_available = hasCapex && hasSavings;

  let payback_years = null;
  let cost_per_tco2e_inr = null;

  if (financial_data_available) {
    payback_years = capex_inr / annual_savings_inr;
    cost_per_tco2e_inr = capex_inr / potential_reduction_tco2e;
  }

  const readableSource = formatSourceType(source_type);
  let justification_text = `Cuts ${readableSource} emissions by ${pct_of_hotspot.toFixed(0)}%, equal to ${pct_of_facility.toFixed(1)}% of total facility footprint`;

  if (financial_data_available && Number.isFinite(payback_years)) {
    justification_text += ` — pays back in ${payback_years.toFixed(1)} years.`;
  } else {
    justification_text += '.';
  }

  return {
    pct_of_hotspot,
    pct_of_facility,
    financial_data_available,
    payback_years,
    cost_per_tco2e_inr,
    justification_text
  };
}

/** Format source_type into a readable label: "grid_electricity" -> "grid electricity" */
function formatSourceType(type) {
  if (!type) return '';
  return String(type).replace(/_/g, ' ');
}
