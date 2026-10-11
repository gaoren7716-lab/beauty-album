/* ============================================================
 * mediums.js —— 视觉门类 MED-
 *
 * 门类 = 这张图「怎么画出来」。它回答的不是「画什么」，
 * 也不是「长什么样」，而是「用什么媒介、什么技法把它呈现出来」。
 *
 * ------------------------------------------------------------
 * 为什么它必须是独立的一根轴，不能塞进主题或模式
 * ------------------------------------------------------------
 * 主题能改服装和场景，模式能管要不要写字，
 * 但这两根轴都碰不到「这是照片还是油画」。
 * 缺了门类的后果不是分类不够细，是**一个具体的能力缺失**：
 * 本库出不来动漫风，也出不来油画风——
 * 48 条编号无论怎么配，出来永远是同一批照片味的写实人像。
 *
 * ------------------------------------------------------------
 * rewrite 是这个轴的核心，也是最容易做错的地方
 * ------------------------------------------------------------
 * 门类**不改身份层的内容，只改它的表达方式**。
 *
 *   骨相「颅顶饱满偏高，颧骨外扩，下颌角内收成锐角」—— 不变，
 *   换了就不是同一个人了。
 *
 *   肤质「哑光，反光极弱，毛孔细小但存在」—— 这是**照片专属的表达**。
 *   门类是赛璐璐时，它必须换成「肤色平涂，无毛孔，明暗以块面区分」。
 *   不换的话，门类就只是一个贴在末尾的标签：
 *   模型读到「照片质感」和「赛璐璐」会各让一步，
 *   出来是「画风像照片的动漫人」—— 两边都不像。
 *
 * 所以 rewrite 里写的不是「另一种长相」，是「同一个人在另一种媒介里的说法」。
 *
 * ------------------------------------------------------------
 * caution 也不能省
 * ------------------------------------------------------------
 * 门类有它表达不出来的东西。赛璐璐会把下颌角内收成锐角这种
 * 极端骨相磨圆，因为那种锐度在平涂里画不出来。
 * 不写这一条，使用者会以为是编号写错了。
 * ============================================================ */
if (typeof module !== "undefined" && module.exports) {
  var _MD = require("./data-core.js");
  var MEDIUMS = _MD.MEDIUMS;
}

/* en 是媒介词。写法上有一个硬要求：
   **必须写"怎么做出来的"，不能只写"是什么"。**
   「anime」模型只当成一个标签；
   「anime with clean lineart and flat cel shading」它才知道该画成什么样。
   neg 同理 —— 门类的负面词负责压掉**另一个门类的特征**，
   那才是它在这里的真正作用。 */
