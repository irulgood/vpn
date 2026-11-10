require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { Telegraf, Markup, session } = require('telegraf');
const execFileAsync = promisify(execFile);

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_IDS = (process.env.ADMIN_IDS || '')
  .split(',')
  .map(s => Number(String(s).trim()))
  .filter(Boolean);

const DATA_DIR = path.join(__dirname, 'user_data');
const TEMP_DIR = path.join(__dirname, 'temp_actions');
const ALLOWED_USERS_FILE = path.join(__dirname, 'allowed_users.json');
const ALL_USERS_FILE = path.join(__dirname, 'all_users.json');
const CREATE_WILDCARD_SCRIPT = path.join(__dirname, 'add-wc.sh');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

for (const p of [DATA_DIR, TEMP_DIR]) {
  try { fs.chmodSync(p, 0o777); } catch {}
}

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN belum diisi di .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const lastBotMessage = new Map();

function getChatId(ctx) {
  return ctx.chat?.id || ctx.callbackQuery?.message?.chat?.id;
}

async function deleteLastBotMessage(ctx) {
  const chatId = getChatId(ctx);
  if (!chatId) return;

  const lastMessageId = lastBotMessage.get(chatId);
  if (!lastMessageId) return;

  try {
    await ctx.telegram.deleteMessage(chatId, lastMessageId);
  } catch {}
}

function rememberBotMessage(ctx, message) {
  const chatId = getChatId(ctx);
  if (!chatId || !message?.message_id) return;
  lastBotMessage.set(chatId, message.message_id);
}

async function replyAndTrack(ctx, text, extra = {}) {
  await deleteLastBotMessage(ctx);
  const sent = await ctx.reply(text, extra);
  rememberBotMessage(ctx, sent);
  return sent;
}

async function editOrReplyAndTrack(ctx, text, extra = {}) {
  if (ctx.updateType === 'callback_query') {
    try {
      await ctx.editMessageText(text, extra);
      const msgId = ctx.callbackQuery?.message?.message_id;
      const chatId = getChatId(ctx);
      if (chatId && msgId) lastBotMessage.set(chatId, msgId);
      return;
    } catch {}
  }
  return replyAndTrack(ctx, text, extra);
}

async function deleteUserMessage(ctx) {
  try {
    if (ctx.message?.message_id) {
      await ctx.deleteMessage(ctx.message.message_id);
    }
  } catch {}
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function getUserFile(userId) {
  return path.join(DATA_DIR, `${userId}.json`);
}

function getUserData(userId) {
  return readJson(getUserFile(userId), null);
}

function saveUserData(userId, data) {
  writeJson(getUserFile(userId), data);
}

function deleteUserData(userId) {
  try {
    fs.unlinkSync(getUserFile(userId));
    return true;
  } catch {
    return false;
  }
}

function loadAllowedUsers() {
  return readJson(ALLOWED_USERS_FILE, []);
}

function saveAllowedUsers(users) {
  writeJson(ALLOWED_USERS_FILE, users);
}

function isAllowed(userId) {
  return ADMIN_IDS.includes(userId) || loadAllowedUsers().includes(userId);
}

function saveUserOnce(userId) {
  const users = readJson(ALL_USERS_FILE, []);
  if (!users.includes(userId)) {
    users.push(userId);
    writeJson(ALL_USERS_FILE, users);
  }
}

function escapeMd(text = '') {
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function mentionUser(ctx) {
  const name = ctx.from?.first_name || ctx.from?.username || 'User';
  return escapeMd(name);
}

function mainDivider() {
  return '━━━━━━━━━━━━━━━━━━━━━━━';
}

function premiumMainText(ctx, extra = '') {
  const user = getUserData(ctx.from.id);
  const allowed = isAllowed(ctx.from.id);
  const totalDomains = user?.domains?.length || 0;

  return [
    '╭─────────────────────╮',
    '│ ✨ *ANSENDANT BOT CF* ✨ │',
    '╰─────────────────────╯',
    '',
    `👤 *User:* ${mentionUser(ctx)}`,
    `🆔 *ID:* \`${ctx.from.id}\``,
    `🔐 *Akses:* ${allowed ? '✅ Diizinkan' : '❌ Belum diizinkan'}`,
    `🔑 *Status akun:* ${user ? '✅ Sudah login' : 'ℹ️ Belum login'}`,
    `🌐 *Total domain:* ${totalDomains}`,
    '',
    mainDivider(),
    '📋 *Menu Utama*',
    '• Kelola domain Cloudflare',
    '• Buat / hapus wildcard',
    '• Cek DNS record',
    '• Multi akun login/logout',
    mainDivider(),
    extra || ''
  ].filter(Boolean).join('\n');
}

function premiumAboutText() {
  return `╭────────────────────────╮
│ 📒 *INFORMASI TENTANG BOT* │
╰────────────────────────╯

🤖 Bot ini membantu kamu mengelola DNS Record di Cloudflare untuk keperluan tunneling dan kebutuhan lainnya\\. 🚀

${mainDivider()}
📦 *Fitur Bot:*
» *Bisa membuat wildcard*
» *Bisa edit type record subdomain*
» *Bisa buat subdomain type CNAME*
» *Bisa atur status awan orange 🟠 ON atau OFF*
» *Bisa hapus subdomain yang dipilih*
» *Otomatis memindai domain utama di akun CF kalian*
» *Ada fitur log out akun, jadi bisa gonta ganti ke akun lain*
${mainDivider()}

💬 *Untuk sewa bot premium:*
Hubungi admin ganteng 👉 @ARI_VPN_STORE`;
}

function domainPanel(zoneName) {
  return `╭──────────────────────╮
│ 🌐 *KELOLA DOMAIN AKTIF* │
╰──────────────────────╯

📌 *Domain:* \`${escapeMd(zoneName)}\`

${mainDivider()}
Pilih menu yang ingin kamu gunakan di bawah ini\\.`;
}

function backToMainKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🏠 Menu Utama', 'back_main')]
  ]);
}

function cancelKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('⬅️ Kembali', 'back_domain'),
      Markup.button.callback('❌ Batal', 'cancel_action')
    ]
  ]);
}

function domainActionKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✨ Buat Wildcard', 'create_wc')],
    [Markup.button.callback('🗑 Hapus Wildcard', 'delete_wc')],
    [Markup.button.callback('📋 Lihat DNS Record', 'list_dns')],
    [
      Markup.button.callback('⬅️ Kembali', 'back_main'),
      Markup.button.callback('❌ Batal', 'cancel_action')
    ]
  ]);
}

async function cfRequest(method, url, email, apiKey, data) {
  const res = await axios({
    method,
    url,
    data,
    timeout: 20000,
    headers: {
      'X-Auth-Email': email,
      'X-Auth-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
  return res.data;
}

async function getAccounts(email, apiKey) {
  const data = await cfRequest('get', 'https://api.cloudflare.com/client/v4/accounts', email, apiKey);
  return data.result || [];
}

async function getZones(email, apiKey) {
  const data = await cfRequest('get', 'https://api.cloudflare.com/client/v4/zones', email, apiKey);
  return data.result || [];
}

async function getDnsRecords(email, apiKey, zoneId) {
  const data = await cfRequest('get', `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, email, apiKey);
  return data.result || [];
}

async function deleteDnsRecord(email, apiKey, zoneId, dnsId) {
  return cfRequest('delete', `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${dnsId}`, email, apiKey);
}

function mainKeyboard(userId) {
  const loggedIn = !!getUserData(userId);
  const isAdmin = ADMIN_IDS.includes(userId);
  const rows = [];

  if (!loggedIn) {
    rows.push([Markup.button.callback('🔑 Login Cloudflare', 'go_login')]);
  } else {
    rows.push([Markup.button.callback('🌐 Kelola Domain', 'manage_domains')]);
  }

  rows.push([
    Markup.button.callback('📒 Informasi Bot', 'about'),
    Markup.button.callback('🔄 Refresh', 'back_main')
  ]);

  if (loggedIn) {
    rows.push([Markup.button.callback('🚪 Logout Akun', 'logout')]);
  }

  if (isAdmin) {
    rows.push([
      Markup.button.callback('👥 List Member', 'list_member'),
      Markup.button.callback('📢 Broadcast', 'broadcast')
    ]);
  }

  return Markup.inlineKeyboard(rows);
}

async function sendMainMenu(ctx, extra = '') {
  const text = premiumMainText(ctx, extra);
  return editOrReplyAndTrack(ctx, text, {
    parse_mode: 'Markdown',
    ...mainKeyboard(ctx.from.id)
  });
}

function requireAllowed(ctx, next) {
  saveUserOnce(ctx.from.id);
  if (!isAllowed(ctx.from.id)) {
    return ctx.reply('❌ Kamu belum diizinkan menggunakan bot ini.');
  }
  return next();
}

bot.use((ctx, next) => requireAllowed(ctx, next));

bot.start(async (ctx) => {
  ctx.session = {};
  await sendMainMenu(ctx, '🎉 *Selamat datang di bot pengelola Cloudflare premium*');
});

bot.command('menu', async (ctx) => {
  ctx.session = {};
  await sendMainMenu(ctx);
});

bot.command('ping', async (ctx) => {
  await replyAndTrack(ctx, '🏓 Pong! Bot aktif.');
});

bot.action('about', async (ctx) => {
  await ctx.answerCbQuery();
  await replyAndTrack(ctx, premiumAboutText(), {
    parse_mode: 'MarkdownV2',
    ...backToMainKeyboard()
  });
});

bot.action('go_login', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.step = 'login_email';

  const msg = `╭────────────────────╮
│ 🔐 *LOGIN CLOUDFLARE* │
╰────────────────────╯

Masukkan *email Cloudflare* kamu untuk memulai login\\.
${mainDivider()}`;

  await replyAndTrack(ctx, msg, {
    parse_mode: 'MarkdownV2',
    ...cancelKeyboard()
  });
});

bot.action('logout', async (ctx) => {
  await ctx.answerCbQuery();
  deleteUserData(ctx.from.id);
  ctx.session = {};
  await sendMainMenu(ctx, '✅ *Logout berhasil, akun Cloudflare sudah dilepas*');
});

bot.action('manage_domains', async (ctx) => {
  await ctx.answerCbQuery();
  const user = getUserData(ctx.from.id);
  if (!user) return replyAndTrack(ctx, '❌ Kamu belum login.');

  const domains = (user.domains || []).slice(0, 50);
  const buttons = domains.map(d => [
    Markup.button.callback(`🌐 ${d.name}`, `zone:${d.zone_id}`)
  ]);

  if (!buttons.length) {
    return replyAndTrack(ctx, '❌ Domain belum ada. Login ulang ya.');
  }

  buttons.push([
    Markup.button.callback('🏠 Menu Utama', 'back_main'),
    Markup.button.callback('❌ Batal', 'cancel_action')
  ]);

  const msg = `╭─────────────────────────╮
│ 🌍 *DAFTAR DOMAIN CLOUDFLARE* │
╰─────────────────────────╯

Silakan pilih domain yang ingin kamu kelola\\.
📦 *Total domain:* *${domains.length}*
${mainDivider()}`;

  await replyAndTrack(ctx, msg, {
    parse_mode: 'MarkdownV2',
    ...Markup.inlineKeyboard(buttons)
  });
});

bot.action(/zone:(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const zoneId = ctx.match[1];
  const user = getUserData(ctx.from.id);
  if (!user) return replyAndTrack(ctx, '❌ Kamu belum login.');

  const zone = (user.domains || []).find(z => z.zone_id === zoneId);
  if (!zone) return replyAndTrack(ctx, '❌ Domain tidak ditemukan.');

  ctx.session.zoneId = zoneId;
  ctx.session.zoneName = zone.name;

  await replyAndTrack(ctx, domainPanel(zone.name), {
    parse_mode: 'MarkdownV2',
    ...domainActionKeyboard()
  });
});

bot.action('back_main', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.step = null;
  await sendMainMenu(ctx);
});

bot.action('back_domain', async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.session.zoneId || !ctx.session.zoneName) {
    ctx.session.step = null;
    return sendMainMenu(ctx);
  }

  ctx.session.step = null;
  await replyAndTrack(ctx, domainPanel(ctx.session.zoneName), {
    parse_mode: 'MarkdownV2',
    ...domainActionKeyboard()
  });
});

bot.action('cancel_action', async (ctx) => {
  await ctx.answerCbQuery('Aksi dibatalkan');
  ctx.session.step = null;
  await sendMainMenu(ctx, '❌ *Aksi berhasil dibatalkan*');
});

bot.action('list_dns', async (ctx) => {
  await ctx.answerCbQuery();
  const user = getUserData(ctx.from.id);
  const zoneId = ctx.session.zoneId;
  if (!user || !zoneId) return replyAndTrack(ctx, '❌ Pilih domain dulu.');

  try {
    const records = await getDnsRecords(user.email, user.api_key, zoneId);
    const lines = records.slice(0, 20).map((r, i) =>
      `*${i + 1}.* \`${escapeMd(r.type)}\` • \`${escapeMd(r.name)}\`\n   └ ${escapeMd(r.content)}`
    );

    const msg = lines.length
      ? `╭───────────────────╮
│ 📋 *DAFTAR DNS RECORD* │
╰───────────────────╯

${lines.join('\n\n')}`
      : `╭───────────────────╮
│ 📋 *DAFTAR DNS RECORD* │
╰───────────────────╯

Belum ada DNS record\\.`;

    await replyAndTrack(ctx, msg, {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('⬅️ Kembali', 'back_domain'),
          Markup.button.callback('🏠 Menu', 'back_main')
        ]
      ])
    });
  } catch (e) {
    await replyAndTrack(ctx, `❌ Gagal ambil DNS: ${e.response?.data?.errors?.[0]?.message || e.message}`);
  }
});

