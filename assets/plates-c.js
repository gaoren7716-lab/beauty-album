/* ============================================================
 * plates-c.js —— 全球段 AL-049 ~ AL-064
 *
 * 为什么有这一段：
 * 原 48 条（001–048）是**原型段** —— 不锚定任何地域的抽象审美类型，
 * 骨相描述全是东亚审美的变体。「全球美人画册」名下没有全球，
 * 是广度上的主缺口。用户 2026-10-11 定调：先铺广度，深度后续叠加。
 *
 * 段位按文化圈编排（每圈 4 条起步，后续可扩到 8）：
 *   049–052 东亚·汉文化圈    053–056 东南亚
 *   057–060 南亚             061–064 西亚与北非
 *   065–068 非洲（plates-d） 069–072 欧洲（plates-d）
 *   073–076 美洲（plates-d） 077–080 大洋洲（plates-d）
 *
 * ------------------------------------------------------------
 * 写作纪律（每一条都必须守，违反就是刻板印象堆砌而不是类型学）
 * ------------------------------------------------------------
 * ① 特征来自**该文化圈自己的审美记录**——仕女图、细密画、雕像、
 *    传统服饰实物。不来自现代大众媒体里的刻板形象。
 * ② 中性描述特征，不排美丑。本库的既有原则：体型、年龄、面貌、
 *    气质是中性描述维度，不允许被写成「虽然…但是…」式的让步句。
 * ③ 一条 = 一个地域类型（kind:"type"），不指向任何可识别真人。
 * ④ cat 从既有六类里选（冷调锐利/暖调柔和/中性硬朗/少年感/明艳/古典），
 *    让抽卡护栏与覆盖统计继续工作；地域是 region 字段，与 cat 正交。
 * ============================================================ */
if (typeof module !== "undefined" && module.exports) {
  var _C = require("./data-core.js");
  var ALBUM = _C.ALBUM;
}

