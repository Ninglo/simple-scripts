// ==UserScript==
// @name         Chess.com Turn Checker
// @namespace    http://tampermonkey.net/
// @version      0.5
// @match        https://www.chess.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  let activeGame = false;
  let turnCounter = 0;
  let checksCompleted = 0;
  let isMyTurn = false;
  let waitingForEnter = false;

  const checks = [
    "敌方是否有capture",
    "敌方是否有check",
    "敌方是否有attack",
    "我方是否有capture",
    "我方是否有check",
    "我方是否有attack",
  ];

  // 悬浮窗
  const floatWindow = document.createElement("div");
  floatWindow.style.position = "fixed";
  floatWindow.style.top = "10px";
  floatWindow.style.right = "80px";
  floatWindow.style.width = "220px";
  floatWindow.style.height = "180px";
  floatWindow.style.backgroundColor = "white";
  floatWindow.style.border = "1px solid black";
  floatWindow.style.padding = "10px";
  floatWindow.style.zIndex = 9999;
  document.body.appendChild(floatWindow);

  const infoDiv = document.createElement("div");
  floatWindow.appendChild(infoDiv);

  const startBtn = document.createElement("button");
  startBtn.textContent = "开始检测";
  floatWindow.appendChild(startBtn);

  const stopBtn = document.createElement("button");
  stopBtn.textContent = "结束对战";
  floatWindow.appendChild(stopBtn);

  startBtn.onclick = () => {
    activeGame = true;
    waitingForEnter = true;
    updateFloatWindow();
    blockMouseClicks();
  };
  stopBtn.onclick = () => {
    activeGame = false;
    updateFloatWindow();
  };

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.zIndex = 99999;
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
  overlay.style.display = "none";
  document.body.appendChild(overlay);

  // 更新信息
  function updateFloatWindow() {
    infoDiv.innerHTML = `
        <p>当前游戏状态: ${activeGame ? "进行中" : "已停止"}</p>
        <p>当前回合数: ${turnCounter}</p>
        <p>当前检查: ${checks[checksCompleted] || "—"} (共 ${
      checks.length
    } 项)</p>
      `;
  }

  // 阻止鼠标点击
  function blockMouseClicks() {
    overlay.style.display = "block";
    prepareCheckStep();
  }

  // 解除阻止
  function unblockMouseClicks() {
    overlay.style.display = "none";
  }

  // 等待2秒后，等待Enter确认
  function prepareCheckStep() {
    if (checksCompleted < checks.length) {
      waitingForEnter = false;
      setTimeout(() => {
        waitingForEnter = true;
      }, 2000);
    } else {
      unblockMouseClicks();
    }
  }

  // 按下Enter后进行下一检查
  document.addEventListener("keydown", (e) => {
    console.log("enter", e.key, waitingForEnter);
    if (e.key === "Enter" && waitingForEnter) {
      checksCompleted++;
      updateFloatWindow();
      prepareCheckStep();
    }
  });

  // 为DOM变化添加防抖
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  const handleMutation = debounce(() => {
    if (!activeGame) return;
    isMyTurn = !isMyTurn;
    if (isMyTurn) {
      turnCounter++;
      checksCompleted = 0;
      updateFloatWindow();
      blockMouseClicks();
    }
  }, 500);

  const targetNode = document.querySelector(".play-controller-moves-container");
  if (targetNode) {
    const observer = new MutationObserver(handleMutation);
    observer.observe(targetNode, { childList: true, subtree: true });
  }
})();
