#!/bin/bash

# Nonaktifkan IPv6
sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null 2>&1
sysctl -w net.ipv6.conf.default.disable_ipv6=1 >/dev/null 2>&1
#JANGAN UBAH REPO DI SINI
REPO="http://rajaserver.web.id/v7/"
#UBAH REPO DI SINI  
SUB_REPO="ARIbuncar"
REPO_IZIN="https://raw.githubusercontent.com/$SUB_REPO/izin/main/ip"
echo "$REPO_IZIN" | sudo tee /etc/repo > /dev/null
REPO_MENU="https://raw.githubusercontent.com/$SUB_REPO/v7/main/"
echo "$REPO_MENU" | sudo tee /etc/repo2 > /dev/null

# ==========================================
# DEFINISI WARNA
# ==========================================
red='\e[1;31m'
green='\e[0;32m'
yell='\e[1;33m'
tyblue='\e[1;36m'
NC='\033[0m'
green="\e[38;5;82m"
red="\e[38;5;196m"
neutral="\e[0m"
orange="\e[38;5;130m"
blue="\e[38;5;39m"
yellow="\e[38;5;226m"
purple="\e[38;5;141m"
bold_white="\e[1;37m"
pink="\e[38;5;205m"
reset="\e[0m"
gray="\e[38;5;245m"
# Fungsi warna
purple() { echo -e "\\033[35;1m${*}\${NC}"; }
tyblue() { echo -e "\\033[36;1m${*}\${NC}"; }
yellow() { echo -e "\\033[33;1m${*}\${NC}"; }
green() { echo -e "\\033[32;1m${*}\${NC}"; }
red() { echo -e "\\033[31;1m${*}\${NC}"; }

# ==========================================
# FUNGSI UTILITAS
# ==========================================
function secs_to_human() {
    echo "Waktu instalasi : $(( ${1} / 3600 )) jam $(( (${1} / 60) % 60 )) menit $(( ${1} % 60 )) detik"
}

function fun_bar() {
    CMD[0]="$1"
    CMD[1]="$2"
    
    (
        [[ -e $HOME/fim ]] && rm $HOME/fim
        ${CMD[0]} -y >/dev/null 2>&1
        ${CMD[1]} -y >/dev/null 2>&1
        touch $HOME/fim
    ) >/dev/null 2>&1 &
    
    tput civis
    echo -ne "  ${bold_white}🔄 Menginstal File ${bold_white}- ${green}["
    
    while true; do
        for ((i = 0; i < 18; i++)); do
            echo -ne "\033[0;32m#"
            sleep 0.1s
        done
        
        [[ -e $HOME/fim ]] && rm $HOME/fim && break
        echo -e "\033[0;33m]"
        sleep 1s
        tput cuu1
        tput dl1
        echo -ne "  ${bold_white}🔄 Menginstal File ${bold_white}- ${green}["
    done
    
    echo -e "${green}]${bold_white} -${green} ✅ Sukses !${bold_white}"
    tput cnorm
}

# ==========================================
# FUNGSI UTAMA
# ==========================================
function CEKIP() {
    MYIP=$(curl -sS ipv4.icanhazip.com 2>/dev/null || echo "127.0.0.1")
    mkdir -p /usr/bin
    echo "root" >/usr/bin/user 2>/dev/null || true
    echo "2099-12-31" >/usr/bin/e 2>/dev/null || true
    sts="${green}Active${NC}"
    domain
    Pasang
}

