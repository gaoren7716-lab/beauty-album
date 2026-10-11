/* ============================================================
 * show_plate.js —— 命令行查「这个编号能出几段词」
 * ============================================================
 * 用法：
 *   node tools/show_plate.js 001
 *   node tools/show_plate.js AL-001 --theme TH-011
 *   node tools/show_plate.js 霜白刀刃 --mode graphic --platform mj
 *   node tools/show_plate.js AL-041 --theme 旧戏台 --json
 *
 * 编号的三种写法都吃：裸数字、AL- 形式、中文名 / 英文名。
 * 主题与模式同理（主题吃 TH- 编号或中文名，模式吃 k 或中文名）。
 *
 * 为什么要有这个工具：
 *   界面上点几下就能看到的东西，命令行里也应该一条命令看到 ——
 *   否则「查一条」这件事就得先开浏览器、点编号、选主题、切模式，
 *   而查一条恰恰是最频繁的动作。
 *
 * 为什么按三层显示（编号本体 → 组合结果 → 授权与风险）：
 *   这三层的读者不同。第一层回答「041 是谁」，
 *   第二层回答「配这个主题能出几段词」，第三层回答「能不能发」。
 *   合成一屏的话，使用者会把第三层当脚注 ——
 *   而「能不能发」恰恰是唯一有法律后果的那一层。
 *
 * 查不到时必须说「找不到」并给最接近的候选，绝不猜 ——
 * 宁可让人重输，也不能给他一个假的编号：假编号会一路错到出图那一步才暴露。
 * ============================================================ */
var path = require("path");
var load = require("./_load.js");

var ROOT = path.join(__dirname, "..");
var db = load();
var K = db.KIT;
var RIGHTS = require(path.join(ROOT, "assets", "rights.js")).RIGHTS;

/* ---------- ANSI ----------
   Windows Git Bash 与 Win10/11 的终端都支持 ANSI 转义。
   但重定向到文件、CI 里不支持 —— 那时会看到一串 [36m 字面量，
   所以先探测：不是 TTY 就关掉颜色。 */
var COLOR = process.stdout.isTTY && process.env.NO_COLOR === undefined;
function c(code, s) { return COLOR ? "\x1b[" + code + "m" + s + "\x1b[0m" : String(s); }
var dim = function (s) { return c("2", s); };
var bold = function (s) { return c("1", s); };
var cyan = function (s) { return c("36", s); };
var green = function (s) { return c("32", s); };
var yellow = function (s) { return c("33", s); };
var red = function (s) { return c("31", s); };
var mag = function (s) { return c("35", s); };

var W = 74;
function rule(ch) { return dim((ch || "─").repeat(W)); }

/* 中文是双宽字符，按 length 补空格会让表格整体歪。
   所以这里按显示宽度算：CJK 与全角标点算 2 列。 */
function width(s) {
  var w = 0;
  for (var i = 0; i < String(s).length; i++) {
    var code = String(s).charCodeAt(i);
    w += (code >= 0x1100 && (code <= 0x115f || code === 0x2329 || code === 0x232a
      || (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f)
      || (code >= 0xac00 && code <= 0xd7a3)
      || (code >= 0xf900 && code <= 0xfaff)
      || (code >= 0xfe30 && code <= 0xfe6f)
      || (code >= 0xff00 && code <= 0xff60)
      || (code >= 0xffe0 && code <= 0xffe6))) ? 2 : 1;
  }
  return w;
}
function pad(s, n) {
  var out = String(s == null ? "" : s);
  var gap = n - width(out);
  return gap > 0 ? out + " ".repeat(gap) : out;
}
function trunc(s, n) {
  var out = String(s == null ? "" : s), w = 0;
  for (var i = 0; i < out.length; i++) {
    var cw = width(out[i]);
    if (w + cw > n - 1) return out.slice(0, i) + "…";
    w += cw;
  }
  return out;
}

function panel(title, lines) {
  console.log(rule());
  console.log(" " + bold(title));
  console.log(rule());
  lines.forEach(function (l) { console.log(" " + l); });
  console.log("");
}

/* ---------- 解析：编号 / 主题 / 模式 ----------
   三样东西的写法规则不同，所以三套解析各写各的。
   共用一个解析函数是本库真实踩过的坑：
   编号归一把「所有非数字剥掉再补前缀」，于是 TH-001 被当成 AL-001，
   主题静默失效、场景面空着，而报错点在三层之外。 */
