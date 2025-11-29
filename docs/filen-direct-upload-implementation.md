# Filen Direct Upload Implementation Summary

## The Problem
- Vercel API routes have a 4MB body size limit
- Original implementation proxied files through server, limiting uploads to 4MB
- Needed a way to upload larger files directly from browser to Filen

## Approach A: Client-side Filen SDK (Failed)
- Tried using `@filen/sdk` directly in the browser
- **Failed due to**: Webpack/Next.js bundling issues with Node.js dependencies (crypto, fs, path, etc.)
- The SDK is designed for Node.js, not browsers

## Approach B: Direct Browser Upload with Web Crypto API (Success)
Built a custom implementation that bypasses the SDK entirely.

---

## Key Technical Details Discovered

### 1. Filen API Endpoints
- `ingest.filen.io` - For chunk uploads (supports CORS)
- `gateway.filen.io` - For API calls like upload finalization (NO CORS - needs proxy)
- `api.filen.io` - **Does not exist** (NXDOMAIN) - documentation is misleading

### 2. Chunk Upload Checksum
The `Checksum` header must be SHA-512 of ALL URL parameters as JSON:
```javascript
const urlParamsObj = { uuid, index: index.toString(), parent, uploadKey, hash: chunkHash };
const checksumData = JSON.stringify(urlParamsObj);
const checksum = await sha512(checksumData);
```
Missing any parameter = "Wrong query checksum" error.

### 3. Metadata Encryption (Version 2 Format)
```
"002" + ivString (12 alphanumeric chars) + base64(ciphertext + auth tag)
```
- IV is 12 **alphanumeric characters** stored as UTF-8 string
- NOT 12 random bytes base64-encoded
- Key derivation: PBKDF2 with masterKey as both password AND salt, 1 iteration, SHA-512

### 4. File Data Encryption (THE BIG ONE)
**Wrong approach:**
```javascript
const encryptionKey = generateRandomHex(32); // 64 hex chars
const keyBytes = hexToBuffer(encryptionKey); // Convert to 32 bytes
```

**Correct approach:**
```javascript
const encryptionKey = generateRandomString(32); // 32 alphanumeric chars
const keyBytes = new TextEncoder().encode(encryptionKey); // Use as UTF-8 = 32 bytes
```

Filen uses the key string as **UTF-8 bytes directly**, not hex-decoded bytes!

### 5. Encrypted Chunk Format
```
IV (12 bytes) + ciphertext + auth tag (16 bytes)
```
- NO version byte for file data (version byte is only for metadata)

### 6. Folder Navigation Issue
- Filen API returns encrypted folder names
- Solution: Store folder UUIDs during authentication, use them directly
- Added `pawkitFolderUUIDs: { library, attachments }` to session

---

## Files Created/Modified

1. **`/lib/services/filen-direct.ts`** - Main direct upload service
   - Web Crypto encryption
   - Chunk upload to ingest.filen.io
   - XHR for uploads (better than fetch for binary)

2. **`/app/api/filen/upload-done/route.ts`** - Proxy for finalization
   - Required because gateway.filen.io doesn't support CORS

3. **`/app/api/filen/folder/route.ts`** - Folder path resolution (ended up not needed)

4. **`/app/api/filen/auth/route.ts`** - Modified to store Pawkit folder UUIDs

5. **`/app/api/filen/session/route.ts`** - Modified to return folder UUIDs

---

## Error Messages Encountered & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `ERR_NAME_NOT_RESOLVED api.filen.io` | Domain doesn't exist | Use `gateway.filen.io` |
| `Wrong query checksum` | Missing params in checksum | Include ALL URL params |
| `CANNOT_DECRYPT_NAME` | Wrong metadata IV format | Use 12 alphanumeric chars as UTF-8 |
| `Folder not found` | Can't navigate folder structure | Store folder UUIDs during auth |
| Files corrupted/won't open | Wrong encryption key format | Use 32-char string as UTF-8, not hex |

---

## Final Architecture

```
Browser                          Filen
   |                               |
   |--[chunks via XHR]------------>| ingest.filen.io (CORS OK)
   |                               |
   |--[finalize via proxy]-------->|
   |        |                      |
   |   Vercel API                  |
   |   /api/filen/upload-done ---->| gateway.filen.io (no CORS)
```

- Single bandwidth (browser -> Filen directly for chunks)
- No file size limit (1MB chunks)
- Proxy only needed for small finalization request

---

## Key Lesson
When reverse-engineering encryption protocols, the **key format** matters as much as the algorithm. Filen's use of UTF-8 string bytes vs hex-decoded bytes was the critical difference.

---

*Document created: November 2025*
