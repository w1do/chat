import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Send, Sparkles, Wand2, Check, CheckCheck, X, RotateCcw, Lock, ChevronLeft,
  ChevronRight, MessageCircle, Settings, Volume2, VolumeX, Heart, Plus, Minus,
} from "lucide-react";

/* ============================================================================
   СЕМЕЙНЫЙ ЧАТ — интерфейс v3
   Типы: chat.types.ts · settings.types.ts   Права: permissions.ts

   Дизайн-решение (коротко):
     · Интерфейс почти монохромный. Цвет несёт только одну мысль — чей голос.
       У каждого в семье свой оттенок: им подсвечены имя, полоска у группы
       сообщений и аватар. В переписке из пяти человек это видно с одного взгляда.
     · Свои сообщения — чернильные (в тёмной теме наоборот, светлые). Контраст
       вместо цвета делает ленту спокойной.
     · Янтарный цвет зарезервирован за помощником и больше нигде не встречается.
     · Настройки — короткий список; каждый пункт открывается отдельным листом,
       чтобы на экране никогда не было десятка переключателей сразу.

   Карта файла:
      1. Токены оформления
      2. Данные семьи, комнаты, реплики
      3. Права доступа
      4. Настройки
      5. Звук и вибрация
      6. Клавиатура и безопасные зоны
      7. Помощник: действия, модели, запрос
      8. Примитивы интерфейса
      9. Экран «Чаты»
     10. Экран переписки
     11. Лист помощника
     12. Настройки и их листы
     13. Корневой компонент
   ========================================================================== */

/* ── 1. Токены оформления ─────────────────────────────────────────────────── */

const LIGHT = {
  name: "light",
  bg: "#F4F4F7", surface: "#FFFFFF", surfaceAlt: "#EDEDF3", hairline: "#E4E4EC",
  text: "#14131A", muted: "#86858F", faint: "#B6B5BE",
  own: "#17161E", ownText: "#FFFFFF",
  amber: "#E0900E", amberSoft: "#FCEFD5", amberText: "#8A5606",
  chromeAlpha: "#FFFFFFD9",
  danger: "#C4453D",
};

const DARK = {
  name: "dark",
  bg: "#0D0D11", surface: "#17171D", surfaceAlt: "#20202A", hairline: "#282833",
  text: "#ECECF2", muted: "#83828E", faint: "#5C5B66",
  own: "#ECECF2", ownText: "#14131A",
  amber: "#F5B547", amberSoft: "#2E2413", amberText: "#F5C878",
  chromeAlpha: "#17171DD9",
  danger: "#E06B62",
};

const RADIUS = { sm: 10, md: 14, bubble: 20, sheet: 28 };
const SPRING = "cubic-bezier(.2,.9,.3,1)";

/* ── 2. Данные семьи ──────────────────────────────────────────────────────── */

const MIN = 60 * 1000;
const now = Date.now();

/** hue — личный цвет голоса, единственный цвет в ленте. */
const MEMBERS = {
  mom:   { id: "mom",   name: "Мама",    role: "owner",  avatar: "🌿", hue: "#6C63C9", online: true },
  dad:   { id: "dad",   name: "Папа",    role: "parent", avatar: "🔧", hue: "#2F8F7A", online: true },
  sonya: { id: "sonya", name: "Соня",    role: "teen",   avatar: "🎧", hue: "#C75C8A", online: true },
  misha: { id: "misha", name: "Миша",    role: "child",  avatar: "🚀", hue: "#DD8A3C", online: false },
  gran:  { id: "gran",  name: "Бабушка", role: "guest",  avatar: "🫖", hue: "#8A7BB5", online: false },
};

const ALL = ["owner", "parent", "teen", "child", "guest"];

const ROOMS = [
  { id: "general", title: "Общая",           emoji: "🏡",  description: "Вся семья",                  readRoles: ALL, writeRoles: ALL, isDefault: true },
  { id: "kitchen", title: "Кухня",           emoji: "🍎",  description: "Списки и ужин",              readRoles: ALL, writeRoles: ALL, isDefault: false },
  { id: "board",   title: "Объявления",      emoji: "📌",  description: "Читают все, пишут родители", readRoles: ALL, writeRoles: ["owner", "parent"], isDefault: false },
  { id: "trips",   title: "Поездки",         emoji: "⛺️", description: "Планы на выходные",          readRoles: ALL, writeRoles: ["owner", "parent", "teen"], isDefault: false },
  { id: "kids",    title: "Детская",         emoji: "🎮",  description: "Соня и Миша",                readRoles: ["owner", "parent", "teen", "child"], writeRoles: ["owner", "parent", "teen", "child"], isDefault: false },
  { id: "parents", title: "Только родители", emoji: "🔐",  description: "Взрослые вопросы",           readRoles: ["owner", "parent"], writeRoles: ["owner", "parent"], isDefault: false },
  { id: "money",   title: "Бюджет",          emoji: "💰",  description: "Счета и расходы",            readRoles: ["owner", "parent"], writeRoles: ["owner", "parent"], isDefault: false },
];

const SEED = {
  general: [
    { id: "g1", authorId: "gran",  text: "Доброе утро, мои хорошие! Пирог остывает на подоконнике 🥧", sentAt: now - 180 * MIN },
    { id: "g2", authorId: "misha", text: "бабуль ты лучшая", sentAt: now - 176 * MIN },
    { id: "g3", authorId: "dad",   text: "Заеду после работы, заберу Мишу с тренировки в 19:00", sentAt: now - 92 * MIN },
    { id: "g4", authorId: "mom",   text: "Хорошо. Соня, не забудь про репетитора в четверг", sentAt: now - 40 * MIN },
    { id: "g5", authorId: "sonya", text: "помню-помню 🙃", sentAt: now - 38 * MIN },
  ],
  kitchen: [
    { id: "k1", authorId: "mom",   text: "Что берём на выходные? Пишите сюда, чтобы не забыть", sentAt: now - 300 * MIN },
    { id: "k2", authorId: "misha", text: "МОРОЖЕНОЕ", sentAt: now - 298 * MIN },
    { id: "k3", authorId: "dad",   text: "Молоко, хлеб, кофе. И мороженое, раз уж такое дело", sentAt: now - 120 * MIN },
  ],
  board: [
    { id: "b1", authorId: "mom", text: "В субботу в 11:00 генеральная уборка. После — кино и пицца", sentAt: now - 600 * MIN },
  ],
  trips: [
    { id: "t1", authorId: "dad",   text: "Байкал на три дня в сентябре. Кто за?", sentAt: now - 420 * MIN },
    { id: "t2", authorId: "sonya", text: "я за, но только если едем на Ольхон", sentAt: now - 410 * MIN },
  ],
  kids: [
    { id: "d1", authorId: "sonya", text: "Миш, я забрала твой зарядник, верну вечером", sentAt: now - 60 * MIN },
    { id: "d2", authorId: "misha", text: "ладно, но потом играем вместе", sentAt: now - 55 * MIN },
  ],
  parents: [
    { id: "p1", authorId: "mom", text: "Подарок Соне на день рождения — обсудим вечером?", sentAt: now - 200 * MIN },
    { id: "p2", authorId: "dad", text: "Да, есть пара идей. Только не при ней", sentAt: now - 195 * MIN },
  ],
  money: [
    { id: "f1", authorId: "dad", text: "Коммуналка оплачена, 8 400. Скидываю чек", sentAt: now - 500 * MIN },
  ],
};

