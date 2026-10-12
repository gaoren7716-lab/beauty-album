/* GitHub Git Data API 推送：把本地 HEAD 相对 origin/master 的全部改动推上去。
 * 用法：GH_TOKEN=xxx node push_api.js <file1> <file2> ...
 * 图片按 base64，其余按 utf-8 文本。 */
var https = require("https");
var fs = require("fs");
var path = require("path");

var REPO = "gaoren7716-lab/beauty-album";
var BRANCH = "master";
var ROOT = "C:/WorkBuddy AI库/beauty-album";
var MSG = process.argv[2] || "update";
var FILES = process.argv.slice(3);
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
  var ref = await api("GET", "/git/refs/heads/" + BRANCH);
  var sha = ref.object.sha;
  var commit = await api("GET", "/git/commits/" + sha);
  var baseTree = commit.tree.sha;

  var tree = [];
  for (var i = 0; i < FILES.length; i++) {
    var f = FILES[i];
    var bin = /\.(png|jpe?g|gif|webp|ico)$/i.test(f);
    var content = fs.readFileSync(path.join(ROOT, f));
    var b = await api("POST", "/git/blobs", {
      content: bin ? content.toString("base64") : content.toString("utf8"),
      encoding: bin ? "base64" : "utf-8"
    });
    tree.push({ path: f.replace(/\\/g, "/"), mode: "100644", type: "blob", sha: b.sha });
  }
  var t = await api("POST", "/git/trees", { base_tree: baseTree, tree: tree });
  var nc = await api("POST", "/git/commits", { message: MSG, tree: t.sha, parents: [sha] });
  await api("PATCH", "/git/refs/heads/" + BRANCH, { sha: nc.sha });
  console.log("OK pushed", nc.sha, "(" + FILES.length + " files)");
})().catch(function (e) { console.error("FAIL:", e.message); process.exit(1); });
