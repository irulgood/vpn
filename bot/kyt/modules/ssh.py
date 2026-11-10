from kyt import *

#LOCK ssh
@bot.on(events.CallbackQuery(data=b'lock-ssh'))
async def lock_ssh(event):
	async def lock_ssh_(event):
		async with bot.conversation(chat) as exp:
			await event.respond("**Username:**")
			exp = exp.wait_event(events.NewMessage(incoming=True, from_users=sender.id))
			exp = (await exp).raw_text
		await event.edit("Processing.")
		await event.edit("Processing..")
		await event.edit("Processing...")
		await event.edit("Processing....")
		time.sleep(1)
		await event.edit("`Processing Crate Premium Account`")
		time.sleep(1)
		await event.edit("`Processing... 0%\n▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 4%\n█▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 8%\n██▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 20%\n█████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(1)
		await event.edit("`Processing... 36%\n█████████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(1)
		await event.edit("`Processing... 52%\n█████████████▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(1)
		await event.edit("`Processing... 84%\n█████████████████████▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 100%\n█████████████████████████ `")
		time.sleep(1)
		await event.edit("`Wait.. Setting up an Account`")
		cmd = f'printf "%s\n" "{exp}" | bot-lock'
		try:
			a = subprocess.check_output(cmd, shell=True).decode("utf-8")
		except:
			await event.respond(f"**User** `{exp}` **Successfully Locked**")
		else:
			msg = f"""**Successfully Locked**"""
			await event.respond(msg)
	chat = event.chat_id
	sender = await event.get_sender()
	a = valid(str(sender.id))
	if a == "true":
		await lock_ssh_(event)
	else:
		await event.answer("Akses Ditolak",alert=True)
#UNLOCK ssh
@bot.on(events.CallbackQuery(data=b'unlock-ssh'))
async def unlock_ssh(event):
	async def unlock_ssh_(event):
		async with bot.conversation(chat) as exp:
			await event.respond("**Username:**")
			exp = exp.wait_event(events.NewMessage(incoming=True, from_users=sender.id))
			exp = (await exp).raw_text
		await event.edit("Processing.")
		await event.edit("Processing..")
		await event.edit("Processing...")
		await event.edit("Processing....")
		time.sleep(1)
		await event.edit("`Processing Crate Premium Account`")
		time.sleep(1)
		await event.edit("`Processing... 0%\n▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 4%\n█▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 8%\n██▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 20%\n█████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(1)
		await event.edit("`Processing... 36%\n█████████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(1)
		await event.edit("`Processing... 52%\n█████████████▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(1)
		await event.edit("`Processing... 84%\n█████████████████████▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 100%\n█████████████████████████ `")
		time.sleep(1)
		await event.edit("`Wait.. Setting up an Account`")
		cmd = f'printf "%s\n" "{exp}" | bot-unlock'
		try:
			a = subprocess.check_output(cmd, shell=True).decode("utf-8")
		except:
			await event.respond(f"**User** `{exp}` **Successfully Unlock**")
		else:
			msg = f"""**Successfully Locked**"""
			await event.respond(msg)
	chat = event.chat_id
	sender = await event.get_sender()
	a = valid(str(sender.id))
	if a == "true":
		await unlock_ssh_(event)
	else:
		await event.answer("Akses Ditolak",alert=True)
#DELETESSH
@bot.on(events.CallbackQuery(data=b'delete-ssh'))
async def delete_ssh(event):
	async def delete_ssh_(event):
		async with bot.conversation(chat) as user:
			await event.respond("**Username To Be Deleted:**")
			user = user.wait_event(events.NewMessage(incoming=True, from_users=sender.id))
			user = (await user).raw_text
			cmd = f'printf "%s\n" "{user}" | bot-del-ssh'
		try:
			a = subprocess.check_output(cmd, shell=True).decode("utf-8")
		except:
			await event.respond(f"**User** `{user}` **Successfully Deleted**")
		else:
			await event.respond(f"**Successfully Deleted** `{user}`")
	chat = event.chat_id
	sender = await event.get_sender()
	a = valid(str(sender.id))
	if a == "true":
		await delete_ssh_(event)
	else:
		await event.answer("Akses Ditolak",alert=True)
#RENEWSSH
@bot.on(events.CallbackQuery(data=b'recov-ssh'))
async def recov_ssh(event):
	async def recov_ssh_(event):
		async with bot.conversation(chat) as user:
			await event.respond("**Username To Be RENEW:**")
			user = user.wait_event(events.NewMessage(incoming=True, from_users=sender.id))
			user = (await user).raw_text
		async with bot.conversation(chat) as pw:
			await event.respond("**Days:**")
			pw = pw.wait_event(events.NewMessage(incoming=True, from_users=sender.id))
			pw = (await pw).raw_text
			cmd = f'printf "%s\n" "{user}" "{pw}" | bot-renew-ssh'
		try:
			a = subprocess.check_output(cmd, shell=True).decode("utf-8")
		except:
			await event.respond(f"`{user}` ** TIDAK DITEMUKAN! **")
		else:
			await event.respond(f"""
```
{a}
```
**RENEW SSH**
**» 🤖@ARI_VPN_STORE**
""",buttons=[[Button.inline("‹ Main Menu ›","menu")]])
	chat = event.chat_id
	sender = await event.get_sender()
	a = valid(str(sender.id))
	if a == "true":
		await recov_ssh_(event)
	else:
		await event.answer("Akses Ditolak",alert=True)
        
#LIMITSSH
@bot.on(events.CallbackQuery(data=b'limit-ssh'))
async def limit_ssh(event):
	async def limit_ssh_(event):
		async with bot.conversation(chat) as user:
			await event.respond("**Username :**")
			user = user.wait_event(events.NewMessage(incoming=True, from_users=sender.id))
			user = (await user).raw_text
		async with bot.conversation(chat) as pw:
			await event.respond("**Limit-IP :**")
			pw = pw.wait_event(events.NewMessage(incoming=True, from_users=sender.id))
			pw = (await pw).raw_text
			cmd = f'printf "%s\n" "{user}" "{pw}" | bot-ganti-ip-ssh'
		try:
			a = subprocess.check_output(cmd, shell=True).decode("utf-8")
		except:
			await event.respond(f"`{user}` ** TIDAK DITEMUKAN! **")
		else:
			await event.respond(f"""
```
{a}
```
**GANTI IP SSH**
**» 🤖@ARI_VPN_STORE**
""",buttons=[[Button.inline("‹ Main Menu ›","menu")]])
	chat = event.chat_id
	sender = await event.get_sender()
	a = valid(str(sender.id))
	if a == "true":
		await limit_ssh_(event)
	else:
		await event.answer("Akses Ditolak",alert=True)

@bot.on(events.CallbackQuery(data=b'create-ssh'))
async def create_ssh(event):
	async def create_ssh_(event):
		async with bot.conversation(chat) as user:
			await event.respond('**Username:**')
			user = user.wait_event(events.NewMessage(incoming=True, from_users=sender.id))
			user = (await user).raw_text
		async with bot.conversation(chat) as pw:
			await event.respond("**Password:**")
			pw = pw.wait_event(events.NewMessage(incoming=True, from_users=sender.id))
			pw = (await pw).raw_text
		async with bot.conversation(chat) as pw1:
			await event.respond("**Limit-ip:**")
			pw1 = pw1.wait_event(events.NewMessage(incoming=True, from_users=sender.id))
			pw1 = (await pw1).raw_text
		async with bot.conversation(chat) as exp:
			await event.respond("**Expaired:**")
			exp = exp.wait_event(events.NewMessage(incoming=True, from_users=sender.id))
			exp = (await exp).raw_text
		await event.edit("Processing.")
		await event.edit("Processing..")
		await event.edit("Processing...")
		await event.edit("Processing....")
		time.sleep(1)
		await event.edit("`Processing Crate Premium Account`")
		time.sleep(1)
		await event.edit("`Processing... 0%\n▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 4%\n█▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 8%\n██▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 20%\n█████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(1)
		await event.edit("`Processing... 36%\n█████████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(1)
		await event.edit("`Processing... 52%\n█████████████▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 84%\n█████████████████████▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 100%\n█████████████████████████ `")
		time.sleep(1)
		await event.edit("`Wait.. Setting up an Account`")
		cmd = f'printf "%s\n" "{user}" "{pw}" "{pw1}" "{exp}" | bot-add-ssh'
		citsy = f" cat /etc/xray/city"
		city = subprocess.check_output(citsy, shell=True).decode("ascii")
		try:
			subprocess.check_output(cmd,shell=True)
		except:
			await event.respond(f"**User** `{user}` **Successfully Created**")
		else:
			today = DT.date.today()
			later = today + DT.timedelta(days=int(exp))
			msg = f"""
**━━━━━━━━━━━━━━━━━**
**🐾🕊️ SSH OVPN ACCOUNT 🕊️🐾**
**━━━━━━━━━━━━━━━━━**
**» Username         :** `{user.strip()}`
**» Password         :** `{pw.strip()}`
**━━━━━━━━━━━━━━━━━**
**» Host             :** `{DOMAIN}`
**» Host Slowdns     :** `{HOST}`
**» Pub Key          :** `{PUB}`
**» Port OpenSSH     :** `443, 80, 22`
**» Port DNS         :** `443, 53 ,22`
**» Port Dropbear    :** `443, 109`
**» Port Dropbear WS :** `443, 109`
**» Port SSH WS      :** `80, 8080, 8081-9999 `
**» Port SSH SSL WS  :** `443`
**» Port SSL/TLS     :** `222-1000`
**» Port OVPN WS SSL :** `443`
**» Port OVPN SSL    :** `443`
**» Port OVPN TCP    :** `443, 1194`
**» Port OVPN UDP    :** `2200`
**» Proxy Squid      :** `3128`
**» BadVPN UDP       :** `7100, 7300, 7300`
**━━━━━━━━━━━━━━━━━**
**» Payload WS       :** `GET / HTTP/1.1[crlf]Host: {DOMAIN}[crlf]Upgrade: websocket[crlf][crlf]`
**━━━━━━━━━━━━━━━━━**
**» OpenVPN WS SSL   :** `https://{DOMAIN}:81/ws-ssl.ovpn`
**» OpenVPN SSL      :** `https://{DOMAIN}:81/ssl.ovpn`
**» OpenVPN TCP      :** `https://{DOMAIN}:81/tcp.ovpn`
**» OpenVPN UDP      :** `https://{DOMAIN}:81/udp.ovpn`
**━━━━━━━━━━━━━━━━━**
**» Save Link Account:** `https://{DOMAIN}:81/ssh-{user.strip()}.txt`
**» Expired Until:** `{later}`
**━━━━━━━━━━━━━━━━━**
**» SSH WS           :** ``{DOMAIN}:80@{user.strip()}:{pw.strip()}``
**» SSH SSL          :** ``{DOMAIN}:443@{user.strip()}:{pw.strip()}``
**» SSH UDP          :** ``{DOMAIN}:1-65535@{user.strip()}:{pw.strip()}``
**━━━━━━━━━━━━━━━━━**
``
◇━━━━━━━━━━━━━━━━━◇
*_PEMBELIAN BERHASIL_*
◇━━━━━━━━━━━━━━━━━◇
-» PRODUK : SSH
-» REGION : {city.strip()}
-» REQ CONFIG : 
-» REQ NAMA : {user.strip()}
-» DEVICE : 2 IP
-» HARGA : 
-» AKTIF : {exp} HARI
-» TGL EXP : {later}
◇━━━━━━━━━━━━━━━━━◇
*_NewbieStore_*
``
"""
			await event.respond(msg)
	chat = event.chat_id
	sender = await event.get_sender()
	a = valid(str(sender.id))
	if a == "true":
		await create_ssh_(event)
	else:
		await event.answer("Akses Ditolak",alert=True)
#RECOSSH
@bot.on(events.CallbackQuery(data=b'reco-ssh'))
async def reco_ssh(event):
	async def reco_ssh_(event):
		async with bot.conversation(chat) as user:
			await event.respond('**Username:**')
			user = user.wait_event(events.NewMessage(incoming=True, from_users=sender.id))
			user = (await user).raw_text
		await event.edit("Processing.")
		await event.edit("Processing..")
		await event.edit("Processing...")
		await event.edit("Processing....")
		time.sleep(1)
		await event.edit("`Processing Crate Premium Account`")
		time.sleep(1)
		await event.edit("`Processing... 0%\n▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 4%\n█▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 8%\n██▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 20%\n█████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(1)
		await event.edit("`Processing... 36%\n█████████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(1)
		await event.edit("`Processing... 52%\n█████████████▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 84%\n█████████████████████▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 100%\n█████████████████████████ `")
		time.sleep(1)
		await event.edit("`Wait.. Setting up an Account`")
		cmd = f'printf "%s\n" "{user}" | bot-user-ssh'
		citsy = f" cat /etc/xray/city"
		city = subprocess.check_output(citsy, shell=True).decode("ascii")
		try:
			subprocess.check_output(cmd,shell=True)
		except:
			await event.respond(f"**User** `{user}` **Successfully Checked**")
	chat = event.chat_id
	sender = await event.get_sender()
	a = valid(str(sender.id))
	if a == "true":
		await reco_ssh_(event)
	else:
		await event.answer("Akses Ditolak",alert=True)

@bot.on(events.CallbackQuery(data=b'show-ssh'))
async def show_ssh(event):
	async def show_ssh_(event):
		cmd = 'bot-member-ssh'.strip()
		x = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, universal_newlines=True)
		print(x)
		z = subprocess.check_output(cmd, shell=True).decode("utf-8")
		await event.respond(f"""
```
{z}
```
**Show All SSH User**
**» 🤖@ARI_VPN_STORE**
""",buttons=[[Button.inline("‹ Main Menu ›","menu")]])
	sender = await event.get_sender()
	a = valid(str(sender.id))
	if a == "true":
		await show_ssh_(event)
	else:
		await event.answer("Access Denied",alert=True)



@bot.on(events.CallbackQuery(data=b'trial-ssh'))
async def trial_ssh(event):
	async def trial_ssh_(event):
		async with bot.conversation(chat) as exp:
			await event.respond("**Minutes:**")
			exp = exp.wait_event(events.NewMessage(incoming=True, from_users=sender.id))
			exp = (await exp).raw_text
		await event.edit("Processing.")
		await event.edit("Processing..")
		await event.edit("Processing...")
		await event.edit("Processing....")
		time.sleep(1)
		await event.edit("`Processing Crate Premium Account`")
		time.sleep(1)
		await event.edit("`Processing... 0%\n▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(1)
		await event.edit("`Processing... 4%\n█▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 8%\n██▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 20%\n█████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(1)
		await event.edit("`Processing... 36%\n█████████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(1)
		await event.edit("`Processing... 52%\n█████████████▒▒▒▒▒▒▒▒▒▒▒▒ `")
		time.sleep(1)
		await event.edit("`Processing... 84%\n█████████████████████▒▒▒▒ `")
		time.sleep(0)
		await event.edit("`Processing... 100%\n█████████████████████████ `")
		time.sleep(1)
		await event.edit("`Wait.. Setting up an Account`")
		cmd = f'printf "%s\n" "{exp}" | bot-trial-ssh'
		try:
			out = subprocess.check_output(cmd,shell=True).decode("utf-8", errors="ignore")
		except Exception as e:
			out = str(getattr(e, 'output', ''))
		u_match = re.search(r"Remark\s*:\s*([^\s\n]+)", out)
		p_match = re.search(r"pasword\s*:\s*([^\s\n]+)", out)
		user = u_match.group(1).strip() if u_match else f"Trial-{random.randint(1000, 9999)}"
		pw = p_match.group(1).strip() if p_match else "1"
		today = DT.date.today()
		later = f"{exp} Menit"
		msg = f"""
**━━━━━━━━━━━━━━━━━**
**🐾🕊️ SSH OVPN ACCOUNT 🕊️🐾**
**━━━━━━━━━━━━━━━━━**
**» Username         :** `{user.strip()}`
**» Password         :** `{pw.strip()}`
**━━━━━━━━━━━━━━━━━**
**» Host             :** `{DOMAIN}`
**» Host Slowdns     :** `{HOST}`
**» Pub Key          :** `{PUB}`
**» Port OpenSSH     :** `443, 80, 22`
**» Port DNS         :** `443, 53 ,22`
**» Port Dropbear    :** `443, 109`
**» Port Dropbear WS :** `443, 109`
**» Port SSH WS      :** `80, 8080, 8081-9999 `
**» Port SSH SSL WS  :** `443`
**» Port SSL/TLS     :** `222-1000`
**» Port OVPN WS SSL :** `443`
**» Port OVPN SSL    :** `443`
**» Port OVPN TCP    :** `443, 1194`
**» Port OVPN UDP    :** `2200`
**» Proxy Squid      :** `3128`
**» BadVPN UDP       :** `7100, 7300, 7300`
**━━━━━━━━━━━━━━━━━**
**» SSH WS           :** ``{DOMAIN}:80@{user.strip()}:{pw.strip()}``
**» SSH SSL          :** ``{DOMAIN}:443@{user.strip()}:{pw.strip()}``
**» SSH UDP          :** ``{DOMAIN}:1-65535@{user.strip()}:{pw.strip()}``
**━━━━━━━━━━━━━━━━━**
**» Payload WS       :** `GET / HTTP/1.1[crlf]Host: {DOMAIN}[crlf]Upgrade: websocket[crlf][crlf]`
**━━━━━━━━━━━━━━━━━**
**» OpenVPN WS SSL   :** `https://{DOMAIN}:81/ws-ssl.ovpn`
**» OpenVPN SSL      :** `https://{DOMAIN}:81/ssl.ovpn`
**» OpenVPN TCP      :** `https://{DOMAIN}:81/tcp.ovpn`
**» OpenVPN UDP      :** `https://{DOMAIN}:81/udp.ovpn`
**━━━━━━━━━━━━━━━━━**
**» Save Link Account:** `https://{DOMAIN}:81/ssh-{user.strip()}.txt`
**» Expired Until:** `{later}`
**» 🤖@ARI_VPN_STORE**
"""
		await event.respond(msg)
	chat = event.chat_id
	sender = await event.get_sender()
	a = valid(str(sender.id))
	if a == "true":
		await trial_ssh_(event)
	else:
		await event.answer("Akses Ditolak",alert=True)
		
@bot.on(events.CallbackQuery(data=b'login-ssh'))
async def login_ssh(event):
	async def login_ssh_(event):
		cmd = 'bot-cek-login-ssh'.strip()
		x = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, universal_newlines=True)
		print(x)
		z = subprocess.check_output(cmd, shell=True).decode("utf-8")
		await event.respond(f"""

{z}

**shows logged in users SSH Ovpn**
**» 🤖@ARI_VPN_STORE**
""",buttons=[[Button.inline("‹ Main Menu ›","menu")]])
	sender = await event.get_sender()
	a = valid(str(sender.id))
	if a == "true":
		await login_ssh_(event)
	else:
		await event.answer("Access Denied",alert=True)


@bot.on(events.CallbackQuery(data=b'ssh'))
async def ssh(event):
	async def ssh_(event):
		inline = [
[Button.inline(" TRIAL SSH ","trial-ssh"),
Button.inline(" CREATE SSH ","create-ssh")],
[Button.inline(" RENEW SSH ","recov-ssh"),
Button.inline(" DETAIL SSH ","reco-ssh")],
[Button.inline(" DELETE SSH ","delete-ssh"),
Button.inline(" CHECK Login SSH ","login-ssh")],
[Button.inline(" LOCK SSH ","lock-ssh"),
Button.inline(" UNLOCK SSH ","unlock-ssh")],
[Button.inline(" SHOW All USER SSH ","show-ssh"),
Button.inline(" GANTI LIMIT IP ","limit-ssh")],
[Button.inline("‹ Main Menu ›","menu")]]
		z = requests.get(f"http://ip-api.com/json/?fields=country,region,city,timezone,isp").json()
		msg = f"""
━━━━━━━━━━━━━━━━━━━━━━━ 
**🐾🕊️ SSH OVPN MANAGER 🕊️🐾**
━━━━━━━━━━━━━━━━━━━━━━━ 
🔰 **» Service:** `SSH OVPN`
🔰 **» Hostname/IP:** `{DOMAIN}`
🔰 **» ISP:** `{z["isp"]}`
🔰 **» Country:** `{z["country"]}`
🤖 **» @ARI_VPN_STORE**
━━━━━━━━━━━━━━━━━━━━━━━ 
"""
		await event.edit(msg,buttons=inline)
	sender = await event.get_sender()
	a = valid(str(sender.id))
	if a == "true":
		await ssh_(event)
	else:
		await event.answer("Access Denied",alert=True)
