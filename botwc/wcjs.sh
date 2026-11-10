#!/bin/bash
# ==========================================================
#   ANSENDANT VPN - BOT WILDCARD INSTALLER (NODE.JS EDITION)
#   Support: Debian & Ubuntu
# ==========================================================

clear
RESET="\033[0m"
BOLD="\033[1m"
DIM="\033[2m"
WHITE="\033[1;97m"
GRAY="\033[0;37m"
RED="\033[1;31m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
CYAN="\033[1;36m"
C1="\033[38;5;51m"
C2="\033[38;5;45m"
BLINK_GREEN="\033[5;32m"
ICO_OK="✔"
ICO_FAIL="✖"
ICO_WARN="⚠"
ICO_INFO="ℹ"
ICO_STEP="▸"
ICO_LOCK="🔑"
ICO_USER="👤"
ICO_BOX="◆"
URL="http://rajaserver.web.id/v7/botwc/botwildcard.zip"
line(){ echo -e "${C2}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; }
banner(){
  clear
  echo -e "${C1}${BOLD}"
  echo "╔════════════════════════════════════════════════════╗"
  echo "║                                                    ║"
  echo "║         🚀 ANSENDANT VPN INSTALLER NODE 🚀         ║"
  echo "║                                                    ║"
  echo "║           BOT WILDCARD CLOUDFLARE EDITION          ║"
  echo "║                                                    ║"
  echo "╚════════════════════════════════════════════════════╝"
  echo -e "${RESET}"
  echo -e "${DIM}${CYAN}Auto Setup • Debian/Ubuntu • Node.js • PM2${RESET}"
  echo
}
ok(){ echo -e "${GREEN}${ICO_OK} $1${RESET}"; }
fail(){ echo -e "${RED}${ICO_FAIL} $1${RESET}"; }
warn(){ echo -e "${YELLOW}${ICO_WARN} $1${RESET}"; }
info(){ echo -e "${CYAN}${ICO_INFO} $1${RESET}"; }
step(){ echo; echo -e "${WHITE}${BOLD}${ICO_STEP} $1${RESET}"; }
loading(){ echo -ne "${CYAN}⏳ $1${RESET}"; for i in 1 2 3; do echo -ne "."; sleep 0.2; done; echo ""; }
print_box(){ line; echo -e "${WHITE}${BOLD}${ICO_BOX} $1${RESET}"; line; }

banner
if [[ $EUID -ne 0 ]]; then fail "Script harus dijalankan sebagai root"; exit 1; fi
source /etc/os-release || { fail "OS tidak didukung"; exit 1; }
OS_ID="${ID,,}"; OS_VERSION="${VERSION_ID:-0}"
if [[ "$OS_ID" != "ubuntu" && "$OS_ID" != "debian" ]]; then fail "OS tidak didukung: $OS_ID $OS_VERSION"; exit 1; fi
info "Deteksi OS: ${OS_ID} ${OS_VERSION}"
export DEBIAN_FRONTEND=noninteractive

step "Membersihkan proses/folder lama"
pm2 delete botcf >/dev/null 2>&1 || true
rm -f /etc/systemd/system/botcf.service
systemctl daemon-reload >/dev/null 2>&1 || true
rm -rf /root/botcf
ok "Sisa install lama dibersihkan"

step "Mengupdate repository"
loading "Mengambil package terbaru"
apt-get update -y >/dev/null 2>&1 || { fail "Gagal update repository"; exit 1; }
ok "Repository berhasil diupdate"

step "Menginstall dependency dasar"
loading "Menginstall curl, unzip, jq, git, cron"
apt-get install -y curl wget jq git unzip zip dos2unix cron ca-certificates software-properties-common >/dev/null 2>&1 || { fail "Gagal install dependency dasar"; exit 1; }
ok "Dependency dasar berhasil diinstall"
systemctl enable cron >/dev/null 2>&1 || true
systemctl restart cron >/dev/null 2>&1 || true

step "Menginstall Node.js 20"
loading "Setup NodeSource"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1 || { fail "Gagal setup repository Node.js"; exit 1; }
loading "Install Node.js"
apt-get install -y nodejs >/dev/null 2>&1 || { fail "Gagal install Node.js"; exit 1; }
command -v node >/dev/null 2>&1 || { fail "Node.js tidak ditemukan setelah instalasi"; exit 1; }
ok "Node.js terinstall: $(node -v)"
ok "NPM terinstall: $(npm -v)"

step "Menginstall PM2"
npm install -g pm2 >/dev/null 2>&1 || { fail "Gagal install PM2"; exit 1; }
ok "PM2 berhasil diinstall"

step "Mengunduh paket bot"
loading "Download botwildcard.zip"
cd /root || exit 1
if [ -f /tmp/botwildcard.zip ]; then cp -f /tmp/botwildcard.zip /root/botwildcard.zip; else curl -fsSL "$URL" -o botwildcard.zip || { fail "Gagal mengunduh file dari server"; exit 1; }; fi
ok "File bot berhasil diunduh"

step "Mengekstrak paket bot"
loading "Ekstrak file zip"
unzip -o /root/botwildcard.zip >/dev/null 2>&1 || { fail "Gagal ekstrak botwildcard.zip"; exit 1; }
if [[ ! -d /root/botwildcard ]]; then fail "Folder /root/botwildcard tidak ditemukan setelah ekstrak"; exit 1; fi
if [[ -f /root/botwildcard/add-wc.sh ]]; then dos2unix /root/botwildcard/add-wc.sh >/dev/null 2>&1 || true; sed -i 's/\r$//' /root/botwildcard/add-wc.sh; chmod +x /root/botwildcard/add-wc.sh; fi
mkdir -p /root/botcf
cp -rf /root/botwildcard/* /root/botcf/
rm -rf /root/botwildcard
rm -f /root/botwildcard.zip
ok "Paket berhasil dipasang ke /root/botcf"

print_box "KONFIGURASI BOT WILDCARD"
echo -e "${YELLOW}• Bisa masukkan lebih dari 1 admin${RESET}"
echo -e "${GRAY}  Contoh: 5092269467,6687478923${RESET}"
echo
read -r -e -p "$(echo -e ${CYAN}' Bot Token   : '${RESET})" tokenbot
read -r -e -p "$(echo -e ${CYAN}' ID Telegram : '${RESET})" idtele
echo
[[ -z "$tokenbot" || -z "$idtele" ]] && { fail "Bot Token dan ID Telegram wajib diisi"; exit 1; }

step "Menulis konfigurasi .env"
cat > /root/botcf/.env <<EOF
BOT_TOKEN=${tokenbot}
ADMIN_IDS=${idtele}
PORT=3000
EOF
ok "File .env berhasil dibuat"

step "Menginstall module Node.js"
cd /root/botcf || exit 1
npm install >/dev/null 2>&1 || { fail "Gagal install module Node.js"; exit 1; }
ok "Module Node.js berhasil diinstall"

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

step "Mengatur cron uploader setiap 5 jam"
TMP_CRON=$(mktemp)
crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH" > "$TMP_CRON" || true
echo "0 */5 * * * $SCRIPT_PATH >> $LOG_PATH 2>&1" >> "$TMP_CRON"
crontab "$TMP_CRON"
rm -f "$TMP_CRON"
ok "Cron uploader berhasil diatur"

step "Menjalankan bot dengan PM2"
cd /root/botcf || exit 1
pm2 start bot-cloudflare.js --name botcf >/dev/null 2>&1
pm2 save >/dev/null 2>&1
PM2_CMD=$(pm2 startup systemd -u root --hp /root 2>/dev/null | tail -n 1)
if [[ "$PM2_CMD" == sudo* || "$PM2_CMD" == env* ]]; then bash -lc "$PM2_CMD" >/dev/null 2>&1 || true; fi

if pm2 list | grep -q "botcf"; then ok "Bot berhasil dijalankan dengan PM2"; else fail "Bot gagal dijalankan dengan PM2"; pm2 logs botcf --lines 30; exit 1; fi

echo
echo -e "${GREEN}${BOLD}"
echo "╔════════════════════════════════════════════════════╗"
echo "║                                                    ║"
echo "║              ✅ INSTALLATION SUCCESS ✅            ║"
echo "║                                                    ║"
echo "║          Bot Wildcard Node.js Berjalan!            ║"
echo "║                                                    ║"
echo "╚════════════════════════════════════════════════════╝"
echo -e "${RESET}"
echo -e "${CYAN}📌 Informasi Service:${RESET}"
echo -e "${WHITE}• Process : botcf (PM2)${RESET}"
echo -e "${WHITE}• Folder  : /root/botcf${RESET}"
echo -e "${WHITE}• Node    : $(node -v)${RESET}"
echo -e "${WHITE}• PM2     : $(pm2 -v)${RESET}"
echo -e "${WHITE}• Cron    : setiap 5 jam${RESET}"
echo
echo -e "${YELLOW}⚡ Perintah berguna:${RESET}"
echo -e "${WHITE}pm2 status${RESET}"
echo -e "${WHITE}pm2 logs botcf${RESET}"
echo -e "${WHITE}pm2 restart botcf${RESET}"
echo
line
printf "${BLINK_GREEN}${BOLD}Successfully Installed Bot Wildcard Cloudflare (Node.js)${RESET}\n"
line
exit 0