function findPlate(q) {
  var s = String(q == null ? "" : q).trim();
  if (!s) return null;
  /* 先按编号查 —— 命中就是它，不必再按名字找 */
  var n = K.normNum(s);
  if (n) { var byNum = K.plate(n); if (byNum) return byNum; }
  /* 再按名字查：中文名、英文名、别名。
     名字匹配一律走「完全相等」而不是「包含」——
     「霜」「白」「刀」都能包含命中「霜白刀刃」的话，
     敲一个单字会命中一串编号，而用户以为自己在精确指定。 */
  var lower = s.toLowerCase();
  return db.ALBUM.filter(function (p) {
    if (p.zh === s) return true;
    if (p.en && p.en.toLowerCase() === lower) return true;
    return (p.alias || []).some(function (a) {
      return String(a).toLowerCase() === lower;
    });
  })[0] || null;
}

function findTheme(q) {
  var s = String(q == null ? "" : q).trim();
  if (!s) return null;
  var n = K.normTheme(s);
  if (n) { var byNum = K.themeOf(n); if (byNum) return byNum; }
  var lower = s.toLowerCase();
  return db.THEMES.filter(function (t) {
    return t.zh === s || (t.en && t.en.toLowerCase() === lower);
  })[0] || null;
}

function findMode(q) {
  var s = String(q == null ? "" : q).trim();
  if (!s) return null;
  if (K.modeOf(s)) return K.modeOf(s);
  var lower = s.toLowerCase();
  return db.MODES.filter(function (m) {
    return m.k.toLowerCase() === lower || m.zh === s;
  })[0] || null;
}

/* ---------- 参数 ---------- */
var argv = process.argv.slice(2);
var flags = {};
var words = [];
for (var i = 0; i < argv.length; i++) {
  var a = argv[i];
  if (a === "--json") flags.json = true;
  else if (a === "--theme" || a === "-t") flags.theme = argv[++i];
  else if (a === "--mode" || a === "-m") flags.mode = argv[++i];
  else if (a === "--platform" || a === "-p") flags.platform = argv[++i];
  else if (a === "--no-color") flags.nocolor = true;
  else if (a === "--help" || a === "-h") flags.help = true;
  else words.push(a);
}
if (flags.nocolor) COLOR = false;

var PLATFORMS = ["sd", "mj", "flux", "nl", "gpt"];

if (flags.help || !words.length) {
  console.log("用法：node tools/show_plate.js <编号|中文名|英文名> [选项]\n");
  console.log("编号：001 / 41 / AL-041 / 东古典·清 / eastclassic 都吃\n");
  console.log("选项：");
  console.log("  -t, --theme <TH-编号|中文名>   配哪个主题，决定画什么");
  console.log("  -m, --mode  <plain|graphic|poster|portrait|中文名>");
  console.log("                              呈现模式，默认 plain");
  console.log("  -p, --platform <" + PLATFORMS.join("|") + ">  高亮哪一套平台方言，默认 sd");
  console.log("      --json                      输出 JSON，便于脚本处理");
  console.log("      --no-color                  关掉颜色（重定向到文件时用）");
  console.log("  -h, --help                     显示本帮助\n");
  console.log("例子：");
  console.log("  node tools/show_plate.js 001");
  console.log("  node tools/show_plate.js AL-001 --theme TH-011");
  console.log("  node tools/show_plate.js 霜白刀刃 --mode graphic --platform mj");
  process.exit(flags.help ? 0 : 1);
}

var platform = flags.platform || "sd";
if (PLATFORMS.indexOf(platform) < 0) {
  console.error("未知平台 \"" + platform + "\"，可选：" + PLATFORMS.join(" / "));
  process.exit(1);
}

/* 主题与模式解析失败要说清楚，不能静默用默认值 ——
   用户敲了 --theme TH-099 却拿到「无主题」的输出，
   他会以为这个编号出不了场景，而真实原因是他敲错了主题号。 */
var theme = null;
if (flags.theme) {
  theme = findTheme(flags.theme);
  if (!theme) {
    console.error(red("找不到主题 ") + bold(flags.theme) + "。库内主题 "
      + db.THEMES.length + " 条，形如 TH-001 ~ TH-040 或中文名（如「旧戏台」）。");
    console.error(dim("  " + db.THEMES.slice(0, 6).map(function (t) {
      return t.num + " " + t.zh;
    }).join("  ·  ") + "  …"));
    process.exit(1);
  }
}
var mode = null;
if (flags.mode) {
  mode = findMode(flags.mode);
  if (!mode) {
    console.error(red("找不到模式 ") + bold(flags.mode) + "。可选："
      + db.MODES.map(function (m) { return m.k + "(" + m.zh + ")"; }).join("  "));
    process.exit(1);
  }
}

