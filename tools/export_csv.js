/* ============================================================
 * tools/export_csv.js —— 数据表导出
 *
 * 《全球美人视觉图鉴》方案第九节建议：第一阶段用 Markdown 管说明、
 * CSV 管可批量筛选的元数据，规模稳定后再迁数据库。
 * 本脚本就是那一步的落地 —— 把库内数据摊平成三张表，
 * 让 Excel / Numbers / 任何表格软件都能直接筛选。
 *
 * 为什么是导出而不是让库直接以 CSV 为真源：
 *   CSV 是平的，库是立体的 —— 一条编号带八面 + 门类改写 +
 *   test 记录，摊平必然丢关联。库保持真源，CSV 是投影。
 *   修改请改 assets/*.js，改 CSV 的改动会在下次导出时被覆盖。
 *
 * 用法：node tools/export_csv.js  →  生成 dist/*.csv
 * ============================================================ */
var fs = require("fs");
var path = require("path");
var db = require("./_load.js")();
var KIT = db.KIT;
KIT.reindex(db);

var OUT = path.join(__dirname, "..", "dist");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

/* CSV 单元格转义：含逗号/引号/换行的值包引号，内部引号翻倍。
   不做这一步，Excel 读出来的列会错位 —— 而错位是静默的，
   使用者只会以为某条数据「少了」。 */
function csv(v) {
  var s = (v == null ? "" : String(v));
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCSV(head, rows) {
  return [head.join(",").concat("\r\n")]
    .concat(rows.map(function (r) { return r.map(csv).join(",") + "\r\n"; }))
    .join("");
}

/* ---------- 表一：编号档案（80 条） ----------
   每行一条编号，八面摊成列 + 门类/主题组合的词面统计。
   region/culture 是全球段的身份字段；原型段留空。 */
var themes = db.THEMES || [];
var platesRows = (db.ALBUM || []).map(function (p) {
  var F = p.faces || {};
  function c(k) { var v = F[k]; return v ? (v.c || v) : ""; }
  var gptLen = 0, negN = 0;
  var r = KIT.compose(db, p.num,
    { themeId: (themes[0] || {}).num, mode: "plain", medium: "photo" });
  if (r && r.ok) {
    gptLen = ((r.tags || {}).gpt || []).join("，").length;
    negN = (r.neg || []).length;
  }
  return [
    p.num, p.zh, p.en || "", p.cat, p.region || "", p.culture || "",
    p.status || "written", p.rights || "", p.risk || "",
    c("bone"), c("skin"), c("eye"), c("form"), c("aura"), c("hair"), c("dress"),
    p.light || "", p.camera || "",
    gptLen, negN,
    p.test ? (p.test.pic || "") : "", p.test ? (p.test.model || "") : ""
  ];
});
fs.writeFileSync(path.join(OUT, "plates.csv"), toCSV(
  ["编号", "中文名", "英文名", "类目", "文化圈", "文化", "状态", "授权", "风险",
   "骨相", "肤质", "眼目", "形体", "气质", "发型", "妆造",
   "光影", "镜头", "GPT词面字数", "负面词数", "配图", "实测模型"],
  platesRows), "utf8");

/* ---------- 表二：主题档案（40 条） ---------- */
var themeRows = (db.THEMES || []).map(function (t) {
  var F = t.faces || {};
  return [t.num, t.zh, t.en || "", t.cat, t.text || "",
    F.dress || "", F.scene || "", F.hair || ""];
});
fs.writeFileSync(path.join(OUT, "themes.csv"), toCSV(
  ["编号", "中文名", "英文名", "类目", "原文", "妆造覆盖", "场景覆盖", "发型覆盖"],
  themeRows), "utf8");

/* ---------- 表三：门类档案（8 条） ---------- */
var medRows = (db.MEDIUMS || []).map(function (m) {
  return [m.k, m.zh, m.cat || "", m.desc || "", m.en || "",
    (m.neg || []).join("；"), m.caution || "", m.isDefault ? "是" : ""];
});
fs.writeFileSync(path.join(OUT, "mediums.csv"), toCSV(
  ["key", "中文名", "大类", "说明", "媒介词(en)", "负面词", "限制(caution)", "默认"],
  medRows), "utf8");

/* ---------- 对拍：导出的行数必须等于库内条数 ----------
   导出器最容易出的静默 bug 是 filter 把某几条悄悄滤掉，
   表看起来正常、行数少了 —— 下面对拍，少一条就报错退出。 */
var expect = [
  ["dist/plates.csv", platesRows.length, (db.ALBUM || []).length],
  ["dist/themes.csv", themeRows.length, (db.THEMES || []).length],
  ["dist/mediums.csv", medRows.length, (db.MEDIUMS || []).length]
];
var bad = 0;
expect.forEach(function (x) {
  if (x[1] !== x[2]) { console.error("✗ " + x[0] + " 行数 " + x[1] + " ≠ 库内 " + x[2]); bad++; }
});
if (bad) process.exit(1);
console.log("导出完成：" + expect.map(function (x) {
  return x[0] + "（" + x[1] + " 行）";
}).join("、"));
