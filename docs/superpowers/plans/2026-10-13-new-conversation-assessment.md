# 每次新建对话询问诊断 Implementation Plan

**Goal:** 每次新建对话都展示简短诊断／跳过选项，默认诊断，不受语言档案是否存在影响。
**Architecture:** 保持现有表单与服务层。档案仅为自选水平提供默认值；显式跳过才直接出题，诊断结果仍由用户决定是否更新档案。
**Tech Stack:** 浏览器 ES modules、Node.js、node:test。

- [x] 先在 tests/ui.test.js 为六方向、有／无档案表单增加可见选项和默认诊断断言；在 tests/service.test.js 覆盖已有档案重复新建默认诊断、显式跳过及档案不被覆盖。运行测试确认旧逻辑失败。
- [x] public/views.js 去掉 assessment-choice 的条件 hidden；public/app.js 去掉切换目标语言时隐藏选项，继续填入档案水平；public/i18n.js 更新三语言档案提示；server/service.mjs 默认诊断，保留显式跳过。
- [x] PRD.md 升级至 1.1，同步范围、主流程、引导、FR-02、AC-01/02；README.md 与 docs/ACCEPTANCE.md 同步新行为和验证记录。
- [x] 运行 npm test 与 npm run check。使用隔离 QA 数据验证新建弹窗切换有／无档案目标语言、重复打开默认诊断与两种提交路径。刷新正式页面载入新前端；若需重启服务，仅重启本任务启动的进程。

用户已直接明确要求此行为变更并授权实现；无需再次确认。当前项目没有 Git 仓库，不创建提交。
