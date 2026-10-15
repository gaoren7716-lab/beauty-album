/* ============================================================
 * tools/build_gallery.js —— 生成 GALLERY.md（GitHub 上的画廊页）
 * ============================================================
 * 为什么由工具生成而不是手写：
 *   80 个条目、分组、状态标记全部来自数据，手写必然漂。
 *   数据改了重跑一遍即可，GALLERY.md 永远和库一致。
 *
 * 有实拍配图（examples/<编号>.png）的条目直接放图；
 * 没图的放 SVG 色卡 —— 色卡颜色由 index.html 同一条推断链
 * （光影 → 肤质 → 气质 → 文化圈 → 条目微差）现推，
 * 所以 80 张各不相同，且卡片颜色就是这条配方的摘要。
 * 推断链改了（两边都要改！），重跑本工具即可。
 * ============================================================ */
var fs = require("fs");
var path = require("path");
var load = require("./_load.js");

var ROOT = path.join(__dirname, "..");
var SWDIR = path.join(ROOT, "dist", "swatches");
var db = load();
var TAXO = db._core.ALBUM_TAXO;

/* ---------- 色卡推断链（与 index.html 保持一致） ---------- */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

var CAT_TONE = {
  "冷调锐利": { h: 206, s: 30, l: 44 },
  "暖调柔和": { h: 30,  s: 44, l: 55 },
  "中性硬朗": { h: 218, s: 13, l: 41 },
  "明艳":     { h: 344, s: 58, l: 53 },
  "少年感":   { h: 166, s: 27, l: 60 },
  "古典":     { h: 38,  s: 36, l: 39 }
};
var CIRCLE_H = {
  "东亚 · 汉文化圈": 4, "东南亚": 7, "南亚": 11, "西亚与北非": 14,
  "非洲": -9, "欧洲": -5, "美洲": -12, "大洋洲": -3
};

function lightParse(p) {
  var s = (p.light || "") + " " + (((p.faces || {}).skin || {}).c || "");
  var r = { angle: 180, radial: false, contrast: 1, h: 0, l: 0 };
  if (/逆光|背后|背光|轮廓光/.test(s))      r.radial = true;
  else if (/侧上方|斜上方|顶光|上方|偏上|上打来|自上|顶部|顶侧/.test(s)) r.angle = 148;
  else if (/侧光|侧照|侧向|从侧|掠过|侧位|侧面/.test(s)) r.angle = 100;
  else if (/底部|下方|低角度|仰射/.test(s))       r.angle = 20;
  if (/硬光|硬侧光|明暗交界线|锐利高光|明暗两半|极清晰/.test(s)) r.contrast *= 1.5;
  if (/柔光|极柔|过渡极缓|过渡柔和|无硬阴影|边缘柔和/.test(s))   r.contrast *= 0.68;
  if (/散射|阴天|无明确方向|无明显方向|方向感极弱|均匀|平光/.test(s)) r.contrast *= 0.5;
  if (/暖|黄|琥珀|红棕|烛光|黄金|橘|蜜/.test(s)) r.h += 17;
  if (/冷|青|蓝/.test(s))                        r.h -= 15;
  if (/极暗|沉在暗部|暗部压到|低照度|大半轮廓沉/.test(s)) r.l -= 15;
  if (/高调|明亮|过曝|整体明亮/.test(s))                  r.l += 9;
  return r;
}
function jitterOf(p) {
  var f = p.faces || {};
  var s = ((f.bone || {}).c || "") + "|" + ((f.eye || {}).c || "") + "|" + (p.zh || "");
  var hv = 0;
  for (var i = 0; i < s.length; i++) hv = (hv * 31 + s.charCodeAt(i)) | 0;
  hv = hv < 0 ? -hv : hv;
  return { h: (hv % 11) - 5, l: ((hv >> 4) % 9) - 4 };
}
function toneOf(p) {
  var b = CAT_TONE[p.cat] || { h: 210, s: 22, l: 46 };
  var h = b.h, s = b.s, l = b.l;
  var d = ((p.faces || {}).skin || {}).c || "";
  if (/冷|青/.test(d))          { h = 206; s += 4; }
  if (/暖|蜜|象牙/.test(d))     { h = 28;  s += 7; }
  if (/深|暗/.test(d))          { l -= 13; }
  if (/白皙|浅|苍白|清透/.test(d)) { l += 11; }
  if (/油光|反光|带光/.test(d))  { s += 9; }
  if (/哑光|均匀|无油光/.test(d)) { s -= 8; }
  var a = ((p.faces || {}).aura || {}).c || "";
  if (/张扬|浓|强烈|不容忽视|外放|明艳/.test(a))  s += 9;
  if (/克制|内敛|含蓄|疏离|清冷|沉稳|不动如山/.test(a)) s -= 8;
  var L = lightParse(p);
  h += L.h; l += L.l;
  if (p.region) h += (CIRCLE_H[p.region] || 0);
  var j = jitterOf(p);
  h += j.h; l += j.l;
  h = ((h % 360) + 360) % 360;
  return { h: h, s: clamp(s, 4, 80), l: clamp(l, 20, 76), contrast: L.contrast,
           angle: L.angle, radial: L.radial };
}
function hsl(t, dl, ds) {
  return "hsl(" + Math.round(t.h) + "," + Math.round(clamp(t.s + (ds || 0), 3, 90)) + "%,"
       + Math.round(clamp(t.l + (dl || 0), 10, 92)) + "%)";
}

