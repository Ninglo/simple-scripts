chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "callAI") {
    console.log("Background: 开始调用AI API");

    fetch("https://api.nuwaapi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: request.prompt }],
        temperature: 0.7,
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "API请求失败");

        // 直接返回AI的响应内容
        const content = data.choices?.[0]?.message?.content || "";
        sendResponse({ success: true, data: { words: content } });
      })
      .catch((error) => {
        console.error("Background: 处理过程出错:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }
});

function parseAIResponse(content) {
  try {
    const lines = content.split("\n").filter((line) => line.trim());
    console.log("Background: 分行后的内容:", lines);

    const parsed = lines
      .map((line) => {
        const parts = line.split("|");
        if (parts.length !== 2) {
          console.warn("Background: 行格式不正确:", line);
          return null;
        }
        return {
          word: parts[0].trim(),
          definition: parts[1].trim(),
        };
      })
      .filter((item) => item && item.word && item.definition);

    if (parsed.length === 0) {
      throw new Error("没有解析出有效的单词释义对");
    }

    return parsed;
  } catch (error) {
    console.error("Background: 解析响应时出错:", error);
    throw new Error(`解析AI响应失败: ${error.message}`);
  }
}
