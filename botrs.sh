#!/bin/bash
MYIP=$(wget -qO- ipinfo.io/ip 2>/dev/null || echo "127.0.0.1")
echo "IZIN DI TERIMA!!"

#install
cp /media/cybervpn/var.txt /tmp

clear

cp /root/cybervpn/var.txt /tmp

clear

rm -rf cybervpn

clear

apt update && apt upgrade -y
apt install python3 python3-pip -y
apt install sqlite3 -y
cd /media/
rm -rf cybervpn

clear

wget  $(cat /etc/repo2)bot/cybervpn.zip
unzip cybervpn.zip
cd cybervpn
rm var.txt

clear

rm database.db

clear
# Install dependencies
apt update && apt upgrade -y
apt install python3 python3-pip git python3-venv -y

# Set up a virtual environment
cd /usr/bin
# Set up a virtual environment
python3 -m venv /media/cybervpn/venv

# Activate the virtual environment and install dependencies
source /media/cybervpn/venv/bin/activate
pip install telethon
pip install pillow
pip install speedtest-cli
pip3 install aiohttp
pip3 install paramiko
pip install -r /media/cybervpn/requirements.txt
deactivate
#isi data
sldns=$(cat /root/nsdomain)
domain=$(cat /etc/xray/domain)
clear
echo -e ""
echo -e ""
echo "INSTALL BOT CREATE SSH via TELEGRAM"
read -e -p "[*] Input Your Id Telegram :" admin
read -e -p "[*] Input Your bot Telegram :" token
read -e -p "[*] Input username Telegram :" user

cat > /media/cybervpn/var.txt << END
ADMIN="$admin"
BOT_TOKEN="$token"
DOMAIN="$domain"
DNS="$sldns"
PUB="7fbd1f8aa0abfe15a7903e837f78aba39cf61d36f183bd604daa2fe4ef3b7b59"
OWN="$user"
SALDO="100000"
END


clear
echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
echo -e "\e[44;97;1m          ARI TUNNELING          \e[0m"
echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
echo -e ""
echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
echo -e "\e[44;97;1m     CREATE BOT SUCCESFULLY        \e[0m"
echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
echo -e ""
echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
echo -e "\e[96;1m Api Token     : $token"
echo -e "\e[96;1m ID Telegram   : $admin"
echo -e "\e[96;1m Domain vps    : $domain"
echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
echo -e ""
echo -e "\e91;1m Wait in 4 second.....\e[0m"
sleep 4
clear

rm -f /usr/bin/nenen

echo -e '#!/bin/bash\ncd /media/\npython3 -m cybervpn' > /usr/bin/nenen


chmod 777 /usr/bin/nenen

# Create the systemd service
cat > /etc/systemd/system/botrs.service << END
[Unit]
Description=Simple kyt - @kyt
After=network.target

[Service]
WorkingDirectory=/media
ExecStart=/media/cybervpn/venv/bin/python3 -m cybervpn
Restart=always

[Install]
WantedBy=multi-user.target
END

# Start and enable the service
systemctl start botrs
systemctl enable botrs
systemctl restart botrs

# Clean up
cd /root
rm -rf botrs.sh

clear
echo
clear

echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
echo -e "\e[44;97;1m          ARI TUNNELING          \e[0m"
echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
echo -e ""
echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
echo -e "\e[44;97;1m       DOWNLOAD SUCCESFULLY        \e[0m"
echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
echo -e ""
echo -e "\e[96;1m KETIK /menu : .menu : .crot : .gas DI BOT TELEGRAM ANDA \e[0m"
echo -e ""

rm /media/cybervpn.zip


exec bash
