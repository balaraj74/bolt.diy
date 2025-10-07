interface OllamaModelResponse {
  models: string[];
}

export interface OllamaRequestOptions {
  model: string;
  prompt: string;
  stream?: boolean;
  context?: number[];
  options?: {
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string[];
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
}

export class OllamaService {
  private _baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this._baseUrl = baseUrl;
  }

  async generateCompletion(options: OllamaRequestOptions): Promise<Response> {
    const response = await fetch(`${this._baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    return response;
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this._baseUrl}/api/tags`);

    if (!response.ok) {
      throw new Error('Failed to fetch Ollama models');
    }

    const data = (await response.json()) as OllamaModelResponse;

    return data.models || [];
  }
}