MEDIUMS.push(

{ k:"photo", zh:"实拍", cat:"写实", order:1, isDefault:true,
  desc:"照片级写实。默认档：编号八面按字面意思画就是照片人像",
  en:"photorealistic editorial portrait, natural skin texture, realistic light falloff, "
   + "shot on 85mm lens, shallow depth of field, fine film grain",
  neg:["线稿","平涂色块","油画笔触","3D 渲染感","卡通行程"],
  rewrite:{},
  caution:"编号里的肤质面写的是真实皮肤（毛孔、油光）——"
    + "换到任何非写实门类时，那一句都要被改写，否则会把照片味带进去。" },

{ k:"oil", zh:"古典油画", cat:"绘画", order:2,
  desc:"欧洲古典油画。厚涂、可见笔触、暖调罩染",
  en:"classical oil painting, visible impasto brushwork, glazing and scumbling, "
   + "warm amber tonal range, chiaroscuro lighting, aged canvas texture, "
   + "old master portraiture",
  neg:["照片锐度","现代妆感","文字","水印"],
  rewrite:{
    skin:"肤色以罩染过渡，颧骨处留厚涂高光，皮肤不追求毛孔细节",
    eye:"眼窝用暗部压出，眼白不做高饱和纯白",
    form:"轮廓由明暗交界线交代，边缘允许柔化"
  },
  caution:"油画与写实门类的负面对冲：油画的 brushwork 会被 photo 的"
    + " natural skin texture 拉回照片。与 anime 门类是 clash 级冲突。" },

{ k:"ink", zh:"工笔重彩", cat:"绘画", order:3,
  desc:"中国工笔。重彩敷染、线描起稿、绢本设色",
  en:"Chinese gongbi painting, fine gongbi linework, heavy mineral pigment layering, "
   + "silk texture, delicate colour gradation, decorative detail density",
  neg:["厚涂笔触","油画质感","照片噪点","三维渲染"],
  rewrite:{
    skin:"面部以细线勾勒轮廓，肤色平涂后罩染，腮部淡红",
    eye:"眼型以工笔线条细细画出，眼尾上挑用笔锋收",
    form:"衣纹线条清晰，身体轮廓以线界定"
  },
  caution:"工笔与写实是同一维度的两端（都靠线与平涂）。"
    + "配写实光影会变成「有油画笔触的工笔画」。" },

{ k:"anime", zh:"动漫赛璐璐", cat:"二维", order:4,
  desc:"日本动画赛璐璐。清晰线稿、平涂色块、皮肤不画毛孔",
  en:"anime illustration, clean lineart, cel shading with two-tone shadow, "
   + "flat colour fills, simplified facial features, large expressive eyes, "
   + "vibrant but controlled palette",
  neg:["写实毛孔","照片噪点","皮肤油光","3D 渲染感","油画笔触","照片锐度"],
  rewrite:{
    skin:"肤色平涂无毛孔，明暗以块面区分，高光为单一色块",
    eye:"眼型由线条与高光点表现，虹膜画出渐层与小高光",
    form:"轮廓线清晰干净，身体比例向漫画化偏移"
  },
  caution:"赛璐璐会把极端骨相磨圆 —— 下颌角内收成锐角这种锐度，"
    + "在平涂里画不出来。配「冷调锐利」类编号时骨相损失最大。"
    + "这是画法的限制，不是编号写错了。" },

{ k:"semi", zh:"半厚涂", cat:"二维", order:5,
  desc:"介于赛璐璐与厚涂之间。当代插画最常用的商用风格",
  en:"semi-realistic anime illustration, soft painterly shading, "
   + "selective lineart, subtle texture, modern light illustration",
  neg:["赛璐璐平涂","照片噪点","油画笔触"],
  rewrite:{
    skin:"肤色有渐变过渡但无毛孔，高光柔和",
    eye:"眼型介于写实与动漫之间，虹膜有层次",
    form:"轮廓线弱化，以明暗交代体积"
  },
  caution:"半厚涂是折中门类，与 anime / photo 都能配，"
    + "但与 anime 同时开会被判 warn —— 两者只差在渲染密度。" },

{ k:"thick", zh:"厚涂", cat:"二维", order:6,
  desc:"厚涂插画。无明显线稿，全靠明暗与笔触堆体积",
  en:"painted digital illustration, thick painterly rendering, no lineart, "
   + "volumetric shading, visible brush texture, rich colour blending",
  neg:["线稿","平涂色块","照片噪点"],
  rewrite:{
    skin:"肤色由笔触堆出体积，毛孔不画",
    eye:"眼窝用厚涂暗部压出，眼睛是整张脸的高光点",
    form:"体积靠明暗交界，轮廓边缘柔化"
  },
  caution:"厚涂 + 实拍光影（单侧硬光 + 近纯黑暗部）容易过头 —— "
    + "本库编号的光影面就是按实拍写的，配厚涂会出脏。" },

{ k:"3d", zh:"3D 渲染", cat:"三维", order:7,
  desc:"三维角色渲染。真实几何、非真实感渲染优先",
  en:"3D character render, physically based materials, subsurface skin shading, "
   + "studio HDRI lighting, clean silhouette, octane render",
  neg:["手绘笔触","线稿","平涂色块","照片背景杂物"],
  rewrite:{
    skin:"皮肤有次表面散射与真实高光，但无毛孔细节",
    eye:"眼球有真实湿润高光与折射，虹膜有深度",
    form:"体积完全由几何与光照决定，轮廓精确"
  },
  caution:"3D 与油画是 clash：一个是物理光照，一个是人工笔触。"
    + "两边的负面对冲很强，混起来是「塑料质感的油画」。" },

{ k:"game", zh:"游戏原画", cat:"三维", order:8,
  desc:"游戏角色设定。概念图口径，强调可读性与装备叙事",
  en:"game character concept art, character design sheet, "
   + "readable silhouette, deliberate costume detail, key art lighting",
  neg:["照片背景","随意构图","文字","水印"],
  rewrite:{
    skin:"皮肤服务于角色可读性，细节让位于轮廓与色块",
    eye:"眼神明确，作为角色识别点",
    form:"身形比例服务于角色定位，剪影必须可辨"
  },
  caution:"游戏原画与实拍门类是 warn：概念图默认会把人物画得比真人更" +
    "理想化，配 photo 的肤质面（冷调白皙 + 毛孔）会互相拉扯。" }
);