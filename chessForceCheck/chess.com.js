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
  let transparent = 0.3;
  let observer = undefined;

  const checks = [
    "enemy's capture",
    "enemy's check",
    "enemy's attack",
    "my capture",
    "my check",
    "my attack",
  ];

  // 悬浮窗
  const floatWindow = document.createElement("div");
  floatWindow.style.position = "fixed";
  floatWindow.style.top = "10px";
  floatWindow.style.right = "80px";
  floatWindow.style.width = "200px";
  // floatWindow.style.height = "260px";
  floatWindow.style.backgroundColor = "white";
  floatWindow.style.border = "1px solid black";
  floatWindow.style.padding = "10px";
  floatWindow.style.zIndex = 10000;
  document.body.appendChild(floatWindow);

  const infoDiv = document.createElement("div");
  floatWindow.appendChild(infoDiv);

  const transparentArea = document.createElement("div");
  const transparencyLabel = document.createElement("label");
  transparencyLabel.textContent = "Transparent:";
  transparencyLabel.style.marginRight = "8px";

  const transparencyInput = document.createElement("input");
  transparencyInput.type = "number";
  transparencyInput.min = "0";
  transparencyInput.max = "1";
  transparencyInput.step = `${transparent}`;
  transparencyInput.value = `${transparent}`;
  transparencyInput.style.width = "48px";
  transparencyInput.oninput = () => {
    transparent = parseFloat(transparencyInput.value);
    overlay.style.backgroundColor = `rgba(0, 0, 0, ${transparent})`;
  };

  transparentArea.appendChild(transparencyLabel);
  transparentArea.appendChild(transparencyInput);
  floatWindow.appendChild(transparentArea);

  const startBtn = document.createElement("button");
  startBtn.textContent = "Start";
  startBtn.style.width = "48px";
  startBtn.onclick = () => {
    activeGame = true;
    waitingForEnter = true;
    updateFloatWindow();
    blockMouseClicks();
    startMutation();

    startBtn.style.display = "none";
    transparentArea.style.display = "none";
    stopBtn.style.display = "inline-block";
  };

  const stopBtn = document.createElement("button");
  stopBtn.textContent = "End";
  stopBtn.style.width = "48px";
  stopBtn.style.display = "none";
  stopBtn.onclick = () => {
    activeGame = false;
    updateFloatWindow();

    startBtn.style.display = "inline-block";
    transparentArea.style.display = "block";
    stopBtn.style.display = "none";
    observer?.disconnect();
  };

  const buttonArea = document.createElement("div");
  buttonArea.style.marginTop = "8px";
  buttonArea.appendChild(startBtn);
  buttonArea.appendChild(stopBtn);
  floatWindow.appendChild(buttonArea);

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.zIndex = 9999;
  overlay.style.backgroundColor = `rgba(0, 0, 0, ${transparent})`;
  overlay.style.display = "none";
  document.body.appendChild(overlay);

  // 更新信息
  function updateFloatWindow() {
    infoDiv.innerHTML = `
      <p style="margin: 0">Current status: ${
        activeGame ? "Gaming" : "Stopped"
      }</p>
      <p style="margin: 0">Current turn: ${turnCounter}</p>
      <p style="margin: 0">Checklist:
        <br/>
        <span style="font-size: 1.2rem;color: #c4c3c3;">(press Enter to next)</span>
      </p>
      <ul style="margin: 0">
        ${checks
          .map((check, index) => {
            let status = "";
            if (index < checksCompleted) {
              status = " ✅";
            } else if (index === checksCompleted) {
              status = " ⏳";
            }
            return `<li>${check}${status}</li>`;
          })
          .join("")}
      </ul>
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

  // 等待 0.2 秒后，等待Enter确认
  function prepareCheckStep() {
    if (checksCompleted < checks.length) {
      waitingForEnter = false;
      setTimeout(() => {
        waitingForEnter = true;
      }, 200);
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

  function startMutation() {
    const targetNode = document.querySelector(
      ".play-controller-moves-container"
    );
    if (targetNode) {
      observer = new MutationObserver(handleMutation);
      observer.observe(targetNode, { childList: true, subtree: true });
      return observer;
    }
  }
})();
