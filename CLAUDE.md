# Claude Code context — `olympus-genai-mobile-server-installation/` (customer distribution)

The **customer-facing installation package**. No source code — only documentation and API references. This is what end-users (system administrators) receive to deploy the Olympus platform. Sub-repo of `~/coding/` workspace.

## Contents

| Path | Purpose |
|------|---------|
| `SETUP.md` | End-to-end customer installation guide (system requirements, single `docker run` quick start, troubleshooting) |
| `website/` | Docusaurus source for **setup.olympus.io** — the published install docs. `website/docs/install.mdx` carries the same launch commands as `SETUP.md`; the two must move together |
| `postman-collection/*.postman_collection.json` | Complete API reference — ~8,400 lines |

## Customer install one-liner — keep consistent with `olympus_master_setup_app/`

```bash
docker run -d --name olympus-setup \
  -p 8888:8888 -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$HOME/olympus/app":"$HOME/olympus/app" \
  -v "$HOME/olympus/data":"$HOME/olympus/data" \
  -e HOST_PROJECT_ROOT="$HOME/olympus/app" \
  olympusmobile/olympus-master-setup:latest
# Open http://<server-ip>:8888 → 9-step wizard
```

Don't update this snippet here in isolation — it must stay aligned with the wizard's expected launch command (changes to `HOST_PROJECT_ROOT`, mounts, image tag, port all start in `olympus_master_setup_app/`).

### Windows uses a different mount form — this is correct, do not "fix" it

```powershell
-v "${env:USERPROFILE}\olympus\app:/olympus/app" `
-e HOST_PROJECT_ROOT="/olympus/app" `
```

Linux/macOS mount the app dir **1:1** (`$HOME/olympus/app` → same path inside the
container), so `HOST_PROJECT_ROOT` doubles as the host path. Windows **cannot** do that: a
Linux container can't use `C:\Users\...` as a bind *destination*. So the Windows mount
translates, and `HOST_PROJECT_ROOT` is the container-side `/olympus/app`.

This asymmetry looks like a copy-paste error and has been mistaken for one. It isn't. The
setup app resolves the real host path at deploy time by inspecting its own container's
mounts (`_detect_host_project_root()` → `_generate_resolved_compose()`), so the translating
mount is fully supported. Rewriting the Windows blocks to match the Linux form would break
every Windows install.

Corollary for the setup app: `HOST_PROJECT_ROOT` is unix-shaped on *every* supported
Windows launch, so nothing may infer the launch OS from its shape. Use the host-side
`Source` of the container's own mount instead.

## When something changed elsewhere, sync here

| If this changed in another repo… | Update here |
|----------------------------------|-------------|
| Setup wizard install steps / launch command | `SETUP.md` |
| Any Sails or Flask API endpoint signature | Postman collection |

## When working on… read first

| Task area | Read |
|-----------|------|
| What's in this package, system requirements, repo relationships | `.github/instructions/project-context.instructions.md` |
