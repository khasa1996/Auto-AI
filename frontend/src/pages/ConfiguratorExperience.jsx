import CarConfigurator from './CarConfigurator';
import ConfiguratorAIAssistant from '../components/configurator/ConfiguratorAIAssistant';
import MultiVariantRecommendations from '../components/configurator/MultiVariantRecommendations';

export default function ConfiguratorExperience() {
  return (
    <div className="relative">
      <CarConfigurator />
      <div className="fixed bottom-5 left-5 z-40">
        <MultiVariantRecommendations />
      </div>
      <div className="fixed bottom-5 right-5 z-40">
        <ConfiguratorAIAssistant />
      </div>
    </div>
  );
}
