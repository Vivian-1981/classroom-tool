/**
 * Supabase 配置文件（替换 LeanCloud 版本）
 *
 * 配置步骤（约10分钟，浏览器操作，不需要装任何东西）：
 *
 * 1. 打开 https://supabase.com → 注册 → New Project
 *    项目名随意，密码随意，区域选 Northeast Asia (Tokyo) 或 Southeast Asia
 *
 * 2. 创建数据库表：进入项目 → SQL Editor → 把下面的 SQL 粘贴进去全部运行
 *
 * ─── 复制以下 SQL 到 Supabase SQL Editor ─────────────────────────
 *
 *   create table class_sessions (
 *     id uuid default gen_random_uuid() primary key,
 *     label text, is_active boolean default true,
 *     created_at timestamptz default now()
 *   );
 *   create table attendance (
 *     id uuid default gen_random_uuid() primary key,
 *     session_id uuid, name text not null, gender text default 'F',
 *     created_at timestamptz default now(),
 *     unique(session_id, name)
 *   );
 *   create table groups (
 *     id uuid default gen_random_uuid() primary key,
 *     session_id uuid, group_num int, members text,
 *     created_at timestamptz default now()
 *   );
 *   create table teacher_scores (
 *     id uuid default gen_random_uuid() primary key,
 *     session_id uuid, group_id uuid,
 *     score int, comment text,
 *     created_at timestamptz default now(),
 *     unique(group_id)
 *   );
 *   create table peer_scores (
 *     id uuid default gen_random_uuid() primary key,
 *     session_id uuid, from_name text,
 *     to_group_id uuid, reaction text, comment text,
 *     created_at timestamptz default now()
 *   );
 *   alter table class_sessions  disable row level security;
 *   alter table attendance       disable row level security;
 *   alter table groups           disable row level security;
 *   alter table teacher_scores   disable row level security;
 *   alter table peer_scores      disable row level security;
 *
 * ─────────────────────────────────────────────────────────────────
 *
 * 3. 复制凭证：Project Settings → API → 复制以下两项填入下方
 *    • Project URL  （形如 https://xxxxxxxxxxxx.supabase.co）
 *    • anon / public key （一长串 JWT 字符串）
 */

const SUPABASE_URL      = "https://olnxhxzblfrfbmjaskxh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nlUdlYJhhfU2K-GhSgPYXg_XXto8dPg";

// ── Supabase 客户端（调用 initSB() 后可用） ───────────────────────
let sb = null;
function initSB() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ── 班级花名册（可修改） ──────────────────────────────────────────
const ROSTER = [
  ["张欣雨","F"],["李明月","F"],["王雪","F"],  ["陈思远","F"],
  ["刘芳","F"], ["杨晴","F"], ["赵丽华","F"], ["吴婷","F"],
  ["周梅","F"], ["徐静","F"], ["孙玲","F"],  ["朱芸","F"],
  ["胡雪莲","F"],["林颖","F"], ["何玉","F"],  ["马丽","F"],
  ["高燕","F"], ["郑雯","F"], ["肖倩","F"],  ["罗敏","F"],
  ["谢娜","F"], ["钱欢","F"], ["冯雨","F"],  ["沈晨","F"],
  ["陈浩","M"], ["王磊","M"], ["李强","M"],  ["张伟","M"],
];

// ── 签到防伪 Token ────────────────────────────────────────────
// 静态模式：t="static"，永不过期
// 动态模式：t=时间token，间隔由老师设置
const TOKEN_SECRET = "sufe-ls-2025";

function makeToken(offset = 0, intervalSec = 30) {
  const win = Math.floor(Date.now() / (intervalSec * 1000)) + offset;
  let h = 5381;
  const s = TOKEN_SECRET + intervalSec + win;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  return (h % 100000000).toString().padStart(8, "0");
}

function isValidToken(t, intervalSec = 30) {
  if (!t || t === "static") return true;  // 静态模式直接通过
  return [makeToken(0, intervalSec), makeToken(-1, intervalSec), makeToken(-2, intervalSec)].includes(t);
}

function tokenExpiresIn(intervalSec = 30) {
  return intervalSec - (Math.floor(Date.now() / 1000) % intervalSec);
}
function getGender(name) { const e = ROSTER.find(r => r[0] === name); return e ? e[1] : "F"; }
