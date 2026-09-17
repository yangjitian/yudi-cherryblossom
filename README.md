<p align="center">
  <img src="docs/logo.png" alt="雨滴·手记" width="120" />
</p>

# 雨滴·手记（yudi-cherryblossom）

冷淡简约、以樱花粉与湖水蓝点缀的 [Halo](https://www.halo.run/) 2.x 主题。
用 **Astro** 把页面预渲染成干净的 HTML，再交给 **Thymeleaf** 在运行时完成数据渲染。

## 功能特性

- **全站樱花飘落**：由 `data-petals` 控制（`full` / `header` / `none`），每个页面独立初始化。
- **无限滚动列表**：首页、分类、标签首屏服务端渲染，后续页通过公开 API 追加。
- **文章页**：目录侧栏（窄屏变抽屉、可折叠并记住状态）、评论区。
- **好物分享**：卡片网格 + 标签过滤，内容全部在 Console 里配置。
- **深浅色主题**，卡片网格响应式（桌面 3 列 / 平板 2 列 / 手机 1 列）。
- 配色、圆角、阴影等设计令牌集中在 `public/assets/css/main-v3.css` 的 CSS 变量里，换配色只改这一处。

## 技术栈

Halo 2.x（Thymeleaf 渲染）· Astro（把 `src/` 预渲染到 `templates/`）· Vue 3（仅用于 Island）· pnpm

## 环境要求

- Halo `>= 2.0.0`（开发环境为 2.26）
- Node `>= 22.12.0`、pnpm

## 快速开始

### 安装到 Halo

1. 到 [Releases](../../releases) 下载 zip；
2. Console → 主题 → 安装 → 上传主题包 → 启用；
3. 到 **主题设置** 填写个人资料与好物列表（见下文）。

### 需要手动创建的页面

Halo 不允许主题注册自定义路由，下面这些要在 Console 里新建并选择对应模板：

| 路由                      | 类型     | slug          | 模板                     |
| ------------------------- | -------- | ------------- | ------------------------ |
| `/article`                | 独立页面 | `article`     | 文章列表                 |
| `/about`                  | 独立页面 | `about`       | 关于                     |
| `/search`                 | 独立页面 | `search`      | 搜索                     |
| `/categories/goods-share` | 分类     | `goods-share` | 任意（自动换成卡片网格） |

`article` 页面可以用脚本一次创建并发布（会顺带重载主题）：

```powershell
$env:HALO_SITE="https://your-domain"; $env:HALO_PAT="<个人令牌>"; node scripts/create-article-page.mjs
```

### 本地开发

```bash
pnpm install
pnpm dev      # 监听 src/ 与 public/，改动即重新构建到 templates/
pnpm build     # 一次性构建
pnpm format    # Prettier 格式化
```

本地预览：把主题目录放进 Halo 的 `themes/` 下启用，建议关闭 Thymeleaf 缓存（`SPRING_THYMELEAF_CACHE=false`）。

博客在服务器上、想让本地改动即时生效，可以另开一个窗口跑 `node watch-sync.mjs`：它监听 `templates/` 并自动 `scp` 到远程主题目录。同步目标读环境变量 `SYNC_USER` / `SYNC_HOST` / `SYNC_DIR`，或 `watch-sync.local.json`（示例见 `watch-sync.local.example.json`）。注意它**只同步模板**，`theme.yaml` / `settings.yaml` 改动后要手动上传，并在 Console → 主题 点一次「重载主题配置」。

### 打包发布

```powershell
pnpm build
tar -a -c -f yudi-cherryblossom-1.0.7.zip theme.yaml settings.yaml templates
```

> 压缩包第一层必须是 `theme.yaml`、`settings.yaml`、`templates/`。不要用 PowerShell 的 `Compress-Archive`（条目路径会写成反斜杠，Linux 上解压异常），用 `tar`、7-Zip 或 [`@halo-dev/theme-package-cli`](https://github.com/halo-dev/theme-package-cli)。

## 项目结构

```
src/pages|layouts|components/                 # Astro 源码，编译为 templates/ 下的 HTML
public/assets|fragments|gateway_fragments/   # 原样复制：样式脚本、纯 Thymeleaf 片段、认证页片段
templates/                                   # 构建产物（Halo 读取的模板目录，已 gitignore）
theme.yaml / settings.yaml                   # 主题元数据 / 主题设置表单
scripts/create-article-page.mjs              # 一键创建文章列表页
watch-sync.mjs                               # 本地联调：把模板同步到远程 Halo
```

模板文件沿用 Halo 命名约定：`index.html`、`archives.html`、`post.html`、`category.html`、`tag.html`、`categories.html`、`tags.html`、`page.html`、`error/404.html`；独立页面模板为 `page_article-list.html`、`page_about.html`、`search.html`；认证页外壳与注册表单在 `gateway_fragments/`。

## 主题设置

| 分组     | 字段                                                               |
| -------- | ------------------------------------------------------------------ |
| 个人资料 | 头像、个人简介、邮箱、GitHub（仅关于页展示）                       |
| 好物分享 | 名称、来源域名、简介、标签、体验笔记链接、原网站链接（可重复添加） |

好物卡片分上下两个点击区：上半区（图标 / 名称 / 来源域名）跳原网站、新标签页打开；下半区（简介 / 标签 / 底部提示）跳站内体验笔记，体验笔记留空时回落到原网站且不显示粉色徽标。标签搜索是纯前端过滤，条目在几十条以内无需额外接口。

## 注意事项

- 样式与脚本改 `public/assets/`，模板里用 `/assets/...` 引用，不经过 Astro 打包。
- `astro.config.mjs` 的 `base`（当前 `/themes/yudi-cherryblossom`）决定静态资源路径，改主题名要同步改。
- 无封面图的文章不显示图片区域，Hero 与卡片退化为纯文字排版。
- Thymeleaf 运行时读不到 Astro 的 `slot` / `props`；需要运行时动态数据又不想写 Thymeleaf 的地方，放 `public/fragments/` 或 `public/assets/js/`。

## 许可证

[GPL-3.0](./LICENSE) © 2026 yangjitian，脚手架来自 [halo-sigs/theme-astro-starter](https://github.com/halo-sigs/theme-astro-starter)。
