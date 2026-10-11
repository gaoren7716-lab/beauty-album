/* ============================================================
 * gacha.js —— 抽卡引擎
 * ============================================================
 * 抽卡 = 从库存里随机抽一组（编号 × 主题 × 模式），连着铺开若干张。
 *
 * 它不是「同一提示词换 seed」—— 那是同一张图看六遍。
 * 本库的抽卡是**每个轴各抽一条**，所以抽出来的确实是没见过的组合。
 *
 * ------------------------------------------------------------
 * 这一层的核心设计目标只有一个：**库升级时抽卡不用改**。
 * ------------------------------------------------------------
 *
 * 做法是「槽位声明式派生」，不是把轴写死在抽卡代码里：
 *
 *   ① 槽来源 = ALBUMKIT 的三根轴（编号 / 主题 / 模式）。
 *      以后要加第四根轴（比如「画幅」），这里一行都不用动：
 *      候选数、组合空间、界面上那几行全部自动跟上。
 *
 *   ② 不在这三根轴里的维度走 gacha.register()。
 *      库以后多出一层不属于这三样东西时，在这里注册一条即可。
 *
 *   ③ 池规模**每次现算**，不缓存在任何地方。
 *      缓存下来就会在库升级后显示一个旧数字，
 *      而「数字停在旧规模上」看起来完全正常，只是它在说谎。
 *
 * ------------------------------------------------------------
 * 三条不能让步的约定
 * ------------------------------------------------------------
 *
 * 1. **不改全局状态**。抽卡要同时持有多组组合，
 *    把编号写进某个全局变量再读回来会把用户当前的配方冲掉。
 *    compose 一律走纯函数式调用。
 *
 * 2. **候选为 0 的轴必须自报**，不能静默跳过。
 *    少一层约束的提示词照样能出图，只是出的不是你要的东西 ——
 *    这类「不报错、只是效果不对」的失败最难查。
 *    所以 roll() 返回 missing[]，pool() 标 empty。
 *
 * 3. **不做加权、不排除已选**。抽卡的意义是看到没见过的组合；
 *    按「排除当前已选」过滤会在只选了一两项时把范围压得极窄，
 *    抽出来的东西越抽越像，那就失去抽卡的意义了。
 * ============================================================ */

