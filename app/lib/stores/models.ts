import { atom } from 'nanostores';

export type ModelType = 'google' | 'ollama';

export interface ModelConfig {
  id: string;
  name: string;
  type: ModelType;
  apiEndpoint?: string;
  contextLength: number;
}

const MODEL_IDS = {
  GEMINI_2_FLASH: 'gemini-2.0-flash-exp',
  GEMINI_PRO: 'gemini-1.5-pro',
  GEMINI_FLASH: 'gemini-1.5-flash-latest',
  LLAMA2: 'ollama-llama2',
  CODELLAMA: 'ollama-codellama',
} as const;

export const MODELS = MODEL_IDS;
export type ModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS];
export const DEFAULT_MODEL = MODEL_IDS.GEMINI_2_FLASH;

export const availableModels: ModelConfig[] = [
  {
    id: MODEL_IDS.GEMINI_2_FLASH,
    name: 'Gemini 2.0 Flash',
    type: 'google',
    contextLength: 1000000,
  },
  {
    id: MODEL_IDS.GEMINI_PRO,
    name: 'Gemini 1.5 Pro',
    type: 'google',
    contextLength: 2000000,
  },
  {
    id: MODEL_IDS.GEMINI_FLASH,
    name: 'Gemini 1.5 Flash',
    type: 'google',
    contextLength: 1000000,
  },
  {
    id: MODEL_IDS.LLAMA2,
    name: 'Llama 2 (Local)',
    type: 'ollama',
    apiEndpoint: 'http://localhost:11434',
    contextLength: 4096,
  },
  {
    id: MODEL_IDS.CODELLAMA,
    name: 'CodeLlama (Local)',
    type: 'ollama',
    apiEndpoint: 'http://localhost:11434',
    contextLength: 4096,
  },
];

export const selectedModelStore = atom<ModelConfig>(availableModels[0]);

// Function to check if Ollama is available
export async function checkOllamaAvailability(apiEndpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiEndpoint}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}
