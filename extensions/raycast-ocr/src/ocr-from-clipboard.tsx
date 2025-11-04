import { Clipboard, showToast, Toast, showHUD } from "@raycast/api";
import { getClipboardImagePath, cleanupTempFile } from "./utils/clipboard";
import { getBackendConfig } from "./utils/config";
import { OCRBackendFactory } from "./backends/factory";
import { OCRError, OCRErrorType } from "./backends/types";

export default async function Command() {
  let tempFilePath: string | null = null;

  try {
    // 显示加载提示
    await showToast({
      style: Toast.Style.Animated,
      title: "正在识别图片中的文字...",
    });

    // 获取剪贴板图片
    tempFilePath = await getClipboardImagePath();

    if (!tempFilePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "剪贴板中没有图片",
        message: "请先复制或截图一张包含文字的图片",
      });
      return;
    }

    // 创建后端实例
    const config = await getBackendConfig();
    const backend = OCRBackendFactory.create(config);

    // 执行 OCR
    const recognizedText = await backend.recognizeText(tempFilePath);

    if (!recognizedText || recognizedText.trim().length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "未识别到文字",
        message: "图片中可能没有文字，或文字不够清晰",
      });
      return;
    }

    // 复制到剪贴板
    await Clipboard.copy(recognizedText);

    // 显示成功消息
    const preview = recognizedText.length > 100 ? recognizedText.substring(0, 100) + "..." : recognizedText;

    await showHUD(`✓ 已复制识别结果: ${preview}`);
  } catch (error) {
    console.error("OCR Error:", error);
    await handleOCRError(error);
  } finally {
    // 清理临时文件
    if (tempFilePath && tempFilePath.startsWith("/tmp/raycast-ocr")) {
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
