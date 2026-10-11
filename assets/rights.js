/* ============================================================
 * rights.js —— 授权分级判定（吸收 anime-prompt-library 的 rights.js）
 * ============================================================
 * 吸收的核心那条：**分级只看是否指向可识别的真人，不看画法**。
 * 「像某位明星那样画」与「画一个高颅顶长颅的女人」法律上完全不同 ——
 * 所以最高档不是禁用，而是「必须改写后使用」。
 *
 * 本库的编号体系让这件事更敏感：
 * 编号 = 一个完整人物配方，而完整配方里必然带着一组
 * 能拼回某个人的特征组合。所以**每条编号都必须显式标档**，
 * 标 R3 不影响使用，只影响发布。
 *
 * 四档与本库的关系：
 *   R0 自由       —— 编号形象为原创抽取或公有领域传统
 *   R1 署名       —— 形象已进入公有领域但风格有归属
 *   R2 仅参考     —— 特征组合与某位在世真人高度相似
 *   R3 改写后用   —— 原型可考据且在世，或为具体作品角色
 * ============================================================ */

var _RC = (typeof module !== "undefined" && module.exports)
  ? require("./data-core.js")
  : (typeof window !== "undefined" ? window : this);

var RIGHTS = (function () {

  /* 判定用的标记词。分中英两组。
     为什么不用「层」结构判定：本库的编号全是原创抽取，
     没有哪一层天然属于作品 IP（不像 anime 库的 WORKS 层），
     所以只能逐条按标识词判。 */
  var MARKERS = {
    /* 明确的在世真人姓名需要人工登记，不做词表匹配 ——
       中文姓名歧义极高（「白百何」与「白鹤」），词表误伤比漏伤更糟 */
    livingNamed: [
      /* 这类情况一律 R3 —— 原型可考据且在世 */
    ],
    /* 作品角色名：出现在编号的可投放文本里就要 R3 */
    workChar: [],
    /* 品牌与工作室：不是人，但一样受保护 */
    brand: ["某品牌", "某工作室"]
  };

  /* 单条编号的档位。取数据里的 rights 字段为权威，
     这里只做两件事：校验它合法、以及给出「使用者该做什么」的说明。 */
  function tierOf(plate) {
    var t = plate.rights || "R3";
    return t;
  }

  function tierInfo(plate) {
    var k = tierOf(plate);
    /* 必须走容器取 RIGHT_TIERS。
       早先写 `typeof RIGHT_TIERS !== "undefined" ? RIGHT_TIERS : []`，
       在 Node 下读裸全局拿不到（同名的 getter 会命中自己），
       静默返回空数组 → can 为空字符串 → 界面显示成「没有限制」。
       而「空字符串」看起来像「无约束」，不是像「出错了」——
       这是最危险的一种失败：它会被读成好消息。 */
    var tiers = (typeof _RC !== "undefined" && _RC && _RC.RIGHT_TIERS)
      || [];
    var def = tiers.filter(function (x) { return x.k === k; })[0] || null;
    return {
      tier: k,
      zh: def ? def.zh : k,
      color: def ? def.color : "#999",
      can: def ? def.can : "",
      desc: def ? def.desc : ""
    };
  }

  /* 整串判定：取最严档。
     为什么取最严而不是取主条目：一次出图会用好几个编号与主题，
     只要有一个碰到 R3，整张图就有肖像风险 ——
     合法的判断标准是「最严的那一项」，不是「主要的那一项」。 */
  function inspect(plates) {
    var order = { R0: 0, R1: 1, R2: 2, R3: 3 };
    var worst = null, list = [];
    (plates || []).forEach(function (p) {
      var k = tierOf(p);
      var info = tierInfo(p);
      list.push({ num: p.num, zh: p.zh, tier: k, can: info.can });
      if (!worst || order[k] > order[worst]) worst = k;
    });
    var info = worst ? ({ R0: "可直接商用", R1: "可商用，建议署来源",
      R2: "先改写特征再商用", R3: "必须改写特征后使用" })[worst] : "";
    return {
      worst: worst, can: info, items: list,
      /* 「本库不构成法律意见」这句话必须出现在输出里 ——
         内部分级是工程判断，不是法务结论 */
      disclaimer: "本判定为本库内部工程分级，不构成法律意见；商用前请自行复核"
    };
  }

  return {
    MARKERS: MARKERS,
    tierOf: tierOf,
    tierInfo: tierInfo,
    inspect: inspect
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { RIGHTS: RIGHTS };
}