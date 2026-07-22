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
| **CouchDB**           | GenAI model configs, chunk settings                                  | ~50–100 MB (mostly constant)           |

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

> 🏠 Doing a **local-only** install (Local Development or Private Network mode)? You can skip DNS entirely — the wizard will let you choose one of those modes.

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

### Step 1: GPU Setup (skip if no GPU)

> ✅ **No NVIDIA GPU?** Skip straight to [Step 2](#step-2-install-olympus). The platform works fully without a GPU.

If your machine has an NVIDIA GPU and you want local AI models (Ollama, Stable Diffusion), run the **one-liner** for your OS. It detects the GPU, installs the NVIDIA Container Toolkit if missing, and verifies Docker can actually use the GPU.

<details>
<summary><strong>🐧 Linux / 🍎 macOS — GPU detect & install</strong></summary>

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
<summary><strong>🪟 Windows (PowerShell) — GPU detect</strong></summary>

```powershell
if (-not (Get-Command nvidia-smi -ErrorAction SilentlyContinue)) { Write-Host "ℹ️  No NVIDIA GPU detected — skipping (this is fine)" -ForegroundColor Cyan } elseif (docker info 2>$null | Select-String -Quiet "nvidia") { Write-Host "✅ GPU detected and NVIDIA Container Toolkit already configured" -ForegroundColor Green } else { Write-Host "⚠️  GPU found but Docker can't access it. Install the NVIDIA Container Toolkit for Windows: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html#installing-on-windows — then restart Docker Desktop and re-run this check." -ForegroundColor Yellow }
```

</details>

### Step 2: Install Olympus

Pick the section for your OS, then copy the command into your terminal. **If Step 1 confirmed GPU access**, use the "With GPU" variant; otherwise use "Without GPU".

#### 🐧 Linux / 🍎 macOS

**Without GPU** (most machines):

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

**With GPU** (only if Step 1 showed "✅ Docker GPU access confirmed"):

```bash
mkdir -p "$HOME/olympus/app" "$HOME/olympus/data" && \
docker rm -f olympus-setup >/dev/null 2>&1 || true && \
docker pull olympusmobile/olympus-master-setup:latest && \
docker run -d \
  --name olympus-setup \
  --gpus all \
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

**Without GPU** (most machines):

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

**With GPU** (only if Step 1 showed "✅ NVIDIA Container Toolkit already configured"):

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\olympus\app", "$env:USERPROFILE\olympus\data" | Out-Null; `
docker rm -f olympus-setup *> $null; `
docker pull olympusmobile/olympus-master-setup:latest; `
docker run -d `
  --gpus all `
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

**Without GPU** (most machines):

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

**With GPU** (only if `docker info | findstr /i nvidia` shows output):

```cmd
if not exist "%USERPROFILE%\olympus\app" mkdir "%USERPROFILE%\olympus\app"
if not exist "%USERPROFILE%\olympus\data" mkdir "%USERPROFILE%\olympus\data"
docker rm -f olympus-setup >nul 2>&1
docker pull olympusmobile/olympus-master-setup:latest && ^
docker run -d ^
  --gpus all ^
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

---

## 🖥️ Web-Based Setup Wizard

Once you open `http://localhost:8888` (or `http://<server-ip>:8888`), the wizard walks you through 9 short steps:

| Step                        | What you do                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| 1. **Deployment Type**      | Choose **Public Network**, **Private Network**, or **Local Machine**                             |
| 2. **Domain Configuration** | Set your primary domain; verify DNS (public/private) or `/etc/hosts` mappings (local)            |
| 3. **Security & SSL**       | Pick **Let's Encrypt** (public only), **Self-Signed**, or **Custom** PEM upload                  |
| 4. **Account Setup**        | Admin username/email/password + PostgreSQL password (Generate buttons available)                 |
| 5. **GenAI Settings**       | Optional — wire up Gemini/OpenAI/Claude API keys, and Ollama/Stable Diffusion if you have a GPU  |
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
- 🤖 **MCP server** — https://mcp.yourdomain.com (SSE at /sse, Streamable HTTP at /mcp)
- 📊 **Grafana (monitoring)** — `https://grafana.yourdomain.com`

For local-only installs, replace `yourdomain.com` with the host you chose in the wizard (often `localhost` or your server's IP).

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

> ⚠️ **This permanently deletes all Olympus data** — uploaded files, user accounts, chat history and embeddings. There is no undo. Docker images are kept, so the reinstall is fast.

```bash
# Linux / macOS
cd ~/olympus/app 2>/dev/null && docker compose down -v --remove-orphans

# Remove anything left over — scoped to Olympus, nothing else on your machine
docker ps -aq       --filter label=com.docker.compose.project=app | xargs -r docker rm -f
docker volume ls -q --filter label=com.docker.compose.project=app | xargs -r docker volume rm -f
docker network ls -q --filter label=com.docker.compose.project=app | xargs -r docker network rm

# The installer and AI containers sit outside the compose project
docker rm -f olympus-setup ollama sd-webui 2>/dev/null

rm -rf ~/olympus
```

```powershell
# Windows PowerShell
cd "$env:USERPROFILE\olympus\app"; docker compose down -v --remove-orphans

docker ps -aq       --filter label=com.docker.compose.project=app | ForEach-Object { docker rm -f $_ }
docker volume ls -q --filter label=com.docker.compose.project=app | ForEach-Object { docker volume rm -f $_ }
docker network ls -q --filter label=com.docker.compose.project=app | ForEach-Object { docker network rm $_ }

docker rm -f olympus-setup ollama sd-webui 2>$null

Remove-Item -Recurse -Force "$env:USERPROFILE\olympus"
```

Then re-run the install command from [Step 2](#step-2-install-olympus).

> **Keeping your downloaded AI models:** the volume sweep also removes `app_ollama_data`, which holds your Ollama models — often 5–30 GB. To keep them, filter that volume out:
> `docker volume ls -q --filter label=com.docker.compose.project=app | grep -v ollama_data | xargs -r docker volume rm -f`
> (PowerShell: `... | Where-Object { $_ -notmatch "ollama_data" } | ForEach-Object { docker volume rm -f $_ }`)

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

Stop everything and remove the data directories. **This deletes all your Olympus configuration and platform data — do this only if you genuinely want to restart from zero.**

```bash
# Linux / macOS
docker rm -f olympus-setup
docker ps -aq --filter "label=com.olympus.managed=true" | xargs -r docker rm -f
rm -rf "$HOME/olympus/app" "$HOME/olympus/data"
```

```powershell
# Windows PowerShell
docker rm -f olympus-setup
docker ps -aq --filter "label=com.olympus.managed=true" | ForEach-Object { docker rm -f $_ }
Remove-Item -Recurse -Force "$env:USERPROFILE\olympus\app", "$env:USERPROFILE\olympus\data"
```

Then re-run the Step 2 install command.

</details>

---

## 📞 Support

- 🐛 **Issues** — [GitLab Issues](https://gitlab.com/olympus-fs/olympus_master_setup_app/-/issues)
- 📖 **Documentation** — [Wiki](https://gitlab.com/olympus-fs/olympus_master_setup_app/-/wikis/home)
- ✉️ **Email** — support@olympus.io

When emailing support, include the output of `docker logs olympus-setup` so we can see what happened.
