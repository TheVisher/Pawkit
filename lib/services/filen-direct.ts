/**
 * Filen Direct Upload Service
 *
 * Direct browser-to-Filen uploads using Web Crypto API.
 * Bypasses the @filen/sdk to avoid bundling issues while maintaining
 * full compatibility with Filen's encryption protocol.
 *
 * Protocol:
 * - File data: AES-256-GCM with 12-byte IV, 64-char hex key
 * - Metadata: AES-256-GCM, format "003" + hex(iv) + base64(ciphertext+tag)
 * - Chunks: 1MB each, uploaded to ingest.filen.io
 * - Finalize: POST to api.filen.io/v3/upload/done
 */

// Constants matching Filen SDK
const CHUNK_SIZE = 1024 * 1024; // 1MB
// Use only the main ingest URL - numbered ones may not exist
const INGEST_URL = "https://ingest.filen.io";
const API_URL = "https://api.filen.io";

export interface FilenDirectCredentials {
  apiKey: string;
  masterKeys: string[];
  baseFolderUUID: string;
  authVersion: 1 | 2 | 3;
}

export interface FilenDirectUploadResult {
  uuid: string;
  name: string;
  size: number;
  path: string;
}

export interface FilenDirectUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Utility functions for buffer/hex conversion
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function concatBuffers(...buffers: (ArrayBuffer | Uint8Array)[]): Uint8Array {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return result;
}

// Convert Uint8Array to ArrayBuffer (for Web Crypto API compatibility)
function toArrayBuffer(data: Uint8Array | ArrayBuffer): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  // Use slice to create a proper ArrayBuffer (avoids SharedArrayBuffer type issues)
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

// Generate UUID v4
function generateUUID(): string {
  return crypto.randomUUID();
}

// Generate random hex string (for encryption key)
function generateRandomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return bufferToHex(array);
}

// Generate random alphanumeric string (for uploadKey, rm)
function generateRandomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join("");
}

class FilenDirectService {
  private credentials: FilenDirectCredentials | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize by fetching credentials from server
   */
  async init(): Promise<void> {
    if (this.credentials) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInit();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async _doInit(): Promise<void> {
    const response = await fetch("/api/filen/session", {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to fetch session" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.credentials) {
      throw new Error(data.error || "Invalid session response");
    }

    this.credentials = {
      apiKey: data.credentials.apiKey,
      masterKeys: data.credentials.masterKeys,
      baseFolderUUID: data.credentials.baseFolderUUID,
      authVersion: data.credentials.authVersion,
    };

    console.log("[FilenDirect] Initialized for:", data.credentials.email);
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.credentials !== null;
  }

  /**
   * Clear credentials (call on logout)
   */
  clear(): void {
    this.credentials = null;
    this.initPromise = null;
  }

  /**
   * SHA-512 hash
   */
  private async sha512(data: ArrayBuffer | Uint8Array): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-512", toArrayBuffer(data));
    return bufferToHex(hash);
  }

  /**
   * SHA-1 hash (for filename hashing in authVersion 1/2)
   */
  private async sha1(data: ArrayBuffer | Uint8Array): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-1", toArrayBuffer(data));
    return bufferToHex(hash);
  }

  /**
   * Hash filename for nameHashed field
   * authVersion 1/2: SHA1(SHA512(name.toLowerCase()))
   */
  private async hashFileName(name: string): Promise<string> {
    const lowerName = name.toLowerCase();
    const encoder = new TextEncoder();
    const nameBytes = encoder.encode(lowerName);

    // SHA512 first
    const sha512Hash = await crypto.subtle.digest("SHA-512", toArrayBuffer(nameBytes));
    const sha512Hex = bufferToHex(sha512Hash);

    // Then SHA1 of the hex string
    const sha1Hash = await crypto.subtle.digest("SHA-1", toArrayBuffer(encoder.encode(sha512Hex)));
    return bufferToHex(sha1Hash);
  }

