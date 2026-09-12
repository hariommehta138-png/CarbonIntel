/**
 * @module calcEngine
 * @description Calculates emission hotspots, baseline emissions, and intensities.
 */

/**
 * Calculates emission hotspots and baselines based on facility data.
 * @param {Object} facilityData - The facility data containing scopes and metadata.
 * @returns {Object} The calculated baselines, intensity, and source rankings.
 */
export function calculateHotspots(facilityData) {
  if (!facilityData || typeof facilityData !== 'object') {
    throw new Error('Invalid facilityData provided.');
  }

  const { facility = {}, scope1 = [], scope2 = [], scope3_optional = [] } = facilityData;
  const productionVolume = facility.production_volume || 0;
  
  const allSources = [
    ...scope1.map(item => ({ ...item, scope: 1 })),
    ...scope2.map(item => ({ ...item, scope: 2 })),
    ...scope3_optional.map(item => ({ ...item, scope: 3 }))
  ];

  let facility_baseline = 0;
  const skipped_sources = [];
  const processedSources = [];

  for (const item of allSources) {
    if (item.emission_factor == null) {
      console.warn(`Skipping ${item.source_type}: Missing emission factor.`);
      skipped_sources.push({ source_type: item.source_type, reason: 'Missing emission factor' });
      continue;
    }

    const quantity = item.quantity || 0;
    const emissions_tco2e = quantity * item.emission_factor;
    facility_baseline += emissions_tco2e;

    processedSources.push({
      ...item,
      emissions_tco2e
    });
  }

  const ranking = processedSources.map(item => {
    const share_pct = facility_baseline > 0 ? (item.emissions_tco2e / facility_baseline) : 0;
    return {
      source_type: item.source_type,
      scope: item.scope,
      fuel_type: item.fuel_type || null,
      emissions_tco2e: item.emissions_tco2e,
      share_pct: share_pct,
      factor_source: item.factor_source,
      data_type: item.data_type
    };
  });

  ranking.sort((a, b) => b.share_pct - a.share_pct);

  const intensity = productionVolume > 0 ? (facility_baseline / productionVolume) : 0;
  const intensity_unit = facility.production_unit ? `tCO₂e per ${facility.production_unit}` : 'tCO₂e per unit';

  return {
    facility_baseline,
    intensity,
    intensity_unit,
    skipped_sources,
    ranking
  };
}
