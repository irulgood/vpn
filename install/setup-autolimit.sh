#!/bin/bash
# =========================================================
# Installer IRULTUN Auto-Limit Daemon (15-Min Lock / Auto-Unlock)
# =========================================================

echo -e " [INFO] Memasang IRULTUN Auto-Limit Daemon..."

mkdir -p /etc/kyt/limit/ssh/ip
mkdir -p /etc/kyt/limit/vmess/ip
mkdir -p /etc/kyt/limit/vless/ip
mkdir -p /etc/kyt/limit/trojan/ip
mkdir -p /var/log/xray

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "${SCRIPT_DIR}/autolimit.py" /usr/local/bin/autolimit.py
chmod +x /usr/local/bin/autolimit.py

cat > /usr/local/bin/autolimit << 'EOF'
#!/bin/bash
python3 /usr/local/bin/autolimit.py "$@"
EOF
chmod +x /usr/local/bin/autolimit

# Buat database lock jika belum ada
touch /etc/user_locks.db
chmod 644 /etc/user_locks.db

# Pasang cron setiap menit
cat > /etc/cron.d/autolimit << 'EOF'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
* * * * * root /usr/local/bin/autolimit >/dev/null 2>&1
EOF
chmod 644 /etc/cron.d/autolimit

echo -e " [OK] IRULTUN Auto-Limit Daemon aktif (Cron 1 menit + Auto-Unlock 15 menit)."
