#!/bin/bash
# =========================================================
# Installer IRULTUN VPS REST API Bridge (Express.js on port 5889)
# =========================================================

echo -e " [INFO] Memasang IRULTUN VPS REST API Bridge..."

# 1. Pastikan Node.js terpasang
if ! command -v node >/dev/null 2>&1; then
    echo -e " [INFO] Memasang Node.js LTS (Node 20)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y nodejs >/dev/null 2>&1 || apt-get install -y nodejs npm >/dev/null 2>&1
fi

# 2. Buat folder aplikasi
API_DIR="/usr/local/irultun-api"
mkdir -p "$API_DIR"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cp "${SCRIPT_DIR}/server.js" "${API_DIR}/server.js"
cp "${SCRIPT_DIR}/package.json" "${API_DIR}/package.json"
[ -d "${SCRIPT_DIR}/docs" ] && cp -r "${SCRIPT_DIR}/docs" "${API_DIR}/docs"

cd "$API_DIR"
npm install --production --silent >/dev/null 2>&1

# 3. Buat / pertahankan AUTH KEY
if [ ! -f /etc/irultun_auth ]; then
    RAND_TOKEN="irultun$(tr -dc 'a-zA-Z0-9' < /dev/urandom | head -c 28)"
    echo "$RAND_TOKEN" > /etc/irultun_auth
    chmod 600 /etc/irultun_auth
fi
AUTH_KEY=$(cat /etc/irultun_auth)

# 4. Buat systemd service
cat > /etc/systemd/system/irultun-api.service << EOF
[Unit]
Description=IRULTUN VPS REST API Bridge
After=network.target xray.service

[Service]
Type=simple
User=root
WorkingDirectory=${API_DIR}
Environment=PORT=5889
Environment=AUTH_KEY=${AUTH_KEY}
ExecStart=/usr/bin/node ${API_DIR}/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable irultun-api >/dev/null 2>&1
systemctl restart irultun-api >/dev/null 2>&1

# 5. Pasang konfigurasi Nginx Reverse Proxy untuk /vps/ dan /ssh
if [ -f /etc/nginx/conf.d/xray.conf ]; then
    # Inject routing /vps/ (API) jika belum ada
    if ! grep -q "location /vps/" /etc/nginx/conf.d/xray.conf; then
        sed -i '/server {/a \
    location /vps/ {\
        proxy_pass http://127.0.0.1:5889/vps/;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
    }' /etc/nginx/conf.d/xray.conf
    fi

    # Inject routing /ssh (SSH-WS) port 80 dan port 443 jika belum ada
    if ! grep -q "location /ssh" /etc/nginx/conf.d/xray.conf; then
        # Tambahkan ke blok server port 80 (ke ws-dropbear 2095)
        sed -i '/listen 80;/a \
    location /ssh {\
        proxy_redirect off;\
        proxy_pass http://127.0.0.1:2095;\
        proxy_http_version 1.1;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $http_host;\
        proxy_connect_timeout 60s;\
        proxy_send_timeout 86400s;\
        proxy_read_timeout 86400s;\
    }' /etc/nginx/conf.d/xray.conf

        # Tambahkan ke blok server port 443 (ke ws-stunnel 700)
        sed -i '/listen 443/a \
    location /ssh {\
        proxy_redirect off;\
        proxy_pass http://127.0.0.1:700;\
        proxy_http_version 1.1;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $http_host;\
        proxy_connect_timeout 60s;\
        proxy_send_timeout 86400s;\
        proxy_read_timeout 86400s;\
    }' /etc/nginx/conf.d/xray.conf
    fi

    nginx -t >/dev/null 2>&1 && systemctl reload nginx >/dev/null 2>&1 || true
elif [ -d /etc/nginx/conf.d ]; then
    cat > /etc/nginx/conf.d/irultun-vps-api.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;
    location /vps/ {
        proxy_pass http://127.0.0.1:5889/vps/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
    nginx -t >/dev/null 2>&1 && systemctl reload nginx >/dev/null 2>&1 || true
fi

echo -e " [OK] IRULTUN REST API Bridge aktif di port 5889."
echo -e " [INFO] Auth Token VPS: ${AUTH_KEY}"
