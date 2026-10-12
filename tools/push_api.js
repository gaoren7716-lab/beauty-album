/* GitHub Git Data API 推送：把本地 HEAD 相对 origin/master 的全部改动推上去。
 * 用法：GH_TOKEN=xxx node push_api.js "<commit message>" "M:path" "D:path" ...
 * 清单由调用方（bash）从 git diff --name-status 生成 —— 脚本自己不 spawn git
 * （本机 node spawnSync 会 EBUSY）。图片 base64，其余 utf-8；D = 树条目置 null 删除。
 * token 只从环境变量读，仓库里不留任何密钥。 */
var https = require("https");
var fs = require("fs");
var path = require("path");

var REPO = "gaoren7716-lab/beauty-album";
var BRANCH = "master";
var ROOT = "C:/WorkBuddy AI库/beauty-album";
var MSG = process.argv[2] || "update";
var ARGS = process.argv.slice(3);
var TOK = process.env.GH_TOKEN;

function api(method, p, data) {
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
        if (r.statusCode >= 300) return rej(new Error(r.statusCode + " " + buf.slice(0, 300)));
        res(buf ? JSON.parse(buf) : {});
      });
    });
    req.on("error", rej);
    if (body) req.write(body);
    req.end();
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

  var tree = [];
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
  }
  var t = await api("POST", "/git/trees", { base_tree: baseTree, tree: tree });
  var nc = await api("POST", "/git/commits", { message: MSG, tree: t.sha, parents: [sha] });
  await api("PATCH", "/git/refs/heads/" + BRANCH, { sha: nc.sha });
  console.log("OK pushed", nc.sha, "(" + entries.length + " files)");
})().catch(function (e) { console.error("FAIL:", e.message); process.exit(1); });
