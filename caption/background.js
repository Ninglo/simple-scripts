chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "callAI") {
    console.log("Background: 开始调用AI API");

    const baseUrl = request.baseUrl || "https://api.openai.com/v1";
    const apiEndpoint = `${baseUrl}/chat/completions`;
    const model = request.model || "gpt-3.5-turbo";

    // 发送初始响应，表示开始流式传输
    sendResponse({ success: true, status: "streaming" });

    fetch(apiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: request.prompt }],
        temperature: 0.7,
        stream: true,
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("API请求失败");
        const reader = response.body.getReader();
        let buffer = "";

        function processResult() {
          reader.read().then(({ done, value }) => {
            if (done) return;

            // 解析数据块
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split("\n");

            lines.forEach((line) => {
              if (line.startsWith("data: ") && line !== "data: [DONE]") {
                try {
                  const data = JSON.parse(line.slice(6));
                  const content = data.choices[0]?.delta?.content || "";
                  buffer += content;

                  // 直接发送新内容
                  chrome.tabs.sendMessage(sender.tab.id, {
                    type: "streamUpdate",
                    content: content,
                  });
                } catch (e) {
                  console.error("解析chunk失败:", e);
                }
              }
            });

            processResult();
          });
        }

        processResult();
      })
      .catch((error) => {
        console.error("Background: 处理过程出错:", error);
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "streamError",
          error: error.message,
        });
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
