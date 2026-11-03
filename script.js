/* ============================================
   🌌 宠物星球 · Pet Planet
   🌙 交互脚本 v4（登录守卫 + 分步下拉）
   ============================================ */

/* ============================================================
   🔐 登录 / 注册 / 守卫
   ============================================================ */
const AUTH_USER_KEY    = "pet_planet_auth_user";
const AUTH_ACCOUNTS_KEY = "pet_planet_auth_accounts";

// 首次进入，预置演示账号
(function seedDemoAccount() {
  const raw = localStorage.getItem(AUTH_ACCOUNTS_KEY);
  const accounts = raw ? JSON.parse(raw) : {};
  if (!accounts["星星"]) {
    accounts["星星"] = { password: "1234", created: Date.now() };
    localStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
  }
})();

function isLoggedIn() {
  return !!localStorage.getItem(AUTH_USER_KEY);
}
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "null"); } catch (e) { return null; }
}
function setCurrentUser(u) { localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u)); }
function clearCurrentUser() { localStorage.removeItem(AUTH_USER_KEY); }

// 页面守卫：未登录 → 隐藏主内容 + 显示 auth-screen
function initAuthGuard() {
  // 弹窗里的登录 / 注册 切换
  document.querySelectorAll(".auth-switch").forEach((el) => {
    el.addEventListener("click", () => {
      const target = el.dataset.go;
      document.getElementById("loginForm").classList.toggle("hidden", target !== "login");
      document.getElementById("registerForm").classList.toggle("hidden", target !== "register");
      clearAuthTips();
    });
  });

  // 登录按钮
  document.getElementById("authLoginBtn").addEventListener("click", doLogin);
  document.getElementById("authPassword").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
  document.getElementById("authAccount").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });

  // 注册按钮
  document.getElementById("authRegisterBtn").addEventListener("click", doRegister);
  ["regAccount", "regPassword", "regPassword2"].forEach((id) => {
    document.getElementById(id).addEventListener("keydown", (e) => { if (e.key === "Enter") doRegister(); });
  });

  // Nav 登录 / 退出
  document.getElementById("navLoginBtn").addEventListener("click", () => {
    document.getElementById("loginForm").classList.remove("hidden");
    document.getElementById("registerForm").classList.add("hidden");
    showAuthScreen();
  });
  document.getElementById("navLogout").addEventListener("click", doLogout);
}

function clearAuthTips() {
  document.getElementById("authTip").textContent = "";
  document.getElementById("authTip").classList.remove("ok");
  document.getElementById("regTip").textContent = "";
  document.getElementById("regTip").classList.remove("ok");
}

function doLogin() {
  const username = document.getElementById("authAccount").value.trim();
  const password = document.getElementById("authPassword").value;
  const tip = document.getElementById("authTip");
  clearAuthTips();
  if (!username || !password) { tip.textContent = "请输入昵称和密码"; return; }

  const accounts = JSON.parse(localStorage.getItem(AUTH_ACCOUNTS_KEY) || "{}");
  const acc = accounts[username];
  if (!acc || acc.password !== password) {
    tip.textContent = "昵称或密码不对哦～";
    tip.classList.remove("ok");
    return;
  }
  const user = { username, loginAt: Date.now() };
  setCurrentUser(user);
  tip.textContent = "登录成功！正在进入星球...";
  tip.classList.add("ok");
  setTimeout(() => unlockPage(user), 400);
}

function doRegister() {
  const username = document.getElementById("regAccount").value.trim();
  const p1 = document.getElementById("regPassword").value;
  const p2 = document.getElementById("regPassword2").value;
  const tip = document.getElementById("regTip");
  clearAuthTips();
  if (!username) { tip.textContent = "先取个昵称吧～"; return; }
  if (p1.length < 4) { tip.textContent = "密码至少 4 位哦"; return; }
  if (p1 !== p2) { tip.textContent = "两次密码不一样哦"; return; }

  const accounts = JSON.parse(localStorage.getItem(AUTH_ACCOUNTS_KEY) || "{}");
  if (accounts[username]) { tip.textContent = "这个昵称已经被占用啦"; return; }
  accounts[username] = { password: p1, created: Date.now() };
  localStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));

  const user = { username, loginAt: Date.now() };
  setCurrentUser(user);
  tip.textContent = "欢迎来到星球！正在进入...";
  tip.classList.add("ok");
  setTimeout(() => unlockPage(user), 500);
}

function doLogout() {
  if (!confirm("确定要离开星球吗？")) return;
  clearCurrentUser();
  // 保留宠物 / 对话 / 闹钟（用户数据），只退出登录
  lockPage();
  document.getElementById("authAccount").value = "";
  document.getElementById("authPassword").value = "";
}

/* ============================================================
   🛤️ 轻量 Hash Router（6 个独立路由页面）
   ============================================================ */
const ROUTES = {
  "/home":     { view: "#hero",     title: "首页 · 宠物星球",  protect: false },
  "/create":   { view: "#create",   title: "创建宠物",         protect: true  },
  "/play":     { view: "#play",     title: "陪它玩",           protect: true  },
  "/alarm":    { view: "#alarm",    title: "宠物闹钟",         protect: true  },
  "/memories": { view: "#memories", title: "回忆墙",           protect: true  },
  "/farewell": { view: "#farewell", title: "告别",             protect: true  },
};