var GACHA = (function () {

  /* 池结构版本。以后槽的语义有破坏性变更时 +1，
     导出的数据里带着它，下游能判断手里的池是老结构还是新结构。 */
  var SCHEMA = 1;

  /* ---------------- 轴的声明 ----------------
     三根内置轴 + 可注册的额外轴。
     每根轴声明：怎么从库里取候选、能不能按类目过滤。 */
  var AXES = [
    { k: "plate", zh: "编号", weight: 3,
      desc: "决定这个人是谁。身份层五面由它定，主题改不了" },
    { k: "theme", zh: "主题", weight: 3,
      desc: "决定画什么。覆盖妆造与场景，不动身份层" },
    { k: "mode", zh: "模式", weight: 0,
      desc: "决定要不要写字。权重 0 = 只在明确要求时才换" }
  ];

  var EXTRA = {};   /* register() 挂这里 */

  function axisList() {
    return AXES.concat(Object.keys(EXTRA).map(function (k) {
      return Object.assign({ custom: true }, EXTRA[k]);
    }));
  }

  function register(def) {
    /* 拒绝覆盖内置轴：内置轴的语义被换掉会让 pool 的计算与实际不符，
       而那不会报错，只会让组合空间的数字对不上。 */
    if (AXES.some(function (a) { return a.k === def.k; })) {
      throw new Error("抽卡轴 " + def.k + " 与内置轴重名，不可覆盖");
    }
    EXTRA[def.k] = def;
    return def;
  }

  /* ---------------- 取候选 ---------------- */
  /* 候选的语义标签。

     为什么抽卡需要它：编号与主题是两根独立的轴，
     独立随机就会抽出「少年感 + 手术室」「堕落 + 婚礼」这类
     语义上打架的组合 —— 提示词照样出得来，图也一样能看，
     但它不是任何人想画的东西。

     **这类失败不报错。** 抽卡不会说「这一组不合理」，
     它只会给你一张奇怪的结果图，而用户多半以为是自己主题选得怪。
     所以在候选上标注语义维度，让 filterBy 能在抽之前挡掉。

     ageHint 用年龄观感而不是实岁：编号描述的是「看起来多大」，
     主题需要的是「配什么年龄合适」。一个偏少年感的编号
     配一场职场戏会很怪，这不是数据错误，是配对不成立。 */
  var AGE_TONE = ["childish", "young", "adult", "mature"];
  var MOODS = ["bright", "dark", "calm", "intense", "soft", "cold"];

  function candidates(db, axisK) {
    if (axisK === "plate") {
      return (db.ALBUM || []).map(function (p) {
        return { id: p.num, zh: p.zh, cat: p.cat,
                 rights: p.rights, risk: p.risk,
                 age: ageHintOf(p), mood: moodOf(p) };
      });
    }
    if (axisK === "theme") {
      return (db.THEMES || []).map(function (t) {
        return { id: t.num, zh: t.zh, cat: t.cat,
                 age: THEME_AGE[t.cat] || "adult",
                 mood: THEME_MOOD[t.cat] || "calm" };
      });
    }
    if (axisK === "mode") {
      return (db.MODES || []).map(function (m) {
        return { id: m.k, zh: m.zh, cat: m.k };
      });
    }
    var ex = EXTRA[axisK];
    if (!ex) return [];
    return ex.pick(db) || [];
  }

  /* 池：每根轴的候选与组合空间。
     组合空间**现算**，不缓存。 */
  function pool(db, opt) {
    opt = opt || {};
    var axes = axisList(), out = { axes: [], space: 1, missing: [], empty: [] };
    axes.forEach(function (a) {
      /* 权重 0 的轴不进「可随机」的候选，但**必须在池里**。
         早先把它整个排除出池，结果 mode 根本没进 picked ——
         而 rollMany 的结果里没有 mode，界面显示不出「纯图还是图文」，
         用户就不知道能不能写字。
         正确做法：池里保留它（算进组合空间，因为用户确实能选），
         但 roll 时保持默认模式，除非 forceMode。
         「可随机」与「存在于池」是两件事，不能用 weight 一个字段管。 */
      if (a.weight === 0 && opt.excludeOptional) return;
      var cands = candidates(db, a.k);
      if (!cands.length) {
        out.empty.push({ axis: a.k, zh: a.zh });
        return;
      }
      if (opt.cats && opt.cats[a.k]) {
        var want = opt.cats[a.k];
        var before = cands.length;
        cands = cands.filter(function (c) { return want.indexOf(c.cat) >= 0; });
        /* 过滤后空了要自报 —— 静默给空池的话，
           抽卡会安静地什么都不抽，用户以为功能坏了 */
        if (!cands.length) {
          out.empty.push({ axis: a.k, zh: a.zh, reason: "按类目过滤后为空",
                           filteredBy: want, before: before });
          return;
        }
      }
      out.axes.push({ axis: a.k, zh: a.zh, weight: a.weight,
                      desc: a.desc, n: cands.length, cands: cands });
      out.space *= cands.length;
    });
    return out;
  }

  /* ---------------- 抽 ----------------
     seed 可选：给同一个 seed 抽出的组合必须完全一样。
     为什么需要：抽卡结果会被分享（「按这组抽的」），
     不可复现就等于没法交流。 */
  function roll(db, opt) {
    opt = opt || {};
    var p = pool(db, opt);
    if (!p.axes.length) {
      return { ok: false, why: "没有任何可抽的轴", empty: p.empty, missing: p.missing };
    }
    var seed = opt.seed == null ? Math.floor(Math.random() * 1e9) : opt.seed;
    var rnd = mulberry(seed);
    var picked = {}, missing = [];

    /* 权重 0 的轴（模式）保持默认，除非显式要求换。
       它不进随机轴，但要留在 picked 里 —— 否则界面显示不出
       「这组是纯图还是图文」，用户就不知道能不能写字。 */
    var themeAxis = null, plateAxis = null;
    p.axes.forEach(function (a) {
      if (a.weight === 0) return;
      if (a.axis === "theme") themeAxis = a;
      if (a.axis === "plate") plateAxis = a;
    });

    picked.plate = plateAxis ? pickOne(plateAxis.cands, rnd()) : null;
    if (!picked.plate) missing.push({ axis: "plate", zh: "编号" });

    /* 再抽主题，按语义兼容筛掉不合适的。

       为什么不是两根轴各自抽完再检查：那样「抽到不兼容」
       只能整组作废重来，用户点一次抽卡可能连抽十几次都拿不到结果。
       宁可这一抽不完美，也不要让人以为功能坏了。

       「全部不兼容」时不硬拦也不硬换，报出来让使用者判断 ——
       偷偷换一个人等于违背「抽到什么是抽到什么」。 */
    var rejected = [];
    if (themeAxis) {
      var tCands = themeAxis.cands;
      /* opt.semanticOff 让使用者明确要「完全随机」时能关掉护栏 */
      if (picked.plate && !opt.semanticOff) {
        var okList = tCands.filter(function (t) {
          return compatible(picked.plate, t);
        });
        if (okList.length) {
          rejected = tCands.filter(function (t) {
            return okList.indexOf(t) < 0
              && clashReason(picked.plate, t);
          });
          tCands = okList;
        }
      }
      picked.theme = pickOne(tCands, rnd());
      if (!picked.theme) missing.push({ axis: "theme", zh: "主题" });
    }

    /* 其余轴 */
    p.axes.forEach(function (a) {
      if (a.axis === "plate" || a.axis === "theme") return;
      if (a.weight === 0) {
        if (opt.forceMode) {
          picked[a.axis] = pickOne(a.cands, rnd());
        } else {
          var def = (db.MODES || []).filter(function (m) { return m.isDefault; })[0];
          picked[a.axis] = def || a.cands[0];
        }
        return;
      }
      picked[a.axis] = pickOne(a.cands, rnd());
      if (!picked[a.axis]) missing.push({ axis: a.axis, zh: a.zh });
    });

    return {
      ok: true, seed: seed, picked: picked, missing: missing,
      poolSize: p.axes.length, space: p.space, empty: p.empty,
      /* 被语义护栏挡掉的候选数。必须给出来：
         「7680 种组合」听起来很多，但实际可抽的受语义约束，
         只报总数会让人以为抽卡空间比实际大得多。 */
      semanticBlocked: rejected.length,
      semanticOff: !!opt.semanticOff,
      /* 直接出词：抽到什么就直接能贴进模型 */
      result: opt.dryRun ? null : db.KIT.compose(db, picked.plate.id, {
        themeId: picked.theme ? picked.theme.id : null,
        mode: picked.mode ? picked.mode.id : "plain"
      })
    };
  }

  /* 从编号的 cat 与 read 推断年龄观感与情绪基调。
     为什么用推断而不是数据字段：给每条编号再加两个字段，
     就要维护 48 × 2 个值，且改一条就得同步改三处。
     而 cat 已经是必填的分类，从它映射一个默认值，
     再让 read / guard 做例外覆盖，比新增字段更省事也更不容易漏。 */
  var CAT_AGE = {
    "少年感": "young", "冷调锐利": "adult", "暖调柔和": "young",
    "中性硬朗": "adult", "明艳": "adult", "古典": "adult"
  };
  var CAT_MOOD = {
    "少年感": "soft", "冷调锐利": "cold", "暖调柔和": "soft",
    "中性硬朗": "calm", "明艳": "bright", "古典": "calm"
  };
  /* guard 里出现这些词说明这一号带负面气质，mood 要压成 dark */
  var DARK_GUARD = /堕落|疲惫|颓废|伤/;

  function ageHintOf(p) {
    if (p.age) return p.age;
    var base = CAT_AGE[p.cat] || "adult";
    /* guard 里有年龄保护类的词，强制压到最年轻一档 */
    if ((p.guard || []).some(function (g) { return /性感|暴露|未成年/.test(g); })) {
      return "childish";
    }
    return base;
  }
  function moodOf(p) {
    if (p.mood) return p.mood;
    var base = CAT_MOOD[p.cat] || "calm";
    if (DARK_GUARD.test(p.zh + (p.read || ""))) return "dark";
    return base;
  }

  /* 主题的年龄适配与情绪倾向。
     age 是「这个场景适合什么年龄观感的人」，
     mood 是「这个主题的情绪底色」。 */
  var THEME_AGE = {
    "都市日常": "young", "文艺古典": "adult", "自然户外": "young",
    "职场身份": "adult", "幻想设定": "adult", "节庆与仪式": "young",
    "抽象概念": "adult", "商品概念": "adult"
  };
  var THEME_MOOD = {
    "都市日常": "calm", "文艺古典": "calm", "自然户外": "bright",
    "职场身份": "intense", "幻想设定": "intense", "节庆与仪式": "bright",
    "抽象概念": "cold", "商品概念": "calm"
  };

  /* 语义兼容性判定。

     第一版用「推断出的 age 档位差 >= 2 就挡」，
     实测**一条都没挡住** —— 因为所有类目都被推断成 young 或 adult，
     档位差最多是 1。护栏看着在，实际上是空的。
     教训：判据必须落在**真实的语义差异**上，而不是我推断出来的数值。

     所以改成按类目对判：哪两个类目天然打架，就直接列出来。
     这比「推断 → 比大小 → 猜」可靠得多 ——
     推断是我编的映射，类目冲突是内容里本来就有的事实。

     规则刻意保守：只挡**确实荒谬**的组合。
     判据太严会让抽卡退化成「只能抽到安全组合」，
     那和没抽卡一样 —— 抽卡的意义就是看到没见过的搭配。 */
  var CAT_CLASH = {
    /* 少年观感的编号进不了成人职场场景：不是「不好」，
       是观感本身冲突 —— 一个看着十四五岁的人做主刀或出庭，
       无论画面多合理，读者第一反应都是「不对」。 */
    "少年感": ["职场身份"],
    /* 古典装束进不了赛博与现代职场：题材的时代性是硬约束，
       东古典发髻配义体接口，观感上会直接崩。 */
    "古典": ["幻想设定", "都市日常", "职场身份"],
    /* 高度现代/科幻的编号进不了古装与现代职场 */
    "明艳": ["文艺古典"]
  };

  function compatible(plate, theme) {
    if (!plate || !theme) return true;
    var bad = CAT_CLASH[plate.cat];
    if (bad && bad.indexOf(theme.cat) >= 0) return false;
    return true;
  }

  /* 冲突表要给使用者看 —— 一条不解释的抽卡结果
     只会让人以为是随机噪声，而它其实是规则。 */
  function clashReason(plate, theme) {
    if (!plate || !theme) return "";
    var bad = CAT_CLASH[plate.cat];
    if (bad && bad.indexOf(theme.cat) >= 0) {
      return plate.cat + " × " + theme.cat + " 观感冲突";
    }
    return "";
  }

  function filterBy(db, opt) {
    if (!opt.filterBy || !opt.filterBy.length) return null;
    return opt.filterBy;
  }

  function pickOne(cands, r) {
    if (!cands || !cands.length) return null;
    return cands[Math.floor(r * cands.length) % cands.length];
  }

  /* mulberry32：小而稳的可种子随机数。
     为什么不用 Math.random：不可复现，
     而「按这组抽的」这种分享方式是抽卡的核心价值之一。 */
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 连抽一组：铺开成系列。
     为什么要连抽而不是抽一次：抽卡的价值在于「看到没见过的组合」，
     一次一张看不出多样性。默认给 6 张。 */
  function rollMany(db, n, opt) {
    opt = opt || {};
    n = n || 6;
    var out = [], used = {}, seed = opt.seed == null
      ? Math.floor(Math.random() * 1e9) : opt.seed;
    for (var i = 0; i < n; i++) {
      var o = Object.assign({}, opt, { seed: seed + i });
      var r = roll(db, o);
      if (!r.ok) return { ok: false, why: r.why, empty: r.empty };
      /* 尽量避开与前面完全重复的组合。
         不是硬保证（池小的时候可能重复），所以重复数要报出来，
         让界面能提示「池子太小了」而不是假装每次都不一样。 */
      var key = r.picked.plate.id + "/" + (r.picked.theme ? r.picked.theme.id : "-");
      if (used[key]) r.dup = true;
      used[key] = (used[key] || 0) + 1;
      r.index = i;
      r.seed = o.seed;
      out.push(r);
    }
    var dups = out.filter(function (r) { return r.dup; }).length;
    return {
      ok: true, rolls: out, baseSeed: seed, total: n, dups: dups,
      /* 重复率高 = 池子太小，这个信息必须给出去。
         静默返回一堆重复项会让用户以为抽卡没生效。 */
      dupRate: n > 1 ? dups / n : 0
    };
  }

  /* 固定编号换全部主题 —— 画册最常见的用法：
     「这一号我要出一组图」。 */
  function sweep(db, num, opt) {
    opt = opt || {};
    var themes = (db.THEMES || []).filter(function (t) {
      return !opt.cats || opt.cats.indexOf(t.cat) >= 0;
    });
    return db.KIT.series(db, num, themes.map(function (t) { return t.num; }),
      { mode: opt.mode || "plain" });
  }

  return {
    SCHEMA: SCHEMA,
    AXES: AXES,
    register: register,
    axisList: axisList,
    compatible: compatible,
    clashReason: clashReason,
    CAT_CLASH: CAT_CLASH,
    pool: pool,
    roll: roll,
    rollMany: rollMany,
    sweep: sweep,
    mulberry: mulberry
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { GACHA: GACHA };
}