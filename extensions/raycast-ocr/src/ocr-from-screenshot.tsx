import { Clipboard, showToast, Toast, showHUD, closeMainWindow } from "@raycast/api";
import { takeScreenshot, cleanupTempFile } from "./utils/clipboard";
import { getBackendConfig } from "./utils/config";
import { OCRBackendFactory } from "./backends/factory";
import { OCRError, OCRErrorType } from "./backends/types";
import { access } from "fs/promises";

export default async function Command() {
  let tempFilePath: string | null = null;

  try {
    // Show instruction toast
    await showToast({
      style: Toast.Style.Animated,
      title: "请选择要识别的屏幕区域...",
      message: "按 ESC 键可取消",
    });

    // Hide Raycast window before taking screenshot to avoid capturing it
    await closeMainWindow();

    // Wait a bit for the window to close smoothly
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Take screenshot
    tempFilePath = await takeScreenshot();

    // Check if user cancelled (file doesn't exist)
    try {
      await access(tempFilePath);
    } catch {
      await showHUD("已取消截图");
      return;
    }

    // Show recognizing toast
    await showToast({
      style: Toast.Style.Animated,
      title: "正在识别截图中的文字...",
    });

    // 创建后端实例
    const config = await getBackendConfig();
    const backend = OCRBackendFactory.create(config);

    // Recognize text
    const recognizedText = await backend.recognizeText(tempFilePath);

    if (!recognizedText || recognizedText.trim().length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "未识别到文字",
        message: "截图中可能没有文字，或文字不够清晰",
      });
      return;
    }

    // Copy to clipboard
    await Clipboard.copy(recognizedText);

    // Show success message with preview
    const preview = recognizedText.length > 100 ? recognizedText.substring(0, 100) + "..." : recognizedText;

    await showHUD(`✓ 已复制识别结果: ${preview}`);
  } catch (error) {
    console.error("OCR Error:", error);

    // Don't show error if user cancelled
    if (error instanceof Error && error.message.includes("cancelled")) {
      return;
    }

    await handleOCRError(error);
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }
  }
}

/**
 * 统一的错误处理
 */
async function handleOCRError(error: unknown) {
  if (error instanceof OCRError) {
    switch (error.type) {
      case OCRErrorType.API_KEY_INVALID:
        await showToast({
          style: Toast.Style.Failure,
          title: "API Key 错误",
          message: "请在扩展设置中配置有效的 OpenAI API Key",
        });
        break;

      case OCRErrorType.QUOTA_EXCEEDED:
        await showToast({
          style: Toast.Style.Failure,
          title: "配额超限",
          message: "API 配额已用尽或达到速率限制，请稍后重试",
        });
        break;

      case OCRErrorType.TIMEOUT:
        await showToast({
          style: Toast.Style.Failure,
          title: "请求超时",
          message: "OCR 处理时间过长，请尝试使用更小的图片",
        });
        break;

      case OCRErrorType.NETWORK_ERROR:
        await showToast({
          style: Toast.Style.Failure,
          title: "网络错误",
          message: "无法连接到 API 服务，请检查网络连接",
        });
        break;

      case OCRErrorType.CONFIG_ERROR:
        await showToast({
          style: Toast.Style.Failure,
          title: "配置错误",
          message: error.message,
        });
        break;

      case OCRErrorType.INVALID_IMAGE:
        await showToast({
          style: Toast.Style.Failure,
          title: "图片错误",
          message: error.message,
        });
        break;

      default:
        await showToast({
          style: Toast.Style.Failure,
          title: "识别失败",
          message: error.message,
        });
    }
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "识别失败",
      message: error instanceof Error ? error.message : "未知错误，请重试",
    });
  }
}
