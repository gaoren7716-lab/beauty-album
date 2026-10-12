/* ============================================================
 * plates-a.js —— 画册条目 AL-001 ~ AL-024
 * ============================================================
 * 一个编号 = 一个完整可复现的人物配方。
 *
 * **编号不是数据库主键，是给记忆用的。** 用户记不住「冷调白皙 +
 * 深眼窝 + 长颈 + 直角肩」，但记得住 041。所以：
 *   - 编号三位，能敲、能念、能扫一眼画册就选中
 *   - 编号一旦发布永不改（改了等于让用户手里的「041」失效）
 *   - 新增只往后追加，不重排
 *
 * 每条的必备内容：
 *   faces.identity 五面（bone/skin/eye/form/aura）—— 这个人是谁，恒定
 *   faces.mutable  两面（hair/dress）    —— 可被主题覆盖，默认保留
 *   light / camera   —— 纯画法，不随编号也不随主题
 *   rights / risk    —— 授权档与风险，必须显式标（连 none 也要标）
 *
 * 编号编排的考虑：001-008 放「冷调锐利」，009-016「暖调柔和」，
 * 017-024「中性硬朗」—— 让相邻编号落在同一气质区，
 * 用户翻到 020 一带就知道自己在找什么。
 * ============================================================ */
if (typeof module !== "undefined" && module.exports) {
  var _A = require("./data-core.js");
  var ALBUM = _A.ALBUM;
}

