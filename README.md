# Olympus — Installation & Customer Distribution

This repository is the **customer-facing installation package** for [Olympus](https://www.olympus.io) — a self-hosted enterprise file management and GenAI platform.

> 📖 **Most users should read the live docs site:**
> **<https://setup.olympus.io/>**

The docs site has a guided, tabbed walkthrough for Linux, macOS, and Windows. The raw markdown copy below is kept for offline reading and search.

## What's in this repo

| Path                    | Purpose                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------- |
| [`SETUP.md`](./SETUP.md) | End-to-end installation guide as a single markdown file (offline-friendly).             |
| [`website/`](./website) | Source for the Docusaurus-powered documentation site (auto-deployed to GitHub Pages).  |
| [`postman-collection/`](./postman-collection) | Postman collection — full API reference for the Olympus mobile-server API. |

## Quick start

```bash
mkdir -p "$HOME/olympus/app" "$HOME/olympus/data" && \
docker run -d --name olympus-setup \
  -p 8888:8888 -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$HOME/olympus/app":"$HOME/olympus/app" \
  -v "$HOME/olympus/data":"$HOME/olympus/data" \
  -e HOST_PROJECT_ROOT="$HOME/olympus/app" \
  -e DOCKER_USERNAME="olympussupport" \
  -e DOCKER_TOKEN="dckr_pat_nnZK2QRyooOHm944bKzRTKo12-w" \
  olympusmobile/olympus-master-setup:latest && \
docker logs -f olympus-setup
```

Then open <http://localhost:8888> in your browser and complete the 9-step setup wizard.

> The full guide — including Windows commands, GPU setup, pre-flight checks, and troubleshooting — is at the **[docs site](https://setup.olympus.io/)** or in [`SETUP.md`](./SETUP.md).

## Working on the docs site locally

```bash
cd website
npm install
npm start    # http://localhost:3000
```

A push to `main` that touches `website/**` or `SETUP.md` redeploys the site via the GitHub Actions workflow in [`.github/workflows/deploy-docs.yml`](./.github/workflows/deploy-docs.yml).

## Support

- 🐛 [Issues](https://github.com/Olympus-io/olympus-genai-mobile-server-installation/issues)
- ✉️ `support@olympus.io`