function domain() {
    fun_bar() {
        CMD[0]="$1"
        CMD[1]="$2"
        (
            [[ -e $HOME/fim ]] && rm $HOME/fim
            ${CMD[0]} -y >/dev/null 2>&1
            ${CMD[1]} -y >/dev/null 2>&1
            touch $HOME/fim
        ) >/dev/null 2>&1 &
        
        tput civis
        echo -ne "  ${yellow}🔄 Update Domain.. ${bold_white}- ${yellow}["
        while true; do
            for ((i = 0; i < 18; i++)); do
                echo -ne "\033[0;32m#"
                sleep 0.1s
            done
            [[ -e $HOME/fim ]] && rm $HOME/fim && break
            echo -e "\033[0;33m]"
            sleep 1s
            tput cuu1
            tput dl1
            echo -ne "  ${yellow}🔄 Update Domain... ${bold_white}- ${yellow}["
            done
            echo -e "${yellow}]${bold_white} -${green} ✅ Sukses !${bold_white}"
        tput cnorm
    }

    res1() {
        wget ${REPO}install/pointing.sh && chmod +x pointing.sh && ./pointing.sh
        clear
    }

    clear
    cd
    echo -e "${green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${bold_white}              🎯 SETUP DOMAIN VPS              ${NC}"
echo -e "${green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${yellow}------------------------------------------------${NC}"
echo -e "${green} 1. ${bold_white}Gunakan Domain Sendiri${NC}"
echo -e "${green} 2. ${bold_white}Gunakan Domain Random${NC}"
echo -e "${yellow}------------------------------------------------${NC}"
if [ -n "$CUSTOM_DOMAIN" ]; then
    domain="1"
    dnss="$CUSTOM_DOMAIN"
elif [ -f /root/domain ] && [ -s /root/domain ]; then
    domain="1"
    dnss=$(cat /root/domain | tr -d '\r\n ')
else
    until [[ $domain =~ ^[12]+$ ]]; do
    read -p "   Pilih opsi 1 atau 2 : " domain
    done
fi
if [[ $domain == "1" ]]; then
echo ""
if [ -z "$dnss" ]; then
    until [[ $dnss =~ ^[a-zA-Z0-9_.-]+$ ]]; do
    read -rp "🌐 Masukkan domain Anda: " -e dnss
    done
fi
rm -rf /etc/v2ray
rm -rf /etc/nsdomain
rm -rf /etc/per
mkdir -p /etc/xray
mkdir -p /etc/v2ray
mkdir -p /etc/nsdomain
touch /etc/xray/domain
touch /etc/v2ray/domain
touch /etc/xray/slwdomain
touch /etc/v2ray/scdomain
echo "$dnss" > /root/domain
echo "$dnss" > /root/scdomain
echo "$dnss" > /etc/xray/scdomain
echo "$dnss" > /etc/v2ray/scdomain
echo "$dnss" > /etc/xray/domain
echo "$dnss" > /etc/v2ray/domain
echo "IP=$dnss" > /var/lib/ipvps.conf
echo ""
clear
fi
if [[ $domain == "2" ]]; then
clear
echo -e "${green}┌──────────────────────────────────────────┐${NC}"
echo -e "${green}│  ${bold_white}Contoh: ${gray}free${NC}                            ${green}│${NC}"
echo -e "${green}│  ${bold_white}Akan menjadi: ${gray}free.alhamdulliah.web.id${NC}              ${green}│${NC}"
echo -e "${green}└──────────────────────────────────────────┘${NC}"
echo ""
until [[ $dn1 =~ ^[a-zA-Z0-9_.-]+$ ]]; do
read -rp "🌐 Masukkan subdomain (tanpa spasi): " -e dn1
done
rm -rf /etc/v2ray
rm -rf /etc/nsdomain
rm -rf /etc/per
mkdir -p /etc/xray
mkdir -p /etc/v2ray
mkdir -p /etc/nsdomain
touch /etc/xray/domain
touch /etc/v2ray/domain
touch /etc/xray/slwdomain
touch /etc/v2ray/scdomain
echo "$dn1" > /root/domain
echo "$dn1" > /root/scdomain
echo "$dn1" > /etc/xray/scdomain
echo "$dn1" > /etc/v2ray/scdomain
echo "$dn1" > /etc/xray/domain
echo "$dn1" > /etc/v2ray/domain
echo "IP=$dn1" > /var/lib/ipvps.conf
echo ""
clear
cd
sleep 1
fun_bar 'res1'
clear
rm /root/subdomainx
fi
}

function Pasang() {
    cd
    apt update -y >/dev/null 2>&1
    apt install -y curl wget socat cron git unzip jq net-tools lsof dnsutils >/dev/null 2>&1
    clear
    
    # Pastikan PasswordAuthentication aktif (terutama di cloud DigitalOcean/AWS)
    mkdir -p /etc/ssh/sshd_config.d
    echo "PasswordAuthentication yes" > /etc/ssh/sshd_config.d/01-permit-password.conf
    sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/g' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf 2>/dev/null || true
    systemctl restart ssh 2>/dev/null || systemctl restart sshd 2>/dev/null || true

    start=$(date +%s)
    ln -fs /usr/share/zoneinfo/Asia/Jakarta /etc/localtime
    apt install git curl -y >/dev/null 2>&1
    apt install python3 -y >/dev/null 2>&1
}