/** Реплики для живой переписки: своя тема у каждой комнаты. */
const AMBIENT = {
  general: ["Я дома через полчаса", "Кто выносил мусор?", "Смотрите, какой закат за окном", "Не забудьте закрыть балкон"],
  kitchen: ["Добавьте в список йогурты", "Ужин через двадцать минут", "Хлеб закончился", "Пожарю блинчики в воскресенье"],
  board:   ["Напоминаю: в субботу уборка", "Родительское собрание перенесли на среду"],
  trips:   ["Нашёл домик у воды, скину ссылку", "Билеты дешевле во вторник", "Возьмём палатку?"],
  kids:    ["играем после уроков?", "я закончил домашку", "верни мои наушники 🙂"],
  parents: ["Поговорим вечером", "Я оплатил секцию", "Соне нужен новый рюкзак"],
  money:   ["Интернет продлил на год", "Отложил на отпуск"],
};

const REPLIES = {
  mom:   ["Хорошо, договорились ❤️", "Записала, спасибо", "Я как раз об этом думала"],
  dad:   ["Понял, сделаю", "Ок, буду к семи", "Согласен, давайте так"],
  sonya: ["ага, ок 🙌", "супер, я в деле", "мне нравится"],
  misha: ["урааа", "а можно я тоже?", "хорошо!"],
  gran:  ["Умнички мои", "Обнимаю всех 🤗"],
};

/* ── 3. Права доступа ─────────────────────────────────────────────────────── */

const ROLE_PERMISSIONS = {
  owner:  ["room.view", "room.write", "room.manage", "message.pin", "ai.enhance"],
  parent: ["room.view", "room.write", "message.pin", "ai.enhance"],
  teen:   ["room.view", "room.write", "ai.enhance"],
  child:  ["room.view", "room.write"],
  guest:  ["room.view", "room.write"],
};

const ROLE_LABEL = { owner: "создатель семьи", parent: "родители", teen: "подростки", child: "дети", guest: "гости" };

const PERMISSION_LABEL = {
  "room.view": "Видеть комнаты",
  "room.write": "Писать сообщения",
  "room.manage": "Управлять комнатами",
  "message.pin": "Закреплять сообщения",
  "ai.enhance": "Помощник с текстом",
};

const can = (member, permission, settings) =>
  (permission === "ai.enhance" && member.role === "child" && settings?.aiForKids) ||
  ROLE_PERMISSIONS[member.role].includes(permission);

const canRead = (member, room) => room.readRoles.includes(member.role);
const canWrite = (member, room) => canRead(member, room) && room.writeRoles.includes(member.role);
const canEnhance = (member, room, settings) => canWrite(member, room) && can(member, "ai.enhance", settings);
const whoCanRead = (room) => room.readRoles.map((r) => ROLE_LABEL[r]).join(", ");

/* ── 4. Настройки ─────────────────────────────────────────────────────────── */

const prefersReduced = typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const DEFAULT_SETTINGS = {
  theme: "light",
  animations: !prefersReduced,   // если в iOS включено «Уменьшение движения» — стартуем без анимаций
  textSize: "M",
  sound: true,
  vibration: true,
  showTyping: true,
  sendOnEnter: true,
  model: "balanced",
  confirmRewrite: true,
  aiForKids: false,
};

const TEXT_SIZE_PX = { S: 15, M: 16, L: 18 };
const MIN_INPUT_FONT = 16;   // меньше — iOS зумит экран при фокусе

/* ── 5. Звук и вибрация ───────────────────────────────────────────────────── */

let audioCtx = null;
const TONES = {
  send:    [[784, 0], [1047, 0.06]],
  receive: [[523, 0], [415, 0.07]],
  magic:   [[659, 0], [880, 0.05], [1175, 0.1]],
  tap:     [[600, 0]],
};

function playSound(kind, enabled) {
  if (!enabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    (TONES[kind] || TONES.tap).forEach(([freq, delay]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const at = audioCtx.currentTime + delay;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.09, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(at);
      osc.stop(at + 0.2);
    });
  } catch (e) { /* звук не критичен */ }
}

const vibrate = (pattern, enabled) => {
  if (enabled && typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
};

/* ── 6. Клавиатура и безопасные зоны ──────────────────────────────────────── */

function useKeyboardInsets() {
  const [state, setState] = useState({ height: null, keyboard: 0 });

  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "viewport");
      document.head.appendChild(meta);
    }
    const prevMeta = meta.getAttribute("content");
    meta.setAttribute("content",
      "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content");

    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlH: html.style.height, h: body.style.height, o: body.style.overflow,
      p: body.style.position, w: body.style.width, ob: body.style.overscrollBehavior,
    };
    html.style.height = "100%";
    Object.assign(body.style, {
      height: "100%", overflow: "hidden", position: "fixed", width: "100%", overscrollBehavior: "none",
    });

    const vv = window.visualViewport;
    const sync = () => {
      if (!vv) return setState({ height: window.innerHeight, keyboard: 0 });
      setState({
        height: vv.height,
        keyboard: Math.max(0, window.innerHeight - vv.height - vv.offsetTop),
      });
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
      if (prevMeta) meta.setAttribute("content", prevMeta);
      html.style.height = prev.htmlH;
      Object.assign(body.style, {
        height: prev.h, overflow: prev.o, position: prev.p, width: prev.w, overscrollBehavior: prev.ob,
      });
    };
  }, []);

  return state;
}

/** Высота элемента — чтобы лента не пряталась под полупрозрачными панелями. */
function useHeight(ref) {
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    setHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [ref]);
  return height;
}

/* ── 7. Помощник ──────────────────────────────────────────────────────────── */

const MAGIC_ACTIONS = [
  { id: "improve", label: "Улучшить",         hint: "яснее и теплее",       Icon: Wand2,    instruction: "Перепиши сообщение яснее и дружелюбнее, сохранив смысл." },
  { id: "grammar", label: "Исправить ошибки", hint: "орфография и запятые", Icon: Check,    instruction: "Исправь орфографию и пунктуацию, больше ничего не меняй." },
  { id: "expand",  label: "Дополнить",        hint: "добавить деталей",     Icon: Plus,     instruction: "Разверни сообщение: добавь уместные детали и вежливую концовку." },
  { id: "shorten", label: "Короче",           hint: "одна мысль",           Icon: Minus,    instruction: "Сократи сообщение до одной короткой мысли." },
  { id: "soften",  label: "Мягче",            hint: "без резкости",         Icon: Heart,    instruction: "Смягчи тон: убери резкость и упрёки, просьбу оставь понятной." },
  { id: "emoji",   label: "Добавить эмодзи",  hint: "немного живости",      Icon: Sparkles, instruction: "Добавь 1–2 уместных эмодзи, текст почти не меняй." },
];

const MODELS = [
  { id: "fast",     label: "Быстрая", hint: "простые правки, мгновенно",  model: "claude-haiku-4-5-20251001" },
  { id: "balanced", label: "Обычная", hint: "баланс скорости и качества", model: "claude-sonnet-4-6" },
  { id: "smart",    label: "Умная",   hint: "длинные и сложные тексты",   model: "claude-opus-5" },
];

// В прототипе запрос идёт через одну доступную модель.
// На бою: MODELS.find(m => m.id === settings.model).model
const SANDBOX_MODEL = "claude-sonnet-4-6";

