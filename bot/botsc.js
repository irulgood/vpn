const { Telegraf } = require('telegraf');
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const bot = new Telegraf('5802497311:AAGsjehKTqNf4kmF42SMdyk4YlqsxNzoA1Q'); // Ganti dengan token bot Anda

// Daftar ID Telegram yang diizinkan
const allowedUsers = [ID_TELE, ID_TELE]; // Ganti dengan ID Telegram yang diizinkan

bot.start((ctx) => {
    if (!allowedUsers.includes(ctx.from.id)) {
        return ctx.reply('Anda tidak memiliki izin untuk menggunakan bot ini! Silakan hubungi @ARI_VPN_STORE.');
    }

    ctx.reply('');
    ctx.reply('🔮 WELCOME TO BOT AUTOINSTALL XWAN 🔮\n\nSelamat datang User Script XWAN Kirimkan kredensial VPS Anda dalam format berikut:\n`IP:User:Password`\nContoh: `192.168.0.1:root:password123`', { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
    if (!allowedUsers.includes(ctx.from.id)) {
        return ctx.reply('Anda tidak memiliki izin untuk menggunakan bot ini!');
    }

    const [ip, user, password] = ctx.message.text.split(':');

    if (!ip || !user || !password) {
        return ctx.reply('Format kredensial salah! Harap gunakan format:\n`IP:User:Password`\nContoh: `192.168.0.1:root:password123`', { parse_mode: 'Markdown' });
    }

    ctx.reply('🔄 Mencoba untuk terhubung ke VPS...');

    try {
        await ssh.connect({
            host: ip,
            username: user,
            password: password,
        });

        ctx.reply('✅ Berhasil terhubung ke VPS. Menjalankan perintah instalasi...');
        ctx.reply('📋 Eksekusi perintah:\n1. Mengunduh skrip instalasi...\n2. Memberikan izin eksekusi...\n3. Menjalankan skrip instalasi...\n4. Informasi selesai install...\n5. Melakukan reboot...');

        const steps = [
            'wget myrid.my.id/os/setup2.sh',
            'chmod +x setup2.sh',
            './setup2.sh',
            'wget myrid.my.id/os/done.sh', 
            'chmod +x done.sh', 
            './done.sh', 
            'reboot',
        ];

        for (const step of steps) {
            const result = await ssh.execCommand(step);
            if (result.stdout) {
                ctx.reply(`✅ Output perintah \`${step}\`:\n\`\`\`${result.stdout}\`\`\``, { parse_mode: 'Markdown' });
            }
            if (result.stderr) {
                ctx.reply(`⚠️ Error perintah \`${step}\`:\n\`\`\`${result.stderr}\`\`\``, { parse_mode: 'Markdown' });
            }
        }

        ctx.reply('🚀 Semua perintah selesai dijalankan! VPS Anda akan direboot.');
        ssh.dispose();
    } catch (err) {
        ctx.reply(`❌ Gagal terhubung atau menjalankan perintah.\nError: \`${err.message}\``, { parse_mode: 'Markdown' });
    }
});

bot.launch();
