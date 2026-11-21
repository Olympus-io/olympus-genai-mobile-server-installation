# 🌌 Olympus Platform Installation & Setup Guide

**Olympus** is a self-hosted enterprise file management and GenAI platform. This guide takes you from a fresh machine — server, desktop, or laptop — to a fully running system you can use in your browser.

> 📦 You run **one Docker command**, then complete a **9-step browser wizard**.
> ⏱️ Allow **15–30 minutes** end-to-end — most of that is downloading container images on the first run.
> 🧑‍💻 Aimed at IT administrators. You do **not** need to be a developer.

---

## 📋 What You'll Need

### 1. Docker

Docker is the only piece of software you need to install yourself. Pick your OS and follow the official installer:

- 🐧 **Linux** — [Install Docker Engine](https://docs.docker.com/engine/install/)
- 🍎 **macOS** — [Install Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- 🪟 **Windows** — [Install Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/) (WSL 2 backend recommended)

Once installed, make sure Docker is **running** before continuing (Docker Desktop on macOS/Windows shows a whale icon in the menu bar / system tray when active).

### 2. A machine that meets the minimum specs

| Resource       | Minimum     | Recommended                                  |
| -------------- | ----------- | -------------------------------------------- |
| **Disk Space** | 30 GB free  | 50+ GB (more if you'll manage lots of files) |
| **RAM**        | 16 GB       | 32 GB                                        |
| **vCPU**       | 4 cores     | 8 cores                                      |

> The 30 GB minimum covers Docker images (~18 GB across ~35 containers), databases at rest, and basic operating headroom. Add disk space for the files you'll manage — see the storage planner below.

<details>
<summary><strong>📊 Storage planner — how much disk do I actually need?</strong></summary>

The platform processes files through an AI pipeline: each file is split into text chunks, embedded as vectors (stored in **Milvus**), and indexed for full-text search (stored in **OpenSearch**). File/folder metadata and permissions are stored in **PostgreSQL**. The actual files live on NFS-mounted host directories.

#### How storage scales

| Component             | What it stores                                                       | Storage driver                         |
| --------------------- | -------------------------------------------------------------------- | -------------------------------------- |
| **NFS (host disk)**   | Original files as-is                                                 | Raw file size                          |
| **Milvus**            | One vector embedding per chunk (~4–6 KB depending on model)          | Number of chunks × vector dimension    |
| **OpenSearch**        | Chunk text + metadata per chunk (~5–8 KB each)                       | Number of chunks × chunk text size     |
| **PostgreSQL**        | File/directory metadata, permissions, ACLs, sharing (~1 KB per file) | Number of files + directories          |
| **Redis**             | Sessions, cache, pub/sub                                             | ~100–200 MB (mostly constant)          |
| **RabbitMQ**          | Job queues (transient)                                               | ~100–200 MB (mostly constant)          |

#### Example scenarios

The estimates below assume a **1024-dimension embedding model** (e.g., Ollama `mxbai-embed-large`). OpenAI's 1536-dim model increases Milvus storage by ~50%.

##### 📁 Small — Laptop / Home Server (~5,000 files, ~15 GB raw)

| File Type      | Count | Avg Size | Chunks Generated |
| -------------- | ----- | -------- | ---------------- |
| PDFs           | 500   | 5 MB     | ~65,000          |
| Images         | 3,000 | 2 MB     | ~3,000           |
| Word/PPT docs  | 500   | 4 MB     | ~50,000          |
| Spreadsheets   | 500   | 2 MB     | ~1,000           |
| Text/HTML/CSV  | 500   | 1 MB     | ~5,000           |
| **Total**      | **5,000** | **~15 GB** | **~124,000 chunks** |

| Service                          | Estimated Storage |
| -------------------------------- | ----------------- |
| NFS (raw files on host)          | 15 GB             |
| Milvus (vectors + index)         | ~800 MB           |
| OpenSearch (text chunks + index) | ~1.3 GB           |
| PostgreSQL (metadata)            | ~100 MB           |
| **Additional storage needed**    | **~18 GB**        |
| **Total with base (30 GB)**      | **~48 GB**        |

##### 📁 Medium — Team / Department (~50,000 files, ~500 GB raw)

| File Type      | Count  | Avg Size | Chunks Generated |
| -------------- | ------ | -------- | ---------------- |
| PDFs           | 10,000 | 5 MB     | ~1,300,000       |
| Images         | 20,000 | 2 MB     | ~20,000          |
| Word/PPT docs  | 10,000 | 4 MB     | ~1,000,000       |
| Spreadsheets   | 5,000  | 2 MB     | ~10,000          |
| Text/HTML/CSV  | 5,000  | 1 MB     | ~45,000          |
| **Total**      | **50,000** | **~500 GB** | **~2.4M chunks** |

| Service                          | Estimated Storage |
| -------------------------------- | ----------------- |
| NFS (raw files on host)          | 500 GB            |
| Milvus (vectors + index)         | ~15 GB            |
| OpenSearch (text chunks + index) | ~25 GB            |
| PostgreSQL (metadata)            | ~1 GB             |
| **Additional storage needed**    | **~540 GB**       |
| **Total with base (30 GB)**      | **~570 GB**       |

##### 📁 Large — Enterprise (~100,000 files, ~1 TB raw)

| File Type      | Count  | Avg Size | Chunks Generated |
| -------------- | ------ | -------- | ---------------- |
| PDFs           | 20,000 | 5 MB     | ~2,600,000       |
| Images         | 40,000 | 2 MB     | ~40,000          |
| Word/PPT docs  | 20,000 | 4 MB     | ~2,000,000       |
| Spreadsheets   | 10,000 | 2 MB     | ~20,000          |
| Text/HTML/CSV  | 10,000 | 1 MB     | ~90,000          |
| **Total**      | **100,000** | **~1 TB** | **~4.75M chunks** |

| Service                          | Estimated Storage |
| -------------------------------- | ----------------- |
| NFS (raw files on host)          | 1 TB              |
| Milvus (vectors + index)         | ~30 GB            |
| OpenSearch (text chunks + index) | ~50 GB            |
| PostgreSQL (metadata)            | ~2 GB             |
| **Additional storage needed**    | **~1.08 TB**      |
| **Total with base (30 GB)**      | **~1.1 TB**       |

#### How chunks are calculated

| File Type                              | Chunk Size    | Overlap | Typical Chunks per File |
| -------------------------------------- | ------------- | ------- | ----------------------- |
| PDF (5 MB, ~300K chars)                | 2,500 chars   | 250     | ~130                    |
| Word doc (3 MB, ~200K chars)           | 2,500 chars   | 250     | ~90                     |
| PowerPoint (5 MB, ~250K chars)         | 2,500 chars   | 250     | ~110                    |
| Image (OCR/description ~1K chars)      | 2,500 chars   | 250     | ~1                      |
| CSV/Excel (tabular data)               | 100,000 chars | 0       | ~1–2                    |
| Text/HTML (1 MB, ~20K chars)           | 2,500 chars   | 250     | ~9                      |

> 💡 **Tip:** GenAI features (embedding & search) can be enabled/disabled per mount point. If you don't need AI features on a mount, disable GenAI to skip Milvus/OpenSearch storage for those files entirely.

</details>

### 3. (Production only) A domain with DNS records

For production deployments, point the following subdomains to your server's public IP **before installation**:

- `mobile.yourdomain.com`
- `mobile-api.yourdomain.com`
- `mcp.yourdomain.com`
- `grafana.yourdomain.com`

You can verify a record is live with `nslookup mobile.yourdomain.com` (Windows / macOS / Linux all support this command).

> 🏠 Doing a **Local Machine** or **Private Network** install? You don't need public DNS. The wizard suggests the name `olympus.internal` (a suffix reserved for private networks) and shows the hosts-file line or the router / Pi-hole records to add. Installing on a small server that other devices will use (a Jetson, NUC or mini PC)? Choose **Private Network**.

### 4. (Optional) NVIDIA GPU for local AI models

If your machine has an **NVIDIA GPU** and you want to use local AI models (Ollama, Stable Diffusion), Docker needs the **NVIDIA Container Toolkit** to access the GPU. The Quick Start's [Step 1](#step-1-gpu-setup-skip-if-no-gpu) auto-detects your GPU and installs the toolkit if needed.

> ✅ **No GPU?** No problem — the platform runs fully without one. You can connect cloud AI providers (OpenAI, Gemini, Claude) instead, which is what most installations use.

---

## ✅ Before You Start — 30-Second Pre-Flight Check

Run the snippet for your OS and look for three ✅ marks. Each ❌ tells you exactly what to fix before installing.

<details>
<summary><strong>🐧 Linux / 🍎 macOS pre-flight</strong></summary>

```bash
docker info >/dev/null 2>&1 \
  && echo "✅ Docker is running" \
  || echo "❌ Docker is not running — start Docker / Docker Desktop and re-run this check"

df -BG / | awk 'NR==2 { gsub("G","",$4); if ($4+0 >= 30) print "✅ "$4" GB free on /"; else print "❌ Only "$4" GB free on / — need 30 GB+" }'

(lsof -i :8888 >/dev/null 2>&1 \
  && echo "❌ Port 8888 is in use — see Troubleshooting below" \
  || echo "✅ Port 8888 is free")
```

</details>

<details>
<summary><strong>🪟 Windows (PowerShell) pre-flight</strong></summary>

> 💡 Each line below is one complete PowerShell statement so the snippet works whether you paste the whole block or one line at a time.

```powershell
if (docker info 2>$null) { Write-Host "✅ Docker is running" -ForegroundColor Green } else { Write-Host "❌ Docker is not running — start Docker Desktop and re-run this check" -ForegroundColor Red }

$free = [math]::Round((Get-PSDrive C).Free / 1GB); if ($free -ge 30) { Write-Host ("✅ {0} GB free on C:" -f $free) -ForegroundColor Green } else { Write-Host ("❌ Only {0} GB free on C: — need 30 GB+" -f $free) -ForegroundColor Red }

if (Get-NetTCPConnection -LocalPort 8888 -ErrorAction SilentlyContinue) { Write-Host "❌ Port 8888 is in use — see Troubleshooting below" -ForegroundColor Red } else { Write-Host "✅ Port 8888 is free" -ForegroundColor Green }
```

</details>

### Got a ❌? Fix it here

- **Docker is not running** → start Docker Desktop, or `sudo systemctl start docker` on Linux, then re-run the check.
- **Not enough disk space** → see [what you'll need](#-what-youll-need) for the real requirements.
- **Port 8888 is in use** → see **"❌ Port 8888 is already in use"** under [Troubleshooting](#-troubleshooting). Most often this is **your own previous Olympus installer still running**, not another application. That section shows you how to tell which, then covers reopening the wizard you already have, restarting everything without reinstalling, or wiping for a clean fresh install.

---

## 🚀 Install

### Step 1: Let Docker use your NVIDIA GPU (skip if no GPU)

> ✅ **No NVIDIA GPU?** Skip straight to [Step 2](#step-2-install-olympus). The platform works fully without a GPU, using cloud AI providers or an Ollama server on your network.

There is no special installer command for a GPU: the installer finds the GPU by itself (it test-runs a container on it). Docker only has to be able to give the GPU to containers, so that local AI models (Ollama, Stable Diffusion) can use it:

- 🟩 **NVIDIA Jetson (JetPack 6):** already done by JetPack, skip this step. The installer runs Ollama on the Jetson's GPU and suggests small models (the GPU shares the board's memory with Olympus). Stable Diffusion is not available on ARM boards.
- 🐧 **Linux PC:** run the Linux one-liner below. It installs the NVIDIA Container Toolkit if it is missing and checks that Docker can use the GPU.
- 🪟 **Windows:** Docker Desktop (WSL 2 engine) with a current NVIDIA driver already can. The Windows check below confirms it.
- 🍎 **macOS:** Docker Desktop has no NVIDIA GPU support. Use cloud AI providers or an Ollama server on your network.

<details>
<summary><strong>🐧 Linux — GPU detect & install</strong></summary>

```bash
if nvidia-smi >/dev/null 2>&1; then
  echo "✅ GPU detected: $(nvidia-smi --query-gpu=name --format=csv,noheader | head -1)"
  if docker info 2>/dev/null | grep -qi nvidia; then
    echo "✅ NVIDIA Container Toolkit already configured"
  else
    echo "⚙️ Installing NVIDIA Container Toolkit..."
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg && \
    curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
      sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
      sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list && \
    sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit && \
    sudo nvidia-ctk runtime configure --runtime=docker && \
    sudo systemctl restart docker && \
    echo "✅ Toolkit installed. Verifying..." && \
    docker run --rm --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi && \
    echo "✅ Docker GPU access confirmed!"
  fi
else
  echo "ℹ️ No NVIDIA GPU detected — skipping GPU setup (this is fine)"
fi
```

</details>

<details>
<summary><strong>🪟 Windows (PowerShell) — GPU check</strong></summary>

```powershell
if (-not (Get-Command nvidia-smi -ErrorAction SilentlyContinue)) { Write-Host "ℹ️  No NVIDIA GPU detected — skipping (this is fine)" -ForegroundColor Cyan } else { docker run --rm --gpus all ubuntu:24.04 nvidia-smi -L; if ($LASTEXITCODE -eq 0) { Write-Host "✅ Docker GPU access confirmed!" -ForegroundColor Green } else { Write-Host "⚠️  GPU found but Docker can't use it. Update the NVIDIA driver and Docker Desktop, check Docker Desktop uses the WSL 2 engine (Settings → General), restart Docker Desktop and re-run this check." -ForegroundColor Yellow } }
```

</details>

### Step 2: Install Olympus

Pick the section for your OS, then copy the command into your terminal. **The same command works with or without a GPU:** the installer finds an NVIDIA GPU by itself (Linux, NVIDIA Jetson, and Windows with Docker Desktop) once Docker can use it (Step 1). An installer started the older way, with `--gpus all`, keeps working too.

#### 🐧 Linux / 🍎 macOS

```bash
mkdir -p "$HOME/olympus/app" "$HOME/olympus/data" && \
docker rm -f olympus-setup >/dev/null 2>&1 || true && \
docker pull olympusmobile/olympus-master-setup:latest && \
docker run -d \
  --name olympus-setup \
  -p 8888:8888 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$HOME/olympus/app":"$HOME/olympus/app" \
  -v "$HOME/olympus/data":"$HOME/olympus/data" \
  -e HOST_PROJECT_ROOT="$HOME/olympus/app" \
  -e DOCKER_USERNAME="olympussupport" \
  -e DOCKER_TOKEN="dckr_pat_nnZK2QRyooOHm944bKzRTKo12-w" \
  olympusmobile/olympus-master-setup:latest >/dev/null && \
docker logs -f olympus-setup
```

#### 🪟 Windows (PowerShell)

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\olympus\app", "$env:USERPROFILE\olympus\data" | Out-Null; `
docker rm -f olympus-setup *> $null; `
docker pull olympusmobile/olympus-master-setup:latest; `
docker run -d `
  --name olympus-setup `
  -p 8888:8888 `
  -v /var/run/docker.sock:/var/run/docker.sock `
  -v "${env:USERPROFILE}\olympus\app:/olympus/app" `
  -v "${env:USERPROFILE}\olympus\data:/olympus/data" `
  -e HOST_PROJECT_ROOT="/olympus/app" `
  -e DOCKER_USERNAME="olympussupport" `
  -e DOCKER_TOKEN="dckr_pat_nnZK2QRyooOHm944bKzRTKo12-w" `
  olympusmobile/olympus-master-setup:latest > $null; `
docker logs -f olympus-setup
```

#### 🪟 Windows (Command Prompt)

```cmd
if not exist "%USERPROFILE%\olympus\app" mkdir "%USERPROFILE%\olympus\app"
if not exist "%USERPROFILE%\olympus\data" mkdir "%USERPROFILE%\olympus\data"
docker rm -f olympus-setup >nul 2>&1
docker pull olympusmobile/olympus-master-setup:latest && ^
docker run -d ^
  --name olympus-setup ^
  -p 8888:8888 ^
  -v /var/run/docker.sock:/var/run/docker.sock ^
  -v "%USERPROFILE%\olympus\app:/olympus/app" ^
  -v "%USERPROFILE%\olympus\data:/olympus/data" ^
  -e HOST_PROJECT_ROOT="/olympus/app" ^
  -e DOCKER_USERNAME="olympussupport" ^
  -e DOCKER_TOKEN="dckr_pat_nnZK2QRyooOHm944bKzRTKo12-w" ^
  olympusmobile/olympus-master-setup:latest >nul && ^
docker logs -f olympus-setup
```

### What you'll see while it runs

After running the command, the terminal will:

1. **Download the setup image** (a few hundred MB — fast).
2. **Start the setup container** in the background, then **stream its log output** to your terminal.
3. Eventually print a line that says the wizard is ready, something like:

   ```
   ✅ Setup wizard ready at http://localhost:8888
   ```

When you see that line, **open `http://localhost:8888` in your browser** (or `http://<your-server-ip>:8888` if you're installing on a remote machine). You can leave the terminal open — it'll keep showing logs you can refer to if something goes wrong.

> 💡 **Stuck on download?** First image pulls can be slow on metered or international connections — the setup image is small, but the full platform downloads later total ~6 GB across 30+ images.

### Air-gapped install (no internet on the server)

Olympus runs with no internet access at all, as long as every image is on the server before you start. **Use the Community edition:** an Enterprise licence must reach the licence server at least once every 7 days, or every user except the super-admin is locked out.

On a machine **with** internet access (same CPU architecture as the server), sign in with the `DOCKER_USERNAME` and `DOCKER_TOKEN` from the install command, then build one archive:

```bash
docker login -u olympussupport
docker pull olympusmobile/olympus-master-setup:latest
docker run --rm --entrypoint sh olympusmobile/olympus-master-setup:latest \
  -c "grep -h 'image:' /app/backend/bundle/compose/*.yml | sed 's/.*image: *//' | sort -u" > olympus-images.txt
echo olympusmobile/olympus-master-setup:latest >> olympus-images.txt
xargs -n1 docker pull --platform linux/amd64 < olympus-images.txt
docker save --platform linux/amd64 -o olympus-images.tar $(cat olympus-images.txt)
```

(Use `linux/arm64` for an ARM server. For the wizard's built-in test shares, add `olympusmobile/test-nfs-server:latest` and `olympusmobile/test-smb-server:latest` to the list.)

On the **air-gapped** server:
1. Run `docker load -i olympus-images.tar`.
2. Run the install command above, **leaving out the `docker pull` line**.
3. In the wizard, pick:
   - **Private Network** with a self-signed or custom certificate;
   - the **Community** edition;
   - **Ollama on your network** for AI;
   - **production** file shares on your own NFS/SMB servers. For an SMB server outside Active Directory, choose `FULL_RW` or `READ_ONLY`, not `AD_ACLS`.

The deploy tries the registry once and then uses the loaded images, which takes about two extra minutes.

**To update:**
1. Load a new archive on the server.
2. Re-run the install command without `docker pull`.
3. Run **App-Updates**.

**Unavailable offline:**
- cloud AI providers;
- Let's Encrypt;
- Telegram;
- voice-note transcription;
- reverse geocoding of photo locations;
- hosted MCP clients (a desktop MCP client on your network works).

---

## 🖥️ Web-Based Setup Wizard

Once you open `http://localhost:8888` (or `http://<server-ip>:8888`), the wizard walks you through 9 short steps:

| Step                        | What you do                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| 1. **Deployment Type**      | Choose **Public Network**, **Private Network** (a server other devices use), or **Local Machine** (this computer only) |
| 2. **Domain Configuration** | Set your domain (`olympus.internal` suggested for Local / Private); the server's network address is detected for you |
| 3. **Security & SSL**       | Pick **Let's Encrypt** (public only), **Self-Signed** (Olympus's own certificate authority), or **Custom** PEM upload |
| 4. **Account Setup**        | Admin username/email/password + PostgreSQL password (Generate buttons available)                 |
| 5. **GenAI Settings**       | Optional — wire up Gemini/OpenAI/Claude API keys, and Ollama (on this GPU host, or a remote Ollama server — the wizard shows what each of its models can do and offers to download an embedding model if it has none) |
| 6. **License**              | **Olympus Core** (free) or **Enterprise** (paid key or 90-day trial)                             |
| 7. **Optional Services**    | MailHog (test email) — genuinely optional extras, safe to skip entirely                          |
| 8. **File Shares**          | Point Olympus at the storage it manages — a real NFS/SMB share, or a self-contained test share   |
| 9. **Final Deployment**     | Summary review, confirm checkbox, click **Deploy & Start Platform** (2–5 minutes)                |

The wizard saves at every step — close the browser any time and reopen `http://localhost:8888` to resume.

> 📖 Each step has a longer walkthrough with options, gotchas, and screenshots on the [Setup Wizard docs page](https://setup.olympus.io/docs/wizard).

---

## ✅ Post-Installation

When deployment completes, the wizard automatically redirects you to your running Olympus platform. You can also reach it directly at the URLs derived from the domain you set in wizard Step 2 (Domain Configuration):

- 🌐 **Main App** — `https://mobile.yourdomain.com`
- 🔌 **API** — `https://mobile-api.yourdomain.com`
- 🤖 **MCP server** — https://mcp.yourdomain.com (Streamable HTTP at /mcp)
- 📊 **Grafana (monitoring)** — `https://grafana.yourdomain.com`

For Local and Private installs, replace `yourdomain.com` with the domain you chose in the wizard (for example `olympus.internal`). The wizard's last page checks that your browser can open Olympus and, if it can't, shows how to fix it.

### 🔐 Self-signed installs: trust Olympus once on each device

A **Local Machine** or **Private Network** install with a self-signed certificate has its **own certificate authority**. Each computer, phone or tablet that opens Olympus installs **one file once** — `olympus-ca.crt` — and every Olympus address (`mobile`, `mobile-api`, `mcp`, `grafana`) is trusted from then on, including after the certificate renews.

On each device, open **`http://<your-server>/trust`** (for example `http://192.168.1.20/trust`, or `http://mobile.olympus.internal/trust`) — on a phone, just scan the **QR code** on the wizard's last page. The page recognises the device, shows its steps first, and has a download button:

| Device | What it takes |
|---|---|
| **Windows** | One PowerShell line (no administrator needed), or double-click → *Install Certificate* → *Trusted Root Certification Authorities* |
| **Mac** | One Terminal line, or double-click → Keychain Access → *Always Trust* |
| **Linux** (Ubuntu, Debian, Fedora, Jetson, Raspberry Pi) | `curl -fsSL http://<your-server>/trust/install-linux.sh \| sudo sh` — covers the system **and** Chrome, Chromium and Firefox |
| **iPhone / iPad** | Safari → download → Settings → install the profile → **General → About → Certificate Trust Settings → switch it on** |
| **Android** | Download → Settings → search **CA certificate** → install the file |
| **Chromebook** | Settings → Security → Manage certificates → Authorities → Import |

The certificate can only vouch for addresses ending in your Olympus domain, so it cannot affect any other website. The page shows its fingerprint so you can compare it with the one the wizard showed.

> 📱 **Phones and tablets can't use a hosts file.** For them to find `mobile.<your-domain>`, add the Olympus names to your router's local DNS or to Pi-hole / AdGuard Home, pointing at the server. The wizard's Domain step shows the exact records.

### Verify all services are healthy

```bash
docker ps
```

You should see ~35 containers, all in the `Up` state. The `STATUS` column may say `(healthy)` for the ones with built-in health checks.

---

## 🆘 Troubleshooting

The most common issues, with one-line fixes you can copy-paste.

<details>
<summary><strong>❌ "Cannot connect to the Docker daemon"</strong></summary>

Docker isn't running. Start it:

- **macOS / Windows:** open the Docker Desktop app and wait for the whale icon to stop animating.
- **Linux:** `sudo systemctl start docker` (and `sudo systemctl enable docker` to start it on boot).

Re-run your install command afterwards.

</details>

<details>
<summary><strong>❌ Port 8888 is already in use</strong></summary>

**Most often this is a previous Olympus installer that is still running**, not another application. Find out which before doing anything — the fix is completely different:

```bash
docker ps -a --filter publish=8888 --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

- **Lists `olympus-setup`** → a previous Olympus install holds the port. Go to **A**.
- **Prints nothing** → another program on your machine holds it. Go to **B**.

---

**A. A previous Olympus install has the port**

Pick the option that matches what you want. **None of these delete downloaded Docker images**, so nothing is re-downloaded afterwards.

**A1 — Just reopen the wizard.** If the container above shows as `Up`, the installer is still running and there is nothing to fix. Open it:

```
http://localhost:8888
```

**A2 — Restart everything, keeping your existing deployment.** Use this after a reboot, or if the wizard became unresponsive. No data is lost:

```bash
# Linux / macOS
docker start olympus-setup
cd ~/olympus/app && docker compose up -d      # only if you already deployed
```

```powershell
# Windows PowerShell
docker start olympus-setup
cd "$env:USERPROFILE\olympus\app"; docker compose up -d
```

**A3 — Wipe everything and do a clean fresh install.**

This frees the port and gives you a clean slate. The full procedure is **"❌ I want to start over from scratch"** further down in [Troubleshooting](#-troubleshooting) — it is kept in one place so the commands cannot drift.

⚠️ It permanently deletes the data Olympus keeps itself (accounts, settings, search index, AI models). It removes only what the Olympus installer created: your files on the file shares, your test-share folders and everything else on this machine are left alone. Docker images are kept, so the reinstall is fast.

---

**B. Another program has the port**

Find out what it is:

```bash
# Linux / macOS
lsof -i :8888
```

```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 8888 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Get-Process -Id $_ }
```

Then either stop that program, **or run the installer on a different host port** — change `-p 8888:8888` to e.g. `-p 9999:8888` in your install command and open `http://localhost:9999` instead.

> Port 8888 belongs to the **installer**, not to the platform. Once deployment finishes you reach Olympus on your own domain over ports 80/443, so using a different installer port has no lasting effect.

</details>

<details>
<summary><strong>❌ "denied: requested access to the resource is denied" when pulling the image</strong></summary>

The install command ships with a read-only Docker Hub credential, so this usually means Docker isn't passing it through. Most often this happens if you have a personal `docker login` that's overriding it. Quick test:

```bash
docker logout
```

Then re-run the install command. If it still fails, double-check that you copy-pasted the command exactly, including the `DOCKER_USERNAME` and `DOCKER_TOKEN` lines.

</details>

<details>
<summary><strong>❌ The first install is very slow / appears stuck</strong></summary>

The full platform is ~6 GB across 30+ container images and is downloaded in parallel after the wizard hits the **Deploy** step. On a 100 Mbps connection this takes ~10 minutes; on slow or metered connections, considerably longer.

You can watch download progress in your original terminal (where `docker logs -f olympus-setup` is still running) — look for `Pulling fs layer`, `Download complete`, etc.

If a single image truly stalls, retry the wizard's **Deploy** step — it picks up where it left off; previously-downloaded layers are reused.

</details>

<details>
<summary><strong>❌ I can't reach <code>http://&lt;server-ip&gt;:8888</code> from another machine</strong></summary>

Your server is reachable on the network but the port is blocked by a firewall.

**Linux (ufw):** `sudo ufw allow 8888/tcp`
**Linux (firewalld):** `sudo firewall-cmd --add-port=8888/tcp --permanent && sudo firewall-cmd --reload`
**Windows:** open Windows Defender Firewall → Inbound Rules → New Rule → TCP → Specific local port 8888 → Allow.
**Cloud VM (AWS / GCP / Azure):** open inbound TCP 8888 in your VM's security group / network firewall rules.

For production, after install completes you'll only need ports **80** and **443** open, not 8888.

</details>

<details>
<summary><strong>❌ The app says "Olympus can't reach its server" (or "Unable to fetch Auth Modes")</strong></summary>

The page loaded, but its call to `https://mobile-api.<your-domain>` failed. On a new **Local** or **Private Network** install this is almost always the certificate: accepting the browser warning for `mobile.<your-domain>` does not cover `mobile-api.<your-domain>`, and that call happens in the background where no warning can be shown.

1. **Install the Olympus certificate on this device** from `http://<your-server>/trust` (see *Self-signed installs* above), then restart the browser.
2. Quick fix for one browser: open `https://mobile-api.<your-domain>` once and accept the warning, then reload the app.
3. Still failing? Check every name resolves: `ping mobile-api.<your-domain>` should answer from the server. Each name needs its own hosts-file entry or DNS record.

</details>

<details>
<summary><strong>❌ The setup container exited / I lost the logs</strong></summary>

Re-attach to the running container's logs:

```bash
docker logs -f olympus-setup
```

If `docker ps -a | grep olympus-setup` shows the container as `Exited`, restart it:

```bash
docker start olympus-setup && docker logs -f olympus-setup
```

If it keeps exiting, capture the full log for support:

```bash
docker logs olympus-setup > olympus-setup.log 2>&1
```

</details>

<details>
<summary><strong>❌ I want to start over from scratch</strong></summary>

> ⚠️ **Warning: this permanently deletes your Olympus installation and the data Olympus keeps itself.** That is user accounts, permissions, shares and comments, settings, chat history, the search index and embeddings, the downloaded AI models (often 5–30 GB) and the install's certificates. There is no undo.
>
> ✅ **It removes only what the Olympus installer created. Nothing else is touched:**
> - **Your files are safe.** Files on your file shares (NAS, NFS, SMB), including everything uploaded through Olympus (uploads are stored on those shares), stay exactly where they are. Olympus mounts the shares inside its own containers, so removing the containers only disconnects them; nothing is deleted from a mount.
> - **Test shares are kept.** `~/olympus/data` and any test-share folder you chose stay on disk. Delete them yourself if you no longer need them.
> - **Nothing else in Docker.** Only containers started from `~/olympus/app`, and volumes and networks with Olympus's own names, are removed. Your other containers, volumes and networks (even a container of your own called `ollama`) and all Docker images stay, so the reinstall is fast.
>
> 🧠 To keep the downloaded AI models, delete `|ollama_data|sd_models` from the volume line before running it.
>
> 🔐 On a self-signed install, each device trusts the new install's certificate once more after the reinstall (the `/trust` page).

Run the block for your OS **in order**.

```bash
# Linux / macOS
# 1. The installer: a standalone container attached to an Olympus network, so it goes first
docker rm -f olympus-setup 2>/dev/null

# 2. Olympus itself, brought down with the same compose files the installer used
cd ~/olympus/app 2>/dev/null && docker compose -f docker-compose.yml \
  $(for f in compose/docker-compose.optional.yml compose/docker-compose.ai-stack.yml \
             compose/docker-compose.enterprise.yml compose/docker-compose.monitoring.yml; do
      [ -f "$f" ] && echo "-f $f"; done) down -v
cd ~

# 3. Leftovers: only containers started from ~/olympus/app or by the installer, and only
#    volumes and networks with Olympus's own names. Nothing else on this machine matches.
docker ps -aq --filter "label=com.docker.compose.project.working_dir=$HOME/olympus/app" | xargs -r docker rm -f
docker ps -aq --filter label=olympus.setup.helper | xargs -r docker rm -f
docker volume ls -q --filter label=com.docker.compose.project=app \
  | grep -E '^app_(postgres_data|redis_data|rabbitmq_data|opensearch-data|milvus_v3_data|milvus_data|etcd_data|minio_data|envoy_logs|portainer-data|grafana_data|loki_data|ollama_data|sd_models)$' \
  | xargs -r docker volume rm -f
docker network ls --format '{{.Name}}' --filter label=com.docker.compose.project=app \
  | grep -E '^app_(gateway-public|mobile-backend|genai-backend|mcp-backend|ai-stack|portainer-agent)$' \
  | xargs -r docker network rm

# 4. The configuration the installer generated. On Linux it is written as root, so this
#    needs sudo (harmless on macOS). ~/olympus/data and test-share folders are NOT deleted.
sudo rm -rf ~/olympus/app
```

```powershell
# Windows PowerShell
# 1. The installer: a standalone container attached to an Olympus network, so it goes first
docker rm -f olympus-setup 2>$null

# 2. Olympus itself, brought down with the same compose files the installer used
if (Test-Path "$env:USERPROFILE\olympus\app") {
  cd "$env:USERPROFILE\olympus\app"
  $files = @("-f", "docker-compose.yml")
  foreach ($f in "compose/docker-compose.optional.yml", "compose/docker-compose.ai-stack.yml", "compose/docker-compose.enterprise.yml", "compose/docker-compose.monitoring.yml") { if (Test-Path $f) { $files += @("-f", $f) } }
  docker compose @files down -v
  cd $env:USERPROFILE
}

# 3. Leftovers: only containers started from olympus\app or by the installer, and only
#    volumes and networks with Olympus's own names. Nothing else on this machine matches.
docker ps -aq --filter label=com.docker.compose.project=app | Where-Object { ((docker inspect $_ --format '{{json .Config.Labels}}' | ConvertFrom-Json).'com.docker.compose.project.working_dir') -match 'olympus[\\/]app$' } | ForEach-Object { docker rm -f $_ }
docker ps -aq --filter label=olympus.setup.helper | ForEach-Object { docker rm -f $_ }
docker volume ls -q --filter label=com.docker.compose.project=app | Where-Object { $_ -match '^app_(postgres_data|redis_data|rabbitmq_data|opensearch-data|milvus_v3_data|milvus_data|etcd_data|minio_data|envoy_logs|portainer-data|grafana_data|loki_data|ollama_data|sd_models)$' } | ForEach-Object { docker volume rm -f $_ }
docker network ls --format '{{.Name}}' --filter label=com.docker.compose.project=app | Where-Object { $_ -match '^app_(gateway-public|mobile-backend|genai-backend|mcp-backend|ai-stack|portainer-agent)$' } | ForEach-Object { docker network rm $_ }

# 4. The configuration the installer generated. olympus\data and test-share folders are NOT deleted.
Remove-Item -Recurse -Force "$env:USERPROFILE\olympus\app" -ErrorAction SilentlyContinue
```

> **Already deleted the folder by hand?** Run steps 1 and 3 anyway. Olympus's data lives in Docker **volumes**, not in the folder, and a leftover Postgres volume is reused by the next install, which then skips `init.sql` and comes up with no admin account.

Then re-run the Step 2 install command. To remove Olympus for good instead, see [🧹 Uninstall Olympus completely](#-uninstall-olympus-completely) below.

</details>

---

## 🧹 Uninstall Olympus completely

Steps 1–3 run on the **server**; step 4 runs on each **computer, phone or tablet** that used Olympus. To reinstall instead, step 1 alone is enough ("I want to start over from scratch" in [Troubleshooting](#-troubleshooting)).

> ⚠️ **Step 1 permanently deletes the data Olympus keeps itself:** user accounts, permissions, shares and comments, settings, chat history, the search index and embeddings, the downloaded AI models and the install's certificates. There is no undo.
>
> ✅ **Never removed:** files on your file shares (NAS, NFS, SMB), including everything uploaded through Olympus; your other Docker containers, volumes, networks and images; Docker itself and the NVIDIA Container Toolkit.

### 1. Remove Olympus from the server

Run the commands in **"❌ I want to start over from scratch"** in [Troubleshooting](#-troubleshooting) (its steps 1–4), without re-running the install command afterwards.

### 2. Remove the Docker images (roughly 20–25 GB)

Olympus's own images (`olympusmobile/…`, including older versions kept after updates). Nothing else uses them:

```bash
# Linux / macOS
docker images --format '{{.Repository}} {{.ID}}' | awk '$1 ~ /^olympusmobile\//{print $2}' | sort -u | xargs -r docker rmi -f
```

```powershell
# Windows PowerShell
docker images --format '{{.Repository}} {{.ID}}' | ForEach-Object { $r, $id = $_ -split ' '; if ($r -like 'olympusmobile/*') { $id } } | Sort-Object -Unique | ForEach-Object { docker rmi -f $_ }
```

The public images Olympus downloaded. Skip this if other projects on this machine use Postgres, Redis, RabbitMQ, OpenSearch, Grafana or Ollama images. Removing one only means that project downloads it again, and Docker refuses to remove an image that any container still uses:

```bash
# Linux / macOS
for i in postgres:16 redis:7-alpine rabbitmq:3.12-management opensearchproject/opensearch:latest \
         milvusdb/milvus:v3.0.6 envoyproxy/envoy:v1.30.1 certbot/certbot:latest \
         ollama/ollama:latest ghcr.io/ai-dock/stable-diffusion-webui:latest-cuda mailhog/mailhog:latest \
         grafana/grafana:latest grafana/loki:latest grafana/promtail:latest prom/prometheus:latest \
         prom/node-exporter:latest oliver006/redis_exporter:latest prometheuscommunity/postgres-exporter:latest \
         prometheuscommunity/elasticsearch-exporter:latest dpage/pgadmin4:latest rediscommander/redis-commander:latest; do
  docker image inspect "$i" >/dev/null 2>&1 && docker rmi "$i"
done
```

```powershell
# Windows PowerShell
"postgres:16", "redis:7-alpine", "rabbitmq:3.12-management", "opensearchproject/opensearch:latest",
"milvusdb/milvus:v3.0.6", "envoyproxy/envoy:v1.30.1", "certbot/certbot:latest",
"ollama/ollama:latest", "ghcr.io/ai-dock/stable-diffusion-webui:latest-cuda", "mailhog/mailhog:latest",
"grafana/grafana:latest", "grafana/loki:latest", "grafana/promtail:latest", "prom/prometheus:latest",
"prom/node-exporter:latest", "oliver006/redis_exporter:latest", "prometheuscommunity/postgres-exporter:latest",
"prometheuscommunity/elasticsearch-exporter:latest", "dpage/pgadmin4:latest", "rediscommander/redis-commander:latest" |
  ForEach-Object { docker image inspect $_ *> $null; if ($LASTEXITCODE -eq 0) { docker rmi $_ } }
```

`docker image prune` then removes the untagged copies (`<none>`) that updates leave behind. It applies to every project on this machine, but only to images no container uses.

### 3. Delete the Olympus folder

After step 1, `~/olympus` holds `data` (a folder the installer was given) and any test-share folder you created inside it, such as `~/olympus/testshare` — the files of your test shares. Look first, because deleting it cannot be undone:

```bash
# Linux / macOS
ls -la ~/olympus ~/olympus/data
sudo rm -rf ~/olympus
```

```powershell
# Windows PowerShell
Get-ChildItem "$env:USERPROFILE\olympus" -Depth 1
Remove-Item -Recurse -Force "$env:USERPROFILE\olympus"
```

If you chose a test-share folder outside `~/olympus`, delete that folder too. Your real file shares are never in these folders.

### 4. Clean up each device

**The trusted certificate (self-signed installs).** Each device that opened `http://<your-server>/trust` trusts **Olympus Local CA - &lt;your-domain&gt;**. It can only vouch for your Olympus domain, so it is harmless to leave. To remove it:

```powershell
# Windows PowerShell (no administrator needed; Windows asks you to confirm: choose Yes)
$domain = "olympus.internal"   # your Olympus domain
Get-ChildItem Cert:\CurrentUser\Root | Where-Object { $_.Subject -like "*CN=Olympus Local CA - $domain*" } | Remove-Item
```

```bash
# Mac (Terminal)
DOMAIN=olympus.internal        # your Olympus domain
sudo security delete-certificate -c "Olympus Local CA - $DOMAIN" /Library/Keychains/System.keychain
```

```bash
# Linux — run as yourself; it asks for sudo for the system store
DOMAIN=olympus.internal        # your Olympus domain
sudo rm -f "/usr/local/share/ca-certificates/olympus-ca-${DOMAIN//./-}.crt" /usr/local/share/ca-certificates/olympus-ca.crt \
           "/etc/pki/ca-trust/source/anchors/olympus-ca-${DOMAIN//./-}.crt" "/etc/pki/trust/anchors/olympus-ca-${DOMAIN//./-}.crt"
if command -v update-ca-trust >/dev/null; then sudo update-ca-trust extract; else sudo update-ca-certificates --fresh; fi
for DB in ~/.pki/nssdb ~/snap/chromium/current/.pki/nssdb ~/.mozilla/firefox/*/ \
          ~/snap/firefox/common/.mozilla/firefox/*/ ~/.var/app/org.mozilla.firefox/.mozilla/firefox/*/; do
  if [ -f "${DB%/}/cert9.db" ] && certutil -d "sql:${DB%/}" -D -n "Olympus Local CA - $DOMAIN" 2>/dev/null; then echo "removed from ${DB%/}"; fi
done
```

Installed another way: **Windows** `certmgr.msc` → Trusted Root Certification Authorities → Certificates → delete it · **Mac** Keychain Access → search Olympus → delete · **Firefox** Settings → Privacy & Security → View Certificates → Authorities → Olympus → Delete · **iPhone / iPad** Settings → General → VPN & Device Management → the Olympus profile → Remove Profile · **Android** Settings → search *User credentials* → Olympus Local CA → Remove · **Chromebook** Settings → Privacy and security → Security → Manage certificates → Authorities → org-Olympus → Delete.

**The hosts-file line (Local Machine and Private Network installs)**, on each computer where you added it. A copy of the old file is kept next to it:

```bash
# Linux / macOS
DOMAIN=olympus.internal        # your Olympus domain
sudo cp /etc/hosts /etc/hosts.before-olympus && grep -vF " mobile.$DOMAIN" /etc/hosts.before-olympus | sudo tee /etc/hosts >/dev/null
grep -n "$DOMAIN" /etc/hosts || echo "No Olympus lines left"
# Mac only: forget the old addresses
if [ "$(uname)" = Darwin ]; then sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder; fi
```

```powershell
# Windows PowerShell — run as administrator
$domain = "olympus.internal"   # your Olympus domain
$hosts = "$env:windir\System32\drivers\etc\hosts"
Copy-Item $hosts "$hosts.before-olympus"
Get-Content "$hosts.before-olympus" | Where-Object { $_ -notlike "* mobile.$domain*" } | Set-Content $hosts -Encoding ascii
ipconfig /flushdns
```

**DNS names.** Delete the `mobile`, `mobile-api`, `mcp` and `grafana` names from your router's local DNS, Pi-hole or AdGuard Home (Private Network), or the four A records at your DNS provider (Public Network).

**Apps connected to Olympus.** Remove the Olympus connector from AI clients connected over MCP; uninstall Olympus if you installed it as an app from the browser; close port 8888 again if you opened it in a firewall (`sudo ufw delete allow 8888/tcp`).

**Check that nothing is left:** `docker ps -a --filter "label=com.docker.compose.project.working_dir=$HOME/olympus/app"` prints only its header line, `docker images | grep olympusmobile` prints nothing, and `ls ~/olympus` reports that the folder does not exist.

---

## 📞 Support

- 📖 **Documentation** — [setup.olympus.io](https://setup.olympus.io)
- ✉️ **Email** — support@olympus.io

When emailing support, include the output of `docker logs olympus-setup` so we can see what happened.
