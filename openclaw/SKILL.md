---
name: olympus-file-server
description: Interact with Olympus Mobile Server via REST APIs to manage files, directories, sharing, comments, favorites, and ask AI-powered questions about documents. Provides 42 API operations across 6 categories for complete file system operations. Use when the user wants to browse, upload, download, share, comment on, or AI-analyze files on their Olympus platform instance.
metadata: { "openclaw": { "emoji": "🏛️", "requires": { "env": ["OLYMPUS_API_URL", "OLYMPUS_API_KEY"] }, "primaryEnv": "OLYMPUS_API_KEY" } }
---

# Olympus File Server

Interact with an Olympus Mobile Server instance to manage files, directories, sharing, comments, favorites, and ask AI-powered questions about documents via direct REST API calls.

## Connection

All API calls are made directly to the Olympus REST API server. Connection requires the following environment variables (configured once per deployment):

- `OLYMPUS_API_URL` — Base URL of the Olympus REST API (e.g. `https://mobile-api.olympus.io`)
- `OLYMPUS_API_KEY` — **Per-install Bots client key** generated during platform setup. Each Olympus deployment provisions its own value — there is no universal default; a guessed value will fail with `INVALID_CLIENT`. See "Getting the Bots client key" below for where to retrieve it from the admin UI.

The `OLYMPUS_ACCESS_TOKEN` is NOT configured as an env var — it is obtained dynamically by logging in via the API (see Authentication below).

### Getting the Bots client key

If `OLYMPUS_API_KEY` isn't already configured, walk the user through retrieving it:

1. Open the Olympus web UI: `https://mobile.{your-domain}/admin/application/client-settings`
2. Sign in as a platform **admin** (regular users will not see this page)
3. Locate the row whose `clientName` is **`Bots`** (clientType `Bot`)
4. Copy its `clientKey` value
5. Set it as `OLYMPUS_API_KEY` in OpenClaw's environment

The key is a 32-character random string — example shape: `VXbQ7Ewkcr88pkgHYE7fQf9ZoM3ptakL` (illustrative only — never use this literal value; use the one from the customer's own admin UI).

> Use **only** the `Bots` client key for OpenClaw. Other client rows (Web, Windows, Mac, Android, iOS) exist for the corresponding native applications and should not be borrowed.

### Base URL

All API endpoints below are relative to `${OLYMPUS_API_URL}`. For example, if `OLYMPUS_API_URL=https://mobile-api.olympus.io`, then the file detail endpoint is `https://mobile-api.olympus.io/api/v1/file/get-detail?fileId=123`.

## Authentication

Every API call requires the `Authorization: Bearer {accessToken}` header containing a valid JWT token from Olympus login. Tokens expire every few hours, so you may need to re-authenticate during long sessions.

### Obtaining the Access Token

The access token is obtained by calling the Olympus login API. You need:

1. **User email** — Ask the user for their Olympus email address
2. **Password** — Ask the user for their Olympus password
3. **API Key** — Already configured via `OLYMPUS_API_KEY` env var
4. **API URL** — Already configured via `OLYMPUS_API_URL` env var

**Login endpoint:** `PUT ${OLYMPUS_API_URL}/api/v1/entrance/login`

**Request headers:**

```
Content-Type: application/json
```

**Request body (JSON):**

```json
{
  "apiKey": "${OLYMPUS_API_KEY}",
  "email": "user@example.com",
  "password": "user_password"
}
```

The `apiKey` field identifies which OAuth client is making the request. OpenClaw must use the **`Bots` client key** — pass `${OLYMPUS_API_KEY}` (operator-provided, retrieved from the admin UI as described under "Getting the Bots client key" in the Connection section). Do not use any other client's key.

**Successful response (JSON):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "27f05932-9b40-442f-8940-83165a53caac",
  "user": {
    "id": 90548,
    "email": "deepak@olympus.io",
    "emailStatus": "confirmed",
    "name": "deepak",
    "isSuperAdmin": false,
    "isLdapUser": false,
    "isAdUser": true,
    "isAnonymousUser": false,
    "lastSeenAt": 1761454600000,
    "isFileHostingAllowed": false
  },
  "otpEnabled": false,
  "otpSent": false,
  "otpSentViaChannels": []
}
```

If `otpEnabled` is `true`, an OTP will be sent and must be verified via `PUT /api/v1/entrance/verify-otp` before the `accessToken` is valid.

Use the returned `accessToken` value as the Bearer token for all subsequent API calls. Store the `refreshToken` for session renewal.

### Authentication Workflow

1. Ask the user for their **email** and **password** (do NOT ask for the API key or server URL — they are already configured as env vars)
2. Call `PUT ${OLYMPUS_API_URL}/api/v1/entrance/login` with the JSON body above (using `OLYMPUS_API_KEY` from env)
3. Extract `accessToken` from the response
4. Include `Authorization: Bearer {accessToken}` header in all subsequent API calls
5. If any API call returns a 401/authentication error, re-authenticate by repeating steps 1-4

### Common Headers

All API calls (except login) require these headers:

```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

For file upload endpoints, use `multipart/form-data` instead of `application/json`.

