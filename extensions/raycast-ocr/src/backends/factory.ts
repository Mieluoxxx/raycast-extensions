/**
 * OCR 后端工厂
 * 使用工厂模式创建不同类型的 OCR 后端实例
 */

import { OCRBackend, OCRBackendConfig, IOCRBackend } from "./types";
import { VisionAPIBackend } from "./vision-api";
import { OpenAIVLMBackend } from "./openai-vlm";
import { GeminiVLMBackend } from "./gemini-vlm";

export class OCRBackendFactory {
  /**
   * 创建 OCR 后端实例
   * @param config 后端配置
   * @returns OCR 后端实例
   * @throws Error 如果后端类型未知
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
