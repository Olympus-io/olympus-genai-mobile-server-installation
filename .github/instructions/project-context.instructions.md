# Olympus Installation Package — Project Context

---

## What This Repo Is

The **customer-facing installation package** — no source code, just documentation and API references. This is what end-users (system administrators) receive to deploy the Olympus platform.

---

## Contents

| Item | Purpose | Location |
|------|---------|----------|
| **SETUP.md** | End-to-end installation guide | Root |
| **Postman Collection** | Complete API reference (~8,400 lines) | `olympus-file-server/` |
| **SKILL.md** | OpenClaw AI skill definition (34 API operations) | `openclaw/` |

---

## System Requirements (from SETUP.md)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 16 GB | 32 GB |
| CPU | 4 vCPUs | 8 vCPUs |
| Disk | 30 GB | 50+ GB |
| Software | Docker + Docker Compose | — |

### Storage Estimates by Scale

| Scale | Files | Storage |
|-------|-------|---------|
| Small | 5,000 | 48 GB |
| Medium | 50,000 | 570 GB |
| Large | 100,000 | 1.1 TB |

---

## Quick Start (Customer Flow)

```bash
docker run -d --name olympus-setup \
  -p 8888:8888 -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$HOME/olympus/app":"$HOME/olympus/app" \
  -v "$HOME/olympus/data":"$HOME/olympus/data" \
  -e HOST_PROJECT_ROOT="$HOME/olympus/app" \
  olympusmobile/olympus-master-setup:latest
# Open http://<server-ip>:8888 → Complete 8-step wizard
```

---

## API Categories (from SKILL.md)

| Category | Operations |
|----------|-----------|
| Files | Upload, download, move, copy, rename, delete, metadata |
| Directories | Create, list, move, rename, delete, tree |
| Sharing | Share privately, enable public access, revoke |
| Comments | Add, list, delete on files/directories |
| Favorites | Add, remove, list favorites |
| GenAI | Ask questions about files/directories, get summaries |

---

## How This Repo Relates to Others

This is the **distribution package** — it references the setup app (`olympus_master_setup_app`) via Docker Hub image. When updates happen:
1. Update SETUP.md if installation steps change
2. Update Postman collection if APIs change
3. Update SKILL.md if OpenClaw API operations change

---

## Last Updated

- **Date:** 2026-03-19
- **Updated by:** Initial creation from SETUP.md and SKILL.md analysis
- **Changes:** Full project context created