## REST API Reference (42 operations, 6 categories)

> **Counts per category:** Files (8), Directories (10), Sharing (12), Favorites (3), Comments (8), GenAI Q&A (1).

### 1. Files (8 operations)

#### file_download — Download a file

```
GET ${OLYMPUS_API_URL}/api/v1/file/download?fileId={fileId}
Authorization: Bearer {accessToken}
```

Returns binary file content. Use `responseType: arraybuffer` or stream the response.

---

#### file_get_download_link — Get a shareable download URL

```
GET ${OLYMPUS_API_URL}/api/v1/file/get-download-link?fileId={fileId}
Authorization: Bearer {accessToken}
```

Returns JSON with a download URL.

---

#### file_rename — Rename a file

**Always confirm with the user first.** May return HTTP 409 `MIGRATION_IN_PROGRESS` if the file's parent directory is mid-rename/move — wait ~3-5s and retry. See "Async-migration retry" below.

```
POST ${OLYMPUS_API_URL}/api/v1/file/rename
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fileId": 123,
  "newName": "new-filename.pdf"
}
```

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "file": {
      "createdAt": 1565331300679,
      "updatedAt": 1566814229991,
      "id": 463677,
      "name": "new-filename.pdf",
      "originalName": "original-name.pdf",
      "size": 9168220,
      "mimetype": "application/pdf",
      "viewLink": "/FolderName/new-filename.pdf",
      "directoryId": 17907,
      "permission": "admin"
    }
  }
}
```

---

#### file_move — Move a file to a different directory

**Always confirm with the user first.** Note: in `file/move` the directory IDs are **numbers**; `directory/move` uses **strings** (see below). This is a server-side input-type quirk — pass the right shape per endpoint.

If the response is HTTP 409 with `code: "MIGRATION_IN_PROGRESS"`, the file's parent directory is currently mid-rename/move (descendants are being asynchronously re-keyed). Wait ~3-5 seconds and retry. See "Async-migration retry" under Workflow Patterns.

```
POST ${OLYMPUS_API_URL}/api/v1/file/move
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fileId": 123,
  "sourceDirectoryId": 789,
  "destinationDirectoryId": 456
}
```

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "file": {
      "id": 463655,
      "name": "document.zip",
      "originalName": "document.zip",
      "size": 6828260,
      "mimetype": "application/zip",
      "viewLink": "/DestFolder/document.zip",
      "directoryId": 456,
      "permission": "admin"
    }
  }
}
```

---

#### file_delete — Permanently delete a file

**Always confirm with the user first.** This action is irreversible.

```
DELETE ${OLYMPUS_API_URL}/api/v1/file/delete?fileId={fileId}
Authorization: Bearer {accessToken}
```

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "file": {
      "id": 6721552,
      "name": "deleted-file.bin",
      "originalName": "deleted-file.bin",
      "size": "274192",
      "mimetype": "application/octet-stream",
      "viewLink": "/FolderName/deleted-file.bin",
      "directoryId": 2873357
    }
  }
}
```

---

#### file_get_detail — Get detailed file metadata

```
GET ${OLYMPUS_API_URL}/api/v1/file/get-detail?fileId={fileId}
Authorization: Bearer {accessToken}
```

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "file": {
      "createdAt": 1760930033311,
      "updatedAt": 1760930033306,
      "id": 6721120,
      "name": "Inflation of Gold Prices.txt",
      "originalName": "Inflation of Gold Prices.txt",
      "size": "4421",
      "mimetype": "text/plain",
      "viewLink": "//MCP/Inflation of Gold Prices.txt",
      "mountId": "7",
      "ownerIds": [],
      "directoryId": 2873357,
      "permission": "admin",
      "mountPointDetails": {
        "id": 7,
        "enabled": true,
        "mountType": "nfs",
        "isSharingEnabled": true,
        "isGenAiEnabled": true,
        "name": "nfsshare"
      },
      "rootDetails": {
        "id": 2873270,
        "name": "nfsshare",
        "driveFsName": "/",
        "mountId": "7"
      },
      "isFavourite": false
    }
  }
}
```

---

#### file_upload — Upload a file

Used by PDF, DOCX, and text file generation. Accepts `multipart/form-data`.

```
POST ${OLYMPUS_API_URL}/api/v1/file/upload?directoryId={directoryId}&md5checksum={md5checksum}
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

file: (binary file content)
```

`md5checksum` query param is optional — used for deduplication.

Supported content types for generated files:
- **PDF**: `application/pdf`
- **DOCX**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Text**: `text/plain`
- **Image**: `image/png`

To generate and upload a PDF, DOCX, or text file:
1. Generate the file content locally (create the document in memory or temp file)
2. Upload via `POST /api/v1/file/upload?directoryId={directoryId}` with the file as `multipart/form-data`

---

#### file_search_by_content — Search files by content (full-text search)

Searches across ALL files in the system by their indexed content. Returns files with matching text highlighted. Supports pagination.

```
GET ${OLYMPUS_API_URL}/api/v1/file/search-files?searchTerm={searchTerm}&limit={limit}&page={page}
Authorization: Bearer {accessToken}
```