async function requestEnhance({ action, text, room, member, recent }) {
  const meta = MAGIC_ACTIONS.find((a) => a.id === action);
  const prompt = [
    "Ты помогаешь переписывать сообщения в семейном чате.",
    `Комната: «${room.title}» — ${room.description}.`,
    `Пишет: ${member.name} (${ROLE_LABEL[member.role]}).`,
    recent.length ? `Последние сообщения:\n${recent.join("\n")}` : "",
    `Задача: ${meta.instruction}`,
    "Правила: сохрани язык и смысл оригинала, пиши тепло и просто, как говорят дома.",
    "Верни ТОЛЬКО итоговый текст — без кавычек, markdown и пояснений.",
    "",
    `Сообщение: ${text}`,
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: SANDBOX_MODEL, max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) throw new Error("http " + res.status);
    const data = await res.json();
    const out = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("").trim()
      .replace(/^```[a-z]*\n?|```$/g, "").replace(/^["«»']+|["«»']+$/g, "").trim();
    if (!out) throw new Error("empty");
    return { text: out, source: "api" };
  } catch (e) {
    return { text: localFallback(action, text), source: "fallback" };
  }
}

function localFallback(action, text) {
  const raw = text.trim();
  const cap = raw.charAt(0).toUpperCase() + raw.slice(1);
  const dotted = /[.!?…]$/.test(cap) ? cap : cap + ".";
  switch (action) {
    case "shorten": return dotted.split(/[.!?]/)[0].trim() + ".";
    case "expand":  return dotted + " Напишите, если что-то поменяется.";
    case "soften":  return "Если получится, " + raw.charAt(0).toLowerCase() + raw.slice(1).replace(/[.!]+$/, "") + ", пожалуйста.";
    case "emoji":   return dotted + " ✨";
    default:        return dotted;
  }
}

/* ── 8. Примитивы интерфейса ──────────────────────────────────────────────── */

const fmtTime = (ts) => new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const dayKey = (ts) => new Date(ts).toDateString();

function dayLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === yesterday.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function Avatar({ member, size = 44, t, showStatus = false }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        className="flex items-center justify-center w-full h-full"
        style={{
          borderRadius: size * 0.36,
          background: member.hue + "1F",
          boxShadow: `inset 0 0 0 1.5px ${member.hue}44`,
          fontSize: size * 0.44,
        }}
      >
        {member.avatar}
      </span>
      {showStatus && member.online && (
        <span
          className="absolute"
          style={{
            right: -2, bottom: -2, width: 12, height: 12, borderRadius: 6,
            background: "#35C08A", boxShadow: `0 0 0 2.5px ${t.bg}`,
          }}
        />
      )}
    </span>
  );
}

