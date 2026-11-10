#!/bin/bash
# ==========================================================
#   ANSENDANT VPN - BOT WILDCARD CLOUDFLARE INSTALLER
#   Universal Debian & Ubuntu (Python 3.11 Safe Mode)
# ==========================================================

set -u
export DEBIAN_FRONTEND=noninteractive

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
MAGENTA="\033[1;35m"

ICO_OK="✔"
ICO_FAIL="✖"
ICO_WARN="⚠"
ICO_INFO="ℹ"
ICO_STEP="▸"
ICO_BOX="◆"

URL="http://rajaserver.web.id/v7/botwc/botwildcard.zip"

line() {
  echo -e "${WHITE}──────────────────────────────────────────────────────────────${RESET}"
}

title() {
  clear
  line
  echo -e "${MAGENTA}${BOLD}✦ BOT WILDCARD CLOUDFLARE — INSTALLER UNIVERSAL ✦${RESET}"
  echo -e "${GRAY}${DIM}Debian • Ubuntu • Python 3.11 Safe • systemd • cron${RESET}"
  line
}

ok()   { echo -e "${GREEN}${ICO_OK} $1${RESET}"; }
fail() { echo -e "${RED}${ICO_FAIL} $1${RESET}"; }
warn() { echo -e "${YELLOW}${ICO_WARN} $1${RESET}"; }
info() { echo -e "${CYAN}${ICO_INFO} $1${RESET}"; }
step() { echo -e "${WHITE}${BOLD}${ICO_STEP} $1${RESET}"; }

require_root() {
  if [[ $EUID -ne 0 ]]; then
    fail "Script harus dijalankan sebagai root"
    exit 1
  fi
}

detect_os() {
  if [[ ! -f /etc/os-release ]]; then
    fail "File /etc/os-release tidak ditemukan"
    exit 1
  fi

  . /etc/os-release
  OS_ID="${ID,,}"
  OS_VERSION="${VERSION_ID:-0}"
  OS_MAJOR="${OS_VERSION%%.*}"

  if [[ "$OS_ID" != "ubuntu" && "$OS_ID" != "debian" ]]; then
    fail "OS tidak didukung: $OS_ID $OS_VERSION"
    exit 1
  fi

  info "Deteksi OS: $OS_ID $OS_VERSION"
}

cleanup_old_install() {
  step "Membersihkan install lama"
  systemctl stop botcf >/dev/null 2>&1 || true
  systemctl disable botcf >/dev/null 2>&1 || true
  rm -f /etc/systemd/system/botcf.service
  systemctl daemon-reload >/dev/null 2>&1 || true
  rm -rf /root/botcf /root/botwildcard /root/botwildcard.zip
  rm -rf /opt/python-env
  ok "Install lama dibersihkan"
}

install_dependencies() {
  step "Update repository"
  apt-get update -y >/dev/null 2>&1 || {
    fail "Gagal update repository"
    exit 1
  }
  ok "Repository berhasil diupdate"

  step "Install dependency dasar"
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
    uuid-runtime >/dev/null 2>&1 || {
      fail "Gagal install dependency dasar"
      exit 1
    }

  systemctl enable cron >/dev/null 2>&1 || true
  systemctl restart cron >/dev/null 2>&1 || true
  ok "Dependency dasar berhasil diinstall"
}