ALBUM.push(
/* ============ 049–052 · 东亚 · 汉文化圈 ============ */
{ num:"AL-049", cat:"明艳", status:"written", region:"东亚 · 汉文化圈", culture:"唐",
  zh:"盛唐丰韵", en:"tang courtly",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"殿内暖光自侧面来，纱幔滤成柔光",
  camera:"中景，微仰，三分之二侧身",
  faces:{
    bone:{ t:"full round face, soft high cheekbones, gently rounded jaw",
      c:"面若满月，颊肉丰润，颧骨圆润不外扩，下颌线柔和" },
    skin:{ t:"warm ivory skin, luminous",
      c:"暖调象牙白，肤面莹润有光泽" },
    eye:{ t:"long narrow eyes, gently upturned, thin moth brows",
      c:"细长眼型微上扬，蛾眉阔而淡，目光从容" },
    form:{ t:"full voluptuous figure, rounded shoulders",
      c:"体态丰腴圆润，肩线柔和，符合唐代以丰为美的形制" },
    aura:{ t:"opulent, at ease, courtly confidence",
      c:"神态雍容自在，气度华贵不紧绷" },
    hair:{ t:"high chignon adorned with gold and peony pins",
      c:"高耸峨髻，簪金步摇与牡丹，鬓发薄如蝉翼" },
    dress:{ t:"chest-high ruqun in vermillion silk, huadian forehead ornament",
      c:"齐胸襦裙朱红间金，额贴花钿，妆面有斜红" }
  },
  read:"这一号的原型是唐代仕女图与陶俑：丰腴、华贵、外放。"
    + "注意「以丰为美」是唐代的具体历史审美，不要按现代标准改瘦 —— "
    + "改瘦就不是唐了。",
  fact:["原型为唐代仕女图与三彩陶俑的常见形制","花钿、斜红均为有据可查的唐妆"] },

{ num:"AL-050", cat:"古典", status:"written", region:"东亚 · 汉文化圈", culture:"宋",
  zh:"宋韵清雅", en:"song literati",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"窗纸滤过的天光，平淡近水彩",
  camera:"七分身，平视，大量留白",
  faces:{
    bone:{ t:"slender oval face, delicate jaw",
      c:"清瘦鹅蛋脸，下颌纤细，轮廓淡" },
    skin:{ t:"pale matte skin, understated",
      c:"素白偏冷，妆薄近无" },
    eye:{ t:"slim eyes, calm gaze, fine arched brows",
      c:"细眼平静，眉形细而弯（远山眉一路）" },
    form:{ t:"slim upright figure",
      c:"身形清瘦挺直" },
    aura:{ t:"reserved, scholarly calm",
      c:"内敛安静，有书卷气" },
    hair:{ t:"low restrained bun with plain comb",
      c:"低髻紧敛，簪素色梳篦，不铺张" },
    dress:{ t:"plain beizi robe in muted tone, pearl hairpin accents",
      c:"素色褙子直领对襟，色调低饱和，间以珍珠妆点面靥" }
  },
  read:"宋的审美把唐代的外放全部收进来：素、瘦、静。"
    + "配场景时给书院、庭院、茶席这类地方，别给浓艳环境。",
  fact:["褙子与珍珠妆均为宋代有据形制","原型为宋人绘画中的仕女与士人女眷"] },

{ num:"AL-051", cat:"古典", status:"written", region:"东亚 · 汉文化圈", culture:"日本",
  zh:"和风姬君", en:"hime",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"障子纸漫射光，整体提亮压对比",
  camera:"正坐姿正面或微侧，画面平稳对称",
  faces:{
    bone:{ t:"small oval face, compact features",
      c:"小脸精致，五官紧凑集中，下巴短圆" },
    skin:{ t:"white powdered skin, uniform",
      c:"白粉肌，均匀无血色感，颈部与脸交界不留线（传统涂白到发际）" },
    eye:{ t:"narrow single-lid eyes, downward calm gaze",
      c:"细长眼皮薄，目光低垂安静" },
    form:{ t:"petite, seated posture disciplined",
      c:"身形娇小，正坐姿势端正" },
    aura:{ t:"quiet dignity, restrained",
      c:"安静克制，礼法之内的端庄" },
    hair:{ t:"long straight black hair, hime cut with cheek-length sidelocks",
      c:"黑长直姬发式：前发齐眉、侧发垂颊、后发及腰" },
    dress:{ t:"layered kimono with wide obi, small red lip point",
      c:"多层和服与宽腰封，唇为一点朱红（点唇）" }
  },
  read:"注意「涂白到发际」与「点唇」这两个细节 —— 它们是和风妆面"
    + "区别于汉妆的关键。少了这两处，出图会变成穿和服的中国脸。",
  fact:["姬发式与点唇为日本传统妆发有据形制","原型为浮世绘与近代姬君形象"] },

{ num:"AL-052", cat:"古典", status:"written", region:"东亚 · 汉文化圈", culture:"朝鲜",
  zh:"朝鲜闺秀", en:"joseon lady",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"韩屋檐下自然光，地面反光补脸",
  camera:"全身或膝上，正面端庄构图",
  faces:{
    bone:{ t:"round full face, soft jaw, high full cheeks",
      c:"圆脸丰颊，下颌柔顺，面中部饱满" },
    skin:{ t:"pale porcelain skin",
      c:"白皙瓷肌" },
    eye:{ t:"gentle upward-curved eyes, thin straight brows",
      c:"眼型温和微弯（朝鲜画里常见的一路），细直眉" },
    form:{ t:"slender, posture contained",
      c:"身形纤细，姿态收敛" },
    aura:{ t:"gentle modesty, quiet warmth",
      c:"温婉谦和，安静里带暖意" },
    hair:{ t:"low braided bun (tteolmeori) secured with binyeo pin",
      c:"低编髻（떨메리）以簪固定，不披发" },
    dress:{ t:"hanbok with high-waisted chima and jeogori, warm palette",
      c:"韩服高腰裙（치마）+ 短上衣（저고리），腰线极高，色彩温润" }
  },
  read:"韩服的腰线在腋下 —— 这个比例是它区别于汉服与和服的关键，"
    + "词面里要保留「腰线极高」这类描述，否则出图会被画成普通长裙。",
  fact:["圆衫与高腰裙制式为朝鲜王朝有据服制","原型为朝鲜王朝风俗画与肖像"] },

/* ============ 053–056 · 东南亚 ============ */
{ num:"AL-053", cat:"明艳", status:"written", region:"东南亚", culture:"泰",
  zh:"暹罗金辉", en:"siam gold",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"寺院金顶反射的暖金光，阴影带金色",
  camera:"全身立姿，微仰显衣饰层叠",
  faces:{
    bone:{ t:"softly rounded face, gentle nose bridge",
      c:"脸型圆润柔和，鼻梁柔缓不锐利" },
    skin:{ t:"warm golden-tan skin, luminous",
      c:"暖金棕肤色，肤面有光泽感" },
    eye:{ t:"almond eyes, dark irises, gentle gaze",
      c:"杏眼深棕，目光柔和" },
    form:{ t:"slender with graceful neck",
      c:"身形纤细，颈部长而优雅（泰舞强调颈与手的线条）" },
    aura:{ t:"serene, gracious, temple-calm",
      c:"安详有礼，带寺院气的沉静" },
    hair:{ t:"sleek low chignon with fresh jasmine",
      c:"乌黑低髻光滑紧贴，簪茉莉串" },
    dress:{ t:"chut thai: silk sinh tube skirt and sabai sash, gold jewelry",
      c:"泰式传统着：金丝筒裙（sinh）+ 斜披肩（sabai），金首饰成套" }
  },
  read:"泰式审美的关键词是「金」——肤色、寺墙、首饰全在同一个金色系里。"
    + "配场景给寺院或水灯节，画面的金色会连成一体。",
  fact:["chut thai 为泰国官方认定的传统着装体系","原型为泰传统舞蹈与宫廷着装"] },

{ num:"AL-054", cat:"暖调柔和", status:"written", region:"东南亚", culture:"越南",
  zh:"奥黛笠影", en:"ao dai",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"阴天的柔光，雨后青石板反光",
  camera:"全身侧面或四分之三，裙摆与斗笠入画",
  faces:{
    bone:{ t:"delicate oval face, soft jawline",
      c:"小巧鹅蛋脸，线条柔和" },
    skin:{ t:"light warm skin, subtle glow",
      c:"浅暖肤色，润而不油" },
    eye:{ t:"dark gentle eyes, soft gaze",
      c:"深棕眼温和，目光柔软" },
    form:{ t:"tall slender figure emphasized by fitted gown",
      c:"身形高挑纤细，被贴身剪裁强调" },
    aura:{ t:"poetic, reserved, a little melancholic",
      c:"诗意内敛，略带愁绪" },
    hair:{ t:"long straight black hair, loose or low bun",
      c:"黑长直披发或低髻，无多余饰物" },
    dress:{ t:"ao dai: fitted tunic over wide trousers, conical leaf hat in hand",
      c:"奥黛：贴身长衫+ 阔腿绸裤，手执斗笠（nón lá）" }
  },
  read:"奥黛的剪裁是「贴身上衣 + 阔腿裤」，行走时上衣开衩随步摆 —— "
    + "这个动感值得写进场景，静态站着就浪费了这件衣服。",
  fact:["奥黛为越南近代定型的国服","斗笠为越日常与意象符号"] },

{ num:"AL-055", cat:"暖调柔和", status:"written", region:"东南亚", culture:"爪哇",
  zh:"爪哇蜡染", en:"javanese batik",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"庭院高檐下的阴影与亮部对比，热带日光",
  camera:"半身坐姿，手部与蜡染纹样入画",
  faces:{
    bone:{ t:"soft rounded face, gentle wide cheekbones",
      c:"脸型柔和偏圆，颧骨宽而缓" },
    skin:{ t:"warm brown skin, smooth",
      c:"暖棕肤色，肤质细腻" },
    eye:{ t:"dark rounded eyes, steady gaze",
      c:"圆眼深棕，目光沉稳" },
    form:{ t:"graceful, hand gestures refined",
      c:"体态优雅，手部动作有程式化的柔美" },
    aura:{ t:"calm, unhurried, halus (refined)",
      c:"从容不迫，合于爪哇「halus」的文雅理想" },
    hair:{ t:"jet-black low bun with gold hairpins and jasmine",
      c:"乌黑低髻，簪金饰与茉莉" },
    dress:{ t:"kebaya lace blouse with batik wrap skirt, gold accessories",
      c:"蕾丝珂巴雅上衣 + 蜡染围裹裙，金饰成套" }
  },
  read:"蜡染纹样有语义（不同纹样属不同场合），但出图不必考据纹样名 —— "
    + "写「细密的手绘蜡染纹样，棕蓝配色」模型就能给出质感。",
  fact:["kebaya 与 batik 为爪哇有据服饰传统","halus 为爪哇文化中的文雅理想"] },

{ num:"AL-056", cat:"暖调柔和", status:"written", region:"东南亚", culture:"菲律宾",
  zh:"蝴蝶袖", en:"filipiniana",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"正午顶光压到柔和，海岛白墙反光",
  camera:"半身，肩部与袖型入画",
  faces:{
    bone:{ t:"rounded face with soft features, gentle epicanthic hints",
      c:"脸型圆润，五官柔和，面中部略平" },
    skin:{ t:"light tan skin, kayumanggi warm tone",
      c:"浅棕暖肤（kayumanggi，菲律宾语对本族肤色的自称，非外来标签）" },
    eye:{ t:"dark round eyes, bright gaze",
      c:"深色圆眼，目光明亮" },
    form:{ t:"petite to medium, upright",
      c:"中等身形，姿态挺拔" },
    aura:{ t:"sunny, courteous, resilient",
      c:"明朗有礼，带韧性" },
    hair:{ t:"black wavy hair, loosely gathered",
      c:"黑色微卷发，松松拢起" },
    dress:{ t:"terno with butterfly sleeves, piña fabric sheen",
      c:"特诺礼服：标志性的蝴蝶袖，凤梨纤维面料有独特光泽" }
  },
  read:"蝴蝶袖（sleeves stiffened into butterfly shape）是这一型唯一的识别点，"
    + "词面必须写清袖型，否则会被画成普通衬衫。",
  fact:["terno 与凤梨纤维（piña）为菲律宾有据织物传统"] },

/* ============ 057–060 · 南亚 ============ */
{ num:"AL-057", cat:"明艳", status:"written", region:"南亚", culture:"莫卧儿",
  zh:"莫卧儿细密", en:"mughal miniature",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"细密画式的平光，边缘勾金",
  camera:"正面或四分之三平面化构图，装饰边框入画",
  faces:{
    bone:{ t:"oval face with full cheeks, rounded chin",
      c:"椭圆脸颊丰润，下巴圆转（细密画理想的「月面」）" },
    skin:{ t:"fair wheatish skin with rose undertone",
      c:"小麦色偏白，透玫瑰底色" },
    eye:{ t:"large almond eyes with joined brows (Persian-influenced ideal)",
      c:"杏仁大眼，眉形浓长近乎相连（波斯传入的审美，细密画标志性特征）" },
    form:{ t:"petite, richly adorned",
      c:"身形娇小，首饰繁密" },
    aura:{ t:"regal, poetic, composed",
      c:"贵气而有诗性，从容克制" },
    hair:{ t:"sleek center-parted hair under ornate turban ornament",
      c:"中分黑发收拢，头饰繁复（jhumar 额饰垂于一侧）" },
    dress:{ t:"ghagra-lehenga with sheer dupatta, nath nose ring, maang tikka",
      c:"勒恩加裙 + 薄纱披巾，鼻环（nath）与额饰（maang tikka）成套" }
  },
  read:"「连眉」是波斯-莫卧儿一系审美的标志性特征，细密画里几乎不画分眉。"
    + "这一点必须保留 —— 模型默认会画成分眉，不写就会丢。",
  fact:["连眉审美经波斯传入莫卧儿细密画，有据可查","原型为莫卧儿宫廷细密画"] },

{ num:"AL-058", cat:"明艳", status:"written", region:"南亚", culture:"泰米尔",
  zh:"庙宇茉莉", en:"tamil temple",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"南印度强日光，庙宇石柱投下深影",
  camera:"半身，花环与首饰层次入画",
  faces:{
    bone:{ t:"broad rounded face, strong cheekbones, full lips",
      c:"脸型宽圆，颧骨明显，唇形丰满" },
    skin:{ t:"deep warm brown skin, radiant",
      c:"深暖棕肤色，有光泽感" },
    eye:{ t:"large dark eyes, kohl-lined, expressive",
      c:"大而深的黑眼，画 kohl 眼线，眼神有表现力" },
    form:{ t:"fuller figure, graceful",
      c:"体态丰满而有韵律感" },
    aura:{ t:"devotional warmth, vital",
      c:"虔敬的热忱，生命力外露" },
    hair:{ t:"oiled black hair in center-part bun with jasmine gajra",
      c:"中分黑发抹油梳拢，发髻环茉莉花串（gajra）" },
    dress:{ t:"kanchipuram silk saree in bright contrast, temple jewelry",
      c:"康吉普拉姆丝纱丽（撞色宽边），庙宇金首饰成套" }
  },
  read:"「抹油的中分黑发 + 茉莉花串」是南印度女性的日常真实，"
    + "也是画面识别度最高的一组符号。肤色用「有光泽感的深暖棕」，"
    + "不要让模型自动提亮 —— 提亮就不是这一型了。",
  fact:["茉莉花串（gajra）与庙宇首饰为南印有据传统","原型为泰米尔纳德日常与节庆形象"] },

{ num:"AL-059", cat:"明艳", status:"written", region:"南亚", culture:"拉贾斯坦",
  zh:"沙漠彩幔", en:"rajasthani",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"沙漠正午的硬光，色彩饱和到发烫",
  camera:"半身，面纱与镜面刺绣反光入画",
  faces:{
    bone:{ t:"angular face with high cheekbones, desert-climate lines",
      c:"脸型有棱角，颧骨高，面部线条带风沙气候的清晰感" },
    skin:{ t:"sun-warmed tan skin",
      c:"日晒后的暖棕肤色" },
    eye:{ t:"dark keen eyes above the veil",
      c:"纱幔之上的一双黑眼，目光清亮锐利" },
    form:{ t:"upright, fluid in heavy dress",
      c:"身姿挺拔，厚重裙装下步态依然流畅" },
    aura:{ t:"proud, vivid, desert-strong",
      c:"骄傲明艳，有沙漠气候磨出的坚韧" },
    hair:{ t:"covered; braids beneath the odhni veil",
      c:"发辫收于彩幔（odhni）之下" },
    dress:{ t:"ghagra-choli with mirror-work embroidery, bangles up the arms",
      c:"裙裾+ 短上衣，满幅镜面刺绣，臂上镯子排到肘" }
  },
  read:"拉贾斯坦的色彩逻辑是「沙漠越黄，衣越艳」—— "
    + "正红、孔雀蓝、明黄都会出现。场景给焦特普尔的蓝城或沙丘，饱和度拉满。",
  fact:["镜面刺绣（shisha）与彩幔为拉贾斯坦有据工艺"] },

{ num:"AL-060", cat:"暖调柔和", status:"written", region:"南亚", culture:"孟加拉",
  zh:"白纱红边", en:"bengali lal par",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"雨季阴柔天光，恒河三角洲的水汽",
  camera:"全身，纱丽红边与额间朱砂入画",
  faces:{
    bone:{ t:"soft oval face, large expressive features",
      c:"柔和椭圆脸，五官大而有神" },
    skin:{ t:"warm light-brown skin",
      c:"暖调浅棕肤色" },
    eye:{ t:"large dark elongated eyes, kohl-heavy",
      c:"细长的大黑眼，kohl 眼线浓（孟加拉审美标志）" },
    form:{ t:"soft figure, measured movements",
      c:"体态柔和，动作有分寸" },
    aura:{ t:"intellectual warmth, lyrical",
      c:"书卷的暖意，带诗性" },
    hair:{ t:"center-parted black hair in a low twist, red bindi",
      c:"中分黑发低绾，额点朱砂（bindi）， sindoor 沿发缝" },
    dress:{ t:"white saree with red border (lal par)",
      c:"白纱丽红边（lal par），孟加拉传统配色" }
  },
  read:"「白纱丽 + 红边 + 发缝朱砂」三个符号一组出现，拆开就散了。"
    + "适合配书斋、河阶、雨季窗边的场景。",
  fact:["lal par 纱丽与 sindoor 为孟加拉有据传统"] },

/* ============ 061–064 · 西亚与北非 ============ */
{ num:"AL-061", cat:"明艳", status:"written", region:"西亚与北非", culture:"波斯",
  zh:"波斯月面", en:"persian miniature",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"细密画平光，金箔底",
  camera:"平面化构图，花草纹样边框",
  faces:{
    bone:{ t:"moon-round face (mah-ro), small chin, full cheeks",
      c:"「月面」：脸圆如满月，下巴小巧，颊丰（波斯审美核心词）" },
    skin:{ t:"wheat skin with pearl sheen",
      c:"小麦肤色透珍珠光泽" },
    eye:{ t:"large almond eyes, brows joined in a single arc",
      c:"杏仁大眼，双眉连成一道弧（连眉，波斯审美标志性特征）" },
    form:{ t:"petite, willowy",
      c:"身形纤小柔韧" },
    aura:{ t:"lyrical, wistful, garden-calm",
      c:"诗性、微愁、园林般的静" },
    hair:{ t:"black tresses escaping an ornate hat",
      c:"黑发数缕从华帽边滑落（细密画经典姿态）" },
    dress:{ t:"patterned silk with arabesque, pearl strands, delicate crown-cap",
      c:"阿拉伯式纹样丝绸，珍珠串饰，精致小冠帽" }
  },
  read:"波斯审美的三个不可省符号：**月面、连眉、帽边滑落的黑发**。"
    + "这三个都是细密画反复出现的程式，模型默认不会画连眉，必须显式写。",
  fact:["mah-ro（月面）为波斯诗歌与细密画的经典审美词","连眉为波斯-突厥审美圈共同特征"] },

{ num:"AL-062", cat:"明艳", status:"written", region:"西亚与北非", culture:"奥斯曼",
  zh:"郁金香宫阙", en:"ottoman tulip",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"宫窗格栅滤光，光斑成排",
  camera:"半身，头巾珠宝层次入画",
  faces:{
    bone:{ t:"oval face, refined nose, composed features",
      c:"椭圆脸，鼻型精细，五官端正" },
    skin:{ t:"light olive skin",
      c:"浅橄榄肤色" },
    eye:{ t:"large hooded eyes, long lashes, joined slim brows",
      c:"大眼微深陷，睫毛长，细而相连的眉（与波斯一脉）" },
    form:{ t:"graceful, layered in loose robes",
      c:"体态优雅，层叠宽袍" },
    aura:{ t:"dignified, watchful, tulip-era refinement",
      c:"端庄有度，郁金香时代的精致" },
    hair:{ t:"covered or draped; visible fringe over the brow",
      c:"发巾垂坠，额前留一绺碎发" },
    dress:{ t:"kaftan silks with tulip motifs, jeweled headpiece",
      c:"郁金香纹样的 kaftan 丝绸，珠宝头饰成套" }
  },
  read:"奥斯曼与波斯同属连眉审美圈，但奥斯曼多了「格栅光影」这个空间特征 —— "
    + "光透过窗格切成排状光斑，场景里写它，图的时代感立刻出来。",
  fact:["郁金香纹样与 kaftan 为奥斯曼有据工艺（郁金香时代）"] },

{ num:"AL-063", cat:"暖调柔和", status:"written", region:"西亚与北非", culture:"黎凡特",
  zh:"黎凡特晚风", en:"levantine",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"地中海傍晚的暖光，白墙与蓝窗框",
  camera:"半身，卷发与白墙色块",
  faces:{
    bone:{ t:"oval face, straight nose, soft jaw",
      c:"椭圆脸，鼻梁直，下颌柔和" },
    skin:{ t:"olive skin with golden undertone",
      c:"橄榄肤带金底调" },
    eye:{ t:"hazel to dark eyes, softly arched brows",
      c:"榛色到深棕的眼，眉形柔弧" },
    form:{ t:"slender, easy movement",
      c:"身形匀称，动作松弛" },
    aura:{ t:"warm, talkative ease, coastal",
      c:"温暖、健谈的松弛感，海滨气" },
    hair:{ t:"dark voluminous waves, loose",
      c:"深色蓬松卷发，自然披散" },
    dress:{ t:"embroidered cotton dress, silver coins necklace",
      c:"刺绣棉裙，银币项链（黎凡特山村传统）" }
  },
  read:"这一型是「地中海东岸的日常」，不戴面纱不铺金 —— "
    + "它的识别点是橄榄肤 + 深卷发 + 银币项链的朴素组合。",
  fact:["银币项链与刺绣棉裙为黎凡特山村有据传统"] },

{ num:"AL-064", cat:"中性硬朗", status:"written", region:"西亚与北非", culture:"阿马齐格",
  zh:"阿特拉斯银饰", en:"amazigh atlas",
  namedRef:{ zh:"（地域类型，非特定真人）", kind:"type" },
  rights:"R0", risk:"none",
  light:"阿特拉斯山地的清冽高光，空气通透",
  camera:"半身，银饰与面纹细节",
  faces:{
    bone:{ t:"strong bone structure, high cheekbones, straight brow",
      c:"骨相硬朗，颧骨高，眉骨平直" },
    skin:{ t:"sun-bronzed skin",
      c:"日晒铜色肤" },
    eye:{ t:"dark amber eyes, steady gaze",
      c:"深琥珀色眼，目光稳" },
    form:{ t:" sturdy, mountain-strong",
      c:"体格结实，有山地劳作的力度" },
    aura:{ t:"independent, weathered pride",
      c:"自立，带风霜的骄傲" },
    hair:{ t:"black hair braided, veiled or loose",
      c:"黑发编辫，或披或巾" },
    dress:{ t:"indigo-striped wrap, massive engraved silver fibulae, facial tattoo marks",
      c:"靛蓝条纹披裹，大型錾刻银扣针（fibula），下颌与额头有传统面纹刺青" }
  },
  read:"两条硬信息：**大型银扣针**（固定披裹的真服饰件，不是装饰）与"
    + "**传统面纹**（阿马齐格女性的地域性刺青，有具体语义）。",
  fact:["fibula 银扣针与面纹刺青为阿马齐格（柏柏尔）有据传统",
        "Amazigh 为该民族自称，'柏柏尔'为旧称，界面与词面优先用自称"] }
);
