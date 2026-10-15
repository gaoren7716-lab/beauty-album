/* GitHub Git Data API 推送：把本地 HEAD 相对 origin/master 的全部改动推上去。
 * 用法：GH_TOKEN=xxx node push_api.js "<commit message>" "M:path" "D:path" ...
 * 清单由调用方（bash）从 git diff --name-status 生成 —— 脚本自己不 spawn git
 * （本机 node spawnSync 会 EBUSY）。图片 base64，其余 utf-8；D = 树条目置 null 删除。
 * token 只从环境变量读，仓库里不留任何密钥。
 *
 * 2026-10-15 加固：GitHub Git Data API 对「短时间大量 blob 创建」会抛
 * 429 queue.full（二级限流）。这里对每个请求加 retry + 指数退避，
 * 并在 blob 之间留一点间隔，避免burst。ref 只在全部 blob + tree + commit
 * 都成功后才 PATCH，所以中途失败不会留下半截提交（悬空 blob 无所谓）。 */
var https = require("https");
var fs = require("fs");
var path = require("path");

var REPO = "gaoren7716-lab/beauty-album";
var BRANCH = "master";
var ROOT = "C:/WorkBuddy AI库/beauty-album";
var MSG = process.argv[2] || "update";
var ARGS = process.argv.slice(3);
var TOK = process.env.GH_TOKEN;

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function api(method, p, data, tries) {
  tries = tries || 0;
  return new Promise(function (res, rej) {
    var body = data ? JSON.stringify(data) : null;
    var req = https.request({
      hostname: "api.github.com", path: "/repos/" + REPO + p, method: method,
      headers: {
        "Authorization": "Bearer " + TOK,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "Content-Length": body ? Buffer.byteLength(body) : 0,
        "User-Agent": "push-script"
      }
    }, function (r) {
      var buf = "";
      r.on("data", function (c) { buf += c; });
      r.on("end", function () {
        if (r.statusCode >= 300) {
          var err = new Error(r.statusCode + " " + buf.slice(0, 300));
          err.code = r.statusCode;
          err.retryAfter = parseInt(r.headers["retry-after"] || "0", 10) || 0;
          return rej(err);
        }
        res(buf ? JSON.parse(buf) : {});
      });
    });
    req.on("error", rej);
    if (body) req.write(body);
    req.end();
  }).then(undefined, function (e) {
    // 429 / 403(限流) / 5xx：指数退避重试，最多 10 次
    var transient = (e.code === 429) || (e.code === 403) || (e.code >= 500);
    if (transient && tries < 10) {
      var wait = e.retryAfter > 0 ? e.retryAfter * 1000
        : Math.min(30000, 800 * Math.pow(2, tries));
      console.error("  …" + e.code + "，退避 " + (wait / 1000) + "s 后重试 (" + (tries + 1) + "/10)");
      return sleep(wait).then(function () { return api(method, p, data, tries + 1); });
    }
    throw e;
  });
}

(async function () {
  if (!ARGS.length) { console.log("nothing to push"); return; }
  var entries = ARGS.map(function (a) {
    var i = a.indexOf(":");
    return { st: a.slice(0, i), f: a.slice(i + 1).replace(/\\/g, "/") };
  });

  var ref = await api("GET", "/git/refs/heads/" + BRANCH);
  var sha = ref.object.sha;
  var commit = await api("GET", "/git/commits/" + sha);
  var baseTree = commit.tree.sha;
  console.log("base:", sha.slice(0, 8), "· 待推", entries.length, "个文件");

  var tree = [];
  var n = 0, total = entries.length;
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (e.st === "D") {
      tree.push({ path: e.f, mode: "100644", type: "blob", sha: null });
      continue;
    }
    var bin = /\.(png|jpe?g|gif|webp|ico)$/i.test(e.f);
    var content = fs.readFileSync(path.join(ROOT, e.f));
    var b = await api("POST", "/git/blobs", {
      content: bin ? content.toString("base64") : content.toString("utf8"),
      encoding: bin ? "base64" : "utf-8"
    });
    tree.push({ path: e.f, mode: "100644", type: "blob", sha: b.sha });
    n++;
    if (n % 10 === 0 || n === total) console.log("  blob " + n + "/" + total);
    // blob 之间留一点间隔，别把 Git Data 队列打爆
    if (i < entries.length - 1) await sleep(350);
  }
  var t = await api("POST", "/git/trees", { base_tree: baseTree, tree: tree });
  var nc = await api("POST", "/git/commits", { message: MSG, tree: t.sha, parents: [sha] });
  await api("PATCH", "/git/refs/heads/" + BRANCH, { sha: nc.sha });
  console.log("OK pushed " + nc.sha + " (" + entries.length + " files)");
})().catch(function (e) { console.error("FAIL:", e.message); process.exit(1); });
