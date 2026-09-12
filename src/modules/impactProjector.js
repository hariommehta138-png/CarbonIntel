/**
 * @module impactProjector
 * @description Projects the impact of interventions on facility baseline emissions and intensity.
 */

/**
 * Projects emissions impact based on calculations and matching interventions.
 * @param {Object} calcResult - Result from calculateHotspots.
 * @param {Object} matchResult - Result from matchRecommendations.
 * @param {Object} facilityData - Original facility data.
 * @returns {Object} Impact projection summary grouped by scope.
 */
export function projectImpact(calcResult, matchResult, facilityData) {
  if (!calcResult || !matchResult || !facilityData) {
    throw new Error('calcResult, matchResult, and facilityData are required.');
  }

  let projected_baseline = calcResult.facility_baseline || 0;
  const original_baseline = calcResult.facility_baseline || 0;
  
  const projections = [];
  const scopeReductions = { 1: 0, 2: 0, 3: 0 };
  const scopeOriginals = { 1: 0, 2: 0, 3: 0 };

  // Calculate original baseline by scope
  if (Array.isArray(calcResult.ranking)) {
    for (const item of calcResult.ranking) {
      if (item.scope >= 1 && item.scope <= 3) {
        scopeOriginals[item.scope] += (item.emissions_tco2e || 0);
      }
    }
  }

  // Iterate over recommendations and apply reductions
  const recommendations = matchResult.recommendations || [];
  for (const rec of recommendations) {
    const reduction = rec.potential_reduction_tco2e || 0;
    projected_baseline -= reduction;

    // Find the scope for this source type
    const matchedItem = (calcResult.ranking || []).find(r => r.source_type === rec.source_type);
    const scope = matchedItem ? matchedItem.scope : null;
    
    if (scope && scope >= 1 && scope <= 3) {
      scopeReductions[scope] += reduction;
    }

    projections.push({
      name: rec.name,
      source_type: rec.source_type,
      reduction_tco2e: reduction,
      cumulative_baseline: projected_baseline
    });
  }

  const total_reduction_tco2e = original_baseline - projected_baseline;
  const total_reduction_pct = original_baseline > 0 ? (total_reduction_tco2e / original_baseline) : 0;

  const productionVolume = facilityData.facility?.production_volume || 0;
  const new_intensity = productionVolume > 0 ? (projected_baseline / productionVolume) : 0;

  return {
    original_baseline,
    projected_baseline,
    total_reduction_tco2e,
    total_reduction_pct,
    original_intensity: calcResult.intensity || 0,
    new_intensity,
    intensity_unit: calcResult.intensity_unit || '',
    by_scope: {
      1: {
        original: scopeOriginals[1],
        projected: scopeOriginals[1] - scopeReductions[1],
        reduction: scopeReductions[1]
      },
      2: {
        original: scopeOriginals[2],
        projected: scopeOriginals[2] - scopeReductions[2],
        reduction: scopeReductions[2]
      },
      3: {
        original: scopeOriginals[3],
        projected: scopeOriginals[3] - scopeReductions[3],
        reduction: scopeReductions[3]
      }
    },
    projections
  };
}
