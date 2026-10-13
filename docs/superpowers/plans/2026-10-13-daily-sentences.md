# Daily Sentences Implementation Plan

**Goal:** 实现 PRD 的本地单用户翻译练习首版。
**Architecture:** Node.js HTTP API + SQLite 事务聚合 + 无构建浏览器 ES modules。AI 与语音分别适配，学习数据和凭证分离。
**Tech Stack:** Node.js 24、node:sqlite、node:test、HTML/CSS/JavaScript。

## 1. 数据与规则
- [x] 先写 tests/model.test.js，运行 `node --test tests/model.test.js` 验证缺失模块失败。
- [x] 实现 server/model.mjs 的设置校验、五题窗口、备份完整性检查，和 server/store.mjs 的 SQLite 事务、启动中断恢复。
- [x] 测试角色/语言快照、固定模式、修改排除、损坏备份回滚、重启恢复。

## 2. AI 与学习 API
- [x] 先写 tests/service.test.js，测试六方向、未配置、并发隔离、重复提交、失败重试、诊断、收藏、复习和导入。
- [x] 实现 server/ai.mjs：超时、错误分类、JSON 输出约束、加权评分和提示规则版本。
- [x] 实现 server/service.mjs：请求开始前持久保存、ID 绑定回写、五题诊断、设置继承、首题、历史与复习。
- [x] 实现 server/http.mjs 与 server/index.mjs：同源 API、静态页面、配置和连接测试、备份预览确认。
- [x] 运行 `npm test`，确保测试服务不进入生产路径。

## 3. 浏览器体验
- [x] 实现 public/i18n.js、public/app.js、public/views.js、public/speech.js 与 public/styles.css。
- [x] 覆盖引导、诊断、练习、历史、收藏筛选、设置、备份恢复、保存失败与语音状态。
- [x] 使用本地预览检查桌面与窄屏布局、键盘、切换对话、刷新恢复和安全文本渲染。

## 4. 交付验证
- [x] 提供 .env.example、README.md、docs/ACCEPTANCE.md，记录启动、服务协议、数据位置、限制和验收证据。
- [x] 运行完整测试与 JavaScript 语法检查，进行最终代码审查。
- [x] 保持可启动的本地项目，报告真实 AI/麦克风/人工内容质量验证的实际状态。
