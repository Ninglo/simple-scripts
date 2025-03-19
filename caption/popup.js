document.addEventListener("DOMContentLoaded", () => {
  // 加载已保存的配置
  chrome.storage.local.get(
    ["apiKey", "vocabLevel", "baseUrl", "model"],
    (result) => {
      document.getElementById("apiKey").value = result.apiKey || "";
      document.getElementById("vocabLevel").value = result.vocabLevel || "";
      document.getElementById("baseUrl").value =
        result.baseUrl || "https://api.openai.com/v1";
      document.getElementById("model").value = result.model || "gpt-3.5-turbo";
    }
  );

  // 保存配置
  document.getElementById("saveConfig").addEventListener("click", () => {
    const apiKey = document.getElementById("apiKey").value;
    const vocabLevel = document.getElementById("vocabLevel").value;
    const baseUrl = document
      .getElementById("baseUrl")
      .value.trim()
      .replace(/\/$/, ""); // 移除末尾的斜杠
    const model = document.getElementById("model").value.trim();

    chrome.storage.local.set(
      {
        apiKey,
        vocabLevel,
        baseUrl,
        model,
      },
      () => {
        const status = document.getElementById("status");
        status.textContent = "配置已保存";
        setTimeout(() => (status.textContent = ""), 2000);
      }
    );
  });
});