function Dots({ color, size = 5 }) {
  return (
    <span className="inline-flex items-end gap-1" style={{ height: size * 2 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="dot" style={{ width: size, height: size, borderRadius: size, background: color, animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

function Toggle({ checked, onChange, t }) {
  return (
    <button
      role="switch" aria-checked={checked} onClick={onChange}
      className="relative shrink-0 tap"
      style={{ width: 50, height: 30, borderRadius: 15, background: checked ? t.text : t.hairline, transition: `background .25s ${SPRING}` }}
    >
      <span
        style={{
          position: "absolute", top: 3, left: checked ? 23 : 3, width: 24, height: 24, borderRadius: 12,
          background: t.surface, boxShadow: "0 1px 4px rgba(0,0,0,.22)", transition: `left .25s ${SPRING}`,
        }}
      />
    </button>
  );
}

function Segmented({ options, value, onChange, t }) {
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  return (
    <div className="relative flex p-1 w-full" style={{ background: t.surfaceAlt, borderRadius: RADIUS.md }}>
      <span
        className="absolute top-1 bottom-1"
        style={{
          width: `calc(${100 / options.length}% - 4px)`, left: 4,
          transform: `translateX(calc(${index * 100}% + ${index * 4}px))`,
          background: t.surface, borderRadius: RADIUS.sm,
          boxShadow: "0 1px 3px rgba(20,19,26,.12)", transition: `transform .28s ${SPRING}`,
        }}
      />
      {options.map((o) => (
        <button
          key={o.id} onClick={() => onChange(o.id)}
          className="relative z-10 flex-1 text-[13.5px] font-medium"
          style={{ padding: "7px 0", color: o.id === value ? t.text : t.muted, transition: "color .2s" }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Универсальный выезжающий лист. Им сделаны и помощник, и все настройки. */
function Sheet({ open, title, subtitle, onClose, t, children, accent }) {
  return (
    <div className="absolute inset-0 z-40" style={{ pointerEvents: open ? "auto" : "none" }} aria-hidden={!open}>
      <div
        onClick={onClose}
        className="absolute inset-0"
        style={{
          background: "rgba(10,10,14,.44)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
          opacity: open ? 1 : 0, transition: "opacity .3s ease",
        }}
      />
      <div
        className="absolute left-0 right-0 bottom-0 flex flex-col"
        style={{
          background: t.surface,
          borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet,
          transform: open ? "translateY(0)" : "translateY(103%)",
          transition: `transform .42s ${SPRING}`,
          maxHeight: "88%",
          boxShadow: "0 -20px 60px rgba(0,0,0,.28)",
        }}
      >
        <div className="flex justify-center pt-2.5 pb-1.5">
          <span style={{ width: 38, height: 4, borderRadius: 2, background: t.hairline }} />
        </div>
        <div className="flex items-start gap-3 px-5 pt-1 pb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-[19px] font-semibold" style={{ color: accent || t.text, letterSpacing: "-0.02em" }}>{title}</h2>
            {subtitle && <p className="text-[13px] mt-0.5" style={{ color: t.muted }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose} aria-label="Закрыть" className="tap shrink-0"
            style={{ width: 30, height: 30, borderRadius: 15, background: t.surfaceAlt, color: t.muted, display: "grid", placeItems: "center" }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scroll-area safe-bottom">{children}</div>
      </div>
    </div>
  );
}

/** Строка списка: слева название, справа значение, шеврон или переключатель. */
function Row({ title, hint, value, onClick, right, t, last }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 text-left ${onClick ? "tap" : ""}`}
      style={{ paddingTop: 13, paddingBottom: 13, borderBottom: last ? "none" : `1px solid ${t.hairline}` }}
    >
      <span className="flex-1 min-w-0">
        <span className="block text-[16px]" style={{ color: t.text }}>{title}</span>
        {hint && <span className="block text-[13px] mt-0.5" style={{ color: t.muted }}>{hint}</span>}
      </span>
      {value && <span className="text-[15px] shrink-0" style={{ color: t.muted }}>{value}</span>}
      {right}
      {onClick && !right && <ChevronRight size={17} style={{ color: t.faint }} className="shrink-0" />}
    </Tag>
  );
}

function Group({ children, t, label }) {
  return (
    <section className="px-3 mb-5">
      {label && (
        <h3 className="text-[12px] font-medium uppercase px-2 pb-2" style={{ color: t.muted, letterSpacing: "0.07em" }}>{label}</h3>
      )}
      <div style={{ background: t.surface, borderRadius: RADIUS.md, overflow: "hidden" }}>{children}</div>
    </section>
  );
}

function Toast({ text, t, bottom = 100 }) {
  return (
    <div className="absolute left-0 right-0 flex justify-center px-6 z-50 pointer-events-none" style={{ bottom }}>
      <div
        className="px-4 py-2.5 text-[14px] text-center"
        style={{
          background: t.text, color: t.bg, borderRadius: RADIUS.md, maxWidth: 320,
          opacity: text ? 1 : 0,
          transform: text ? "translateY(0) scale(1)" : "translateY(10px) scale(.96)",
          transition: `all .3s ${SPRING}`,
        }}
      >
        {text || ""}
      </div>
    </div>
  );
}

/* ── 9. Экран «Чаты» ──────────────────────────────────────────────────────── */

function ChatsScreen({ me, t, unread, preview, typingByRoom, onOpen, onDenied, onProfile }) {
  const headerRef = useRef(null);
  const headerH = useHeight(headerRef);

  return (
    <div className="relative h-full" style={{ background: t.bg }}>
      <div className="absolute inset-0 overflow-y-auto scroll-area" style={{ paddingTop: headerH, paddingBottom: 96 }}>
        <div className="px-3 pt-2">
          <div style={{ background: t.surface, borderRadius: RADIUS.md, overflow: "hidden" }}>
            {ROOMS.map((room, i) => {
              const open = canRead(me, room);
              const count = unread[room.id] || 0;
              const typingId = typingByRoom[room.id];
              const line = preview(room.id);
              return (
                <button
                  key={room.id}
                  onClick={() => (open ? onOpen(room.id) : onDenied(`«${room.title}» — только для: ${whoCanRead(room)}`))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left tap enter"
                  style={{
                    borderBottom: i === ROOMS.length - 1 ? "none" : `1px solid ${t.hairline}`,
                    animationDelay: `${i * 0.035}s`,
                    opacity: open ? 1 : 0.55,
                  }}
                >
                  <span
                    className="grid place-items-center shrink-0"
                    style={{ width: 46, height: 46, borderRadius: 16, background: t.surfaceAlt, fontSize: 21 }}
                  >
                    {room.emoji}
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[16px] font-semibold truncate" style={{ color: t.text, letterSpacing: "-0.01em" }}>
                        {room.title}
                      </span>
                      {!open && <Lock size={12} style={{ color: t.faint }} />}
                    </span>
                    {open && typingId ? (
                      <span className="flex items-center gap-1.5 mt-0.5 text-[14px]" style={{ color: MEMBERS[typingId].hue }}>
                        {MEMBERS[typingId].name} печатает <Dots color={MEMBERS[typingId].hue} size={4} />
                      </span>
                    ) : (
                      <span className="block text-[14px] truncate mt-0.5" style={{ color: t.muted }}>
                        {open ? line.text : `Только для: ${whoCanRead(room)}`}
                      </span>
                    )}
                  </span>

                  {open && (
                    <span className="flex flex-col items-end gap-1 shrink-0" style={{ minWidth: 42 }}>
                      <span className="text-[12px] tnum" style={{ color: t.faint }}>{line.time}</span>
                      {count > 0 && (
                        <span
                          className="pop text-[11.5px] font-semibold grid place-items-center"
                          style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10, background: t.text, color: t.bg }}
                        >
                          {count}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <header
        ref={headerRef}
        className="absolute top-0 left-0 right-0 z-10 px-5 pb-3 safe-top blur-chrome"
        style={{ background: t.chromeAlpha }}
      >
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[28px] font-semibold" style={{ color: t.text, letterSpacing: "-0.035em" }}>Дом</h1>
            <p className="text-[13px] mt-0.5" style={{ color: t.muted }}>
              {Object.values(MEMBERS).filter((m) => m.online).length} из {Object.keys(MEMBERS).length} в сети
            </p>
          </div>
          <button onClick={onProfile} className="tap" aria-label="Профиль">
            <Avatar member={me} size={40} t={t} showStatus />
          </button>
        </div>
      </header>
    </div>
  );
}

/* ── 10. Экран переписки ──────────────────────────────────────────────────── */

/** Сообщения подряд от одного человека — одна группа с общей цветной полоской. */
function buildGroups(messages) {
  const groups = [];
  let last = null;
  for (const msg of messages) {
    const sameDay = last && dayKey(last.sentAt) === dayKey(msg.sentAt);
    const cont = last && last.authorId === msg.authorId && sameDay && msg.sentAt - last.sentAt < 6 * MIN;
    if (cont) groups[groups.length - 1].items.push(msg);
    else groups.push({ key: msg.id, authorId: msg.authorId, day: dayKey(msg.sentAt), items: [msg] });
    last = msg;
  }
  return groups;
}

function ChatScreen({
  me, t, settings, room, messages, draft, typingId, magicBusy, enhanced, undoText, keyboard,
  onBack, onDraft, onSend, onMagic, onUndo, onReact,
}) {
  const scroller = useRef(null);
  const headerRef = useRef(null);
  const composerRef = useRef(null);
  const headerH = useHeight(headerRef);
  const composerH = useHeight(composerRef);
  const writeAllowed = canWrite(me, room);
  const magicAllowed = canEnhance(me, room, settings);
  const fontSize = TEXT_SIZE_PX[settings.textSize];
  const groups = useMemo(() => buildGroups(messages), [messages]);

  const toBottom = (smooth) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth && settings.animations ? "smooth" : "auto" });
  };

  useEffect(() => { toBottom(true); }, [messages.length, typingId]);
  useEffect(() => { toBottom(false); }, [keyboard, room.id, composerH]);

  let lastDay = null;

  return (
    <div className="relative h-full" style={{ background: t.bg }}>
      <div
        ref={scroller}
        className="absolute inset-0 overflow-y-auto scroll-area px-3"
        style={{ paddingTop: headerH + 8, paddingBottom: composerH + 10 }}
      >
        {groups.map((group) => {
          const author = MEMBERS[group.authorId];
          const own = group.authorId === me.id;
          const showDay = group.day !== lastDay;
          lastDay = group.day;

          return (
            <React.Fragment key={group.key}>
              {showDay && (
                <div className="flex justify-center py-3">
                  <span
                    className="text-[11.5px] font-medium uppercase px-3 py-1"
                    style={{ background: t.surfaceAlt, color: t.muted, borderRadius: 9, letterSpacing: "0.07em" }}
                  >
                    {dayLabel(group.items[0].sentAt)}
                  </span>
                </div>
              )}

              <div className={`flex mb-2.5 ${own ? "justify-end" : "justify-start"}`}>
                {/* Цветная полоска — голос человека */}
                {!own && <span className="shrink-0 mr-2" style={{ width: 2.5, borderRadius: 2, background: author.hue }} />}

                <div className="flex flex-col gap-0.5" style={{ maxWidth: "80%" }}>
                  {!own && (
                    <span className="text-[13px] font-semibold px-1 mb-0.5" style={{ color: author.hue }}>{author.name}</span>
                  )}

                  {group.items.map((msg, j) => {
                    const isLast = j === group.items.length - 1;
                    const hearted = (msg.reactions || []).length > 0;
                    return (
                      <div
                        key={msg.id}
                        onDoubleClick={() => onReact(msg.id)}
                        className={`relative px-3.5 py-2 ${own ? "enter-right" : "enter-left"}`}
                        style={{
                          background: own ? t.own : t.surface,
                          color: own ? t.ownText : t.text,
                          borderRadius: RADIUS.bubble,
                          borderTopLeftRadius: !own && j === 0 ? 8 : RADIUS.bubble,
                          borderTopRightRadius: own && j === 0 ? 8 : RADIUS.bubble,
                          alignSelf: own ? "flex-end" : "flex-start",
                          marginBottom: hearted ? 12 : 0,
                        }}
                      >
                        <p style={{ fontSize, lineHeight: 1.35, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {msg.text}
                        </p>
                        {isLast && (
                          <span
                            className="flex items-center gap-1 justify-end mt-0.5 text-[11px] tnum"
                            style={{ color: own ? t.ownText + "99" : t.faint }}
                          >
                            {msg.enhanced && <Sparkles size={10} style={{ color: t.amber }} />}
                            {fmtTime(msg.sentAt)}
                            {own && (
                              msg.status === "read" ? <CheckCheck size={13} style={{ color: t.amber }} />
                                : msg.status === "delivered" ? <CheckCheck size={13} />
                                : <Check size={13} />
                            )}
                          </span>
                        )}
                        {hearted && (
                          <span
                            className="absolute pop grid place-items-center"
                            style={{
                              bottom: -11, [own ? "left" : "right"]: 10, padding: "1px 6px",
                              background: t.surface, borderRadius: 11, fontSize: 12,
                              boxShadow: "0 2px 8px rgba(20,19,26,.16)",
                            }}
                          >
                            ❤️
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {typingId && settings.showTyping && (
          <div className="flex mb-2.5 enter-left">
            <span className="shrink-0 mr-2" style={{ width: 2.5, borderRadius: 2, background: MEMBERS[typingId].hue }} />
            <div>
              <span className="text-[13px] font-semibold px-1" style={{ color: MEMBERS[typingId].hue }}>{MEMBERS[typingId].name}</span>
              <div className="px-4 py-3 mt-0.5" style={{ background: t.surface, borderRadius: RADIUS.bubble, borderTopLeftRadius: 8 }}>
                <Dots color={t.faint} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Шапка поверх ленты */}
      <header
        ref={headerRef}
        className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2.5 px-2 pb-2.5 safe-top blur-chrome"
        style={{ background: t.chromeAlpha }}
      >
        <button onClick={onBack} className="tap grid place-items-center" style={{ width: 34, height: 34, color: t.text }} aria-label="Назад">
          <ChevronLeft size={26} />
        </button>
        <span className="grid place-items-center shrink-0" style={{ width: 36, height: 36, borderRadius: 13, background: t.surfaceAlt, fontSize: 18 }}>
          {room.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold truncate" style={{ color: t.text, letterSpacing: "-0.01em" }}>{room.title}</p>
          {typingId && settings.showTyping ? (
            <p className="text-[12.5px] flex items-center gap-1.5" style={{ color: MEMBERS[typingId].hue }}>
              {MEMBERS[typingId].name} печатает <Dots color={MEMBERS[typingId].hue} size={4} />
            </p>
          ) : (
            <p className="text-[12.5px] truncate" style={{ color: t.muted }}>{room.description}</p>
          )}
        </div>
      </header>

      {/* Панель ввода поверх ленты */}
      <div
        ref={composerRef}
        className={`absolute bottom-0 left-0 right-0 z-10 px-3 pt-2 blur-chrome ${keyboard > 0 ? "pb-2" : "safe-bottom"}`}
        style={{ background: t.chromeAlpha }}
      >
        {undoText && (
          <button onClick={onUndo} className="flex items-center gap-1.5 mb-2 ml-2 text-[13px] tap enter" style={{ color: t.amberText }}>
            <RotateCcw size={13} /> Вернуть мой текст
          </button>
        )}

        {!writeAllowed ? (
          <div
            className="flex items-center justify-center gap-2 py-3.5 text-[14px]"
            style={{ background: t.surface, color: t.muted, borderRadius: RADIUS.md }}
          >
            <Lock size={14} />
            Здесь пишут только {room.writeRoles.map((r) => ROLE_LABEL[r]).join(" и ")}
          </div>
        ) : (
          <div
            className="flex items-end gap-1.5 p-1.5"
            style={{
              background: t.surface, borderRadius: 24,
              boxShadow: magicBusy ? `0 0 0 2px ${t.amber}` : `0 1px 3px rgba(20,19,26,.10)`,
              transition: "box-shadow .3s ease",
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && settings.sendOnEnter) { e.preventDefault(); onSend(); }
              }}
              rows={1}
              placeholder="Сообщение"
              enterKeyHint={settings.sendOnEnter ? "send" : "enter"}
              autoCapitalize="sentences"
              autoCorrect="on"
              className="flex-1 resize-none bg-transparent px-3 py-2 outline-none"
              style={{ color: t.text, maxHeight: 116, fontSize: Math.max(MIN_INPUT_FONT, fontSize), lineHeight: 1.35 }}
            />

            <button
              onClick={onMagic}
              className="tap grid place-items-center shrink-0"
              style={{
                width: 36, height: 36, borderRadius: 18,
                background: magicAllowed ? t.amberSoft : t.surfaceAlt,
                color: magicAllowed ? t.amberText : t.faint,
              }}
              aria-label="Помощник с текстом"
            >
              {magicAllowed ? <Sparkles size={18} /> : <Lock size={15} />}
            </button>

            <button
              onClick={onSend}
              disabled={!draft.trim()}
              className="grid place-items-center shrink-0 tap"
              style={{
                width: 36, height: 36, borderRadius: 18, background: t.text, color: t.bg,
                transform: draft.trim() ? "scale(1)" : "scale(.6)",
                opacity: draft.trim() ? 1 : 0,
                transition: `transform .26s ${SPRING}, opacity .2s ease`,
                marginRight: draft.trim() ? 0 : -42,
              }}
              aria-label="Отправить"
            >
              <Send size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 11. Лист помощника ───────────────────────────────────────────────────── */

function MagicSheet({ open, phase, action, result, t, settings, onRun, onApply, onClose, onToggleSound, onModel }) {
  const meta = MAGIC_ACTIONS.find((a) => a.id === action);
  const title = phase === "menu" ? "Помощник" : phase === "loading" ? "Подбираю слова" : meta?.label;
  const subtitle = phase === "menu" ? "Поправит черновик, а отправите вы" : phase === "loading" ? MODELS.find((m) => m.id === settings.model)?.label : "Сравните и решите";

  return (
    <Sheet open={open} title={title} subtitle={subtitle} onClose={onClose} t={t} accent={t.amberText}>
      {phase === "menu" && (
        <>
          <div className="px-3">
            {MAGIC_ACTIONS.map((a, i) => (
              <button
                key={a.id}
                onClick={() => onRun(a.id)}
                className="w-full flex items-center gap-3 py-2.5 px-2 tap enter"
                style={{ animationDelay: `${i * 0.03}s`, borderBottom: `1px solid ${t.hairline}` }}
              >
                <span className="grid place-items-center shrink-0" style={{ width: 38, height: 38, borderRadius: 13, background: t.amberSoft, color: t.amberText }}>
                  <a.Icon size={18} />
                </span>
                <span className="text-left flex-1">
                  <span className="block text-[16px]" style={{ color: t.text }}>{a.label}</span>
                  <span className="block text-[13px]" style={{ color: t.muted }}>{a.hint}</span>
                </span>
                <ChevronRight size={16} style={{ color: t.faint }} />
              </button>
            ))}
          </div>

          <div className="px-5 pt-4">
            <p className="text-[12px] font-medium uppercase pb-2" style={{ color: t.muted, letterSpacing: "0.07em" }}>Модель</p>
            <Segmented options={MODELS} value={settings.model} onChange={onModel} t={t} />
            <div className="flex items-center gap-3 pt-4">
              <button onClick={onToggleSound} className="tap grid place-items-center shrink-0" style={{ width: 34, height: 34, borderRadius: 17, background: t.surfaceAlt, color: settings.sound ? t.text : t.faint }}>
                {settings.sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </button>
              <span className="flex-1 text-[15px]" style={{ color: t.text }}>Звук</span>
              <Toggle checked={settings.sound} onChange={onToggleSound} t={t} />
            </div>
          </div>
        </>
      )}

      {phase === "loading" && (
        <div className="px-5 space-y-2.5 pt-1">
          {[100, 82, 64].map((w, i) => (
            <div key={i} className="shimmer" style={{ height: 13, borderRadius: 7, width: `${w}%` }} />
          ))}
        </div>
      )}

      {phase === "preview" && result && (
        <div className="px-4 space-y-2">
          <div className="px-4 py-3" style={{ background: t.surfaceAlt, borderRadius: RADIUS.md }}>
            <p className="text-[11.5px] uppercase mb-1" style={{ color: t.muted, letterSpacing: "0.07em" }}>Было</p>
            <p className="text-[14px]" style={{ color: t.muted }}>{result.original}</p>
          </div>
          <div className="px-4 py-3 enter" style={{ background: t.amberSoft, borderRadius: RADIUS.md }}>
            <p className="text-[11.5px] uppercase mb-1" style={{ color: t.amberText, letterSpacing: "0.07em" }}>Стало</p>
            <p className="text-[16px]" style={{ color: t.text, lineHeight: 1.35 }}>{result.suggestion}</p>
          </div>
          {result.source === "fallback" && (
            <p className="text-[12.5px] px-1" style={{ color: t.danger }}>Помощник недоступен — это запасной вариант без модели.</p>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onApply} className="flex-1 py-3 text-[16px] font-semibold tap" style={{ background: t.text, color: t.bg, borderRadius: RADIUS.md }}>
              Заменить текст
            </button>
            <button onClick={() => onRun(action)} className="px-4 py-3 text-[16px] tap" style={{ background: t.surfaceAlt, color: t.text, borderRadius: RADIUS.md }}>
              Ещё раз
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ── 12. Настройки ────────────────────────────────────────────────────────── */

function SettingsScreen({ me, t, settings, onOpen }) {
  const headerRef = useRef(null);
  const headerH = useHeight(headerRef);
  const modelLabel = MODELS.find((m) => m.id === settings.model)?.label;

  return (
    <div className="relative h-full" style={{ background: t.bg }}>
      <div className="absolute inset-0 overflow-y-auto scroll-area" style={{ paddingTop: headerH, paddingBottom: 96 }}>
        <div className="px-3 pt-2 pb-5">
          <button
            onClick={() => onOpen("profile")}
            className="w-full flex items-center gap-3 p-3 tap"
            style={{ background: t.surface, borderRadius: RADIUS.md }}
          >
            <Avatar member={me} size={52} t={t} showStatus />
            <span className="flex-1 text-left min-w-0">
              <span className="block text-[17px] font-semibold" style={{ color: t.text }}>{me.name}</span>
              <span className="block text-[13.5px]" style={{ color: t.muted }}>{ROLE_LABEL[me.role]} · сменить профиль</span>
            </span>
            <ChevronRight size={17} style={{ color: t.faint }} />
          </button>
        </div>

        <Group t={t}>
          <Row title="Помощник" hint="Модель и поведение" value={modelLabel} onClick={() => onOpen("assistant")} t={t} />
          <Row title="Оформление" hint="Тема, размер текста, движение" value={settings.theme === "dark" ? "Тёмная" : "Светлая"} onClick={() => onOpen("appearance")} t={t} />
          <Row title="Звук и отклик" value={settings.sound ? "Включён" : "Выключен"} onClick={() => onOpen("sound")} t={t} />
          <Row title="Переписка" hint="Печатает, отправка по Enter" onClick={() => onOpen("chat")} t={t} last />
        </Group>

        <Group t={t}>
          <Row title="Права доступа" hint={`Что доступно роли «${ROLE_LABEL[me.role]}»`} onClick={() => onOpen("permissions")} t={t} last />
        </Group>

        <p className="text-center text-[12.5px] px-8" style={{ color: t.faint }}>
          Прототип. Комнаты, права и помощник работают, отправка на сервер — нет.
        </p>
      </div>

      <header ref={headerRef} className="absolute top-0 left-0 right-0 z-10 px-5 pb-3 safe-top blur-chrome" style={{ background: t.chromeAlpha }}>
        <h1 className="text-[28px] font-semibold" style={{ color: t.text, letterSpacing: "-0.035em" }}>Настройки</h1>
      </header>
    </div>
  );
}

/** Содержимое листов настроек — каждый короткий, по одной теме. */
function SettingsSheet({ id, me, t, settings, set, onSwitchUser, onClose }) {
  const titles = {
    profile: ["Профиль", "В прототипе можно войти за любого"],
    assistant: ["Помощник", "Как он правит текст"],
    appearance: ["Оформление", null],
    sound: ["Звук и отклик", null],
    chat: ["Переписка", null],
    permissions: ["Права доступа", `Роль «${ROLE_LABEL[me.role]}»`],
  };
  const [title, subtitle] = titles[id] || ["", null];

  return (
    <Sheet open={!!id} title={title} subtitle={subtitle} onClose={onClose} t={t}>
      <div className="px-4 pb-2">
        {id === "profile" && (
          <div className="space-y-1">
            {Object.values(MEMBERS).map((m) => (
              <button
                key={m.id}
                onClick={() => { onSwitchUser(m.id); onClose(); }}
                className="w-full flex items-center gap-3 p-2 tap"
                style={{ background: m.id === me.id ? t.surfaceAlt : "transparent", borderRadius: RADIUS.md }}
              >
                <Avatar member={m} size={42} t={t} />
                <span className="flex-1 text-left">
                  <span className="block text-[16px]" style={{ color: t.text }}>{m.name}</span>
                  <span className="block text-[13px]" style={{ color: m.hue }}>{ROLE_LABEL[m.role]}</span>
                </span>
                {m.id === me.id && <Check size={18} style={{ color: t.text }} />}
              </button>
            ))}
          </div>
        )}

        {id === "assistant" && (
          <>
            <p className="text-[12px] font-medium uppercase pb-2 pt-1" style={{ color: t.muted, letterSpacing: "0.07em" }}>Модель</p>
            <Segmented options={MODELS} value={settings.model} onChange={(v) => set("model", v)} t={t} />
            <p className="text-[13px] pt-2 pb-3" style={{ color: t.muted }}>
              {MODELS.find((m) => m.id === settings.model)?.hint}. В прототипе запрос идёт через одну доступную модель.
            </p>
            <div style={{ background: t.surfaceAlt, borderRadius: RADIUS.md, overflow: "hidden" }}>
              <Row title="Показывать «Было → Стало»" hint="Выключите — текст заменится сразу" t={t}
                right={<Toggle checked={settings.confirmRewrite} onChange={() => set("confirmRewrite", !settings.confirmRewrite)} t={t} />} />
              <Row title="Помощник детям" hint="Открыть кнопку роли «дети»" t={t} last
                right={<Toggle checked={settings.aiForKids} onChange={() => set("aiForKids", !settings.aiForKids)} t={t} />} />
            </div>
          </>
        )}

        {id === "appearance" && (
          <>
            <p className="text-[12px] font-medium uppercase pb-2 pt-1" style={{ color: t.muted, letterSpacing: "0.07em" }}>Тема</p>
            <Segmented options={[{ id: "light", label: "Светлая" }, { id: "dark", label: "Тёмная" }]} value={settings.theme} onChange={(v) => set("theme", v)} t={t} />
            <p className="text-[12px] font-medium uppercase pb-2 pt-4" style={{ color: t.muted, letterSpacing: "0.07em" }}>Размер текста</p>
            <Segmented options={[{ id: "S", label: "Мелкий" }, { id: "M", label: "Обычный" }, { id: "L", label: "Крупный" }]} value={settings.textSize} onChange={(v) => set("textSize", v)} t={t} />
            <div className="mt-4" style={{ background: t.surfaceAlt, borderRadius: RADIUS.md, overflow: "hidden" }}>
              <Row title="Анимации" hint="Появление сообщений и переходы" t={t} last
                right={<Toggle checked={settings.animations} onChange={() => set("animations", !settings.animations)} t={t} />} />
            </div>
          </>
        )}

        {id === "sound" && (
          <div style={{ background: t.surfaceAlt, borderRadius: RADIUS.md, overflow: "hidden" }}>
            <Row title="Звуки" hint="Отправка, ответ, помощник" t={t}
              right={<Toggle checked={settings.sound} onChange={() => set("sound", !settings.sound)} t={t} />} />
            <Row title="Вибрация" hint="Короткий отклик на действия" t={t} last
              right={<Toggle checked={settings.vibration} onChange={() => set("vibration", !settings.vibration)} t={t} />} />
          </div>
        )}

        {id === "chat" && (
          <div style={{ background: t.surfaceAlt, borderRadius: RADIUS.md, overflow: "hidden" }}>
            <Row title="Показывать «печатает…»" hint="И другим видно, когда пишете вы" t={t}
              right={<Toggle checked={settings.showTyping} onChange={() => set("showTyping", !settings.showTyping)} t={t} />} />
            <Row title="Enter отправляет" hint="Иначе Enter переносит строку" t={t} last
              right={<Toggle checked={settings.sendOnEnter} onChange={() => set("sendOnEnter", !settings.sendOnEnter)} t={t} />} />
          </div>
        )}

        {id === "permissions" && (
          <div style={{ background: t.surfaceAlt, borderRadius: RADIUS.md, overflow: "hidden" }}>
            {Object.keys(PERMISSION_LABEL).map((p, i, arr) => {
              const has = can(me, p, settings);
              return (
                <Row
                  key={p} title={PERMISSION_LABEL[p]} t={t} last={i === arr.length - 1}
                  right={has
                    ? <Check size={18} style={{ color: t.text }} />
                    : <Lock size={15} style={{ color: t.faint }} />}
                />
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ── 13. Корневой компонент ───────────────────────────────────────────────── */

export default function FamilyChat() {
  const { height: viewportHeight, keyboard } = useKeyboardInsets();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [currentUserId, setCurrentUserId] = useState("sonya");
  const [tab, setTab] = useState("chats");
  const [chatOpen, setChatOpen] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState("general");
  const [settingsSheet, setSettingsSheet] = useState(null);
  const [messagesByRoom, setMessagesByRoom] = useState(() => {
    const seeded = {};
    for (const [roomId, list] of Object.entries(SEED)) {
      seeded[roomId] = list.map((m) => ({ ...m, roomId, kind: "text", status: "read", enhanced: false, reactions: [] }));
    }
    return seeded;
  });
  const [drafts, setDrafts] = useState({});
  const [unread, setUnread] = useState({ kitchen: 2, board: 1, trips: 3, kids: 1, parents: 2 });
  const [typingByRoom, setTypingByRoom] = useState({});
  const [magic, setMagic] = useState({ open: false, phase: "menu", action: null, result: null });
  const [enhancedFlag, setEnhancedFlag] = useState(false);
  const [undoText, setUndoText] = useState(null);
  const [toast, setToast] = useState(null);

  const t = settings.theme === "dark" ? DARK : LIGHT;
  const me = MEMBERS[currentUserId];
  const room = ROOMS.find((r) => r.id === activeRoomId);
  const messages = messagesByRoom[activeRoomId] || [];
  const draft = drafts[activeRoomId] || "";

  const live = useRef({});
  live.current = { settings, me, activeRoomId, chatOpen };

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2600);
  };

  const set = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
    playSound("tap", key === "sound" ? value : settings.sound);
    vibrate(8, settings.vibration);
  };

  const setDraft = (text) => setDrafts((d) => ({ ...d, [activeRoomId]: text }));

  const preview = (roomId) => {
    const list = messagesByRoom[roomId] || [];
    const last = list[list.length - 1];
    if (!last) return { text: "Пока тихо. Напишите первым", time: "" };
    const who = last.authorId === currentUserId ? "Вы" : MEMBERS[last.authorId].name;
    return { text: `${who}: ${last.text}`, time: fmtTime(last.sentAt) };
  };

  const pushMessage = (roomId, message) =>
    setMessagesByRoom((prev) => ({ ...prev, [roomId]: [...(prev[roomId] || []), message] }));

  /* Комната живёт сама: кто-то печатает и отвечает, даже если вы молчите */
  useEffect(() => {
    let timer;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      timer = setTimeout(() => {
        if (stopped) return;
        const { settings: s, me: user, activeRoomId: active, chatOpen: open } = live.current;
        if (!s.showTyping) return tick();

        // Чаще оживает та комната, которую вы читаете
        const pool = ROOMS.filter((r) => canRead(user, r) && canWrite(user, r));
        const target = open && Math.random() < 0.65
          ? ROOMS.find((r) => r.id === active)
          : pool[Math.floor(Math.random() * pool.length)];
        if (!target) return tick();

        const speakers = Object.values(MEMBERS).filter((m) => m.id !== user.id && target.writeRoles.includes(m.role));
        if (!speakers.length) return tick();
        const who = speakers[Math.floor(Math.random() * speakers.length)];
        const bank = AMBIENT[target.id] || AMBIENT.general;
        const text = bank[Math.floor(Math.random() * bank.length)];

        setTypingByRoom((prev) => ({ ...prev, [target.id]: who.id }));
        timer = setTimeout(() => {
          if (stopped) return;
          setTypingByRoom((prev) => ({ ...prev, [target.id]: null }));
          pushMessage(target.id, {
            id: "a" + Date.now(), roomId: target.id, authorId: who.id, kind: "text",
            text, sentAt: Date.now(), status: "read", enhanced: false, reactions: [],
          });
          const cur = live.current;
          playSound("receive", cur.settings.sound);
          if (!(cur.chatOpen && cur.activeRoomId === target.id)) {
            setUnread((u) => ({ ...u, [target.id]: (u[target.id] || 0) + 1 }));
          }
          tick();
        }, 2200 + Math.random() * 1500);
      }, 6000 + Math.random() * 7000);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer); };
  }, []);

  const openRoom = (roomId) => {
    setActiveRoomId(roomId);
    setChatOpen(true);
    setUnread((u) => ({ ...u, [roomId]: 0 }));
    vibrate(6, settings.vibration);
  };

  const switchUser = (userId) => {
    const next = MEMBERS[userId];
    setCurrentUserId(userId);
    if (!canRead(next, room)) setActiveRoomId("general");
    showToast(`Вы вошли как ${next.name}`);
    playSound("tap", settings.sound);
  };

  /* Ответ на ваше сообщение */
  const scheduleReply = (roomId) => {
    const target = ROOMS.find((r) => r.id === roomId);
    const speakers = Object.values(MEMBERS).filter((m) => m.id !== currentUserId && target.writeRoles.includes(m.role));
    if (!speakers.length) return;
    const who = speakers[Math.floor(Math.random() * speakers.length)];
    const bank = REPLIES[who.id];
    const text = bank[Math.floor(Math.random() * bank.length)];

    setTimeout(() => setTypingByRoom((prev) => ({ ...prev, [roomId]: who.id })), 700);
    setTimeout(() => {
      setTypingByRoom((prev) => ({ ...prev, [roomId]: null }));
      pushMessage(roomId, {
        id: "r" + Date.now(), roomId, authorId: who.id, kind: "text",
        text, sentAt: Date.now(), status: "read", enhanced: false, reactions: [],
      });
      playSound("receive", live.current.settings.sound);
    }, 2600);
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !canWrite(me, room)) return;
    const id = "m" + Date.now();
    pushMessage(activeRoomId, {
      id, roomId: activeRoomId, authorId: me.id, kind: "text",
      text, sentAt: Date.now(), status: "sending", enhanced: enhancedFlag, reactions: [],
    });
    setDraft("");
    setEnhancedFlag(false);
    setUndoText(null);
    playSound("send", settings.sound);
    vibrate(10, settings.vibration);

    const status = (value) =>
      setMessagesByRoom((prev) => ({
        ...prev,
        [activeRoomId]: (prev[activeRoomId] || []).map((m) => (m.id === id ? { ...m, status: value } : m)),
      }));
    setTimeout(() => status("delivered"), 600);
    setTimeout(() => status("read"), 1700);
    scheduleReply(activeRoomId);
  };

  const toggleReaction = (messageId) => {
    setMessagesByRoom((prev) => ({
      ...prev,
      [activeRoomId]: (prev[activeRoomId] || []).map((m) =>
        m.id === messageId ? { ...m, reactions: m.reactions.length ? [] : [{ emoji: "❤️", userIds: [me.id] }] } : m),
    }));
    playSound("tap", settings.sound);
    vibrate(6, settings.vibration);
  };

  const openMagic = () => {
    if (!canEnhance(me, room, settings)) {
      showToast("Помощник доступен родителям и подросткам. Включить детям — в настройках");
      return;
    }
    if (draft.trim().length < 2) {
      showToast("Напишите черновик — помощник его поправит");
      return;
    }
    document.activeElement?.blur?.();
    playSound("magic", settings.sound);
    vibrate([6, 24, 6], settings.vibration);
    setMagic({ open: true, phase: "menu", action: null, result: null });
  };

  const runMagic = async (action) => {
    const text = draft.trim();
    setMagic({ open: true, phase: "loading", action, result: null });
    const recent = (messagesByRoom[activeRoomId] || []).slice(-4).map((m) => `${MEMBERS[m.authorId].name}: ${m.text}`);
    const answer = await requestEnhance({ action, text, room, member: me, recent });
    const result = { action, original: text, suggestion: answer.text, source: answer.source };

    if (live.current.settings.confirmRewrite) {
      setMagic({ open: true, phase: "preview", action, result });
      playSound("tap", live.current.settings.sound);
    } else {
      applyResult(result);
      showToast("Текст заменён");
    }
  };

  const applyResult = (result) => {
    setUndoText(result.original);
    setDraft(result.suggestion);
    setEnhancedFlag(true);
    setMagic({ open: false, phase: "menu", action: null, result: null });
    playSound("magic", live.current.settings.sound);
    vibrate(12, live.current.settings.vibration);
  };

  const undoMagic = () => {
    if (undoText === null) return;
    setDraft(undoText);
    setUndoText(null);
    setEnhancedFlag(false);
    vibrate(6, settings.vibration);
  };

  const TABS = [
    { id: "chats", label: "Чаты", Icon: MessageCircle },
    { id: "settings", label: "Настройки", Icon: Settings },
  ];
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <div
      className="w-full flex justify-center"
      style={{ background: t.bg, height: viewportHeight ? `${viewportHeight}px` : "100dvh", overflow: "hidden" }}
    >
      <style>{`
        .enter { animation: enter .3s ${SPRING} both; }
        .enter-left { animation: enterLeft .34s ${SPRING} both; }
        .enter-right { animation: enterRight .34s ${SPRING} both; }
        .pop { animation: pop .32s cubic-bezier(.2,1.5,.4,1) both; }
        .dot { display: inline-block; animation: dot 1.1s ease-in-out infinite; }
        .shimmer { background: linear-gradient(90deg, ${t.surfaceAlt} 20%, ${t.hairline} 50%, ${t.surfaceAlt} 80%);
                   background-size: 200% 100%; animation: shimmer 1.4s linear infinite; }
        .tap { transition: transform .14s ease, opacity .14s ease; }
        .tap:active { transform: scale(.94); opacity: .85; }
        .scroll-area { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
        .blur-chrome { backdrop-filter: saturate(180%) blur(22px); -webkit-backdrop-filter: saturate(180%) blur(22px); }
        .tnum { font-variant-numeric: tabular-nums; }
        .safe-top { padding-top: calc(env(safe-area-inset-top, 0px) + 14px); }
        .safe-bottom { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); }
        @keyframes enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes enterLeft { from { opacity: 0; transform: translate(-8px, 10px) scale(.96); } to { opacity: 1; transform: none; } }
        @keyframes enterRight { from { opacity: 0; transform: translate(8px, 10px) scale(.96); } to { opacity: 1; transform: none; } }
        @keyframes pop { 0% { opacity: 0; transform: scale(.3); } 65% { transform: scale(1.15); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes dot { 0%, 65%, 100% { transform: translateY(0); opacity: .45; } 30% { transform: translateY(-4px); opacity: 1; } }
        @keyframes shimmer { to { background-position: -200% 0; } }
        button:focus-visible, textarea:focus-visible { outline: 2px solid ${t.amber}; outline-offset: 2px; }
        .still *, .still *::before, .still *::after { animation: none !important; transition: none !important; }
      `}</style>

      <div
        className={`relative w-full max-w-md overflow-hidden ${settings.animations ? "" : "still"}`}
        style={{ height: "100%", background: t.bg, color: t.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif" }}
      >
        {/* Слой вкладок */}
        <div
          className="absolute inset-0"
          style={{
            transform: chatOpen ? "translateX(-22%)" : "none",
            filter: chatOpen ? "brightness(.94)" : "none",
            transition: `transform .4s ${SPRING}, filter .4s ease`,
          }}
        >
          {tab === "chats" ? (
            <ChatsScreen
              me={me} t={t} unread={unread} preview={preview} typingByRoom={typingByRoom}
              onOpen={openRoom} onDenied={showToast} onProfile={() => { setTab("settings"); setSettingsSheet("profile"); }}
            />
          ) : (
            <SettingsScreen me={me} t={t} settings={settings} onOpen={setSettingsSheet} />
          )}

          {/* Плавающие вкладки */}
          <nav
            className="absolute left-1/2 flex gap-1 p-1.5 blur-chrome"
            style={{
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
              transform: "translateX(-50%)",
              background: t.chromeAlpha, borderRadius: 22,
              boxShadow: "0 8px 30px rgba(20,19,26,.16)",
            }}
          >
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setTab(item.id); playSound("tap", settings.sound); }}
                  className="flex items-center gap-2 tap"
                  style={{
                    padding: "9px 16px", borderRadius: 18,
                    background: active ? t.text : "transparent",
                    color: active ? t.bg : t.muted,
                    transition: `background .28s ${SPRING}, color .2s ease`,
                  }}
                >
                  <span className="relative grid place-items-center">
                    <item.Icon size={18} />
                    {item.id === "chats" && totalUnread > 0 && !active && (
                      <span className="absolute pop" style={{ top: -3, right: -5, width: 7, height: 7, borderRadius: 4, background: t.amber }} />
                    )}
                  </span>
                  <span className="text-[14px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Слой переписки */}
        <div
          className="absolute inset-0"
          style={{
            transform: chatOpen ? "translateX(0)" : "translateX(100%)",
            transition: `transform .42s ${SPRING}`,
            boxShadow: "-16px 0 40px rgba(0,0,0,.20)",
          }}
        >
          <ChatScreen
            me={me} t={t} settings={settings} room={room} messages={messages} draft={draft}
            typingId={typingByRoom[activeRoomId]} magicBusy={magic.open && magic.phase === "loading"}
            enhanced={enhancedFlag} undoText={undoText} keyboard={keyboard}
            onBack={() => { setChatOpen(false); vibrate(6, settings.vibration); }}
            onDraft={setDraft} onSend={sendMessage} onMagic={openMagic} onUndo={undoMagic} onReact={toggleReaction}
          />
        </div>

        <MagicSheet
          open={magic.open} phase={magic.phase} action={magic.action} result={magic.result}
          t={t} settings={settings}
          onRun={runMagic}
          onApply={() => magic.result && applyResult(magic.result)}
          onClose={() => setMagic({ open: false, phase: "menu", action: null, result: null })}
          onToggleSound={() => set("sound", !settings.sound)}
          onModel={(v) => set("model", v)}
        />

        <SettingsSheet
          id={settingsSheet} me={me} t={t} settings={settings} set={set}
          onSwitchUser={switchUser} onClose={() => setSettingsSheet(null)}
        />

        <Toast text={toast} t={t} bottom={chatOpen ? 96 : 100} />
      </div>
    </div>
  );
}
