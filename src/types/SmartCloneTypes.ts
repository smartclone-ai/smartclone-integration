export interface AIProvider {
  initialize(modelId: string): Promise<boolean>;
  generate(prompt: string, options?: any): Promise<string>;
  isReady(): Promise<boolean>;
  getCapabilities(): string[];
}

export interface MultiElasticRecommendation {
  technology: string;
  model: string;
  capability: string;
  fallbacks?: string[];
  confidence: number;
}