ALBUM.push(
/* ============ 001–008 · 冷调锐利 ============ */
{ num:"AL-001", cat:"冷调锐利", status:"tested",
  zh:"霜白刀刃", en:"frostblade",
  /* kind:"type" 不能省：这一条的原型是「群像类型」，不是某个人。
     界面按 kind 决定标签 —— 标成「真名」的话，看到的人会以为
     这个编号指向一位可考据的真人，而它恰恰不是。
     字段本身不进提示词（只取 zh/en/alias 去剥，kind 不参与）。 */
  namedRef:{ zh:"（群像类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"单侧硬光从侧上方切入，暗部压到接近纯黑，颧骨与鼻梁各留一道锐利高光",
  camera:"中长焦 85mm，三分之二侧身，特写景别，背景完全虚化",
  faces:{
    bone:{ t:"high cheekbones, tapered jaw, high cranial vault",
      c:"颅顶饱满偏高，颧骨位置高且外扩，下颌角内收成锐角，下巴尖而前突" },
    skin:{ t:"cool pale translucent skin",
      c:"冷调白皙，肤面次表面散射明显，几乎无油光，毛孔细小但存在" },
    eye:{ t:"deep set sharp eyes, off camera gaze",
      c:"深眼窝，眉骨在眼上方投下阴影，眼型细长上扬，瞳色深棕，视线偏向镜头外" },
    form:{ t:"square shoulders, long neck, defined collarbones",
      c:"肩线平直且宽厚，颈部拉长，锁骨横向清晰，四肢修长" },
    aura:{ t:"cold, restrained, unapproachable",
      c:"表情克制，目光疏离，嘴唇紧闭，通身冷感不外露" },
    hair:{ t:"dark straight hair, high tied",
      c:"黑色直发，长度到腰，在头顶高处扎起，鬓角干净无碎发" },
    dress:{ t:"black minimal tailoring",
      c:"全黑单色剪裁，无领无饰，线条笔直" }
  },
  read:"这一号的骨干是「削」—— 所有面都往锐利走。"
    + "换主题时别给它加圆润的东西（毛绒、蕾丝、卷发），会立刻打架。",
  fact:["形象为原创抽取，不指向任何可识别真人"],
  /* test 类：换模型就不成立，所以写清楚「在哪个模型上」。
     这条实测推翻了一个想当然的假设 —— 原以为纯图模式的负面词
     （第一条就是「水印」）能压住水印，实际那个模型不执行。
     结论已同步进 gallery-naming.md 与 README。 */
  test:{ model:"GPT 图像（ImageGen 后端）", theme:"TH-001", mode:"plain",
    pic:"examples/AL-001.png", size:"1024x1536",
    hit:["颅顶与颧骨结构对得上","发到腰的高马尾成立","单侧硬光与近纯黑暗部成立",
         "车窗倒影成立","人群虚化成立"],
    miss:["右下角强制「AI生成」水印 —— prompt 显式写 no watermark 仍不去",
          "dress 面（黑色单色剪裁）被 TH-001 的米色风衣覆盖，未在本图验证"],
    note:"负面词不是承诺，只在支持 negative 的模型上成立" } },

{ num:"AL-002", cat:"冷调锐利", status:"written",
  zh:"静水", en:"stillwater",
  rights:"R0", risk:"none",
  light:"大面积柔光从正面偏上打来，阴影边缘柔和，明暗过渡极缓",
  camera:"中长焦 85mm，正面平视，胸部以上特写",
  faces:{
    bone:{ t:"oval face, soft jaw, narrow chin",
      c:"卵形脸，颧骨不高，下颌线柔和不显角，下巴窄而圆转" },
    skin:{ t:"cool fair skin, matte",
      c:"冷调白皙，肤面哑光，反光极弱，质地均匀" },
    eye:{ t:"narrow eyes, direct steady gaze",
      c:"眼型偏窄，眼距中等，眼神直视镜头且稳定，不游移不闪烁" },
    form:{ t:"slim frame, soft shoulders",
      c:"身量纤细，肩线柔和，四肢修长，颈部偏细" },
    aura:{ t:"calm, unreadable, quiet",
      c:"表情平静到近乎空白，目光停住不动，气质安静不主动" },
    hair:{ t:"black bob, blunt bangs",
      c:"黑色直发齐刘海，长度到下颌线，发型边缘齐整" },
    dress:{ t:"plain grey knit",
      c:"素色针织上衣，无图案无装饰，领口规整" }
  },
  read:"这一号是「不攻击」的方向：所有面都收着。"
    + "想出有冲突感的图，用它当基底再加锐利的面，比反过来容易。",
  fact:["形象为原创抽取"],
  /* 配图已入库（examples/AL-002.png），但出图模型当时没留档。
     标「待核实」：图认得出来、缺口计数算它，但绝不谎称已实测
     （status 仍是 written，不进 tested 档）。等确认模型名再补 hit/miss。 */
  test:{ model:"待核实", pic:"examples/AL-002.png" } },

{ num:"AL-003", cat:"冷调锐利", status:"written",
  zh:"鹤骨", en:"crane",
  rights:"R0", risk:"none",
  light:"顶光偏侧，细长高光落在颧骨与鼻梁，颈部下方有明显阴影",
  camera:"全身或七分身，站姿，镜头略低于视线仰视",
  faces:{
    bone:{ t:"long narrow face, hollow cheeks",
      c:"脸型狭长，颊部略凹，颧骨突出，下颌窄而长" },
    skin:{ t:"pale skin, slight sheen",
      c:"肤色浅，肤面有轻微自然油光，颈侧与锁骨处反光更明显" },
    eye:{ t:"long narrow eyes, downturned",
      c:"眼型细长且下垂，眼尾略垂，眼神略向下" },
    form:{ t:"very tall slender frame",
      c:"身量高挑，明显长于常规比例，四肢极长，颈部与肩线形成锐角" },
    aura:{ t:"aloof, distant, elegant",
      c:"神情疏离，肩背挺直，目光略微俯视，带距离感" },
    hair:{ t:"long black hair, straight",
      c:"黑色长直发，无卷，长度及腰" },
    dress:{ t:"long dark robe",
      c:"深色长袍或长款外套，剪裁垂直向下，无腰线设计" }
  },
  read:"「鹤骨」靠比例不靠五官。想加强它，加形体面而不是加骨相面 —— "
    + "换骨相会让这张脸跑掉，加比例只会让它更鹤。",
  fact:["形象为原创抽取"],
  /* 配图已入库（examples/AL-003.png），出图模型未留档。
     同 AL-002：标「待核实」，status 保持 written，不谎称已实测。 */
  test:{ model:"待核实", pic:"examples/AL-003.png" } },

{ num:"AL-004", cat:"冷调锐利", status:"written",
  zh:"夜行", en:"nightwalker",
  rights:"R0", risk:"none",
  light:"极暗环境，只有单一远处光源，人物大半轮廓沉在暗部，边缘有一道冷光",
  camera:"中焦 35mm，环境占比大，人物在画面偏侧位置",
  faces:{
    bone:{ t:"sharp jaw, angular face",
      c:"面部棱角分明，下颌线清晰锐利，骨相偏硬朗" },
    skin:{ t:"pale skin, cool ambient",
      c:"肤色浅，在冷色环境光下整体偏青灰" },
    eye:{ t:"wide alert eyes, catchlight",
      c:"眼型偏大，瞳孔里有一点反光，眼神警觉而专注" },
    form:{ t:"lean frame, low stance",
      c:"身形精瘦，站姿重心偏低，肩线略前倾" },
    aura:{ t:"alert, guarded, quiet tension",
      c:"神情紧绷但不外露，目光快速扫向一侧，气质有压抑的紧张感" },
    hair:{ t:"messy short hair",
      c:"深色短发，略微凌乱，额前有碎发垂落" },
    dress:{ t:"dark hooded coat",
      c:"深色带帽外套，帽子半立起，领口竖起遮住部分下颌" }
  },
  read:"这一号靠「暗」成立。给它强光会把氛围打散 —— "
    + "要用亮光时优先换 light 面而不是删掉它。",
  fact:["形象为原创抽取"] },

{ num:"AL-005", cat:"冷调锐利", status:"written",
  zh:"刀背", en:"bladeback",
  rights:"R0", risk:"none",
  light:"硬侧光勾出鼻梁与颧骨的明确分界，明暗交界线极清晰无过渡",
  camera:"85mm 特写，仅面部与肩颈入画",
  faces:{
    bone:{ t:"prominent bone structure, wide forehead",
      c:"额部宽阔饱满，眉骨明显，颧骨与下颌都清晰可辨" },
    skin:{ t:"even cool skin",
      c:"肤色冷而均匀，肤面平滑，几乎无可见瑕疵" },
    eye:{ t:"steady unblinking gaze",
      c:"目光固定不移，眼裂略窄，睫毛不夸张" },
    form:{ t:"strong square shoulders",
      c:"肩线平直宽厚，颈短而有力量感" },
    aura:{ t:"stern, unwavering",
      c:"神情严肃，目光不移不避，通身没有多余动作" },
    hair:{ t:"short cropped hair",
      c:"深色短发，发长不过耳，发际线清晰" },
    dress:{ t:"structured dark garment",
      c:"结构感强的深色上衣，肩线有支撑，剪裁硬" }
  },
  read:"这一号的强度来自「不动」。给它加表情会立刻变弱。",
  fact:["形象为原创抽取"] },

{ num:"AL-006", cat:"冷调锐利", status:"written",
  zh:"霜白新娘", en:"frostbride",
  rights:"R0", risk:"none",
  light:"高调柔光加背后轮廓光，整体明亮，肤色保持冷白不过曝",
  camera:"50mm，中景，正面站姿",
  faces:{
    bone:{ t:"fine sharp jawline, narrow face",
      c:"脸型窄，下颌线细锐，颧骨微露" },
    skin:{ t:"very fair cool skin",
      c:"肤色极浅偏冷，肤面细腻通透" },
    eye:{ t:"downcast eyes",
      c:"眼型细长，眼神下垂看向下方，睫毛自然下垂" },
    form:{ t:"slender frame, straight posture",
      c:"身量纤细，姿态笔直，肩线平" },
    aura:{ t:"serene, wistful, distant",
      c:"神情安静略带怅然，目光下垂，气质柔和而疏离" },
    hair:{ t:"pale ash hair, loose waves",
      c:"灰白色长发，松散大波浪，发量薄" },
    dress:{ t:"white minimal gown",
      c:"白色简约长裙，剪裁干净，无蕾丝无亮片" }
  },
  read:"这一号是唯一「冷 + 柔」的组合，"
    + "所以它对主题特别挑：冷硬主题（如机械、末世）配它会显得假。",
  fact:["形象为原创抽取"] },

{ num:"AL-007", cat:"冷调锐利", status:"written",
  zh:"深水", en:"deepwater",
  rights:"R0", risk:"none",
  light:"水下散射光，整体偏青蓝，明暗对比低，边缘有轻微光晕",
  camera:"50mm，水下视角，半身",
  faces:{
    bone:{ t:"soft oval face, full lower face",
      c:"卵形偏方，下半脸略宽，颧骨不明显" },
    skin:{ t:"cool wet-look skin",
      c:"肤色冷白偏青，肤面有水光反光，像出浴或沾水" },
    eye:{ t:"large quiet eyes",
      c:"眼型偏大，眼神安静，深色虹膜，睫毛分明" },
    form:{ t:"soft curved form",
      c:"身体曲线柔和，肩线圆润，四肢比例正常偏纤细" },
    aura:{ t:"submerged, dreamy, distant",
      c:"神情恍惚，目光失焦，气质像在想着别处" },
    hair:{ t:"wet dark hair",
      c:"深色头发湿贴，贴合头型，成束垂落" },
    dress:{ t:"pale wet fabric",
      c:"浅色织物，湿润贴身，能看出轮廓但不刻意" }
  },
  read:"这一号的核心是「水感」。换主题时如果换成干燥明亮的场景，"
    + "湿发与水光就成了错误信息。",
  fact:["形象为原创抽取"] },

{ num:"AL-008", cat:"冷调锐利", status:"written",
  zh:"铁灰", en:"irongrey",
  rights:"R0", risk:"none",
  light:"阴天散射光，无明确方向，暗部浅，明暗差极小",
  camera:"35mm，环境人像，人物占画面一半",
  faces:{
    bone:{ t:"average bone structure",
      c:"骨相端正无突出特征，颧骨与下颌都不显眼" },
    skin:{ t:"neutral skin, matte",
      c:"肤色中性偏冷，肤面哑光，质感偏平" },
    eye:{ t:"regular eyes, neutral gaze",
      c:"眼型规整，眼神平视，不特别上扬或下垂" },
    form:{ t:"regular frame, average build",
      c:"身形中等偏瘦，比例正常，肩线平" },
    aura:{ t:"plain, unremarkable, present",
      c:"表情平淡，气质中性，不刻意也不回避镜头" },
    hair:{ t:"straight dark hair",
      c:"深色直发，长度到肩，质顺" },
    dress:{ t:"everyday muted clothing",
      c:"低饱和日常穿着，无图案，无明显风格倾向" }
  },
  read:"这一号是「底板」—— 几乎没有特征。"
    + "它的用途是当基底往上叠别的面，而不是单独出图。",
  fact:["形象为原创抽取"] },

/* ============ 009–016 · 暖调柔和 ============ */
{ num:"AL-009", cat:"暖调柔和", status:"written",
  zh:"蜜色圆光", en:"honeyround",
  rights:"R0", risk:"none",
  light:"暖色柔光从斜上方来，明暗过渡柔和，肤面反射暖调",
  camera:"50mm，胸部以上特写，微微仰视",
  faces:{
    bone:{ t:"rounded face, soft jaw",
      c:"脸型圆润饱满，颧骨柔和，下颌圆润不显角" },
    skin:{ t:"warm tan skin, luminous",
      c:"暖调蜜色，中等明度，肤面有健康光泽与自然油光" },
    eye:{ t:"large round eyes",
      c:"眼型圆，虹膜占比大，眼距略宽，眼神明亮" },
    form:{ t:"soft curved form, fuller figure",
      c:"身体曲线柔和饱满，肩线圆润，腰线明显" },
    aura:{ t:"warm, open, approachable",
      c:"表情柔和，目光直接而亲近，气质温暖不设防" },
    hair:{ t:"thick dark wavy hair",
      c:"深色浓密卷发，波浪明显，发量厚" },
    dress:{ t:"warm earth toned clothing",
      c:"暖调大地色系衣物，棉麻质感，无图案" }
  },
  read:"这一号靠「暖」与「圆」两条线成立。"
    + "不要加冷调配件（银饰、冷色发），会直接破坏整体。",
  fact:["形象为原创抽取"] },

{ num:"AL-010", cat:"暖调柔和", status:"written",
  zh:"麦田", en:"wheatfield",
  rights:"R0", risk:"none",
  light:"黄金时刻逆光，发丝边缘被光勾亮，整体偏暖黄",
  camera:"35mm，环境人像，人物在田边，背景虚化但保留色块",
  faces:{
    bone:{ t:"soft oval face",
      c:"卵形偏柔，颧骨不高，下颌线不锐" },
    skin:{ t:"sun tanned warm skin",
      c:"肤色偏深带黄，颊部有晒后的红润，肤面有光" },
    eye:{ t:"soft almond eyes",
      c:"眼型柔和近杏，眼尾略下垂，眼神温和" },
    form:{ t:"natural healthy form",
      c:"身形自然健康，不纤瘦也不丰满，动作舒展" },
    aura:{ t:"easygoing, sunlit, free",
      c:"表情放松，目光略带笑意，气质明朗开阔" },
    hair:{ t:"long sun-lit brown hair",
      c:"棕褐色长发，被阳光照亮，发丝透光" },
    dress:{ t:"light linen dress",
      c:"浅色亚麻连衣裙，质地松软，裙摆自然" }
  },
  read:"这一号的强度靠光不靠脸。"
    + "如果只取编号不看 light，出图会明显比预期平淡 —— "
    + "这号的光照条件是它的一半。",
  fact:["形象为原创抽取"] },

{ num:"AL-011", cat:"暖调柔和", status:"written",
  zh:"陶土", en:"terracotta",
  rights:"R0", risk:"none",
  light:"室内暖灯侧照，明暗差中等，暗部偏红棕",
  camera:"50mm，半身，环境为暖调室内",
  faces:{
    bone:{ t:"wide round face, broad jaw",
      c:"脸型偏宽偏圆，下颌角柔和但宽，颧骨位置偏低" },
    skin:{ t:"warm deep skin, even",
      c:"暖调深肤，明度中等偏低，肤面均匀反光柔和" },
    eye:{ t:"round wide eyes, thick lashes",
      c:"圆眼，睫毛浓密，眼神直望，眉毛浓而自然" },
    form:{ t:"solid grounded form",
      c:"身形壮实，站姿稳，肩背厚实" },
    aura:{ t:"grounded, warm, unhurried",
      c:"神情沉静，目光稳定，气质厚重不急" },
    hair:{ t:"thick coiled hair",
      c:"浓密细卷发，卷度清晰，蓬松" },
    dress:{ t:"earth toned knitwear",
      c:"大地色系针织或棉质衣物，质感厚实" }
  },
  read:"这一号是「暖且厚实」的方向。"
    + "它明确拒绝纤细 —— 想做纤柔方向请换号，不要改它的形体面。",
  fact:["形象为原创抽取"] },

{ num:"AL-012", cat:"暖调柔和", status:"written",
  zh:"米白", en:"ricewhite",
  rights:"R0", risk:"none",
  light:"极柔的顶光，几乎无投影，肤面均匀明亮，暗部很浅",
  camera:"50mm，正面平视，中近景",
  faces:{
    bone:{ t:"small round face",
      c:"小圆脸，下巴短而圆，骨感低，整体显小" },
    skin:{ t:"bright warm ivory skin",
      c:"暖调象牙白，明度高，肤面平滑带细腻光泽" },
    eye:{ t:"soft round eyes, gentle gaze",
      c:"眼型圆润，眼神柔和不聚焦，眉形淡" },
    form:{ t:"small slender frame",
      c:"身量小而纤细，肩窄，四肢比例偏短" },
    aura:{ t:"gentle, shy, soft",
      c:"表情腼腆，目光略偏，气质柔软没有攻击性" },
    hair:{ t:"light brown straight hair",
      c:"浅棕直发，长度到肩，发丝细软" },
    dress:{ t:"cream soft clothing",
      c:"米白色柔软质地衣物，针织或棉，版型宽松" }
  },
  read:"这一号偏幼态。给它加成熟妆造或成熟场景会明显违和 —— "
    + "幼态感的来源是比例与皮肤，不是年龄标签。",
  fact:["形象为原创抽取"] },

{ num:"AL-013", cat:"暖调柔和", status:"written",
  zh:"琥珀眼", en:"amber",
  rights:"R0", risk:"none",
  light:"暖侧光从眼侧掠过，眼下有柔和阴影，虹膜透出琥珀色",
  camera:"85mm，眼部特写到胸部",
  faces:{
    bone:{ t:"soft heart shaped face",
      c:"心形脸，额部略宽而两侧收窄，下巴尖" },
    skin:{ t:"warm fair skin",
      c:"暖调白皙，肤面细腻，颊部自然红润" },
    eye:{ t:"amber light eyes, thick lashes",
      c:"虹膜呈琥珀或浅褐色，瞳孔边界清晰，睫毛浓密" },
    form:{ t:"slim graceful frame",
      c:"身形纤细，比例修长，肩线柔和" },
    aura:{ t:"warm attentive, quietly engaging",
      c:"神情专注有神，目光落在观者身上，气质温和而有吸引力" },
    hair:{ t:"long chestnut hair",
      c:"栗色长发，中分，自然垂落" },
    dress:{ t:"warm neutral top",
      c:"暖调中性色上衣，质地柔软，无明显装饰" }
  },
  read:"这一号的重心在眼睛。"
    + "换成浅色眼睛时优先换 eye 面，别动其他面 —— 眼睛变了人还是这个人。",
  fact:["形象为原创抽取"] },

{ num:"AL-014", cat:"暖调柔和", status:"written",
  zh:"软缎", en:"softsatin",
  rights:"R0", risk:"none",
  light:"柔光加轻微逆光，轮廓边缘有一层薄薄的光晕，整体无硬阴影",
  camera:"85mm，半身，浅景深",
  faces:{
    bone:{ t:"gentle oval face, fine jaw",
      c:"卵形偏柔，下颌线细而不锐，颧骨几乎不显" },
    skin:{ t:"dewy soft skin",
      c:"肤色白皙带暖，肤面有明显水光，眉眼区最亮" },
    eye:{ t:"relaxed gentle eyes",
      c:"眼型柔和，眼神放松，眉间距略宽显得舒展" },
    form:{ t:"gentle curves",
      c:"身体曲线柔和，腰线明显但不夸张，动作松弛" },
    aura:{ t:"serene, tender, unhurried",
      c:"神情安详，目光柔和，气质温柔不急躁" },
    hair:{ t:"soft long waves",
      c:"柔软长卷发，松散自然，发丝有光泽" },
    dress:{ t:"flowing light fabric",
      c:"浅色流动感面料，垂坠顺滑，无硬质装饰" }
  },
  read:"这一号是「无攻击性」的完整方案。"
    + "它几乎不能配强冲突主题 —— 要冲突请换 AL-005 或 AL-008。",
  fact:["形象为原创抽取"] },

{ num:"AL-015", cat:"暖调柔和", status:"written",
  zh:"秋叶", en:"autumnleaf",
  rights:"R0", risk:"none",
  light:"低角度暖阳直射，形成长长的投影，肤色被晒得偏红",
  camera:"35mm，环境为秋日户外，中景",
  faces:{
    bone:{ t:"regular oval face",
      c:"卵形，比例规整，颧骨与下颌都不突出" },
    skin:{ t:"warm ruddy skin",
      c:"肤色暖且偏红，颊部明显红润，像被风吹过" },
    eye:{ t:"medium eyes, lively gaze",
      c:"眼型中等，眼神有神，略带好奇" },
    form:{ t:"natural healthy form",
      c:"身形自然健康，动作活泼，姿态放松" },
    aura:{ t:"lively, warm, uncomplicated",
      c:"表情明亮，目光灵活，气质爽朗直接" },
    hair:{ t:"medium brown hair",
      c:"棕色中长发，自然蓬松，发尾略卷" },
    dress:{ t:"autumn warm layers",
      c:"秋季暖调叠穿，毛衣或针织外套，色调橙棕" }
  },
  read:"这一号的鲜活感来自「红润」与「短促的发尾卷」。"
    + "给它加冷调正装会立刻变成另一个人。",
  fact:["形象为原创抽取"] },

{ num:"AL-016", cat:"暖调柔和", status:"written",
  zh:"晚祷", en:"vespers",
  rights:"R0", risk:"none",
  light:"烛光或暖灯侧照，底部暖而顶部暗，肤面有明显暖色反光",
  camera:"50mm，半身，环境暗",
  faces:{
    bone:{ t:"serene oval face",
      c:"卵形，轮廓柔和，下颌细" },
    skin:{ t:"warm candlelit skin",
      c:"肤色在暖光下呈蜜色，颊部与鼻尖泛红" },
    eye:{ t:"downcast contemplative eyes",
      c:"眼型细长，目光下垂或半闭，眉形平缓" },
    form:{ t:"slender composed frame",
      c:"身形纤细，姿态端正但不僵硬，肩线平" },
    aura:{ t:"devotional, quiet, inward",
      c:"神情专注内收，目光不在观者身上，气质沉静" },
    hair:{ t:"dark hair pinned back",
      c:"深色头发盘起或全部收起，无散发" },
    dress:{ t:"dark high neckline",
      c:"深色高领衣物，领口到颈，无装饰" }
  },
  read:"这一号靠「向内」的气质成立。"
    + "让它直视镜头会丢掉全部特点 —— 这是少数不该改 gaze 的一号。",
  fact:["形象为原创抽取"] },

/* ============ 017–024 · 中性硬朗 ============ */
{ num:"AL-017", cat:"中性硬朗", status:"written",
  zh:"石中", en:"instone",
  rights:"R0", risk:"none",
  light:"硬侧光分出明确明暗两半，阴影侧保留细节不死黑",
  camera:"50mm，七分身，侧身站姿",
  faces:{
    bone:{ t:"strong square jaw, wide face",
      c:"下颌角方而明显，脸型偏宽，颧骨横向展开" },
    skin:{ t:"neutral cool skin, slight texture",
      c:"肤色中性偏冷，肤面保留质感与轻微纹理" },
    eye:{ t:"deep set steady eyes",
      c:"眼窝偏深，眼型中等，目光稳定" },
    form:{ t:"broad shoulders, solid frame",
      c:"肩宽厚实，身形结实，站姿稳，颈部有力量" },
    aura:{ t:"steady, immovable, grounded",
      c:"神情沉稳，目光不移，气质不动如山" },
    hair:{ t:"short dark hair",
      c:"深色短发，简洁利落，无造型" },
    dress:{ t:"plain dark top",
      c:"深色素面上衣，版型宽松，无图案" }
  },
  read:"这一号的中性来自「没有明显的性别指向」，"
    + "但骨相偏硬朗。想更中性就减形体面的力量感，别改骨相。",
  fact:["形象为原创抽取"] },

{ num:"AL-018", cat:"中性硬朗", status:"written",
  zh:"长风", en:"longwind",
  rights:"R0", risk:"none",
  light:"阴天大范围散射光，方向感极弱，整体亮度均匀",
  camera:"35mm，环境人像，人物在开阔地，比例偏小",
  faces:{
    bone:{ t:"long angular face",
      c:"脸型长且有棱角，下颌窄长，颧骨明显" },
    skin:{ t:"cool light skin, weathered",
      c:"肤色浅偏冷，颊部略有风吹后的粗糙感" },
    eye:{ t:"narrow eyes, forward gaze",
      c:"眼型偏窄，目光平视前方，眉压低" },
    form:{ t:"tall lean frame",
      c:"身量高瘦，四肢长，站姿挺直" },
    aura:{ t:"resolute, weathered, independent",
      c:"神情坚毅，目光坚定，气质独立不依赖" },
    hair:{ t:"shoulder length dark hair",
      c:"深色及肩发，被风吹乱，边缘毛躁" },
    dress:{ t:"weathered outerwear",
      c:"磨旧感的外套，质地偏硬，有使用痕迹" }
  },
  read:"这一号的「风」是造型的一部分。"
    + "换成室内柔光会丢掉它八成的性格。",
  fact:["形象为原创抽取"] },

{ num:"AL-019", cat:"中性硬朗", status:"written",
  zh:"素面", en:"plainface",
  rights:"R0", risk:"none",
  light:"自然散射光，无造型光，暗部很浅，接近平光",
  camera:"85mm，面部特写，正面",
  faces:{
    bone:{ t:"average symmetrical face",
      c:"骨相规整对称，颧骨与下颌都不突出" },
    skin:{ t:"natural skin, minimal retouch",
      c:"肤色自然，可见毛孔与轻微瑕疵，保留真实质感" },
    eye:{ t:"regular eyes, neutral direct gaze",
      c:"眼型规整，目光平视镜头，眉毛自然未修" },
    form:{ t:"average frame",
      c:"身形中等，比例正常，不刻意突出任何部位" },
    aura:{ t:"unpolished, real, present",
      c:"表情自然不做作，目光平静，气质是没有被修饰过的" },
    hair:{ t:"uncombed dark hair",
      c:"深色头发，未刻意打理，略有蓬乱" },
    dress:{ t:"plain everyday clothing",
      c:"日常穿着，无造型感，无配饰" }
  },
  read:"这一号的用途是「压住美化」。"
    + "当你要避免输出过于精修时，用它当基底比减权重更有效。",
  fact:["形象为原创抽取"] },

{ num:"AL-020", cat:"中性硬朗", status:"written",
  zh:"棱镜", en:"prism",
  rights:"R0", risk:"none",
  light:"多色光源混合，肤面反射不同色温，冷暖交界明显",
  camera:"50mm，特写，色彩层次丰富",
  faces:{
    bone:{ t:"defined bone structure",
      c:"骨相清晰，颧骨与鼻梁的转折明确，下颌线利落" },
    skin:{ t:"cool skin with warm reflections",
      c:"肤色本身偏冷，但受暖光影响颊部泛暖，冷暖交界清晰" },
    eye:{ t:"crisp defined eyes",
      c:"眼型清晰，眼线明确，目光锐利有神" },
    form:{ t:"defined form",
      c:"身形匀称，轮廓清晰，动作有控制" },
    aura:{ t:"complex, poised, striking",
      c:"神情复杂难读，目光有穿透力，气质华丽而有距离" },
    hair:{ t:"styled glossy hair",
      c:"精心打理的亮泽发型，造型感强" },
    dress:{ t:"sophisticated dark garment",
      c:"考究的深色服装，剪裁讲究，配饰简约" }
  },
  read:"这一号靠「冷暖对撞」成立。"
    + "统一成单一光色会让它退化成普通的锐利脸。",
  fact:["形象为原创抽取"] },

{ num:"AL-021", cat:"中性硬朗", status:"written",
  zh:"灰阶", en:"greyscale",
  rights:"R0", risk:"none",
  light:"无明显方向的光，明暗层次少，整体平，色彩被压到极低",
  camera:"50mm，中景，画面留白多",
  faces:{
    bone:{ t:"regular face, unremarkable",
      c:"骨相规整，无突出特征，也不平庸到无记忆点" },
    skin:{ t:"even low contrast skin",
      c:"肤色均匀，反差低，肤面质感被光压平" },
    eye:{ t:"calm eyes",
      c:"眼型平静，目光松弛，不锐利也不柔和" },
    form:{ t:"average relaxed form",
      c:"身形普通，姿态放松，不紧绷" },
    aura:{ t:"neutral, low key, understated",
      c:"表情平淡，气质低调，不争夺注意力" },
    hair:{ t:"straight dark hair",
      c:"深色直发，普通长度，无造型" },
    dress:{ t:"neutral muted clothing",
      c:"低饱和中性色衣物，无图案无亮点" }
  },
  read:"这一号是「退后一步」的设计。"
    + "需要背景或文字成为主体时，用它当底 —— "
    + "它不会跟画面里别的东西抢注意力。",
  fact:["形象为原创抽取"] },

{ num:"AL-022", cat:"中性硬朗", status:"written",
  zh:"铁线", en:"ironline",
  rights:"R0", risk:"none",
  light:"硬光造成清晰的轮廓分界，主体与背景的边界锐利",
  camera:"50mm，半身，背景简洁",
  faces:{
    bone:{ t:"defined jaw and cheekbones",
      c:"下颌与颧骨都清晰，轮廓线条明确" },
    skin:{ t:"even matte skin",
      c:"肤色均匀，肤面哑光，无明显反光" },
    eye:{ t:"focused eyes",
      c:"眼型清晰，目光聚焦，眉形利落" },
    form:{ t:"upright firm form",
      c:"身姿挺直，肩线平直，形体端正" },
    aura:{ t:"decisive, competent, contained",
      c:"神情果断，目光专注，气质干练克制" },
    hair:{ t:"tied back dark hair",
      c:"深色头发束起或扎起，干净利落" },
    dress:{ t:"tailored muted clothing",
      c:"剪裁合体的低饱和服装，线条清楚" }
  },
  read:"这一号是「职业感」的通用底。"
    + "换任何行业主题都成立，因为它本身不指向任何行业。",
  fact:["形象为原创抽取"] },

{ num:"AL-023", cat:"中性硬朗", status:"written",
  zh:"疏星", en:"sparsestar",
  rights:"R0", risk:"none",
  light:"极低照度环境，只有一点微光在眼部与轮廓上，整体大部分沉在暗里",
  camera:"85mm，特写，背景全黑",
  faces:{
    bone:{ t:"fine bone structure",
      c:"骨相精细，下颌窄，颧骨轻" },
    skin:{ t:"pale skin in low light",
      c:"肤色在极低光下呈灰调，只有受光处有亮度" },
    eye:{ t:"bright eyes in darkness",
      c:"眼部在暗中仍有明显反光，眼神清楚" },
    form:{ t:"slight slender frame",
      c:"身形偏瘦小，轮廓在暗中若隐若现" },
    aura:{ t:"distant, quiet, watchful",
      c:"神情安静，目光在暗中注视，气质疏离警觉" },
    hair:{ t:"dark hair blending into shadow",
      c:"深色头发与暗背景几乎融为一体，边缘只在受光处可见" },
    dress:{ t:"dark minimal clothing",
      c:"极简深色衣物，几乎不反光" }
  },
  read:"这一号的「暗」是它的结构，不是氛围。"
    + "提高亮度会让人物失去立体感 —— 它靠对比而不是细节成立。",
  fact:["形象为原创抽取"] },

{ num:"AL-024", cat:"中性硬朗", status:"written",
  zh:"白昼", en:"daylight",
  rights:"R0", risk:"none",
  light:"明亮的自然顶光偏侧，整体高亮度，阴影浅且清晰",
  camera:"50mm，正面，中景，环境明亮",
  faces:{
    bone:{ t:"clear balanced face",
      c:"骨相均衡清晰，比例规整" },
    skin:{ t:"clear bright skin, natural",
      c:"肤色明亮自然，肤面通透有光泽但不油" },
    eye:{ t:"open clear eyes",
      c:"眼型清晰，眼神明亮平视" },
    form:{ t:"healthy regular frame",
      c:"身形健康匀称，姿态自然" },
    aura:{ t:"clear, straightforward, open",
      c:"神情清朗，目光坦然，气质直率不设防" },
    hair:{ t:"clean dark hair",
      c:"深色头发整洁，边缘清晰" },
    dress:{ t:"clean light clothing",
      c:"整洁浅色衣物，版型清楚" }
  },
  read:"这一号是最安全的一张 —— 几乎不预设情境。"
    + "拿不准用哪一号时从它开始，再往上叠。",
  fact:["形象为原创抽取"] }
);
