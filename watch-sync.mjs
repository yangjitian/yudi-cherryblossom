/**
 * 本地联调：把 Astro 构建产物 templates/ 同步到远程 Halo 的主题目录，
 * 让服务器上的站点直接用上本地最新模板（Halo 渲染时读的就是这些文件）。
 *
 * 同步目标按优先级读取：
 *   1. 环境变量 SYNC_USER / SYNC_HOST / SYNC_DIR
 *   2. 同目录下的 watch-sync.local.json（已 gitignore，示例见 watch-sync.local.example.json）
 *
 * 用法：node watch-sync.mjs
 *
 * 注意：只同步 templates/。theme.yaml、settings.yaml 的改动需手动上传，
 * 并在 Console → 主题 点一次「重载主题配置」才会生效。
 */
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import chokidar from "chokidar";

const LOCAL_DIR = path.resolve("templates");
const LOCAL_CONFIG = path.resolve("watch-sync.local.json");
const ENV_KEYS = { user: "SYNC_USER", host: "SYNC_HOST", dir: "SYNC_DIR" };

function loadConfig() {
  let fileConfig = {};
  if (fs.existsSync(LOCAL_CONFIG)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(LOCAL_CONFIG, "utf8"));
    } catch (error) {
      console.error(`${path.basename(LOCAL_CONFIG)} 不是合法 JSON：${error.message}`);
      process.exit(1);
    }
  }

  const config = Object.fromEntries(
    Object.keys(ENV_KEYS).map((key) => [key, process.env[ENV_KEYS[key]] || fileConfig[key]]),
  );

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => ENV_KEYS[key]);

  if (missing.length) {
    console.error(
      `缺少同步目标配置：${missing.join("、")}\n` +
        "请设置对应环境变量，或复制 watch-sync.local.example.json 为 watch-sync.local.json 后填写。",
    );
    process.exit(1);
  }

  return config;
}

const { user, host, dir } = loadConfig();

let timer = null;
function sync() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log("同步中...");
    execFile("scp", ["-r", `${LOCAL_DIR}\\.`, `${user}@${host}:${dir}`], (err, stdout, stderr) => {
      if (err) console.error("同步失败：", stderr || err.message);
      else console.log("同步完成 " + new Date().toLocaleTimeString());
    });
  }, 500);
}

chokidar.watch(LOCAL_DIR, { ignoreInitial: true }).on("all", sync);

console.log(`正在监听 ${LOCAL_DIR}，变化后自动同步到 ${user}@${host}:${dir}`);
