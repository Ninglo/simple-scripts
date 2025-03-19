console.log("wowowow");

let hasLoadedContent = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSubtitles") {
    getCompleteSubtitles()
      .then((subtitles) => sendResponse({ subtitles }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
});

// 更新消息监听器，使用单个监听器
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "streamUpdate") {
    const resultDiv = document.getElementById("result");
    if (resultDiv) {
      // 如果是第一次接收内容，清空并创建文本节点
      if (!resultDiv._textNode) {
        resultDiv.textContent = "";
        resultDiv._textNode = document.createTextNode("");
        resultDiv.appendChild(resultDiv._textNode);
      }

      // 仅更新文本节点的内容
      resultDiv._textNode.nodeValue += message.content;
      resultDiv.scrollTop = resultDiv.scrollHeight;
      resultDiv.style.display = "block";
    }
  } else if (message.type === "streamError") {
    showError(message.error);
  }
});

// 替换为新的监听器
const messageHandler = (message) => {
  if (message.type === "streamUpdate") {
    const resultDiv = document.getElementById("result");
    if (resultDiv) {
      if (!resultDiv._content) {
        resultDiv._content = "";
      }
      resultDiv._content += message.content;
      resultDiv.textContent = resultDiv._content;
      resultDiv.scrollTop = resultDiv.scrollHeight;
      resultDiv.style.display = "block";
    }
  } else if (message.type === "streamError") {
    showError(message.error);
  }
};

// 注册单个消息监听器
chrome.runtime.onMessage.addListener(messageHandler);

async function getCompleteSubtitles() {
  console.log("开始获取字幕");
  const videoId = extractVideoId(window.location.href);
  console.log("当前视频ID:", videoId);

  if (!videoId) {
    throw new Error("无法获取视频ID");
  }

  // 等待 ytInitialPlayerResponse 加载
  let ytInitialData;
  // 如果还是没有找到，尝试从页面源码中提取
  if (!ytInitialData) {
    console.log(
      "从window对象中未找到ytInitialPlayerResponse，尝试从页面源码提取"
    );
    const ytInitialPlayerMatch = document.body.innerHTML.match(
      /ytInitialPlayerResponse\s*=\s*({.+?});/
    );
    if (ytInitialPlayerMatch) {
      try {
        ytInitialData = JSON.parse(ytInitialPlayerMatch[1]);
      } catch (e) {
        console.error("解析页面源码中的ytInitialPlayerResponse失败:", e);
      }
    }
  }

  if (!ytInitialData) {
    throw new Error("无法获取视频数据，请刷新页面重试");
  }

  console.log("获取到的初始数据:", ytInitialData);

  // 从播放器响应中获取字幕URL
  const captionTracks =
    ytInitialData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("未找到字幕轨道");
  }

  // 寻找英文字幕
  const englishTrack = captionTracks.find(
    (track) => track.languageCode === "en" || track.vssId.includes(".en")
  );

  if (!englishTrack) {
    throw new Error("未找到英文字幕");
  }

  console.log("找到英文字幕链接:", englishTrack.baseUrl);

  // 获取字幕内容 - 这个URL直接返回完整的字幕内容
  const response = await fetch(englishTrack.baseUrl);
  if (!response.ok) {
    throw new Error("获取字幕内容失败");
  }

  const xmlContent = await response.text();
  console.log("获取到的XML字幕内容:", xmlContent.slice(0, 200));

  // 解析XML格式的字幕
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
  const textElements = xmlDoc.getElementsByTagName("text");

  // 提取所有字幕文本并合并
  const subtitleText = Array.from(textElements)
    .map((element) => element.textContent.trim())
    .filter((text) => text)
    .join(" ");

  console.log("最终合并的字幕长度:", subtitleText.length);
  console.log("字幕示例:", subtitleText.slice(0, 200));

  return subtitleText;
}

function extractVideoId(url) {
  const urlObj = new URL(url);
  return urlObj.searchParams.get("v");
}

