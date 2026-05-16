# Claude Code context — `olympus-genai-mobile-server-installation/` (customer distribution)

The **customer-facing installation package**. No source code — only documentation and API references. This is what end-users (system administrators) receive to deploy the Olympus platform. Sub-repo of `~/coding/` workspace.

## Contents

| Path | Purpose |
|------|---------|
| `SETUP.md` | End-to-end customer installation guide (system requirements, single `docker run` quick start, troubleshooting) |
| `olympus-file-server/*.postman_collection.json` | Complete API reference — ~8,400 lines |
| `openclaw/SKILL.md` | OpenClaw AI skill definition — 34 API operations across 6 categories (Files, Directories, Sharing, Comments, Favorites, GenAI) |

## Customer install one-liner — keep consistent with `olympus_master_setup_app/`

```bash
docker run -d --name olympus-setup \
  -p 8888:8888 -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$HOME/olympus/app":"$HOME/olympus/app" \
  -v "$HOME/olympus/data":"$HOME/olympus/data" \
  -e HOST_PROJECT_ROOT="$HOME/olympus/app" \
  olympusmobile/olympus-master-setup:latest
# Open http://<server-ip>:8888 → 8-step wizard
```

Don't update this snippet here in isolation — it must stay aligned with the wizard's expected launch command (changes to `HOST_PROJECT_ROOT`, mounts, image tag, port all start in `olympus_master_setup_app/`).

## When something changed elsewhere, sync here

| If this changed in another repo… | Update here |
|----------------------------------|-------------|
| Setup wizard install steps / launch command | `SETUP.md` |
| Any Sails or Flask API endpoint signature | Postman collection |
| OpenClaw API operations (files, dirs, sharing, comments, favorites, GenAI) | `openclaw/SKILL.md` |

## When working on… read first

| Task area | Read |
|-----------|------|
| What's in this package, system requirements, repo relationships | `.github/instructions/project-context.instructions.md` |