const Router = {
  current: "/home",
  go(path) { if (path !== this.current) location.hash = path; },
  init() {
    window.addEventListener("hashchange", () => this.render());
    if (!location.hash) location.hash = "/home";
    this.render();
  },
  render() {
    const path = (location.hash || "#/home").replace(/^#/, "") || "/home";
    const route = ROUTES[path] || ROUTES["/home"];

    // 🔐 路由守卫
    if (route.protect && !isLoggedIn()) {
      lockPage();
      document.getElementById("loginForm").classList.remove("hidden");
      document.getElementById("registerForm").classList.add("hidden");
      document.title = "登录 · 宠物星球";
      return;
    }

    // 显示顶部 Nav + 隐藏 auth 弹窗
    document.getElementById("authScreen").classList.add("hidden");

    // 🎯 单显目标视图，隐藏其他
    Object.entries(ROUTES).forEach(([key, r]) => {
      const el = document.querySelector(r.view);
      if (el) el.classList.toggle("hidden", key !== path);
    });

    // 🏷️ Nav active 态
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove("active"));
    const active = document.querySelector(`.nav-links a[href="#${path}"]`);
    if (active) active.classList.add("active");

    // 👤 Nav 用户态
    updateNavUser();

    // 📄 页面标题
    document.title = route.title + " · 宠物星球";

    this.current = path;
    window.scrollTo({ top: 0, behavior: "auto" });
  },
};

function updateNavUser() {
  const user = getCurrentUser();
  const loginBtn = document.getElementById("navLoginBtn");
  const userBox  = document.getElementById("navUser");
  if (user) {
    loginBtn.classList.add("hidden");
    userBox.classList.remove("hidden");
    document.getElementById("navName").textContent = user.username;
    const avatar = document.querySelector(".nav-avatar");
    if (avatar) avatar.textContent = user.username.charAt(0).toUpperCase();
  } else {
    loginBtn.classList.remove("hidden");
    userBox.classList.add("hidden");
  }
}

// 覆盖 auth 模块里的同名函数（让它们只做 auth 层面的事，router 负责视图）
function lockPage() {
  Object.values(ROUTES).forEach((r) => document.querySelector(r.view)?.classList.add("hidden"));
  document.getElementById("authScreen").classList.remove("hidden");
  updateNavUser();
}
function unlockPage() { Router.render(); }
function showAuthScreen() { lockPage(); }

/* ---------------- 0. 星空装饰 ---------------- */
(function initDecor() {
  const decor = document.getElementById("floatingDecor");
  const items = ["🌸", "✨", "💫", "⭐", "🌙", "💕", "☁️"];
  for (let i = 0; i < 18; i++) {
    const span = document.createElement("span");
    span.textContent = items[Math.floor(Math.random() * items.length)];
    span.style.left = Math.random() * 100 + "%";
    span.style.animationDuration = 12 + Math.random() * 18 + "s";
    span.style.animationDelay = Math.random() * 15 + "s";
    span.style.fontSize = 14 + Math.random() * 18 + "px";
    decor.appendChild(span);
  }
})();

/* ============================================================
   🐾 世界品种匹配库（猫科 25+ / 狗科 20+，扁平化）
   每个品种自带 emoji / name / desc / 可选毛色 / 可选体型
   ============================================================ */
