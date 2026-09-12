/**
 * @module complianceTags
 * @description Tags emission sources with their respective regulatory compliance status.
 */

/**
 * Tags emission sources based on regulatory frameworks.
 * @param {Array<Object>} ranking - The ranked emissions sources from the calculation engine.
 * @returns {Object} An object keyed by source_type with compliance status.
 */
export function tagCompliance(ranking) {
  if (!Array.isArray(ranking)) {
    throw new Error('Ranking must be an array.');
  }

  const complianceMap = {};

  for (const item of ranking) {
    if (!item.source_type) continue;

    let compliance_status = '';
    if (item.scope === 1 || item.scope === 2) {
      compliance_status = 'CCTS-mandatory scope';
    } else if (item.scope === 3) {
      compliance_status = 'Voluntary (India GHG Program aligned)';
    }

    const tagData = {
      compliance_status,
      scope: item.scope
    };

    if (String(item.source_type).toLowerCase() === 'waste') {
      tagData.waste_compliance_flag = 'Subject to CPCB Solid/Hazardous Waste Management Rules — separate from carbon accounting';
    }

    complianceMap[item.source_type] = tagData;
  }

  return complianceMap;
}
