import CarConfigurator from './CarConfigurator';
import ConfiguratorAIAssistant from '../components/configurator/ConfiguratorAIAssistant';

export default function ConfiguratorExperience() {
  return (
    <div className="relative">
      <CarConfigurator />
      <div className="fixed bottom-5 right-5 z-40">
        <ConfiguratorAIAssistant />
      </div>
    </div>
  );
}