**Query parameters:**
- `searchTerm` (required) — The text to search for inside file contents
- `limit` (optional, default: 10) — Number of results per page
- `page` (optional, default: 1) — Page number for pagination

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": 6799061,
        "name": "sb0001.pdf",
        "originalName": "sb0001.pdf",
        "size": "9874039",
        "mimetype": "application/pdf",
        "viewLink": "/Olympus_Demo/Legislative Agent/sb0001.pdf",
        "mountId": "2",
        "directoryId": 2917172,
        "permission": "admin",
        "mountPoint": "nfsshare",
        "searchHighlight": "...<mark>NASA</mark> Collaboration."
      }
    ],
    "currentPage": 1,
    "limit": 10,
    "total": 13,
    "from": 1,
    "to": 10,
    "nextPage": 2
  }
}
```

The `searchHighlight` field contains a snippet of the matching content with `<mark>` tags around matched terms. Use this to show users why a file matched.

---

### 2. Directories (10 operations)

#### directory_get_root_directories — Get all root-level directories

Starting point for navigation. Returns all mount points.

```
GET ${OLYMPUS_API_URL}/api/v1/directory/get-root-directories
Authorization: Bearer {accessToken}
```

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "directories": [
      {
        "id": 2916531,
        "name": "nfsshare",
        "originalName": "nfsshare",
        "size": 4096,
        "driveFsName": "/",
        "mountId": "2",
        "depthLevel": 0,
        "ownerIds": [],
        "directoryId": null,
        "mountPoint": "nfsshare",
        "permission": "read",
        "mountPointDetails": {
          "id": 2,
          "enabled": true,
          "mountType": "nfs",
          "isSharingEnabled": true,
          "isGenAiEnabled": true,
          "name": "nfsshare"
        }
      }
    ]
  }
}
```

---

#### directory_get_child_directories — List subdirectories

Supports pagination via `limit` and `page` query parameters.

```
GET ${OLYMPUS_API_URL}/api/v1/directory/get-child-directories?directoryId={directoryId}&limit={limit}&page={page}
Authorization: Bearer {accessToken}
```

`limit` (default: 10) and `page` (default: 1) are optional.

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "directories": [
      {
        "id": 2917170,
        "name": "Factory Worker",
        "originalName": "Factory Worker",
        "size": 0,
        "driveFsName": "/Olympus_Demo/Factory Worker/",
        "mountId": "2",
        "depthLevel": 2,
        "ownerIds": [],
        "directoryId": 2917166,
        "permission": "admin"
      }
    ],
    "currentPage": 1,
    "limit": 10,
    "total": 7,
    "from": 1,
    "to": 7,
    "nextPage": null
  }
}
```

---

#### directory_get_files — List files in a directory

Supports pagination via `page` query parameter. Default limit is 25 per page.

```
GET ${OLYMPUS_API_URL}/api/v1/directory/get-files?directoryId={directoryId}&page={page}
Authorization: Bearer {accessToken}
```

`page` (default: 1) is optional.

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": 6799044,
        "name": "Assembly_Manual.pdf",
        "originalName": "Assembly_Manual.pdf",
        "size": "4785",
        "mimetype": "application/pdf",
        "viewLink": "/Olympus_Demo/Assembly_Manual.pdf",
        "mountId": "2",
        "ownerIds": [],
        "directoryId": 2917166,
        "permission": "admin"
      }
    ],
    "currentPage": 1,
    "limit": 25,
    "total": 6,
    "from": 1,
    "to": 6,
    "nextPage": null
  }
}
```

---

#### file_search_by_name — Search for files by name

**Always use this before operating on files by name.** Supports fuzzy matching. Supports pagination via `limit` and `page` query parameters.

```
GET ${OLYMPUS_API_URL}/api/v1/directory/search-files-by-name?directoryId={directoryId}&searchTerm={searchTerm}&searchInSubFolders={true|false}&limit={limit}&page={page}
Authorization: Bearer {accessToken}
```

**Query parameters:**
- `directoryId` (required) — Directory to search within
- `searchTerm` (required) — File name to search for
- `searchInSubFolders` (optional, default: false) — Search recursively in subdirectories
- `limit` (optional, default: 10) — Number of results per page
- `page` (optional, default: 1) — Page number for pagination

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": 6799064,
        "name": "Guide-Solar-for-Commercial-Properties.pdf",
        "size": "4875713",
        "directoryId": 2917173,
        "permission": "admin",
        "createdAt": 1760673014885,
        "updatedAt": 1760673014853
      },
      {
        "id": 6800394,
        "name": "solar_system_planets.png",
        "size": "621398",
        "directoryId": 2917423,
        "permission": "admin",
        "createdAt": 1762730097699,
        "updatedAt": 1762730097682
      },
      {
        "id": 6800547,
        "name": "solar_farm_water_treatment_coastal_city.png",
        "size": "1510774",
        "directoryId": 2917173,
        "permission": "admin",
        "createdAt": 1762229677112,
        "updatedAt": 1762229677077
      }
    ],
    "searchTerm": "Solar",
    "searchInSubFolders": false,
    "totalFound": 24
  }
}
```

`totalFound` gives the total count of matching files across all pages.

---

#### directory_get_detail — Get directory metadata

```
GET ${OLYMPUS_API_URL}/api/v1/directory/get-detail?directoryId={directoryId}
Authorization: Bearer {accessToken}
```

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "directory": {
      "createdAt": 1760673272626,
      "updatedAt": 1760673272626,
      "id": 2917166,
      "name": "Olympus_Demo",
      "originalName": "Olympus_Demo",
      "size": 0,
      "driveFsName": "/Olympus_Demo/",
      "mountId": "2",
      "depthLevel": 1,
      "ownerIds": [],
      "directoryId": 2917164,
      "permission": "admin",
      "mountPointDetails": {
        "id": 2,
        "enabled": true,
        "mountType": "nfs",
        "isSharingEnabled": true,
        "isGenAiEnabled": true,
        "name": "nfsshare"
      },
      "isFavourite": false,
      "rootDetails": {
        "id": 2917164,
        "name": "nfsshare",
        "driveFsName": "/",
        "mountId": "2"
      }
    }
  }
}
```

