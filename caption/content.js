console.log("wowowow");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSubtitles") {
    getCompleteSubtitles()
      .then((subtitles) => sendResponse({ subtitles }))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
});

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
      <h3>YouTube 词汇学习助手</h3>
      <div id="loading" style="display: none;">
          <div class="spinner"></div>
          <p>正在分析字幕内容...</p>
      </div>
      <div id="error" color: red;"></div>
      <div id="result" class="result-content"></div>
  `;

  const toggleButton = document.createElement("button");
  toggleButton.id = "vocab-helper-toggle";
  toggleButton.textContent = "词汇助手";
  toggleButton.onclick = async () => {
    sidebar.classList.toggle("active");
    // 如果是打开侧边栏，自动开始分析
    if (sidebar.classList.contains("active")) {
      await handleAnalysis();
    }
  };

  document.body.appendChild(sidebar);
  document.body.appendChild(toggleButton);
}

async function handleAnalysis() {
  showLoading(true);
  try {
    console.log("开始获取字幕");
    const subtitles = await getCompleteSubtitles();
    console.log("获取到的字幕内容:", subtitles.slice(0, 100) + "...");

    // 从storage获取词汇量设置
    const config = await chrome.storage.local.get(["vocabLevel"]);
    if (!config.vocabLevel) {
      throw new Error("请先在插件配置中设置词汇量");
    }

    console.log("开始调用AI接口");
    const result = await callAI(subtitles, config.vocabLevel);
    console.log("AI返回结果:", result);

    displayResults(result);
  } catch (error) {
    console.error("处理过程出错:", error);
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

async function callAI(subtitles, level) {
  console.log("Content: 准备调用AI");

  // 从存储中获取API key
  const config = await chrome.storage.local.get(["apiKey"]);
  if (!config.apiKey) {
    throw new Error("请先在插件配置中设置API Key");
  }

  const prompt = `
      请分析以下英文字幕内容，提取出对词汇量为${level}的学习者来说可能较难理解的单词。
      要求：
      1. 只提取明显超出该词汇量水平的重要单词
      2. 单词应该对理解视频内容有重要作用
      3. 优先选择在学术或专业场合常用的词汇
      4. 最多提供20个单词
      5. 请使用中文给出简明的释义和用法说明

      字幕内容: "${subtitles}"
  `;

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "callAI",
        apiKey: config.apiKey,
        prompt: prompt,
      },
      (response) => {
        console.log("Content: 收到AI响应:", response);
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || "AI分析失败"));
        }
      }
    );
  });
}

function displayResults(aiResponse) {
  console.log("Content: 开始展示结果:", aiResponse);
  const resultDiv = document.getElementById("result");
  if (!resultDiv) {
    console.error("找不到结果展示区域");
    return;
  }

  try {
    resultDiv.innerHTML = aiResponse.words.replace(/\n/g, "<br>");
    resultDiv.style.display = "block";
    console.log("结果展示完成");
  } catch (error) {
    console.error("展示结果时出错:", error);
    showError("展示结果时出错: " + error.message);
  }
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
