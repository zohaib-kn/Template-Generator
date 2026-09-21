/**
 * services/ai/index.ts
 *
 * Public entrypoint for the AI Document Generation Architecture.
 */

export * from "./config/documentTypes";
export * from "./config/documentProfiles";
export * from "./config/writingRules";

export * from "./documents/canonicalDocument";
export * from "./documents/normalizeDocumentData";
export * from "./documents/documentPlanner";
export * from "./documents/documentRouter";

export * from "./validators";

export * from "./examples/exampleTypes";
export * from "./examples/seedExamples";
export * from "./examples/exampleRepository";
export * from "./examples/exampleRetriever";

export * from "./gemini/geminiClient";
export * from "./gemini/promptBuilder";
export * from "./gemini/generateDocument";
export * from "./prompts/studentVoiceGuidelines";
