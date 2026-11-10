#!/bin/bash
# ==================================================
# Script Setup & Update Menu VPS
# ==================================================

# -----------------------------
# Fungsi Animasi Loading
# -----------------------------
loading() {
    local pid=$1
    local message=$2
    local delay=0.1
    local spinstr='|/-\'
    tput civis
    while [ -d /proc/$pid ]; do
        local temp=${spinstr#?}
        printf " [%c] $message\r" "$spinstr"
        spinstr=$temp${spinstr%"$temp"}
        sleep $delay
    done
    tput cnorm
}

# -----------------------------
# Install p7zip jika belum ada
# -----------------------------
if ! command -v 7z &> /dev/null; then
    echo -e " [INFO] Installing p7zip-full..."
    apt install p7zip-full -y &> /dev/null &
    loading $! "Loading Install p7zip-full"
fi

# -----------------------------
# Telegram Bot Config
# -----------------------------
CHATID="ID_TELE"
KEY="TOKEN_TELE"
TIME="10"
URL="https://api.telegram.org/bot$KEY/sendMessage"

# -----------------------------
# Variabel Server & User
# -----------------------------
domain=$(cat /etc/xray/domain 2>/dev/null || echo "localhost")
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

# Mendapatkan tanggal dari server
echo -e " [INFO] Fetching server date..."
dateFromServer=$(curl -v --insecure --silent https://google.com/ 2>&1 | grep Date | sed -e 's/< Date: //')
biji=$(date +"%Y-%m-%d" -d "$dateFromServer")

# Repository
REPO="$(cat /etc/repo2)"
# -----------------------------
# Download & Setup Menu
# -----------------------------
echo -e " [INFO] Downloading menu.zip..."
{
    > /etc/cron.d/cpu_otm

    cat > /etc/cron.d/cpu_ari <<END
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
*/5 * * * * root /usr/bin/autocpu
END

    wget -O /usr/bin/autocpu "${REPO}install/autocpu.sh" && chmod +x /usr/bin/autocpu
    mv menu/expsc /usr/local/sbin/expsc
    wget -q -O /usr/bin/enc "${REPO}install/encrypt"
    chmod +x /usr/bin/enc

    # Extract dan encrypt menu
[ -f "${REPO}menu/menu.zip" ] && cp "${REPO}menu/menu.zip" ./menu.zip || wget -q ${REPO}menu/menu.zip
# Extract pakai unzip atau 7z
unzip -o menu.zip &> /dev/null || 7z x -y -p'coding_sendiri_lah_goblok_cuman_bisa_nyuri' menu.zip &> /dev/null
# Baru jalanin setelah extract
chmod +x menu/*
#enc menu/* &> /dev/null
mv menu/* /usr/local/sbin

    # Cleanup
    rm -rf menu menu.zip
    rm -rf /usr/local/sbin/*~ /usr/local/sbin/gz* /usr/local/sbin/*.bak
    cd /usr/local/sbin
    sed -i 's/\r//' quota
    cd
} &> /dev/null &
loading $! "Loading Extract and Setup menu"

# -----------------------------
# Ambil versi server
# -----------------------------
echo -e " [INFO] Fetching server version..."
serverV=$(curl -sS ${REPO}versi)
echo $serverV > /opt/.ver

# Cleanup
rm /root/*.sh*

# -----------------------------
# Kirim Notifikasi Telegram
# -----------------------------
TEXT="◇━━━━━━━━━━━━━━◇
<b>   ⚠️NOTIF UPDATE SCRIPT⚠️</b>
<b>     Update Script Sukses</b>
◇━━━━━━━━━━━━━━◇
<b>IP VPS  :</b> ${MYIP} 
<b>DOMAIN  :</b> ${domain}
<b>Version :</b> ${serverV}
<b>USER    :</b> ${username}
<b>MASA    :</b> $certifacate DAY
◇━━━━━━━━━━━━━━◇
BY BOT : @ARI_VPN_STORE
"

curl -s --max-time $TIME -d "chat_id=$CHATID&disable_web_page_preview=1&text=$TEXT&parse_mode=html" $URL >/dev/null

echo -e " [INFO] File download and setup completed successfully. Version: $serverV!"
exit 0
