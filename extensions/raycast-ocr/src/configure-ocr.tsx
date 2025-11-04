import { Action, ActionPanel, Form, showToast, Toast, LocalStorage, useNavigation } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { getBackendConfig, saveBackendConfig } from "./utils/config";
import { OCRBackend, OCRBackendConfig } from "./backends/types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBackend, setSelectedBackend] = useState<OCRBackend>(OCRBackend.VISION_API);

  // OpenAI 独立配置
  const [openaiApiKey, setOpenaiApiKey] = useState<string>("");
  const [openaiApiEndpoint, setOpenaiApiEndpoint] = useState<string>("");
  const [openaiModel, setOpenaiModel] = useState<string>("");
  const [openaiDetail, setOpenaiDetail] = useState<string>("high");

  // Gemini 独立配置
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [geminiApiEndpoint, setGeminiApiEndpoint] = useState<string>("");
  const [geminiModel, setGeminiModel] = useState<string>("");

  const { pop } = useNavigation();

  useEffect(() => {
    // 加载当前配置
    const loadConfig = async () => {
      const currentConfig = await getBackendConfig();
      setSelectedBackend(currentConfig.type);

      // 根据后端类型加载对应配置
      if (currentConfig.type === OCRBackend.OPENAI_VLM) {
        setOpenaiApiKey(currentConfig.apiKey || "");
        setOpenaiApiEndpoint(currentConfig.apiEndpoint || "");
        setOpenaiModel(currentConfig.model || "");
        setOpenaiDetail(currentConfig.detail || "high");
      } else if (currentConfig.type === OCRBackend.GEMINI_VLM) {
        setGeminiApiKey(currentConfig.apiKey || "");
        setGeminiApiEndpoint(currentConfig.apiEndpoint || "");
        setGeminiModel(currentConfig.model || "");
      }

      setIsLoading(false);
    };
    loadConfig();
  }, []);

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  const showOpenAIConfig = selectedBackend === OCRBackend.OPENAI_VLM;
  const showGeminiConfig = selectedBackend === OCRBackend.GEMINI_VLM;

  const handleSubmit = async () => {
    try {
      let newConfig: OCRBackendConfig;

      // 根据选择的后端构造对应配置
      if (selectedBackend === OCRBackend.OPENAI_VLM) {
        newConfig = {
          type: OCRBackend.OPENAI_VLM,
          apiKey: openaiApiKey?.trim() || undefined,
          apiEndpoint: openaiApiEndpoint?.trim() || "https://api.openai.com/v1",
          model: openaiModel?.trim() || "gpt-4o",
          detail: (openaiDetail as "auto" | "low" | "high") || "high",
        };
      } else if (selectedBackend === OCRBackend.GEMINI_VLM) {
        newConfig = {
          type: OCRBackend.GEMINI_VLM,
          apiKey: geminiApiKey?.trim() || undefined,
          apiEndpoint: geminiApiEndpoint?.trim() || "https://generativelanguage.googleapis.com/v1beta",
          model: geminiModel?.trim() || "gemini-2.5-flash",
          detail: "high", // Gemini 不使用此字段
        };
      } else {
        // Vision API
        newConfig = {
          type: OCRBackend.VISION_API,
          apiKey: undefined,
          apiEndpoint: undefined,
          model: undefined,
          detail: undefined,
        };
      }

      await saveBackendConfig(newConfig);

      const backendName =
        newConfig.type === OCRBackend.VISION_API
          ? "Vision API"
          : newConfig.type === OCRBackend.OPENAI_VLM
            ? "OpenAI Vision"
            : "Gemini Vision";

      await showToast({
        style: Toast.Style.Success,
        title: "配置已保存",
        message: `已切换到 ${backendName}`,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "保存失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  return (
    <Form
      navigationTitle="配置 OCR"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="保存配置" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="backend"
        title="OCR 后端"
        value={selectedBackend}
        onChange={(newValue) => setSelectedBackend(newValue as OCRBackend)}
      >
        <Form.Dropdown.Item value={OCRBackend.VISION_API} title="macOS Vision API" icon="🍎" />
        <Form.Dropdown.Item value={OCRBackend.OPENAI_VLM} title="OpenAI Vision" icon="☁️" />
        <Form.Dropdown.Item value={OCRBackend.GEMINI_VLM} title="Google Gemini Vision" icon="🌟" />
      </Form.Dropdown>

      {showOpenAIConfig && (
        <>
          <Form.Separator />

          <Form.Description text="OpenAI 配置" />

          <Form.PasswordField
            id="openaiApiKey"
            title="API Key"
            placeholder="sk-..."
            value={openaiApiKey}
            onChange={setOpenaiApiKey}
            info="你的 OpenAI API Key"
          />

          <Form.TextField
            id="openaiApiEndpoint"
            title="API 端点"
            placeholder="https://api.openai.com/v1"
            value={openaiApiEndpoint}
            onChange={setOpenaiApiEndpoint}
            info="自定义 API 端点(可选)"
          />

          <Form.TextField
            id="openaiModel"
            title="模型名称"
            placeholder="gpt-4o"
            value={openaiModel}
            onChange={setOpenaiModel}
            info="OpenAI 模型名称"
          />

          <Form.Dropdown id="openaiDetail" title="图片精度" value={openaiDetail} onChange={setOpenaiDetail}>
            <Form.Dropdown.Item value="high" title="高精度 (最佳 OCR 效果)" />
            <Form.Dropdown.Item value="auto" title="自动 (平衡)" />
            <Form.Dropdown.Item value="low" title="低精度 (更快更便宜)" />
          </Form.Dropdown>
        </>
      )}

      {showGeminiConfig && (
        <>
          <Form.Separator />

          <Form.Description text="Gemini 配置" />

          <Form.PasswordField
            id="geminiApiKey"
            title="API Key"
            placeholder="AIza..."
            value={geminiApiKey}
            onChange={setGeminiApiKey}
            info="你的 Google Gemini API Key"
          />

          <Form.TextField
            id="geminiApiEndpoint"
            title="API 端点"
            placeholder="https://generativelanguage.googleapis.com/v1beta"
            value={geminiApiEndpoint}
            onChange={setGeminiApiEndpoint}
            info="自定义 API 端点(可选)"
          />

          <Form.TextField
            id="geminiModel"
            title="模型名称"
            placeholder="gemini-2.5-flash"
            value={geminiModel}
            onChange={setGeminiModel}
            info="Gemini 模型名称"
          />
        </>
      )}
    </Form>
  );
}