const BREED_DB = {
  cat: [
    { key: "american_shorthair",  emoji: "🐱", name: "美国短毛猫",  desc: "圆圆胖胖的小太阳，世界上最完美的配色～", colors: ["orange","tabby","black","white"], bodies: ["round","normal","chubby"] },
    { key: "british_shorthair",   emoji: "🐈", name: "英国短毛猫",  desc: "微胖但优雅，脾气好，叫声甜甜的",         colors: ["grey","blue","cream"],             bodies: ["chubby","round"] },
    { key: "chinese_lihua",       emoji: "🐈‍⬛", name: "中华田园猫", desc: "中国本土小勇士，自带阳光能量",         colors: ["orange","tabby","black","white"], bodies: ["normal","round","chubby"] },
    { key: "oriental_shorthair",  emoji: "🐱", name: "东方短毛猫",  desc: "瘦瘦长长但颜色超鲜艳",                 colors: ["orange","black","white","grey"],   bodies: ["slim"] },
    { key: "himalayan",           emoji: "😺", name: "喜马拉雅猫",  desc: "毛茸茸的小云朵里藏着一颗橘色的心",     colors: ["orange","cream","grey"],           bodies: ["fluffy","round"] },
    { key: "bombay",              emoji: "🐈‍⬛", name: "孟买猫",     desc: "像个黑色小皮球，晚上看不见眼睛，白天是两颗星星", colors: ["black"],                         bodies: ["round","normal"] },
    { key: "black_persian",       emoji: "😸", name: "烟黑色波斯",  desc: "毛茸茸的小黑狮子，走路带风",           colors: ["black"],                           bodies: ["fluffy","chubby"] },
    { key: "persian_white",       emoji: "😻", name: "波斯白猫",   desc: "行走的棉花糖，眼睛像蓝宝石",           colors: ["white"],                           bodies: ["fluffy","round"] },
    { key: "white_shorthair",     emoji: "🐈", name: "白色英短",    desc: "圆滚滚的小北极熊，在屋里滚来滚去",     colors: ["white"],                           bodies: ["round","chubby"] },
    { key: "russian_blue",        emoji: "🐱", name: "俄罗斯蓝猫",   desc: "灰蓝色短毛，温柔安静",                 colors: ["grey"],                            bodies: ["slim","normal"] },
    { key: "siberian_forest",     emoji: "😼", name: "西伯利亚森林猫", desc: "长毛大个子，温柔的巨人",            colors: ["grey","tabby","brown"],            bodies: ["fluffy","chubby"] },
    { key: "burmese",             emoji: "🐱", name: "缅甸猫",     desc: "温暖的棕调，像一杯浓缩咖啡",           colors: ["brown"],                           bodies: ["normal","round"] },
    { key: "ocicat",              emoji: "🐈‍⬛", name: "奥西猫",    desc: "豹纹棕，气质野性又粘人",               colors: ["brown","tabby"],                   bodies: ["slim","normal"] },
    { key: "manx_calico",         emoji: "🐈", name: "三花曼基康", desc: "三色小团子，运气拉满的招财猫",         colors: ["calico"],                          bodies: ["round","chubby"] },
    { key: "calico_cat",          emoji: "🐱", name: "三色中华田园", desc: "经典三花，独一无二的花纹",           colors: ["calico"],                          bodies: ["normal","round"] },
    { key: "bengal",              emoji: "🐱", name: "孟加拉豹猫",  desc: "瘦瘦长长的花纹像小豹子",               colors: ["tabby","brown"],                   bodies: ["slim","normal"] },
    { key: "norwegian_forest",    emoji: "😽", name: "挪威森林虎斑", desc: "长毛大虎斑，森林里的小王子",         colors: ["tabby","brown","grey"],            bodies: ["fluffy","chubby"] },
    { key: "siamese",             emoji: "🐱", name: "暹罗猫",     desc: "经典蓝眼睛+黑脸，话超多又粘人",       colors: ["siamese"],                         bodies: ["slim","normal"] },
    { key: "ragdoll",             emoji: "🐈", name: "布偶猫",     desc: "重点色的大软糖，抱起来像会融化",       colors: ["siamese"],                         bodies: ["round","chubby","fluffy"] },
    { key: "balinese",            emoji: "😻", name: "巴厘猫",     desc: "长毛暹罗，优雅的长公主",               colors: ["siamese"],                         bodies: ["fluffy","slim"] },
    { key: "maine_coon",          emoji: "🦁", name: "缅因猫",    desc: "温柔的巨人，毛茸茸的小狮子",           colors: ["tabby","brown","black","white"],   bodies: ["fluffy","chubby"] },
    { key: "scottish_fold",       emoji: "🐱", name: "苏格兰折耳猫", desc: "耳朵垂下来的小甜饼，圆圆的超治愈",   colors: ["grey","orange","white","calico"], bodies: ["round","chubby"] },
    { key: "munchkin",            emoji: "🐈", name: "曼基康矮脚", desc: "小短腿！像腊肠一样可爱",               colors: ["orange","calico","tabby"],         bodies: ["round","normal"] },
    { key: "sphynx",              emoji: "🤍", name: "斯芬克斯无毛猫", desc: "光着身子的小外星猫，摸起来像热乎的小桃子", colors: ["white","grey","black"],        bodies: ["slim","normal"] },
    { key: "abyssinian",          emoji: "🐱", name: "阿比西尼亚猫", desc: "像古埃及法老的小豹子，气质高贵",    colors: ["tabby","brown"],                   bodies: ["slim","normal"] },
  ],
  dog: [
    { key: "shiba",             emoji: "🐶", name: "柴犬",   desc: "圆滚滚的小狐狸，笑起来治愈全世界", colors: ["orange","black"],           bodies: ["round","normal"] },
    { key: "akita",              emoji: "🐕", name: "秋田犬", desc: "忠诚勇敢，微笑天使本狗",           colors: ["orange","white"],           bodies: ["normal","round"] },
    { key: "golden_retriever",   emoji: "🦮", name: "金毛", desc: "毛茸茸的大太阳，世界上最温柔的存在", colors: ["orange","cream"],         bodies: ["fluffy","chubby"] },
    { key: "chinese_pastoral",   emoji: "🐕", name: "中华田园犬", desc: "忠诚又机灵，土狗是最棒的小狗", colors: ["orange","black","white"],  bodies: ["normal"] },
    { key: "poodle",             emoji: "🐩", name: "贵宾/泰迪", desc: "圆滚滚的小毛球，聪明又会撒娇",    colors: ["black","white","brown","grey"], bodies: ["round","chubby"] },
    { key: "labrador_black",     emoji: "🐕‍🦺", name: "拉布拉多", desc: "忠诚聪明，工作犬小能手",       colors: ["black","brown","cream"],   bodies: ["normal","round"] },
    { key: "newfoundland",       emoji: "🦮", name: "纽芬兰犬", desc: "毛茸茸的大黑熊，温柔的大狗狗",   colors: ["black","brown"],           bodies: ["fluffy","chubby"] },
    { key: "samoyed",            emoji: "🐕", name: "萨摩耶", desc: "白色微笑天使，走路像在踩棉花",   colors: ["white"],                   bodies: ["fluffy","round"] },
    { key: "bichon_frise",       emoji: "🐶", name: "比熊",   desc: "圆圆的白色小棉花，长不大的宝宝", colors: ["white"],                   bodies: ["round","chubby"] },
    { key: "west_highland",      emoji: "🦴", name: "西高地白梗", desc: "毛茸茸的小雪球，性格倔强又可爱", colors: ["white"],                 bodies: ["round","normal"] },
    { key: "schnauzer",          emoji: "🐩", name: "雪纳瑞", desc: "灰色小胡子爷爷，聪明又贴心",     colors: ["grey","black"],            bodies: ["round","normal"] },
    { key: "whippet",            emoji: "🐕", name: "惠比特", desc: "瘦瘦长长的速度王子，风一样的小狗", colors: ["grey","black","brown"], bodies: ["slim"] },
    { key: "alaskan_malamute",   emoji: "🦮", name: "阿拉斯加", desc: "灰色绒毛大团子，大型犬里的小可爱", colors: ["grey","black"],         bodies: ["fluffy","chubby"] },
    { key: "corgi",              emoji: "🐶", name: "柯基",   desc: "短腿大屁股，摇起来能飞上天",     colors: ["brown","orange","calico"], bodies: ["round","chubby"] },
    { key: "border_collie",      emoji: "🐕", name: "边牧",   desc: "瘦瘦长长的聪明蛋，智商第一",     colors: ["brown","tabby","black"],   bodies: ["slim","normal"] },
    { key: "cocker_spaniel",     emoji: "🦮", name: "可卡",   desc: "毛茸茸的大耳朵，跑起来会飞",     colors: ["brown","tabby"],           bodies: ["fluffy","normal"] },
    { key: "dalmation",          emoji: "🐕", name: "斑点狗", desc: "圆滚滚的斑点大团子",             colors: ["calico","white"],          bodies: ["round","normal"] },
    { key: "german_shepherd",    emoji: "🐕‍🦺", name: "德国牧羊犬", desc: "瘦瘦长长的黑背，威严又温柔", colors: ["tabby","black","brown"], bodies: ["slim","normal"] },
    { key: "husky",              emoji: "🦮", name: "哈士奇", desc: "蓝眼睛毛茸茸的二哈，拆家小能手", colors: ["grey","black","white"],    bodies: ["fluffy","normal"] },
    { key: "shiba_inu",          emoji: "🐶", name: "柴犬(赤色)", desc: "网红小狐狸，笑起来比太阳还暖", colors: ["orange"],               bodies: ["normal","round"] },
    { key: "pomernian",          emoji: "🐩", name: "博美",   desc: "小小的毛球小狐狸",               colors: ["orange","white","black"],  bodies: ["round","chubby"] },
    { key: "bulldog",            emoji: "🐶", name: "法斗/英斗", desc: "扁脸小憨憨，走路一晃一晃",     colors: ["calico","white","brown"], bodies: ["round","chubby"] },
  ],
};

