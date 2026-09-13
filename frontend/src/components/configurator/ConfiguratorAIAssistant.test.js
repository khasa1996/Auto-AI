import { getAIConfigurationSelection } from '../../services/configuratorAi';

describe('ConfiguratorAIAssistant response handling', () => {
  test('accepts only a valid backend configuration response', () => {
    expect(getAIConfigurationSelection({ data: { valid: true, configuration: { purchasable: { variant_id: 'v1' }, interaction: {} } } })).not.toBeNull();
  });

  test('rejects invalid backend configuration responses', () => {
    expect(getAIConfigurationSelection({ data: { valid: false, configuration: null } })).toBeNull();
  });
});