function Installasi() {
    # Fungsi resource
    # res2: SSH & Dropbear setup lokal
    res2() {
        SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        if [ -f "${SCRIPT_ROOT}/install/ssh-vpn.sh" ]; then
            bash "${SCRIPT_ROOT}/install/ssh-vpn.sh"
        elif [ -f "./install/ssh-vpn.sh" ]; then
            bash "./install/ssh-vpn.sh"
        else
            wget -qO ssh-vpn.sh https://raw.githubusercontent.com/fahrialimudin/xray/main/ssh/ssh-vpn.sh && chmod +x ssh-vpn.sh && bash ssh-vpn.sh
        fi
        clear
    }

    # res3: Xray installer lokal + XTLS Official Core
    res3() {
        SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        if [ -f "${SCRIPT_ROOT}/install/ins-xray.sh" ]; then
            bash "${SCRIPT_ROOT}/install/ins-xray.sh"
        elif [ -f "./install/ins-xray.sh" ]; then
            bash "./install/ins-xray.sh"
        else
            wget -qO ins-xray.sh https://raw.githubusercontent.com/fahrialimudin/xray/main/xray/ins-xray.sh && chmod +x ins-xray.sh && bash ins-xray.sh
        fi
        clear
    }

    # res4: SSH Websocket setup lokal
    res4() {
        SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        if [ -f "${SCRIPT_ROOT}/install/insshws.sh" ]; then
            bash "${SCRIPT_ROOT}/install/insshws.sh"
        elif [ -f "./install/insshws.sh" ]; then
            bash "./install/insshws.sh"
        else
            wget -qO insshws.sh https://raw.githubusercontent.com/fahrialimudin/xray/main/sshws/insshws.sh && chmod +x insshws.sh && bash insshws.sh
        fi
        clear
    }
    res5() { echo "Skip optional set-br"; }
    res6() { echo "Skip optional ohp"; }
    res7() {
        SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        if [ -f "${SCRIPT_ROOT}/menu/menu.zip" ]; then
            unzip -o -q "${SCRIPT_ROOT}/menu/menu.zip" -d /usr/bin/
        elif [ -f "./menu/menu.zip" ]; then
            unzip -o -q "./menu/menu.zip" -d /usr/bin/
        elif [ -f "/root/menu.zip" ]; then
            unzip -o -q "/root/menu.zip" -d /usr/bin/
        fi
        chmod +x /usr/bin/* 2>/dev/null || true
        clear
    }
    res8() {
        SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        if [ -f "${SCRIPT_ROOT}/slowdns/installsl.sh" ]; then
            bash "${SCRIPT_ROOT}/slowdns/installsl.sh"
        elif [ -f "./slowdns/installsl.sh" ]; then
            bash "./slowdns/installsl.sh"
        fi
        clear
    }
    res9() { echo "UDP Gateway ready"; }
    res10() { echo "Dropbear ready"; }
    res11() {
        SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        [ -f "${SCRIPT_ROOT}/install/setup-autolimit.sh" ] && bash "${SCRIPT_ROOT}/install/setup-autolimit.sh"
        [ -f "${SCRIPT_ROOT}/api-irultun/setup-api.sh" ] && bash "${SCRIPT_ROOT}/api-irultun/setup-api.sh"
    }


    OS_ID=$(grep -w ID /etc/os-release | head -n1 | cut -d= -f2 | tr -d '"')
    OS_NAME=$(grep -w PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '"')

    if [[ "$OS_ID" == "ubuntu" ]]; then
        echo -e "${green}Setup nginx Untuk OS $OS_NAME${NC}"
        setup_install

    elif [[ "$OS_ID" == "debian" || "$OS_ID" == "kali" ]]; then
        echo -e "${green}Setup nginx Untuk OS $OS_NAME${NC}"
        setup_install

    else
        echo -e "OS Anda Tidak Didukung (${yell}$OS_NAME${NC})"
    fi
}

function setup_install() {
    echo -e "${green}┌──────────────────────────────────────────┐${NC}"
    echo -e "${green}│       MEMASANG SSH & OPENVPN             │${NC}"
    echo -e "${green}└──────────────────────────────────────────┘${NC}"
    res2

    echo -e "${green}┌──────────────────────────────────────────┐${NC}"
    echo -e "${green}│           MEMASANG XRAY                  │${NC}"
    echo -e "${green}└──────────────────────────────────────────┘${NC}"
    res3

    echo -e "${green}┌──────────────────────────────────────────┐${NC}"
    echo -e "${green}│        MEMASANG WEBSOCKET SSH            │${NC}"
    echo -e "${green}└──────────────────────────────────────────┘${NC}"
    res4

    echo -e "${green}┌──────────────────────────────────────────┐${NC}"
    echo -e "${green}│        MEMASANG MENU BACKUP              │${NC}"
    echo -e "${green}└──────────────────────────────────────────┘${NC}"
    res5

    echo -e "${green}┌──────────────────────────────────────────┐${NC}"
    echo -e "${green}│           MEMASANG OHP                   │${NC}"
    echo -e "${green}└──────────────────────────────────────────┘${NC}"
    res6

    echo -e "${green}┌──────────────────────────────────────────┐${NC}"
    echo -e "${green}│           MENGUNDUH MENU EKSTRA          │${NC}"
    echo -e "${green}└──────────────────────────────────────────┘${NC}"
    res7

    echo -e "${green}┌──────────────────────────────────────────┐${NC}"
    echo -e "${green}│           MENGUNDUH SYSTEM               │${NC}"
    echo -e "${green}└──────────────────────────────────────────┘${NC}"
    res8

    echo -e "${green}┌──────────────────────────────────────────┐${NC}"
    echo -e "${green}│           MENGUNDUH UDP CUSTOM           │${NC}"
    echo -e "${green}└──────────────────────────────────────────┘${NC}"
    res9

    echo -e "${green}┌──────────────────────────────────────────┐${NC}"
    echo -e "${green}│           MENGUNDUH DROPBEAR-2019        │${NC}"
    echo -e "${green}└──────────────────────────────────────────┘${NC}"
    res10

    echo -e "${green}┌──────────────────────────────────────────┐${NC}"
    echo -e "${green}│           MENGUNDUH ARI-API              │${NC}"
    echo -e "${green}└──────────────────────────────────────────┘${NC}"
    res11
}

function iinfo() {
    domain=$(cat /etc/xray/domain 2>/dev/null || echo "127.0.0.1")
    ISP=$(cat /etc/xray/isp 2>/dev/null || echo "Unknown ISP")
    CITY=$(cat /etc/xray/city 2>/dev/null || echo "Unknown City")
    MYIP=$(curl -sS ipv4.icanhazip.com 2>/dev/null || echo "127.0.0.1")
    AUTH_TOKEN=$(cat /etc/irultun_auth 2>/dev/null || echo "irultunIRULTUN2026")

    echo -e "${green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${bold_white}        DATA KONEKSI IRULTUN BOTWEB        ${NC}"
    echo -e "${green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e " Host Domain : ${domain}"
    echo -e " IP Server   : ${MYIP}"
    echo -e " Lokasi/ISP  : ${CITY} (${ISP})"
    echo -e " Auth Key    : ${yell}${AUTH_TOKEN}${NC}"
    echo -e " API URL     : http://${domain}/vps/ (Port 5889)"
    echo -e " Auto-Limit  : 15-Menit Lock & Auto-Unlock Aktif"
    echo -e "${green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ==========================================
# SETUP AWAL
# ==========================================
cd
if [ "${EUID}" -ne 0 ]; then
    echo "Anda perlu menjalankan script ini sebagai root"
    exit 1
fi

if [ "$(systemd-detect-virt)" == "openvz" ]; then
    echo "OpenVZ tidak didukung"
    exit 1
fi

localip=$(hostname -I | cut -d\  -f1)
hst=( `hostname` )
dart=$(cat /etc/hosts | grep -w `hostname` | awk '{print $2}')

if [[ "$hst" != "$dart" ]]; then
    echo "$localip $(hostname)" >> /etc/hosts
fi

mkdir -p /etc/xray
mkdir -p /var/lib/ >/dev/null 2>&1
echo "IP=" >> /var/lib/ipvps.conf

clear
name="ARI STORE"
echo "ARI STORE" > /etc/xray/username
echo ""
clear
author=$name
echo ""
echo ""

# ==========================================
# OPTIMISASI SYSTEM
# ==========================================
NEW_FILE_MAX=65535
NF_CONNTRACK_MAX="net.netfilter.nf_conntrack_max=262144"
NF_CONNTRACK_TIMEOUT="net.netfilter.nf_conntrack_tcp_timeout_time_wait=30"
SYSCTL_CONF="/etc/sysctl.conf"

CURRENT_FILE_MAX=$(grep "^fs.file-max" "$SYSCTL_CONF" | awk '{print $3}' 2>/dev/null)

if [ "$CURRENT_FILE_MAX" != "$NEW_FILE_MAX" ]; then
    if grep -q "^fs.file-max" "$SYSCTL_CONF"; then
        sed -i "s/^fs.file-max.*/fs.file-max = $NEW_FILE_MAX/" "$SYSCTL_CONF" >/dev/null 2>&1
    else
        echo "fs.file-max = $NEW_FILE_MAX" >> "$SYSCTL_CONF" 2>/dev/null
    fi
fi

if ! grep -q "^net.netfilter.nf_conntrack_max" "$SYSCTL_CONF"; then
    echo "$NF_CONNTRACK_MAX" >> "$SYSCTL_CONF" 2>/dev/null
fi

if ! grep -q "^net.netfilter.nf_conntrack_tcp_timeout_time_wait" "$SYSCTL_CONF"; then
    echo "$NF_CONNTRACK_TIMEOUT" >> "$SYSCTL_CONF" 2>/dev/null
fi

sysctl -p >/dev/null 2>&1

# ==========================================
# EKSEKUSI UTAMA
# ==========================================
CEKIP
Installasi

# ==========================================
# SETUP DNS
# ==========================================
sudo systemctl disable systemd-resolved
sudo systemctl stop systemd-resolved
sudo rm -rf /etc/resolv.config
echo -e "nameserver 8.8.8.8\nnameserver 8.8.4.4" | sudo tee /etc/resolv.conf
sudo chattr +i /etc/resolv.conf
sudo systemctl start systemd-resolved
sudo systemctl enable systemd-resolved

# ==========================================
# SETUP FINAL
# ==========================================
cat> /root/.profile << END
if [ "$BASH" ]; then
if [ -f ~/.bashrc ]; then
. ~/.bashrc
fi
fi
mesg n || true
clear
welcome
END

chmod 644 /root/.profile

if [ -f "/root/log-install.txt" ]; then
    rm /root/log-install.txt > /dev/null 2>&1
fi

if [ -f "/etc/afak.conf" ]; then
    rm /etc/afak.conf > /dev/null 2>&1
fi

history -c
serverV=$( curl -sS ${REPO}versi  )
echo $serverV > /opt/.ver

cd
curl -sS ifconfig.me > /etc/myipvps
curl -s ipinfo.io/city?token=75082b4831f909 >> /etc/xray/city
curl -s ipinfo.io/org?token=75082b4831f909  | cut -d " " -f 2-10 >> /etc/xray/isp
vnstat --iflist
ip -o -4 route show to default
vnstat -tr 1
vnstat -tr 1 -i $(ip -o -4 route show to default | awk '{print $5; exit}')

# Membersihkan file
rm /root/tools.sh >/dev/null 2>&1
rm /root/setup.sh >/dev/null 2>&1
rm /root/pointing.sh >/dev/null 2>&1
rm /root/ssh-vpn.sh >/dev/null 2>&1
rm /root/ins-xray.sh >/dev/null 2>&1
rm /root/insshws.sh >/dev/null 2>&1
rm /root/set-br.sh >/dev/null 2>&1
rm /root/ohp.sh >/dev/null 2>&1
rm /root/update.sh >/dev/null 2>&1
rm /root/installsl.sh >/dev/null 2>&1
rm /root/udp-custom.sh >/dev/null 2>&1

secs_to_human "$(($(date +%s) - ${start}))" | tee -a log-install.txt
sleep 3

echo ""
cd
iinfo

echo -e "${green}┌────────────────────────────────────────────┐${NC}"
echo -e "${green}│${bold_white}          ✅ INSTALLASI SELESAI             ${green}│${NC}"
echo -e "${green}└────────────────────────────────────────────┘${NC}"
echo ""
echo -e "Menu akan dibuka..."
sleep 2
/usr/local/sbin/menu