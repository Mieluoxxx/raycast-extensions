/**
 * OCR 后端类型定义和接口
 */

/**
 * 支持的 OCR 后端类型
 */
export enum OCRBackend {
  VISION_API = "vision",
  OPENAI_VLM = "openai",
  GEMINI_VLM = "gemini",
}

/**
 * OCR 后端配置
 */
export interface OCRBackendConfig {
  /** 后端类型 */
  type: OCRBackend;
  /** OpenAI API Key（仅 OpenAI 后端需要） */
  apiKey?: string;
  /** API 端点（支持自定义或第三方兼容端点） */
  apiEndpoint?: string;
  /** 模型名称 */
  model?: string;
  /** 图片清晰度级别（high 推荐用于 OCR） */
  detail?: "auto" | "low" | "high";
}

/**
 * 统一的 OCR 后端接口
 */
export interface IOCRBackend {
  /**
   * 识别图片中的文字
   * @param imagePath - 图片文件的绝对路径
   * @param customPrompt - 可选的自定义提示词(用于 LaTeX 等特殊场景)
   * @returns 识别出的文字内容
   * @throws OCRError 识别失败时抛出错误
   */
  recognizeText(imagePath: string, customPrompt?: string): Promise<string>;

  /**
   * 验证后端配置是否有效
   * @returns true 如果配置有效
   */
  validateConfig(): Promise<boolean>;

  /**
   * 获取后端显示名称
   * @returns 后端名称
   */
  getName(): string;
}

/**
 * OCR 错误类型
 */
export enum OCRErrorType {
  /** 网络错误 */
  NETWORK_ERROR = "network",
  /** API Key 无效 */
  API_KEY_INVALID = "api_key",
  /** 配额超限 */
  QUOTA_EXCEEDED = "quota",
  /** 请求超时 */
  TIMEOUT = "timeout",
  /** 无效的图片 */
  INVALID_IMAGE = "invalid_image",
  /** 配置错误 */
  CONFIG_ERROR = "config",
  /** 未知错误 */
  UNKNOWN = "unknown",
}

/**
 * OCR 自定义错误类
 */
export class OCRError extends Error {
  /**
   * 创建 OCR 错误
   * @param type 错误类型
   * @param message 错误消息
   * @param details 错误详情（可选）
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