---

#### directory_get_all_parents — Get breadcrumb chain

Returns all parent directories from root to the specified directory.

```
GET ${OLYMPUS_API_URL}/api/v1/directory/get-all-parents?directoryId={directoryId}
Authorization: Bearer {accessToken}
```

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 2873270,
    "name": "nfsshare",
    "directoryid": null,
    "depth": 1,
    "parents": [
      { "f1": 2873270, "f2": "nfsshare", "f3": "/" }
    ]
  }
}
```

The `parents` array contains objects with `f1` (directory ID), `f2` (directory name), `f3` (filesystem path).

---

#### directory_create — Create a new subdirectory

```
POST ${OLYMPUS_API_URL}/api/v1/directory/create
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "directoryId": 123,
  "name": "New Folder"
}
```

`directoryId` is the parent directory ID where the new folder will be created.

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "directory": {
      "createdAt": "1761620922297",
      "updatedAt": "1761620922288",
      "id": 2873365,
      "name": "New Folder",
      "originalName": "New Folder",
      "size": 0,
      "driveFsName": "/New Folder/",
      "mountId": "7",
      "directoryId": 123,
      "depthLevel": 1,
      "ownerIds": [],
      "createdNow": true,
      "permission": "admin"
    }
  }
}
```

---

#### directory_rename — Rename a directory

**Always confirm with the user first.** When renaming a directory that has many descendants, the server applies the rename's user-visible row synchronously and propagates the new path to descendants asynchronously. May return HTTP 409 `MIGRATION_IN_PROGRESS` if a previous rename/move on this directory or any ancestor is still being applied. Wait ~3-5s and retry. See "Async-migration retry" below.

```
POST ${OLYMPUS_API_URL}/api/v1/directory/rename
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "directoryId": 123,
  "newName": "Renamed Folder"
}
```

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "directory": {
      "id": 2873365,
      "name": "Renamed Folder",
      "originalName": "Old Name",
      "size": 0,
      "driveFsName": "/Renamed Folder/",
      "mountId": "7",
      "depthLevel": 1,
      "ownerIds": [],
      "directoryId": 2873270,
      "permission": "admin",
      "previousName": "Old Name"
    }
  }
}
```

The response includes `previousName` showing the old directory name.

---

#### directory_move — Move a directory

**Always confirm with the user first.** Same async-migration model as `directory_rename` — may return HTTP 409 `MIGRATION_IN_PROGRESS` if source or destination directory is mid-migration; retry after ~3-5s.

> ⚠️ **Type quirk:** `sourceDirectoryId` and `destinationDirectoryId` are typed as **strings** here (different from `file/move`, which uses numbers). Pass them as JSON strings: `"789"`, not `789`.

```
POST ${OLYMPUS_API_URL}/api/v1/directory/move
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "directoryId": 123,
  "sourceDirectoryId": "789",
  "destinationDirectoryId": "456"
}
```

---

#### directory_delete — Delete a directory and all contents

**Always confirm with the user first.** Deletes recursively including all files and subdirectories.

```
DELETE ${OLYMPUS_API_URL}/api/v1/directory/delete?directoryId={directoryId}
Authorization: Bearer {accessToken}
```

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "directory": {
      "id": 2873365,
      "name": "Docs",
      "originalName": "New folder 4",
      "size": 0,
      "driveFsName": "/Docs/",
      "mountId": "7",
      "depthLevel": 1,
      "ownerIds": [],
      "directoryId": 2873270
    },
    "otherDeletedDirectories": []
  }
}
```

`otherDeletedDirectories` lists any child directories that were removed along with the parent.

---

### 3. Sharing (12 operations)

#### file_get_public_sharing_status — Check public sharing status

```
GET ${OLYMPUS_API_URL}/api/v1/share/file/get-public-sharing-status?fileId={fileId}
Authorization: Bearer {accessToken}
```

---

#### file_enable_public_download — Enable public download

Generates a public download link. Supports optional expiry and password protection.

```
POST ${OLYMPUS_API_URL}/api/v1/share/file/enable-public-download
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fileId": 123,
  "enablePublicDownload": true,
  "isExpiryEnabled": false,
  "isLinkProtected": false,
  "password": "",
  "expiryDate": ""
}
```

