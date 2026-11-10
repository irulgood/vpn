#!/usr/bin/env python3
"""
IRULTUN Auto-Limit IP Daemon (with 15-minute Lock & Auto-Unlock)
Monitors SSH, VMess, VLESS, and Trojan connections.
If an account exceeds its configured IP limit:
  - The account is locked for 15 minutes (900 seconds)
  - Active sessions are terminated
  - Status is tracked in /etc/user_locks.db
  - Automatically unlocked when the 15-minute timer expires, OR
  - Unlocked instantly via IRULTUN Botweb API (/vps/unlock...)
"""

import os
import sys
import time
import re
import subprocess
from pathlib import Path
from datetime import datetime

LOCK_FILE = Path("/etc/user_locks.db")
LOG_FILE = Path("/var/log/autolimit.log")
XRAY_CONFIG = Path("/etc/xray/config.json")
XRAY_ACCESS_LOG = Path("/var/log/xray/access.log")

LOCK_DURATION_SECONDS = 900  # 15 menit

TETHERING_PREFIXES = (
    "192.168.", "10.", "172.16.", "172.17.", "172.18.", "172.19.",
    "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.",
    "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.",
    "127.", "::1"
)

def log(msg: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

def run_cmd(cmd: str) -> str:
    try:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
        return res.stdout.strip()
    except Exception as e:
        return ""

def is_tethering(ip: str) -> bool:
    return any(ip.startswith(p) for p in TETHERING_PREFIXES)

def get_user_limit(proto: str, user: str) -> int:
    path = Path(f"/etc/kyt/limit/{proto}/ip/{user}")
    if path.exists():
        try:
            val = int(path.read_text(encoding="utf-8").strip())
            if val > 0:
                return val
        except Exception:
            pass
    # Cek di database terkait jika ada
    db_paths = {
        "ssh": Path("/etc/ssh/.ssh.db"),
        "vmess": Path("/etc/vmess/.vmess.db"),
        "vless": Path("/etc/vless/.vless.db"),
        "trojan": Path("/etc/trojan/.trojan.db"),
    }
    db = db_paths.get(proto)
    if db and db.exists():
        try:
            for line in db.read_text(encoding="utf-8", errors="ignore").splitlines():
                parts = line.split()
                if len(parts) >= 5 and parts[1] == user:
                    limit_val = int(parts[-1])
                    if limit_val > 0:
                        return limit_val
        except Exception:
            pass
    return 2  # Default fallback 2 IP jika tidak dibatasi

def get_locked_users() -> dict:
    """Return dict: {(proto, user): (locked_at, unlock_at)}"""
    if not LOCK_FILE.exists():
        return {}
    locks = {}
    try:
        lines = LOCK_FILE.read_text(encoding="utf-8", errors="ignore").splitlines()
        for l in lines:
            parts = l.strip().split(":")
            if len(parts) >= 4:
                proto, u, lat, uat = parts[0], parts[1], int(parts[2]), int(parts[3])
                locks[(proto, u)] = (lat, uat)
    except Exception:
        pass
    return locks

def save_locked_users(locks: dict):
    lines = []
    for (proto, u), (lat, uat) in locks.items():
        lines.append(f"{proto}:{u}:{lat}:{uat}")
    tmp = Path("/etc/user_locks.db.tmp")
    tmp.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    tmp.replace(LOCK_FILE)

def lock_user(proto: str, user: str, duration: int = LOCK_DURATION_SECONDS) -> bool:
    locks = get_locked_users()
    now = int(time.time())
    unlock_at = now + duration
    locks[(proto, user)] = (now, unlock_at)
    save_locked_users(locks)

    log(f"🔒 LOCKING [{proto.upper()}] user: {user} for {duration // 60}m")

    if proto == "ssh":
        run_cmd(f"passwd -l {user} >/dev/null 2>&1")
        run_cmd(f"pkill -u {user} >/dev/null 2>&1")
        # Bunuh Dropbear/SSHD session untuk user ini
        run_cmd(f"ps aux | grep -i '{user}' | grep -E 'dropbear|sshd' | awk '{{print $2}}' | xargs -r kill -9 >/dev/null 2>&1")
    elif proto in ("vmess", "vless", "trojan") and XRAY_CONFIG.exists():
        exp = ""
        # Cari tanggal expired user dari config
        prefix_map = {"vmess": "###", "vless": "#&", "trojan": "#!"}
        pfx = prefix_map.get(proto, "###")
        cmd_find = f"grep -wE '^{pfx} {user}' /etc/xray/config.json | awk '{{print $3}}' | head -n1"
        exp = run_cmd(cmd_find)
        if exp:
            run_cmd(f"sed -i '/^{pfx} {user} {exp}/,/^}},/d' /etc/xray/config.json")
            run_cmd("systemctl restart xray >/dev/null 2>&1")
    return True

def unlock_user(proto: str, user: str) -> bool:
    locks = get_locked_users()
    if (proto, user) in locks:
        del locks[(proto, user)]
        save_locked_users(locks)

    log(f"🔓 UNLOCKING [{proto.upper()}] user: {user}")

    if proto == "ssh":
        run_cmd(f"passwd -u {user} >/dev/null 2>&1")
    elif proto == "vmess" and Path("/etc/vmess/.vmess.db").exists():
        # Format .vmess.db: ### user exp uuid quota iplimit
        db_line = run_cmd(f"awk '$1==\"###\" && $2==\"{user}\" {{print $3, $4}}' /etc/vmess/.vmess.db | head -n1")
        if db_line:
            parts = db_line.split()
            exp, uuid = parts[0], parts[1]
            inject_vmess = (
                f"sed -i '/#vmess$/a\\### {user} {exp}\\n"
                f'}},{{"id": "{uuid}","alterId": 0,"email": "{user}"}}\' /etc/xray/config.json && '
                f"sed -i '/#vmessgrpc$/a\\### {user} {exp}\\n"
                f'}},{{"id": "{uuid}","alterId": 0,"email": "{user}"}}\' /etc/xray/config.json'
            )
            run_cmd(inject_vmess)
            run_cmd("systemctl restart xray >/dev/null 2>&1")
    elif proto == "vless" and Path("/etc/vless/.vless.db").exists():
        # Format .vless.db: #& user exp uuid quota iplimit
        db_line = run_cmd(f"awk '$1==\"#&\" && $2==\"{user}\" {{print $3, $4}}' /etc/vless/.vless.db | head -n1")
        if db_line:
            parts = db_line.split()
            exp, uuid = parts[0], parts[1]
            inject_vless = (
                f"sed -i '/#vless$/a\\#& {user} {exp}\\n"
                f'}},{{"id": "{uuid}","email": "{user}"}}\' /etc/xray/config.json && '
                f"sed -i '/#vlessgrpc$/a\\#& {user} {exp}\\n"
                f'}},{{"id": "{uuid}","email": "{user}"}}\' /etc/xray/config.json'
            )
            run_cmd(inject_vless)
            run_cmd("systemctl restart xray >/dev/null 2>&1")
    elif proto == "trojan" and Path("/etc/trojan/.trojan.db").exists():
        # Format .trojan.db: #! user exp uuid quota iplimit
        db_line = run_cmd(f"awk '$1==\"#!\" && $2==\"{user}\" {{print $3, $4}}' /etc/trojan/.trojan.db | head -n1")
        if db_line:
            parts = db_line.split()
            exp, uuid = parts[0], parts[1]
            inject_trojan = (
                f"sed -i '/#trojanws$/a\\#! {user} {exp}\\n"
                f'}},{{"password": "{uuid}","email": "{user}"}}\' /etc/xray/config.json && '
                f"sed -i '/#trojangrpc$/a\\#! {user} {exp}\\n"
                f'}},{{"password": "{uuid}","email": "{user}"}}\' /etc/xray/config.json'
            )
            run_cmd(inject_trojan)
            run_cmd("systemctl restart xray >/dev/null 2>&1")
    return True

def process_auto_unlock():
    locks = get_locked_users()
    now = int(time.time())
    to_unlock = []
    for (proto, u), (lat, uat) in locks.items():
        if now >= uat:
            to_unlock.append((proto, u))

    for proto, u in to_unlock:
        log(f"⏰ Auto-unlock timer (15 min) expired for [{proto.upper()}] {u}")
        unlock_user(proto, u)

def check_ssh_usage(locks: dict):
    # Mengumpulkan session OpenSSH dan Dropbear yang AKTIF SECARA REALTIME
    user_ips = {}

    # 1. OpenSSH: who hanya mencatat login shell yang sedang aktif saat ini
    who_out = run_cmd("who")
    for l in who_out.splitlines():
        parts = l.split()
        if len(parts) >= 5:
            u = parts[0]
            ip_raw = parts[-1].strip("()")
            if ip_raw and not is_tethering(ip_raw):
                user_ips.setdefault(u, set()).add(ip_raw)

    # 2. Dropbear & OpenSSH: Ambil socket yang benar-benar ESTABLISHED saat ini (bukan riwayat log)
    # Ini memastikan user yang ganti IP karena Mode Pesawat TIDAK dituduh multi-login
    ss_out = run_cmd("ss -ntp state established")
    # Mapping PID -> Remote IP
    pid_to_ip = {}
    for line in ss_out.splitlines():
        # Kolom 4: Local, Kolom 5: Remote (ip:port), Kolom 6: users:(("dropbear",pid=1234,fd=...))
        m_remote = re.search(r"\s([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+):\d+\s+users:\(\(\"([^\"]+)\",pid=(\d+)", line)
        if m_remote:
            r_ip = m_remote.group(1)
            proc_name = m_remote.group(2)
            pid = m_remote.group(3)
            if not is_tethering(r_ip) and proc_name in ("dropbear", "sshd"):
                pid_to_ip[pid] = r_ip

    # Hubungkan PID aktif dengan username
    if pid_to_ip:
        ps_out = run_cmd("ps -eo pid,user,comm")
        for pline in ps_out.splitlines():
            pparts = pline.split()
            if len(pparts) >= 3:
                pid, u, comm = pparts[0], pparts[1], pparts[2]
                if pid in pid_to_ip and u not in ("root", "admin", "ubuntu", "debian"):
                    user_ips.setdefault(u, set()).add(pid_to_ip[pid])

    for u, ips in user_ips.items():
        if u in ("root", "admin", "ubuntu", "debian"):
            continue
        if ("ssh", u) in locks:
            continue
        limit = get_user_limit("ssh", u)
        if len(ips) > limit:
            log(f"⚠️ SSH User '{u}' exceeded limit! Real-time Active IPs ({len(ips)}): {list(ips)} | Limit: {limit}")
            lock_user("ssh", u)

def check_xray_usage(locks: dict):
    if not XRAY_ACCESS_LOG.exists():
        return

    # Ambil 3000 baris terakhir dari access.log
    tail_out = run_cmd(f"tail -n 3000 {XRAY_ACCESS_LOG}")
    if not tail_out:
        return

    # (proto, user) -> {ip: last_seen_datetime}
    user_ip_times = {}

    for line in tail_out.splitlines():
        # Format umum xray: 2026/11/09 12:00:00 1.2.3.4:5678 accepted tcp:... email: user
        if "accepted" not in line or "email:" not in line:
            continue
        m_time = re.match(r"^(\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2})", line)
        m_ip = re.search(r"\s(?:from\s+)?([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+):\d+", line)
        m_user = re.search(r"email:\s*([a-zA-Z0-9_\-]+)", line)
        if m_ip and m_user:
            ip = m_ip.group(1)
            u = m_user.group(1)
            if is_tethering(ip):
                continue

            dt = None
            if m_time:
                try:
                    dt = datetime.strptime(m_time.group(1), "%Y/%m/%d %H:%M:%S")
                except Exception:
                    pass

            # Tentukan protokol dari DB
            proto = None
            if Path("/etc/vmess/.vmess.db").exists() and run_cmd(f"grep -wE '### {u}' /etc/vmess/.vmess.db"):
                proto = "vmess"
            elif Path("/etc/vless/.vless.db").exists() and run_cmd(f"grep -wE '#& {u}' /etc/vless/.vless.db"):
                proto = "vless"
            elif Path("/etc/trojan/.trojan.db").exists() and run_cmd(f"grep -wE '#! {u}' /etc/trojan/.trojan.db"):
                proto = "trojan"

            if proto:
                key = (proto, u)
                if key not in user_ip_times:
                    user_ip_times[key] = {}
                if dt:
                    if ip not in user_ip_times[key] or dt > user_ip_times[key][ip]:
                        user_ip_times[key][ip] = dt
                else:
                    user_ip_times[key][ip] = datetime.now()

    now = datetime.now()
    # Hanya anggap IP aktif jika ada aktivitas transmisi dalam 25 detik terakhir
    # Mencegah false-positive saat user berganti IP via mode pesawat
    WINDOW_SECONDS = 25

    for (proto, u), ip_dict in user_ip_times.items():
        if (proto, u) in locks:
            continue
        
        active_ips = []
        for ip, last_dt in ip_dict.items():
            diff = (now - last_dt).total_seconds()
            if abs(diff) <= WINDOW_SECONDS:
                active_ips.append(ip)

        limit = get_user_limit(proto, u)
        if len(active_ips) > limit:
            log(f"⚠️ {proto.upper()} User '{u}' exceeded limit! Concurrent Active IPs ({len(active_ips)}): {active_ips} | Limit: {limit}")
            lock_user(proto, u)

def main():
    if len(sys.argv) > 1:
        action = sys.argv[1].lower()
        if action == "lock" and len(sys.argv) >= 4:
            proto, u = sys.argv[2], sys.argv[3]
            lock_user(proto, u)
            sys.exit(0)
        elif action == "unlock" and len(sys.argv) >= 4:
            proto, u = sys.argv[2], sys.argv[3]
            unlock_user(proto, u)
            sys.exit(0)
        elif action == "status":
            locks = get_locked_users()
            print(f"Total locked accounts: {len(locks)}")
            now = int(time.time())
            for (p, u), (lat, uat) in locks.items():
                rem = max(0, uat - now)
                print(f"  [{p.upper()}] {u} - Locked for remaining {rem // 60}m {rem % 60}s")
            sys.exit(0)

    # Siklus normal pemantauan
    process_auto_unlock()
    locks = get_locked_users()
    check_ssh_usage(locks)
    check_xray_usage(locks)

if __name__ == "__main__":
    main()
