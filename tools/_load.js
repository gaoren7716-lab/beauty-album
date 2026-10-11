/* ============================================================
 * tools/_load.js —— 按固定顺序加载全部数据文件
 * ============================================================
 * 浏览器 <script> 顺序与本数组必须一致。
 * 新增文件**必须登记进 ORDER**，否则会被排到最后，
 * 而它若依赖别人挂载的结果就拿到未加工的数据。
 * ============================================================ */
var fs = require("fs");
var path = require("path");

var ASSETS = path.join(__dirname, "..", "assets");

var ORDER = [
  "data-core.js",
  "rights.js",
  "album-kit.js",
  "plates-a.js", "plates-b.js", "plates-c.js", "plates-d.js",
  "themes.js", "modes.js", "mediums.js",
  "gacha.js", "rights.js",
  "provenance.js", "models.js"
];

function files() {
  var list = ORDER.filter(function (f) { return fs.existsSync(path.join(ASSETS, f)); });
  fs.readdirSync(ASSETS).filter(function (f) {
    return f.endsWith(".js") && ORDER.indexOf(f) < 0;
  }).forEach(function (f) { list.push(f); });
  return list;
}

function load() {
  var core = require(path.join(ASSETS, "data-core.js"));
  files().forEach(function (f) {
    if (f === "data-core.js") return;
    try {
      require(path.join(ASSETS, f));
    } catch (e) {
      console.log("LOAD FAIL " + f + " :: " + e.message);
      throw e;
    }
  });
  var kit = require(path.join(ASSETS, "album-kit.js"));
  var db = {
    ALBUM: core.ALBUM, THEMES: core.THEMES, MODES: core.MODES,
    MEDIUMS: core.MEDIUMS,
    RIGHTS: core.RIGHTS, PROVENANCE: core.PROVENANCE, TESTS: core.TESTS,
    RECIPES: core.RECIPES,
    ALBUM_FACES: core.ALBUM_FACES, IDENTITY_FACES: core.IDENTITY_FACES,
    RENDER_MODES: core.RENDER_MODES, RIGHT_TIERS: core.RIGHT_TIERS,
    RISK_KINDS: core.RISK_KINDS, _core: core
  };
  /* 全局负面词：与全库内容无关的通用底线，放数据里会让人以为可以随便改 */
  db.DEFAULT_NEG = [
    "低分辨率", "解剖错误", "多手指", "多余肢体", "面部畸变",
    "不对称眼睛", "文字", "水印", "签名", "logo", "边框"
  ];
  db.KIT = kit.ALBUMKIT;
  db.GACHA = require(path.join(ASSETS, "gacha.js")).GACHA;
  db._kit = kit;
  db.files = files();
  kit.ALBUMKIT.reindex(db);
  return db;
}

function stats(db) {
  return {
    ALBUM: db.ALBUM.length, THEMES: db.THEMES.length, MODES: db.MODES.length,
    RIGHTS: db.RIGHTS.length, PROVENANCE: db.PROVENANCE.length, TESTS: db.TESTS.length
  };
}

module.exports = load;
module.exports.load = load;
module.exports.stats = stats;
module.exports.ORDER = ORDER;
module.exports.ASSETS = ASSETS;