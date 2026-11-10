#!/bin/bash
# ==========================================================
#   ANSENDANT VPN - BOT WILDCARD CLOUDFLARE INSTALLER
#   Premium Visual Edition
#   Support: Debian & Ubuntu
# ==========================================================

clear

# =========================
# STYLE / COLOR
# =========================
RESET="\033[0m"
BOLD="\033[1m"
DIM="\033[2m"

WHITE="\033[1;97m"
GRAY="\033[0;37m"
RED="\033[1;31m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
BLUE="\033[1;34m"
MAGENTA="\033[1;35m"
CYAN="\033[1;36m"

C1="\033[38;5;51m"
C2="\033[38;5;45m"
C3="\033[38;5;39m"
C4="\033[38;5;33m"
C5="\033[38;5;27m"

BLINK_GREEN="\033[5;32m"

ICO_OK="✔"
ICO_FAIL="✖"
ICO_WARN="⚠"
ICO_INFO="ℹ"
ICO_STEP="▸"
ICO_GEAR="⚙"
ICO_ROCKET="🚀"
ICO_BOT="🤖"
ICO_LOCK="🔑"
ICO_USER="👤"
ICO_BOX="◆"

URL="http://rajaserver.web.id/v7/botwc/botwildcard.zip"

# =========================
# UI FUNCTION
# =========================
line() {
  echo -e "${C2}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

banner() {
  clear
  echo -e "${C1}${BOLD}"
  echo "╔════════════════════════════════════════════════════╗"
  echo "║                                                    ║"
  echo "║        🚀 ANSENDANT VPN INSTALLER PREMIUM 🚀       ║"
  echo "║                                                    ║"
  echo "║          BOT WILDCARD CLOUDFLARE EDITION           ║"
  echo "║                                                    ║"
  echo "╚════════════════════════════════════════════════════╝"
  echo -e "${RESET}"
  echo -e "${DIM}${CYAN}Auto Setup • Debian/Ubuntu Support • systemd • cron${RESET}"
  echo
}

ok() {
  echo -e "${GREEN}${ICO_OK} $1${RESET}"
}

fail() {
  echo -e "${RED}${ICO_FAIL} $1${RESET}"
}

warn() {
  echo -e "${YELLOW}${ICO_WARN} $1${RESET}"
}

info() {
  echo -e "${CYAN}${ICO_INFO} $1${RESET}"
}

step() {
  echo
  echo -e "${WHITE}${BOLD}${ICO_STEP} $1${RESET}"
}

loading() {
  echo -ne "${CYAN}⏳ $1${RESET}"
  for i in 1 2 3; do
    echo -ne "."
    sleep 0.2
  done
  echo ""
}

print_box() {
  line
  echo -e "${WHITE}${BOLD}${ICO_BOX} $1${RESET}"
  line
}

# =========================
# START
# =========================
banner

# =========================
# CHECK ROOT
# =========================
if [[ $EUID -ne 0 ]]; then
  fail "Script harus dijalankan sebagai root"
  exit 1
fi

# =========================
# CHECK OS
# =========================
if [[ ! -f /etc/os-release ]]; then
  fail "File /etc/os-release tidak ditemukan"
  exit 1
fi

source /etc/os-release
OS_ID="${ID,,}"
OS_VERSION="${VERSION_ID:-0}"
OS_MAJOR="${OS_VERSION%%.*}"

if [[ "$OS_ID" != "ubuntu" && "$OS_ID" != "debian" ]]; then
  fail "OS tidak didukung: $OS_ID $OS_VERSION"
  exit 1
fi

info "Deteksi OS: ${OS_ID} ${OS_VERSION}"

export DEBIAN_FRONTEND=noninteractive

# =========================
# CLEAN OLD INSTALL
# =========================
step "Membersihkan service dan folder lama"
systemctl stop botcf >/dev/null 2>&1 || true
systemctl disable botcf >/dev/null 2>&1 || true
rm -f /etc/systemd/system/botcf.service
systemctl daemon-reload >/dev/null 2>&1 || true
rm -rf /root/botcf
ok "Sisa install lama dibersihkan"

# =========================
# INSTALL DEPENDENCIES
# =========================
step "Mengupdate repository"
loading "Mengambil package terbaru"
apt-get update -y >/dev/null 2>&1
if [[ $? -ne 0 ]]; then
  fail "Gagal update repository"
  exit 1
fi
ok "Repository berhasil diupdate"

step "Menginstall dependency dasar"
loading "Menginstall curl, python, unzip, jq, git, cron"
apt-get install -y \
  curl \
  wget \
  jq \
  git \
  unzip \
  zip \
  dos2unix \
  cron \
  ca-certificates \
  software-properties-common \
  build-essential \
  libffi-dev \
  libssl-dev \
  pkg-config \
  python3 \
  python3-dev \
  python3-pip \
  python3-setuptools \
  python3-venv >/dev/null 2>&1

if [[ $? -ne 0 ]]; then
  fail "Gagal install dependency dasar"
  exit 1
fi
ok "Dependency dasar berhasil diinstall"

systemctl enable cron >/dev/null 2>&1 || true
systemctl restart cron >/dev/null 2>&1 || true

# =========================
# PYTHON MODE
# =========================
USE_VENV="false"
if [[ "$OS_ID" == "debian" && "$OS_MAJOR" -ge 12 ]]; then
  USE_VENV="true"
fi
if [[ "$OS_ID" == "ubuntu" && "$OS_MAJOR" -ge 24 ]]; then
  USE_VENV="true"
fi

if [[ "$USE_VENV" == "true" ]]; then
  step "Menyiapkan Python virtual environment"
  loading "Membuat virtual environment"
  rm -rf /opt/python-env
  python3 -m venv /opt/python-env
  if [[ $? -ne 0 ]]; then
    fail "Gagal membuat virtual environment"
    exit 1
  fi

  step "Upgrade pip dan tools build"
  /opt/python-env/bin/python -m pip install --upgrade pip setuptools wheel
  if [[ $? -ne 0 ]]; then
    fail "Gagal upgrade pip/setuptools/wheel"
    exit 1
  fi

  step "Install module Python"
  /opt/python-env/bin/python -m pip install \
    requests \
    aiohttp==3.8.6 \
    aiogram==2.25.1

  if [[ $? -ne 0 ]]; then
    echo
    warn "Install utama gagal, mencoba fallback dependency..."
    /opt/python-env/bin/python -m pip install \
      requests \
      aiohttp==3.8.6 \
      aiogram==2.25.1 \
      Babel==2.9.1 \
      certifi \
      magic-filter

    if [[ $? -ne 0 ]]; then
      fail "Gagal install module Python di virtual environment"
      echo
      echo "Coba jalankan manual biar kelihatan error aslinya:"
      echo "/opt/python-env/bin/python -m pip install requests aiohttp==3.8.6 aiogram==2.25.1"
      exit 1
    fi
  fi

  PYTHON_EXEC="/opt/python-env/bin/python3"
  ok "Python virtual environment siap"

else
  step "Menyiapkan Python system"
  loading "Menginstall module Python"

  python3 -m pip install --upgrade pip setuptools wheel || true

  python3 -m pip install \
    requests \
    aiohttp==3.8.6 \
    aiogram==2.25.1 \
  || python3 -m pip install --break-system-packages \
    requests \
    aiohttp==3.8.6 \
    aiogram==2.25.1

  if [[ $? -ne 0 ]]; then
    warn "Install utama gagal, mencoba fallback dependency..."
    python3 -m pip install \
      requests \
      aiohttp==3.8.6 \
      aiogram==2.25.1 \
      Babel==2.9.1 \
      certifi \
      magic-filter \
    || python3 -m pip install --break-system-packages \
      requests \
      aiohttp==3.8.6 \
      aiogram==2.25.1 \
      Babel==2.9.1 \
      certifi \
      magic-filter
  fi

  if [[ $? -ne 0 ]]; then
    fail "Gagal install module Python"
    exit 1
  fi

  PYTHON_EXEC="/usr/bin/python3"
  ok "Python system siap"
fi

# =========================
# DOWNLOAD BOT
# =========================
step "Mengunduh paket bot"
loading "Download botwildcard.zip"
cd /root || exit 1
curl -fsSL "$URL" -o botwildcard.zip
if [[ $? -ne 0 ]]; then
  fail "Gagal mengunduh file dari server"
  exit 1
fi
ok "File bot berhasil diunduh"

# =========================
# EXTRACT BOT
# =========================
step "Mengekstrak paket bot"
loading "Ekstrak file zip"
unzip -o /root/botwildcard.zip >/dev/null 2>&1
if [[ $? -ne 0 ]]; then
  fail "Gagal ekstrak botwildcard.zip"
  exit 1
fi

if [[ ! -d /root/botwildcard ]]; then
  fail "Folder /root/botwildcard tidak ditemukan setelah ekstrak"
  exit 1
fi

if [[ -f /root/botwildcard/add-wc.sh ]]; then
  dos2unix /root/botwildcard/add-wc.sh >/dev/null 2>&1 || true
  sed -i 's/\r$//' /root/botwildcard/add-wc.sh
  chmod +x /root/botwildcard/add-wc.sh
fi

mkdir -p /root/botcf
cp -rf /root/botwildcard/* /root/botcf/
rm -rf /root/botwildcard
rm -f /root/botwildcard.zip
ok "Paket berhasil dipasang ke /root/botcf"

if [[ ! -f /root/botcf/bot-cloudflare.py ]]; then
  fail "File bot-cloudflare.py tidak ditemukan"
  exit 1
fi

# =========================
# INPUT CONFIG
# =========================
print_box "KONFIGURASI BOT WILDCARD"

echo -e "${YELLOW}• Bisa masukkan lebih dari 1 admin${RESET}"
echo -e "${GRAY}  Contoh: 5092269467,6687478923${RESET}"
echo

read -r -e -p "$(echo -e ${CYAN}${ICO_LOCK}' Bot Token   : '${RESET})" tokenbot
read -r -e -p "$(echo -e ${CYAN}${ICO_USER}' ID Telegram : '${RESET})" idtele
echo

if [[ -z "$tokenbot" || -z "$idtele" ]]; then
  fail "Bot Token dan ID Telegram wajib diisi"
  exit 1
fi

# =========================
# WRITE CONFIG
# =========================
step "Menulis konfigurasi ke bot-cloudflare.py"
escaped_token=$(printf '%s\n' "$tokenbot" | sed 's/[\/&]/\\&/g')
idtele_cleaned=$(echo "$idtele" | tr -d '[:space:]')

sed -i "s/^API_TOKEN *= *.*/API_TOKEN = \"${escaped_token}\"/" /root/botcf/bot-cloudflare.py
sed -i "s/^ADMIN_IDS *= *.*/ADMIN_IDS = [${idtele_cleaned}]/" /root/botcf/bot-cloudflare.py

if [[ $? -ne 0 ]]; then
  fail "Gagal menulis konfigurasi bot"
  exit 1
fi
ok "Konfigurasi bot berhasil disimpan"

# =========================
# CREATE SYSTEMD SERVICE
# =========================
step "Membuat service systemd"
cat > /etc/systemd/system/botcf.service <<EOF
[Unit]
Description=Simple Bot Wildcard - @botwildcard
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/botcf
ExecStart=$PYTHON_EXEC /root/botcf/bot-cloudflare.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

if [[ $? -ne 0 ]]; then
  fail "Gagal membuat file service"
  exit 1
fi
ok "Service botcf berhasil dibuat"

# =========================
# HELPER UPLOADER
# =========================
idku=$(echo "$idtele" | cut -d',' -f1 | tr -d '[:space:]')
BOT_TOKEN="${tokenbot}"
CHAT_ID="${idku}"
SCRIPT_PATH="/usr/bin/list_all_userbot"
LOG_PATH="/var/log/list_all_userbot.log"

step "Membuat helper uploader"
rm -f "$SCRIPT_PATH"

cat > "$SCRIPT_PATH" <<EOF
#!/bin/bash
BOT_TOKEN="$BOT_TOKEN"
CHAT_ID="$CHAT_ID"
FILE="/root/botcf/all_users.json"
FILE_2="/root/botcf/allowed_users.json"

if [ -f "\$FILE" ]; then
  curl -s -F chat_id="\$CHAT_ID" -F document=@"\$FILE" "https://api.telegram.org/bot\$BOT_TOKEN/sendDocument" >/dev/null 2>&1
fi

if [ -f "\$FILE_2" ]; then
  curl -s -F chat_id="\$CHAT_ID" -F document=@"\$FILE_2" "https://api.telegram.org/bot\$BOT_TOKEN/sendDocument" >/dev/null 2>&1
fi
EOF

chmod +x "$SCRIPT_PATH"
sed -i 's/\r$//' "$SCRIPT_PATH"
ok "Helper uploader berhasil dibuat"

# =========================
# SET CRON
# =========================
step "Mengatur cron uploader setiap 5 jam"
TMP_CRON=$(mktemp)
crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH" > "$TMP_CRON" || true
echo "0 */5 * * * $SCRIPT_PATH >> $LOG_PATH 2>&1" >> "$TMP_CRON"
crontab "$TMP_CRON"
rm -f "$TMP_CRON"
ok "Cron uploader berhasil diatur"

# =========================
# ENABLE SERVICE
# =========================
step "Menjalankan service botcf"
systemctl daemon-reload
if [[ $? -ne 0 ]]; then
  fail "Gagal reload systemd"
  exit 1
fi

systemctl enable botcf >/dev/null 2>&1
systemctl restart botcf >/dev/null 2>&1

sleep 2

if systemctl is-active --quiet botcf; then
  ok "Service botcf aktif dan berjalan"
else
  fail "Service botcf gagal berjalan"
  echo
  systemctl status botcf --no-pager -l
  exit 1
fi

# =========================
# FINISH
# =========================
step "Membersihkan file sisa installer"
rm -f /root/bot-wildcard.sh >/dev/null 2>&1 || true

echo
echo -e "${GREEN}${BOLD}"
echo "╔════════════════════════════════════════════════════╗"
echo "║                                                    ║"
echo "║              ✅ INSTALLATION SUCCESS ✅            ║"
echo "║                                                    ║"
echo "║         Bot Wildcard Berhasil Dipasang!            ║"
echo "║                                                    ║"
echo "╚════════════════════════════════════════════════════╝"
echo -e "${RESET}"

echo -e "${CYAN}📌 Informasi Service:${RESET}"
echo -e "${WHITE}• Service : botcf${RESET}"
echo -e "${WHITE}• Folder  : /root/botcf${RESET}"
echo -e "${WHITE}• Python  : $PYTHON_EXEC${RESET}"
echo -e "${WHITE}• Cron    : setiap 5 jam${RESET}"

echo
echo -e "${YELLOW}⚡ Perintah berguna:${RESET}"
echo -e "${WHITE}systemctl status botcf${RESET}"
echo -e "${WHITE}systemctl restart botcf${RESET}"
echo -e "${WHITE}journalctl -u botcf -f${RESET}"

echo
line
printf "${BLINK_GREEN}${BOLD}Successfully Installed Bot Wildcard Cloudflare${RESET}\n"
line

exit 0