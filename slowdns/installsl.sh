#!/bin/bash
# =========================================================
# INSTALLER SLOWDNS (DNSTT SERVER)
# =========================================================

echo -e " [INFO] Mempersiapkan modul SlowDNS..."
mkdir -p /etc/slowdns /etc/xray /usr/local/bin

# Unduh dnstt-server binary x86_64
if [ ! -f /usr/local/bin/dnstt-server ]; then
    wget -q -O /usr/local/bin/dnstt-server "https://github.com/gh4rib/dnstt/releases/download/v1.0.0/dnstt-server-linux-amd64" 2>/dev/null || \
    wget -q -O /usr/local/bin/dnstt-server "https://raw.githubusercontent.com/atakhadiviom/DNSTT-SSH-Panel/main/bin/dnstt-server-linux-amd64" 2>/dev/null
    chmod +x /usr/local/bin/dnstt-server 2>/dev/null
fi

# Inisialisasi status default
if [ ! -f /etc/slowdns/status ]; then
    echo "OFF" > /etc/slowdns/status
fi

# Generate key awal jika dnstt-server siap
if [ -x /usr/local/bin/dnstt-server ] && [ ! -f /etc/slowdns/server.key ]; then
    /usr/local/bin/dnstt-server -gen-key -privkey-file /etc/slowdns/server.key -pubkey-file /etc/slowdns/server.pub >/dev/null 2>&1
    chmod 600 /etc/slowdns/server.key 2>/dev/null
    chmod 644 /etc/slowdns/server.pub 2>/dev/null
fi

echo -e " [INFO] Modul SlowDNS berhasil disiapkan. Gunakan menu 'm-slowdns' untuk setting NS Domain & Turn ON."
