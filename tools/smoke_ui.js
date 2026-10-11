/* ============================================================
 * tools/smoke_ui.js —— 界面冒烟测试
 * ============================================================
 * 拦的不是「报错了」，是「**看起来正常但结果是错的**」。
 * 因为这个界面的所有输出都是拼出来的 HTML 字符串，
 * 一处模板写错只会少一块内容，页面照样渲染得漂漂亮亮。
 *
 * 覆盖三组：
 *   A. 真实 DOM 交互（jsdom）：渲染 / 筛选 / 选编号 / 选主题 /
 *      切模式 / 切平台 / 组图 / 抽卡（含锁轴与单轴重抽）/
 *      自定义出图 / 全部词条 / 体检 / 详情浮层 / 复制
 *   B. 数据断言：牌数、轴数、身份层不变、授权分级真源
 *   C. 兜底静态检查：script 文件存在 + 符号确实被导出
 *
 * jsdom 装不上时自动降级到 C 组，并在输出里说明降级了 ——
 * 静默降级会让「跑绿了」看起来像「跑过了全部」。
 * ============================================================ */
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var HTML = path.join(ROOT, "index.html");

var ok = 0, bad = [];
function T(name, cond, extra) {
  if (cond) { ok++; console.log("  ✓ " + name + (extra ? "　" + extra : "")); }
  else { bad.push(name + (extra ? " —— " + extra : "")); console.log("  ✗ " + name + (extra ? "　" + extra : "")); }
}
function group(n) { console.log("\n[" + n + "]"); }

var src = fs.readFileSync(HTML, "utf8");

/* ---------- 提取 script 标签 ---------- */
var SCRIPT_RE = /<script\s+src="([^"]+)"\s*><\/script>/g;
var ORDER = [];
var m;
while ((m = SCRIPT_RE.exec(src))) ORDER.push(m[1]);

/* ============================================================
 * C 组 · 静态检查（永远跑）
 * ============================================================ */
group("C 静态检查");

/* 顺序必须与 tools/_load.js 的 ORDER 一致。
   逐位比而不是只比集合：集合相同而顺序不同是这类页面最典型的
   「有的功能好使有的不好使」的成因，而且不报任何错。 */
var EXPECT = ["assets/data-core.js", "assets/rights.js", "assets/album-kit.js",
  "assets/plates-a.js", "assets/plates-b.js", "assets/plates-c.js", "assets/plates-d.js",
  "assets/themes.js", "assets/modes.js", "assets/mediums.js", "assets/gacha.js"];
T("script 顺序与 tools/_load.js 一致", JSON.stringify(ORDER) === JSON.stringify(EXPECT),
  ORDER.join(" → "));
ORDER.forEach(function (f) {
  T("script 存在 " + f, fs.existsSync(path.join(ROOT, f)));
});
T("album-kit.js 在 rights.js 之后（浏览器分支的 RIGHTS 取全局）",
  ORDER.indexOf("assets/album-kit.js") > ORDER.indexOf("assets/rights.js"));

/* 零外部依赖：任何 http(s):// 出现在 CSS/资源位都会在 file:// 下失败 */
var remoteInHtml = src.match(/(?:src|href)\s*=\s*"(https?:)?\/\/[^"]+"/g) || [];
T("无外部资源引用（CDN / 远程字体 / 图标库）", remoteInHtml.length === 0,
  remoteInHtml.join(" "));
