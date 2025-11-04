/*
 * Shared AI provider contracts
 */

export interface AIProvider {
  initialize(modelId: string): Promise<boolean>;
  probe(modelId: string): Promise<boolean>;
}