/* ---------- SVG 色卡 ---------- */
/* CSS 渐变角 → SVG 线性渐变端点。
   CSS 0deg 朝上、90deg 朝右；SVG 坐标 y 向下，
   方向向量 = (sin θ, -cos θ)，从起点推向终点。 */
function lineEnds(angle) {
  var rad = angle * Math.PI / 180;
  var dx = Math.sin(rad), dy = -Math.cos(rad);
  return { x1: (0.5 - dx * 0.5).toFixed(3), y1: (0.5 - dy * 0.5).toFixed(3),
           x2: (0.5 + dx * 0.5).toFixed(3), y2: (0.5 + dy * 0.5).toFixed(3) };
}
function swatchSvg(p) {
  var t = toneOf(p);
  var d = 17 * (t.contrast || 1);
  var W = 300, H = 400;
  var gid = "g" + p.num.replace("-", "");
  var grad;
  if (t.radial) {
    /* 逆光：中心暗、边缘亮 —— 与 index.html 的 swatchOf 同参数 */
    grad = '<radialGradient id="' + gid + '" cx="0.5" cy="0.42" r="0.75">'
         + '<stop offset="0" stop-color="' + hsl(t, -d, 4) + '"/>'
         + '<stop offset="0.56" stop-color="' + hsl(t, 0, 0) + '"/>'
         + '<stop offset="1" stop-color="' + hsl(t, d * 0.9, -2) + '"/>'
         + '</radialGradient>';
  } else {
    var e = lineEnds(t.angle || 180);
    grad = '<linearGradient id="' + gid + '" x1="' + e.x1 + '" y1="' + e.y1
         + '" x2="' + e.x2 + '" y2="' + e.y2 + '">'
         + '<stop offset="0" stop-color="' + hsl(t, d, -3) + '"/>'
         + '<stop offset="0.5" stop-color="' + hsl(t, 0, 0) + '"/>'
         + '<stop offset="1" stop-color="' + hsl(t, -d, 5) + '"/>'
         + '</linearGradient>';
  }
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" '
       + 'viewBox="0 0 ' + W + ' ' + H + '">'
       + '<defs>' + grad + '</defs>'
       + '<rect width="' + W + '" height="' + H + '" fill="url(#' + gid + ')"/>'
       + '<rect y="' + (H - 64) + '" width="' + W + '" height="64" fill="rgba(0,0,0,0.45)"/>'
       + '<text x="16" y="' + (H - 36) + '" font-family="sans-serif" font-size="22" '
       + 'font-weight="bold" fill="#fff">' + esc(p.num) + '</text>'
       + '<text x="16" y="' + (H - 12) + '" font-family="sans-serif" font-size="18" '
       + 'fill="rgba(255,255,255,0.85)">' + esc(p.zh) + ' · ' + esc(p.cat || p.region || "") + '</text>'
       + '</svg>';
}

/* ---------- 汇总 GALLERY.md ---------- */
function badge(p) {
  if (p.status === "tested") return " ✅";
  if (p.test && p.test.model === "待核实") return " ⏳";
  return "";
}
function cell(p) {
  var hasPhoto = fs.existsSync(path.join(ROOT, "examples", p.num + ".png"));
  var src = hasPhoto ? "examples/" + p.num + ".png" : "dist/swatches/" + p.num + ".svg";
  return '<img src="' + src + '" width="150"><br>**' + p.num + '** ' + p.zh + badge(p);
}
function shortRange(a, b) {
  return a.slice(3) + "–" + b.slice(3);
}