Required-when-applicable fields:
- `enablePublicDownload` — `true` to enable, `false` to disable
- `isLinkProtected` — `true` to require a password
- `isExpiryEnabled` — `true` to enforce `expiryDate`
- `password` — only used when `isLinkProtected: true`
- `expiryDate` — format: `"MM-DD-YYYY HH:mm:ss"` (e.g. `"07-07-2025 15:00:00"`); only used when `isExpiryEnabled: true`

A public-share creates a **separate `shareditems` row** distinct from any private shares — the same file can have N private shares + 1 public share simultaneously.

**Response payload — `data.sharedItemData`:**

| Field | Always present | What it is |
|---|---|---|
| `shareLink` | Yes | The raw UUID, e.g. `9c391d39-bf30-40b9-9f71-52ea6a563615`. NOT a URL — building either URL by hand if needed. |
| `downloadLink` | Yes | **Pre-built URL appropriate for the link's current state.** See the next section. |

**`downloadLink` shape depends on whether the link is password-protected:**

| Link state | `downloadLink` points to | What the recipient experiences |
|---|---|---|
| **No password** (`isLinkProtected: false`) | API host: `https://mobile-api.{your-domain}/api/v1/share/file/download-via-public-link?linkId={uuid}&responseType=file` | Browser opens the URL. **Raster image types (JPEG, PNG, GIF, WebP)** render inline. **HTML** renders inline only if the file owner has `isFileHostingAllowed`. **Everything else** (PDF, video, audio, Office, code, markdown, plain text, archives, SVG, …) is served with `Content-Disposition: attachment` and triggers the browser's download — multi-stream + resume on enterprise/trial tiers, single-stream on the free tier. No landing page either way. |
| **Password protected** (`isLinkProtected: true`) | Frontend host: `https://mobile.{your-domain}/user/shared/file/public-download?linkId={uuid}` | Recipient lands on a card that prompts for the password. After unlocking, they get **Preview** (in-browser viewer for the full set of supported types) and **Download** buttons. Once verified on-device the unlock is cached for ~15 min in `sessionStorage` so reloads don't re-prompt. |

This is **Approach A** of the public-share design (chosen 2026-05-13): direct API URL for the common no-password case avoids forcing recipients through a landing page they don't need. The frontend URL is reserved for the password case where the page itself is the entry to the unlock UI.

**Toggling the password flag rotates the UUID.** If the share owner adds or removes the password, the existing `shareLink` UUID is replaced with a fresh one and the previously-distributed URL stops working (returns `LINK_INVALID`). This is symmetric — happens in both directions — so a previously-shared URL can never silently change in shape (no-password → password-protected or vice versa) without invalidating itself. Updates that don't change the password state (changing the password value itself, changing expiry) keep the same UUID.

**Hand `downloadLink` back to the user verbatim.** Whether they want to share with a human or use it in a script, the server has already chosen the right URL for the current state. Don't reshape it; don't construct a "human" URL when `downloadLink` is the API URL — the recipient experience is identical or better when their browser handles the file natively. Reach for the manual API URL (`file_public_download` operation below) only when explicitly asked for a binary-streaming endpoint or when chaining with an automation step that needs raw bytes regardless of the link's password state.

---

#### file_public_download — Download a file via its public link (no auth)

Anonymous endpoint that streams the file. For unprotected shares this is the **same URL** that `file_enable_public_download` returns as `downloadLink`, so most of the time you don't need to construct it yourself — just use `downloadLink`. Reach for the manual construction below when you specifically need raw bytes regardless of the link's state (e.g. an automation step that handles the password elsewhere).

```
GET ${OLYMPUS_API_URL}/api/v1/share/file/download-via-public-link?linkId={linkId}&responseType=file
```

**Query parameters:**
- `linkId` (required) — UUID returned by `file_enable_public_download` (`data.sharedItemData.shareLink`)
- `responseType` (required) — `file` to stream bytes, `link` to get a one-shot download URL (in JSON)
- `password` (required only if the link was created with `isLinkProtected: true`)

No `Authorization` header is sent. Returns binary file content when `responseType=file`. Response respects `Range` headers when the host install holds an enterprise / trial license (multi-stream + resume); single-stream otherwise.

**Reminder on URL choice:**
- `downloadLink` is already the right URL for the share's current state — unprotected shares get this API URL, protected shares get the frontend unlock page. Hand it back to the user as-is.
- Construct this URL manually only when you need to fetch bytes from a script and you know the password (if any) out-of-band.

---

#### directory_enable_public_access — Enable/disable public directory access

```
POST ${OLYMPUS_API_URL}/api/v1/share/directory/enable-public-access
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "directoryId": 123,
  "enablePublicAccess": true,
  "isExpiryEnabled": false,
  "isLinkProtected": false,
  "permissionLevel": "read"
}
```

- `enablePublicAccess` — `true` to enable, `false` to disable public access
- `permissionLevel` — `"read"` or `"write"` only (server rejects `"admin"` for public access — security restriction)
- `password`, `expiryDate` — same shape as `file_enable_public_download`

