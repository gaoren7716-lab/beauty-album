/* ============================================================
 * album-kit.js —— 画册引擎
 * ============================================================
 * 三条路：
 *   plate(num)                    —— 看一个编号（画册本体）
 *   compose(num, theme, mode)     —— 编号 + 主题 → 完整提示词
 *   render(num, theme, mode)      —— 完整成品（含 neg、风险、授权）
 *
 * 引擎层唯一真正的新东西是**正交两轴**：
 *   身份层（骨相/肤质/眼目/形体/气质）恒定，来自编号
 *   内容层（妆造/场景）可变，来自主题
 * 主题若不覆盖某一层，就用编号里的 —— 绝不留空，
 * 因为空面出来的图会像「默认设置」，一眼就是没设计过。
 * ============================================================ */

var _AC = (typeof module !== "undefined" && module.exports)
  ? require("./data-core.js")
  : (typeof window !== "undefined" ? window : this);

/* RIGHTS 取全局。必须走容器，不能写 typeof RIGHTS !== "undefined" ——
   那会撞上同名的 getter 自己，递归到爆栈。 */
var RIGHTS = (typeof module !== "undefined" && module.exports)
  ? require("./rights.js").RIGHTS
  : ((typeof window !== "undefined" ? window : this).RIGHTS || null);

/* 姓名阻断。

   ★ 只剥 **namedRef** 里的名字，绝不剥 zh / en / alias。

   为什么：zh 在本库是**描述性名字**（「旧戏台」「米白」「鹤骨」），
   不是人名。早先把它也当真人名剥掉，后果是
   主题 TH-006 的场景「旧戏台，红幕布两侧垂落」被剥成
   「，红幕布两侧垂落」—— 一句以逗号开头的坏提示词。

   而且它**完全静默**：出词成功、界面正常、体检全绿，
   只有拿到结果仔细读才会发现第一句是残句。
   「号码阻断」扫的是反方向（真人名混进了描述），
   所以体检抓不到。

   所以规则收窄成一条：**只有 namedRef 记录原型真名，
   其他字段都不含真人名，不该剥。**
   数据层的纪律（可投放字段不写真名）是主要手段，
   这一层只是兜底 —— 而兜底剥错东西，比不兜底更糟。 */
var NAME_KEYS = ["namedRef"];

function stripNames(str, obj) {
  var s = String(str == null ? "" : str);
  if (!obj || !obj.namedRef) return s;
  var ref = obj.namedRef;
  [ref.zh, ref.en].concat(ref.alias || []).forEach(function (name) {
    var n = String(name || "").trim();
    /* 只剥 ≥2 字的名字：单字会误伤正常中文（「梅」「兰」这类） */
    if (n.length >= 2) s = s.split(n).join("");
  });
  /* 剥完清理首尾标点。剥掉的是整段而不是嵌在句中的词，
     所以留下的往往是「，」「的」这种悬空符号 —— 
     留着就是残句，不如去掉。 */
  return s.replace(/^[\s，,、；;：:。.、\-—]+/, "")
          .replace(/[\s，,、；;：:]+$/, "").trim();
}