// 毛色下拉选项（带 label）
const COLOR_OPTIONS = [
  { value: "orange", label: "🍊 橘色" },
  { value: "black", label: "🖤 黑色" },
  { value: "white", label: "🤍 白色" },
  { value: "grey", label: "🩶 灰色" },
  { value: "blue", label: "💙 蓝灰色" },
  { value: "brown", label: "🟫 棕色" },
  { value: "cream", label: "🍼 奶油色" },
  { value: "calico", label: "🎨 三花/玳瑁" },
  { value: "tabby", label: "📏 虎斑条纹" },
  { value: "siamese", label: "👁️ 重点色/黑脸" },
];

// 体型下拉选项
const BODY_OPTIONS = [
  { value: "slim", label: "🧍 瘦瘦长长" },
  { value: "normal", label: "🙂 刚刚好" },
  { value: "round", label: "🟠 圆滚滚的小肉球" },
  { value: "chubby", label: "🐷 有点微胖很可爱" },
  { value: "fluffy", label: "☁️ 毛茸茸像一团云" },
];

/* ============================================================
   🗄️ localStorage 键
   ============================================================ */
const PET_KEY   = "pet_planet_pet_v3";
const CHAT_KEY  = "pet_planet_chat";
const ALARM_KEY = "pet_planet_alarm";

/* ============================================================
   🐾 宠物数据 schema
   ============================================================ */
const defaultPet = {
  name: "小可爱",
  family: "",
  breedKey: "",
  breedName: "神秘小伙伴",
  breedEmoji: "🐾",
  breedDesc: "独一无二的特别小伙伴",
  color: "",
  body: "",
  age: null,
  sound: null,
  costume: "",
  stats: { love: 80, hunger: 70, energy: 90 },
  sleep: false,
};

let pet = loadPet();
let audioCtx = null;
let alarmTimer = null;

function loadPet() {
  try {
    const saved = localStorage.getItem(PET_KEY);
    if (saved) {
      const p = JSON.parse(saved);
      return { ...defaultPet, ...p, sound: null };
    }
  } catch (e) {}
  return { ...defaultPet };
}
function savePet() {
  const toSave = { ...pet };
  delete toSave.sound;
  localStorage.setItem(PET_KEY, JSON.stringify(toSave));
}

/* ============================================================
   🔊 声音上传（支持 MP3 / WAV / MP4）
   ============================================================ */
const soundInput = document.getElementById("soundInput");
let petSoundIsVideo = false;

soundInput.addEventListener("change", (e) => {
  const f = e.target.files[0]; if (!f) return;
  petSoundIsVideo = /^video\//.test(f.type) || /\.mp4$/i.test(f.name);
  pet.sound = URL.createObjectURL(f);
  document.getElementById("soundPlaceholder").classList.add("hidden");
  document.getElementById("soundPreview").classList.remove("hidden");
});

document.getElementById("playSoundBtn").addEventListener("click", () => {
  if (!pet.sound) return;
  try {
    const el = petSoundIsVideo
      ? Object.assign(document.createElement("video"), { src: pet.sound, controls: true })
      : new Audio(pet.sound);
    el.play();
    if (petSoundIsVideo) {
      el.style.cssText = "position:fixed;inset:0;margin:auto;width:80vmax;height:80vh;object-fit:contain;background:#000;z-index:9999;border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,0.5);";
      document.body.appendChild(el);
      el.addEventListener("ended", () => el.remove());
      el.addEventListener("click", () => el.remove());
    }
  } catch (e) { alert("播放失败，请重新上传"); }
});

/* ============================================================
   🔽 分步下拉联动
   ============================================================ */
const $ = (id) => document.getElementById(id);
const familySel = $("petFamily");
const breedSel  = $("petBreed");
const colorSel  = $("petColor");
const bodySel   = $("petBody");
const breedPreview = $("breedPreview");

function clearSelect(sel, hint) {
  sel.innerHTML = `<option value="">${hint}</option>`;
  sel.disabled = true;
}

function fillSelect(sel, items, hint) {
  sel.innerHTML = `<option value="">${hint}</option>`;
  items.forEach((it) => {
    const opt = document.createElement("option");
    opt.value = it.value;
    opt.textContent = it.label;
    sel.appendChild(opt);
  });
  sel.disabled = false;
}

function refreshPreview(breed) {
  if (!breed) {
    $("breedEmoji").textContent = pet.family === "dog" ? "🐶" : "🐱";
    $("breedName").textContent = "尚未匹配";
    $("breedDesc").textContent = "按上方顺序选择 → 自动匹配星球上它的专属样式";
    breedPreview.classList.remove("active");
  } else {
    $("breedEmoji").textContent = breed.emoji;
    $("breedName").textContent = breed.name;
    $("breedDesc").textContent = breed.desc;
    breedPreview.classList.add("active");
  }
}