setup_python() {
  step "Menyiapkan Python environment"

  . /etc/os-release
  OS_ID="${ID,,}"
  OS_VERSION="${VERSION_ID:-0}"
  OS_MAJOR="${OS_VERSION%%.*}"

  PYTHON_BIN="python3.11"

  if [[ "$OS_ID" == "ubuntu" ]]; then
    step "Menyiapkan Python 3.11 untuk Ubuntu"
    apt-get install -y software-properties-common >/dev/null 2>&1 || true
    add-apt-repository ppa:deadsnakes/ppa -y >/dev/null 2>&1 || true
    apt-get update -y >/dev/null 2>&1 || true
    apt-get install -y python3.11 python3.11-dev python3.11-venv >/dev/null 2>&1 || {
      fail "Gagal install Python 3.11 di Ubuntu"
      exit 1
    }
  elif [[ "$OS_ID" == "debian" ]]; then
    step "Menyiapkan Python untuk Debian"

    if apt-cache show python3.11 >/dev/null 2>&1; then
      apt-get install -y python3.11 python3.11-dev python3.11-venv >/dev/null 2>&1 || true
    fi

    if ! command -v python3.11 >/dev/null 2>&1; then
      apt-get install -y python3 python3-dev python3-pip python3-venv >/dev/null 2>&1 || {
        fail "Gagal install Python bawaan Debian"
        exit 1
      }
      PYTHON_BIN="python3"
      warn "Python 3.11 tidak tersedia, fallback ke ${PYTHON_BIN}"
    fi
  fi

  if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
    fail "Interpreter $PYTHON_BIN tidak ditemukan"
    exit 1
  fi

  step "Membuat virtual environment"
  rm -rf /opt/python-env
  "$PYTHON_BIN" -m venv /opt/python-env >/dev/null 2>&1 || {
    fail "Gagal membuat virtual environment dengan $PYTHON_BIN"
    exit 1
  }

  PYTHON_EXEC="/opt/python-env/bin/python"
  PIP_EXEC="/opt/python-env/bin/pip"

  "$PIP_EXEC" install --upgrade pip setuptools wheel >/dev/null 2>&1 || {
    fail "Gagal upgrade pip"
    exit 1
  }

  step "Install module Python"
  "$PIP_EXEC" install requests >/dev/null 2>&1 || {
    fail "Gagal install requests"
    exit 1
  }

  "$PIP_EXEC" install --only-binary=:all: aiohttp==3.8.6 >/dev/null 2>&1 || {
    fail "Gagal install aiohttp wheel"
    exit 1
  }

  "$PIP_EXEC" install aiogram==2.25.1 requests aiohttp==3.8.6 >/dev/null 2>&1 || {
    fail "Gagal install modules python"
    exit 1
  }

  ok "Python environment siap"
  info "Interpreter aktif: $($PYTHON_EXEC --version 2>&1)"
}

download_and_extract_bot() {
  step "Mengunduh bot"
  cd /root || exit 1
  curl -fsSL "$URL" -o botwildcard.zip || {
    fail "Gagal download bot"
    exit 1
  }
  ok "Bot berhasil diunduh"

  step "Mengekstrak bot"
  unzip -o /root/botwildcard.zip >/dev/null 2>&1 || {
    fail "Gagal ekstrak botwildcard.zip"
    exit 1
  }

  if [[ ! -d /root/botwildcard ]]; then
    fail "Folder /root/botwildcard tidak ditemukan"
    exit 1
  fi

  mkdir -p /root/botcf
  cp -rf /root/botwildcard/* /root/botcf/

  if [[ -f /root/botcf/add-wc.sh ]]; then
    dos2unix /root/botcf/add-wc.sh >/dev/null 2>&1 || true
    sed -i 's/\r$//' /root/botcf/add-wc.sh
    chmod +x /root/botcf/add-wc.sh
  fi

  if [[ -f /root/botcf/bot-cloudflare.py ]]; then
    dos2unix /root/botcf/bot-cloudflare.py >/dev/null 2>&1 || true
    sed -i 's/\r$//' /root/botcf/bot-cloudflare.py
  fi

  rm -rf /root/botwildcard
  rm -f /root/botwildcard.zip

  if [[ ! -f /root/botcf/bot-cloudflare.py ]]; then
    fail "File bot-cloudflare.py tidak ditemukan"
    exit 1
  fi

  ok "Bot berhasil dipasang ke /root/botcf"
}

configure_bot() {
  line
  echo -e "${WHITE}${BOLD}${ICO_BOX} KONFIGURASI BOT${RESET}"
  line
  echo -e "${YELLOW}• Bisa masukkan lebih dari 1 admin${RESET}"
  echo -e "${GRAY}  Contoh: 5092269467,6687478923${RESET}"
  echo

  read -r -e -p "$(echo -e ${CYAN}'Bot Token   : '${RESET})" tokenbot
  read -r -e -p "$(echo -e ${CYAN}'ID Telegram : '${RESET})" idtele

  if [[ -z "${tokenbot}" || -z "${idtele}" ]]; then
    fail "Bot Token dan ID Telegram wajib diisi"
    exit 1
  fi

  step "Menulis konfigurasi bot-cloudflare.py"
  escaped_token=$(printf '%s\n' "$tokenbot" | sed 's/[\/&]/\\&/g')
  idtele_cleaned=$(echo "$idtele" | tr -d '[:space:]')

  sed -i "s/^API_TOKEN *= *.*/API_TOKEN = \"${escaped_token}\"/" /root/botcf/bot-cloudflare.py
  sed -i "s/^ADMIN_IDS *= *.*/ADMIN_IDS = [${idtele_cleaned}]/" /root/botcf/bot-cloudflare.py || {
    fail "Gagal menulis konfigurasi ke bot-cloudflare.py"
    exit 1
  }

  ok "Konfigurasi bot tersimpan"
}