function createSidebar() {
  const sidebar = document.createElement("div");
  sidebar.id = "vocab-helper-sidebar";
  sidebar.innerHTML = `
      <div id="vocab-helper-resize"></div>
      <h3>YouTube 词汇学习助手</h3>
      <div id="loading" style="display: none;">
          <div class="spinner"></div>
          <p>正在分析字幕内容...</p>
      </div>
      <div id="error" style="display: none; color: red;"></div>
      <div id="result" class="result-content"></div>
  `;

  const toggleButton = document.createElement("button");
  toggleButton.id = "vocab-helper-toggle";
  toggleButton.textContent = "词汇助手";
  toggleButton.onclick = async () => {
    sidebar.classList.toggle("active");
    if (sidebar.classList.contains("active")) {
      await handleAnalysis();
    }
  };

  document.body.appendChild(sidebar);
  document.body.appendChild(toggleButton);

  // 添加拖拽调整功能
  const resizeHandle = document.getElementById("vocab-helper-resize");
  let startX, startWidth;

  function startResize(e) {
    startX = e.clientX;
    startWidth = parseInt(getComputedStyle(sidebar).width, 10);

    // 创建遮罩层
    const overlay = document.createElement("div");
    overlay.className = "resize-overlay";
    document.body.appendChild(overlay);

    // 添加移动和结束事件监听
    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResize);

    // 防止文本选中
    e.preventDefault();
  }

  function resize(e) {
    const diff = startX - e.clientX;
    const newWidth = Math.min(
      Math.max(startWidth + diff, 300),
      window.innerWidth * 0.8
    );
    sidebar.style.width = `${newWidth}px`;
  }

  function stopResize() {
    // 移除遮罩层和事件监听
    document.querySelector(".resize-overlay")?.remove();
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("mouseup", stopResize);
  }

  resizeHandle.addEventListener("mousedown", startResize);
}

async function handleAnalysis() {
  // Skip if content is already loaded
  if (hasLoadedContent && document.getElementById("result").textContent.trim()) {
    return;
  }

  showLoading(true);
  try {
    console.log("开始获取字幕");
    const subtitles = await getCompleteSubtitles();
    console.log("获取到的字幕内容:", subtitles.slice(0, 100) + "...");

    const config = await chrome.storage.local.get(["vocabLevel"]);
    if (!config.vocabLevel) {
      throw new Error("请先在插件配置中设置词汇量");
    }

    console.log("开始调用AI接口");
    await callAI(subtitles, config.vocabLevel);
    hasLoadedContent = true;
  } catch (error) {
    console.error("处理过程出错:", error);
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

async function callAI(subtitles, level) {
  console.log("Content: 准备调用AI");

  const config = await chrome.storage.local.get(["apiKey", "baseUrl", "model"]);
  if (!config.apiKey) {
    throw new Error("请先在插件配置中设置API Key");
  }

  // 清空结果区域，重置内容
  const resultDiv = document.getElementById("result");
  if (resultDiv) {
    resultDiv.textContent = "";
    resultDiv._content = ""; // 重置存储的内容
    resultDiv.style.display = "block";
  }

  const prompt = `
  作为英语教育专家，请对这个视频内容进行快速分析，帮助学习者（词汇量${level}）决定是否适合学习观看。
  请按以下结构简明扼要地分析：
  
  0. 学习建议：
     - 建议是否观看（直接给出"建议观看"或"建议跳过"）
     - 如果建议观看，提供1-2个具体的学习策略
  
  1. 内容速览 (50字以内)：
     - 视频主要讨论什么
     - 讲话者的语速和发音特点
  
  2. 难度匹配度评估：
     - 整体难度等级（CEFR标准）
     - 与学习者水平的匹配程度：完全合适/稍有挑战/可能困难
     - 预计理解度：x%
  
  3. 主要挑战点（如果合适学习）：
     - 列出主要的关键难词/短语及其含义
     - 提示若干需要注意的语言点（如从句结构、习语等）
  
  字幕内容: "${subtitles}"
  `;
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        action: "callAI",
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
        prompt: prompt,
      },
      (response) => {
        if (response?.success && response?.status === "streaming") {
          resolve({ words: "" });
        }
      }
    );
  });
}

function showLoading(show) {
  document.getElementById("loading").style.display = show ? "block" : "none";
  document.getElementById("error").style.display = "none";
}

function showError(message) {
  console.error("Content: 显示错误:", message);
  const errorDiv = document.getElementById("error");
  if (!errorDiv) {
    console.error("Content: 找不到error元素");
    return;
  }
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  document.getElementById("loading").style.display = "none";
  document.getElementById("vocabTable").style.display = "none";
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// 替换原有的初始化代码为：
function init() {
  if (document.getElementById("vocab-helper-sidebar")) {
    return; // 已经初始化过了
  }
  createSidebar();
}

// YouTube 使用了 History API 来导航，所以我们需要监听 URL 变化
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    init();
  }
}).observe(document, { subtree: true, childList: true });

// 初始加载
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
