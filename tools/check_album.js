/* ============================================================
 * tools/check_album.js —— 画册体检
 * ============================================================
 * 拦的是「不报错但让结果莫名其妙」的问题：
 *   1. 对象字面量里的重复键 —— JS 允许重复键、后者覆盖前者，
 *      运行期完全不报错，但改前一处不生效，后人会以为引擎坏了
 *   2. 编号重复 / 缺号（编号是记忆产物，重复会让两个形象共用一个号）
 *   3. 身份层五面缺失 —— 少一面就不是同一个人了
 *   4. ★ 姓名泄漏：真名进了可投放字段
 *   5. 授权与风险未显式标（连 none 也要标）
 *   6. 平台权重语法（mj 与 sd 必须不同）
 * ============================================================ */
var fs = require("fs");
var path = require("path");
var db = require("./_load.js")();
var _core = db._core;
var K = db.KIT;

var errs = [], warns = [];
function E(m) { errs.push(m); }
function W(m) { warns.push(m); }

/* ---------- 1. 重复键 ----------
   为什么要扫源码而不是只读对象：
   对象里重复键已经被合并了，读对象永远看不出来。
   而重复键的后果恰恰是「我改了没生效」——
   那种问题没有工具守着，几乎必然被误判成「引擎坏了」。

   判定范围：单个条目块内的**顶层**键（两空格缩进）。
   嵌套层的重复键只影响那一个对象，不值得为此做完整的 JS 解析；
   真要严格，应该用 AST 工具，而不是在这里手写正则。

   合法情况：一个文件的多个条目里出现同一个键（每条都有 zh）。
   所以判定条件是「同一个条目块内重复」——
   按条目切块后逐块检查，而不是整文件扫。 */
function scanDupInEntries(file) {
  var p = path.join(__dirname, "..", "assets", file);
  if (!fs.existsSync(p)) return;
  var src = fs.readFileSync(p, "utf8");
  /* 按 { num:"AL-xxx" 切块；没有 num 的表按 { num 之外的开头切 */
  var blocks = src.split(/\n(?=\{ *(?:num|id)\s*:)/);
  blocks.forEach(function (blk, bi) {
    if (bi === 0) return;
    var idm = blk.match(/(?:num|id)\s*:\s*"([^"]+)"/);
    var id = idm ? idm[1] : ("块" + bi);
    var keys = {};
    blk.split(/\r?\n/).forEach(function (ln, li) {
      var m = ln.match(/^  ([A-Za-z_][A-Za-z0-9_]*)\s*:\s*[^:]/);
      if (!m) return;
      if (keys[m[1]] !== undefined) {
        E(file + " 条目 " + id + " 内重复键 " + m[1]
          + "（第 " + (keys[m[1]]) + " 行与第 " + (li + 1) + " 行）："
          + "后写的会静默覆盖前一个");
      }
      keys[m[1]] = li + 1;
    });
  });
}
["plates-a.js", "plates-b.js", "plates-c.js", "plates-d.js"].forEach(scanDupInEntries);

/* ---------- 1b. 字符串跨行 ----------
   写长中文说明时最容易犯：直接敲回车换行而没写 + 拼接。
   症状是 SyntaxError: Invalid or unexpected token，
   而且报错行号指向**下一行**，看起来像是下一行写错了 ——
   实际上真正的问题在上一行末尾。找起来很费时间。
   所以这里按「引号数为奇数」提前拦下。 */
