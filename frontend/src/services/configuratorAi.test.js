import { buildConfiguratorAIIntent, getAIConfigurationSelection } from './configuratorAi';

describe('configurator AI contract helpers', () => {
  test('builds a bounded intent for the active variant', () => {
    expect(buildConfiguratorAIIntent('seltos-gtx', 'Give me a black SUV under 20 lakh')).toEqual({
      variant_id: 'seltos-gtx',
      raw_request: 'Give me a black SUV under 20 lakh',
    });
  });

  test('extracts only the backend-resolved configuration and interaction state', () => {
    const response = {
      data: {
        valid: true,
        explanation: 'Matched the available catalog.',
        configuration: {
          purchasable: {
            variant_id: 'seltos-gtx',
            paint_id: 'black',
            wheel_id: 'alloy-18',
            interior_id: 'black',
            roof_id: null,
            accessory_ids: ['sunroof'],
          },
          interaction: {
            hood_open: true,
            boot_open: false,
            sunroof_open: true,
            doors: { front_left: true, front_right: true, rear_left: false, rear_right: false },
            lighting: { headlights: true, drl: true },
            camera_preset: 'front',
          },
        },
      },
    };

    expect(getAIConfigurationSelection(response)).toEqual({
      purchasable: response.data.configuration.purchasable,
      interaction: response.data.configuration.interaction,
    });
  });

  test('returns null when the backend rejects the AI request', () => {
    expect(getAIConfigurationSelection({ data: { valid: false, configuration: null } })).toBeNull();
  });
});