The response includes `data.sharedItemData.accessLink`, a full URL of the form `${MOBILE_FRONTEND_URL}/user/shared/folder/anonymous-access?accessCode={uuid}&accessId={base64}`. Hand this to the user verbatim.

---

#### file_share_privately — Share a file with a specific user

```
POST ${OLYMPUS_API_URL}/api/v1/share/file/share-privately
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fileId": 123,
  "userEmail": "colleague@company.com",
  "permission": "write",
  "message": "Please review this document"
}
```

`message` is optional. Permission levels:
- `read` — View, download, and add comments
- `write` — Read + rename + share (with max write permission)
- `admin` — Full access: delete, move, enable AI chat/embedding, manage all permissions

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "sharedItemData": {
      "id": 361,
      "sharedBy": "2",
      "nodeType": 1,
      "userId": "9",
      "permissionLevel": "admin",
      "publicLinkEnabled": false,
      "directDownloadEnabled": false,
      "linkPasswordEnabled": false,
      "linkExpiryDate": null
    }
  }
}
```

---

#### file_get_users_list — Get users a file is shared with

```
GET ${OLYMPUS_API_URL}/api/v1/share/file/get-shared-to-users-list?fileId={fileId}
Authorization: Bearer {accessToken}
```

---

#### directory_get_users_list — Get users a directory is shared with

```
GET ${OLYMPUS_API_URL}/api/v1/share/directory/get-shared-to-users-list?directoryId={directoryId}
Authorization: Bearer {accessToken}
```

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "sharedItemData": [
      {
        "id": 359,
        "sharedBy": "2",
        "nodeType": 2,
        "permission": "admin",
        "email": "user@example.com",
        "name": "user@example.com",
        "sid": "1564404478815"
      }
    ]
  }
}
```

---

#### directory_share_privately — Share a directory with a specific user

```
POST ${OLYMPUS_API_URL}/api/v1/share/directory/share-privately
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "directoryId": 123,
  "userEmail": "colleague@company.com",
  "permission": "write",
  "message": "Shared folder for collaboration"
}
```

`message` is optional. Same permission levels as file sharing.

**Example response (200 OK):**

```json
{
  "success": true,
  "data": {
    "sharedItemData": {
      "id": 578,
      "sharedBy": "40",
      "nodeType": 2,
      "userId": "46",
      "permissionLevel": "admin",
      "publicLinkEnabled": false,
      "directDownloadEnabled": false
    },
    "childSharedDirectoriesCount": 40,
    "childSharedFilesCount": 42
  }
}
```

`childSharedDirectoriesCount` and `childSharedFilesCount` indicate how many child items were also shared.

---

#### file_remove_sharing — Revoke a private file share

Removes a single recipient's access to a privately-shared file. Pass the `id` of the row from `file_get_users_list` (the `shareId`, not the file id).

```
GET ${OLYMPUS_API_URL}/api/v1/share/file/remove-sharing?shareId={shareId}
Authorization: Bearer {accessToken}
```

After this call the recipient's `file_download` requests return HTTP 403. The `entitypermission` row is also removed.

---

#### directory_remove_sharing — Revoke a private directory share

```
GET ${OLYMPUS_API_URL}/api/v1/share/directory/remove-sharing?shareId={shareId}
Authorization: Bearer {accessToken}
```

Same semantics as `file_remove_sharing`. Pass the `id` from `directory_get_users_list`.

---

#### shared_with_me_files — List files shared with the current user

What the "/shared" page shows in the UI — every file another user shared privately with you, plus any files you can access via folder shares.

```
GET ${OLYMPUS_API_URL}/api/v1/share/listing/get-root-shared-files
Authorization: Bearer {accessToken}
```

Returns `data.files` — same per-file shape as `directory_get_files`.

---

#### shared_with_me_directories — List directories shared with the current user

```
GET ${OLYMPUS_API_URL}/api/v1/share/listing/get-root-shared-directories
Authorization: Bearer {accessToken}
```

Returns `data.directories`.

---

### 4. Favorites (3 operations)

#### favorites_add — Add to favorites

```
POST ${OLYMPUS_API_URL}/api/v1/favourites/add
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "entityId": 123,
  "entityType": "File"
}
```

`entityType` must be `"File"` or `"Directory"`.

---

#### favorites_remove — Remove from favorites

```
DELETE ${OLYMPUS_API_URL}/api/v1/favourites/remove?entityId={entityId}&entityType={entityType}
Authorization: Bearer {accessToken}
```

`entityId` is the numeric file or directory id, and `entityType` must be `"File"` or `"Directory"` — the same pair the `favorites_add` endpoint takes (returned from `favorites_get_all`).

---

#### favorites_get_all — Get all favorites

```
GET ${OLYMPUS_API_URL}/api/v1/favourites/list
Authorization: Bearer {accessToken}
```

Returns all favorited files and directories for the current user.

---

### 5. Comments (8 operations)

#### file_add_comment — Add a comment to a file

```
POST ${OLYMPUS_API_URL}/api/v1/file/comment/add-comment
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fileId": 123,
  "payload": "Great analysis in section 3. Consider adding more data."
}
```