  /**
   * Encrypt data using AES-256-GCM
   * Returns: IV (12 bytes) + ciphertext + auth tag (16 bytes)
   */
  private async encryptData(data: ArrayBuffer, keyHex: string): Promise<Uint8Array> {
    const keyBytes = hexToBuffer(keyHex);
    const key = await crypto.subtle.importKey(
      "raw",
      toArrayBuffer(keyBytes),
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      data
    );

    // Web Crypto appends auth tag to ciphertext
    return concatBuffers(iv, encrypted);
  }

  /**
   * Encrypt metadata string (version 2 format for compatibility)
   * Format: "002" + base64(iv) + base64(ciphertext + tag)
   */
  private async encryptMetadata(metadata: string, masterKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(metadata);

    // For version 2, we use the master key directly
    // Derive key using PBKDF2 with 1 iteration (matching Filen's implementation)
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      toArrayBuffer(encoder.encode(masterKey)),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const salt = encoder.encode(masterKey);

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: toArrayBuffer(salt),
        iterations: 1,
        hash: "SHA-512",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(data)
    );

    // Format: "002" + base64(iv) + base64(ciphertext+tag)
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));

    return "002" + ivBase64 + encryptedBase64;
  }

  /**
   * Get the ingest URL
   */
  private getIngestUrl(): string {
    return INGEST_URL;
  }

  /**
   * Upload a single chunk to Filen
   */
  private async uploadChunk(params: {
    uuid: string;
    index: number;
    parent: string;
    uploadKey: string;
    encryptedChunk: Uint8Array;
  }): Promise<{ bucket: string; region: string }> {
    if (!this.credentials) throw new Error("Not initialized");

    const { uuid, index, parent, uploadKey, encryptedChunk } = params;

    // Calculate hash of encrypted chunk
    const chunkHash = await this.sha512(encryptedChunk);

    // Build URL params - order matters for checksum!
    const ingestUrl = this.getIngestUrl();
    const urlParamsObj = {
      uuid,
      index: index.toString(),
      parent,
      uploadKey,
      hash: chunkHash,
    };
    const queryParams = new URLSearchParams(urlParamsObj);
    const url = `${ingestUrl}/v3/upload?${queryParams}`;

    // Calculate checksum header (SHA-512 of ALL URL params as JSON)
    // Filen SDK parses URL params back and hashes them - all values are strings
    const checksumData = JSON.stringify(urlParamsObj);
    const checksum = await this.sha512(new TextEncoder().encode(checksumData));

    console.log(`[FilenDirect] Uploading chunk ${index} to ${ingestUrl} (${encryptedChunk.byteLength} bytes)`);
    console.log(`[FilenDirect] Checksum input: ${checksumData}`);
    console.log(`[FilenDirect] Checksum output: ${checksum}`);

    // Use XMLHttpRequest like Filen SDK does (fetch can have issues with binary uploads)
    const result = await new Promise<{ status: boolean; message?: string; data?: { bucket: string; region: string } }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", `Bearer ${this.credentials!.apiKey}`);
      xhr.setRequestHeader("checksum", checksum);  // lowercase to match CORS headers

      xhr.onload = () => {
        try {
          const response = JSON.parse(xhr.responseText);
          console.log(`[FilenDirect] Chunk ${index} response:`, response);
          resolve(response);
        } catch (e) {
          console.error(`[FilenDirect] Failed to parse response:`, xhr.responseText);
          reject(new Error(`Invalid response: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        console.error(`[FilenDirect] XHR error for chunk ${index}:`, xhr.status, xhr.statusText);
        reject(new Error(`Network error: ${xhr.statusText || 'Connection failed'}`));
      };

      xhr.ontimeout = () => {
        reject(new Error("Upload timeout"));
      };

      xhr.timeout = 300000; // 5 minutes
      xhr.send(toArrayBuffer(encryptedChunk));
    });
    if (!result.status) {
      throw new Error(result.message || "Chunk upload failed");
    }

    return {
      bucket: result.data?.bucket || "filen-1",
      region: result.data?.region || "de-1",
    };
  }

  /**
   * Finalize upload after all chunks
   */
  private async finishUpload(params: {
    uuid: string;
    name: string;
    size: number;
    chunks: number;
    mimeType: string;
    encryptionKey: string;
    uploadKey: string;
    rm: string;
    parent: string;
    lastModified: number;
  }): Promise<void> {
    if (!this.credentials) throw new Error("Not initialized");

    const masterKey = this.credentials.masterKeys[0];
    if (!masterKey) throw new Error("No master key available");

    // Encrypt individual fields
    const nameEncrypted = await this.encryptMetadata(params.name, masterKey);
    const sizeEncrypted = await this.encryptMetadata(params.size.toString(), masterKey);
    const mimeEncrypted = await this.encryptMetadata(params.mimeType, masterKey);

    // Build and encrypt file metadata
    const fileMetadata = JSON.stringify({
      name: params.name,
      size: params.size,
      mime: params.mimeType,
      key: params.encryptionKey,
      lastModified: params.lastModified,
    });
    const metadataEncrypted = await this.encryptMetadata(fileMetadata, masterKey);

    // Hash filename
    const nameHashed = await this.hashFileName(params.name);

    const body = {
      uuid: params.uuid,
      name: nameEncrypted,
      nameHashed,
      size: sizeEncrypted,
      chunks: params.chunks,
      mime: mimeEncrypted,
      rm: params.rm,
      metadata: metadataEncrypted,
      version: 2, // Using version 2 encryption format
      uploadKey: params.uploadKey,
    };

    const response = await fetch(`${API_URL}/v3/upload/done`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.credentials.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload finalization failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    if (!result.status) {
      throw new Error(result.message || "Upload finalization failed");
    }
  }

  /**
   * Upload a file to Filen
   */
  async uploadFile(
    file: File,
    targetPath: string,
    options?: {
      onProgress?: (progress: FilenDirectUploadProgress) => void;
      abortSignal?: AbortSignal;
    }
  ): Promise<FilenDirectUploadResult> {
    await this.init();
    if (!this.credentials) throw new Error("Not initialized");

    // Check for abort before starting
    if (options?.abortSignal?.aborted) {
      throw new Error("Upload aborted");
    }

    // Generate upload parameters
    const uuid = generateUUID();
    const encryptionKey = generateRandomHex(32); // 64 hex chars = 32 bytes
    const uploadKey = generateRandomString(32);
    const rm = generateRandomString(32);
    const parent = this.credentials.baseFolderUUID;
    const lastModified = file.lastModified;

    // Calculate chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE) || 1;
    let uploadedBytes = 0;

    console.log(`[FilenDirect] Starting upload: ${file.name} (${file.size} bytes, ${totalChunks} chunks)`);

    // Upload each chunk
    for (let i = 0; i < totalChunks; i++) {
      // Check for abort
      if (options?.abortSignal?.aborted) {
        throw new Error("Upload aborted");
      }

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunkBlob = file.slice(start, end);
      const chunkData = await chunkBlob.arrayBuffer();

      // Encrypt chunk
      const encryptedChunk = await this.encryptData(chunkData, encryptionKey);

      // Upload chunk
      await this.uploadChunk({
        uuid,
        index: i,
        parent,
        uploadKey,
        encryptedChunk,
      });

      uploadedBytes += chunkData.byteLength;

      // Report progress
      if (options?.onProgress) {
        options.onProgress({
          loaded: uploadedBytes,
          total: file.size,
          percentage: Math.round((uploadedBytes / file.size) * 100),
        });
      }

      console.log(`[FilenDirect] Chunk ${i + 1}/${totalChunks} uploaded`);
    }

    // Finalize upload
    await this.finishUpload({
      uuid,
      name: file.name,
      size: file.size,
      chunks: totalChunks,
      mimeType: file.type || "application/octet-stream",
      encryptionKey,
      uploadKey,
      rm,
      parent,
      lastModified,
    });

    console.log(`[FilenDirect] Upload complete: ${file.name}`);

    return {
      uuid,
      name: file.name,
      size: file.size,
      path: `${targetPath}/${file.name}`,
    };
  }
}

// Singleton instance
export const filenDirect = new FilenDirectService();

export default filenDirect;
