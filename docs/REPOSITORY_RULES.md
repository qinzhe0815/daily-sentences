# GitHub 推送与合并限制

配置对象：`qinzhe0815/daily-sentences` 的 `main` 分支。

2026-10-14 已通过 GitHub API 核验：[Protect main](https://github.com/qinzhe0815/daily-sentences/rules/25056915) 已启用，规则 ID 为 `25056915`。目标为 `refs/heads/main`，要求 PR、阻止强推和删除、要求解决讨论，批准人数为 0；绕过列表为空，当前管理员账号也不能绕过。

## 保护配置

可导入的 GitHub 分支 Ruleset 为 [.github/rulesets/protect-main.json](../.github/rulesets/protect-main.json)。文件本身不会自动改变 GitHub 设置；只有在 GitHub 导入并保存为 Active 后才生效。

| 项目 | 设置 |
| --- | --- |
| 规则名称 | Protect main |
| 目标分支 | `main` |
| 执行状态 | Active |
| 直接推送 main | 要求先创建 Pull Request |
| 强制推送 | 禁止 |
| 删除 main | 禁止 |
| PR 中未解决的讨论 | 解决后才能合并 |
| 其他人批准数量 | 0，个人维护时可自行合并自己的 PR |
| 绕过规则的人员或应用 | 无，管理员及集成也应走 PR |
| 强制 CI 检查／签名提交 | 本配置未开启 |

公开仓库可被其他人阅读、克隆和 Fork；只有获得写入权限的账号或应用才能向原仓库推送。分支规则是在既有访问权限上继续限制 `main`，不会给其他人新增写入权限。

## 导入方式

1. 用仓库所有者账号登录 GitHub，进入仓库 **Settings → Rules → Rulesets**。
2. 在 **New ruleset** 菜单中选择 **Import a ruleset**。
3. 选择本地 `.github/rulesets/protect-main.json`。macOS 文件选择器中可按 `Command+Shift+G` 输入该文件所在目录，以访问隐藏的 `.github` 目录。
4. 核对 Target branches 包含 `main`、Enforcement status 为 **Active**，且 Bypass list 为空。
5. 保存后打开规则详情页复核设置。只把 JSON 提交进 Git 不会启用规则。

若已存在同名规则，应先核对现有规则，避免反复导入产生重复规则。

## 后续提交方式

启用后，在功能分支上提交并推送，再创建 PR 合并到 `main`：

```sh
git switch main
git pull --ff-only
git switch -c docs/update-guide
# 修改文件后，仅暂存本次需要提交的文件
git add README.md
git commit -m "docs: update guide"
git push -u origin docs/update-guide
```

然后在 GitHub 创建 `docs/update-guide → main` 的 Pull Request，检查差异、完成讨论后合并。之后其他修改应使用新的分支名。

目前允许个人维护者在没有第二位批准者时合并；如果未来有多位维护者，再考虑要求至少 1 位批准者或 Code Owner 审核。

## 生效验证

仓库所有者可在规则详情页核对，或通过 GitHub API 检查：

```text
GET /repos/qinzhe0815/daily-sentences/rulesets
GET /repos/qinzhe0815/daily-sentences/rules/branches/main
```

应能看到 Active 的分支规则，目标包含 `main`，有效规则包含 `pull_request`、`non_fast_forward` 和 `deletion`。不要通过真正删除 main 或强制推送来测试保护。

更改、禁用或删除规则需要仓库管理权限。普通代码读写权限、Git SSH 推送权限不等同于管理规则权限。

参考：[GitHub Ruleset 规则说明](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)、[导入与管理 Ruleset](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository)。
