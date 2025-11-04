import { Clipboard, showToast, Toast, showHUD } from "@raycast/api";
import { getClipboardImagePath, cleanupTempFile } from "./utils/clipboard";
import { getBackendConfig } from "./utils/config";
import { OCRBackendFactory } from "./backends/factory";
import { OCRError, OCRErrorType } from "./backends/types";

export default async function Command() {
  let tempFilePath: string | null = null;

  try {
    // Show loading toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Recognizing text from image...",
    });

    // Get clipboard image
    tempFilePath = await getClipboardImagePath();

    if (!tempFilePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No image in clipboard",
        message: "Please copy or screenshot an image containing text first",
      });
      return;
    }

    // Create backend instance
    const config = await getBackendConfig();
    const backend = OCRBackendFactory.create(config);

    // Perform OCR
    const recognizedText = await backend.recognizeText(tempFilePath);

    if (!recognizedText || recognizedText.trim().length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text recognized",
        message: "The image may not contain text, or the text is not clear enough",
      });
      return;
    }

    // Copy to clipboard
    await Clipboard.copy(recognizedText);

    // Show success message
    const preview = recognizedText.length > 100 ? recognizedText.substring(0, 100) + "..." : recognizedText;

    await showHUD(`✓ Copied recognition result: ${preview}`);
  } catch (error) {
    console.error("OCR Error:", error);
    await handleOCRError(error);
  } finally {
    // Cleanup temporary file
    if (tempFilePath && tempFilePath.startsWith("/tmp/raycast-ocr")) {
      await cleanupTempFile(tempFilePath);
    }
  }
}

/**
 * Unified error handling
 */
async function handleOCRError(error: unknown) {
  if (error instanceof OCRError) {
    switch (error.type) {
      case OCRErrorType.API_KEY_INVALID:
        await showToast({
          style: Toast.Style.Failure,
          title: "API Key Error",
          message: "Please configure a valid API Key in extension settings",
        });
        break;

      case OCRErrorType.QUOTA_EXCEEDED:
        await showToast({
          style: Toast.Style.Failure,
          title: "Quota Exceeded",
          message: "API quota exhausted or rate limit reached, please try again later",
        });
        break;

      case OCRErrorType.TIMEOUT:
        await showToast({
          style: Toast.Style.Failure,
          title: "Request Timeout",
          message: "OCR processing took too long, try using a smaller image",
        });
        break;

      case OCRErrorType.NETWORK_ERROR:
        await showToast({
          style: Toast.Style.Failure,
          title: "Network Error",
          message: "Unable to connect to API service, please check your connection",
        });
        break;

      case OCRErrorType.CONFIG_ERROR:
        await showToast({
          style: Toast.Style.Failure,
          title: "Configuration Error",
          message: error.message,
        });
        break;

      case OCRErrorType.INVALID_IMAGE:
        await showToast({
          style: Toast.Style.Failure,
          title: "Image Error",
          message: error.message,
        });
        break;

      default:
        await showToast({
          style: Toast.Style.Failure,
          title: "Recognition Failed",
          message: error.message,
        });
    }
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Recognition Failed",
      message: error instanceof Error ? error.message : "Unknown error, please try again",
    });
  }
}