bot.action('create_wc', async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.session.zoneId) return replyAndTrack(ctx, '❌ Pilih domain dulu.');

  ctx.session.step = 'create_wc';

  const msg = `╭─────────────────────╮
│ ✨ *BUAT WILDCARD BARU* │
╰─────────────────────╯

Masukkan *label subdomain* untuk wildcard\\.

📌 *Contoh:*
Jika isi \`api\`
maka hasilnya menjadi:
\`*.api.${escapeMd(ctx.session.zoneName)}\``;

  await replyAndTrack(ctx, msg, {
    parse_mode: 'MarkdownV2',
    ...cancelKeyboard()
  });
});

bot.action('delete_wc', async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.session.zoneId) return replyAndTrack(ctx, '❌ Pilih domain dulu.');

  ctx.session.step = 'delete_wc';

  const msg = `╭──────────────────╮
│ 🗑 *HAPUS WILDCARD* │
╰──────────────────╯

Masukkan *label subdomain wildcard* yang ingin dihapus\\.

📌 *Contoh:*
\`api\``;

  await replyAndTrack(ctx, msg, {
    parse_mode: 'MarkdownV2',
    ...cancelKeyboard()
  });
});

bot.action('list_member', async (ctx) => {
  await ctx.answerCbQuery();
  if (!ADMIN_IDS.includes(ctx.from.id)) return;

  const users = loadAllowedUsers();
  const msg = users.length
    ? `╭──────────────────╮
│ 👥 *DAFTAR MEMBER BOT* │
╰──────────────────╯

${users.map((u, i) => `*${i + 1}.* \`${u}\``).join('\n')}`
    : `╭──────────────────╮