/* ---------- 查编号 ---------- */
var raw = words.join(" ");
var p = findPlate(raw);
if (!p) {
  /* 候选分两路：数字输入走 ALBUMKIT.nearest（按数值差），
     名字输入走子串匹配。两条路的候选形状不同，所以分开报。 */
  var cands = K.nearest(raw);
  var byName = db.ALBUM.filter(function (x) {
    return (x.zh && x.zh.indexOf(raw) >= 0)
      || (x.en && x.en.toLowerCase().indexOf(raw.toLowerCase()) >= 0);
  }).slice(0, 6);

  console.error(red("画册里没有「") + bold(raw) + red("」。") );
  console.error(dim("  库内编号 " + db.ALBUM.length + " 条：AL-001 ~ AL-0"
    + db.ALBUM.length + "，或直接敲中文名 / 英文名。"));
  console.error("");
  if (cands.length) {
    console.error("  编号最接近的：");
    cands.forEach(function (x) {
      console.error("    " + cyan(x.num) + "  " + pad(x.zh, 12)
        + dim("差 " + x.diff));
    });
  }
  if (byName.length) {
    console.error("  名字含「" + raw + "」的：");
    byName.forEach(function (x) {
      console.error("    " + cyan(x.num) + "  " + x.zh + dim("  " + x.cat));
    });
  }
  if (!cands.length && !byName.length) {
    /* 两路都没候选时，要说清是哪一路的问题 ——
       「999」是数字但差得太远（ALBUMKIT.nearest 只看差 ≤3），
       「龙女」是名字但库里没有。两种情况的建议完全不同，
       说成同一句「没找到」等于把排查的活推给了使用者。 */
    var isNum = /\d/.test(raw);
    console.error(isNum
      ? "  " + dim("编号差得太远。库内只有 AL-001 ~ AL-0" + db.ALBUM.length + "，"
        + "差 3 以内才会给候选。")
      : "  " + dim("既没有这个编号，也没有名字里含「" + raw + "」的条目。"));
  }
  process.exit(1);
}

K.reindex(db);
var r = K.render(db, p.num, {
  themeId: theme ? theme.num : null,
  mode: mode ? mode.k : "plain"
});

if (flags.json) {
  console.log(JSON.stringify({
    ok: true, num: r.num, plate: { zh: p.zh, en: p.en, cat: p.cat, status: p.status },
    theme: theme ? { num: theme.num, zh: theme.zh, cat: theme.cat } : null,
    mode: { k: r.mode.k, zh: r.mode.zh },
    faces: r.faces, loose: r.loose, texts: r.texts, weights: r.weights,
    tags: r.tags, neg: r.neg, nl: r.nl,
    rights: r.rights, risk: r.risk, warns: r.warns,
    missing: r.missing, identity: r.identity,
    guide: r.guide, notice: r.notice
  }, null, 2));
  process.exit(0);
}

/* ---------- 头部 ---------- */
console.log(rule("━"));
var head = [
  bold(p.num) + "  " + bold(p.zh)
  + (p.en ? dim("  " + p.en) : ""),
  dim("类目 " + p.cat + "  ·  状态 " + p.status + "（" + statusZh(db, p.status) + "）")
];
if (theme) {
  head.push(dim("主题 ") + cyan(theme.num + " " + theme.zh)
    + dim("  [" + theme.cat + "]"));
} else {
  head.push(dim("主题 ") + yellow("未指定")
    + dim("  —— 妆造与场景会留空（编号不提供场景面，画册管人不管景）"));
}
head.push(dim("模式 ") + cyan(r.mode.k + " " + r.mode.zh)
  + dim("  " + r.mode.useWhen));
head.forEach(function (l) { console.log(" " + l); });
console.log("");

/* ============================================================
 * 第一层 · 编号本体
 * 八面按 ALBUM_FACES 的声明顺序打印，身份层与可变层分开标注。
 * 为什么分开标注：使用者看到「妆造来自主题」才知道它可以随便换，
 * 而看到「骨相来自编号（锁定）」才知道这一面动不得。
 * ============================================================ */
var faceLines = db.ALBUM_FACES.map(function (f) {
  var x = r.faces[f.k];
  var isId = f.group === "identity";
  var zh = isId ? green(pad(f.zh, 5)) : yellow(pad(f.zh, 5));
  var from = x ? (isId ? green("编号·锁定") : cyan(pad(x.from, 12))) : red(pad("(未填)", 12));
  if (!x) return zh + red("  (缺)") + dim("  " + f.desc);
  return zh + from + "  " + x.c + (x.t ? dim("  " + x.t) : "");
});
panel("① 编号本体 · 八面（身份层恒定 · 可变层可被主题覆盖）", faceLines);

var looseLines = r.loose.map(function (x) {
  return dim(pad(x.from, 10)) + x.c;
});
panel("画法 · 光影与镜头（既不随编号也不随主题）", looseLines);

/* ============================================================
 * 第二层 · 组合结果
 * 五套平台方言全给：只显示一套会让人以为「换个平台就是换个写法」，
 * 而 mj 的 :: 与 sd 的 () 语法完全不同，贴错平台权重直接失效。
 * ============================================================ */