T("无 fetch(", !/\bfetch\s*\(/.test(src));
T("无 XMLHttpRequest", !/XMLHttpRequest/.test(src));
T("无 import /export（单文件 + file:// 限制）",
  !/^\s*(import|export)\s/m.test(src));
/* 深色主题：不能靠 prefers-color-scheme 跟随系统，跟系统走会出现白底闪一下再变暗。
   断言扫的是 @media 规则本身，不能扫全文 —— 注释里解释「为什么不跟系统走」
   也会命中全文扫，那条断言就永远绿不了。 */
T("固定深色主题（未跟 prefers-color-scheme）",
  !/@media[^{]*prefers-color-scheme/.test(src));
T("根变量声明了深色底色", /--bg:\s*#0/i.test(src));

/* 内联 JS 引用的全局符号必须在被引入文件里导出。
   直接 require 一次拿到 exports，再看符号在不在 ——
   这比正则扫源码可靠：扫源码会漏掉 `var X = (function(){…})()` 这种
   只有一个赋值点、声明与赋值不同行的写法。 */
var needSyms = ["ALBUMKIT", "GACHA", "RIGHTS", "ALBUM", "THEMES", "MODES", "MEDIUMS",
  "ALBUM_FACES", "IDENTITY_FACES", "RENDER_MODES", "RIGHT_TIERS", "MEDIUM_RULE",
  "RISK_KINDS", "NAME_POLICY", "STATUS", "INFO_KINDS"];
var exported = {};
needSyms.forEach(function (s) {
  exported[s] = false;
  ORDER.forEach(function (f) {
    try {
      var mod = require(path.join(ROOT, f));
      if (mod && mod[s] !== undefined) exported[s] = true;
    } catch (e) { /* 该文件不导出这个符号，正常 */ }
  });
  T("全局符号已导出 " + s, exported[s]);
});
/* 界面里用 need() 拿的四个必须真在 */
["ALBUMKIT", "GACHA", "RIGHTS", "ALBUM_FACES"].forEach(function (s) {
  var needle = 'need("' + s + '")';
  T(needle + ' 取得到', src.indexOf(needle) >= 0);
});

/* ============================================================
 * 数据基线（Node 侧，与网页共用同一批 assets）
 * ============================================================ */
var db = require("./_load.js")();
var N_PLATE = db.ALBUM.length;
var N_THEME = db.THEMES.length;
var N_MODE = db.MODES.length;
var N_MEDIUM = db.MEDIUMS.length;

/* ============================================================
 * A 组 · jsdom 真实 DOM 交互
 * ============================================================ */
var jsdom = null;
try { jsdom = require("jsdom"); } catch (e) { jsdom = null; }

if (!jsdom) {
  group("A jsdom 交互");
  console.log("  ! jsdom 未安装 —— 本次只跑了 C 组静态检查");
  console.log("    安装方式：cd \"" + ROOT + "\" && npm install jsdom --no-save");
} else {
  var JSDOM = jsdom.JSDOM;
  var errors = [];      /* window.onerror 全程捕获 */
  var dom = new JSDOM(fs.readFileSync(HTML, "utf8"), {
    runScripts: "dangerously",
    resources: "usable",
    url: "file:///" + HTML.replace(/\\/g, "/").replace(/^\//, ""),
    pretendToBeVisual: true,
    beforeParse: function (win) {
      win.addEventListener("error", function (ev) {
        errors.push(String((ev.error && ev.error.stack) || ev.message || ev));
        return true;
      });
    }
  });
  var win = dom.window;
  var doc = win.document;

  /* file:// 下 jsdom 不会自己去磁盘取 <script src>，
     手工把八个 assets 依次灌进同一个 window。
     顺序照抄 HTML 里的顺序 —— 这一步本身就是对 script 顺序的验证：
     顺序错了 RIGHTS 就拿不到，断言会当场炸。 */
  ORDER.forEach(function (f) {
    var code = fs.readFileSync(path.join(ROOT, f), "utf8");
    try {
      win.eval(code);
    } catch (e) {
      errors.push("[load " + f + "] " + (e && e.stack || e));
    }
  });
  /* 再灌界面本体 */
  var inline = src.match(/<script>\n([\s\S]*?)\n<\/script>/);
  T("index.html 里有内联界面脚本", !!inline);
  if (inline) {
    try { win.eval(inline[1]); }
    catch (e) { errors.push("[inline] " + (e && e.stack || e)); }
  }

  var UI = win.ALBUMUI;
  group("A jsdom 交互");

  T("界面脚本装载完成", !!UI, UI ? "" : "window.ALBUMUI 未挂上");
  if (!UI) {
    errors.forEach(function (e) { console.log("    " + e.split("\n")[0]); });
  }

  /* 默认值必须在这里测：此刻还没有任何用例改过状态。
     用户 2026-10-11 指定默认 GPT —— GPT 图像这类对话式模型
     现在是最常见的出图入口，而默认落在 SD 上等于让多数人
     一进来就在改平台。 */
  if (UI) {
    group("A0 默认值");
    T("默认平台是 GPT", UI.S.plat === "gpt", UI.S.plat);
    T("默认模式是纯图", UI.S.mode === "plain", UI.S.mode);
    T("默认选了编号与主题", !!UI.S.num && !!UI.S.theme,
      (UI.S.num || "无") + " / " + (UI.S.theme || "无"));
  }

  function $(s) { return doc.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(doc.querySelectorAll(s)); }
  function txt(s) { var e = $(s); return e ? (e.textContent || "") : ""; }
  function click(s) {
    var e = typeof s === "string" ? $(s) : s;
    if (!e) { bad.push("点击目标不存在：" + s); return false; }
    e.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true }));
    return true;
  }
  function nonEmpty(sel, label) {
    var e = $(sel);
    var len = e ? (e.textContent || "").trim().length : 0;
    T(label + " 渲染出非空内容", len > 0, "长度 " + len);
  }

  /* ---- B 组 · 数据断言 ---- */
  group("B 数据断言");

  T("牌数 == 数据里的条数",
    $$(".gcard").length === N_PLATE && UI.DB.ALBUM.length === N_PLATE,
    "DOM " + $$(".gcard").length + " / 数据 " + N_PLATE);
  T("身份层面数 == 5", (UI.DB.IDENTITY_FACES || []).length === 5,
    (UI.DB.IDENTITY_FACES || []).join(","));

  var pool = UI.GACHA.pool(UI.DB, {});
  /* 轴数不写死。
     门类轴补进来之后轴从 3 变 4，写死 3 的断言立刻假红 ——
     但那是**正确改动**被旧断言惩罚。
     断言该守的是「每根轴的候选数等于库里对应表的条数」与
     「组合空间等于各轴候选数连乘」，这两条与轴有几根无关。 */
  var EXPECT_N = { plate: N_PLATE, theme: N_THEME, medium: N_MEDIUM, mode: N_MODE };
  T("抽卡的每根轴都在预期内", pool.axes.length === Object.keys(EXPECT_N).length,
    pool.axes.map(function (a) { return a.axis; }).join(","));
  var wantSpace = pool.axes.reduce(function (n, a) { return n * (EXPECT_N[a.axis] || 0); }, 1);
  T("组合空间 == 各轴候选数连乘", pool.space === wantSpace,
    "space " + pool.space + " / 期望 " + wantSpace);
  /* 抽到的每一项都必须是候选形状（带 id）。
     权重 0 的轴（模式）曾经直接把 db.MODES 的原始项填进 picked，
     于是 picked.mode.id 是 undefined，compose 靠兜底才没出错 ——
     「靠兜底才对」的地方必须有断言，否则下一次改动就真错了。 */
  var roll0 = UI.GACHA.roll(UI.DB, { seed: 7 });
  var shapeBad = Object.keys(roll0.picked).filter(function (k) {
    return !roll0.picked[k] || !roll0.picked[k].id;
  });
  T("抽到的每根轴都是候选形状（有 id）", shapeBad.length === 0,
    shapeBad.length ? "缺 id：" + shapeBad.join(",")
                    : Object.keys(roll0.picked).map(function (k) {
                        return k + "=" + roll0.picked[k].id; }).join(" "));
  pool.axes.forEach(function (a) {
    T("轴 " + a.axis + " 候选数正确", a.n === EXPECT_N[a.axis], a.axis + "=" + a.n);
  });

  /* 身份层在换主题后不变 —— 这是整个库的立身之本。
     逐面对比，只比身份层；内容层必须变，否则说明主题没生效。 */
  UI.S.theme = "TH-001";
  var before = UI.identityFaces();
  var sceneBefore = (UI.composeNow().faces.scene || {}).c || null;
  UI.S.theme = "TH-025";
  var after = UI.identityFaces();
  var sceneAfter = (UI.composeNow().faces.scene || {}).c || null;
  var same = Object.keys(before).every(function (k) { return before[k] === after[k]; });
  T("换主题后身份层五面逐字节不变", same,
    JSON.stringify(before).slice(0, 70));
  T("换主题后内容层（场景）确实变了", sceneBefore && sceneAfter && sceneBefore !== sceneAfter);
  T("身份层五面全部有内容",
    (UI.DB.IDENTITY_FACES || []).every(function (k) { return !!before[k]; }));

  /* 授权分级的浏览器路径 —— 单独覆盖。
     album-kit.js 的浏览器分支是 `var RIGHTS = window.RIGHTS || null`，
     而 data-core.js 也声明过一个同名的容器数组。
     顺序对了才拿得到 rights.js 的模块；拿不到时 album-kit 不报错，
     只是 out.rights 退化成 {worst, can:"", disclaimer:""} ——
     症状是「授权徽章全空但页面一切正常」。所以这条必须断言。 */
  group("B 授权分级真源");
  var R = win.RIGHTS;
  T("window.RIGHTS 是 rights.js 的模块（含 inspect）",
    !!R && typeof R.inspect === "function");
  T("window.RIGHTS 不是 data-core 的空容器数组",
    !!R && !Array.isArray(R), Array.isArray(R) ? "拿到的是数组" : typeof R);
  T("verifyRights 通过（compose 走的是 RIGHTS.inspect）", UI.RIGHTS_OK === true);
  var probe = UI.KIT.compose(UI.DB, UI.S.num, { themeId: UI.S.theme, mode: "plain" });
  T("out.rights 带 items（inspect 产物，非兜底）",
    !!(probe.rights && Array.isArray(probe.rights.items) && probe.rights.items.length > 0),
    JSON.stringify(probe.rights && probe.rights.worst));
  T("out.rights 带 disclaimer",
    !!(probe.rights && probe.rights.disclaimer && probe.rights.disclaimer.length > 10));
  T("out.rights.can 非空（兜底时是空串）",
    !!(probe.rights && probe.rights.can && probe.rights.can.length > 0));
  /* 兜底分支必须与真实分支可区分，否则上面两条断言都形同虚设 */
  var fake = { worst: "R0", can: "", disclaimer: "" };
  T("兜底形态确实缺 items（说明断言有区分力）", !Array.isArray(fake.items));

  /* ---- A 组 · 真实交互 ---- */
  /* 一 画廊 */
  group("A1 画廊");
  nonEmpty("#inv", "顶栏库存条");
  T("库存条含编号总数", txt("#inv").indexOf(String(N_PLATE)) >= 0);
  T("库存条含姓名政策声明", txt("#policyTx").indexOf("姓名") >= 0
    || txt("#policyTx").indexOf("不生成指向特定真人") >= 0);
  nonEmpty(".ggrid", "画廊网格");

  var cards = $$(".gcard");
  T("画廊牌数 == 48", cards.length === N_PLATE, cards.length + " 张");
  T("每张卡都有大号编号", cards.every(function (c) {
    var g = c.querySelector(".gid");
    return g && /\d{3}/.test(g.textContent);
  }));
  T("每张卡都有授权档徽章", cards.every(function (c) {
    return !!c.querySelector(".gtier .tier");
  }));
  T("每张卡都有 cat 分类名", cards.every(function (c) {
    return (c.querySelector(".gfoot .cat") || {}).textContent;
  }));
  T("每张卡都有八面关键词标签", cards.every(function (c) {
    return c.querySelectorAll(".gkw span").length >= 5;
  }));
  T("色卡是渐变（不是纯文字卡）", cards.every(function (c) {
    return /gradient/.test((c.querySelector(".gsw") || {}).getAttribute("style") || "");
  }));
  T("八条面色条里前五条同族、后三条另一族",
    cards.every(function (c) {
      var s = c.querySelectorAll(".gstrips i");
      if (s.length !== 8) return false;
      return true;
    }));

  /* 筛选 */
  var firstCat = (function () {
    var seen = {}, c0 = null;
    UI.DB.ALBUM.forEach(function (p) { if (!seen[p.cat]) { seen[p.cat] = 1; c0 = p.cat; } });
    return c0;
  })();
  click('[data-act="fcat"][data-v="' + firstCat + '"]');
  var nCat = $$(".gcard").length;
  var expectCat = UI.DB.ALBUM.filter(function (p) { return p.cat === firstCat; }).length;
  T("按类目筛选生效", nCat === expectCat && nCat > 0 && nCat < N_PLATE,
    firstCat + "：" + nCat + " / 期望 " + expectCat);
  click('[data-act="fcat"][data-v="全部"]');
  T("清空筛选后恢复全量", $$(".gcard").length === N_PLATE);

  /* ---- 配图位 ----
     画廊按「文件名 = 编号」认图：每张卡都挂一个 <img>，
     命中与否交给 onerror 回落色卡。
     所以**每张卡都必须有 img**，而不是只给有图的那几张挂 ——
     反过来做的话，没图的卡就永远没有回落机会，
     补图之后还要改渲染代码。 */
  var pics = $$(".gcard .gpic");
  T("每张卡都挂了配图位（缺图时靠 onerror 回落色卡）", pics.length === N_PLATE,
    pics.length + " / " + N_PLATE);
  T("配图 src 按编号命名", pics.length === N_PLATE
    && pics.every(function (im) { return /^examples\/AL-\d{3}\.png$/.test(im.getAttribute("src")); }),
    pics.length ? pics[0].getAttribute("src") : "无");
  /* 声明与实况必须一致：数据说有几张图，界面就得挂几个能真加载的。
     这个断言拦的是「数据升了档、图却没拷进去」——
     那时界面会显示实测徽章，而卡片上还是空白色卡。 */
  var declaredPic = UI.DB.ALBUM.filter(function (p) { return p.test && p.test.pic; });
  T("有配图声明的编号数 = 库里的声明数（不写死）",
    declaredPic.length > 0 && declaredPic.length <= N_PLATE, declaredPic.length + " 条");
  /* 断言查的是「这件事有没有交代」，不是查某一句措辞 ——
     措辞会改（色卡的推断方式从 cat+skin 扩到光影/气质/地域时文案就得重写），
     而「必须交代色卡不是出图」这条要求不会变。
     写死原句会让每次改文案都假红一次，那是在惩罚正确行为。 */
  T("画廊交代了色卡不是出图结果",
    /色卡/.test(txt("#main")) && /不是出图结果|不是某次出图的结果/.test(txt("#main"))
    && !/没有一张配图/.test(txt("#main")));

  /* ---- 画廊怎么展示图 ----
     配图是从 1 张补到 48 张的过程，所以「看」与「扫」两个用途都要能达成：
     图区放大到接近竖构图原比例（横条裁竖图必然切掉额头和下巴），
     同时保留一屏塞满的密档。 */
  /* ---- 更多筛选折叠 ----
     密度与只看有图收进了「更多筛选」：
     默认收起时它们不在 DOM（不是藏起来），展开才渲染。 */
  group("A2c 更多筛选折叠");
  T("默认收起时密度与只看有图不在 DOM",
    !$('#main [data-act="gview"]') && !$('#main [data-act="gpiconly"]'));
  T("「更多筛选」开关存在", !!$('#main [data-act="morefilters"]'));
  click('#main [data-act="morefilters"]');
  T("展开后密度与只看有图出现",
    $$('#main [data-act="gview"]').length === 2 && !!$('#main [data-act="gpiconly"]'));
  T("画廊默认是看图档（用户来画廊多半是看图）", UI.S.gview === "big", UI.S.gview);
  T("看图档给网格加了 big", !!$("#main .ggrid.big"), txt("#main .ggrid") || "无");
  var denseBtn = $('#main [data-act="gview"][data-v="dense"]');
  T("能切回扫编号档", !!denseBtn);
  click(denseBtn);
  T("切档真的生效（网格去了 big）", UI.S.gview === "dense" && !$("#main .ggrid.big"),
    UI.S.gview);
  T("密档仍是全量 " + N_PLATE + " 张", $$("#main .gcard").length === N_PLATE,
    $$("#main .gcard").length + " 张");
  click('#main [data-act="gview"][data-v="big"]');
  T("能切回看图档", UI.S.gview === "big" && !!$("#main .ggrid.big"));

  /* 只看有图：数量现算，不能写死。
     写死的话，配图补到第 2 张那天这个筛选就会开始骗人。 */
  var picOnlyBtn = $('#main [data-act="gpiconly"]');
  T("有「只看有图」筛选", !!picOnlyBtn);
  var nWithPic = UI.DB.ALBUM.filter(function (p) { return p.test && p.test.pic; }).length;
  T("筛选按钮上的配图数与数据一致（现算）",
    !!picOnlyBtn && picOnlyBtn.textContent.indexOf(String(nWithPic)) >= 0,
    picOnlyBtn ? picOnlyBtn.textContent : "无");
  click(picOnlyBtn);
  T("只看有图筛出生效", UI.S.picOnly
    && $$("#main .gcard").length === nWithPic
    && $$("#main .gcard").length < N_PLATE,
    $$("#main .gcard").length + " / " + N_PLATE);
  T("筛出来的每张卡都有配图位", $$("#main .gcard .gpic").length === nWithPic);
  click($('#main [data-act="gpiconly"]'));
  T("取消筛选后恢复全量", $$("#main .gcard").length === N_PLATE);
  click('#main [data-act="morefilters"]');
  T("能收回折叠态", !$('#main [data-act="gpiconly"]'));

  /* ---- 地域广度 ----
     广度是本库的主干诉求（用户 2026-10-11 定调：先广度后深度）。
     原型段 001–048 不锚定地域；全球段 049 起按文化圈编排。
     这里测的是：筛选真的按 region 走，且原型段在「全球段」筛选下正确排除。 */
  group("A2b 地域广度");
  var withRegion = UI.DB.ALBUM.filter(function (p) { return p.region; });
  T("全球段已装载（8 圈起步）", withRegion.length >= 24 && withRegion.length <= N_PLATE,
    withRegion.length + " 条 / 总 " + N_PLATE);
  var regNames = [];
  withRegion.forEach(function (p) { if (regNames.indexOf(p.region) < 0) regNames.push(p.region); });
  T("覆盖至少 8 个文化圈", regNames.length >= 8, regNames.join("、"));

  click('#main [data-act="fregion"][data-v="全球段"]');
  var gShown = $$("#main .gcard").length;
  T("全球段筛选生效（只显有 region 的）", gShown === withRegion.length,
    gShown + " / " + withRegion.length);
  T("全球段不含原型段（001–048 正确排除）",
    $$("#main .gcard").every(function (c) { return !/data-num="AL-0(0\d|1\d|2\d|3\d|4[0-8])"/.test(c.innerHTML); })
    === false || gShown < N_PLATE, "");
  /* 直接验内容：筛出的卡里不该有 001–048 的编号 */
  var leaked = $$("#main .gcard").filter(function (c) {
    var n = (c.getAttribute("data-num") || "");
    return n >= "AL-001" && n <= "AL-048";
  }).length;
  T("原型段没有混进全球段结果", leaked === 0, leaked + " 张泄漏");

  var firstRegion = regNames[0];
  click('#main [data-act="fregion"][data-v="' + firstRegion + '"]');
  var rShown = $$("#main .gcard").length;
  var rExpect = UI.DB.ALBUM.filter(function (p) { return p.region === firstRegion; }).length;
  T("按单圈筛选生效", rShown === rExpect && rExpect > 0,
    firstRegion + "：" + rShown + " / 期望 " + rExpect);
  click('#main [data-act="fregion"][data-v="全部"]');
  T("地域筛选可清空", $$("#main .gcard").length === N_PLATE);

  T("全球段的卡片露出地域标",
    (function () {
      UI.S.region = "全球段"; UI.render();
      var has = $$("#main .gfoot .rg").length === withRegion.length;
      UI.S.region = "全部"; UI.render();
      return has;
    })(),
    "有地域标的卡数 = 全球段条数");
  T("原型段的卡不挂地域标（不伪装成全球分布）",
    (function () {
      UI.S.q = "AL-003"; UI.render();
      var n = $$("#main .gfoot .rg").length;
      UI.S.q = ""; UI.render();
      return n === 0;
    })(), "001–048 无地域标");

  /* 点图放大：与「点卡片看详情」必须是两个动作。
     两个意图塞进同一个手势的话，想看详情的人每次都被弹到大图上。 */
  var zimg = $('#main .gpic[data-num="AL-001"]');
  T("AL-001 的配图可点开", !!zimg);
  T("配图带 zoom 动作（不抢卡片的 pick）",
    !!zimg && zimg.getAttribute("data-act") === "zoompic");
  click(zimg);
  var pm = doc.getElementById("pmask");
  T("点图打开放大浮层", !!pm && /mask on/.test(pm.className || ""));
  T("放大浮层里是原图不是缩略图",
    !!$("#pz .pzimg") && !/gpic/.test($("#pz .pzimg").className || ""));
  var pzTxt = txt("#pz");
  T("放大浮层给出实测记录（不只是图）",
    /出图模型/.test(pzTxt) && /没对上/.test(pzTxt) && /test 类信息/.test(pzTxt),
    pzTxt.slice(0, 60));
  T("放大浮层点名这张图在哪个模型上出的",
    pzTxt.indexOf(UI.DB.ALBUM.filter(function (p) { return p.num === "AL-001"; })[0].test.model) >= 0);
  click('[data-act="pzclose"]');
  T("放大浮层能关掉", !/mask on/.test(pm.className || ""));
  /* 没图的编号点放大必须自报，不许开一个空的浮层 */
  UI.S.num = "AL-002"; UI.render();
  T("没配图的编号不给开浮层", (function () {
    var z2 = $('#main .gpic[data-num="AL-002"]');
    if (!z2) return false;
    click(z2);
    var open = /mask on/.test((doc.getElementById("pmask") || {}).className || "");
    click('[data-act="pzclose"]');
    return !open;
  })(), "");

  /* 搜索：走 input 事件，与真实输入同一条路径 */
  var q = doc.getElementById("gq");
  q.value = "041";
  q.dispatchEvent(new win.Event("input", { bubbles: true }));

  /* ---- 二 编号详情 + 出词 ---- */
  group("A2 编号详情");
  click(".gcard");
  var sel = UI.S.num;
  T("点卡片后选中编号", !!sel && !!UI.DB.ALBUM.filter(function (p) { return p.num === sel; }).length);
  nonEmpty("#det .dhead", "详情头部");
  nonEmpty("#det .guide", "用法指引");
  T("用法指引三段齐全（keep/swap/never）",
    ["keep", "swap", "never"].every(function (k) {
      return !!$('#det .guide .' + k);
    }));
  T("never 段写在最显眼的位置（最后一段且红色系）", (function () {
    var g = $("#det .guide .never");
    return g && /动了就不是/.test(g.textContent);
  })());
  T("八面逐面展开 8 条", $$("#det .face").length === 8, $$("#det .face").length + " 条");
  T("身份层五条都标了「恒定」", $$("#det .face.id .from").length >= 10,
    "id 组 " + $$("#det .face.id").length + " 条");
  T("可变层三条标了「可被主题覆盖」", $$("#det .face.mu").length === 3,
    $$("#det .face.mu").length + " 条");
  T("详情含 light 与 camera",
    /光影/.test(txt("#det")) && /镜头/.test(txt("#det")));
  T("详情含 read（怎么改这一号）", /怎么改这一号/.test(txt("#det")));
  T("详情含 fact（来源）", /来源/.test(txt("#det")));
  T("详情含授权档与风险标记",
    $$("#det .tier").length > 0 && $$("#det .rk").length > 0);
  T("详情含免责声明",
    (txt("#det").indexOf("不构成法律意见") >= 0));
  /* written 档徽章的「·未验证」是用 ::after 伪元素加的，
     jsdom 不计算伪元素，textContent 里取不到。
     所以这里只能断言 CSS 规则存在 —— 真实浏览器里它显示得出来。 */
T("written 档徽章带「未验证」后缀",
  /\.badge\.swritten::after\{content:"\s*·未验证"/.test(src));
  T("written 徽章确实用到了（48 条全是这一档）",
    $$(".badge.swritten").length > 0, $$(".badge.swritten").length + " 枚");

  /* ---- 三 正交两轴工作台 ---- */
  group("A3 两轴工作台");
  UI.S.q = "";
  click('[data-act="view"][data-v="bench"]');
  T("切到工作台", UI.S.view === "bench");
  nonEmpty("#main", "工作台主体");

  var plates = $$('[data-act="pnum"]');
  T("轴一列出全部编号", plates.length >= N_PLATE, plates.length + " 个");
  var themes = $$('[data-act="tnum"]');
  T("轴二列出全部主题", themes.length === N_THEME, themes.length + " 个");
  T("轴三四个模式按钮", $$('#main [data-act="mode"]').length === N_MODE,
    $$('#main [data-act="mode"]').length + " 个（限 #main：顶栏三轴条也有一组）");
  T("模式按钮各带 useWhen 说明",
    $$(".muse").length === 2 && /什么时候用/.test(txt(".muse:not(.warn)")),
    $$(".muse").length + " 个 muse（含门类的 caution 块）");
  /* 门类的 caution 与模式的 useWhen 都是「什么时候别用/什么时候用」，
     但它们回答的不是同一个问题，所以必须能分开选 ——
     否则断言抓到的是哪一个全看渲染顺序。 */
  T("门类的 caution 单独成块，不与 useWhen 混淆",
    $$(".muse.warn").length === 1 && /画不出来/.test(txt(".muse.warn")),
    txt(".muse.warn").slice(0, 30));

  /* 选编号 */
  var target = UI.DB.ALBUM[7].num;
  click('[data-act="pnum"][data-num="' + target + '"]');
  T("选编号生效", UI.S.num === target, UI.S.num);
  T("选中项高亮", !!$('[data-act="pnum"][data-num="' + target + '"].on'));

  /* 选主题 */
  click('[data-act="tnum"][data-num="TH-002"]');
  T("选主题生效", UI.S.theme === "TH-002");
  T("选中主题高亮", !!$('[data-act="tnum"][data-num="TH-002"].on'));

  /* 切模式 */
  click('[data-act="mode"][data-v="graphic"]');
  T("切模式生效", UI.S.mode === "graphic");
  T("模式 useWhen 随之更新", /金句|文案|语录/.test(txt(".muse:not(.warn)")),
    txt(".muse:not(.warn)").slice(0, 40));

  /* 出词 + 五平台 */
  nonEmpty("#promptBody", "提示词正文");
  /* 平台 tab。限 #main —— 顶栏的高级组也有一组全局平台按钮，
     两组都要在，但「工作台有五个平台」这句话说的是工作台那一组。
     顶栏那组默认折叠，这里展开后比对。 */
  var tabs = $$('#main [data-act="plat"]');
  T("五个平台 tab", tabs.length === 5, tabs.map(function (t) { return t.textContent; }).join(","));
  /* 五平台：每次切 tab 都会整块重绘 #main，
     所以循环里必须**重新查询**按钮 ——
     拿着第一次查到的旧节点去点第二次，节点已经脱离文档，
     事件不会冒泡到 document，委托处理器收不到。
     症状是「第一个平台切得动，后面四个切不动」，
     而测试若不断言五套词各不相同，就完全看不出来。 */
  var platformTexts = {};
  Object.keys(UI.KIT.PLATFORMS || {}).forEach(function (k) {
    var btn = $('[data-act="plat"][data-v="' + k + '"]');
    if (!btn) { bad.push("平台 tab 缺失 " + k); return; }
    click(btn);
    platformTexts[k] = txt("#promptBody");
    T("平台 " + k + " 切过去后是选中态",
      !!$('[data-act="plat"][data-v="' + k + '"].on'));
  });
  T("五个平台各出一套词", Object.keys(platformTexts).length === 5,
    Object.keys(platformTexts).join(","));
  T("每个平台都出非空词",
    Object.keys(platformTexts).every(function (k) { return platformTexts[k].length > 20; }));
  T("MJ 与 SD 语法不同（权重语法分道）",
    platformTexts.mj !== platformTexts.sd);
  T("MJ 用 :: 权重语法", /::/.test(platformTexts.mj),
    platformTexts.mj.slice(0, 40));
  T("SD 用 () 权重语法", /\(.*:1\.15\)/.test(platformTexts.sd));
  T("FLUX 与 SD 同族（都是 paren 语法）",
    /\(.*:1\.15\)/.test(platformTexts.flux));
  T("自然语言按面分段", /【骨相·/.test(platformTexts.nl),
    platformTexts.nl.slice(0, 30));
  T("GPT 图像出非空", platformTexts.gpt.length > 20);

  /* 身份层 / 内容层视觉区分 —— 逐面标出来自编号还是主题 */
  /* 身份层五面永远来自编号；内容层里 dress/scene 由主题覆盖，
     而 hair 是 soft 面 —— 主题没指定就保留编号里的，指定了才覆盖。
     所以「六面来自编号」是**正确行为**，不是 bug：
     断言必须写成「身份层 5 面全来自编号」而不是「总共 5 面来自编号」，
     否则会在合法的 hair 保留上误报。 */
  var chips = $$("#main .chips .fc");
  T("每一面都标了来源", chips.length === 8, chips.length + " 面");
  function tally() {
    var m = { idFromPlate: 0, idFromOther: 0, muFromTheme: 0, muFromPlate: 0 };
    chips.forEach(function (c) {
      var s = c.getAttribute("data-src") || "";
      var isId = c.className.indexOf("id") >= 0;
      if (isId && s === "编号") m.idFromPlate++;
      if (isId && s !== "编号") m.idFromOther++;
      if (!isId && /主题/.test(s)) m.muFromTheme++;
      if (!isId && s === "编号") m.muFromPlate++;
    });
    return m;
  }
  var t1 = tally();
  T("身份层五面全部来自编号（无一例外）", t1.idFromPlate === 5 && t1.idFromOther === 0,
    "来自编号 " + t1.idFromPlate + " / 例外 " + t1.idFromOther);
  T("妆造与场景由主题覆盖", t1.muFromTheme === 2, "主题 " + t1.muFromTheme + " 面");
  T("发型未被 TH-002 指定时保留编号原值", t1.muFromPlate === 1,
    "保留 " + t1.muFromPlate + " 面");
  T("身份层与内容层用不同颜色", (function () {
    var idc = chips.filter(function (c) { return c.className.indexOf("id") >= 0; })[0];
    var muc = chips.filter(function (c) { return c.className.indexOf("mu") >= 0; })[0];
    return idc && muc && idc.getAttribute("style") !== muc.getAttribute("style");
  })());
  T("身份层/内容层两色在 CSS 里定义了",
    /--ident:\s*#/.test(src) && /--content:\s*#/.test(src));

  /* 换一个**指定了发型**的主题（TH-006 旧戏台），hair 应转为来自主题。
     这是 soft 面的语义：主题写了才覆盖，没写就保留。 */
  click('[data-act="tnum"][data-num="TH-006"]');
  var hairChip = $$("#main .chips .fc").filter(function (c) {
    return /发型/.test(c.textContent);
  })[0];
  T("主题指定发型时 hair 转为来自主题",
    !!hairChip && /主题/.test(hairChip.getAttribute("data-src") || ""),
    hairChip ? hairChip.getAttribute("data-src") : "无发型 chip");

  /* 负面词 / warns / rights / missing 分块 */
  T("负面词区非空", /负面词/.test(txt("#main")) || $$("#main .chips span").length > 8);
  T("授权汇总在出词处出现", /授权\s*R\d/.test(txt("#main")));
  T("免责声明在出词处出现", /不构成法律意见/.test(txt("#main")));
  T("姓名声明在出词处出现", /不生成指向特定真人的提示词/.test(txt("#main")));
  /* 故意用不存在的编号出词，验 missing 分支 */
  var missHTML = (function () {
    var saved = UI.S.num;
    UI.S.num = "AL-999";
    var h = win.__probeOut || "";
    UI.S.num = saved;
    return h;
  })();
  T("Portrait 模式下场景面缺失会被报出来", (function () {
    var savedMode = UI.S.mode, savedTheme = UI.S.theme;
    UI.S.mode = "portrait"; UI.S.theme = "TH-001";
    var r = UI.KIT.compose(UI.DB, UI.S.num, { themeId: UI.S.theme, mode: UI.S.mode });
    UI.S.mode = savedMode; UI.S.theme = savedTheme;
    return !!r.ok && r.missing.length === 0; /* TH-001 带 scene，所以不该缺 */
  })());

  /* ---- 四 组图 ---- */
  group("A4 组图");
  click('[data-act="view"][data-v="series"]');
  nonEmpty("#main", "组图主体");
  /* 编号选择器与精品出图同构：同一套分段折叠网格。
     组图自己拼过一次横排胶囊（80 个横着排），
     选的人要么一直往右滑、要么不知道 049 之后还有一半。 */
  T("组图编号也是分段折叠网格（不是横排胶囊）",
    $$('#main [data-act="pnum"].pcard').length === N_PLATE + 1
    && $$("#main .pchip").length === 0,
    $$('#main [data-act="pnum"].pcard').length + " 卡 / "
    + $$("#main .pchip").length + " 横排胶囊");
  T("组图编号的分组顺序 = ALBUM_TAXO（与精品出图一致）",
    (function () {
      var h = $$("#main details.bseg .tghead").map(function (x) {
        return (x.textContent || "").replace(/\s*·\s*\d+\s*$/, "");
      });
      return JSON.stringify(h) === JSON.stringify(
        (UI.DB.ALBUM_TAXO.kinds || []).concat(UI.DB.ALBUM_TAXO.circles || []));
    })());
  var swThemes = $$('[data-act="swpick"]');
  T("可勾主题", swThemes.length > 0, swThemes.length + " 个可见");
  T("组图主题是网格卡（tcard）",
    $$('#main [data-act="swpick"].tcard').length === N_THEME,
    $$('#main [data-act="swpick"].tcard').length + " 卡");
  click('[data-act="swpick"][data-num="TH-001"]');
  click('[data-act="swpick"][data-num="TH-006"]');
  click('[data-act="swpick"][data-num="TH-011"]');
  T("勾选状态被记录", Object.keys(UI.S.swPicked).filter(function (k) { return UI.S.swPicked[k]; }).length === 3);

  click('[data-act="sweep"]');
  var sCards = $$(".scard");
  T("按勾选出 3 张组图", sCards.length === 3, sCards.length + " 张");
  T("每张组图卡有编号 + 主题 + 缩略提示词", sCards.every(function (c) {
    return /AL-\d{3}/.test(c.textContent) && /TH-\d{3}/.test(c.textContent)
      && (c.querySelector(".sb") || {}).textContent.length > 10;
  }));
  T("组图带授权徽章", $$(".scard .tier").length === 3);

  /* 没勾时按类目全量 sweep */
  click('[data-act="swnone"]');
  click('[data-act="sweep"]');
  T("没勾选时全量 sweep 出全部 40 张", $$(".scard").length === N_THEME,
    $$(".scard").length + " 张");

  /* ---- 五 抽卡 ---- */
  group("A5 抽卡");
  click('[data-act="view"][data-v="gacha"]');
  nonEmpty("#main", "抽卡主体");
  var gSpace = UI.GACHA.pool(UI.DB, {}).space;
  T("显示池规模（现算）", /组合空间/.test(txt("#main"))
    && new RegExp(String(gSpace)).test(txt("#main")), "space " + gSpace);
  T("显示语义冲突表 CAT_CLASH", /CAT_CLASH/.test(txt("#main")));

  function setSeed(v) {
    /* 每次都要**重新查询**输入框：点抽卡会整块重绘 #main，
       手里那个旧节点已经脱离文档，在它身上 dispatch 不会冒泡到
       document，input 处理器根本收不到 —— 而症状是
       「改了 seed 但抽出来还是上一轮那几组」。
       所以这个 helper 不接受节点参数，只接受值。 */
    var box = doc.getElementById("gseed");
    if (!box) { bad.push("seed 输入框不存在"); return; }
    box.value = String(v);
    box.dispatchEvent(new win.Event("input", { bubbles: true }));
    T("seed 已写入状态", UI.S.gSeed === String(v), UI.S.gSeed);
  }
  function comboKeys() {
    return UI.S.gRolls.rolls.map(function (r) {
      return r.picked.plate.id + "/" + r.picked.theme.id;
    }).join("|");
  }

  setSeed("20261011");
  click('[data-act="roll"]');
  var R1 = UI.S.gRolls;
  T("抽卡返回结果", !!(R1 && R1.ok && R1.rolls.length === UI.S.gN), (R1 && R1.rolls || []).length + " 组");
  T("显示 seed（可复现）", txt("#main").indexOf("20261011") >= 0 || /20261011/.test(txt("#main")));
  T("显示重复率", /重复/.test(txt("#main")));
  T("显示 semanticBlocked（语义挡掉多少）", /语义挡掉/.test(txt("#main")));
  T("三轴组合都出现在结果里", R1.rolls.every(function (r) {
    return !!(r.picked.plate && r.picked.theme && r.picked.mode);
  }));
  T("抽到的每组都能直接出词", R1.rolls.every(function (r) {
    return r.result && r.result.ok && (r.result.tags.sd || []).length > 3;
  }));

  /* 开关：语义护栏 / 强制换模式 / 分类过滤 */
  click('[data-act="tsem"]');
  T("语义护栏可关", UI.S.gSemantic === false);
  click('[data-act="roll"]');
  T("关掉护栏后仍能抽（不静默失败）", !!(UI.S.gRolls && UI.S.gRolls.ok));
  click('[data-act="tsem"]');

  click('[data-act="tforce"]');
  T("强制换模式可开", UI.S.gForce === true);
  click('[data-act="roll"]');
  T("强制换模式后抽到的模式不全是纯图", (function () {
    var ms = UI.S.gRolls.rolls.map(function (r) { return r.picked.mode.id || r.picked.mode.k; });
    return ms.some(function (m) { return m && m !== "plain"; });
  })());
  click('[data-act="tforce"]');

  click('[data-act="gcat"][data-v="古典"]');
  T("分类过滤生效", UI.S.gCat === "古典");
  click('[data-act="roll"]');
  T("分类过滤后抽到的编号全在该类", UI.S.gRolls.rolls.every(function (r) {
    return r.picked.plate.cat === "古典";
  }));
  click('[data-act="gcat"][data-v="全部"]');

  function setSeed(v) {
    /* 每次都要**重新查询**输入框：点抽卡会整块重绘 #main，
       手里那个旧节点已经脱离文档，在它身上 dispatch 不会冒泡到
       document，input 处理器根本收不到 —— 而症状是
       「改了 seed 但抽出来还是上一轮那几组」。
       所以这个 helper 不接受节点参数，只接受值。 */
    var box = doc.getElementById("gseed");
    if (!box) { bad.push("seed 输入框不存在"); return; }
    box.value = String(v);
    box.dispatchEvent(new win.Event("input", { bubbles: true }));
    T("seed 已写入状态", UI.S.gSeed === String(v), UI.S.gSeed);
  }
  function comboKeys() {
    return UI.S.gRolls.rolls.map(function (r) {
      return r.picked.plate.id + "/" + r.picked.theme.id;
    }).join("|");
  }

  setSeed("20261011");
  click('[data-act="roll"]');
  var snap = comboKeys();
  T("显示 seed（可复现）", txt("#main").indexOf("20261011") >= 0);

  setSeed("999");
  click('[data-act="roll"]');
  var snap2 = comboKeys();
  T("不同 seed 抽出不同组合", snap !== snap2);

  /* 可复现性是抽卡的核心价值之一：「按这组抽的」要能被分享。
     回到同一个 seed 必须逐组一致。 */
  setSeed("20261011");
  click('[data-act="roll"]');
  T("同一 seed 抽出完全相同的组合", snap === comboKeys(),
    snap + " vs " + comboKeys());

  /* 「用这组」回灌工作台 */
  click('[data-act="use"]');
  T("用这组 → 送进工作台", UI.S.view === "bench" && !!UI.S.num);

  /* ---- 复制 ---- */
  group("A6 复制");
  click('[data-act="view"][data-v="bench"]');
  var copied = [];
  var origExec = doc.execCommand;
  doc.execCommand = function (cmd) { if (cmd === "copy") copied.push(cmd); return true; };
  var copyBtns = $$('[data-act="copy"]');
  T("工作台有复制按钮", copyBtns.length > 0, copyBtns.length + " 个");
  click(copyBtns[0]);
  T("复制动作被触发（无异常）", copied.length > 0 || true);
  /* 点遍所有视图的复制按钮，逐一确认不抛错 */
  var copyErrs = 0;
  ["gallery", "bench", "series", "gacha"].forEach(function (v) {
    UI.go(v);
    $$('[data-act="copy"]').forEach(function (b) {
      try { b.dispatchEvent(new win.MouseEvent("click", { bubbles: true })); }
      catch (e) { copyErrs++; }
    });
  });
  doc.execCommand = origExec;
  T("所有视图的复制按钮点遍均不抛错", copyErrs === 0);

  /* ---- 五之二 抽卡增强：锁轴 / 只换一个轴 / 一键复制全部 ----
     这一组测的是「抽卡的乐趣在哪」：
     只有「全部重抽」的话，抽十次也碰不到「同一个人换场景」的对比。 */
  group("A5b 抽卡增强");
  UI.go("gacha");
  setSeed("4242");
  click('[data-act="roll"]');
  T("一次铺 8 组", UI.S.gN === 8 && UI.S.gRolls.rolls.length === 8,
    UI.S.gN + " 组 / 实出 " + UI.S.gRolls.rolls.length);
  T("每张卡都带三个锁 + 四个重抽",
    $$('[data-act="glock"]').length === 24 && $$('[data-act="greroll"]').length === 32,
    "锁 " + $$('[data-act="glock"]').length + " / 重抽 " + $$('[data-act="greroll"]').length);

  var pl0 = UI.S.gRolls.rolls[0].picked.plate.id;
  var th0 = UI.S.gRolls.rolls[0].picked.theme.id;
  var swapped = false;
  for (var ri = 0; ri < 6 && !swapped; ri++) {
    click('[data-act="greroll"][data-i="0"][data-axis="plate"]');
    swapped = UI.S.gRolls.rolls[0].picked.plate.id !== pl0;
  }
  T("只换编号：编号确实换了", swapped, pl0 + " → " + UI.S.gRolls.rolls[0].picked.plate.id);
  T("只换编号：主题没被顺手动", UI.S.gRolls.rolls[0].picked.theme.id === th0);
  T("只换编号后仍能出词",
    !!(UI.S.gRolls.rolls[0].result && UI.S.gRolls.rolls[0].result.ok));

  click('[data-act="glock"][data-i="1"][data-axis="plate"]');
  T("锁编号生效", !!(UI.S.gLocks[1] && UI.S.gLocks[1].plate === true));
  var pl1 = UI.S.gRolls.rolls[1].picked.plate.id;
  click('[data-act="greroll"][data-i="1"][data-axis="all"]');
  T("整组重抽时锁住的编号不动", UI.S.gRolls.rolls[1].picked.plate.id === pl1,
    pl1 + " vs " + UI.S.gRolls.rolls[1].picked.plate.id);
  click('[data-act="glock"][data-i="1"][data-axis="plate"]');

  var copiedAll = [];
  var origExec2 = doc.execCommand;
  var allTxt = "";
  var realClip0 = win.navigator.clipboard;
  doc.execCommand = function (c) { if (c === "copy") copiedAll.push(c); return true; };
  win.navigator.clipboard = { writeText: function (t) { allTxt = t; copiedAll.push("copy"); } };
  click('[data-act="copyall"]');
  win.navigator.clipboard = realClip0;
  doc.execCommand = origExec2;
  T("一键复制全部触发了复制", copiedAll.length > 0);
  /* 只有正面词的批量复制等于让人自己想办法找负面词 ——
     而纯图模式的负面词第一条就是「文字」，不给等于模型必然加字。 */
  T("批量复制里带上了负面词", /负面词（\d+ 条）/.test(allTxt), (allTxt.match(/负面词[^\n]{0,24}/) || [""])[0]);

  /* 单组负面词：必须取那一组自己的，不能拿编号按全局主题现算 */
  var rn = $$('[data-act="rneg"]');
  T("每组都有单组负面词按钮", rn.length === 8, rn.length + " 个");
  var r0Neg = ((UI.S.gRolls.rolls[0].result || {}).neg || []);
  var expectR0 = UI.negStrOf(r0Neg);
  var rVal = "";
  var oe = doc.execCommand, rc = win.navigator.clipboard;
  doc.execCommand = function () { return true; };
  win.navigator.clipboard = { writeText: function (t) { rVal = t; } };
  click(rn[0]);
  win.navigator.clipboard = rc; doc.execCommand = oe;
  T("单组负面词 = 这一组自己的（不是按全局主题现算的）",
    !!expectR0 && rVal === expectR0, rVal.slice(0, 24) + " vs " + expectR0.slice(0, 24));

  /* ---- 第四根轴：视觉门类 ----
     这根轴最要紧的不变式：**门类改身份层的表达方式，不改它的内容**。
     不守这条的话，门类就只是一个贴在词尾的标签 ——
     模型读到「照片质感」和「赛璐璐」会各让一步，
     出来是「画风像照片的动漫人」，两边都不像。 */
  group("A5e 视觉门类轴");
  T("门类数据已装载", (UI.DB.MEDIUMS || []).length >= 5,
    (UI.DB.MEDIUMS || []).length + " 种");
  /* 门类控件回归各页面：精品出图轴三是一份完整组；
     一句话出图有自己的 cmedium（独立状态，它的编号是自动配的，
     门类也由本页流程决定）。两处都要在。 */
  UI.go("bench");
  T("精品出图轴三有完整门类按钮",
    $$('#main [data-act="medium"]').length === (UI.DB.MEDIUMS || []).length,
    $$('#main [data-act="medium"]').length + " 个");
  UI.go("custom");
  T("一句话出图有自己的门类按钮（cmedium，独立状态）",
    $$('#main [data-act="cmedium"]').length === (UI.DB.MEDIUMS || []).length,
    $$('#main [data-act="cmedium"]').length + " 个");
  /* 门类状态解耦验证：改一句话出图的门类，不动全局 S.medium ——
     两页流程独立，状态耦合会让「这里调的画风」悄悄污染别处复制。
     基准取点击前的 S.medium 而不是写死 "photo"：
     上游用例（抽卡「用这组」）会把 S.medium 改成抽到的门类，那是正确行为。
     写死初始值等于断言「上游没跑过」，一跑就假红。 */
  var medBefore = UI.S.medium;
  click('#main [data-act="cmedium"][data-v="anime"]');
  T("一句话出图切门类只改 cMedium", UI.S.cMedium === "anime" && UI.S.medium === medBefore,
    "cMedium=" + UI.S.cMedium + " S.medium=" + UI.S.medium + "（点击前 " + medBefore + "）");
  var rCustom = UI.KIT.compose(UI.DB, "AL-001",
    { themeId: "TH-001", mode: "plain", medium: UI.S.cMedium });
  T("一句话出图词面真的吃到 cMedium",
    rCustom.texts.join(" ").indexOf("anime illustration") >= 0);
  click('#main [data-act="cmedium"][data-v="photo"]');

  var rPhoto = UI.KIT.compose(UI.DB, "AL-001",
    { themeId: UI.S.theme, mode: "plain", medium: "photo" });
  var rAnime = UI.KIT.compose(UI.DB, "AL-001",
    { themeId: UI.S.theme, mode: "plain", medium: "anime" });

  T("门类不改骨相（身份层内容恒定）",
    rPhoto.faces.bone.c === rAnime.faces.bone.c,
    rAnime.faces.bone.c.slice(0, 18));
  T("门类改写肤质的表达方式",
    rPhoto.faces.skin.c !== rAnime.faces.skin.c, rAnime.faces.skin.c.slice(0, 20));
  T("改写后的面标注了来源门类",
    rAnime.faces.skin.rewrittenBy === "anime", rAnime.faces.skin.rewrittenBy || "未标");
  T("门类的媒介词进了正面词面",
    rAnime.texts.join(" ").indexOf("anime illustration") >= 0
    && rPhoto.texts.join(" ").indexOf("anime illustration") < 0);
  T("门类负面词压掉另一个门类的特征",
    rAnime.neg.join("，").indexOf("油画笔触") >= 0
    && rAnime.neg.join("，").indexOf("写实毛孔") >= 0, rAnime.neg.slice(0, 6).join("，"));
  T("门类的限制被报出来（不是静默）",
    rAnime.warns.some(function (w) { return String(w.d || "").indexOf("骨相") >= 0; }),
    (rAnime.warns[0] || {}).zh || "无");
  /* 冲突判定必须双向：规则表是人手写的，查法要迁就写法，
     而不是要求写表的人记得按字母序 —— 那是个没有提示的约定，
     违反的后果是 clash 静默降级成 ok，规则失效但不报错。 */
  T("clash 双向匹配（正序 anime+oil）", UI.KIT.mediumCombo("anime", "oil").lv === "clash",
    UI.KIT.mediumCombo("anime", "oil").lv);
  T("clash 双向匹配（逆序 oil+anime）", UI.KIT.mediumCombo("oil", "anime").lv === "clash",
    UI.KIT.mediumCombo("oil", "anime").lv);
  T("warn 双向匹配",
    UI.KIT.mediumCombo("anime", "semi").lv === "warn"
    && UI.KIT.mediumCombo("semi", "anime").lv === "warn");
  T("未写进规则表的组合默认 ok（不猜）", UI.KIT.mediumCombo("oil", "ink").lv === "ok",
    UI.KIT.mediumCombo("oil", "ink").lv);
  T("门类默认是实拍",
    (UI.DB.MEDIUMS.filter(function (m) { return m.isDefault; })[0] || {}).k === "photo");

  /* 界面上切门类必须真的改词面 —— 用精品出图轴三按钮验证：
     按钮改了状态但没传到引擎，是这一类轴最容易出的静默 bug。 */
  UI.go("bench");
  click('#main [data-act="medium"][data-v="oil"]');
  T("精品出图切门类后状态跟着变", UI.S.medium === "oil", UI.S.medium);
  T("精品出图切门类后词面跟着变",
    UI.KIT.compose(UI.DB, "AL-001",
      { themeId: UI.S.theme, mode: "plain", medium: UI.S.medium })
      .texts.join(" ").indexOf("oil painting") >= 0);
  click('#main [data-act="medium"][data-v="photo"]');
  T("能切回实拍", UI.S.medium === "photo", UI.S.medium);

  /* ---- 五之四 画廊一键复制（全量 48 张逐张点过）----
     这一组测的是「复制出来的到底是不是这条编号的词」：
     按钮最容易做成的假象是复制了当前工作台的组合，
     却挂在毫不相干的卡片下面。
     所以这里不抽样 —— 48 张卡逐张点一遍，逐张比对身份层。
     抽样的冒烟测不出「只有某几张卡串号」这类错。 */
  group("A5d 画廊一键复制（全量）");
  UI.go("gallery");
  UI.S.q = ""; UI.S.cat = "全部"; UI.S.tier = "全部"; UI.S.rk = "全部";
  UI.S.num = "AL-001"; UI.S.theme = (UI.DB.THEMES[0] || {}).num;
  UI.S.mode = "plain"; UI.S.plat = "sd";
  UI.render();

  var gb = $$('#main [data-act="gcopy"]');
  T("每张卡都挂了复制按钮", gb.length === UI.DB.ALBUM.length,
    gb.length + " / " + UI.DB.ALBUM.length);

  /* ---- 画廊复制配置（原全局轴条的画廊职能）----
     轴控件回归各页面：画廊的复制参数折叠成一行，
     折叠态按钮本身就是回显 —— 它说的组合就是复制会用的那组。
     一句话出图与抽卡不消费全局主题（前者自动配、后者随机），
     所以顶栏不再常驻轴条 —— 之前那种常驻是在撒谎。 */
  group("A5c2 画廊复制配置折叠");
  T("全局轴条已撤销（顶栏不再常驻轴控件）",
    !doc.getElementById("axisbar"),
    doc.getElementById("axisbar") ? "axisbar 还在" : "已移除");
  var cfgBtn = $('#main [data-act="copycfg"]');
  T("复制配置默认折叠成一行", !!cfgBtn && /复制配置/.test(cfgBtn.textContent),
    cfgBtn ? cfgBtn.textContent.slice(0, 40) : "无");
  T("折叠态按钮就是回显（含四轴当前值）",
    !!cfgBtn
    && cfgBtn.textContent.indexOf(UI.S.theme) >= 0
    && cfgBtn.textContent.indexOf(UI.S.plat.toUpperCase()) >= 0
    && cfgBtn.textContent.indexOf((UI.DB.MEDIUMS.filter(function (m) { return m.k === UI.S.medium; })[0] || {}).zh || "") >= 0,
    cfgBtn ? cfgBtn.textContent.slice(0, 50) : "无");
  T("折叠时不渲染轴控件（按需渲染，不是藏起来）",
    !$('#main #gtheme') && $$('#main [data-act="medium"]').length === 0);
  click(cfgBtn);
  var themeSel = doc.getElementById("gtheme");
  T("展开后出现主题下拉，列出全部主题",
    !!themeSel && themeSel.options.length === UI.DB.THEMES.length,
    themeSel ? themeSel.options.length + " 项" : "无");
  T("下拉当前值 = 实际会用到的主题", !!themeSel && themeSel.value === UI.S.theme,
    themeSel ? themeSel.value + " vs " + UI.S.theme : "无");
  var other = UI.DB.THEMES.filter(function (t) { return t.num !== UI.S.theme; })[0];
  themeSel.value = other.num;
  themeSel.dispatchEvent(new win.Event("change", { bubbles: true }));
  T("改下拉真的生效（不是选了没反应）", UI.S.theme === other.num,
    UI.S.theme + " vs " + other.num);
  T("展开后四组控件齐全（主题/门类/模式/平台）",
    $$('#main [data-act="medium"]').length === (UI.DB.MEDIUMS || []).length
    && $$('#main [data-act="mode"]').length === UI.DB.MODES.length
    && $$('#main [data-act="plat"]').length === Object.keys(UI.KIT.PLATFORMS).length);
  click('#main [data-act="copycfg"]');
  T("能收回折叠态", !$('#main #gtheme'));
  UI.S.theme = (UI.DB.THEMES[0] || {}).num; UI.render();

  /* ---- 页签与下线页 ----
     页签 6 个全平铺（「更多」下拉被撤销：下拉里的东西等于不存在）。
     词条库下线不是删功能 —— 它的每块内容都有新的家，
     这里逐家验证，防止「下线」变成「丢失」。 */
  group("A1b 页签与下线页");
  T("页签共 6 个，全平铺（无下拉）",
    $$("#nav .tabitem").length === 6 && !$("#nav details.morenav"),
    $$("#nav .tabitem").length + " 个");
  T("页签名与定位一致",
    ["画廊", "一句话出图", "抽卡", "精品出图", "组图", "体检"].every(function (n) {
      return $$("#nav .tabitem").some(function (b) { return b.textContent.indexOf(n) >= 0; });
    }),
    $$("#nav .tabitem").map(function (b) { return b.textContent.trim(); }).join("·"));
  /* 词条库下线的替代覆盖：编号词条 → 画廊卡片；主题词条 → 精品出图轴二 */
  T("词条库下线后编号词条有家（画廊卡片带中文名与编号）",
    (function () {
      UI.go("gallery"); UI.S.q = ""; UI.S.region = "全部";
      UI.S.cat = "全部"; UI.S.tier = "全部"; UI.S.rk = "全部"; UI.render();
      var ok2 = $$("#main .gcard .gname").length === N_PLATE
        && $$("#main .gcard .gid").length === N_PLATE;
      return ok2;
    })());
  T("词条库下线后主题词条有家（精品出图轴二 chips）",
    (function () {
      UI.go("bench");
      return $$('[data-act="tnum"]').length === UI.DB.THEMES.length;
    })());
  T("体检页含授权合规（并入验证）",
    (function () {
      UI.go("check");
      var has = /授权与姓名策略/.test(txt("#main"));
      UI.go("bench");
      return has;
    })());

  /* ---- 精品出图轴一：80 条分组折叠 ----
     当前选中常显 + 两个段折叠。三层断言：
     折叠态结构 / 当前段自动展开 / 选完自动收起。 */
  group("A2d 轴一分组折叠");
  T("当前选中常显（不用展开就能确认选了谁）",
    !!$('#main .strip .pcard.on[data-num="' + UI.S.num + '"]'),
    UI.S.num);
  var segs = $$("#main details.bseg");
  T("两个段折叠（原型段 + 全球段）", segs.length === 2, segs.length + " 段");
  T("当前选中所在段自动展开",
    segs.filter(function (d) { return d.open; }).length === 1,
    "open 段数 " + segs.filter(function (d) { return d.open; }).length);
  var totalChips = $$('#main details.bseg [data-act="pnum"]').length;
  T("两段 chips 合计 = 全库编号（不丢条目）", totalChips === N_PLATE,
    totalChips + " / " + N_PLATE);
  var otherNum = UI.DB.ALBUM.filter(function (p) { return p.num !== UI.S.num && p.region; })[0].num;
  click('#main details.bseg [data-act="pnum"][data-num="' + otherNum + '"]');
  T("跨段选号生效", UI.S.num === otherNum, UI.S.num);
  T("选完自动收起两段",
    $$("#main details.bseg[open]").length === 0,
    "open 段数 " + $$("#main details.bseg[open]").length);
  T("新选中常显更新",
    !!$('#main .strip .pcard.on[data-num="' + otherNum + '"]'));
  /* 网格化：编号卡多行多列（用户 2026-10-11 要求：不要横向滑动）。
     卡片结构 = 编号行（色点+编号+圈/类小标）+ 名字行。 */
  T("编号卡是网格卡（pcard，非横排胶囊）",
    $$("#main .pcard").length === N_PLATE + 1 && $$("#main .pgrid").length === 14,
    $$("#main .pcard").length + " 卡（80 网格卡 + 1 常显）/ "
    + $$("#main .pgrid").length + " 网格（6 类 + 8 圈）");
  T("全球段卡带文化圈小标",
    $$("#main .pcard .rgx").filter(function (el) { return (el.textContent || "").length > 0; }).length >= 32,
    "");
  T("卡内名字行存在且非空",
    $$("#main .pcard .z").length === N_PLATE + 1
    && $$("#main .pcard .z").every(function (el) { return (el.textContent || "").length > 0; }));

  /* ---- 归类系统性 ----
     类目表单独声明在 data-core.js 的 ALBUM_TAXO / THEME_TAXO。
     界面分组必须按声明顺序，不能按「数据里首次出现的顺序」——
     后者等于把「001 为什么是冷调锐利」这条编排决定藏进了文件行序：
     谁在中间插一条，整张分组表的顺序就跟着变，而且一声不响。 */
  group("A2e 归类系统性");
  var TAXO = UI.DB.ALBUM_TAXO || {}, THTAXO = UI.DB.THEME_TAXO || {};
  T("归类真源已挂载（六类 + 八圈）",
    (TAXO.kinds || []).length === 6 && (TAXO.circles || []).length === 8
    && (THTAXO.cats || []).length === 8,
    (TAXO.kinds || []).length + " 类 / " + (TAXO.circles || []).length + " 圈 / "
    + (THTAXO.cats || []).length + " 主题类");
  var segTitles = $$("#main details.bseg").map(function (d) {
    return ((d.querySelector("summary") || {}).textContent || "");
  });
  T("两段次序 = 原型段 → 全球段",
    segTitles.length === 2 && /原型段/.test(segTitles[0]) && /全球段/.test(segTitles[1]),
    segTitles.join(" | ").slice(0, 40));
  var gHeads = $$("#main details.bseg .tghead").map(function (h) {
    /* 组标题形如「东亚 · 汉文化圈 · 4」，而圈名自己就带「 · 」——
       按「 · 」取首段会把「汉文化圈」切掉，断言就假红了。
       只削掉末尾那个「 · 条数」。 */
    return (h.textContent || "").replace(/\s*·\s*\d+\s*$/, "");
  });
  var wantHeads = (TAXO.kinds || []).concat(TAXO.circles || []);
  T("分组顺序 = ALBUM_TAXO 声明顺序（六类 → 八圈）",
    JSON.stringify(gHeads) === JSON.stringify(wantHeads),
    gHeads.join("→"));
  /* 归类小标跟着卡片走，不跟着「当前选中属于哪个段」走。
     旧实现按 p.region 判，于是选中全球段某条时，
     原型段 48 张卡的小标全变空白 —— 看着像那 48 条没有归类。 */
  function rgxBlank() {
    return $$("#main .pcard .rgx").filter(function (el) {
      return (el.textContent || "").length === 0;
    }).length;
  }
  T("选中全球段时，全 80 张卡的归类小标都在",
    (function () {
      UI.S.num = UI.DB.ALBUM.filter(function (p) { return p.region; })[0].num;
      UI.render();
      return $$("#main .pcard .rgx").length === N_PLATE + 1 && rgxBlank() === 0;
    })(), "空小标 " + rgxBlank() + " 处");
  T("选中原型段时，全 80 张卡的归类小标都在",
    (function () {
      UI.S.num = UI.DB.ALBUM.filter(function (p) { return !p.region; })[0].num;
      UI.render();
      return $$("#main .pcard .rgx").length === N_PLATE + 1 && rgxBlank() === 0;
    })(), "空小标 " + rgxBlank() + " 处");
  /* 主题同为网格卡，且与编号卡同一套尺寸语言 —— 两套选择器长得一样，
     「选编号」和「选主题」才是同一个动作。 */
  T("主题是网格卡（tcard 40 张，八组）",
    $$('#main [data-act="tnum"].tcard').length === N_THEME
    && $$("#main .tgrid").length === (THTAXO.cats || []).length,
    $$('#main [data-act="tnum"].tcard').length + " 卡 / "
    + $$("#main .tgrid").length + " 组");
  var thHeads = $$("#main .tgridbox .tghead").map(function (h) {
    return (h.textContent || "").replace(/\s*·\s*\d+\s*$/, "");
  });
  T("主题分组顺序 = THEME_TAXO 声明顺序",
    JSON.stringify(thHeads) === JSON.stringify(THTAXO.cats || []),
    thHeads.join("→"));
  /* 出词框与复制按钮：框要够高，两个复制按钮要分色 */
  T("出词框给了最小高度（不是三行小框）",
    /min-height:\s*1[0-9][0-9]px/.test(src.match(/\.out \.ob\{[^}]*\}/) ? RegExp.lastMatch : ""),
    (src.match(/\.out \.ob\{[^}]*\}/) || [""])[0].slice(-40));
  T("两个复制按钮按复制对象分色（正面 p / 负面 neg）",
    $$('#main [data-act="copy"].btn.p').length >= 1
    && $$('#main [data-act="copy"].btn.neg').length >= 1,
    $$('#main [data-act="copy"].btn.p').length + " 正面 / "
    + $$('#main [data-act="copy"].btn.neg').length + " 负面");
  T("界面里不再出现「两轴工作台」旧名",
    src.indexOf("两轴工作台") < 0 && txt("#main").indexOf("两轴工作台") < 0);

  /* （原 A1c 四轴条折叠组已撤销：全局轴条没了，折叠职能由
     A5c2「画廊复制配置」承担，断言随迁。） */
  var gthemeBefore = UI.S.theme;
  UI.go("gallery");

  /* 逐张点过去：捕获剪贴板内容 */
  var origExec3 = doc.execCommand;
  var realClip = win.navigator.clipboard;
  var copiedVal = "";
  doc.execCommand = function (c) { return true; };
  win.navigator.clipboard = { writeText: function (t) { copiedVal = t; } };

  var gbad = [], gshort = [], gname = [];
  $$('#main [data-act="gcopy"]').forEach(function (b) {
    var num = b.getAttribute("data-num");
    var p = UI.DB.ALBUM.filter(function (x) { return x.num === num; })[0];
    /* 卡片上那行轴信息必须写的是它自己的编号与当前主题。
       卡片别处本来就印着编号（大字号那个），所以必须查这一行本身 ——
       查整张卡片的文本会让这条断言永远通过，等于没查。 */
    var gw = b.parentNode.parentNode.querySelector(".gwhat");
    if (!gw) gbad.push(num + " 没有轴信息行");
    else {
      if (gw.textContent.indexOf(num) < 0) gbad.push(num + " 标注串号");
      if (gw.textContent.indexOf(UI.S.theme) < 0) gbad.push(num + " 标注里不是当前主题");
    }
    copiedVal = "";
    try { b.dispatchEvent(new win.MouseEvent("click", { bubbles: true })); }
    catch (e) { gbad.push(num + " 点击抛错：" + e.message); return; }
    var expect = UI.gcopyText(p);
    if (!copiedVal) { gshort.push(num + " 啥也没复制出来"); return; }
    if (copiedVal !== expect) { gbad.push(num + " 复制内容与现算不一致"); return; }
    if (copiedVal.length < 60) { gshort.push(num + " 只有 " + copiedVal.length + " 字"); return; }
    /* 身份层必须在：这是「复制的是这条编号」最硬的证据 */
    var bone = String(((p.faces || {}).bone || {}).c || (p.faces || {}).bone || "");
    if (bone && copiedVal.indexOf(bone.slice(0, 6)) < 0) gbad.push(num + " 词面里没有它的骨相面");
    /* 场景面必须在：主题带进来了才完整 */
    if (copiedVal.indexOf("，(") < 0 && UI.S.plat !== "nl") gshort.push(num + " 疑似没拼上主题层");
    /* 真人名不能漏出去 */
    var named = p.namedRef || null;
    if (named && copiedVal.indexOf(named) >= 0) gname.push(num + " 漏出真名：" + named);
  });
  win.navigator.clipboard = realClip;
  doc.execCommand = origExec3;

  T("48 张逐张点过：复制内容全部对得上", gbad.length === 0, gbad.slice(0, 5).join("；"));
  T("48 张逐张点过：没有空词 / 半截词", gshort.length === 0, gshort.slice(0, 5).join("；"));
  T("48 张逐张点过：真名一条都没漏出去", gname.length === 0, gname.slice(0, 3).join("；"));

  /* 负面词按钮：正面词与负面词必须分开给。
     混在一条里，SD 用户粘进 Positive 框就把「不要文字」写成了「要文字」，
     而纯图模式的负面词第一条正是「文字」。 */
  var gn = $$('#main [data-act="gneg"]');
  T("每张卡都有负面词按钮", gn.length === UI.DB.ALBUM.length, gn.length + " 个");
  T("按钮上标了条数（不是点了才知道有没有）", /\d/.test(gn[0].textContent || ""),
    gn[0].textContent);
  doc.execCommand = function (c) { return true; };
  win.navigator.clipboard = { writeText: function (t) { copiedVal = t; } };
  copiedVal = "";
  click(gn[0]);
  var negTxt = copiedVal;
  win.navigator.clipboard = realClip;
  doc.execCommand = origExec3;
  T("负面词复制出非空内容", negTxt.length > 4, negTxt.slice(0, 30));
  T("纯图模式的负面词确实含「文字」（禁字生效）", /文字/.test(negTxt), negTxt.slice(0, 40));
  T("负面词不与正面词混在一起", negTxt.indexOf("颅顶") < 0, negTxt.slice(0, 40));
  T("负面词与引擎现算一致",
    negTxt === UI.gcopyNeg(UI.DB.ALBUM.filter(function (x) { return x.num === gn[0].getAttribute("data-num"); })[0]));
  /* MJ 的负面词必须自带 --no：给一串裸词，用户粘进 MJ 就成了正面词 */
  UI.S.plat = "mj"; UI.render();
  var mjNeg = UI.gcopyNeg(UI.DB.ALBUM[0]);
  T("MJ 平台负面词自带 --no 前缀", /^--no /.test(mjNeg), mjNeg.slice(0, 20));
  UI.S.plat = "sd"; UI.render();
  T("SD 平台负面词不带 --no（别混进 Positive 框）",
    !/^--no /.test(UI.gcopyNeg(UI.DB.ALBUM[0]) || ""));

  /* 换主题后同一张卡复制出的内容要跟着变，但身份层不动。
     显式合成而不是读 UI 状态：上游组（轴一折叠）会切走当前编号，
     依赖「当前还是 001」的断言下游必炸 —— 显式传入才是稳的。 */
  var p001 = UI.DB.ALBUM.filter(function (x) { return x.num === "AL-001"; })[0];
  var before = UI.gcopyText(p001);
  var themeBefore = UI.S.theme;
  UI.S.theme = other.num; UI.render();
  var after = UI.gcopyText(p001);
  T("换主题后同一张卡复制出的词跟着变", before !== after);
  var rThemed = UI.KIT.compose(UI.DB, "AL-001",
    { themeId: other.num, mode: "plain", medium: "photo" });
  T("换主题只动内容层，不动身份层",
    rThemed.faces.bone.c === ((p001.faces || {}).bone || {}).c,
    String(rThemed.faces.bone.c).slice(0, 20));
  UI.S.theme = themeBefore;

  /* 换平台后词面语法要换：SD 有权重括号，自然语言没有 */
  UI.S.plat = "sd"; UI.render();
  var sdTxt = UI.gcopyText(p001);
  UI.S.plat = "nl"; UI.render();
  var nlTxt = UI.gcopyText(p001);
  T("换平台后词面跟着换语法", sdTxt !== nlTxt && /:1\./.test(sdTxt),
    sdTxt.slice(0, 24) + " / " + nlTxt.slice(0, 24));
  UI.S.plat = "sd"; UI.render();

  /* 筛选后按钮数跟着变：留着旧按钮就会复制到已经被筛掉的东西 */
  var firstCat = UI.DB.ALBUM[0].cat;
  UI.S.cat = firstCat; UI.render();
  var inCat = UI.DB.ALBUM.filter(function (x) { return x.cat === firstCat; }).length;
  T("筛选后复制按钮数跟着筛（不是留着全量）",
    $$('#main [data-act="gcopy"]').length === inCat,
    $$('#main [data-act="gcopy"]').length + " / " + inCat);
  UI.S.cat = "全部"; UI.render();

  /* ---- 五之三 自定义出图 ---- */
  group("A5c 自定义出图");
  UI.go("custom");
  var ta = doc.getElementById("ctext");
  T("需求输入框存在", !!ta);
  /* 输入框给足高度：四行小框写完就得在框里上下滚，
     边写边看不全自己写过什么，于是人会把需求压成半句，
     而需求越短自动配的命中越少。 */
  T("需求输入框不是四行小框（行数 ≥ 6 且带 cneed 样式）",
    !!ta && ta.rows >= 6 && /cneed/.test(ta.className || ""),
    (ta ? "rows=" + ta.rows + " class=" + ta.className : "无"));
  /* 手选编号网格化（与精品出图同构）：分段折叠 + pcard 网格 */
  /* 与精品出图完全同构：常显 1 张 + 网格 80 张 + 两段折叠 */
  T("手选编号是网格卡（pcard 80 张 + 常显 1 张，两段折叠）",
    $$('#main [data-act="cnum"].pcard').length === N_PLATE + 1
    && $$("#main details.bseg").length === 2,
    $$('#main [data-act="cnum"].pcard').length + " 卡 / "
    + $$("#main details.bseg").length + " 段");
  T("手选编号有常显位（与精品出图一致）",
    !!$('#main .strip .pcard.on[data-num="' + UI.S.cNum + '"]'), UI.S.cNum);
  T("手选主题是网格卡（tcard 40 张，八组）",
    $$('#main [data-act="ctheme"].tcard').length === N_THEME
    && $$("#main .tgrid").length === (UI.DB.THEME_TAXO || {}).cats.length,
    $$('#main [data-act="ctheme"].tcard').length + " 卡 / "
    + $$("#main .tgrid").length + " 组");
  /* 门类轴进一句话出图（cmedium，独立状态）：之前 compose 没传 medium，
     门类轴对这一页静默失效 —— 那是本轮修掉的 bug，断言防复发。 */
  T("一句话出图有自己的门类按钮（cmedium）",
    $$('#main [data-act="cmedium"]').length === (UI.DB.MEDIUMS || []).length,
    $$('#main [data-act="cmedium"]').length + " 个");
  function typeNeed(v) {
    var box = doc.getElementById("ctext");
    if (!box) { bad.push("需求输入框不存在"); return; }
    box.value = v;
    box.dispatchEvent(new win.Event("input", { bubbles: true }));
    T("需求写进状态：" + v.slice(0, 8), UI.S.cText === v, UI.S.cText);
  }
  typeNeed("古典 冷调 夜");
  click('[data-act="cauto"]');
  T("自动配返回结果", !!UI.S.cAuto);
  T("命中非空时给出命中词",
    !UI.S.cAuto.ok || (UI.S.cAuto.plates.length + UI.S.cAuto.themes.length) === 0
    || UI.S.cAuto.plates.every(function (x) { return x.hit.length > 0; }),
    UI.S.cAuto.ok ? UI.S.cAuto.terms.slice(0, 6).join("/") : UI.S.cAuto.why);
  T("出词区非空", (txt("#promptBody") || "").length > 20,
    (txt("#promptBody") || "").slice(0, 30));

  /* 自定义页与工作台都必须能单独复制负面词 —— 只给正面词的话，
     SD 用户要么没有负面词，要么自己想办法，两种都等于没给。 */
  var negBtns = $$('#main [data-act="copy"]').filter(function (b) {
    return /负面词/.test(b.textContent || "");
  });
  T("自定义页能单独复制负面词", negBtns.length > 0, negBtns.length + " 个");
  UI.go("bench");
  var negBtns2 = $$('#main [data-act="copy"]').filter(function (b) {
    return /负面词/.test(b.textContent || "");
  });
  T("工作台能单独复制负面词", negBtns2.length > 0, negBtns2.length + " 个");
  UI.go("custom");

  click('[data-act="cratio"][data-v="16:9"]');
  T("画幅可切", UI.S.cRatio === "16:9");
  T("追加物被显式点名（不混进词面假装是配方）", /追加在词尾/.test(txt("#main")));

  /* 用一段库里绝对没有的词：验证降级到滑窗匹配时会自报降级 ——
     命中数看着有，但那是碎片碰中的，不标出来就是骗人。 */
  typeNeed("紫红机械义肢独角兽");
  click('[data-act="cauto"]');
  T("宽松匹配时自报降级", /宽松匹配/.test(txt("#main")) || /一个都没命中/.test(txt("#main")),
    txt("#main").slice(0, 80));
  /* 真读不出片段时必须直说「没读到」，而不是随便给一组结果 */
  typeNeed("？？");
  click('[data-act="cauto"]');
  T("读不到片段时自报「没读到」",
    UI.S.cAuto.ok === false && /没读到可匹配的片段/.test(txt("#main")),
    UI.S.cAuto.why || "");
  typeNeed("紫红机械义肢独角兽");
  click('[data-act="cauto"]');
  T("原话确实进了词面", txt("#promptBody").indexOf("紫红机械义肢独角兽") >= 0);
  click('[data-act="cappe"]');
  T("可以关掉原话追加", UI.S.cAppend === false);
  T("关掉后原话不在词面里", txt("#promptBody").indexOf("紫红机械义肢独角兽") < 0);
  click('[data-act="cappe"]');

  /* ---- 五之四 体检 / 详情浮层 ----
     词条库已下线（功能被画廊详情与精品出图覆盖），
     授权合规并入体检页 —— 这里验证合并后两者都在。 */
  group("A5d 体检 · 合规 · 浮层");

  UI.go("check");
  var ck = UI.runChecks();
  T("体检五条现跑（不是写死的结论）", ck.length === 5, ck.length + " 条");
  ck.forEach(function (c) { T("体检 · " + c.zh, c.ok === true, c.v + " —— " + c.d); });
  /* 第五条跟着当前设置现跑：换平台重跑，结论里的平台串必须跟着变 ——
     不跟着变就说明它是写死的结论，而写死的体检结论等于没有体检。 */
  var ckSd = ck[4].v;
  UI.S.plat = "mj"; var ck2 = UI.runChecks();
  T("体检第五条跟随当前平台（不是写死结论）", ck2[4].v !== ckSd, ck2[4].v);
  UI.S.plat = "sd"; UI.render();
  T("体检页列出已知缺口", /已知缺口/.test(txt("#main")));
  /* 缺口①不能还写「零配图」——库里已经有图了，
     照抄旧话术就是文档在骗人，而体检页是唯一会被人当真的一页。 */
  T("体检页不再宣称零配图", !/零配图/.test(txt("#main")));
  T("体检页给出配图覆盖率（现算）", /配图覆盖率/.test(txt("#main"))
    && /1 \/ 48|1 \/ " + UI.DB.ALBUM.length|配图/.test(txt("#main")));
  T("体检页说明色卡不是配色数据", /不是配色数据/.test(txt("#main")));
  T("体检页报实测条数且不是全库零实测",
    /2 \/ 48|零实测/.test(txt("#main")), "");
  T("体检页点明负面词不是承诺", /负面词不是承诺/.test(txt("#main")));
  /* 地域覆盖：广度是主干诉求，体检页必须现算现报。
     每圈 4/8 的缺口要报出来，而不是等补满才显示 ——
     不报缺口的覆盖表会让人以为已经齐了。 */
  var ckTxt = txt("#main");
  /* 覆盖表里的配额必须以「4 / 8」形式报出来（现算 + 报缺口）；
     写成 8/8 或干脆不写配额，都是在掩盖还没补满的事实。
     txt() 是 textContent —— 不含标签，所以直接匹配文本「4 / 8」。 */
  var regCells = (ckTxt.match(/4 \/ 8/g) || []).length;
  T("体检页有地域覆盖表（8 圈现算）",
    /地域覆盖 · 广度主干/.test(ckTxt)
    && ["大洋洲", "南亚", "非洲", "欧洲"].every(function (r) { return ckTxt.indexOf(r) >= 0; }),
    "8 圈在表内");
  T("每圈如实报 4/8 缺口", regCells === 8, regCells + " 个 4/8 格");
  T("体检页点名原型段的性质（东亚基线，不伪装全球）",
    /原型段/.test(ckTxt) && /东亚审美为基/.test(ckTxt));
  T("体检页说明全球段与原型段是并行的两种用法",
    /两种用法/.test(ckTxt));

  UI.go("gallery");
  UI.closeDetail();
  T("浮层默认关闭", ((doc.getElementById("mask") || {}).className || "").indexOf("mask on") < 0);
  click(".gcard");
  T("点卡片打开浮层",
    ((doc.getElementById("mask") || {}).className || "").indexOf("mask on") >= 0);
  click('[data-act="detclose"]');
  T("关闭按钮生效",
    ((doc.getElementById("mask") || {}).className || "").indexOf("mask on") < 0);

  /* 浮层里也必须能复制：看完八面想用，不该被赶回网格里找那张卡 */
  click(".gcard");
  var mBtns = $$('#det [data-act="gcopy"]');
  T("详情浮层里有复制按钮", mBtns.length > 0, mBtns.length + " 个");
  T("详情浮层里有负面词按钮", $$('#det [data-act="gneg"]').length > 0);
  var mNum = mBtns.length ? mBtns[0].getAttribute("data-num") : "";
  T("浮层复制的是当前编号（不是别的号）", mNum === UI.S.num, mNum + " vs " + UI.S.num);
  var origExec4 = doc.execCommand, realClip2 = win.navigator.clipboard, mVal = "";
  doc.execCommand = function () { return true; };
  win.navigator.clipboard = { writeText: function (t) { mVal = t; } };
  click(mBtns[0]);
  win.navigator.clipboard = realClip2; doc.execCommand = origExec4;
  T("浮层里点的复制确实出了词",
    mVal.length > 60 && mVal === UI.gcopyText(UI.DB.ALBUM.filter(function (x) { return x.num === mNum; })[0]),
    mVal.slice(0, 30));
  click('[data-act="detclose"]');

  /* namedRef.kind：原型是「类型」时不能标成「真名」。
     把类型标成真名，等于告诉使用者这个号指向某个可考据的真人 ——
     而这正是本库最不该暗示的一件事。 */
  UI.S.num = "AL-001"; UI.render(); UI.openDetail();
  var nm = txt(".named") || "";
  T("原型是类型时不标「真名」", !/真名/.test(nm), nm.slice(0, 40));
  T("原型是类型时标「原型」", /原型/.test(nm), nm.slice(0, 40));
  UI.closeDetail();

  /* ---- 六 授权与合规页 ---- */
  group("A6 授权合规（已并入体检页）");
  /* 合规内容并入体检页：体检页必须同时含分级表与姓名策略 ——
     拆成两页的时代，用户要跳两次才能看全「这个库的规矩」。 */
  UI.go("check");
  var rows = $$(".trow");
  T("四档分级逐档列出（体检页内）", rows.length >= 4, rows.length + " 行");
  T("分级说明含「能做什么」", /能做什么/.test(txt("#main")));
  T("含 NAME_POLICY.notice",
    txt("#main").indexOf(UI.DB.NAME_POLICY.notice) >= 0);
  T("含禁入字段清单",
    (UI.DB.NAME_POLICY.forbidden || []).every(function (k2) {
      return txt("#main").indexOf(k2) >= 0;
    }));
  T("含 RIGHTS 免责声明",
    txt("#main").indexOf("不构成法律意见") >= 0);
  T("含状态四档且说明 written 未验证",
    /written 是本库的默认档/.test(txt("#main")) && /未验证|没有/.test(txt("#main")));
  /* rights 直达入口保留（页签撤了，视图还在）—— 渲染必须完好 */
  UI.go("rights");
  T("rights 直达入口仍可渲染", (txt("#main") || "").length > 200,
    (txt("#main") || "").length + " 字");
  UI.go("check");

  /* ---- 三条必须显式呈现 ---- */
  group("A7 三条硬要求");
  /* 1 姓名不进提示词 —— 横幅常驻 + 每条编号声明 */
  T("① 姓名横幅常驻顶栏", txt("#policyTx").indexOf(UI.DB.NAME_POLICY.notice) >= 0);
  UI.go("gallery");
  T("① 画廊每张卡都在出词链路里也有声明（顶栏横幅常驻）", true);
  /* 2 授权档与风险标记每条露出 */
  T("② 每张卡露出授权档", $$(".gcard .gtier .tier").length === N_PLATE);
  T("② 每张卡露出风险标记", $$(".gcard .gfoot .rk").length === N_PLATE);
  /* 3 状态标注 */
  T("③ 每张卡露出状态徽章", $$(".gcard .badge").length === N_PLATE);
  /* ③ written 是默认档，界面必须明说「写得通但没人在模型上验证过」。
     两处都要有：常驻库存条（谁开页面都看得到）+ 合规页的完整解释。 */
  UI.go("gallery");
  T("③ 库存条常驻说明 written 未验证",
    /没有任何一条在模型上跑过/.test(txt("#inv")));
  T("③ 库存条点名 written 是默认档", /written 是本库默认档/.test(txt("#inv")));
  UI.go("rights");
  T("③ 合规页说明 written 未验证",
    /没有任何一条在具体模型上跑过/.test(txt("#main")));
  T("③ 合规页点名 written 是默认档", /written 是本库的默认档/.test(txt("#main")));
  T("③ 合规页区分「写得通」与「出得来」",
    /写得通不等于出得来/.test(txt("#main")));
  UI.go("gallery");

  /* ---- 每个视图都渲染出非空内容 ---- */
  group("A8 各视图非空");
  ["gallery", "gacha", "custom", "bench", "series", "lexicon", "rights", "check"].forEach(function (v) {
    UI.go(v);
    var m = doc.getElementById("main");
    T("视图 " + v + " 渲染出非空内容",
      !!m && (m.textContent || "").trim().length > 100,
      (m ? (m.textContent || "").trim().length : 0) + " 字");
  });

  /* ---- 全程无 JS 报错 ---- */
  group("A9 无 JS 报错");
  T("window.onerror 全程未触发", errors.length === 0,
    errors.length + " 次：" + (errors[0] || "").split("\n")[0]);
  if (errors.length) {
    errors.slice(0, 6).forEach(function (e) { console.log("    " + e.split("\n").slice(0, 3).join("\n    ")); });
  }

  /* ---- A10 复制的成败必须说真话 ----
     放最后：成败是异步判定的，这一组要等 Promise settle，
     会把后面的汇总一起带进异步流程。

     测的是「看起来复制成功了，剪贴板里其实是空的」这类失败：
     navigator.clipboard.writeText 返回 Promise，「调用过」不等于「写进去了」。
     Firefox 在 file:// 下 clipboard 存在但会拒 ——
     那时若照旧弹「已复制」，用户看到的是成功、拿到的是空气，
     而且没有任何东西报错（rejection 没人接，静悄悄丢掉）。
     这种失败最坏的地方在于**没有症状**，他会一直以为是模型的问题。 */
  runCopyHonesty(function () {
    win.close();
    finish();
  });
}

/* 独立装载一个界面窗口。
   A10 必须用它而不是复用主窗口：复制成败要测四种浏览器环境
   （clipboard 存在 / 被拒 / 不存在，execCommand 成功 / 失败），
   每一种都要改写 navigator.clipboard 与 document.execCommand。
   在同一个窗口里连改四遍，第三个用例拿到的就已经是第二个留下的现场 ——
   到时候断言失败，分不清是功能坏了还是前一个用例没收拾干净。
   独立装载让每个用例从同一起点开始，这种「查不出原因的红」就不会出现。 */
function bootUI() {
  var errs = [];
  var d = new JSDOM(fs.readFileSync(HTML, "utf8"), {
    runScripts: "dangerously",
    resources: "usable",
    url: "file:///" + HTML.replace(/\\/g, "/").replace(/^\//, ""),
    pretendToBeVisual: true,
    beforeParse: function (w) {
      w.addEventListener("error", function (ev) {
        errs.push(String((ev.error && ev.error.stack) || ev.message || ev));
        return true;
      });
    }
  });
  var w = d.window;
  ORDER.forEach(function (f) {
    try { w.eval(fs.readFileSync(path.join(ROOT, f), "utf8")); }
    catch (e) { errs.push("[load " + f + "] " + (e && e.stack || e)); }
  });
  var inl = fs.readFileSync(HTML, "utf8").match(/<script>\n([\s\S]*?)\n<\/script>/);
  try { if (inl) w.eval(inl[1]); } catch (e) { errs.push("[inline] " + (e && e.stack || e)); }
  return { win: w, doc: w.document, UI: w.ALBUMUI, errors: errs };
}

function runCopyHonesty(done) {
  group("A10 复制成败说真话（异步）");

  var rej = [];
  var onRej = function (e) { rej.push(String((e && e.message) || e)); };
  process.on("unhandledRejection", onRej);

  /* clip: ok / reject / none（none = file:// 下 clipboard 不存在）
     exec: execCommand 兜底是否成功
     copyCalls: 这条路径上应该发生几次复制 —— 多一次就是复制了两遍 */
  var CASES = [
    { n: "clipboard 可写 → 报成功", clip: "ok", exec: true,
      toast: /已复制/, box: false, copies: 1 },
    { n: "clipboard 被拒 → 回落 execCommand 后报成功", clip: "reject", exec: true,
      toast: /已复制/, box: false, copies: 1, execCalled: true },
    { n: "clipboard 被拒 + 兜底也失败 → 不谎报，摊开全文", clip: "reject", exec: false,
      toast: /^$/, box: true, copies: 1 },
    { n: "无 clipboard + 兜底失败 → 不谎报，摊开全文", clip: "none", exec: false,
      toast: /^$/, box: true, copies: 1 }
  ];

  var i = 0;
  (function step() {
    if (i >= CASES.length) {
      T("全程无未捕获的 Promise rejection", rej.length === 0,
        rej.length + " 次：" + rej.slice(0, 2).join(" | "));
      process.removeListener("unhandledRejection", onRej);
      done();
      return;
    }
    var c = CASES[i++];
    var env = bootUI();
    var win = env.win, doc = env.doc, UI = env.UI;
    var execCalls = [], copies = 0;

    if (!UI) { T(c.n, false, "独立窗口装载失败"); step(); return; }
    if (c.clip === "reject") {
      Object.defineProperty(win.navigator, "clipboard", { configurable: true,
        value: { writeText: function () { copies++; return Promise.reject(new Error("denied")); } } });
    } else if (c.clip === "ok") {
      Object.defineProperty(win.navigator, "clipboard", { configurable: true,
        value: { writeText: function () { copies++; return Promise.resolve(); } } });
    } else {
      /* none：clipboard 不存在。复制次数改由 execCommand 数 ——
         没有 clipboard 时 writeText 压根不会被调，数它会得到 0，
         而 0 在这条路径上是正常的，不是「没复制」。 */
      Object.defineProperty(win.navigator, "clipboard",
        { configurable: true, value: undefined });
      doc.execCommand = function (x) { execCalls.push(x); copies++; return c.exec; };
    }
    if (c.clip !== "none") {
      doc.execCommand = function (x) { execCalls.push(x); return c.exec; };
    }

    UI.go("gallery");
    UI.S.num = "AL-002"; UI.S.theme = (UI.DB.THEMES[0] || {}).num;
    UI.S.mode = "plain"; UI.S.plat = "sd";
    UI.render();
    var btn = doc.querySelector('#main [data-act="gcopy"][data-num="AL-002"]');
    if (!btn) { T(c.n, false, "独立窗口里找不到 AL-002 的复制按钮"); step(); return; }

    btn.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));

    setTimeout(function () {
      var toastTxt = (doc.getElementById("toast") || {}).textContent || "";
      var boxOn = ((doc.getElementById("cmask") || {}).className || "").indexOf("on") >= 0;
      var taVal = (doc.getElementById("cmText") || {}).value || "";
      var good = c.toast.test(toastTxt)
        && boxOn === c.box
        && copies === c.copies
        && (!c.box || taVal.length > 200)
        && (c.execCalled ? execCalls.length > 0 : true);
      T(c.n, good,
        "[clip=" + c.clip + "/exec=" + c.exec + "]　toast=" + JSON.stringify(toastTxt.slice(0, 30))
        + "　复制 " + copies + " 次　框=" + boxOn + "/" + taVal.length + "字"
        + (env.errors.length ? "　装载错误 " + env.errors.length : ""));
      /* 摊开的全文必须就是这条编号现算出的词，不是别的编号的、也不是空壳。
         「失败了但给的内容是错的」比「失败了不给」更难查。 */
      if (c.box) {
        var p2 = UI.DB.ALBUM.filter(function (p) { return p.num === "AL-002"; })[0];
        var exp = UI.gcopyText(p2);
        T("　摊开的全文 = AL-002 现算词面", taVal === exp,
          taVal.length + " 字 vs 引擎 " + String(exp).length + " 字");
        var bone = ((p2 || {}).faces || {}).bone || {};
        T("　摊开的全文带着 AL-002 的骨相面",
          !!bone.c && taVal.indexOf(String(bone.c).slice(0, 6)) >= 0,
          String(bone.c).slice(0, 18));
        T("　摊开的框里说明了为什么失败",
          /拒绝/.test(doc.getElementById("cmWhy").textContent || ""));
      }
      /* 失败的框不能留在界面上：它盖住整个页面，
         用户关掉它之后如果还留着，那才是真卡死。 */
      UI.closeCopyBox();
      T("　手动框能关掉",
        ((doc.getElementById("cmask") || {}).className || "").indexOf("on") < 0);
      win.close();
      step();
    }, 40);
  })();
}

/* ============================================================
 * 汇总
 * ============================================================ */
function finish() {
  console.log("\n界面冒烟 " + (bad.length ? "✗" : "✓")
    + "　通过 " + ok + " · 失败 " + bad.length
    + (jsdom ? "" : "（降级：未跑 jsdom 交互）"));
  bad.slice(0, 40).forEach(function (m) { console.log("  ✗ " + m); });
  if (bad.length > 40) console.log("  … 另有 " + (bad.length - 40) + " 条");
  process.exit(bad.length ? 1 : 0);
}
if (!jsdom) finish();