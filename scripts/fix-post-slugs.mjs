/**
 * 批量修复文章别名（slug）里会破坏链接的字符。
 *
 * 背景：Halo 用 spec.slug 拼永久链接。如果别名以 `/` 开头（或含空表字符、
 * 连续斜杠），永久链接会变成 /archives//codex-source-code/xxx，编码后是
 * /archives/%2Fcodex-source-code%2Fxxx —— 这两种都会被 Spring Security 的
 * 请求防火墙拒掉（HTTP 400），文章点进去无法访问。改模板救不了，只能改别名。
 *
 * 用法：
 *   $env:HALO_SITE="https://itsyudi.site"; $env:HALO_PAT="<令牌>"; node scripts/fix-post-slugs.mjs              # 只预览，不改
 *   ... node scripts/fix-post-slugs.mjs --apply          # 应用：去掉开头斜杠与空白，保留层级
 *   ... node scripts/fix-post-slugs.mjs --apply --flat   # 应用：并把层级压成单段（/ 换成 -）
 *
 * 令牌在 Console → 个人中心 → 个人令牌 创建，需要「内容管理」权限。
 * 改完会逐篇访问一次新链接并打印 HTTP 状态，方便确认是否真的可用了。
 */
import { createInterface } from "node:readline/promises";

const APPLY = process.argv.includes("--apply");
const FLAT = process.argv.includes("--flat");
const SITE = (process.env.HALO_SITE || "http://localhost:8090").replace(/\/$/, "");
const API = `${SITE}/apis/api.console.halo.run/v1alpha1`;

function normalize(slug) {
  let next = String(slug).trim().replace(/\s+/g, "-");
  next = next.replace(/^\/+/, "").replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  if (FLAT) next = next.replace(/\//g, "-");
  return next;
}

async function readToken() {
  if (process.env.HALO_PAT) return process.env.HALO_PAT;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const token = await rl.question("请输入 Halo 个人访问令牌（PAT）：");
  rl.close();
  return token.trim();
}

async function request(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    redirect: "manual",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await response.text();
  if (response.status >= 300) {
    const hint =
      response.status === 401
        ? "令牌无效或已过期"
        : response.status === 403
          ? "令牌权限不足（需要内容管理权限）"
          : "";
    throw new Error(
      `HTTP ${response.status} ${options.method || "GET"} ${url}\n` +
        (hint ? `原因：${hint}\n` : "") +
        `响应：${text.slice(0, 300)}`,
    );
  }
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

const token = await readToken();
if (!token) {
  console.error("缺少个人访问令牌，已取消。");
  process.exit(1);
}

console.log(`站点：${SITE}　　模式：${APPLY ? (FLAT ? "应用（压成单段）" : "应用（保留层级）") : "仅预览"}\n`);

const listed = await request(`${API}/posts?page=1&size=200`, token);
const items = listed.body.items || [];
const broken = items
  .map((item) => ({ item, post: item.post || item }))
  .filter(({ post }) => {
    const slug = post.spec?.slug || "";
    return slug && slug !== normalize(slug);
  });

if (!broken.length) {
  console.log(`检查了 ${items.length} 篇，没有需要修复的别名。`);
  process.exit(0);
}

console.log(`发现 ${broken.length} 篇别名有问题：\n`);
for (const { post } of broken) {
  console.log(`  ${JSON.stringify(post.spec.slug)}`);
  console.log(`    → 改为  ${JSON.stringify(normalize(post.spec.slug))}`);
}

if (!APPLY) {
  console.log("\n以上为预览。确认无误后加 --apply 执行（若层级形式仍 404，改用 --apply --flat）。");
  process.exit(0);
}

console.log("\n开始修改……");
for (const { item, post } of broken) {
  const name = post.metadata.name;
  const before = post.spec.slug;
  const after = normalize(before);

  const detail = (await request(`${API}/posts/${name}`, token)).body;
  const target = detail.post || post;
  const content = detail.content || {};
  target.spec.slug = after;

  await request(`${API}/posts/${name}`, token, {
    method: "PUT",
    body: JSON.stringify({
      post: target,
      content: {
        raw: content.raw ?? "",
        content: content.content ?? "",
        rawType: content.rawType ?? "HTML",
      },
    }),
  });

  try {
    await request(`${API}/posts/${name}/publish`, token, { method: "PUT" });
  } catch (error) {
    console.warn(`  ${before}：更新成功，但自动发布失败，请在 Console 里手动点一次更新。${error.message.split("\n")[0]}`);
  }

  const latest = (await request(`${API}/posts?page=1&size=200`, token)).body.items.find(
    (x) => (x.post || x).metadata.name === name,
  );
  const permalink = (latest?.post || latest)?.status?.permalink || "";
  let status = "-";
  try {
    status = String((await fetch(`${SITE}${permalink}`, { redirect: "manual" })).status);
  } catch {
    status = "请求失败";
  }
  console.log(`  ${before}\n    → ${after}\n    → ${permalink}　HTTP ${status}`);
}

console.log("\n完成。若某些链接仍不是 200，把上面的输出发我。");