var out = [];
/* 先数一遍配图情况再写引言 —— 补满之后「色卡 80 张各不相同」就是假话，
   而假话正是这个库最不能容忍的东西（数量一律现算，不写死）。 */
var nPhoto0 = 0, nSwatch0 = 0;
db.ALBUM.forEach(function (p) {
  if (fs.existsSync(path.join(ROOT, "examples", p.num + ".png"))) nPhoto0++;
  else nSwatch0++;
});
out.push("# 画廊 · " + db.ALBUM.length + " 个编号一览\n");
out.push("每个编号是一套完整、可复现的人物配方。"
  + (nSwatch0 > 0
     ? "有实拍配图的直接放图，没配图的放**色卡** —— 颜色由这条配方自己的光影（方向/软硬/冷暖/明暗）、"
       + "肤质冷暖、气质浓度与文化圈现推而来，与在线画廊同一条推断链，" + nSwatch0 + " 张各不相同。"
     : "全部编号均有实拍配图，直接放图。") + "\n");
out.push("想**筛选、看八面细节、一键复制提示词** → [在线画廊](https://gaoren7716-lab.github.io/beauty-album/)"
  + "（也可以下载仓库后双击 `index.html`，单文件离线可用）\n");
out.push("状态标记：✅ 已实测（图与实测记录都在案）· ⏳ 出图模型待核实（图在，出处未留档，不计入已实测）\n");

/* 分组跟随数据的块状编排：001–048 按气质类，049–080 按文化圈 */
out.push("## 原型段 001–048 · 六气质类\n");
var cur = null, buf = [], seg = null;
function flushGroup() {
  if (!cur) return;
  var head;
  if (seg === "kind") {
    head = "### " + cur + " —— " + (TAXO.kindInfo[cur] || {}).def
         + "（" + shortRange(buf[0].num, buf[buf.length - 1].num) + "）";
  } else {
    head = "### " + cur + " —— " + (TAXO.circleInfo[cur] || "")
         + "（" + shortRange(buf[0].num, buf[buf.length - 1].num) + "）";
  }
  out.push(head + "\n");
  for (var i = 0; i < buf.length; i += 4) {
    var row = buf.slice(i, i + 4);
    out.push("| " + row.map(function () { return " "; }).join(" | ") + " |");
    out.push("|" + row.map(function () { return "---"; }).join("|") + "|");
    out.push("| " + row.map(cell).join(" | ") + " |\n");
  }
  cur = null; buf = [];
}
db.ALBUM.forEach(function (p) {
  var n = parseInt(p.num.slice(3), 10);
  var isGlobal = n > TAXO.block * 6; /* 48 = 6 类 × 8 条 */
  var key = isGlobal ? (p.region || "（未标文化圈）") : p.cat;
  var s = isGlobal ? "circle" : "kind";
  if (seg !== s) { flushGroup(); seg = s; if (s === "circle") out.push("## 全球段 049–080 · 八文化圈\n"); }
  if (cur !== key) { flushGroup(); cur = key; }
  buf.push(p);
});
flushGroup();

out.push("---\n");
out.push("*本页由 `tools/build_gallery.js` 从数据现算生成 —— 条目、分组、状态、色卡颜色都不是手写的。"
  + "数据改动后重跑该工具即可。色卡推断链与 `index.html` 保持同源，两边必须一起改。*\n");

/* 写文件：色卡 + 汇总页；已有实拍图的条目不再留旧色卡 */
fs.mkdirSync(SWDIR, { recursive: true });
var made = 0, photos = 0;
db.ALBUM.forEach(function (p) {
  var hasPhoto = fs.existsSync(path.join(ROOT, "examples", p.num + ".png"));
  var svgPath = path.join(SWDIR, p.num + ".svg");
  if (hasPhoto) {
    if (fs.existsSync(svgPath)) fs.unlinkSync(svgPath); /* 升级成实拍图后清掉旧色卡 */
    photos++;
    return;
  }
  fs.writeFileSync(svgPath, swatchSvg(p));
  made++;
});
fs.writeFileSync(path.join(ROOT, "GALLERY.md"), out.join("\n"));
console.log("GALLERY.md ✓  条目 " + db.ALBUM.length
  + " · 实拍图 " + photos + " · 色卡 " + made);
