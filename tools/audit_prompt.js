/* ============================================================
 * tools/audit_prompt.js —— 词面排查（只读，不改数据）
 * 跑法：node tools/audit_prompt.js
 * ============================================================ */
var load = require("./_load.js");
var db = load();
var KIT = db.KIT;

function esc(s) { return String(s); }
var findings = [];

/* ---------- 1. 负面词与正面词自相矛盾 ---------- */
/* 每种 模式×门类 组一遍 AL-001 × TH-001，看负面词里有没有词
   出现在正面词面里（提示词一边要、一边压）。 */
console.log("== 1. 负面词 vs 正面词 冲突 ==");
db.MODES.forEach(function (m) {
  db.MEDIUMS.forEach(function (med) {
    var r = KIT.compose(db, "AL-001", { themeId: "TH-001", mode: m.k, medium: med.k });
    if (!r.ok) return;
    var pos = r.texts.join("，");
    var hits = [];
    r.neg.forEach(function (w) {
      if (w.length >= 2 && pos.indexOf(w) >= 0) hits.push(w);
    });
    if (hits.length) {
      console.log("  [" + m.k + " × " + med.k + "] 正面词含被负面词压掉的词: " + hits.join("、"));
    }
  });
});

/* ---------- 2. 主题原文与主题面语义重复 ---------- */
/* 主题 text 与它自己的 faces 用 4 字滑窗找重叠 ——
   「手里拿着咖啡」(text) 与「手里一杯外带咖啡」(dress) 重叠度不高，
   但场景往往整句重复。 */
console.log("\n== 2. 主题 text 与主题 faces 的 n-gram 重叠（前 10 例）==");
function shingles(s, n) {
  var out = {};
  s = String(s).replace(/[，,。；;、：:（）()]/g, "");
  for (var i = 0; i + n <= s.length; i++) out[s.substr(i, n)] = 1;
  return out;
}
var dupCount = 0;
db.THEMES.forEach(function (t) {
  if (!t.text || !t.faces) return;
  var tt = shingles(t.text, 4);
  Object.keys(t.faces).forEach(function (k) {
    var fv = t.faces[k];
    var fs = shingles((fv && fv.c) || fv || "", 4);
    var overlap = Object.keys(tt).filter(function (x) { return fs[x]; });
    if (overlap.length >= 2) {
      dupCount++;
      if (dupCount <= 10) {
        console.log("  " + t.num + " [" + k + "] 重叠: " + overlap.slice(0, 4).join(" / "));
      }
    }
  });
});
console.log("  共 " + dupCount + " 处主题内重复");

/* ---------- 3. 数据里的半角括号/冒号 —— 会破坏 SD 权重语法 ---------- */
console.log("\n== 3. 半角 ( ) : 在数据正文里（SD/FLUX 权重语法会被它们截断）==");
var bad = 0;
function scan(label, s) {
  var m = String(s).match(/[():]/g);
  if (m) { bad++; if (bad <= 12) console.log("  " + label + ": " + String(s).slice(0, 60)); }
}
db.ALBUM.forEach(function (p) {
  ["light", "camera"].forEach(function (k) { scan(p.num + "." + k, p[k] || ""); });
  Object.keys(p.faces || {}).forEach(function (k) {
    scan(p.num + ".faces." + k, (p.faces[k] || {}).c || "");
  });
});
db.THEMES.forEach(function (t) {
  scan(t.num + ".text", t.text || "");
  Object.keys(t.faces || {}).forEach(function (k) {
    scan(t.num + ".faces." + k, (t.faces[k] || {}).c || "");
  });
});
console.log("  共 " + bad + " 处");

/* ---------- 4. MJ 权重坍缩 ---------- */
console.log("\n== 4. MJ 方言权重坍缩检查 ==");
var r4 = KIT.compose(db, "AL-001", { themeId: "TH-001", mode: "plain", medium: "oil" });
var mjTags = r4.tags.mj;
var weighted = mjTags.filter(function (t) { return /::\d/.test(t); });
console.log("  带 :: 权重的段: " + weighted.length + " / " + mjTags.length);
weighted.slice(0, 6).forEach(function (t) {
  console.log("    " + t.slice(0, 42) + (t.length > 42 ? "…" : ""));
});

/* ---------- 5. 无主题时的误导警告 ---------- */
console.log("\n== 5. 无主题出词（肖像场景）的警告 ==");
var r5 = KIT.compose(db, "AL-002", { mode: "plain", medium: "photo" });
console.log("  missing: " + r5.missing.map(function (m) { return m.zh; }).join("、"));
console.log("  warns: " + JSON.stringify(r5.warns));

/* ---------- 6. portrait 模式有没有真的去掉场景 ---------- */
console.log("\n== 6. portrait 模式（承诺『只有人，没有场景与道具』）==");
var r6 = KIT.compose(db, "AL-001", { themeId: "TH-001", mode: "portrait", medium: "photo" });
var scene = r6.faces.scene ? r6.faces.scene.c : "(空)";
var dress = r6.faces.dress ? r6.faces.dress.c : "(空)";
console.log("  scene 面: " + scene);
console.log("  dress 面: " + dress);
console.log("  主题文本是否进词面: " + (r6.texts.join("，").indexOf("早高峰") >= 0 ? "是" : "否"));
console.log("  neg: " + r6.neg.join("、"));

/* ---------- 7. 英文 .t 覆盖率（如果要出英文词面，够不够用） ---------- */
console.log("\n== 7. 英文 t 字段覆盖情况 ==");
var total = 0, withT = 0, missList = [];
db.ALBUM.forEach(function (p) {
  Object.keys(p.faces || {}).forEach(function (k) {
    total++;
    if ((p.faces[k] || {}).t) withT++;
    else missList.push(p.num + "." + k);
  });
});
console.log("  编号面: " + withT + " / " + total + " 有英文 t");
if (missList.length) console.log("  缺: " + missList.slice(0, 8).join("、") + (missList.length > 8 ? " …" : ""));
var tt = 0, tT = 0;
db.THEMES.forEach(function (t) {
  tt++;
  if (t.text && /[\u4e00-\u9fff]/.test(t.text) && !t.en) {} /* 主题无 en 字段统计见下 */
  if (t.en) tT++;
});
console.log("  主题: " + tT + " / " + tt + " 有 en");

/* ---------- 8. 词面长度分布（按平台语言估 token） ---------- */
console.log("\n== 8. 词面长度（字符 / 估 token：中文 ≈/1.6，英文 ≈/4）==");
var lens = [];
["AL-001", "AL-015", "AL-041", "AL-060", "AL-077"].forEach(function (n) {
  var r = KIT.compose(db, n, { themeId: "TH-001", mode: "plain", medium: "photo" });
  var zh = r.tags.gpt.join("，");
  var en = r.tags.sd.join(", ");
  lens.push([n, zh.length, Math.round(zh.length / 1.6), en.length, Math.round(en.length / 4)]);
});
lens.forEach(function (x) {
  console.log("  " + x[0] + ": 中文 " + x[1] + " 字符 ≈ " + x[2] + " token | 英文 "
    + x[3] + " 字符 ≈ " + x[4] + " token");
});
