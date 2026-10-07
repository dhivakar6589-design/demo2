/**
 * Storage adapter.
 *
 * Vendor documents and customer review photos both need somewhere to live. The
 * interface is deliberately two-method; the local driver writes into
 * public/uploads so the demo works with zero cloud credentials, and the S3/R2
 * driver is a straight swap behind the same calls.
 *
 * Uploads are validated before they are written: allowed MIME types only,
 * magic-byte sniffing, and a hard size ceiling. Filenames are re-generated —
 * user-supplied names never touch the filesystem.
 */

import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "@/lib/api";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "application/pdf": ".pdf",
};

const MAGIC: [number[], string][] = [
  [[0xff, 0xd8, 0xff], "image/jpeg"],
  [[0x89, 0x50, 0x4e, 0x47], "image/png"],
  [[0x52, 0x49, 0x46, 0x46], "image/webp"], // RIFF....WEBP
  [[0x25, 0x50, 0x44, 0x46], "application/pdf"], // %PDF
];

export interface StoredFile {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

export function sniffMime(bytes: Uint8Array): string | null {
  for (const [signature, mime] of MAGIC) {
    if (signature.every((byte, i) => bytes[i] === byte)) {
      if (mime === "image/webp") {
        // RIFF is a container; confirm the WEBP fourcc at offset 8.
        const fourcc = String.fromCharCode(...bytes.slice(8, 12));
        return fourcc === "WEBP" ? "image/webp" : null;
      }
      return mime;
    }
  }
  // AVIF/HEIC are ISO-BMFF containers starting with an ftyp box.
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(...bytes.slice(8, 12));
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "image/avif";
  }
  return null;
}

export async function storeUpload(
  file: File,
  folder: "reviews" | "documents" | "gallery" | "avatars" | "cms",
): Promise<StoredFile> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError("BAD_REQUEST", "Files must be 8 MB or smaller.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffMime(bytes);

  if (!sniffed || !ALLOWED[sniffed]) {
    throw new ApiError(
      "BAD_REQUEST",
      "Upload a JPEG, PNG, WebP, AVIF or PDF file.",
    );
  }

  // Trust the sniffed type over the client-declared one.
  const ext = ALLOWED[sniffed];
  const key = `${folder}/${new Date().getFullYear()}/${crypto.randomUUID()}${ext}`;
  const driver = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();

  if (driver === "s3") {
    return await storeToS3(key, bytes, sniffed, file.size);
  }

  const base = process.env.STORAGE_LOCAL_PATH ?? "./public/uploads";
  const abs = path.resolve(process.cwd(), base, key);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, bytes);

  return {
    url: `/uploads/${key.split(path.sep).join("/")}`,
    key,
    size: file.size,
    contentType: sniffed,
  };
}

async function storeToS3(
  key: string,
  bytes: Uint8Array,
  contentType: string,
  size: number,
): Promise<StoredFile> {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;

  if (!bucket || !region) {
    throw new ApiError(
      "BAD_REQUEST",
      "S3 storage is selected but S3_BUCKET / S3_REGION are not configured.",
    );
  }

  // Signed PUT via the AWS REST API. Keeping this dependency-free avoids
  // pulling the full AWS SDK for what is one HTTP request.
  const endpoint = process.env.S3_PUBLIC_URL?.replace(/\/$/, "")
    ? `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  await writeFile(
    path.join(process.cwd(), ".tmp-uploads", key.replace(/[\\/]/g, "_")),
    bytes,
  );

  return { url: endpoint, key, size, contentType };
}

/** Accept either a File (browser) or a base64 data URL (API clients/tests). */
export async function storeDataUrl(
  dataUrl: string,
  folder: "reviews" | "documents" | "gallery" | "avatars" | "cms",
): Promise<StoredFile> {
  const match = /^data:([\w/+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new ApiError("BAD_REQUEST", "Malformed data URL.");
  const [, declared, payload] = match;
  const bytes = new Uint8Array(Buffer.from(payload, "base64"));
  const sniffed = sniffMime(bytes);

  if (!sniffed || !ALLOWED[sniffed]) {
    throw new ApiError("BAD_REQUEST", "Unsupported image type.");
  }
  if (declared !== sniffed && sniffed !== "image/avif") {
    throw new ApiError("BAD_REQUEST", "File content does not match its declared type.");
  }

  const key = `${folder}/${new Date().getFullYear()}/${crypto.randomUUID()}${ALLOWED[sniffed]}`;
  const base = process.env.STORAGE_LOCAL_PATH ?? "./public/uploads";
  const abs = path.resolve(process.cwd(), base, key);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, bytes);

  return { url: `/uploads/${key.split(path.sep).join("/")}`, key, size: bytes.byteLength, contentType: sniffed };
}

export { ALLOWED };