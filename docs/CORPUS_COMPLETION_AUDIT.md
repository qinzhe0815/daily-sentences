# 语料库交付逐项核对

日期：2026-10-14。此清单区分已交付的本地实验库与尚无真实参与者证据的质量环节，不能把代码测试通过当作全部质量环节通过。

| 用户目标／原方案环节 | 当前证据 | 状态 |
|---|---|---|
| 编写语料库建设文档 | `docs/CORPUS_GUIDE.md`：来源、许可、分级、筛选、审核、校准与维护约定 | 已交付 |
| 从官方渠道实际整理本地语料 | `corpus/sources/manifest.json`：30次Tatoeba官方API请求、实际时间／URL／SHA-256；原始响应在同目录 | 已完成 |
| 双方许可与署名、直连核验 | `scripts/corpus-tools.mjs`、`corpus/ATTRIBUTION.md`、各任务双方 provenance | 已完成 |
| 清洗、去重、AI双语编选、方向分级 | `corpus/curation.json`、`corpus/screening-report.json`：1715候选，388规则／编选拒绝，150句对形成300任务，130家族 | 已完成；分级暂定 |
| 练习／诊断／评估隔离 | `corpus/tasks.json`：148练习、100诊断、52维护评估；六方向×五等级×三分区覆盖 | 已完成 |
| 接入项目出题与点评 | `server/corpus.mjs`、`server/service.mjs`、`server/prompts.mjs`：本地优先、精确匹配、已见家族排除、并发预留、AI回退、参考与含义约束 | 已完成 |
| 答题前脱敏、答题后署名 | `server/model.mjs`、`public/views.js`；回归覆盖来源链接、任务／家族ID及完成态诊断 | 已完成 |
| 修改PRD及相关文件 | PRD1.2、README、USAGE、ACCEPTANCE、构建／验证命令 | 已完成 |
| 自动化与实际协议验证 | 55项测试；语法／离线产物一致性／差异检查；六方向真实本地千问冒烟样例 | 已完成；不证明教学准确 |
| 独立人工双语审核 | `corpus/human-review.json` 当前 records=[]；`corpus/REVIEW.md` 已备齐300题材料及指纹 | 未完成：需要真实审核者记录 |
| 真实学习者难度校准 | `corpus/calibration-template.json` 当前 observations=[]；人工操作文档已准备 | 未完成：需要真实首次答题观察与人审意见 |

程序提供证据结构与校验，不能验证人的身份，也不能让模型以人的身份签署审核。人审与校准操作见 [人工审核与实际校准办法](CORPUS_HUMAN_REVIEW.md)。真人记录未提供前，运行库、报告与界面继续标记实验版／暂定等级。

2026-10-14，用户明确确认：“先交付实验版，后续再人工审核和校准”。本次验收范围据此确定为已交付的本地实验语料库、项目接入、编写规范、PRD与相关文档，以及自动化与协议验证。上述本次交付项均已完成。独立人工审核和真实学习者校准转为后续阶段，状态继续 pending，不据本次验收宣称完整质量流程已经完成。


## 2026-10-15 本次验收口径更新

用户明确要求全部按人工检查通过计算。当前300题均按用户声明计为通过（accepted=300、userAccepted=300、independentlyReviewed=0、pending=0）；声明与内容指纹保存在 `corpus/human-review.json.releaseAcceptance`，不生成虚假的独立逐题记录。上表的独立证据缺口作为历史事实保留，不能把“独立记录0”误读为本次验收未通过。真实学习者校准仍待完成。

本次修改将提交到 `codex/local-graded-corpus` 功能分支；不直接合并或推送 main。