var platLines = PLATFORMS.map(function (k) {
  var arr = r.tags[k] || [];
  return bold((k === platform ? "▶ " : "  ") + pad(k, 5))
    + dim(pad(arr.length + " 词", 6))
    + trunc(arr.join("  "), W - 16);
});
panel("② 组合结果 · tags（五套平台方言，" + platform + " 为当前）", platLines);

panel("neg · 负面词 " + r.neg.length + " 条",
  ["  " + r.neg.join("  ·  ")]);

panel("正文 · 自然语言分段（" + r.mode.zh + "模式）",
  r.nl.split("\n").map(function (l) { return l; }));

/* ============================================================
 * 第三层 · 授权与风险
 * 单独一层，且放在最后 —— 但它不是脚注：
 * 这是唯一有法律后果的一层，「能不能发」只看这里。
 * ============================================================ */
var ri = tierInfoOf(p);
var rightsLines = [
  pad("授权档", 8) + bold(ri.tier + " " + ri.zh)
    + dim("  " + (ri.can || "")),
  pad("", 8) + dim(ri.desc),
  pad("风险", 8) + bold(r.risk + " " + riskZh(db, r.risk))
    + dim("  " + riskDesc(db, r.risk)),
  pad("授权判定", 8) + dim(r.rights.can)
    + dim("   （一次出图会用好几个编号与主题，只要一项碰到最严档，整张图就有风险）"),
  pad("", 8) + dim("声明：" + r.rights.disclaimer)
];
if (p.namedRef) {
  rightsLines.push(pad("原型", 8) + dim(p.namedRef.zh
    + "  —— 真名只作查找与指代，绝不进提示词"));
}
if (p.guard && p.guard.length) {
  rightsLines.push(pad("条目护栏", 8) + yellow(p.guard.join("  ·  ")));
}
panel("③ 授权 · 风险 · 能不能发", rightsLines);

var noteLines = [];
/* 逐面报缺面，而不是把 r.warns 里那句汇总再抄一遍 ——
   抄一遍的代价是同一条警告出现在屏幕上两次，
   而重复的警告读起来像「两条不同的问题」，反而更容易被忽略。
   这里给的是引擎汇总里没有的信息：缺的是哪一面、为什么缺。 */
r.missing.forEach(function (m) {
  noteLines.push(red("! 缺面 " + bold(m.zh))
    + "  " + dim(m.reason || "编号与主题都没提供这一面"));
});
noteLines.push(yellow("· ") + r.notice);
if (r.guide) {
  noteLines.push(dim("  改的时候：可以 " + r.guide.keep
    + "；" + r.guide.swap + "；不要动 " + r.guide.never));
  if (p.read) noteLines.push(dim("  这一号的用法：" + p.read));
}
if (noteLines.length) panel("提示", noteLines);

console.log(" " + dim("换主题： --theme " + (theme ? theme.num + "（换一个）" : "TH-011")
  + "　换模式： --mode graphic　看别的平台写法： --platform "
  + PLATFORMS.filter(function (k) { return k !== platform; }).join(" / ")));
console.log("");

/* ---------- 小工具 ---------- */

/* 授权档信息从 db._core.RIGHT_TIERS 取，不走 RIGHTS.tierInfo()。
   为什么：rights.js 里那一层读的是**裸全局** RIGHT_TIERS
   （`typeof RIGHT_TIERS !== "undefined" ? RIGHT_TIERS : []`）。
   浏览器里 data-core.js 是 <script> 顶层 var，全局可见，取得到；
   Node 里每个文件是独立模块作用域，那个全局不存在 ——
   于是 tierInfo 静默降级成 { zh:"R0", can:"", desc:"" }，
   正好把「这一档能不能商用」这个最该显示的信息显示成空。
   而空字符串在终端上看起来和「没有限制」一模一样。
   所以这里直接问真源（db._core.RIGHT_TIERS），
   不依赖那个在两种加载方式下行为不同的全局。 */
function tierInfoOf(p) {
  var k = RIGHTS.tierOf(p);
  var tiers = db._core.RIGHT_TIERS || [];
  var def = tiers.filter(function (x) { return x.k === k; })[0] || null;
  return {
    tier: k,
    zh: def ? def.zh : k,
    can: def ? def.can : "",
    desc: def ? def.desc : ""
  };
}

function statusZh(d, k) {
  var hit = (d._core ? d._core.STATUS : []).filter(function (s) { return s.k === k; })[0];
  return hit ? hit.zh : k;
}
function riskZh(d, k) {
  var hit = (d._core ? d._core.RISK_KINDS : []).filter(function (s) { return s.k === k; })[0];
  return hit ? hit.zh : k;
}
function riskDesc(d, k) {
  var hit = (d._core ? d._core.RISK_KINDS : []).filter(function (s) { return s.k === k; })[0];
  return hit ? hit.desc : "";
}