import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const UPLOAD_BUCKET = process.env.SUPABASE_PRODUCT_MEDIA_BUCKET ?? "product-media";
const MAX_UPLOAD_BYTES = Number(process.env.SUPABASE_PRODUCT_MEDIA_MAX_BYTES ?? 500 * 1024 * 1024);
const MAX_UPLOAD_MB = Math.max(1, Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024)));

export const runtime = "nodejs";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  const ownerEmail = (formData.get("ownerEmail") as string | null)?.trim().toLowerCase();
  const mediaType = (formData.get("mediaType") as string | null)?.trim().toLowerCase();

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!ownerEmail) {
    return NextResponse.json({ error: "ownerEmail is required" }, { status: 400 });
  }

  const validMediaType = mediaType === "video" ? "video" : "image";

  if (validMediaType === "image" && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  if (validMediaType === "video" && !file.type.startsWith("video/")) {
    return NextResponse.json({ error: "Only video files are allowed" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `File is too large. Maximum allowed is ${MAX_UPLOAD_MB}MB.`,
      },
      { status: 413 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).slice(2, 10);
  const filePath = `${ownerEmail}/${validMediaType}/${timestamp}-${randomPart}-${sanitizeFilename(file.name)}`;

  const { error: uploadError } = await supabaseServer.storage
    .from(UPLOAD_BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    const message = uploadError.message.toLowerCase();

    if (uploadError.message.toLowerCase().includes("maximum allowed size")) {
      return NextResponse.json(
        {
          error: `File is too large. Maximum allowed is ${MAX_UPLOAD_MB}MB.`,
        },
        { status: 413 }
      );
    }

    if (message.includes("bucket") && message.includes("not found")) {
      return NextResponse.json(
        {
          error:
            `Bucket '${UPLOAD_BUCKET}' not found. Create it manually in Supabase Storage as a public bucket.`,
        },
        { status: 500 }
      );
    }

    if (message.includes("row-level security") || message.includes("permission denied")) {
      return NextResponse.json(
        {
          error:
            "Upload blocked by permissions. Check that SUPABASE_SERVICE_ROLE_KEY is set to the Service Role key (not anon key), then restart the app.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: publicData } = supabaseServer.storage
    .from(UPLOAD_BUCKET)
    .getPublicUrl(filePath);

  return NextResponse.json({
    data: {
      bucket: UPLOAD_BUCKET,
      path: filePath,
      publicUrl: publicData.publicUrl,
      mediaType: validMediaType,
    },
  });
}