│ 👥 *DAFTAR MEMBER BOT* │
╰──────────────────╯

Belum ada member\\.`;

  await replyAndTrack(ctx, msg, {
    parse_mode: 'MarkdownV2',
    ...backToMainKeyboard()
  });
});

bot.action('broadcast', async (ctx) => {
  await ctx.answerCbQuery();
  if (!ADMIN_IDS.includes(ctx.from.id)) return;

  ctx.session.step = 'broadcast';
  await replyAndTrack(ctx, `╭──────────────────╮
│ 📢 *BROADCAST PESAN* │
╰──────────────────╯

Silakan kirim pesan broadcast sekarang\\.`, {
    parse_mode: 'MarkdownV2',
    ...cancelKeyboard()
  });
});

bot.command('add_member', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from.id)) return replyAndTrack(ctx, 'Khusus admin.');

  const arg = ctx.message.text.split(/\s+/)[1];
  const uid = Number(arg);
  if (!uid) return replyAndTrack(ctx, 'Format: /add_member 123456789');

  const users = loadAllowedUsers();
  if (!users.includes(uid)) users.push(uid);
  saveAllowedUsers(users);

  return replyAndTrack(ctx, '✅ Member ditambahkan.');
});

bot.command('del_member', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from.id)) return replyAndTrack(ctx, 'Khusus admin.');

  const arg = Number(ctx.message.text.split(/\s+/)[1]);
  if (!arg) return replyAndTrack(ctx, 'Format: /del_member 123456789');

  saveAllowedUsers(loadAllowedUsers().filter(x => x !== arg));
  return replyAndTrack(ctx, '✅ Member dihapus.');
});

bot.on('text', async (ctx) => {
  const step = ctx.session?.step;
  if (!step) return;

  const text = ctx.message.text.trim();
  await deleteUserMessage(ctx);

  if (step === 'login_email') {
    ctx.session.email = text;
    ctx.session.step = 'login_key';
    return replyAndTrack(ctx, '🔐 Masukkan Global API Key Cloudflare kamu:', {
      ...cancelKeyboard()
    });
  }

  if (step === 'login_key') {
    ctx.session.apiKey = text;
    try {
      const accounts = await getAccounts(ctx.session.email, ctx.session.apiKey);
      const zones = await getZones(ctx.session.email, ctx.session.apiKey);

      if (!zones.length) {
        ctx.session = {};
        return replyAndTrack(ctx, '❌ Tidak ada zone/domain ditemukan di akun ini.');
      }

      saveUserData(ctx.from.id, {
        email: ctx.session.email,
        api_key: ctx.session.apiKey,
        account_id: accounts[0]?.id || '',
        domains: zones.map(z => ({ zone_id: z.id, name: z.name }))
      });

      ctx.session = {};
      return sendMainMenu(ctx, `✅ *Login berhasil*
