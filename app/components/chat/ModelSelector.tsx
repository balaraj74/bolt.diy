import { useStore } from '@nanostores/react';
import { useEffect, useState, useRef } from 'react';
import { classNames } from '~/utils/classNames';
import { availableModels, selectedModelStore, type ModelConfig, checkOllamaAvailability } from '~/lib/stores/models';

interface ModelSelectorProps {
  disabled?: boolean;
  className?: string;
  menuPosition?: 'top' | 'bottom';
}

export const ModelSelector = ({ disabled, className, menuPosition = 'bottom' }: ModelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedModel = useStore(selectedModelStore);
  const [availableModelList, setAvailableModelList] = useState(availableModels);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const checkLocalModels = async () => {
      const ollamaModels = availableModels.filter((m) => m.type === 'ollama');

      if (ollamaModels.length > 0 && ollamaModels[0].apiEndpoint) {
        const available = await checkOllamaAvailability(ollamaModels[0].apiEndpoint);

        if (!available) {
          setAvailableModelList((prevModels) => prevModels.filter((m) => m.type !== 'ollama'));

          if (selectedModel.type === 'ollama') {
            const defaultModel = availableModels.find((m) => m.type === 'google');

            if (defaultModel) {
              selectedModelStore.set(defaultModel);
            }
          }
        }
      }
    };

    checkLocalModels();
  }, [selectedModel.type]);

  const handleModelSelect = (model: ModelConfig) => {
    selectedModelStore.set(model);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={classNames('relative inline-block w-64', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={classNames(
          'flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-left bg-bolt-background-secondary rounded-lg',
          'border border-bolt-border hover:border-bolt-border-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bolt-action-primary',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        )}
      >
        <span className="flex items-center">
          <span className="ml-2">{selectedModel.name}</span>
        </span>
        <span className="i-ph:caret-down-bold" />
      </button>

      {isOpen && (
        <div
          className={classNames(
            'absolute z-10 w-full mt-2 origin-top-right bg-bolt-background-secondary rounded-md shadow-lg ring-1 ring-bolt-border ring-opacity-5 focus:outline-none',
            menuPosition === 'top' ? 'bottom-full mb-2' : 'top-full',
          )}
        >
          <div className="py-1">
            {availableModelList.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model)}
                className={classNames(
                  'flex items-center w-full px-4 py-2 text-sm text-bolt-text-primary hover:bg-bolt-background-tertiary',
                  selectedModel.id === model.id ? 'bg-bolt-background-tertiary' : '',
                )}
              >
                <span className="flex-1">{model.name}</span>
                {model.type === 'ollama' && <span className="ml-2 text-xs text-bolt-text-secondary">Local</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
