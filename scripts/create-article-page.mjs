/**
 * 一次性脚本：自动创建并发布 slug 为 article 的单页（文章列表页），
 * 最后重载主题，让 theme.yaml 的版本号与自定义模板注册生效。
 *
 * 用法：
 *   $env:HALO_SITE="https://itsyudi.site"; $env:HALO_PAT="<令牌>"; node scripts/create-article-page.mjs
 * 不在环境变量里放令牌时，脚本会在运行时提示输入。
 *
 * 幂等：已存在 slug=article 的单页时跳过创建，仅补发布 / 重载主题。
 */
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";

const SITE = (process.env.HALO_SITE || "http://localhost:8090").replace(/\/$/, "");
const THEME_NAME = "yudi-cherryblossom";
const SLUG = "article";
const TEMPLATE = "page_article-list.html";
const TITLE = "文章列表";

async function readToken() {
  if (process.env.HALO_PAT) return process.env.HALO_PAT;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const token = await rl.question("请输入 Halo 个人访问令牌（PAT）：");
  rl.close();
  return token.trim();
}

/** 返回 { status, body }；body 为解析后的 JSON，解析失败时为原始文本片段 */
async function request(url, token, options = {}) {
  let response;
  try {
    // redirect: "manual" —— 未通过鉴权时 Halo 会 302 到 /login，
    // 跟随重定向只会拿到登录页 HTML，把真正的 401/403 吞掉
    response = await fetch(url, {
      ...options,
      redirect: "manual",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error(`网络请求失败（${url}）：${error.cause?.message || error.message}`);
  }

  const text = await response.text();
  if (response.status >= 300) {
    const hint =
      response.status === 401
        ? "令牌无效或已过期"
        : response.status === 403
          ? "令牌权限不足（个人令牌需要内容管理 / 主题管理权限）"
          : "";
    throw new Error(
      `HTTP ${response.status} ${options.method || "GET"} ${url}\n` +
        (hint ? `原因：${hint}\n` : "") +
        `响应：${text.slice(0, 300)}`,
    );
  }
  try {
    return { status: response.status, body: text ? JSON.parse(text) : null };
  } catch {
    throw new Error(`响应不是 JSON（${url}）：${text.slice(0, 200)}`);
  }
}

const token = await readToken();
if (!token) {
  console.error("缺少个人访问令牌，已取消。");
  process.exit(1);
}

// 列表接口返回 ListedSinglePage，单页本体在 page 字段里
const listed = await request(`${SITE}/apis/api.console.halo.run/v1alpha1/singlepages?page=1&size=100`, token);
const found = (listed.body.items || []).find(
  (item) => item.page?.spec?.slug === SLUG || item.spec?.slug === SLUG,
);

if (found) {
  const page = found.page || found;
  console.log(`slug=${SLUG} 的单页已存在（${page.metadata.name}），跳过创建。`);
  if (page.spec?.template && page.spec.template !== TEMPLATE) {
    console.warn(`提示：该页当前模板为 ${page.spec.template}，与 ${TEMPLATE} 不一致，未自动修改。`);
  }
  if (page.spec?.publish !== true) {
    await request(`${SITE}/apis/api.console.halo.run/v1alpha1/singlepages/${page.metadata.name}/publish`, token, {
      method: "PUT",
    });
    console.log("该页此前未发布，已补发布。");
  }
} else {
  const created = await request(`${SITE}/apis/api.console.halo.run/v1alpha1/singlepages`, token, {
    method: "POST",
    body: JSON.stringify({
      page: {
        apiVersion: "content.halo.run/v1alpha1",
        kind: "SinglePage",
        metadata: { name: randomUUID() },
        spec: {
          title: TITLE,
          slug: SLUG,
          template: TEMPLATE,
          allowComment: false,
          pinned: false,
          priority: 0,
          visible: "PUBLIC",
          // Halo 2.26 的 SinglePageSpec 校验要求这两个字段必填
          deleted: false,
          publish: false,
          excerpt: { autoGenerate: true, raw: "" },
          htmlMetas: [],
        },
      },
      content: { raw: "", content: "", rawType: "HTML" },
    }),
  });

  const name = created.body.metadata.name;
  console.log(`已创建单页：${TITLE}（${name}）`);

  await request(`${SITE}/apis/api.console.halo.run/v1alpha1/singlepages/${name}/publish`, token, {
    method: "PUT",
  });
  console.log(`已发布：${SITE}/${SLUG}`);
}

// 重载主题：让 theme.yaml 的 version（资源缓存戳）与 customTemplates 注册生效
try {
  await request(`${SITE}/apis/api.console.halo.run/v1alpha1/themes/${THEME_NAME}/reload`, token, {
    method: "PUT",
  });
  console.log("主题已重载，资源版本号与自定义模板注册已生效。");
} catch (error) {
  console.warn(`主题重载失败（可在 Console → 主题 → 重载 手动执行）：${error.message}`);
}
