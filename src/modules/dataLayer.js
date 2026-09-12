/**
 * @module dataLayer
 * @description Provides the default facility data, scopes, interventions, and emission factor registry.
 */

/**
 * Facility data and its associated scope emissions and interventions.
 */
export const facilityData = {
  facility: { 
    name: 'GreenSteel Industries', 
    industry_type: 'Iron & Steel', 
    production_volume: 1000, 
    production_unit: 'tonnes' 
  },
  scope1: [
    { source_type: 'boiler', fuel_type: 'diesel', quantity: 1200, unit: 'liters', emission_factor: 0.00268, factor_source: 'IPCC 2006 Guidelines Vol.2 Ch.1 Table 1.4 — diesel/gas oil stationary combustion (2.68 kg CO₂/L)', data_type: 'measured' },
    { source_type: 'furnace', fuel_type: 'natural_gas', quantity: 5000, unit: 'scm', emission_factor: 0.00202, factor_source: 'IPCC 2006 Guidelines Vol.2 Ch.2 — natural gas default (2.02 kg CO₂/scm)', data_type: 'measured' },
    { source_type: 'dg_set', fuel_type: 'diesel', quantity: 800, unit: 'liters', emission_factor: 0.00268, factor_source: 'IPCC 2006 Guidelines Vol.2 Ch.1 Table 1.4 — diesel/gas oil stationary combustion', data_type: 'measured' },
    { source_type: 'waste', fuel_type: null, quantity: 200, unit: 'tonnes', emission_factor: 0.450, factor_source: 'IPCC 2006 Guidelines Vol.5 — industrial solid waste default', data_type: 'assumption' }
  ],
  scope2: [
    { source_type: 'grid_electricity', quantity: 450000, unit: 'kWh', emission_factor: 0.000710, factor_source: 'CEA CO₂ Baseline Database v21.0, FY24-25 (0.710 tCO₂/MWh)', data_type: 'measured' }
  ],
  scope3_optional: [
    { source_type: 'transport', quantity: 15000, unit: 'tonne_km', emission_factor: 0.000132, factor_source: 'India GHG Program — road freight transport study (0.132 kg CO₂/tonne-km)', data_type: 'assumption' },
    { source_type: 'purchased_materials', quantity: 500, unit: 'tonnes', emission_factor: null, factor_source: 'Needs India GHG Program sector study or GHG Protocol default', data_type: 'assumption' }
  ],
  interventions: [
    { source_type: 'boiler', name: 'Switch boiler fuel from diesel to PNG', reduction_pct: 0.35, cost_tier: 'medium', feasibility_tier: 'high' },
    { source_type: 'grid_electricity', name: 'Install 500 kWp rooftop solar', reduction_pct: 0.25, cost_tier: 'high', feasibility_tier: 'high' },
    { source_type: 'grid_electricity', name: 'Procure 100% renewable energy certificates (RECs)', reduction_pct: 0.80, cost_tier: 'medium', feasibility_tier: 'medium' },
    { source_type: 'furnace', name: 'Waste heat recovery system for furnace', reduction_pct: 0.20, cost_tier: 'high', feasibility_tier: 'medium' },
    { source_type: 'dg_set', name: 'Replace DG set with battery energy storage', reduction_pct: 0.90, cost_tier: 'high', feasibility_tier: 'low' },
    { source_type: 'transport', name: 'Shift 40% freight to rail', reduction_pct: 0.40, cost_tier: 'low', feasibility_tier: 'medium' },
    { source_type: 'waste', name: 'Implement zero-waste-to-landfill program', reduction_pct: 0.60, cost_tier: 'low', feasibility_tier: 'high' }
  ]
};

/**
 * Registry of emission factors to allow central management and updates.
 */
export const emissionFactorRegistry = {
  'diesel_stationary': {
    factor: 0.00268,
    unit: 'tCO2e/liter',
    source: 'IPCC 2006 Guidelines Vol.2 Ch.1 Table 1.4',
    last_updated: '2023-01-01'
  },
  'natural_gas_stationary': {
    factor: 0.00202,
    unit: 'tCO2e/scm',
    source: 'IPCC 2006 Guidelines Vol.2 Ch.2',
    last_updated: '2023-01-01'
  },
  'industrial_solid_waste': {
    factor: 0.450,
    unit: 'tCO2e/tonne',
    source: 'IPCC 2006 Guidelines Vol.5',
    last_updated: '2023-01-01'
  },
  'grid_electricity_india': {
    factor: 0.000710,
    unit: 'tCO2e/kWh',
    source: 'CEA CO₂ Baseline Database v21.0, FY24-25',
    last_updated: '2024-04-01'
  },
  'road_freight': {
    factor: 0.000132,
    unit: 'tCO2e/tonne_km',
    source: 'India GHG Program',
    last_updated: '2023-01-01'
  }
};
