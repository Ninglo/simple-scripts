# YouTube 学习助手浏览器插件

![alt text](images/Snipaste_2025-03-19_11-45-06.png)

## 背景

回顾自己的英语学习历程，我觉着最有收获，就是那段高频将自己浸泡在英语环境中的时期。但当时的主要痛点包括：

- 无法预判视频是否符合自己的英语水平
- 视频可能过于简单或过于困难
- 在关键词汇上的理解障碍影响整体理解
- 即使能大致理解内容，观看过程依然费力

## 功能介绍

针对以上问题，这款浏览器插件提供以下功能：

- 自动读取 YouTube 视频字幕
- 通过 AI 分析视频内容难度是否适合用户
- 提供重要词汇的简单解释，帮助用户更好理解视频内容
- 结合视频场景加深词汇掌握

欢迎感兴趣的朋友试用，并提供宝贵意见。

## 安装和使用说明

1. 下载 caption.zip 文件，并解压（当然你直接 clone 项目也行）
2. 打开插件管理页面（chrome://extensions/）并打开 developer mode
![alt text](images/Snipaste_2025-03-19_12-00-40.png)
3. 点击页面左上角的 Load Unpacked，选择刚才解压的文件夹
![alt text](images/image.png)
4. 唤出插件配置弹窗
![alt text](images/image-1.png)
![alt text](images/image-2.png)
5. 配置好 API & model & API key & 词汇量（也有白嫖 key 的手段，如果需要我介绍可以提 issue）
6. 打开 YouTube 视频页，点击右上角的`词汇助手` button
![alt text](images/Snipaste_2025-03-19_11-45-06.png)
7. Enjoy!（弹窗出来会加载若干秒，取决于 AI 本身响应速率）