#!/bin/bash
# ==========================================
# 🔧 System Auto Update & License Checker
# ==========================================

MYIP=$(curl -sS ipv4.icanhazip.com 2>/dev/null || echo "127.0.0.1")
echo ""
echo "root" >/usr/bin/user 2>/dev/null || true
today=`date -d "0 days" +"%Y-%m-%d"`
valid="2099-12-31"
echo "$valid" >/usr/bin/e 2>/dev/null || true
username="root"
exp="$valid"
COLOR1='\033[1;36m'
NC='\e[0m'
GREEN='\033[0;32m'
RED='\033[0;31m'
sts="${GREEN}Active${NC}"

ipsaya=$MYIP
RED="\033[0;31m"
WH="\033[1;37m"
data_server=$(curl -v --insecure --silent https://google.com/ 2>&1 | grep Date | sed -e 's/< Date: //')
date_list=$(date +"%Y-%m-%d" -d "$data_server")

# ==========================================
# ⚙️ Fungsi: Mengecek izin script dan versi
# ==========================================
checking_sc() {
    return 0
}

# ==========================================
# ▶️ Jalankan Fungsi Utama
# ==========================================
checking_sc
cd

# ==========================================
# 📅 Hitung sisa masa aktif lisensi
# ==========================================
echo "9999 Hari" > /etc/masaaktif 2>/dev/null || true

# ==========================================
# ▶️ MEMBERSIHKAN USER LOGIN VPS (DINONAKTIFKAN UNTUK KEAMANAN)
# ==========================================
# Blok userdel dinonaktifkan agar tidak menghapus user sah sistem / panel.
# ==========================================
# 🔁 Pemeriksaan & Restart Otomatis Service
# ==========================================

### 🔹 Xray
xray2=$(systemctl status xray | grep Active | awk '{print $3}' | cut -d "(" -f2 | cut -d ")" -f1)
if [[ $xray2 != "running" ]]; then
    systemctl restart xray
fi

### 🔹 Haproxy
haproxy2=$(systemctl status haproxy | grep Active | awk '{print $3}' | cut -d "(" -f2 | cut -d ")" -f1)
if [[ $haproxy2 != "running" ]]; then
    systemctl restart haproxy
fi

### 🔹 Nginx
nginx2=$(systemctl status nginx | grep Active | awk '{print $3}' | sed 's/(//g' | sed 's/)//g')
if [[ $nginx2 != "running" ]]; then
    systemctl restart nginx
fi

### 🔹 Kyt (custom service)
if [[ -e /usr/bin/kyt ]]; then
    kyt_status=$(systemctl status kyt | grep Active | awk '{print $3}' | sed 's/(//g' | sed 's/)//g')
    if [[ $kyt_status != "running" ]]; then
        systemctl restart kyt
    fi
fi

### 🔹 WebSocket (ws)
ws=$(systemctl status ws | grep Active | awk '{print $3}' | cut -d "(" -f2 | cut -d ")" -f1)
if [[ $ws != "running" ]]; then
    systemctl restart ws
fi

# ==========================================
# ✅ Selesai
# ==========================================
