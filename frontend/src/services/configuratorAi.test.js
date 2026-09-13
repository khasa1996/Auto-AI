import { buildConfiguratorAIIntent, extractFinanceIntent, getAIConfigurationSelection, getAIInteractionState } from './configuratorAi';

describe('configurator AI contract helpers', () => {
  test('builds a bounded intent for the active variant', () => {
    expect(buildConfiguratorAIIntent('seltos-gtx', 'Give me a black SUV under 20 lakh')).toEqual({
      variant_id: 'seltos-gtx',
      raw_request: 'Give me a black SUV under 20 lakh',
    });
  });

  test('serializes live city and current configuration separately from user text', () => {
    const intent = buildConfiguratorAIIntent('seltos-gtx', 'Make it black', {
      city: 'Delhi',
      currentConfiguration: { variant_id: 'seltos-gtx', paint_id: 'red', wheel_id: 'alloy-18' },
    });
    expect(intent.raw_request).toContain('__AUTO_AI_CONTEXT__');
    expect(intent.raw_request).toContain('"city":"Delhi"');
    expect(intent.raw_request).toContain('"paint_id":"red"');
    expect(intent.raw_request).toContain('\nMake it black');
  });

  test('extracts explicit EMI rate and tenure without inventing finance assumptions', () => {
    expect(extractFinanceIntent('show EMI at 9% for 5 years', 2500000)).toEqual({ principal: 2500000, annual_rate: 9, tenure_months: 60 });
    expect(extractFinanceIntent('show EMI for five years', 2500000)).toBeNull();
  });

  test('extracts only the backend-resolved configuration and interaction state', () => {
    const response = {
      data: {
        valid: true,
        explanation: 'Matched the available catalog.',
        configuration: {
          purchasable: { variant_id: 'seltos-gtx', paint_id: 'black', wheel_id: 'alloy-18', interior_id: 'black', roof_id: null, accessory_ids: ['sunroof'] },
          interaction: { hood_open: true, boot_open: false, sunroof_open: true, doors: { front_left: true, front_right: true, rear_left: false, rear_right: false }, lighting: { headlights: true, drl: true }, camera_preset: 'front' },
        },
        price: { estimated_on_road: 2500000 },
      },
    };
    expect(getAIConfigurationSelection(response)).toEqual({
      purchasable: response.data.configuration.purchasable,
      interaction: response.data.configuration.interaction,
      price: response.data.price,
      explanation: response.data.explanation,
    });
  });

  test('normalizes the complete non-purchasable showroom state', () => {
    expect(getAIInteractionState({ doors: { front_left: true, front_right: false, rear_left: true, rear_right: false }, hood_open: true, boot_open: false, frunk_open: true, sunroof_open: true, lighting: { headlights: true, drl: true, taillights: false, fog_lights: true, left_indicator: true, right_indicator: false, hazard: false, interior: true }, camera_preset: 'interior' })).toEqual({
      doors: { frontLeft: true, frontRight: false, rearLeft: true, rearRight: false },
      hoodOpen: true, bootOpen: false, frunkOpen: true, sunroofOpen: true,
      lighting: { headlights: true, drl: true, taillights: false, fog_lights: true, left_indicator: true, right_indicator: false, hazard: false, interior: true },
      cameraPreset: 'interior',
    });
  });

  test('returns null when the backend rejects the AI request', () => {
    expect(getAIConfigurationSelection({ data: { valid: false, configuration: null } })).toBeNull();
  });
});
