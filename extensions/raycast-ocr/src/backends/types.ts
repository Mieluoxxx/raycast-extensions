/**
 * OCR Backend Type Definitions and Interfaces
 */

/**
 * Supported OCR Backend Types
 */
export enum OCRBackend {
  VISION_API = "vision",
  OPENAI_VLM = "openai",
  GEMINI_VLM = "gemini",
}

/**
 * OCR Backend Configuration
 */
export interface OCRBackendConfig {
  /** Backend type */
  type: OCRBackend;
  /** OpenAI API Key (only required for OpenAI backend) */
  apiKey?: string;
  /** API Endpoint (supports custom or third-party compatible endpoints) */
  apiEndpoint?: string;
  /** Model name */
  model?: string;
  /** Image detail level (high recommended for OCR) */
  detail?: "auto" | "low" | "high";
}

/**
 * Unified OCR Backend Interface
 */
export interface IOCRBackend {
  /**
   * Recognize text from image
   * @param imagePath - Absolute path to the image file
   * @param customPrompt - Optional custom prompt (for special scenarios like LaTeX)
   * @returns Recognized text content
   * @throws OCRError when recognition fails
   */
  recognizeText(imagePath: string, customPrompt?: string): Promise<string>;

  /**
   * Validate backend configuration
   * @returns true if configuration is valid
   */
  validateConfig(): Promise<boolean>;

  /**
   * Get backend display name
   * @returns Backend name
   */
  getName(): string;
}

/**
 * OCR Error Types
 */
export enum OCRErrorType {
  /** Network error */
  NETWORK_ERROR = "network",
  /** Invalid API Key */
  API_KEY_INVALID = "api_key",
  /** Quota exceeded */
  QUOTA_EXCEEDED = "quota",
  /** Request timeout */
  TIMEOUT = "timeout",
  /** Invalid image */
  INVALID_IMAGE = "invalid_image",
  /** Configuration error */
  CONFIG_ERROR = "config",
  /** Unknown error */
  UNKNOWN = "unknown",
}

/**
 * OCR Custom Error Class
 */
export class OCRError extends Error {
  /**
   * Create OCR Error
   * @param type Error type
   * @param message Error message
   * @param details Error details (optional)
   */
  constructor(
    public type: OCRErrorType,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "OCRError";
  }
}