var ALBUMKIT = (function () {

  var IDX = { album: {}, themes: {}, modes: {} };

  /* 三张表的主键字段不一样，必须分开建索引：
     ALBUM 与 THEMES 用 num（编号），MODES 用 k（模式名）。
     早先把它们统一按 num 建索引，结果 modeOf('plain') 恒返回 null ——
     而 compose 里紧接着读 mode.k，直接 TypeError 崩掉。
     为什么这类错误特别难查：数据看着完全正常，
     只是「按错字段建索引」，而查表失败返回 null 不抛异常，
     于是崩溃点出现在**下一行**读属性的地方，与真正的病因隔了两层。
     所以索引的键字段必须写在这里，而不是靠调用方传对。 */
  function reindex(db) {
    function ixByNum(list) {
      var m = {};
      (list || []).forEach(function (x) { if (x && x.num) m[x.num] = x; });
      return m;
    }
    function ixByKey(list) {
      var m = {};
      (list || []).forEach(function (x) { if (x && x.k) m[x.k] = x; });
      return m;
    }
    IDX = { album: ixByNum(db.ALBUM), themes: ixByNum(db.THEMES),
            modes: ixByKey(db.MODES), mediums: ixByKey(db.MEDIUMS || []) };
    return IDX;
  }

  /* 编号归一：接受 041 / 41 / 1 / AB-041 / "No.41"
     为什么这么宽松：编号是给人记的，人记得住的是「41」，
     但也会写成「041」「第41」「NO.41」。
     入口不一致的代价是用户以为库坏了。 */
  /* 两张表各用各的编号前缀（AL- 与 TH-），所以必须各有一个归一函数。

     为什么不能共用一个：早先只有一个 normNum()，它把输入里所有非数字
     剥掉再补零 —— 于是 'TH-001' 被归一成 'AL-001'，
     themeOf('TH-001') 查的是画册表，返回 null 而不是报错。
     症状是「场景面莫名其妙空了」，而病因隔了两层：
     主题解析失败 → 主题没覆盖任何面 → 回退到编号（编号没有场景）→ 空面。

     教训：**归一化必须尊重表自己的前缀**。
     剥前缀再补前缀，只有在两张表前缀相同时才是安全的简写；
     这里两张表前缀不同，剥掉就等于丢信息。 */
  function normNum(input) {
    var s = String(input == null ? "" : input).trim();
    if (!s) return null;
    var m = s.match(/(\d{1,3})/);
    if (!m) return null;
    var v = parseInt(m[1], 10);
    if (isNaN(v) || v < 0) return null;
    return "AL-" + ("00" + v).slice(-3);
  }
  function normTheme(input) {
    var s = String(input == null ? "" : input).trim();
    if (!s) return null;
    /* 先按 TH- 前缀直接命中 —— 用户敲 TH-001 时不该被当成 AL-001。
       剥前缀只发生在「没有 TH- 前缀但有数字」的情况（用户只敲 001）。 */
    var m = s.match(/^(?:TH[-\s]?|TH-)(\d{1,3})$/i)
      || s.match(/^0*(\d{1,3})$/)
      || s.match(/(\d{1,3})/);
    if (!m) return null;
    var v = parseInt(m[1], 10);
    if (isNaN(v) || v < 0) return null;
    return "TH-" + ("00" + v).slice(-3);
  }
  /* numOf 是 normNum 的别名位：入口语义是「用户输入」，不是「内部 id」，
     留两个名字会让调用方以为它们规则不同。 */
  function numOf(input) { return normNum(input); }

  function plate(num) {
    return IDX.album[normNum(num)] || null;
  }
  function themeOf(id) {
    return IDX.themes[normTheme(id)] || null;
  }
  function modeOf(k) {
    return IDX.modes[k] || null;
  }
  function mediumOf(k) {
    return IDX.mediums[k] || null;
  }
  /* 门类两两之间的关系。查不到就是 ok —— 没写进 combo 表的组合不猜。
     为什么要分 warn 和 clash 而不是一律禁止：
     一律禁止等于把使用者逼回默认档，而「anime + semi」这类组合
     确实能出图，只是结果在两个画风之间。拦住它不如说清楚代价。 */
  function mediumCombo(a, b) {
    if (!a || !b || a === b) return { lv: "ok", zh: "同一门类" };
    var R = _AC.MEDIUM_RULE || {};
    var C = R.combo || {};
    /* 双向匹配，不排序。
       早先的写法是把两个 key 排好序再比对，结果要求写规则表的人
       「恰好按字母序写」—— 而那是个没有任何提示的约定。
       代价实测得到：clash 表里写了 ["oil","anime"]，
       查 anime+oil 时排完序变成 ["anime","oil"]，永远匹配不上，
       **clash 静默降级成 ok**。这种错误不报错，只是让规则失效。
       规则表是人手写的，查法就该迁就写法。 */
    function has(list) {
      return (list || []).some(function (x) {
        return (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a);
      });
    }
    if (has(C.clash)) return { lv: "clash", zh: "两种画法直接打架，出来两边都不像" };
    if (has(C.warn)) return { lv: "warn", zh: "能出图，但结果会落在两个画风之间" };
    return { lv: "ok", zh: "可自由组合" };
  }

  /* ============================================================
   * compose —— 编号 × 主题 × 模式 → 提示词
   *
   * opt.themeId / opt.themeText —— 主题。可给库内主题，也可给自由文本
   * opt.mode                    —— 呈现模式，默认 plain
   * opt.overwriteFaces          —— 主题要强制覆盖某几面（例：{hair: "短发"}）
   * ============================================================ */
  function compose(db, num, opt) {
    opt = opt || {};
    reindex(db);

    var p = plate(num);
    if (!p) {
      return { ok: false, why: "画册里没有 " + num + " 号",
               cand: nearest(String(num)) };
    }

    var mode = modeOf(opt.mode || "plain") || modeOf("plain");
    var out = {
      ok: true, num: p.num, plate: p, mode: mode,
      faces: {}, loose: [], neg: [], nl: "",
      tags: {}, warns: [], notice: _AC.NAME_POLICY.notice,
      rights: null, risk: null, missing: [], identity: []
    };

    /* ---- 第一步：身份层，来自编号，恒定 ---- */
    _AC.ALBUM_FACES.forEach(function (f) {
      if (f.group !== "identity") return;
      var v = (p.faces || {})[f.k];
      if (!v) { out.missing.push({ face: f.k, zh: f.zh }); return; }
      out.faces[f.k] = { c: stripNames(v.c || v, p), t: v.t || "", from: "编号", locked: true };
      out.identity.push(f.k);
    });

    /* ---- 第二步：可变层。优先级 = 主题显式覆盖 > 主题默认 > 编号原值 ----
       为什么主题覆盖优先于编号：主题说「穿婚纱」，
       编号里的日常装就该让位 —— 否则主题说了等于没说。
       为什么主题没覆盖就保留编号值：空面出来的图
       会像「默认设置」，一眼就是没设计过。 */
    _AC.ALBUM_FACES.forEach(function (f) {
      if (f.group === "identity") return;
      var v = (p.faces || {})[f.k];
      var overridden = false;

      /* 显式覆盖 */
      var force = (opt.overwriteFaces || {})[f.k];
      if (force) {
        out.faces[f.k] = { c: String(force), t: "", from: "指定覆盖", locked: false };
        overridden = true;
      }

      /* 主题覆盖。
         语义分级在这一行：mutable:"soft" 的面（发型）
         主题写了就覆盖，没写就保留编号的；
         mutable:true 的面（妆造、场景）主题写了就覆盖，
         没写就留空并报出来 —— 因为「没有场景」是一个需要修的问题，
         而「发型没被主题指定」不是（编号里有默认发型）。

         为什么不干脆一律「主题没写就回退编号」：
         场景这一面，编号本来就不提供（画册管人不管景），
         所以回退无处可退。留空 + 明确警告，
         比悄悄继承一个与主题无关的旧场景强 ——
         后者会让「赛博义体 + 清晨通勤」这种组合悄悄带上一个海滩。 */
      var th = opt.themeId ? themeOf(opt.themeId) : null;
      if (!overridden && th && th.faces && th.faces[f.k]) {
        out.faces[f.k] = {
          c: stripNames(th.faces[f.k].c || th.faces[f.k], th),
          t: th.faces[f.k].t || "", from: "主题" + (th.num || ""), locked: false
        };
        overridden = true;
      } else if (f.mutable === true && !opt.themeId) {
        /* 无主题时场景留空是正常的（肖像模式本来就不要场景）。
           这里**不再往 missing 里推** ——
           紧接着下面那个分支（回退编号，没有则记 missing）已经会记一次，
           两处都记会让同一个面在 missing 数组里出现两次，
           界面上就会显示成「有 2 面未填」，而实际只有 1 面。 */
      }

      /* 主题没覆盖就用编号里的 */
      if (!overridden) {
        if (v) {
          out.faces[f.k] = { c: stripNames(v.c || v, p), t: v.t || "",
                             from: "编号", locked: false };
        } else {
          out.missing.push({ face: f.k, zh: f.zh });
        }
      }
    });

    /* ---- 第三步：光影与镜头。它们不属于任何一层，是画法 ---- */
    /* 为什么单列：这两面既不随编号也不随主题，是纯画法。
       它们来自编号的 light/camera 字段。 */
    if (p.light) out.loose.push({ c: stripNames(p.light, p), from: "光影" });
    if (p.camera) out.loose.push({ c: stripNames(p.camera, p), from: "镜头" });

    /* ---- 第四步：主题文本 ---- */
    var themeText = opt.themeText || "";
    if (opt.themeId && !themeText) {
      var t2 = themeOf(opt.themeId);
      if (t2) themeText = t2.text || t2.zh || "";
    }
    out.theme = themeText;

    /* 图文模式下主题原文进画面，纯图模式下只决定画什么。
       这个分支是「双模式」的全部差异所在 —— */
    if (mode.k === "graphic" || mode.k === "poster") {
      if (themeText) {
        out.loose.push({ c: "画面中排印这段文字：「" + themeText + "」，字为画面主体之一",
                         from: "图文模式" });
      }
      if (mode.k === "poster") {
        out.loose.push({ c: "海报版式：文字占据画面主要面积，图像作为背景层",
                         from: "海报模式" });
      }
    }

    /* 门类改写身份层的**表达**。
       放在可变层覆盖之后 —— 顺序有讲究：
       门类改的是「这一面怎么说」，可变层改的是「这一面是什么」，
       后者优先。反过来的话，主题定的妆造会被门类的话覆盖掉。 */
    var med = opt.medium ? mediumOf(opt.medium) : mediumOf("photo");
    var mCombo = { lv: "ok", zh: "" };
    if (med && med.rewrite) {
      _AC.IDENTITY_FACES.forEach(function (k) {
        if (!med.rewrite[k] || !out.faces[k]) return;
        out.faces[k].c = med.rewrite[k];
        out.faces[k].rewrittenBy = med.k;
      });
    }
    if (opt.medium2) mCombo = mediumCombo(opt.medium, opt.medium2);
    /* 门类的限制写进 warns，不拦下 ——
       「anime + semi」确实能出图，只是结果落在两个画风之间。
       拦住它等于逼使用者退回默认档，那是在剥夺判断而不是帮忙。 */
    if (med && med.caution) {
      out.warns.push({ lv: "info", zh: "门类「" + med.zh + "」的限制", d: med.caution });
    }
    if (mCombo.lv !== "ok") {
      out.warns.push({ lv: mCombo.lv, zh: "门类组合：" + mCombo.zh, d: "" });
    }
    out.medium = med;
    out.mediumCombo = mCombo;

    /* ---- 第五步：拼装 ---- */
    var texts = [], weights = [];
    /* 门类的媒介词。权重低于身份层、高于场景 ——
       它决定这张图「像什么」，但不该压过「她是谁」。 */
    if (med && med.en) { texts.push(med.en); weights.push(1.05); }
    _AC.ALBUM_FACES.forEach(function (f) {
      var x = out.faces[f.k];
      if (!x || !x.c) return;
      texts.push(x.c);
      /* 身份层权重更高：它是这个编号的根，不该被内容淹没 */
      weights.push(f.group === "identity" ? 1.15 : 1.0);
    });
    out.loose.forEach(function (x) { texts.push(x.c); weights.push(0.85); });

    /* 主题文本本身也进画面描述（纯图模式）。
       为什么要显式写「画面内容」而不是让主题当提示词前缀：
       主题往往是一句抽象的话（"秋天的第一杯奶茶"），
       直接塞进提示词模型会连字面一起画。
       写成「画面内容：…」是把它当语义而不是当文本。 */
    if (themeText && mode.k === "plain") {
      texts.push("画面内容：" + themeText);
      weights.push(1.0);
    }

    out.texts = texts;
    out.weights = weights;
    Object.keys(PLATFORMS).forEach(function (k) {
      out.tags[k] = renderTags(texts, weights, k);
    });

    /* 负面词：门类负 + 模式负 + 全局负 + 条目自带护栏
         门类负放在最前，因为它压掉的是**另一个门类的特征**
         （anime 的 neg 里是「油画笔触」「写实毛孔」），
         这些词如果漏了，出来就是「画风像照片的动漫人」——
         两边都不像，比选错门类还糟。 */
    out.neg = dedupe([]
      .concat((med && med.neg) || [])
      .concat(mode.neg || [])
      .concat(db.DEFAULT_NEG || [])
      .concat(p.guard || [])
      .map(function (x) { return stripNames(x, p); }));

    /* 自然语言正文：按面分段，身份层排前面 */
    var nl = [];
    _AC.ALBUM_FACES.forEach(function (f) {
      var x = out.faces[f.k];
      if (!x || !x.c) return;
      nl.push("【" + f.zh + "·" + x.from + "】" + x.c);
    });
    if (out.loose.length) nl.push("【画法】" + out.loose.map(x => x.c).join("；"));
    if (themeText && mode.k === "plain") nl.push("【主题】" + themeText);
    out.nl = nl.join("\n");

    /* 授权与风险：两者的实际后果不同，要分开给。
       授权档由 rights.js 统一判定，不在这里重写 ——
       一条编号会被单条出词、组图、抽卡多处读到，
       各处各判一次迟早有一处对不上。 */
    out.rights = null;
    if (typeof RIGHTS !== "undefined" && RIGHTS && RIGHTS.inspect) {
      out.rights = RIGHTS.inspect([p]);
      var t = _AC.RIGHT_TIERS.filter(function (x) { return x.k === p.rights; })[0];
      if (p.rights === "R2" || p.rights === "R3") {
        out.warns.push("授权档 " + p.rights + "：" + (t ? t.can : "")
          + "。产出不得暗示为本人，发布前请自行评估肖像边界。");
      }
    } else {
      out.rights = { worst: p.rights || "R3", can: "", disclaimer: "" };
    }
    out.risk = p.risk || "none";
    if (p.risk === "identity") {
      out.warns.push("本号指向一位可考据的在世真人。真名仅供查找，"
        + "提示词只使用特征化描述；产出不得用于任何暗示本人的场合。");
    }
    if (p.risk === "lookalike") {
      out.warns.push("本号特征可能与某位真人高度相似，产出前请自查是否构成肖像指认。");
    }
    if (p.risk === "sensitive") {
      out.warns.push("本号涉及敏感维度，请避免贬低性修饰与物化措辞。");
    }

    if (out.missing.length) {
      out.warns.push("有 " + out.missing.length + " 面未填："
        + out.missing.map(m => m.zh).join("、")
        + "。空面出来的图会像默认设置。");
    }

    return out;
  }

  function render(db, num, opt) {
    var r = compose(db, num, opt);
    if (!r.ok) return r;
    r.guide = usageGuide(r);
    return r;
  }

  /* 使用指引：把「怎么改」写清楚。
     为什么单独一层：用户拿到提示词后的下一个动作一定是「改点东西」，
     而「该改哪一层」这件事不写出来，他就会去改骨相 ——
     改完就不是这个编号了。 */
  function usageGuide(r) {
    var p = r.plate;
    return {
      keep: "换主题、换光影、换镜头 —— 这些不改这个人",
      swap: "换妆造与场景 —— 内容层，随便换",
      never: "骨相 / 肤质 / 眼目 / 形体 / 气质 —— 动了就不是 " + p.num + " 号了",
      hint: p.read || ""
    };
  }

  /* ============================================================
   * 平台方言
   * 由 kind 决定语法，不靠 weight 字段是否非空 ——
   * 这条踩过坑：mj 的 "::2" 是真值，
   * 靠真值判断会走进 SD 分支，输出逐字节相同且完全失效。
   * ============================================================ */
  var PLATFORMS = {
    sd:   { zh: "Stable Diffusion", kind: "paren" },
    mj:   { zh: "Midjourney", kind: "colon" },
    flux: { zh: "FLUX", kind: "paren" },
    nl:   { zh: "自然语言", kind: "plain" },
    gpt:  { zh: "GPT 图像", kind: "plain" }
  };

  function renderTags(texts, weights, platform) {
    var p = PLATFORMS[platform] || PLATFORMS.sd;
    return texts.map(function (t, i) {
      var w = weights[i] == null ? 1 : weights[i];
      if (p.kind === "plain") return t;
      if (p.kind === "colon") {
        if (w <= 1) return t;
        return t + "::" + Math.round(w * 2);
      }
      if (w <= 0) return "(" + t + ":0.8)";
      return "(" + t + ":" + (Math.round(w * 100) / 100) + ")";
    });
  }

  function dedupe(a) {
    var seen = {}, out = [];
    a.forEach(function (x) {
      var k = String(x);
      if (!k || seen[k]) return;
      seen[k] = 1; out.push(x);
    });
    return out;
  }

  /* 编号写错时给最近候选。
     为什么用数字差而不用编辑距离：编号是纯数字，
     「AL-041」和「AL-041」之间没有字符顺序问题，
     差的只是数值大小。编辑距离在数字串上算出来的结果
     与「差几位」完全一致（补零后每差一位都是一次增删），
     所以数字差更直接，也更好解释。 */
  function nearest(input) {
    var q = normNum(input);
    if (!q) return [];
    var n = parseInt(q.slice(3), 10), best = [], seen = {};
    Object.keys(IDX.album).forEach(function (k) {
      var m = parseInt(k.slice(3), 10);
      var d = Math.abs(m - n);
      if (d <= 3 && !seen[k]) {
        seen[k] = 1;
        best.push({ num: k, zh: IDX.album[k].zh, diff: d });
      }
    });
    return best.sort(function (a, b) { return a.diff - b.diff; }).slice(0, 6);
  }

  /* 批量出图：一个编号 × 多个主题，铺开成一套。
     为什么要有这个：画册的真实用法是「我要一组图」，
     不是「我要一张图」。逐个调 compose 太碎。 */
  function series(db, num, themeIds, opt) {
    opt = opt || {};
    return (themeIds || []).map(function (t) {
      var o = Object.assign({}, opt, { themeId: t });
      o.overwriteFaces = Object.assign({}, o.overwriteFaces, (opt.overwriteFaces || {}));
      var th = themeOf(t);
      return {
        themeId: t, themeZh: th ? th.zh : "",
        text: th ? (th.text || th.zh) : "",
        result: compose(db, num, o)
      };
    });
  }

  return {
    reindex: reindex, plate: plate, themeOf: themeOf, modeOf: modeOf,
    mediumOf: mediumOf, mediumCombo: mediumCombo,
    compose: compose, render: render, series: series,
    nearest: nearest, normNum: normNum, normTheme: normTheme,
    numOf: numOf,
    PLATFORMS: PLATFORMS, usageGuide: usageGuide,
    _stripNames: stripNames, _NAME_KEYS: NAME_KEYS
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ALBUMKIT: ALBUMKIT };
}