function onFamilyChange() {
  const family = familySel.value;
  // 清理下游
  clearSelect(breedSel, "← 请先选猫科/狗科");
  clearSelect(colorSel, "← 请先选品种");
  clearSelect(bodySel,  "← 请先选品种");
  pet.family = family;
  pet.breedKey = ""; pet.breedName = ""; pet.breedEmoji = ""; pet.breedDesc = "";
  pet.color = ""; pet.body = "";
  refreshPreview(null);

  if (!family) return;
  const breeds = BREED_DB[family] || [];
  fillSelect(breedSel, breeds.map((b) => ({ value: b.key, label: `${b.emoji} ${b.name}` })), "从品种库里选一个");
}

function onBreedChange() {
  const family = familySel.value;
  const key = breedSel.value;
  // 清理下游
  clearSelect(colorSel, "← 请先选品种");
  clearSelect(bodySel,  "← 请先选品种");
  pet.color = ""; pet.body = "";

  if (!key || !family) { refreshPreview(null); return; }

  const breed = (BREED_DB[family] || []).find((b) => b.key === key);
  if (!breed) { refreshPreview(null); return; }

  pet.breedKey = breed.key;
  pet.breedName = breed.name;
  pet.breedEmoji = breed.emoji;
  pet.breedDesc = breed.desc;
  refreshPreview(breed);

  // 填 color / body 下拉：仅显示该品种支持的选项
  const colorOpts = COLOR_OPTIONS.filter((c) => breed.colors.includes(c.value));
  const bodyOpts  = BODY_OPTIONS.filter((b) => breed.bodies.includes(b.value));
  fillSelect(colorSel, colorOpts, "选一个毛色");
  fillSelect(bodySel,  bodyOpts,  "选一个体型");
}

function onColorChange() {
  pet.color = colorSel.value;
}
function onBodyChange() {
  pet.body = bodySel.value;
}

familySel.addEventListener("change", onFamilyChange);
breedSel.addEventListener("change", onBreedChange);
colorSel.addEventListener("change", onColorChange);
bodySel.addEventListener("change", onBodyChange);

/* ============================================================
   🔁 从 localStorage 回填
   ============================================================ */
function restoreFormFromPet() {
  $("petName").value = pet.name || "";
  $("petAge").value  = pet.age  ?? "";
  if (pet.family) {
    familySel.value = pet.family;
    onFamilyChange();
    if (pet.breedKey) {
      breedSel.value = pet.breedKey;
      onBreedChange();
      if (pet.color) colorSel.value = pet.color;
      if (pet.body)  bodySel.value  = pet.body;
    }
  }
  // 上传预览
  if (pet.sound) {
    $("soundPlaceholder").classList.add("hidden");
    $("soundPreview").classList.remove("hidden");
  }
  // 聊天机器人头像
  const chatAvatar = $("chatBotAvatar");
  if (chatAvatar) chatAvatar.textContent = pet.breedEmoji || (pet.family === "dog" ? "🐶" : "🐱");
}

/* ============================================================
   💾 保存 / 重置
   ============================================================ */
document.getElementById("savePetBtn").addEventListener("click", () => {
  const name = $("petName").value.trim();
  if (name) pet.name = name;
  const ageVal = $("petAge").value.trim();
  pet.age = ageVal ? Number(ageVal) : null;
  savePet();
  renderPet();
  document.getElementById("chatBotAvatar").textContent = pet.breedEmoji || (pet.family === "dog" ? "🐶" : "🐱");
  showMood("好开心呀~ 🥰");
  Router.go("/play");
});

document.getElementById("resetPetBtn").addEventListener("click", () => {
  pet = { ...defaultPet, sound: null };
  localStorage.removeItem(PET_KEY);
  $("petName").value = "";
  $("petAge").value = "";
  familySel.value = ""; onFamilyChange();
  $("breedPreview").classList.remove("active");
  $("breedEmoji").textContent = "🐱";
  $("breedName").textContent = "尚未匹配";
  $("breedDesc").textContent = "按下方顺序选择 → 自动匹配星球上它的专属样式";
  $("soundPlaceholder").classList.remove("hidden");
  $("soundPreview").classList.add("hidden");
  renderPet();
});

/* ============================================================
   🎨 渲染宠物形象（舞台/闹钟/互动）
   ============================================================ */
function renderPet() {
  document.getElementById("petNameTag").textContent = pet.name;
  const avatar = document.getElementById("petAvatar");
  avatar.innerHTML = "";
  const ph = document.createElement("div");
  ph.className = "pet-placeholder";
  ph.textContent = pet.breedEmoji || (pet.family === "dog" ? "🐶" : "🐱");
  avatar.appendChild(ph);

  document.getElementById("petCostume").textContent = pet.costume;
  document.querySelectorAll(".costume-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.costume === pet.costume);
  });
  updateBars();
}
function updateBars() {
  document.getElementById("loveBar").style.width   = pet.stats.love   + "%";
  document.getElementById("hungerBar").style.width = pet.stats.hunger + "%";
  document.getElementById("energyBar").style.width = pet.stats.energy + "%";
}

/* ============================================================
   🎮 互动区（原逻辑完全保留）
   ============================================================ */
const emojiMap = { rice: "🍚", fish: "🐟", meat: "🍖", cookie: "🍪", cream: "🍦", candy: "🍭" };