🌐 *Domain terdeteksi:* *${zones.length}*`);
    } catch (e) {
      ctx.session = {};
      return replyAndTrack(ctx, `❌ Login gagal: ${e.response?.data?.errors?.[0]?.message || e.message}`);
    }
  }

  if (step === 'create_wc') {
    const label = text.replace(/\s+/g, '');
    const zoneId = ctx.session.zoneId;

    try {
      const { stdout, stderr } = await execFileAsync(
        'bash',
        [CREATE_WILDCARD_SCRIPT, String(ctx.from.id), zoneId, label],
        { cwd: __dirname, timeout: 120000 }
      );

      ctx.session.step = null;
      return replyAndTrack(ctx, `✅ Proses selesai.\n\n${stdout || stderr || 'Tidak ada output.'}`, {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('⬅️ Kembali', 'back_domain'),
            Markup.button.callback('🏠 Menu', 'back_main')
          ]
        ])
      });
    } catch (e) {
      ctx.session.step = null;
      return replyAndTrack(ctx, `❌ Gagal membuat wildcard.\n${e.stdout || e.stderr || e.message}`, {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('⬅️ Kembali', 'back_domain'),
            Markup.button.callback('🏠 Menu', 'back_main')
          ]
        ])
      });
    }
  }

  if (step === 'delete_wc') {
    const user = getUserData(ctx.from.id);
    const zoneId = ctx.session.zoneId;
    const fqdn = `*.${text}.${ctx.session.zoneName}`;

    try {
      const records = await getDnsRecords(user.email, user.api_key, zoneId);
      const targets = records.filter(r => r.name === fqdn);

      if (!targets.length) {
        ctx.session.step = null;
        return replyAndTrack(ctx, `ℹ️ DNS wildcard ${fqdn} tidak ditemukan.`, {
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('⬅️ Kembali', 'back_domain'),
              Markup.button.callback('🏠 Menu', 'back_main')
            ]
          ])
        });
      }

      for (const r of targets) {
        await deleteDnsRecord(user.email, user.api_key, zoneId, r.id);
      }

      ctx.session.step = null;
      return replyAndTrack(ctx, `✅ Wildcard DNS ${fqdn} berhasil dihapus.`, {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('⬅️ Kembali', 'back_domain'),
            Markup.button.callback('🏠 Menu', 'back_main')
          ]
        ])
      });
    } catch (e) {
      ctx.session.step = null;
      return replyAndTrack(ctx, `❌ Gagal hapus wildcard: ${e.response?.data?.errors?.[0]?.message || e.message}`, {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('⬅️ Kembali', 'back_domain'),
            Markup.button.callback('🏠 Menu', 'back_main')
          ]
        ])
      });
    }
  }

  if (step === 'broadcast' && ADMIN_IDS.includes(ctx.from.id)) {
    const users = readJson(ALL_USERS_FILE, []);
    let okCount = 0;

    for (const uid of users) {
      try {
        await bot.telegram.sendMessage(uid, text);
        okCount++;
      } catch {}
    }

    ctx.session.step = null;
    return replyAndTrack(ctx, `✅ Broadcast terkirim ke ${okCount} user.`, {
      ...backToMainKeyboard()
    });
  }
});

bot.catch((err, ctx) => {
  console.error('BOT ERROR', err);
  ctx.reply('❌ Terjadi error internal.').catch(() => {});
});

bot.launch().then(() => console.log('Bot Node.js berjalan'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));