["plates-a.js", "plates-b.js", "plates-c.js", "plates-d.js",
 "themes.js", "modes.js"].forEach(function (file) {
  var fp = path.join(__dirname, "..", "assets", file);
  if (!fs.existsSync(fp)) return;
  fs.readFileSync(fp, "utf8").split(/\r?\n/).forEach(function (ln, i) {
    /* 逐字符数「在字符串内」的转义感知计数太重，
       这里用简单计数：对含中文说明的数据文件，
       每一行的引号必须是偶数对。注释行豁免。 */
    var t = ln.trim();
    if (t.indexOf("//") === 0 || t.indexOf("*") === 0 || t.indexOf("/*") === 0) return;
    var q = (ln.match(/"/g) || []).length;
    if (q % 2 === 1) {
      E(file + " 第 " + (i + 1) + " 行引号未闭合（字符串被换行截断）："
        + t.slice(0, 40) + "\n    → 报错行号会指向下一行，真正的问题在这一行末尾");
    }
  });
});

/* ---------- 2. 编号 ----------
   重复编号必须报；缺号只提示（编号允许留空位，
   留空是为了让「已删号」不被后来的人重新用掉）。 */
var numSeen = {};
db.ALBUM.forEach(function (p) {
  if (!p.num) { E("有条目缺 num"); return; }
  if (numSeen[p.num]) E("编号重复：" + p.num + " 同时用于「' + numSeen[p.num] + '」与「' + p.zh + '」");
  numSeen[p.num] = p.zh;
  if (!K.normNum(p.num) || K.normNum(p.num) !== p.num) {
    E("编号形态不合规：" + p.num + "（应为 AL-001 这样的三位补零形态）");
  }
});
var nums = Object.keys(numSeen).map(function (n) { return parseInt(n.slice(3), 10); })
  .sort(function (a, b) { return a - b; });
var gaps = [];
for (var i = nums[0]; i <= nums[nums.length - 1]; i++) {
  if (nums.indexOf(i) < 0) gaps.push(("00" + i).slice(-3));
}
if (gaps.length) W("编号缺号 " + gaps.length + " 个：" + gaps.join("、")
  + "（缺号是正常的，表示已删除；但别把已删号重新启用）");

/* ---------- 3. 身份层五面 ----------
   身份层少一面，出图就不是「这个人」了。
   而这件事在界面上完全看不出来 —— 图照样出得了，
   只是两次出的不是同一个人。所以必须在这里拦。 */
var IDENTITY = _core.IDENTITY_FACES;
db.ALBUM.forEach(function (p) {
  var miss = [];
  IDENTITY.forEach(function (f) {
    var v = p.faces && p.faces[f];
    if (!v || !(v.c || typeof v === "string")) miss.push(f);
  });
  if (miss.length) E(p.num + " " + p.zh + " 身份层缺 " + miss.length + " 面：" + miss.join("、"));
});

/* ---------- 4. 姓名泄漏 ----------
   本库最重要的一条。编号会被长期复用，
   一个编号里藏了人名 = 每次用都在漏。 */
var LEAK = [
  /长得像[一-鿿]{2,4}/, /类似[一-鿿]{2,4}(先生|小姐|女士)/,
  /某位?[一-鿿]{2,6}(明星|模特|演员|歌手)/, /模仿[一-鿿]{2,4}/,
  /copy of [A-Z][a-z]+/
];
function scanLeak(str, where) {
  if (typeof str !== "string") return;
  LEAK.forEach(function (rx) {
    var m = str.match(rx);
    if (m) E(where + " 疑似把真人写进可投放字段：" + m[0]);
  });
}
db.ALBUM.forEach(function (p) {
  var w = p.num + " " + p.zh;
  Object.keys(p.faces || {}).forEach(function (f) {
    var v = p.faces[f];
    scanLeak(typeof v === "string" ? v : (v.c || ""), w + ".faces." + f);
  });
  scanLeak(p.light, w + ".light");
  scanLeak(p.camera, w + ".camera");
  scanLeak(p.read, w + ".read");
  /* 兜底：比对真名来源，确保它们没出现在可投放文本里。

     只查 namedRef，不查 zh / en。
     为什么不查 zh：编号名（例如「鹤骨」「米白」）天然会出现在 read 里 ——
     说明书必须能说清「这一号」，而 read 恰恰是要进界面的文本。
     把编号名当真人名去比对，会把「说明书写清自己是谁」误报成泄漏。
     真人名只可能来自 namedRef（那是唯一记录原型真名的地方），
     所以只查它，判据既够用又不会误报。

     **可投放文本**这里指 light / camera / faces.*.c / guard。
     read 与 fact 是给人看的说明，不进提示词，所以它们含名字不算泄漏。 */
  var deliverable = [p.light, p.camera].concat(p.guard || []).concat(
    Object.keys(p.faces || {}).map(function (f) {
      var v = p.faces[f];
      return typeof v === "string" ? v : (v.c || "");
    })).join(" ");
  var names = [];
  if (p.namedRef) {
    [p.namedRef.zh, p.namedRef.en].concat(p.namedRef.alias || [])
      .forEach(function (n) { if (n && n.length >= 2) names.push(n); });
  }
  (p.alias || []).forEach(function (n) {
    /* alias 里如果是真人名（而不是别名/译名），也要查。
       判据：alias 出现在交付文本里且与 namedRef 不同 ——
       这种情形要么是数据写错了，要么是真名漏在别名位。 */
    if (n && n.length >= 2 && p.namedRef
        && [p.namedRef.zh, p.namedRef.en].indexOf(n) < 0) {
      names.push(n + "（在 alias 位）");
    }
  });
  names.forEach(function (n) {
    var bare = String(n).replace(/（.*$/, "");
    if (bare.length >= 2 && deliverable.indexOf(bare) >= 0) {
      E(w + " 姓名「" + n + "」出现在可交付文本里（light / camera / faces / guard）");
    }
  });
});

/* ---------- 5. 授权与风险 ----------
   没标 = 没评估过。这两条必须显式，连 none 也要写。 */
db.ALBUM.forEach(function (p) {
  if (!p.rights) E(p.num + " 缺 rights 授权档（连 R0 也要显式标）");
  else if (_core.RIGHT_TIERS.filter(function (t) { return t.k === p.rights; }).length === 0) {
    E(p.num + ".rights 非法：" + p.rights);
  }
  if (!p.risk) E(p.num + " 缺 risk 标记（连 none 也要显式标）");
  else if (_core.RISK_KEYS.indexOf(p.risk) < 0) E(p.num + ".risk 非法：" + p.risk);
  if (!p.read) W(p.num + " 没有 read 用法说明（使用者不知道怎么改这一号）");
  if (!p.fact) W(p.num + " 没有 fact 来源说明");

  /* namedRef 的 kind 与 risk 必须对得上。
     原型是类型（kind:"type"）却标成 identity/lookalike，界面会暗示这个号
     指向某个可考据的真人；反过来原型标了真名而 risk 是 none，
     界面上就一个风险标记都不显示 —— 两种都是「界面在说谎」。 */
  if (p.namedRef) {
    var kind = p.namedRef.kind || "person";
    if (kind !== "person" && kind !== "type") {
      E(p.num + ".namedRef.kind 非法：" + kind + "（只能是 person 或 type）");
    } else if (kind === "type" && p.risk !== "none") {
      E(p.num + " 原型是类型（kind: type），risk 却是 " + p.risk
        + " —— 类型不该被标成指向真人");
    } else if (kind === "person" && ["identity", "lookalike"].indexOf(p.risk) < 0) {
      E(p.num + " namedRef 指向真人，risk 却是 " + p.risk
        + " —— 界面上一个风险标记都不会显示");
    }
  }
});

/* ---------- 6. 平台权重语法 ---------- */
var probe = K.compose(db, db.ALBUM[0].num, { themeText: "测试" });
if (!probe.ok) E("首个编号都出不了词，说明引擎或数据没接上");
else {
  if (JSON.stringify(probe.tags.mj) === JSON.stringify(probe.tags.sd)) {
    E("mj 与 sd 输出逐字节相同 —— 平台权重语法判错了，"
      + "照抄到 Midjourney 上会完全失效");
  }
  ["sd", "mj", "flux", "nl", "gpt"].forEach(function (p) {
    if (!Array.isArray(probe.tags[p])) E("平台 " + p + " 没有产出 tags");
  });
  if (!probe.neg.length) E("负面词为空");
}

/* ---------- 6b. 正交两轴（本库的核心不变式） ----------
   两条轴必须真的正交：
   ① 固定编号换任意主题 → 身份层五面必须**逐字相同**。
      这是「画册」的全部意义：记住 041 就是要每次都出同一个人。
      一旦身份层随主题漂移，编号就退化成一张普通标签。
   ② 两张表的编号前缀不同（AL- 与 TH-），归一必须分开。
      共用一个归一函数时 'TH-001' 会被算成 'AL-001'，
      themeOf 返回 null 而不报错 → 主题静默失效 →
      场景面空着 → 症状「场景莫名其妙没了」，病因隔了三层。 */
(function () {
  /* 抽三个不同类目的编号，别只测同一区 ——
     跨类目的面组合更容易暴露问题 */
  var probeNums = ["AL-001", "AL-009", "AL-017", "AL-025", "AL-033", "AL-041"];
  var probeThemes = ["TH-001", "TH-011", "TH-023", "TH-033"];
  probeNums.forEach(function (n) {
    var prints = {};
    probeThemes.forEach(function (t) {
      var r = K.compose(db, n, { themeId: t });
      if (!r.ok) { E(n + " + " + t + " 出词失败：" + r.why); return; }
      prints[t] = r.identity.map(function (f) {
        return r.faces[f] ? r.faces[f].c : "(缺)";
      }).join("§");
      /* 每一种组合都必须有妆造与场景 —— 否则是「看着能出图，
         实际少了一面」，而这种少面在界面上完全看不出来 */
      if (!r.faces.dress) E(n + " + " + t + " 没有妆造面");
      if (!r.faces.scene) E(n + " + " + t + " 没有场景面");
    });
    var uniq = Object.keys(prints).map(function (k) { return prints[k]; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; });
    if (uniq.length > 1) {
      E(n + " 的身份层随主题漂移（" + uniq.length + " 种不同结果）——"
        + "记住编号就失去意义了");
    }
  });
  /* 前缀分离 */
  var a = K.normNum("001"), t = K.normTheme("TH-001");
  if (a === t) E("画册编号与主题编号归一到同一个值：" + a
    + " —— 两张表的前缀必须各自保留");
  if (a !== "AL-001") E("画册编号归一不对：" + a);
  if (t !== "TH-001") E("主题编号归一不对：" + t);
  /* 用户只敲数字时，按调用方各自解释；两个入口不能混淆 */
  if (!K.themeOf("TH-001")) E("themeOf(TH-001) 查不到");
  if (!K.plate("001")) E("plate(001) 查不到 —— 只敲数字时画册号应能命中");
})();

/* ---------- 6c. 产出文本的质量 ----------
   这一组抓的是「出词成功但结果是坏的」。
   最典型的是姓名阻断层**剥错东西**：把条目自己的描述性名字
   （旧戏台 / 米白 / 鹤骨）当真人名剥掉，
   产出「，红幕布两侧垂落」这种以标点开头的残句。
   它能一路通过所有其他检查 —— 出词成功、字段完整、体检全绿 ——
   只有读结果才发现。而自动检查本来就该抓这一类。 */
(function () {
  /* 悬空标点：句首或句尾是逗号顿号分号之类。
     这是「整段被剥掉」留下的唯一痕迹。 */
  var DANGLING = /^[，,、；;：:。.]|[，,、；;：:]$/;
  var all = [];
  db.ALBUM.forEach(function (p) {
    [null, "TH-001", "TH-006", "TH-023"].forEach(function (t) {
      var r = K.compose(db, p.num, { themeId: t });
      if (!r.ok) return;
      /* 正文每一行都要查 —— 残句可能出现在任何一面 */
      r.nl.split("\n").forEach(function (ln, i) {
        if (DANGLING.test(ln.replace(/^【[^】]*】/, ""))) {
          all.push(p.num + (t ? " + " + t : "") + " 第 " + (i + 1) + " 行以标点开头/结尾："
            + ln.slice(0, 40));
        }
      });
      /* 空描述：某一面被剥成空字符串，等于这一面失效 */
      Object.keys(r.faces).forEach(function (f) {
        var x = r.faces[f];
        if (!x || !String(x.c || "").trim()) {
          all.push(p.num + (t ? " + " + t : "") + " 的 " + f + " 面被剥空了");
        }
      });
    });
  });
  if (all.length) {
    E("产出文本有悬空标点或被剥空的面（" + all.length + " 处）：\n    "
      + all.slice(0, 8).join("\n    "));
  }

  /* 反向验证：姓名阻断**仍然有效**。
     只测「没被剥错」不够 —— 万一有人为了修上面那个问题
     把整个 stripNames 关掉，这组断言会全绿而姓名泄漏回归。
     所以造一个带 namedRef 的假条目，验证真名仍被剥掉。 */
  var probe = { namedRef: { zh: "某位真人" } };
  var stripped = K._stripNames("像某位真人那样的侧脸", probe);
  if (stripped.indexOf("某位真人") >= 0) {
    E("姓名阻断失效：namedRef 里的真人名仍出现在交付文本里 —— "
      + "得到「" + stripped + "」");
  }
  /* 同时验证不误伤：没有 namedRef 时一个字都不许动 */
  var keep = K._stripNames("旧戏台，红幕布两侧垂落", { zh: "旧戏台" });
  if (keep !== "旧戏台，红幕布两侧垂落") {
    E("姓名阻断误伤没有 namedRef 的条目：「" + keep + "」"
      + " —— zh 是描述性名字，不该被剥");
  }
})();

/* ---------- 7. 模式与主题 ----------
   RENDER_MODES（data-core 的契约）与 MODES（可执行副本）必须逐条一致。
   为什么两处都写：契约层要能被引擎与界面读到，数据层要能带 neg 与 useWhen。
   而「两份」本身就是隐患 —— 只断言「模式都在」不够，
   还得断言内容一致，否则改了契约忘了改副本，负面词会静默对不上。 */
var modeKinds = {};
db.MODES.forEach(function (m) {
  if (modeKinds[m.k]) E("呈现模式重复：" + m.k);
  modeKinds[m.k] = m;
});
_core.RENDER_MODES.forEach(function (m) {
  var got = modeKinds[m.k];
  if (!got) { E("缺呈现模式：" + m.k); return; }
  /* 语义字段逐条比对。neg 不在这里比 ——
     neg 的唯一定义在 data 层，契约层不持有它（两处都写必然漂）。
     这条断言存在的意义是「不许把 neg 加回契约层」：
     一旦有人为了「方便」把 neg 复制回 RENDER_MODES，
     就会退回两份定义的状态。所以反向检查一下。 */
  if (m.neg) {
    E("呈现模式 " + m.k + " 的 neg 出现在 data-core 的契约层。"
      + "neg 的唯一定义应在 modes.js，契约层不该持有它"
      + "（两份定义必然漂移，体检刚才已经抓到过一次）");
  }
  if (m.useWhen !== got.useWhen) {
    E("呈现模式 " + m.k + " 的 useWhen 两层不一致：\n"
      + "      契约层 " + (m.useWhen || "(空)") + "\n"
      + "      数据层 " + (got.useWhen || "(空)"));
  }
  if (m.zh !== got.zh) {
    E("呈现模式 " + m.k + " 的中文名两层不一致：" + m.zh + " / " + got.zh);
  }
  if (!!m.default !== !!got.isDefault) {
    E("呈现模式 " + m.k + " 的默认标记不一致：契约层 " + !!m.default
      + " / 数据层 " + !!got.isDefault);
  }
});
Object.keys(modeKinds).forEach(function (k) {
  if (!_core.RENDER_MODES.some(function (m) { return m.k === k; })) {
    E("MODES 里有契约层未声明的模式：" + k + "（引擎读到它但不知道它什么意思）");
  }
});
/* 默认模式必须唯一且存在 */
var defaults = db.MODES.filter(function (m) { return m.isDefault; });
if (defaults.length !== 1) E("默认模式必须恰好一个，现在有 " + defaults.length + " 个");
db.THEMES.forEach(function (t) {
  if (!t.num) E("有条主题缺 num");
  if (!t.text && !t.zh) E("主题 " + t.num + " 既无 text 也无 zh");
});

/* ---------- 门类 ----------
   门类轴最容易出的错不是「没有 rewrite」，而是**rewrite 越权**：
   它去改骨相或气质 —— 那两面是「她是谁」，门类一改就是换人了。
   这种错在界面上看不出来（词面照样是一段通顺的话），
   所以必须在体检里挡住。 */
var mKeys = {};
db.MEDIUMS.forEach(function (m) {
  if (!m.k) E("有条门类缺 k");
  mKeys[m.k] = true;
  if (!m.en) E("门类 " + m.k + " 没有 en（媒介词）—— 缺了它就只是一个标签，模型不知道该怎么画");
  if (!m.desc) W("门类 " + m.k + " 没有 desc");
  if (!m.neg || !m.neg.length) {
    W("门类 " + m.k + " 没有 neg —— 门类的负面词负责压掉**另一个门类**的特征，"
      + "缺了它出来就是「画风像照片的动漫人」，两边都不像");
  }
  /* rewrite 只能碰 MEDIUM_RULE.rewritable 里列出的面 */
  Object.keys(m.rewrite || {}).forEach(function (fk) {
    if ((_core.MEDIUM_RULE.rewritable || []).indexOf(fk) < 0) {
      E("门类 " + m.k + " 改写了不允许改的面「" + fk + "」："
        + "门类只改身份层的表达方式，不改她是谁。可改的是 "
        + (_core.MEDIUM_RULE.rewritable || []).join("、"));
    }
    var face = _core.ALBUM_FACES.filter(function (f) { return f.k === fk; })[0];
    if (face && face.group !== "identity") {
      E("门类 " + m.k + " 改写了可变层「" + fk + "」（" + face.zh + "）—— "
        + "可变层是「她穿什么、在哪」，由主题管；门类越权会让主题的覆盖失效");
    }
  });
});
/* 默认门类必须唯一且存在 —— 与默认模式同一条规矩 */
var mdDefault = db.MEDIUMS.filter(function (m) { return m.isDefault; });
if (mdDefault.length !== 1) E("默认门类必须恰好一个，现在有 " + mdDefault.length + " 个");
else if (!mKeys[mdDefault[0].k]) E("默认门类 " + mdDefault[0].k + " 不在门类表里");
/* combo 表里的每一对都必须指向真实存在的门类 ——
   写错一个 key 的后果是那条规则静默失效（查的时候匹配不上）。 */
var combo = (_core.MEDIUM_RULE || {}).combo || {};
["clash", "warn"].forEach(function (lv) {
  (combo[lv] || []).forEach(function (pair) {
    pair.forEach(function (k) {
      if (!mKeys[k]) {
        E("MEDIUM_RULE.combo." + lv + " 里写了不存在的门类「" + k + "」"
          + " —— 这条规则永远不会命中，等于白写");
      }
    });
    /* 不要求写反向。查法（mediumCombo）已经是双向匹配的，
       一条 ["oil","anime"] 同时管 anime+oil 和 oil+anime。
       反过来说，要求人写两遍的话，两遍迟早会只改一遍 ——
       那才是真的引入 bug。所以这里只查 key 存不存在。 */
  });
});

/* ---------- 配图与实测：对拍声明与实况 ----------
   离线页面读不到文件系统，所以「有几张配图」的唯一依据是 test.pic 这个声明。
   而声明可以撒谎：图删了、挪了、改名了，数据里还写着它。
   那种谎话的代价很具体 —— 界面写着「配图 3 张」，点开是空白。
   所以这里必须双向对拍：
     声明有、文件没有 → 错（界面会说谎）
     文件有、没声明   → 警（图在库里躺着但界面不认，命名多半错了）

   命名必须是 examples/<编号>.png —— 与 anime-prompt-library 同一套体例。 */
var EXDIR = path.join(__dirname, "..", "examples");
function picsOnDisk() {
  try {
    return fs.readdirSync(EXDIR)
      .filter(function (f) { return /\.(png|jpg|jpeg)$/i.test(f); })
      .map(function (f) { return f.replace(/\.(png|jpg|jpeg)$/i, ""); });
  } catch (e) { return []; }
}
var onDisk = picsOnDisk();
var declared = db.ALBUM.filter(function (p) { return p.test && p.test.pic; });
declared.forEach(function (p) {
  var want = "examples/" + p.num + ".png";
  if (p.test.pic !== want) {
    E(p.num + " 的 test.pic 必须是 " + want + "，现在是 " + p.test.pic
      + " —— 画廊按「文件名 = 编号」认图，别的名字它认不出来");
  }
  if (onDisk.indexOf(p.num) < 0) {
    E(p.num + " 声明有配图（" + p.test.pic + "）但文件不在 examples/：界面会说「已配图」而点开是空白");
  }
  if (p.test.pic && fs.existsSync(path.join(__dirname, "..", p.test.pic.replace(/\//g, path.sep)))) {
    /* 文件在。test 类信息必须自带模型名，否则「实测」无从谈起。 */
    if (!p.test.model) W(p.num + " 有配图但 test.model 为空 —— 换模型就不成立，却没说在哪个模型上成立");
    if (!(p.test.hit || []).length && !(p.test.miss || []).length) {
      W(p.num + " 有配图但 hit/miss 都空 —— 那张图没有留下任何结论，等于没测");
    }
    /* status 与实测记录必须一致：status:"tested" 的定义就是「跑过并留存结果」，
       反过来有实测记录的却标 written，等于把自己的档位标准往后拖。 */
    if (p.status !== "tested") {
      E(p.num + " 有 test 实测记录但 status 是 " + p.status
        + "；STATUS 里 tested 的定义是「至少在一个模型上跑过并留存结果记录」");
    }
  }
});
/* 孤儿图：文件名不在编号表里。多半是 id 写错或图没入库。 */
onDisk.forEach(function (nm) {
  var hit = db.ALBUM.some(function (p) { return p.num === nm; });
  if (!hit) {
    E("examples/" + nm + ".png 对不上任何编号 —— 画廊按编号认图，这张图界面永远看不到");
  } else if (!(db.ALBUM.filter(function (p) { return p.num === nm; })[0].test || {}).pic) {
    W("examples/" + nm + ".png 在库里，但没有 test.pic 声明：图认得出来，但体检与缺口计数会漏掉它");
  }
});
/* 命名体例：文件名里的编号必须符合三位格式，别放进 AL-1.png 这种 */
onDisk.forEach(function (nm) {
  if (!/^AL-\d{3}$/.test(nm)) {
    E("examples/" + nm + " 的文件名不是三位编号体例（AL-001），画廊与体检都按三位编号对齐");
  }
});

/* ---------- 9. 归类系统性 ----------
   这一组查的不是「字段填没填」，是**归类的编排还在不在**。

   类目表单独声明在 data-core.js（ALBUM_TAXO / THEME_TAXO），
   界面按声明顺序分组。于是「数据是否仍然按声明的编排成块」
   就成了一个必须查的东西 —— 界面读的是声明的顺序，
   而数据是按行序存的，两者一旦脱开，界面就把 049 之后的条目
   摊在一个它以为不存在的类目下，且不报任何错。

   三条：
     ① 类目值必须在册（拼错一个字 = 从所有分组里消失）
     ② 同一类目的编号必须**连续成块**（「相邻编号落在同一气质区」是本库的编排承诺）
     ③ 主题段同样连续成块
   块内条数不写死：block 只用来提示预期，写死会让「补一条进去」直接报错，
   而补条目恰恰是每天都在做的事。不连续才报错，数量变了只提示。 */
(function () {
  var T = _core.ALBUM_TAXO, TT = _core.THEME_TAXO;
  if (!T || !T.kinds || !T.circles) { E("data-core.js 缺 ALBUM_TAXO（kinds/circles）—— 归类真源没了，界面分组顺序会退回「数据首次出现顺序」"); return; }
  if (!TT || !TT.cats) { E("data-core.js 缺 THEME_TAXO.cats"); return; }
  var A = db.ALBUM;

  /* ① 在册 */
  A.forEach(function (p) {
    if (T.kinds.indexOf(p.cat) < 0) {
      E(p.num + " 的 cat「" + p.cat + "」不在 ALBUM_TAXO.kinds 里 —— "
        + "界面按声明顺序分组，它会被接在末尾或直接从分组里消失");
    }
    if (p.region && T.circles.indexOf(p.region) < 0) {
      E(p.num + " 的 region「" + p.region + "」不在 ALBUM_TAXO.circles 里");
    }
    if (p.region && !p.culture) {
      W(p.num + " 有 region 但没有 culture —— 全球段卡面右上角的小标会空着，"
        + "而圈名已经由组标题给了，卡上再给圈名是重复");
    }
  });

  /* ② 连续成块：把连续同值的一段合成一块，块数必须 = 不同取值数。
     块数多于取值数 = 同一个类目断成了两截（中间插进了别的类目）。 */
  function blocks(list, keyFn) {
    var out = [], cur = null;
    list.forEach(function (x) {
      var k = keyFn(x);
      if (!cur || cur.k !== k) { cur = { k: k, list: [] }; out.push(cur); }
      cur.list.push(x);
    });
    return out;
  }
  function uniqOf(list, keyFn) {
    var seen = {}, out = [];
    list.forEach(function (x) {
      var k = keyFn(x);
      if (!seen[k]) { seen[k] = 1; out.push(k); }
    });
    return out;
  }
  function checkBlocks(list, keyFn, declared, what) {
    var bs = blocks(list, keyFn);
    var us = uniqOf(list, keyFn);
    if (bs.length !== us.length) {
      var dup = {};
      bs.forEach(function (b) { dup[b.k] = (dup[b.k] || 0) + 1; });
      Object.keys(dup).filter(function (k) { return dup[k] > 1; }).forEach(function (k) {
        E(what + "「" + k + "」断成了 " + dup[k] + " 块 —— 同类的编号必须连续成块："
          + "「相邻编号落在同一类里」是本库对读者的编排承诺"
          + "（翻到 030 一带就知道自己在找什么），"
          + "断了之后这一段就不再能靠位置认路");
      });
    }
    /* 块的先后 = 声明的先后 */
    var order = bs.map(function (b) { return b.k; });
    var want = declared.filter(function (k) { return order.indexOf(k) >= 0; });
    if (JSON.stringify(order) !== JSON.stringify(want)) {
      E(what + "的段顺序与声明不一致：实际 " + order.join("→") + "，声明 " + want.join("→")
        + " —— 界面按声明顺序画分组标题，数据和它对不上就是归类失序");
    }
    return bs;
  }

  var proto = A.filter(function (p) { return !p.region; });
  var globe = A.filter(function (p) { return p.region; });
  var pb = checkBlocks(proto, function (p) { return p.cat; }, T.kinds, "原型段类目");
  pb.forEach(function (b) {
    if (T.block && b.list.length !== T.block) {
      W("原型段「" + b.k + "」有 " + b.list.length + " 条，类目块预期 " + T.block
        + " 条 —— 补条目是正常的，但段注释里的区间要跟着改");
    }
  });
  var gb = checkBlocks(globe, function (p) { return p.region; }, T.circles, "全球段文化圈");
  gb.forEach(function (b) {
    var cs = uniqOf(b.list, function (p) { return p.culture; });
    if (cs.length !== b.list.length) {
      E("文化圈「" + b.k + "」里有重复的 culture —— 卡面小标重复，扫的时候分不出这两条");
    }
  });
  /* 全球段的 cat 故意与 region 正交，这里**不**要求它成块 ——
     要求成块等于逼人按气质重排全球段，那时「先铺广度」就没法补条目了。
     也不为它发警告：一条永远会触发的警告等于噪声，
     而噪声的代价是让人开始忽略警告本身。
     这条设计写在 plates-c.js 的文件头，不写在体检输出里。 */

  /* ③ 主题段连续成块 */
  checkBlocks(db.THEMES, function (t) { return t.cat; }, TT.cats, "主题类目");
  db.THEMES.forEach(function (t) {
    if (TT.cats.indexOf(t.cat) < 0) {
      E(t.num + " 的 cat「" + t.cat + "」不在 THEME_TAXO.cats 里 —— "
        + "主题分组按声明顺序画标题，它会被挤出分组");
    }
  });

  /* ④ 其余几张分类表同样要「在册」：
     状态档、授权档、风险档都是界面要按档着色的东西，
     写一个表外的值，那条就会拿不到颜色、拿不到文案，
     在界面上表现为「这一条没有档位」而不是「这一条档位写错了」。 */
  var stKeys = (_core.STATUS || []).map(function (s) { return s.k; });
  if (stKeys.length) {
    A.forEach(function (p) {
      if (stKeys.indexOf(p.status) < 0) {
        E(p.num + " 的 status「" + p.status + "」不在 STATUS 里（可选："
          + stKeys.join("、") + "）—— 界面按档出徽章，表外的档拿不到徽章");
      }
    });
  }
})();

/* ---------- 报告 ---------- */
console.log("画册体检 " + (errs.length ? "✗" : "✓") + "  错 " + errs.length + " · 警 " + warns.length);
errs.slice(0, 50).forEach(function (m) { console.log("  ✗ " + m); });
if (errs.length > 50) console.log("  … 另有 " + (errs.length - 50) + " 条");
warns.slice(0, 20).forEach(function (m) { console.log("  ! " + m); });
if (warns.length > 20) console.log("  … 另有 " + (warns.length - 20) + " 条");
process.exit(errs.length ? 1 : 0);