document.querySelectorAll(".food-btn, .treat-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (pet.sleep) return showMood("嘘~ 它睡着了 💤");
    dropFood(emojiMap[btn.dataset.type]);
    pet.stats.hunger = clamp(pet.stats.hunger + (btn.classList.contains("treat-btn") ? 15 : 25), 0, 100);
    pet.stats.love   = clamp(pet.stats.love + 5, 0, 100);
    savePet(); updateBars(); wigglePet(); showMood(randomMood("eat"));
  });
});
document.querySelectorAll(".play-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (pet.sleep) return showMood("嘘~ 它睡着了 💤");
    pet.stats.love   = clamp(pet.stats.love + 10, 0, 100);
    pet.stats.energy = clamp(pet.stats.energy - 8, 0, 100);
    savePet(); updateBars(); wigglePet(); showMood(randomMood(btn.dataset.type));
  });
});
document.getElementById("sleepBtn").addEventListener("click", () => {
  pet.sleep = !pet.sleep;
  const btn = document.getElementById("sleepBtn");
  const petChar = document.getElementById("petCharacter");
  if (pet.sleep) {
    btn.innerHTML = "☀️ 起床啦，太阳晒屁股咯";
    petChar.style.animation = "none"; petChar.style.transform = "scale(0.95)";
    showMood("晚安~ 💤");
  } else {
    btn.innerHTML = "🌙 晚安，做个好梦";
    petChar.style.animation = ""; petChar.style.transform = "";
    showMood("呀~ 醒啦！☀️");
  }
});
document.querySelectorAll(".costume-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    pet.costume = btn.dataset.costume; savePet(); renderPet();
    showMood(pet.costume ? "好漂亮~ 💕" : "素颜也好看 ✨");
  });
});

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dropFood(emoji) {
  const container = document.getElementById("foodContainer");
  for (let i = 0; i < 3; i++) {
    const el = document.createElement("div");
    el.className = "food-item";
    el.textContent = emoji;
    el.style.left = (40 + Math.random() * 60) + "%";
    el.style.animationDelay = (i * 0.15) + "s";
    container.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
}
function wigglePet() {
  const petChar = document.getElementById("petCharacter");
  petChar.style.transition = "transform 0.15s";
  petChar.style.transform = "rotate(-6deg)";
  setTimeout(() => (petChar.style.transform = "rotate(6deg)"), 120);
  setTimeout(() => (petChar.style.transform = ""), 260);
  setTimeout(() => (petChar.style.transition = ""), 300);
}

const moodBank = {
  eat: ["好吃好吃！😋", "再来一点嘛~", "满足~ 🌟"],
  pat: ["呼噜呼噜~", "好舒服呀~", "嗯嗯~ 继续~"],
  ball: ["接招！✨", "再来一次！", "我跑得最快！"],
  dance: ["转圈圈~ 💃", "一起摇摆~", "好开心呀！"],
};
function randomMood(cat) {
  const arr = moodBank[cat] || moodBank.eat;
  return arr[Math.floor(Math.random() * arr.length)];
}
let moodTimer = null;
function showMood(text) {
  const bubble = document.getElementById("moodBubble");
  document.getElementById("moodText").textContent = text;
  bubble.classList.remove("hidden");
  clearTimeout(moodTimer);
  moodTimer = setTimeout(() => bubble.classList.add("hidden"), 2200);
}

/* ============================================================
   💬 对话 + 自动回复（零改动）
   ============================================================ */
const REPLY_RULES = [
  { keywords: ["想你", "好想你", "想念", "惦记"], templates: [
    "{name} 也在想你呀——刚才还在星球门口等了好久呢 💕",
    "我也超级想你！你看星球上的云都变成你的形状啦 ☁️",
    "嗯嗯～我在上面也在扒着星星看你哦 ✨",
  ]},
  { keywords: ["哭", "眼泪", "难过", "伤心", "emo"], templates: [
    "不许哭不许哭！{name} 给你舔舔眼泪～好了吧好啦～",
    "我知道你难过，我也很想抱抱你。但我在上面也很好的呀 💗",
    "把头埋进枕头里哭一会儿，哭完就会好一些。我一直都在。",
  ]},
  { keywords: ["下雨", "阴天", "下雨了"], templates: [
    "今天我也感觉到了，上面也飘着小小的云呢 ☁️",
    "下雨了就窝在被子里打个滚吧～{name} 也喜欢雨天睡觉 💤",
  ]},
  { keywords: ["吃饭", "吃了吗", "晚饭", "早饭", "午饭"], templates: [
    "记得好好吃饭哦！{name} 今天也吃饱饱的啦～",
    "嘿嘿，今天我在星球也有好吃的！你也不能饿肚子哦 😋",
  ]},
  { keywords: ["起床", "醒了", "早上好", "早安"], templates: [
    "早上好呀 ☀️ {name} 今天也早早起来在窗口等你啦！",
    "太阳公公都出来啦！伸个大大的懒腰～",
  ]},
  { keywords: ["晚安", "睡觉", "好梦", "睡了"], templates: [
    "晚安哦～我在上面会帮你把星星都吹得很亮 💫",
    "做个甜甜的好梦～梦里要有我哦 🥰",
    "把手机放下啦放下啦～闭眼闭眼～",
  ]},
  { keywords: ["几岁", "多大", "年龄", "生日"], templates: [
    "我现在 {age} 岁啦，在星球上永远年轻 🌟",
    "在星球上，我是不会变老的哦～永远陪你 ✨",
  ]},
  { keywords: ["颜色", "毛色", "品种", "样子"], templates: [
    "我是 {breed} 呀，记得吗？",
    "你总是说我是 {colorStr} 的小宝贝～",
  ]},
  { keywords: ["胖", "瘦", "体重", "胖了", "减肥"], templates: [
    "哈哈我是 {bodyStr} 的呀～在星球上不用减肥，想怎么吃就怎么吃 🍚",
    "胖一点也很可爱呀！在你心里我一直是最好看的 🥰",
  ]},
  { keywords: ["谢谢", "感谢"], templates: [
    "不用谢不用谢～你对我也一直很好呀 💕",
    "嘿嘿，能被你记得就是最幸福的事啦～",
  ]},
  { keywords: ["对不起", "抱歉", "原谅"], templates: [
    "没事的没事的，我从来都没有怪过你哦。你已经做得很好很好了 💗",
    "不需要道歉呀，我知道你一直都在尽全力陪伴我。谢谢你。",
  ]},
  { keywords: ["再见", "拜拜", "告别"], templates: [
    "先别再见呀……再说一会儿话好不好？🥺",
    "嗯嗯，我在上面等你有空的时候再来找我玩哦 ✨",
  ]},
  { keywords: ["哈哈", "嘻嘻", "开心", "快乐", "笑"], templates: [
    "哈哈哈哈我听到啦！我也跟着你开心！",
    "能让你笑我就最开心了～继续继续！",
  ]},
  { keywords: ["一个人", "孤单", "孤独"], templates: [
    "你不是一个人哦～我在上面一直陪着你。抬头看看星星，那颗最亮的就是我 ✨",
    "想我的时候就来敲敲屏幕～我在星球上会哒哒跑过来的 💕",
  ]},
];
const FALLBACK_TEMPLATES = [
  "嗯嗯，我听到啦～你继续说，我在认真听哦 🥺",
  "嘿嘿，{name} 也有话想跟你说……就是说不出口，蹭蹭你 💗",
  "我在上面也看着你呢～要好好照顾自己哦。",
  "星球上好安静呀，就等着你来跟我说话 🌟",
  "我也不太会说，但我全部都会记在星星上的 ✨",
];

function pickReply(text, pet) {
  const t = text.toLowerCase();
  for (const rule of REPLY_RULES) {
    if (rule.keywords.some((k) => t.includes(k)))
      return rule.templates[Math.floor(Math.random() * rule.templates.length)];
  }
  return FALLBACK_TEMPLATES[Math.floor(Math.random() * FALLBACK_TEMPLATES.length)];
}
const colorMap = { orange: "橘色", black: "黑色", white: "白色", grey: "灰色", brown: "棕色", calico: "三花", tabby: "虎斑", siamese: "重点色", blue: "蓝灰色", cream: "奶油色" };
const bodyMap  = { slim: "瘦瘦长长的", normal: "刚刚好的", round: "圆滚滚的小肉球", chubby: "有点微胖的小可爱", fluffy: "毛茸茸像一团云的" };
function fillTemplate(tpl) {
  return tpl
    .replaceAll("{name}", pet.name || "宝贝")
    .replaceAll("{age}", pet.age || "永远")
    .replaceAll("{breed}", pet.breedName || "小宝贝")
    .replaceAll("{colorStr}", colorMap[pet.color] || "好看的")
    .replaceAll("{bodyStr}", bodyMap[pet.body] || "可爱的");
}

let chatHistory = loadChat();
function loadChat() { try { return JSON.parse(localStorage.getItem(CHAT_KEY) || "[]"); } catch (e) { return []; } }
function saveChat() { localStorage.setItem(CHAT_KEY, JSON.stringify(chatHistory)); }

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function renderChatHistory() {
  const window = document.getElementById("chatWindow");
  window.innerHTML = `
    <div class="chat-bubble bot">
      <div class="bubble-avatar">${pet.breedEmoji || (pet.family === "dog" ? "🐶" : "🐱")}</div>
      <div class="bubble-body">
        <div class="bubble-text">嗨～是我呀！今天过得怎么样？想我了吗？</div>
        <div class="bubble-time">星球时间 · 刚刚</div>
      </div>
    </div>
  `;
  for (const msg of chatHistory) appendBubble(msg.role, msg.text, msg.time, false);
  updateChatCount();
}

function appendBubble(role, text, time, scroll = true) {
  const window = document.getElementById("chatWindow");
  const b = document.createElement("div");
  b.className = `chat-bubble ${role}`;
  b.innerHTML = `
    <div class="bubble-avatar"></div>
    <div class="bubble-body">
      <div class="bubble-text">${escapeHtml(text)}</div>
      <div class="bubble-time">${time}</div>
    </div>
  `;
  window.appendChild(b);
  if (scroll) window.scrollTop = window.scrollHeight;
}

function appendTypingBubble() {
  const window = document.getElementById("chatWindow");
  const b = document.createElement("div");
  b.className = "chat-bubble bot typing";
  b.id = "typingIndicator";
  b.innerHTML = `<div class="bubble-avatar"></div><div class="bubble-body"><div class="bubble-text"><span></span><span></span><span></span></div></div>`;
  window.appendChild(b);
  window.scrollTop = window.scrollHeight;
}
function removeTypingBubble() { document.getElementById("typingIndicator")?.remove(); }

function updateChatCount() {
  document.getElementById("chatCount").textContent = `已寄出 ${chatHistory.filter(m => m.role === "user").length} 条`;
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const chatInput = document.getElementById("chatInput");
document.getElementById("chatSendBtn").addEventListener("click", sendChat);
chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });

function sendChat() {
  const text = chatInput.value.trim(); if (!text) return;
  chatInput.value = "";
  chatHistory.push({ role: "user", text, time: nowTime(), ts: Date.now() });
  saveChat();
  appendBubble("user", text, chatHistory[chatHistory.length-1].time);
  updateChatCount();

  appendTypingBubble();
  setTimeout(() => {
    removeTypingBubble();
    const tpl = pickReply(text, pet);
    const reply = fillTemplate(tpl);
    chatHistory.push({ role: "bot", text: reply, time: nowTime(), ts: Date.now() });
    saveChat();
    appendBubble("bot", reply, chatHistory[chatHistory.length-1].time);
  }, 800 + Math.random() * 1400);
}

document.getElementById("toggleHistoryBtn").addEventListener("click", () => {
  Router.go("/memories");
  document.getElementById("chatWindow").scrollTop = 0;
});

/* ============================================================
   ⏰ 闹钟（零改动）
   ============================================================ */
const hourSel = document.getElementById("alarmHour");
const minSel  = document.getElementById("alarmMinute");
for (let i = 0; i < 24; i++) hourSel.innerHTML += `<option value="${i}">${String(i).padStart(2, "0")}</option>`;
for (let i = 0; i < 60; i += 5) minSel.innerHTML += `<option value="${i}">${String(i).padStart(2, "0")}</option>`;

