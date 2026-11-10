### INSTALL SCRIPT 
<pre><code>apt update -y && apt install -y wget curl && wget -q https://raw.githubusercontent.com/ARIbuncar/v7/main/setup.sh && chmod +x setup.sh && ./setup.sh
</code></pre>

### PERINTAH UPDATE 
<pre><code>wget -q https://raw.githubusercontent.com/ARIbuncar/v7/main/menu/update.sh && chmod +x update.sh && ./update.sh</code></pre>

### TESTED ON OS 
- UBUNTU 20.04 22 24.04 24.10
- DEBIAN 10 11 12


### FITUR TAMBAHAN
- Lakukan Uji Coba dengan memilih Trial Pada Licensi Key
- Tambah Swap 2 GiB
- Pemasangan yang dinamis
- Register IP Dari VPS
- Pointing Domain 
- Xray Core
- Penambahan fail2ban
- Auto block sebagian ads indo by default
- Auto clear log per 10 menit
- Auto deler expired
- User Details Akun
- Lock Xray
- Lock SSH
- Limit IP SSH on
- Limit IP Xray On
- Limit Qouta Xray On

### PORT INFO
```
- TROJAN WS 443
- TROJAN GRPC 443
- SHADOWSOCKS WS 443
- SHADOWSOCKS GRPC 443
- VLESS WS 443
- VLESS GRPC 443
- VLESS NONTLS 80
- VMESS WS 443
- VMESS GRPC 443
- VMESS NONTLS 80
- SSH WS / TLS 443
- SSH NON TLS 80 8880 8080 2080 2082 
- SLOWDNS 5300
```

### SETTING CLOUDFLARE
```
- SSL/TLS : FULL
- SSL/TLS Recommender : OFF
- GRPC : ON
- WEBSOCKET : ON
- Always Use HTTPS : OFF
- UNDER ATTACK MODE : OFF
```