create_service() {
  step "Membuat service systemd"
  cat > /etc/systemd/system/botcf.service <<EOF
[Unit]
Description=Simple Bot Wildcard - botcf
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/botcf
ExecStart=${PYTHON_EXEC} /root/botcf/bot-cloudflare.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable botcf >/dev/null 2>&1 || true
  systemctl restart botcf || {
    fail "Gagal menjalankan service botcf"
    exit 1
  }

  ok "Service botcf aktif"
}

create_uploader_helper() {
  local idku
  idku=$(echo "$idtele" | cut -d',' -f1 | tr -d '[:space:]')

  local script_path="/usr/bin/list_all_userbot"
  local log_path="/var/log/list_all_userbot.log"

  step "Membuat helper uploader"

  cat > "$script_path" <<EOF
#!/bin/bash
BOT_TOKEN="${tokenbot}"
CHAT_ID="${idku}"
FILE="/root/botcf/all_users.json"
FILE_2="/root/botcf/allowed_users.json"

if [ -f "\$FILE" ]; then
  curl -s -F chat_id="\$CHAT_ID" -F document=@"\$FILE" "https://api.telegram.org/bot\$BOT_TOKEN/sendDocument" >/dev/null 2>&1
fi

if [ -f "\$FILE_2" ]; then
  curl -s -F chat_id="\$CHAT_ID" -F document=@"\$FILE_2" "https://api.telegram.org/bot\$BOT_TOKEN/sendDocument" >/dev/null 2>&1
fi
EOF

  chmod +x "$script_path"
  dos2unix "$script_path" >/dev/null 2>&1 || true
  sed -i 's/\r$//' "$script_path"

  local tmp_cron
  tmp_cron=$(mktemp)
  crontab -l 2>/dev/null | grep -v "$script_path" > "$tmp_cron" || true
  echo "0 */5 * * * $script_path >> $log_path 2>&1" >> "$tmp_cron"
  crontab "$tmp_cron"
  rm -f "$tmp_cron"

  ok "Helper uploader & cron siap"
}

finish_install() {
  line
  echo -e "${GREEN}${BOLD}Successfully Installed Bot Wildcard Cloudflare${RESET}"
  line
  echo -e "${CYAN}Cek status service:${RESET} systemctl status botcf"
  echo -e "${CYAN}Lihat log bot:${RESET} journalctl -u botcf -f"
  line
}

main() {
  title
  require_root
  detect_os
  cleanup_old_install
  install_dependencies
  setup_python
  download_and_extract_bot
  configure_bot
  create_service
  create_uploader_helper
  finish_install
}

main
exit 0