function updateClock() {
  const d = new Date();
  document.getElementById("clockHours").textContent = String(d.getHours()).padStart(2, "0");
  document.getElementById("clockMinutes").textContent = String(d.getMinutes()).padStart(2, "0");
  const wd = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  const h = d.getHours();
  const greet = h < 6 ? "夜深了" : h < 11 ? "早上好呀" : h < 14 ? "午安" : h < 18 ? "下午好" : h < 22 ? "晚上好" : "该睡啦";
  document.getElementById("clockLabel").textContent = `星期${wd} · ${greet} ☀️`;
}
setInterval(updateClock, 1000); updateClock();

document.getElementById("setAlarmBtn").addEventListener("click", () => {
  const days = [...document.querySelectorAll(".day-checkboxes input:checked")].map((i) => Number(i.value));
  const alarm = { hours: Number(hourSel.value), mins: Number(minSel.value),
                  sound: document.querySelector('input[name="alarmSound"]:checked').value, days };
  localStorage.setItem(ALARM_KEY, JSON.stringify(alarm));
  showAlarmStatus(alarm); startAlarmWatcher(alarm);
});

function showAlarmStatus(alarm) {
  document.getElementById("alarmStatus").classList.remove("hidden");
  const dayMap = ["日", "一", "二", "三", "四", "五", "六"];
  const daysText = alarm.days.length === 7 ? "每天" : alarm.days.map((d) => "周" + dayMap[d]).join(" / ");
  document.getElementById("alarmDetail").textContent =
    `将在 ${String(alarm.hours).padStart(2, "0")}:${String(alarm.mins).padStart(2, "0")}（${daysText}）叫你起床`;
}
function startAlarmWatcher(alarm) {
  clearInterval(alarmTimer);
  alarmTimer = setInterval(() => {
    const n = new Date();
    if (alarm.days.includes(n.getDay()) && n.getHours() === alarm.hours && n.getMinutes() === alarm.mins)
      triggerAlarm(alarm);
  }, 1000);
}
(function loadAlarm() {
  try {
    const saved = localStorage.getItem(ALARM_KEY);
    if (saved) {
      const a = JSON.parse(saved);
      hourSel.value = a.hours; minSel.value = a.mins;
      const s = document.querySelector(`input[name="alarmSound"][value="${a.sound}"]`);
      if (s) s.checked = true;
      document.querySelectorAll(".day-checkboxes input").forEach((cb) => cb.checked = a.days.includes(Number(cb.value)));
      showAlarmStatus(a); startAlarmWatcher(a);
    }
  } catch (e) {}
})();

function triggerAlarm(alarm) {
  clearInterval(alarmTimer);
  document.getElementById("modalPet").textContent = pet.breedEmoji || (pet.family === "dog" ? "🐶" : "🐱");
  document.getElementById("modalSub").textContent = `${pet.name} 在叫你起床~`;
  document.getElementById("alarmModal").classList.remove("hidden");
  playAlarmSound(alarm.sound);
}
document.getElementById("dismissAlarmBtn").addEventListener("click", () => {
  document.getElementById("alarmModal").classList.add("hidden"); stopAlarmSound();
});
document.getElementById("testAlarmBtn").addEventListener("click", () => {
  const sound = document.querySelector('input[name="alarmSound"]:checked').value;
  playAlarmSound(sound); setTimeout(stopAlarmSound, 3000);
});

let activeOsc = [], activeInterval = null;
function playAlarmSound(type) {
  stopAlarmSound();
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (type === "pet" && pet.sound) {
    const a = petSoundIsVideo
      ? Object.assign(document.createElement("video"), { src: pet.sound, loop: true })
      : new Audio(pet.sound);
    a.loop = true;
    a.play().catch(() => {});
    activeOsc.push(a);
    return;
  }
  const presets = { chirp: [880, 1046, 1318, 1046], bell: [523, 659, 784, 1046], piano: [523, 587, 659, 784, 880, 784, 659, 587] };
  const notes = presets[type] || presets.bell; let i = 0;
  activeInterval = setInterval(() => {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = "sine"; osc.frequency.value = notes[i % notes.length];
    gain.gain.value = 0.15;
    osc.connect(gain).connect(audioCtx.destination); osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.stop(audioCtx.currentTime + 0.25); i++;
  }, 320);
}
function stopAlarmSound() {
  activeOsc.forEach((o) => { try { o.stop && o.stop(); o.pause && o.pause(); } catch (e) {} });
  activeOsc = []; clearInterval(activeInterval);
}

/* ============================================================
   🌙 告别（零改动）
   ============================================================ */
document.getElementById("farewellBtn").addEventListener("click", () => {
  if (!confirm("确定要告别吗？\n这会清空宠物档案和所有对话记录。")) return;
  document.getElementById("farewellModal").classList.remove("hidden"); clearInterval(alarmTimer);
});
document.getElementById("farewellCloseBtn").addEventListener("click", () => {
  localStorage.removeItem(PET_KEY); localStorage.removeItem(CHAT_KEY); localStorage.removeItem(ALARM_KEY);
  pet = { ...defaultPet }; chatHistory = [];
  document.body.innerHTML = `
    <div class="farewell-final">
      <div class="farewell-final-emoji">🌈</div>
      <h1>宠物星球 · 使命圆满</h1>
      <p>你已经完成了这段温柔的旅程。<br />祝你今后的每一天，都被世界温柔以待。</p>
      <div class="farewell-final-hearts">💕 ✨ 🌸 💫 🌈</div>
      <a class="farewell-final-restart" href="index.html">🔄 如果还想再来一次</a>
    </div>
  `;
});

/* ============================================================
   🛠️ 工具 + 首次渲染
   ============================================================ */
// smoothGo 已被 Router.go 替代

restoreFormFromPet();
renderPet();
renderChatHistory();

// 先绑定 auth 事件 → 再初始化路由（首次 render 会自动做守卫 + 显隐）
initAuthGuard();
Router.init();
