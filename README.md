# 雨滴·手记（yudi-cherryblossom）

一个冷淡简约、以**樱花粉**与**湖水蓝**作点缀的 [Halo](https://www.halo.run/) 2.x 主题。

用 **Astro** 把页面与组件预渲染成干净的 HTML，再交给 **Thymeleaf** 在运行时完成数据渲染——既能用组件化方式组织模板，又能保留 Halo 主题的服务端渲染能力。

## 特性

- **全站樱花飘落**：由 `data-petals` 控制（`full` / `header` / `none`），页面切换时独立重新初始化，不需要跨页面保留花瓣状态。
- **无限滚动列表**：首页、分类、标签页首屏服务端渲染，后续页通过公开 API 追加。
- **文章页**：目录侧栏、阅读进度、评论区（由站点评论设置控制是否显示）。
- **好物分享**：一张张卡片组成的网格，内容全部在 Console 里配置，不写死在模板中。
- **深浅色主题**：跟随系统，也可手动切换（`localStorage` + `data-theme`）。
- **响应式**：桌面 3 列 / 平板 2 列 / 手机 1 列的卡片网格，其余页面按内容宽度自适应。
- **设计令牌集中**：配色、圆角、阴影等都在 `public/assets/css/main-v3.css` 的 CSS 变量里，换配色只需改这一处。

## 环境要求

| 依赖     | 版本                         |
| -------- | ---------------------------- |
| Halo     | `>= 2.0.0`（开发时使用 2.26） |
| Node     | `>= 22.12.0`                 |
| 包管理器 | pnpm                         |

## 安装

1. 到 [Releases](../../releases) 下载打包好的 zip；
2. Console → 主题 → 安装 → 上传主题包 → 启用；
3. 到 **主题设置** 填写个人资料与好物列表（见下文「主题设置」）。

## 需要手动创建的页面与分类

Halo 核心只提供 `index / post / page / archives / categories / category / tags / tag / author` 这些路由，主题无法注册自定义路由，所以下面这些需要在 Console 里新建，并选择对应模板：

| 路由      | 类型     | slug           | 模板              | 说明                                                              |
| --------- | -------- | -------------- | ----------------- | ----------------------------------------------------------------- |
| `/article` | 独立页面 | `article`      | 文章列表          | 精选 Hero + 最新文章无限滚动列表                                   |
| `/about`   | 独立页面 | `about`        | 关于              | 作者介绍与联系方式                                                |
| `/search`  | 独立页面 | `search`       | 搜索              | 站内搜索结果                                                      |
| `/categories/goods-share` | 分类 | `goods-share` | 任意（自动替换） | 「好物分享」：该分类的归档页会自动换成搜索行 + 卡片网格           |

其中 `article` 页面可以用脚本一键创建并发布（同时会重载主题，让 `theme.yaml` 的版本号与自定义模板注册生效）：

```powershell
$env:HALO_SITE="https://your-domain"; $env:HALO_PAT="<个人访问令牌>"; node scripts/create-article-page.mjs
```

个人访问令牌在 Console → 个人中心 → 个人令牌 创建，需要**内容管理**与**主题管理**权限。

## 路由与模板对照

| 路由              | 模板                                     | 说明                                        |
| ----------------- | ---------------------------------------- | ------------------------------------------- |
| `/`               | `templates/index.html`                   | 欢迎页：品牌语句 + 进入博客按钮             |
| `/archives`       | `templates/archives.html`                | 归档页：弧形年份轴 + 年 / 月分组时间线      |
| `/archives/:slug` | `templates/post.html`                    | 文章详情                                    |
| `/categories`     | `templates/categories.html`              | 分类集合                                    |
| `/categories/:slug` | `templates/category.html`              | 分类归档；`goods-share` 走 `fragments/goodies.html` |
| `/tags`           | `templates/tags.html`                    | 标签集合                                    |
| `/tags/:slug`     | `templates/tag.html`                     | 标签归档                                    |
| `/:slug`          | `templates/page.html`                    | 独立页面默认模板                            |
| 独立页面 + 模板    | `templates/page_article-list.html`       | 文章列表页                                  |
| 独立页面 + 模板    | `templates/page_about.html`              | 关于页                                      |
| 独立页面 + 模板    | `templates/search.html`                  | 搜索页                                      |
| 认证页            | `templates/gateway_fragments/*.html`     | 覆盖登录 / 注册 / 登出 / 密码重置的外壳与注册表单 |
| 404               | `templates/error/404.html`               | 错误页                                      |

列表类页面（文章列表 / 分类 / 标签）统一使用无限滚动：首屏由 `postFinder.list` 服务端渲染，后续页通过公开 API `/apis/api.content.halo.run/v1alpha1/posts` 追加。

无封面图的文章不会显示图片区域：Hero 与文章卡片会退化为纯文字排版，不使用占位图。

## 主题设置

Console → 主题设置，共两组：

| 分组       | 字段                                                              |
| ---------- | ----------------------------------------------------------------- |
| 个人资料   | 头像、个人简介、邮箱、GitHub（仅关于页展示）                       |
| 好物分享   | 名称、来源域名、简介、标签、体验笔记链接、原网站链接（可重复添加） |

好物卡片的跳转规则：

- 卡片分上下两个点击区。**上半区**（图标 / 名称 / 来源域名）跳**原网站**、新标签页打开；
- **下半区**（简介 / 标签 / 底部提示）跳**站内体验笔记**、同标签页打开；
- 体验笔记留空时，下半区回落到原网站，且不显示粉色徽标。

标签搜索是纯前端过滤（在当前已渲染的卡片里按标签文本匹配），条目数量在几十条以内时无需额外接口。

## 目录结构

```
.
├── src/                     # Astro 源码
│   ├── pages/               # 页面（编译为 templates/ 下的 HTML）
│   ├── layouts/Layout.astro # 全局布局：花瓣、深浅色、head 注入
│   └── components/          # Header / Footer
├── public/                  # 原样复制到 templates/
│   ├── assets/css|js/       # 主题样式与脚本（不经过 Astro 打包）
│   ├── fragments/           # 纯 Thymeleaf 片段（文章列表、好物网格）
│   └── gateway_fragments/   # 认证页布局与注册表单片段
├── templates/               # Astro 构建产物（Halo 实际读取的模板目录，已 gitignore）
├── docs/
│   ├── design/              # 设计阶段的原型稿，仅作参考
│   └── *.md                 # 本站点的公示文档（不随主题发布）
├── scripts/                 # 一次性运维脚本
├── theme.yaml               # 主题元数据（必填）
├── settings.yaml            # 主题设置表单
└── watch-sync.mjs           # 本地联调：把 templates/ 同步到远程 Halo
```

> `templates/` 是构建产物，不要直接手改；请改 `src/` 后重新构建。

## 开发

```bash
pnpm install
pnpm dev      # nodemon 监听 src/ 与 public/，任一改动即重新构建到 templates/
pnpm build    # 一次性构建
pnpm format   # Prettier 格式化
```

本地预览最省事的方式是把主题目录放进 Halo 的 `themes/` 下并启用，建议同时关掉 Thymeleaf 缓存：

```yaml
# application.yaml
spring:
  thymeleaf:
    cache: false
```

或直接用环境变量：`SPRING_THYMELEAF_CACHE=false`。

### 联调同步到远程 Halo（可选）

如果博客部署在服务器、主题在本地开发，可以让 `watch-sync.mjs` 监听 `templates/` 并自动 `scp` 到远程主题目录：

```bash
node watch-sync.mjs
```

同步目标按优先级读取环境变量 `SYNC_USER` / `SYNC_HOST` / `SYNC_DIR`，或同目录下被 gitignore 的 `watch-sync.local.json`（示例见 `watch-sync.local.example.json`）：

```json
{
  "user": "ubuntu",
  "host": "203.0.113.10",
  "dir": "/home/ubuntu/halo2/themes/yudi-cherryblossom/templates"
}
```

注意它**只同步 `templates/`**：Halo 渲染时直接读磁盘上的模板文件，所以模板改动上传后刷新即可生效；而 `theme.yaml`、`settings.yaml` 属于元数据，改动后需要手动上传，并在 Console → 主题 点一次**「重载主题配置」**才会重新注册。

## 构建与打包发布

```powershell
pnpm build
Remove-Item -Recurse -Force templates\.prerender -ErrorAction SilentlyContinue
Compress-Archive -Path theme.yaml,settings.yaml,templates -DestinationPath yudi-cherryblossom-1.0.7.zip
```

也可以使用官方的 [`@halo-dev/theme-package-cli`](https://github.com/halo-dev/theme-package-cli) 打包。

主题包的结构：**压缩后第一层必须是 `theme.yaml`、`settings.yaml`、`templates/`**，不要再套一层目录。

## 技术说明：Astro 编译期 vs Thymeleaf 运行期

理解这两个阶段的边界是修改本主题的关键：

```
开发时                           构建后                    Halo 运行时
─────────────────────────────    ──────────────────────    ──────────────────────────
src/pages/index.astro        →   templates/index.html  →   Thymeleaf 注入数据渲染
  Astro 组件 / slot / props         干净的 HTML +              th:text / th:if 生效
  Vue Island 组件                   Thymeleaf 属性原样          客户端 JS 激活 Island
```

- `slot`、`props` 是 Astro **编译期**概念，Thymeleaf 运行时感知不到，也无法向 Astro 组件传递动态数据；
- 在 Astro 组件里可以直接写 `th:text`、`th:if`、`th:replace`，Astro 会把它们当作普通 HTML 属性原样输出；
- 需要 Halo 运行时数据又不想写 Thymeleaf 的场景（如无限滚动追加），放到 `public/fragments/` 或 `public/assets/js/` 里，绕过 Astro 编译；
- Astro 配置里的 `base` 决定了静态资源引用路径，改了主题名要同步改（当前为 `/themes/yudi-cherryblossom`）。

## 致谢与许可

- 脚手架：[halo-sigs/theme-astro-starter](https://github.com/halo-sigs/theme-astro-starter)
- 许可：[GPL-3.0](./LICENSE) © 2026 yangjitian
