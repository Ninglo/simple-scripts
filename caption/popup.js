document.addEventListener("DOMContentLoaded", () => {
  // 加载已保存的配置
  chrome.storage.local.get(["apiKey", "vocabLevel"], (result) => {
    document.getElementById("apiKey").value = result.apiKey || "";
    document.getElementById("vocabLevel").value = result.vocabLevel || "";
  });

  // 保存配置
  document.getElementById("saveConfig").addEventListener("click", () => {
    const apiKey = document.getElementById("apiKey").value;
    const vocabLevel = document.getElementById("vocabLevel").value;

    chrome.storage.local.set(
      {
        apiKey,
        vocabLevel,
      },
      () => {
        const status = document.getElementById("status");
        status.textContent = "配置已保存";
        setTimeout(() => (status.textContent = ""), 2000);
      }
    );
  });
});
