/**
 * ====================================================================
 * IRULTUN VPS REST API BRIDGE SERVER (Express.js on Port 5889)
 * Bridge penghubung langsung antara IRULTUN Botweb & Autoscript VPS
 * 100% Selaras & Kompatibel dengan Swagger Potato Tunneling API:
 * (http://bizt.irul-tun.my.id/vps/docs/index.html)
 * ====================================================================
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5889;
const ETC_DIR = process.env.ETC_DIR || '/etc';

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper eksekusi shell command aman
function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 15000 }).trim();
  } catch (e) {
    return '';
  }
}

// Helper baca file aman
function safeRead(filePath, fallback = '') {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8').trim();
    }
  } catch (e) {}
  return fallback;
}

// Sinkronisasi database akun Xray (VMess, VLESS, Trojan) ke /etc/xray/config.json secara valid JSON
function syncXrayConfig() {
  const cfgPath = `${ETC_DIR}/xray/config.json`;
  if (!fs.existsSync(cfgPath)) return;

  try {
    // Baca database akun
    const vmessUsers = [];
    const vlessUsers = [];
    const trojanUsers = [];

    const readDb = (file, pfx, targetArr) => {
      if (fs.existsSync(file)) {
        const seen = new Set();
        const lines = fs.readFileSync(file, 'utf8').split('\n');
        for (let l of lines) {
          const parts = l.trim().split(/\s+/);
          if (parts[0] === pfx && parts[1] && parts[3]) {
            if (!seen.has(parts[1])) {
              seen.add(parts[1]);
              // Format exp bisa YYYY-MM-DD atau YYYY-MM-DD HH:mm:ss
              // parts[2] adalah tanggal, parts[3] bisa jam (jika ada jam) atau UUID
              let exp = parts[2];
              let uuid = parts[3];
              if (parts[3] && parts[3].includes(':') && parts[4]) {
                exp = `${parts[2]} ${parts[3]}`;
                uuid = parts[4];
              }
              targetArr.push({
                username: parts[1],
                exp: exp || '',
                uuid: uuid
              });
            }
          }
        }
      }
    };

    readDb(`${ETC_DIR}/vmess/.vmess.db`, '###', vmessUsers);
    readDb(`${ETC_DIR}/vless/.vless.db`, '#&', vlessUsers);
    readDb(`${ETC_DIR}/trojan/.trojan.db`, '#!', trojanUsers);

    // Bangun clients
    const vlessClients = vlessUsers.map(u => ({ id: u.uuid, email: u.username }));
    const vmessClients = vmessUsers.map(u => ({ id: u.uuid, alterId: 0, email: u.username }));
    const trojanClients = trojanUsers.map(u => ({ password: u.uuid, email: u.username }));

    // Fallback jika kosong agar daemon tidak error
    const dummy = '0c9b6858-0a3c-4b2b-bd61-5370d7102670';
    if (vlessClients.length === 0) vlessClients.push({ id: dummy, email: 'default' });
    if (vmessClients.length === 0) vmessClients.push({ id: dummy, alterId: 0, email: 'default' });
    if (trojanClients.length === 0) trojanClients.push({ password: dummy, email: 'default' });

    // Client gRPC wajib pakai email berbeda (misal ditambah -grpc) agar Xray v26 tidak menolak duplicate email
    const vlessGrpcClients = vlessClients.map(c => ({ ...c, email: `${c.email}-grpc` }));
    const vmessGrpcClients = vmessClients.map(c => ({ ...c, email: `${c.email}-grpc` }));
    const trojanGrpcClients = trojanClients.map(c => ({ ...c, email: `${c.email}-grpc` }));

    // Format list dengan komentar tag untuk kompatibilitas skrip bash (grep/sed)
    const formatClientsWithTag = (clients, tag, pfx, userList) => {
      let str = '[\n';
      clients.forEach((c, idx) => {
        const u = userList.find(item => item.username === c.email);
        const comment = u ? `### ${u.username} ${u.exp}`.replace('###', pfx) : `#default`;
        const cJson = JSON.stringify(c);
        str += `               ${cJson}`;
        if (idx < clients.length - 1) str += ',';
        str += `\n${comment}\n`;
      });
      str += `               #${tag}\n            ]`;
      return str;
    };

    const fullConfig = {
      log: {
        access: '/var/log/xray/access.log',
        error: '/var/log/xray/error.log',
        loglevel: 'warning'
      },
      inbounds: [
        {
          listen: '127.0.0.1',
          port: 10085,
          protocol: 'dokodemo-door',
          settings: { address: '127.0.0.1' },
          tag: 'api'
        },
        {
          listen: '127.0.0.1',
          port: 14016,
          protocol: 'vless',
          settings: { decryption: 'none', clients: vlessClients },
          streamSettings: { network: 'ws', wsSettings: { path: '/vless' } }
        },
        {
          listen: '127.0.0.1',
          port: 23456,
          protocol: 'vmess',
          settings: { clients: vmessClients },
          streamSettings: { network: 'ws', wsSettings: { path: '/vmess' } }
        },
        {
          listen: '127.0.0.1',
          port: 25432,
          protocol: 'trojan',
          settings: { decryption: 'none', clients: trojanClients, udp: true },
          streamSettings: { network: 'ws', wsSettings: { path: '/trojan-ws' } }
        },
        {
          listen: '127.0.0.1',
          port: 30300,
          protocol: 'shadowsocks',
          settings: {
            clients: [{ method: 'aes-128-gcm', password: dummy, email: 'default' }],
            network: 'tcp,udp'
          },
          streamSettings: { network: 'ws', wsSettings: { path: '/ss-ws' } }
        },
        {
          listen: '127.0.0.1',
          port: 24456,
          protocol: 'vless',
          settings: { decryption: 'none', clients: vlessGrpcClients },
          streamSettings: { network: 'grpc', grpcSettings: { serviceName: 'vless-grpc' } }
        },
        {
          listen: '127.0.0.1',
          port: 31234,
          protocol: 'vmess',
          settings: { clients: vmessGrpcClients },
          streamSettings: { network: 'grpc', grpcSettings: { serviceName: 'vmess-grpc' } }
        },
        {
          listen: '127.0.0.1',
          port: 33456,
          protocol: 'trojan',
          settings: { decryption: 'none', clients: trojanGrpcClients },
          streamSettings: { network: 'grpc', grpcSettings: { serviceName: 'trojan-grpc' } }
        },
        {
          listen: '127.0.0.1',
          port: 30310,
          protocol: 'shadowsocks',
          settings: {
            clients: [{ method: 'aes-128-gcm', password: dummy, email: 'default' }],
            network: 'tcp,udp'
          },
          streamSettings: { network: 'grpc', grpcSettings: { serviceName: 'ss-grpc' } }
        }
      ],
      outbounds: [
        { protocol: 'freedom', settings: {} },
        { protocol: 'blackhole', settings: {}, tag: 'blocked' }
      ],
      routing: {
        rules: [
          {
            type: 'field',
            ip: [
              '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '169.254.0.0/16',
              '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24', '192.168.0.0/16',
              '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24', '::1/128',
              'fc00::/7', 'fe80::/10'
            ],
            outboundTag: 'blocked'
          },
          { inboundTag: ['api'], outboundTag: 'api', type: 'field' },
          { type: 'field', outboundTag: 'blocked', protocol: ['bittorrent'] }
        ]
      },
      stats: {},
      api: { services: ['StatsService'], tag: 'api' },
      policy: {
        levels: { '0': { statsUserDownlink: true, statsUserUplink: true } },
        system: { statsInboundDownlink: true, statsInboundUplink: true }
      }
    };

    fs.writeFileSync(cfgPath, JSON.stringify(fullConfig, null, 2), 'utf8');

    // Suntikkan tag penanda (#vmess, #vless, dll) secara aman di luar JSON atau via format agar skrip CLI tetap bisa deteksi
    // Di sini kita cek validitas dengan xray test sebelum reload
    run('xray run -test -config /etc/xray/config.json >/dev/null 2>&1 && systemctl restart xray 2>/dev/null || true');
  } catch (err) {
    console.error('syncXrayConfig error:', err);
  }
}

// Ambil IP Publik VPS
let cachedIP = null;
function getServerIP() {
  if (cachedIP) return cachedIP;
  cachedIP = run('curl -sS --max-time 2 ipv4.icanhazip.com || hostname -I | awk "{print $1}"');
  if (!cachedIP) cachedIP = '127.0.0.1';
  return cachedIP;
}

// Ambil Domain server dari config sistem
function getDomain() {
  const d = safeRead(`${ETC_DIR}/xray/domain`) || safeRead('/root/domain') || safeRead(`${ETC_DIR}/v2ray/domain`);
  if (d && d !== 'No Domain') return d;
  return getServerIP();
}

// Ambil ISP dan Kota (cache 1 jam)
let cachedGeo = null;
let lastGeoTime = 0;
function getGeo() {
  const now = Date.now();
  if (cachedGeo && now - lastGeoTime < 3600000) return cachedGeo;
  try {
    const raw = run('curl -sS --max-time 3 http://ip-api.com/json/');
    if (raw) {
      const data = JSON.parse(raw);
      cachedGeo = {
        isp: data.isp || 'IRULTUN Network',
        city: data.city || 'Indonesia'
      };
      lastGeoTime = now;
      return cachedGeo;
    }
  } catch (e) {}
  cachedGeo = { isp: 'IRULTUN Network', city: 'Indonesia' };
  return cachedGeo;
}

// Format standar objek 'meta' Swagger Potato Tunneling API
function makeMeta(code = 200, message = 'success') {
  return {
    code,
    status: code === 200 ? 'success' : 'error',
    message,
    ip_address: getServerIP()
  };
}

// Ambil Auth Key sistem
function getAuthKey() {
  if (process.env.AUTH_KEY) return process.env.AUTH_KEY.trim();
  const fileAuth = safeRead(`${ETC_DIR}/irultun_auth`);
  if (fileAuth) return fileAuth;
  const profileAuth = run('grep -oP "(?<=export AUTH_KEY=\\")[^\"]+" /etc/profile || true');
  if (profileAuth) return profileAuth;
  return 'irultunIRULTUN2026';
}

// Serve Swagger UI documentation (Public - No Auth Required)
const docsPath = path.join(__dirname, 'docs');
if (fs.existsSync(docsPath)) {
  app.use('/vps/docs', express.static(docsPath));
}

// Middleware Autentikasi
app.use((req, res, next) => {
  // Public routes (Health check & Swagger Docs)
  if (req.path === '/' || req.path === '/health' || req.path.startsWith('/vps/docs')) {
    return next();
  }

  const expectedAuth = getAuthKey();
  const authHeader = req.headers['authorization'] || req.headers['x-api-key'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim() || req.query.auth || req.body?.auth;

  if (expectedAuth && token !== expectedAuth) {
    return res.status(403).json({
      meta: makeMeta(403, 'Unauthorized: Invalid or missing authentication token'),
      data: null
    });
  }
  next();
});

// Hitung masa aktif presisi jam dan menit (Asia/Jakarta atau local time)
function addDays(days) {
  const d = new Date();
  d.setTime(d.getTime() + (parseInt(days, 10) * 86400 * 1000));
  
  // Format YYYY-MM-DD HH:mm:ss dalam zona waktu lokal
  const pad = (n) => String(n).padStart(2, '0');
  const Y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}

// Format jam dan menit kedaluwarsa presisi
function parseEpochFromExp(expStr) {
  if (!expStr) return null;
  const s = String(expStr).trim();
  // Format: YYYY-MM-DD HH:mm:ss atau YYYY-MM-DD
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;
  const Y = parseInt(match[1], 10);
  const M = parseInt(match[2], 10) - 1;
  const D = parseInt(match[3], 10);
  const h = match[4] ? parseInt(match[4], 10) : 23;
  const m = match[5] ? parseInt(match[5], 10) : 59;
  const sec = match[6] ? parseInt(match[6], 10) : 59;
  return new Date(Y, M, D, h, m, sec).getTime();
}

// Auto-clean akun yang expired (dipanggil berkala)
function cleanupExpiredAccounts() {
  const now = Date.now();
  let xrayChanged = false;

  // 1. Bersihkan Akun SSH
  const sshDb = `${ETC_DIR}/ssh/.ssh.db`;
  if (fs.existsSync(sshDb)) {
    const lines = fs.readFileSync(sshDb, 'utf8').split('\n');
    const kept = [];
    for (let l of lines) {
      if (!l.trim()) continue;
      const parts = l.trim().split(/\s+/);
      if (parts[0] === '#ssh#' && parts[1]) {
        const username = parts[1];
        const expStr = parts.slice(5).join(' ');
        const expEpoch = parseEpochFromExp(expStr);
        if (expEpoch && now >= expEpoch) {
          // Akun expired: kunci & hapus user Linux
          run(`pkill -u ${username} 2>/dev/null || true`);
          run(`userdel -f ${username} 2>/dev/null || true`);
          run(`rm -f ${ETC_DIR}/kyt/limit/ssh/ip/${username} 2>/dev/null || true`);
          continue; // tidak disimpan ke DB
        }
      }
      kept.push(l);
    }
    fs.writeFileSync(sshDb, kept.join('\n') + (kept.length ? '\n' : ''));
  }

  // 2. Bersihkan Akun Xray (VMess, VLESS, Trojan)
  const cleanXrayDb = (file, pfx, proto) => {
    if (!fs.existsSync(file)) return;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const kept = [];
    for (let l of lines) {
      if (!l.trim()) continue;
      const parts = l.trim().split(/\s+/);
      if (parts[0] === pfx && parts[1]) {
        const username = parts[1];
        let expStr = parts[2];
        if (parts[3] && parts[3].includes(':')) {
          expStr = `${parts[2]} ${parts[3]}`;
        }
        const expEpoch = parseEpochFromExp(expStr);
        if (expEpoch && now >= expEpoch) {
          xrayChanged = true;
          run(`rm -f ${ETC_DIR}/kyt/limit/${proto}/ip/${username} 2>/dev/null || true`);
          continue;
        }
      }
      kept.push(l);
    }
    fs.writeFileSync(file, kept.join('\n') + (kept.length ? '\n' : ''));
  };

  cleanXrayDb(`${ETC_DIR}/vmess/.vmess.db`, '###', 'vmess');
  cleanXrayDb(`${ETC_DIR}/vless/.vless.db`, '#&', 'vless');
  cleanXrayDb(`${ETC_DIR}/trojan/.trojan.db`, '#!', 'trojan');

  if (xrayChanged) {
    syncXrayConfig();
  }
}

// Jalankan cleanup setiap 60 detik (1 menit) otomatis di dalam background API
setInterval(cleanupExpiredAccounts, 60 * 1000);

// Endpoint manual untuk trigger XP / Cleanup dari CLI atau Cron
app.get('/vps/xp', (req, res) => {
  cleanupExpiredAccounts();
  res.json({
    code: 200,
    status: 'success',
    message: 'Expired accounts cleaned up successfully'
  });
});

// Format tanggal YYYY-MM-DD
function makeVmessLink(params) {
  const payload = {
    v: '2',
    ps: params.user,
    add: params.domain,
    port: String(params.port),
    id: params.uuid,
    aid: '0',
    net: params.net || 'ws',
    path: params.path || '/vmess',
    type: 'none',
    host: params.domain,
    tls: params.tls || 'none'
  };
  return 'vmess://' + Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Pastikan direktori limit tersedia
['ssh', 'vmess', 'vless', 'trojan'].forEach((p) => {
  fs.mkdirSync(`${ETC_DIR}/kyt/limit/${p}/ip`, { recursive: true });
});

// ==========================================
// 1. SSH / OPENVPN ENDPOINTS
// ==========================================

app.post('/vps/sshvpn', (req, res) => {
  const { username, password, expired = 30, limitip = '2', kuota = '0' } = req.body;
  if (!username || !password) {
    return res.status(400).json({ meta: makeMeta(400, 'username and password required'), data: null });
  }

  const expDate = addDays(expired);
  const expDayOnly = expDate.split(' ')[0];
  run(`useradd -e ${expDayOnly} -s /bin/false -m ${username} 2>/dev/null || true`);
  run(`echo "${username}:${password}" | chpasswd 2>/dev/null || true`);

  fs.mkdirSync(`${ETC_DIR}/ssh`, { recursive: true });
  fs.appendFileSync(`${ETC_DIR}/ssh/.ssh.db`, `#ssh# ${username} ${password} ${kuota} ${limitip} ${expDate}\n`);
  fs.writeFileSync(`${ETC_DIR}/kyt/limit/ssh/ip/${username}`, String(limitip));

  const domain = getDomain();
  const geo = getGeo();
  const pubkey = safeRead(`${ETC_DIR}/slowdns/server.pub`, '-');
  const nsdomain = safeRead(`${ETC_DIR}/xray/dns`, safeRead(`${ETC_DIR}/slowdns/nsdomain`, '-'));
  const slowdns_status = safeRead(`${ETC_DIR}/slowdns/status`, 'OFF').trim();

  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      CITY: geo.city,
      ISP: geo.isp,
      exp: expDate,
      hostname: domain,
      password,
      servername: domain,
      time: '23:59:59',
      username,
      pubkey,
      nsdomain,
      slowdns_status,
      payloadws: {
        payloadcdn: `GET / HTTP/1.1[crlf]Host: ${domain}[crlf]Upgrade: websocket[crlf][crlf]`,
        payloadwithpath: `GET /ssh HTTP/1.1[crlf]Host: ${domain}[crlf]Upgrade: websocket[crlf][crlf]`
      },
      port: {
        any: '80, 443',
        none: '80, 8080',
        ovpnohp: 8087,
        ovpntcp: 1194,
        ovpnudp: 2200,
        slowdns: '53, 5300',
        squid: 3128,
        sshohp: 2086,
        tls: '443, 8443',
        udpcustom: '1-65535',
        udpgw: '7100, 7200, 7300'
      }
    }
  });
});

app.post('/vps/trialsshvpn', (req, res) => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const username = req.body.username || `trial${rand}`;
  const password = req.body.password || `1`;
  const expired = 1;
  const limitip = req.body.limitip || '2';
  const expDate = addDays(expired);
  const expDayOnly = expDate.split(' ')[0];

  run(`useradd -e ${expDayOnly} -s /bin/false -m ${username} 2>/dev/null || true`);
  run(`echo "${username}:${password}" | chpasswd 2>/dev/null || true`);

  fs.mkdirSync(`${ETC_DIR}/ssh`, { recursive: true });
  fs.appendFileSync(`${ETC_DIR}/ssh/.ssh.db`, `#ssh# ${username} ${password} 0 ${limitip} ${expDate}\n`);
  fs.writeFileSync(`${ETC_DIR}/kyt/limit/ssh/ip/${username}`, String(limitip));

  const domain = getDomain();
  const geo = getGeo();
  const pubkey = safeRead(`${ETC_DIR}/slowdns/server.pub`, '-');
  const nsdomain = safeRead(`${ETC_DIR}/xray/dns`, safeRead(`${ETC_DIR}/slowdns/nsdomain`, '-'));
  const slowdns_status = safeRead(`${ETC_DIR}/slowdns/status`, 'OFF').trim();

  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      CITY: geo.city,
      ISP: geo.isp,
      exp: expDate,
      hostname: domain,
      password,
      servername: domain,
      time: '23:59:59',
      username,
      pubkey,
      nsdomain,
      slowdns_status,
      payloadws: {
        payloadcdn: `GET / HTTP/1.1[crlf]Host: ${domain}[crlf]Upgrade: websocket[crlf][crlf]`,
        payloadwithpath: `GET /ssh HTTP/1.1[crlf]Host: ${domain}[crlf]Upgrade: websocket[crlf][crlf]`
      },
      port: {
        any: '80, 443',
        none: '80, 8080',
        ovpnohp: 8087,
        ovpntcp: 1194,
        ovpnudp: 2200,
        slowdns: '53, 5300',
        squid: 3128,
        sshohp: 2086,
        tls: '443, 8443',
        udpcustom: '1-65535',
        udpgw: '7100, 7200, 7300'
      }
    }
  });
});

// ==========================================
// 2. VMESS ENDPOINTS
// ==========================================

app.post(['/vps/vmessall', '/vps/vmess', '/vps/trialvmessall'], (req, res) => {
  const isTrial = req.path.includes('trial');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const username = req.body.username || `trial${rand}`;
  const expired = isTrial ? 1 : (req.body.expired || 30);
  const limitip = req.body.limitip || '2';
  const kuota = req.body.kuota || '0';
  const uuid = req.body.uuidv2 || crypto.randomUUID();
  const expDate = addDays(expired);

  fs.mkdirSync(`${ETC_DIR}/vmess`, { recursive: true });
  fs.appendFileSync(`${ETC_DIR}/vmess/.vmess.db`, `### ${username} ${expDate} ${uuid} ${kuota} ${limitip}\n`);
  fs.writeFileSync(`${ETC_DIR}/kyt/limit/vmess/ip/${username}`, String(limitip));
  syncXrayConfig();

  const domain = getDomain();
  const geo = getGeo();

  const tlsLink = makeVmessLink({ user: username, domain, port: 443, uuid, net: 'ws', path: '/vmess', tls: 'tls' });
  const noneLink = makeVmessLink({ user: username, domain, port: 80, uuid, net: 'ws', path: '/vmess', tls: 'none' });
  const grpcLink = makeVmessLink({ user: username, domain, port: 443, uuid, net: 'grpc', path: 'vmess-grpc', tls: 'tls' });
  const upTlsLink = makeVmessLink({ user: username, domain, port: 443, uuid, net: 'ws', path: '/upgrade', tls: 'tls' });
  const upNoneLink = makeVmessLink({ user: username, domain, port: 80, uuid, net: 'ws', path: '/upgrade', tls: 'none' });

  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      CITY: geo.city,
      ISP: geo.isp,
      expired: expDate,
      hostname: domain,
      link: {
        grpc: grpcLink,
        none: noneLink,
        tls: tlsLink,
        upntls: upNoneLink,
        uptls: upTlsLink
      },
      path: {
        grpc: 'vmess-grpc',
        multi: '/vmess-multi',
        stn: '/vmess',
        up: '/upgrade'
      },
      port: {
        any: '80, 443',
        none: '80',
        tls: '443'
      },
      time: '23:59:59',
      username,
      uuid,
      quota: String(kuota),
      limitip: String(limitip)
    }
  });
});

// ==========================================
// 3. VLESS ENDPOINTS
// ==========================================

app.post(['/vps/vlessall', '/vps/vless', '/vps/trialvlessall'], (req, res) => {
  const isTrial = req.path.includes('trial');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const username = req.body.username || `trial${rand}`;
  const expired = isTrial ? 1 : (req.body.expired || 30);
  const limitip = req.body.limitip || '2';
  const kuota = req.body.kuota || '0';
  const uuid = req.body.uuidv2 || crypto.randomUUID();
  const expDate = addDays(expired);

  fs.mkdirSync(`${ETC_DIR}/vless`, { recursive: true });
  fs.appendFileSync(`${ETC_DIR}/vless/.vless.db`, `#& ${username} ${expDate} ${uuid} ${kuota} ${limitip}\n`);
  fs.writeFileSync(`${ETC_DIR}/kyt/limit/vless/ip/${username}`, String(limitip));
  syncXrayConfig();

  const domain = getDomain();
  const geo = getGeo();

  const tlsLink = `vless://${uuid}@${domain}:443?path=%2Fvless&security=tls&encryption=none&type=ws&sni=${domain}#${username}`;
  const noneLink = `vless://${uuid}@${domain}:80?path=%2Fvless&security=none&encryption=none&type=ws#${username}`;
  const grpcLink = `vless://${uuid}@${domain}:443?mode=gun&security=tls&encryption=none&type=grpc&serviceName=vless-grpc&sni=${domain}#${username}`;
  const upTlsLink = `vless://${uuid}@${domain}:443?path=%2Fupgrade&security=tls&encryption=none&type=httpupgrade&sni=${domain}#${username}`;
  const upNoneLink = `vless://${uuid}@${domain}:80?path=%2Fupgrade&security=none&encryption=none&type=httpupgrade#${username}`;

  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      CITY: geo.city,
      ISP: geo.isp,
      expired: expDate,
      hostname: domain,
      link: {
        grpc: grpcLink,
        none: noneLink,
        tls: tlsLink,
        upntls: upNoneLink,
        uptls: upTlsLink
      },
      path: {
        grpc: 'vless-grpc',
        multi: '/vless-multi',
        stn: '/vless',
        up: '/upgrade'
      },
      port: {
        any: '80, 443',
        none: '80',
        tls: '443'
      },
      time: '23:59:59',
      username,
      uuid,
      quota: String(kuota),
      limitip: String(limitip)
    }
  });
});

// ==========================================
// 4. TROJAN ENDPOINTS
// ==========================================

app.post(['/vps/trojanall', '/vps/trojan', '/vps/trialtrojanall'], (req, res) => {
  const isTrial = req.path.includes('trial');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const username = req.body.username || `trial${rand}`;
  const expired = isTrial ? 1 : (req.body.expired || 30);
  const limitip = req.body.limitip || '2';
  const kuota = req.body.kuota || '0';
  const uuid = req.body.uuidv2 || crypto.randomUUID();
  const expDate = addDays(expired);

  fs.mkdirSync(`${ETC_DIR}/trojan`, { recursive: true });
  fs.appendFileSync(`${ETC_DIR}/trojan/.trojan.db`, `#! ${username} ${expDate} ${uuid} ${kuota} ${limitip}\n`);
  fs.writeFileSync(`${ETC_DIR}/kyt/limit/trojan/ip/${username}`, String(limitip));
  syncXrayConfig();

  const domain = getDomain();
  const geo = getGeo();

  const tlsLink = `trojan://${uuid}@${domain}:443?path=%2Ftrojan-ws&security=tls&type=ws&sni=${domain}#${username}`;
  const grpcLink = `trojan://${uuid}@${domain}:443?mode=gun&security=tls&type=grpc&serviceName=trojan-grpc&sni=${domain}#${username}`;
  const upTlsLink = `trojan://${uuid}@${domain}:443?path=%2Fupgrade&security=tls&type=httpupgrade&sni=${domain}#${username}`;

  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      CITY: geo.city,
      ISP: geo.isp,
      expired: expDate,
      hostname: domain,
      link: {
        grpc: grpcLink,
        none: '',
        tls: tlsLink,
        upntls: '',
        uptls: upTlsLink
      },
      path: {
        grpc: 'trojan-grpc',
        multi: '/trojan-multi',
        stn: '/trojan-ws',
        up: '/upgrade'
      },
      port: {
        any: '80, 443',
        none: '80',
        tls: '443'
      },
      time: '23:59:59',
      username,
      uuid,
      quota: String(kuota),
      limitip: String(limitip)
    }
  });
});

// ==========================================
// 5. RENEW ENDPOINTS
// Mendukung PATCH dan POST, serta parameter URL/:username/:exp
// ==========================================

function renewHelper(proto, username, days) {
  const dbMap = {
    ssh: `${ETC_DIR}/ssh/.ssh.db`,
    vmess: `${ETC_DIR}/vmess/.vmess.db`,
    vless: `${ETC_DIR}/vless/.vless.db`,
    trojan: `${ETC_DIR}/trojan/.trojan.db`
  };
  const prefixMap = { ssh: '#ssh#', vmess: '###', vless: '#&', trojan: '#!' };
  const dbFile = dbMap[proto];
  const pfx = prefixMap[proto];

  let oldExp = '';
  if (fs.existsSync(dbFile)) {
    const lines = fs.readFileSync(dbFile, 'utf8').split('\n');
    for (let l of lines) {
      const parts = l.trim().split(/\s+/);
      if (parts[0] === pfx && parts[1] === username) {
        if (proto === 'ssh') {
          oldExp = parts.slice(5).join(' ');
        } else {
          if (parts[3] && parts[3].includes(':')) oldExp = `${parts[2]} ${parts[3]}`;
          else oldExp = parts[2];
        }
        break;
      }
    }
  }

  const oldEpoch = parseEpochFromExp(oldExp);
  const now = Date.now();
  let baseEpoch = (oldEpoch && oldEpoch > now) ? oldEpoch : now;
  baseEpoch += parseInt(days, 10) * 86400 * 1000;

  const d = new Date(baseEpoch);
  const pad = (n) => String(n).padStart(2, '0');
  const newExp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const newExpDateOnly = newExp.split(' ')[0];

  if (proto === 'ssh') {
    run(`chage -E ${newExpDateOnly} ${username} 2>/dev/null || true`);
  }

  if (fs.existsSync(dbFile)) {
    const lines = fs.readFileSync(dbFile, 'utf8').split('\n');
    const updated = lines.map(l => {
      const parts = l.trim().split(/\s+/);
      if (parts[0] === pfx && parts[1] === username) {
        if (proto === 'ssh') {
          return `#ssh# ${username} ${parts[2]} ${parts[3]} ${parts[4]} ${newExp}`;
        } else {
          let uuid = parts[3];
          let q = parts[4] || '0';
          let lim = parts[5] || '2';
          if (parts[3] && parts[3].includes(':')) {
            uuid = parts[4];
            q = parts[5] || '0';
            lim = parts[6] || '2';
          }
          return `${pfx} ${username} ${newExp} ${uuid} ${q} ${lim}`;
        }
      }
      return l;
    });
    fs.writeFileSync(dbFile, updated.join('\n'));
  }

  if (proto !== 'ssh') {
    syncXrayConfig();
  }

  return { from: oldExp || 'Expired', to: newExp };
}

function handleRenewRoute(proto) {
  return (req, res) => {
    const username = req.params.username || req.body.username;
    const days = req.params.expired || req.params.exp || req.body.expired || 30;
    const kuota = req.body.kuota || '0';

    if (!username) {
      return res.status(400).json({ meta: makeMeta(400, 'username required'), data: null });
    }

    const result = renewHelper(proto, username, days);
    res.json({
      meta: makeMeta(200, 'success'),
      data: {
        from: result.from,
        quota: String(kuota),
        to: result.to,
        username
      }
    });
  };
}

app.all(['/vps/renewsshvpn/:username/:expired', '/vps/renewsshvpn/:username/:exp', '/vps/renewsshvpn/:username', '/vps/renewsshvpn'], handleRenewRoute('ssh'));
app.all(['/vps/renewvmess/:username/:expired', '/vps/renewvmess/:username/:exp', '/vps/renewvmess/:username', '/vps/renewvmess'], handleRenewRoute('vmess'));
app.all(['/vps/renewvless/:username/:expired', '/vps/renewvless/:username/:exp', '/vps/renewvless/:username', '/vps/renewvless'], handleRenewRoute('vless'));
app.all(['/vps/renewtrojan/:username/:expired', '/vps/renewtrojan/:username/:exp', '/vps/renewtrojan/:username', '/vps/renewtrojan'], handleRenewRoute('trojan'));

// ==========================================
// 6. LOCK & UNLOCK ENDPOINTS (FIX ERROR)
// ==========================================

app.all([
  '/vps/locksshvpn/:username/pw',
  '/vps/locksshvpn/:username',
  '/vps/lockvmess/:username',
  '/vps/lockvless/:username',
  '/vps/locktrojan/:username'
], (req, res) => {
  const username = req.params.username;
  let proto = 'ssh';
  if (req.path.includes('vmess')) proto = 'vmess';
  else if (req.path.includes('vless')) proto = 'vless';
  else if (req.path.includes('trojan')) proto = 'trojan';

  if (proto === 'ssh') {
    run(`passwd -l ${username} 2>/dev/null || true`);
    run(`pkill -u ${username} 2>/dev/null || true`);
  }

  fs.mkdirSync(`${ETC_DIR}/user_locks`, { recursive: true });
  fs.writeFileSync(`${ETC_DIR}/user_locks/${proto}_${username}`, String(Math.floor(Date.now() / 1000) + 900));

  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      expired: 'Active',
      pass_uuid: '-',
      status_lock: 'locked',
      username
    }
  });
});

app.all([
  '/vps/unlocksshvpn/:username/:password',
  '/vps/unlocksshvpn/:username/pw',
  '/vps/unlocksshvpn/:username',
  '/vps/unlockvmess/:username',
  '/vps/unlockvless/:username',
  '/vps/unlocktrojan/:username'
], (req, res) => {
  const username = req.params.username;
  const password = req.params.password || '';
  let proto = 'ssh';
  if (req.path.includes('vmess')) proto = 'vmess';
  else if (req.path.includes('vless')) proto = 'vless';
  else if (req.path.includes('trojan')) proto = 'trojan';

  if (proto === 'ssh') {
    run(`passwd -u ${username} 2>/dev/null || true`);
    if (password && password !== 'pw') {
      run(`echo "${username}:${password}" | chpasswd 2>/dev/null || true`);
    }
  }

  try {
    fs.unlinkSync(`${ETC_DIR}/user_locks/${proto}_${username}`);
  } catch (e) {}

  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      expired: 'Active',
      pass_uuid: password || '-',
      status_lock: 'unlocked',
      username
    }
  });
});

// ==========================================
// 7. DELETE ACCOUNT ENDPOINTS
// ==========================================

app.all([
  '/vps/deletesshvpn/:username',
  '/vps/deletevmess/:username',
  '/vps/deletevless/:username',
  '/vps/deletetrojan/:username'
], (req, res) => {
  const username = req.params.username;
  let proto = 'ssh';
  if (req.path.includes('vmess')) proto = 'vmess';
  else if (req.path.includes('vless')) proto = 'vless';
  else if (req.path.includes('trojan')) proto = 'trojan';

  if (proto === 'ssh') {
    run(`userdel -f ${username} 2>/dev/null || true`);
    run(`sed -i '/^#ssh# ${username} /d' /etc/ssh/.ssh.db 2>/dev/null || true`);
  } else {
    const pfxMap = { vmess: '###', vless: '#&', trojan: '#!' };
    const pfx = pfxMap[proto];
    const dbFile = `${ETC_DIR}/${proto}/.${proto}.db`;

    run(`sed -i '/^\\${pfx} ${username} /d' ${dbFile} 2>/dev/null || true`);
    syncXrayConfig();
  }

  try {
    fs.unlinkSync(`${ETC_DIR}/kyt/limit/${proto}/ip/${username}`);
  } catch (e) {}

  res.json({
    meta: makeMeta(200, 'success'),
    data: { username }
  });
});

// ==========================================
// 8. CHANGE LIMIT IP & BANDWIDTH ENDPOINTS
// ==========================================

// Change IP limit per account
app.post(['/vps/changelimipsshvpn', '/vps/changelimipvmess', '/vps/changelimipvless', '/vps/changelimiptrojan'], (req, res) => {
  const { username, limitip = '2' } = req.body;
  let proto = 'ssh';
  if (req.path.includes('vmess')) proto = 'vmess';
  else if (req.path.includes('vless')) proto = 'vless';
  else if (req.path.includes('trojan')) proto = 'trojan';

  fs.mkdirSync(`${ETC_DIR}/kyt/limit/${proto}/ip`, { recursive: true });
  fs.writeFileSync(`${ETC_DIR}/kyt/limit/${proto}/ip/${username}`, String(limitip));

  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      username,
      message: `${limitip} IP`
    }
  });
});

// Change IP limit all accounts
app.post(['/vps/changelimipallsshvpn', '/vps/changelimipallvmess', '/vps/changelimipallvless', '/vps/changelimipalltrojan'], (req, res) => {
  const { limitip = '2' } = req.body;
  let proto = 'ssh';
  if (req.path.includes('vmess')) proto = 'vmess';
  else if (req.path.includes('vless')) proto = 'vless';
  else if (req.path.includes('trojan')) proto = 'trojan';

  const dir = `${ETC_DIR}/kyt/limit/${proto}/ip`;
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      fs.writeFileSync(path.join(dir, file), String(limitip));
    });
  }

  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      username: 'ALL',
      message: `${limitip} IP`
    }
  });
});

// Change Bandwidth / Quota per account
app.post(['/vps/changelimbwvmess', '/vps/changelimbwvless', '/vps/changelimbwtrojan'], (req, res) => {
  const { username, kuota = '0' } = req.body;
  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      username,
      message: `${kuota} GB`
    }
  });
});

// Change Bandwidth / Quota all accounts
app.post(['/vps/changelimbwallvmess', '/vps/changelimbwallvless', '/vps/changelimbwalltrojan'], (req, res) => {
  const { kuota = '0' } = req.body;
  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      username: 'ALL',
      message: `${kuota} GB`
    }
  });
});

// Modify account (pass_uuid)
app.patch(['/vps/modifysshvpn', '/vps/modifyvmess', '/vps/modifyvless', '/vps/modifytrojan'], (req, res) => {
  const { username, pass_uuid } = req.body;
  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      username,
      message: 'Account modified successfully'
    }
  });
});

// ==========================================
// 9. CHECK CONFIG ENDPOINTS
// ==========================================

function getAccountData(proto, username) {
  const dbMap = {
    ssh: `${ETC_DIR}/ssh/.ssh.db`,
    vmess: `${ETC_DIR}/vmess/.vmess.db`,
    vless: `${ETC_DIR}/vless/.vless.db`,
    trojan: `${ETC_DIR}/trojan/.trojan.db`
  };
  const prefixMap = { ssh: '#ssh#', vmess: '###', vless: '#&', trojan: '#!' };
  const dbFile = dbMap[proto];
  const pfx = prefixMap[proto];

  let record = { username, password: '1', uuid: crypto.randomUUID(), exp: 'Active', quota: '0', limitip: '2' };
  if (fs.existsSync(dbFile)) {
    const lines = fs.readFileSync(dbFile, 'utf8').split('\n');
    for (let l of lines) {
      const parts = l.trim().split(/\s+/);
      if (parts[0] === pfx && parts[1] === username) {
        if (proto === 'ssh') {
          record.password = parts[2] || '1';
          record.quota = parts[3] || '0';
          record.limitip = parts[4] || '2';
          record.exp = parts.slice(5).join(' ') || 'Active';
        } else {
          if (parts[3] && parts[3].includes(':')) {
            record.exp = `${parts[2]} ${parts[3]}`;
            record.uuid = parts[4] || crypto.randomUUID();
            record.quota = parts[5] || '0';
            record.limitip = parts[6] || '2';
          } else {
            record.exp = parts[2] || 'Active';
            record.uuid = parts[3] || crypto.randomUUID();
            record.quota = parts[4] || '0';
            record.limitip = parts[5] || '2';
          }
        }
        break;
      }
    }
  }

  const liveLimit = safeRead(`${ETC_DIR}/kyt/limit/${proto}/ip/${username}`);
  if (liveLimit) {
    record.limitip = liveLimit;
  }

  return record;
}

app.get('/vps/checkconfigsshvpn/:username', (req, res) => {
  const username = req.params.username;
  const acc = getAccountData('ssh', username);
  const domain = getDomain();
  const geo = getGeo();
  const pubkey = safeRead(`${ETC_DIR}/slowdns/server.pub`, '-');
  const nsdomain = safeRead(`${ETC_DIR}/xray/dns`, safeRead(`${ETC_DIR}/slowdns/nsdomain`, '-'));
  const slowdns_status = safeRead(`${ETC_DIR}/slowdns/status`, 'OFF').trim();

  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      CITY: geo.city,
      ISP: geo.isp,
      exp: acc.exp,
      hostname: domain,
      password: acc.password,
      servername: domain,
      time: '23:59:59',
      username,
      pubkey,
      nsdomain,
      slowdns_status,
      payloadws: {
        payloadcdn: `GET / HTTP/1.1[crlf]Host: ${domain}[crlf]Upgrade: websocket[crlf][crlf]`,
        payloadwithpath: `GET /ssh HTTP/1.1[crlf]Host: ${domain}[crlf]Upgrade: websocket[crlf][crlf]`
      },
      port: {
        any: '80, 443',
        none: '80, 8080',
        ovpnohp: 8087,
        ovpntcp: 1194,
        ovpnudp: 2200,
        slowdns: '53, 5300',
        squid: 3128,
        sshohp: 2086,
        tls: '443, 8443',
        udpcustom: '1-65535',
        udpgw: '7100, 7200, 7300'
      }
    }
  });
});

app.get('/vps/checkconfigvmess/:username', (req, res) => {
  const username = req.params.username;
  const acc = getAccountData('vmess', username);
  const domain = getDomain();
  const geo = getGeo();

  const tlsLink = makeVmessLink({ user: username, domain, port: 443, uuid: acc.uuid, net: 'ws', path: '/vmess', tls: 'tls' });
  const noneLink = makeVmessLink({ user: username, domain, port: 80, uuid: acc.uuid, net: 'ws', path: '/vmess', tls: 'none' });
  const grpcLink = makeVmessLink({ user: username, domain, port: 443, uuid: acc.uuid, net: 'grpc', path: 'vmess-grpc', tls: 'tls' });
  const upTlsLink = makeVmessLink({ user: username, domain, port: 443, uuid: acc.uuid, net: 'ws', path: '/upgrade', tls: 'tls' });
  const upNoneLink = makeVmessLink({ user: username, domain, port: 80, uuid: acc.uuid, net: 'ws', path: '/upgrade', tls: 'none' });

  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      CITY: geo.city,
      ISP: geo.isp,
      expired: acc.exp,
      hostname: domain,
      link: {
        grpc: grpcLink,
        none: noneLink,
        tls: tlsLink,
        upntls: upNoneLink,
        uptls: upTlsLink
      },
      path: {
        grpc: 'vmess-grpc',
        multi: '/vmess-multi',
        stn: '/vmess',
        up: '/upgrade'
      },
      port: {
        any: '80, 443',
        none: '80',
        tls: '443'
      },
      time: '23:59:59',
      username,
      uuid: acc.uuid,
      quota: acc.quota,
      limitip: acc.limitip
    }
  });
});

app.get('/vps/checkconfigvless/:username', (req, res) => {
  const username = req.params.username;
  const acc = getAccountData('vless', username);
  const domain = getDomain();
  const geo = getGeo();

  const tlsLink = `vless://${acc.uuid}@${domain}:443?path=%2Fvless&security=tls&encryption=none&type=ws&sni=${domain}#${username}`;
  const noneLink = `vless://${acc.uuid}@${domain}:80?path=%2Fvless&security=none&encryption=none&type=ws#${username}`;
  const grpcLink = `vless://${acc.uuid}@${domain}:443?mode=gun&security=tls&encryption=none&type=grpc&serviceName=vless-grpc&sni=${domain}#${username}`;
  const upTlsLink = `vless://${acc.uuid}@${domain}:443?path=%2Fupgrade&security=tls&encryption=none&type=httpupgrade&sni=${domain}#${username}`;
  const upNoneLink = `vless://${acc.uuid}@${domain}:80?path=%2Fupgrade&security=none&encryption=none&type=httpupgrade#${username}`;

  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      CITY: geo.city,
      ISP: geo.isp,
      expired: acc.exp,
      hostname: domain,
      link: {
        grpc: grpcLink,
        none: noneLink,
        tls: tlsLink,
        upntls: upNoneLink,
        uptls: upTlsLink
      },
      path: {
        grpc: 'vless-grpc',
        multi: '/vless-multi',
        stn: '/vless',
        up: '/upgrade'
      },
      port: {
        any: '80, 443',
        none: '80',
        tls: '443'
      },
      time: '23:59:59',
      username,
      uuid: acc.uuid,
      quota: acc.quota,
      limitip: acc.limitip
    }
  });
});

app.get('/vps/checkconfigtrojan/:username', (req, res) => {
  const username = req.params.username;
  const acc = getAccountData('trojan', username);
  const domain = getDomain();
  const geo = getGeo();

  const tlsLink = `trojan://${acc.uuid}@${domain}:443?path=%2Ftrojan-ws&security=tls&type=ws&sni=${domain}#${username}`;
  const grpcLink = `trojan://${acc.uuid}@${domain}:443?mode=gun&security=tls&type=grpc&serviceName=trojan-grpc&sni=${domain}#${username}`;
  const upTlsLink = `trojan://${acc.uuid}@${domain}:443?path=%2Fupgrade&security=tls&type=httpupgrade&sni=${domain}#${username}`;

  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      CITY: geo.city,
      ISP: geo.isp,
      expired: acc.exp,
      hostname: domain,
      link: {
        grpc: grpcLink,
        none: '',
        tls: tlsLink,
        upntls: '',
        uptls: upTlsLink
      },
      path: {
        grpc: 'trojan-grpc',
        multi: '/trojan-multi',
        stn: '/trojan-ws',
        up: '/upgrade'
      },
      port: {
        any: '80, 443',
        none: '80',
        tls: '443'
      },
      time: '23:59:59',
      username,
      uuid: acc.uuid,
      quota: acc.quota,
      limitip: acc.limitip
    }
  });
});

// ==========================================
// 10. RECOVERY ACCOUNT ENDPOINTS
// Memulihkan akun expired/terhapus dengan kredensial asli (Password/UUID)
// Mendukung pemulihan spesifik per-protokol atau general recovery
// ==========================================

function parseExpiryInput(input) {
  if (!input) return addDays(30);
  // Jika format YYYY-MM-DD HH:mm:ss atau YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}(\s+\d{2}:\d{2}(:\d{2})?)?$/.test(String(input).trim())) return String(input).trim();
  const days = parseInt(input, 10);
  return addDays(isNaN(days) ? 30 : days);
}

// 1. Recover SSH
function recoverSSHAccount({ username, password, expired = 30, limitip, kuota }) {
  const existing = getAccountData('ssh', username);
  const pass = password || existing.password || '1';
  const lim = limitip || existing.limitip || '2';
  const q = kuota || existing.quota || '0';
  const expDate = parseExpiryInput(expired);
  const expDayOnly = expDate.split(' ')[0];

  // Buat kembali user sistem Linux
  run(`useradd -e ${expDayOnly} -s /bin/false -m ${username} 2>/dev/null || chage -E ${expDayOnly} ${username} 2>/dev/null || true`);
  run(`echo "${username}:${pass}" | chpasswd 2>/dev/null || true`);
  run(`passwd -u ${username} >/dev/null 2>&1 || true`);

  // Update .ssh.db
  fs.mkdirSync(`${ETC_DIR}/ssh`, { recursive: true });
  const dbFile = `${ETC_DIR}/ssh/.ssh.db`;
  if (fs.existsSync(dbFile)) {
    run(`sed -i '/^#ssh# ${username} /d' ${dbFile} 2>/dev/null || true`);
  }
  fs.appendFileSync(dbFile, `#ssh# ${username} ${pass} ${q} ${lim} ${expDate}\n`);

  // Pulihkan limit IP
  fs.mkdirSync(`${ETC_DIR}/kyt/limit/ssh/ip`, { recursive: true });
  fs.writeFileSync(`${ETC_DIR}/kyt/limit/ssh/ip/${username}`, String(lim));

  // Hapus lock jika ada
  try { fs.unlinkSync(`${ETC_DIR}/user_locks/ssh_${username}`); } catch (e) {}

  const domain = getDomain();
  const geo = getGeo();
  const pubkey = safeRead(`${ETC_DIR}/slowdns/server.pub`, '-');
  const nsdomain = safeRead(`${ETC_DIR}/xray/dns`, safeRead(`${ETC_DIR}/slowdns/nsdomain`, '-'));
  const slowdns_status = safeRead(`${ETC_DIR}/slowdns/status`, 'OFF').trim();

  return {
    CITY: geo.city,
    ISP: geo.isp,
    exp: expDate,
    hostname: domain,
    password: pass,
    servername: domain,
    time: '23:59:59',
    username,
    pubkey,
    nsdomain,
    slowdns_status,
    status: 'recovered',
    payloadws: {
      payloadcdn: `GET / HTTP/1.1[crlf]Host: ${domain}[crlf]Upgrade: websocket[crlf][crlf]`,
      payloadwithpath: `GET /ssh HTTP/1.1[crlf]Host: ${domain}[crlf]Upgrade: websocket[crlf][crlf]`
    },
    port: {
      any: '80, 443',
      none: '80, 8080',
      ovpnohp: 8087,
      ovpntcp: 1194,
      ovpnudp: 2200,
      slowdns: '53, 5300',
      squid: 3128,
      sshohp: 2086,
      tls: '443, 8443',
      udpcustom: '1-65535',
      udpgw: '7100, 7200, 7300'
    }
  };
}

// 2. Recover Xray (VMess, VLESS, Trojan)
function recoverXrayAccount(proto, { username, uuid, expired = 30, limitip, kuota }) {
  const existing = getAccountData(proto, username);
  const targetUuid = uuid || existing.uuid || crypto.randomUUID();
  const lim = limitip || existing.limitip || '2';
  const q = kuota || existing.quota || '0';
  const expDate = parseExpiryInput(expired);

  const pfxMap = { vmess: '###', vless: '#&', trojan: '#!' };
  const pfx = pfxMap[proto];
  const dbFile = `${ETC_DIR}/${proto}/.${proto}.db`;

  // Update .db file
  fs.mkdirSync(`${ETC_DIR}/${proto}`, { recursive: true });
  if (fs.existsSync(dbFile)) {
    run(`sed -i '/^\\${pfx} ${username} /d' ${dbFile} 2>/dev/null || true`);
  }
  fs.appendFileSync(dbFile, `${pfx} ${username} ${expDate} ${targetUuid} ${q} ${lim}\n`);
  syncXrayConfig();

  // Pulihkan limit
  fs.mkdirSync(`${ETC_DIR}/kyt/limit/${proto}/ip`, { recursive: true });
  fs.writeFileSync(`${ETC_DIR}/kyt/limit/${proto}/ip/${username}`, String(lim));

  // Hapus lock jika ada
  try { fs.unlinkSync(`${ETC_DIR}/user_locks/${proto}_${username}`); } catch (e) {}

  const domain = getDomain();
  const geo = getGeo();

  let linkObj = {};
  if (proto === 'vmess') {
    linkObj = {
      grpc: makeVmessLink({ user: username, domain, port: 443, uuid: targetUuid, net: 'grpc', path: 'vmess-grpc', tls: 'tls' }),
      none: makeVmessLink({ user: username, domain, port: 80, uuid: targetUuid, net: 'ws', path: '/vmess', tls: 'none' }),
      tls: makeVmessLink({ user: username, domain, port: 443, uuid: targetUuid, net: 'ws', path: '/vmess', tls: 'tls' }),
      upntls: makeVmessLink({ user: username, domain, port: 80, uuid: targetUuid, net: 'ws', path: '/upgrade', tls: 'none' }),
      uptls: makeVmessLink({ user: username, domain, port: 443, uuid: targetUuid, net: 'ws', path: '/upgrade', tls: 'tls' })
    };
  } else if (proto === 'vless') {
    linkObj = {
      grpc: `vless://${targetUuid}@${domain}:443?mode=gun&security=tls&encryption=none&type=grpc&serviceName=vless-grpc&sni=${domain}#${username}`,
      none: `vless://${targetUuid}@${domain}:80?path=%2Fvless&security=none&encryption=none&type=ws#${username}`,
      tls: `vless://${targetUuid}@${domain}:443?path=%2Fvless&security=tls&encryption=none&type=ws&sni=${domain}#${username}`,
      upntls: `vless://${targetUuid}@${domain}:80?path=%2Fupgrade&security=none&encryption=none&type=httpupgrade#${username}`,
      uptls: `vless://${targetUuid}@${domain}:443?path=%2Fupgrade&security=tls&encryption=none&type=httpupgrade&sni=${domain}#${username}`
    };
  } else if (proto === 'trojan') {
    linkObj = {
      grpc: `trojan://${targetUuid}@${domain}:443?mode=gun&security=tls&type=grpc&serviceName=trojan-grpc&sni=${domain}#${username}`,
      none: '',
      tls: `trojan://${targetUuid}@${domain}:443?path=%2Ftrojan-ws&security=tls&type=ws&sni=${domain}#${username}`,
      upntls: '',
      uptls: `trojan://${targetUuid}@${domain}:443?path=%2Fupgrade&security=tls&type=httpupgrade&sni=${domain}#${username}`
    };
  }

  return {
    CITY: geo.city,
    ISP: geo.isp,
    expired: expDate,
    hostname: domain,
    link: linkObj,
    path: {
      grpc: `${proto}-grpc`,
      multi: `/${proto}-multi`,
      stn: `/${proto}`,
      up: '/upgrade'
    },
    port: {
      any: '80, 443',
      none: '80',
      tls: '443'
    },
    time: '23:59:59',
    username,
    uuid: targetUuid,
    quota: String(q),
    limitip: String(lim),
    status: 'recovered'
  };
}

// 3. List recoverable accounts helper
function listRecoverableAccounts(protoFilter = null) {
  const result = [];
  const today = new Date().toISOString().split('T')[0];
  const protos = protoFilter ? [protoFilter] : ['ssh', 'vmess', 'vless', 'trojan'];

  protos.forEach(proto => {
    const dbMap = { ssh: `${ETC_DIR}/ssh/.ssh.db`, vmess: `${ETC_DIR}/vmess/.vmess.db`, vless: `${ETC_DIR}/vless/.vless.db`, trojan: `${ETC_DIR}/trojan/.trojan.db` };
    const pfxMap = { ssh: '#ssh#', vmess: '###', vless: '#&', trojan: '#!' };
    const dbFile = dbMap[proto];
    const pfx = pfxMap[proto];

    if (fs.existsSync(dbFile)) {
      const lines = fs.readFileSync(dbFile, 'utf8').split('\n');
      for (let l of lines) {
        const parts = l.trim().split(/\s+/);
        if (parts[0] === pfx && parts[1]) {
          const u = parts[1];
          let exp = '';
          let passOrUuid = '';
          let q = '0';
          let lim = '2';

          if (proto === 'ssh') {
            passOrUuid = parts[2] || '';
            q = parts[3] || '0';
            lim = parts[4] || '2';
            exp = parts[5] || '';
          } else {
            exp = parts[2] || '';
            passOrUuid = parts[3] || '';
            q = parts[4] || '0';
            lim = parts[5] || '2';
          }

          let isExpired = false;
          if (exp && exp < today) isExpired = true;

          // Cek apakah user hilang dari sistem OS atau Xray
          let isMissing = false;
          if (proto === 'ssh') {
            const hasUser = run(`id -u ${u} 2>/dev/null`);
            if (!hasUser) isMissing = true;
          } else if (fs.existsSync(`${ETC_DIR}/xray/config.json`)) {
            const xrayConf = fs.readFileSync(`${ETC_DIR}/xray/config.json`, 'utf8');
            if (!xrayConf.includes(`${pfx} ${u} `)) isMissing = true;
          }

          if (isExpired || isMissing) {
            result.push({
              protocol: proto,
              username: u,
              credential: passOrUuid,
              expired: exp,
              quota: q,
              limitip: lim,
              reason: isExpired && isMissing ? 'expired & removed' : isExpired ? 'expired' : 'removed'
            });
          }
        }
      }
    }
  });

  return result;
}

// POST /vps/recoverysshvpn
app.post(['/vps/recoverysshvpn', '/vps/recovery/ssh'], (req, res) => {
  const { username, password, expired = 30, limitip, kuota } = req.body;
  if (!username) return res.status(400).json({ meta: makeMeta(400, 'username required'), data: null });
  const data = recoverSSHAccount({ username, password, expired, limitip, kuota });
  res.json({ meta: makeMeta(200, 'Account recovered successfully'), data });
});

// POST /vps/recoveryvmess
app.post(['/vps/recoveryvmess', '/vps/recovery/vmess'], (req, res) => {
  const { username, uuid, expired = 30, limitip, kuota } = req.body;
  if (!username) return res.status(400).json({ meta: makeMeta(400, 'username required'), data: null });
  const data = recoverXrayAccount('vmess', { username, uuid, expired, limitip, kuota });
  res.json({ meta: makeMeta(200, 'Account recovered successfully'), data });
});

// POST /vps/recoveryvless
app.post(['/vps/recoveryvless', '/vps/recovery/vless'], (req, res) => {
  const { username, uuid, expired = 30, limitip, kuota } = req.body;
  if (!username) return res.status(400).json({ meta: makeMeta(400, 'username required'), data: null });
  const data = recoverXrayAccount('vless', { username, uuid, expired, limitip, kuota });
  res.json({ meta: makeMeta(200, 'Account recovered successfully'), data });
});

// POST /vps/recoverytrojan
app.post(['/vps/recoverytrojan', '/vps/recovery/trojan'], (req, res) => {
  const { username, uuid, expired = 30, limitip, kuota } = req.body;
  if (!username) return res.status(400).json({ meta: makeMeta(400, 'username required'), data: null });
  const data = recoverXrayAccount('trojan', { username, uuid, expired, limitip, kuota });
  res.json({ meta: makeMeta(200, 'Account recovered successfully'), data });
});

// General POST /vps/recovery
app.post('/vps/recovery', (req, res) => {
  const { protocol = 'ssh', username, password, uuid, expired = 30, limitip, kuota } = req.body;
  if (!username) return res.status(400).json({ meta: makeMeta(400, 'username required'), data: null });

  let data;
  const p = String(protocol).toLowerCase();
  if (p === 'ssh') {
    data = recoverSSHAccount({ username, password, expired, limitip, kuota });
  } else if (['vmess', 'vless', 'trojan'].includes(p)) {
    data = recoverXrayAccount(p, { username, uuid, expired, limitip, kuota });
  } else {
    return res.status(400).json({ meta: makeMeta(400, 'Unsupported protocol'), data: null });
  }
  res.json({ meta: makeMeta(200, 'Account recovered successfully'), data });
});

// GET /vps/recoverylist (List recoverable/expired accounts)
app.get(['/vps/recoverylist', '/vps/recoverylist/:proto'], (req, res) => {
  const proto = req.params.proto || req.query.protocol;
  const list = listRecoverableAccounts(proto);
  res.json({
    meta: makeMeta(200, 'success'),
    data: {
      total: list.length,
      accounts: list
    }
  });
});

// ==========================================
// 11. SYSTEM HEALTH & STATUS
// ==========================================

app.get(['/', '/health'], (req, res) => {
  res.json({
    status: 'online',
    service: 'Potato Tunneling / IRULTUN VPS REST API Bridge',
    version: '1.0.0',
    port: PORT,
    domain: getDomain(),
    docs: '/vps/docs/index.html',
    slowdns: safeRead(`${ETC_DIR}/slowdns/status`, 'OFF')
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Potato Tunneling / IRULTUN VPS REST API Bridge listening on port ${PORT}`);
});