`payload` contains the comment text.

---

#### file_get_comments — Get all comments for a file

```
GET ${OLYMPUS_API_URL}/api/v1/file/comment/get-comments?fileId={fileId}
Authorization: Bearer {accessToken}
```

Returns comments with author info and timestamps.

---

#### file_update_comment — Update an existing comment

```
PATCH ${OLYMPUS_API_URL}/api/v1/file/comment/update-comment
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "id": 456,
  "payload": "Updated comment text"
}
```

`id` is the comment ID. `payload` is the updated comment text.

---

#### file_delete_comment — Delete a comment on a file

**Always confirm with the user first.**

```
DELETE ${OLYMPUS_API_URL}/api/v1/file/comment/delete-comment?id={commentId}
Authorization: Bearer {accessToken}
```

---

#### directory_add_comment — Add a comment to a directory

```
POST ${OLYMPUS_API_URL}/api/v1/directory/comment/add-comment
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "directoryId": 123,
  "payload": "This folder contains Q3 reports"
}
```

---

#### directory_get_comments — Get all comments for a directory

```
GET ${OLYMPUS_API_URL}/api/v1/directory/comment/get-comments?directoryId={directoryId}
Authorization: Bearer {accessToken}
```

---

#### directory_update_comment — Update an existing directory comment

```
PATCH ${OLYMPUS_API_URL}/api/v1/directory/comment/update-comment
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "id": 456,
  "payload": "Updated comment text"
}
```

---

#### directory_delete_comment — Delete a directory comment

**Always confirm with the user first.**

```
DELETE ${OLYMPUS_API_URL}/api/v1/directory/comment/delete-comment?id={commentId}
Authorization: Bearer {accessToken}
```

---

### 6. GenAI Q&A (1 operation)

#### ask_genai_question — Ask AI questions about documents

This is an async operation with polling. Two modes: ask about a file or ask about a directory.

**IMPORTANT — Determining Where to Look:**

When a user asks a question and does NOT specify which file or folder to search in, ask the user which approach to use:

1. **Global Search** — Search across all files on the platform. Get all root directories via `GET /api/v1/directory/get-root-directories`, then call `POST /api/v1/genai/chat-on-directory` for each root directory with `searchInSubFolders: true`. There can be multiple root directories, so call the API for each one.

2. **Search in Related Files** — First find files related to the question using the content search API:
   ```
   GET /api/v1/file/search-files?searchTerm={keywords_from_question}&limit=10&page=1
   ```
   Review the matched files and their `searchHighlight` snippets, then call `POST /api/v1/genai/chat-on-file` for the most relevant file(s).

3. **Specific File/Folder** — Ask the user for the file or folder name, then search by name to get the ID and proceed.

If the user has already specified a file or directory (by name or ID), skip this step and proceed directly.

**Ask about a file:**

```
POST ${OLYMPUS_API_URL}/api/v1/genai/chat-on-file
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "question": "What are the key findings in this report?",
  "chatKnowledgeBase": "documentsWithModelKnowledge",
  "fileId": 123
}
```

**Ask about a directory:**

```
POST ${OLYMPUS_API_URL}/api/v1/genai/chat-on-directory
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "question": "Summarize all documents in this folder",
  "chatKnowledgeBase": "documentsWithModelKnowledge",
  "directoryId": 456,
  "searchInSubFolders": true
}
```

`searchInSubFolders` is optional (default: false).

**Poll for results (both modes):**

Both POST endpoints return `data.createdRecord` whose `id` field is the `chatId` to poll with:

```
GET ${OLYMPUS_API_URL}/api/v1/genai/get-chat-status?chatId={chatId}
Authorization: Bearer {accessToken}
```

`chatStatus` enum is `["queued", "processing", "completed", "failed"]`. Poll every 2.5 seconds until `chatStatus === "completed"` (success — read `data.chat.assistantAnswer`) or `"failed"` (read `data.chat.errorMessage` and surface to user). Cap at ~120 seconds; very large directory queries can legitimately take longer, so let the user choose to keep waiting.

**Knowledge base modes:**
- `restrictiveToDocuments` — Strict RAG, only document content
- `documentsWithModelKnowledge` — Docs + AI knowledge (default in skill examples; **server default is `restrictiveToDocuments`** if you omit the field)
- `documentsOrModelKnowledge` — Prefer AI knowledge

## Workflow Patterns

### File by Name (CRITICAL)

When a user mentions a file by name, **ALWAYS** search first to get the file ID. Never use cached or stale file IDs.

```
GET /api/v1/directory/search-files-by-name?directoryId={id}&searchTerm={name}&searchInSubFolders=true
→ use returned fileId → perform operation
```

### Destructive Operations

For delete, rename, or move operations, **always confirm with the user before proceeding**. Applies to: file delete, file rename, file move, directory delete, directory rename, directory move, file/directory comment delete, remove-sharing.

### Async-migration retry (`MIGRATION_IN_PROGRESS`)

`directory/rename` and `directory/move` use a hybrid sync+async migration: the renamed/moved entity itself is updated synchronously, but descendant rows (paths, permissions, shares, favourites, comments) are propagated by a background consumer. While that consumer is running, **any** rename/move targeting the same directory, an ancestor, or a child returns:

