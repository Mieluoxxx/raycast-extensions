/**
 * OCR Backend Factory
 * Uses factory pattern to create different types of OCR backend instances
 */

import { OCRBackend, OCRBackendConfig, IOCRBackend } from "./types";
import { VisionAPIBackend } from "./vision-api";
import { OpenAIVLMBackend } from "./openai-vlm";
import { GeminiVLMBackend } from "./gemini-vlm";

export class OCRBackendFactory {
  /**
   * Create OCR backend instance
   * @param config Backend configuration
   * @returns OCR backend instance
   * @throws Error if backend type is unknown
   */
  static create(config: OCRBackendConfig): IOCRBackend {
    switch (config.type) {
      case OCRBackend.VISION_API:
        return new VisionAPIBackend();

      case OCRBackend.OPENAI_VLM:
        return new OpenAIVLMBackend(config);

      case OCRBackend.GEMINI_VLM:
        return new GeminiVLMBackend(config);

      default:
        throw new Error(`Unknown backend type: ${config.type}`);
    }
  }
}