```json
HTTP 409 Conflict
{ "errors": [{ "code": "MIGRATION_IN_PROGRESS", "message": "..." }] }
```

`file/rename` and `file/move` return the same 409 if the file's parent directory is mid-migration.

**Recommended OpenClaw behavior:**
1. On 409 with `code: "MIGRATION_IN_PROGRESS"`, wait 3 seconds and retry once.
2. If the second attempt also returns 409, surface to user: *"The platform is still applying a previous folder rename/move to this subtree. Please try again in a moment."* Don't auto-retry indefinitely — the migration could be touching a very large subtree.
3. **Do not** retry indiscriminately on every 409 — only when `code === "MIGRATION_IN_PROGRESS"`.

### Content Generation & File Upload

When the user wants to create a document, you (OpenClaw) generate the content yourself, then format it into the appropriate file type and upload it to Olympus.

**Workflow:**

1. **Generate content** — Use your own knowledge and capabilities to write the content the user requested (e.g., a report, summary, proposal, presentation outline, etc.)
2. **Format into a file** — Create the file in the appropriate format based on what the user asked for:
   - **`.txt`** — Plain text documents, notes, logs
   - **`.pdf`** — Reports, formal documents, printable content
   - **`.docx`** — Editable Word documents, proposals, letters
   - **`.pptx`** — Presentations, slide decks
   - **`.png` / `.jpg`** — Generated images, diagrams, charts
   - **`.csv` / `.xlsx`** — Spreadsheets, tabular data
3. **Upload to Olympus** — Call the file upload API with the generated file:
   ```
   POST /api/v1/file/upload?directoryId={directoryId}
   Authorization: Bearer {accessToken}
   Content-Type: multipart/form-data

   file: (generated file binary)
   ```
4. **Confirm** — Get the file detail or download link to confirm the upload and share with the user

If the user doesn't specify a target directory, ask them where to upload the file, or use the directory they were most recently browsing.

### Verify After Modify

After modifying a file or directory, verify the change by calling the detail endpoint:

```
modify operation → GET /api/v1/file/get-detail or GET /api/v1/directory/get-detail → confirm to user
```

## Usage Examples

### Browse the file system

```bash
# 1. Get root directories (mount points)
GET ${OLYMPUS_API_URL}/api/v1/directory/get-root-directories

# 2. Browse into a folder
GET ${OLYMPUS_API_URL}/api/v1/directory/get-child-directories?directoryId=1

# 3. List files in a directory
GET ${OLYMPUS_API_URL}/api/v1/directory/get-files?directoryId=1
```

### Search and download a file

```bash
# 1. Search for files matching 'report'
GET ${OLYMPUS_API_URL}/api/v1/directory/search-files-by-name?directoryId=1&searchTerm=report&searchInSubFolders=true

# 2. Get download URL
GET ${OLYMPUS_API_URL}/api/v1/file/get-download-link?fileId=123
```

### Ask a question about a document

```bash
# 1. Search for the file
GET ${OLYMPUS_API_URL}/api/v1/directory/search-files-by-name?directoryId=1&searchTerm=quarterly-report.pdf&searchInSubFolders=true

# 2. Ask question (returns chatId)
POST ${OLYMPUS_API_URL}/api/v1/genai/chat-on-file
Body: { "question": "What are the key findings?", "chatKnowledgeBase": "documentsWithModelKnowledge", "fileId": 123 }

# 3. Poll for answer
GET ${OLYMPUS_API_URL}/api/v1/genai/get-chat-status?chatId=abc123
```

### Share a file with a colleague

```bash
# 1. Search for the file
GET ${OLYMPUS_API_URL}/api/v1/directory/search-files-by-name?directoryId=1&searchTerm=budget.xlsx&searchInSubFolders=true

# 2. Share with write access
POST ${OLYMPUS_API_URL}/api/v1/share/file/share-privately
Body: { "fileId": 123, "userEmail": "colleague@company.com", "permission": "write" }
```

### Organize files into folders

```bash
# 1. Create a new folder
POST ${OLYMPUS_API_URL}/api/v1/directory/create
Body: { "directoryId": 1, "name": "Reports" }

# 2. Search for files to move
GET ${OLYMPUS_API_URL}/api/v1/directory/search-files-by-name?directoryId=1&searchTerm=report&searchInSubFolders=false

# 3. Move each file
POST ${OLYMPUS_API_URL}/api/v1/file/move
Body: { "fileId": 456, "sourceDirectoryId": 1, "destinationDirectoryId": 789 }
```

### Comment on a document

```bash
# 1. Search for the file
GET ${OLYMPUS_API_URL}/api/v1/directory/search-files-by-name?directoryId=1&searchTerm=proposal.docx&searchInSubFolders=true

# 2. Add comment
POST ${OLYMPUS_API_URL}/api/v1/file/comment/add-comment
Body: { "fileId": 123, "payload": "Great analysis in section 3. Consider adding more data." }

# 3. View all comments
GET ${OLYMPUS_API_URL}/api/v1/file/comment/get-comments?fileId=123
```
