import { supabase } from "@/integrations/supabase/client";

export async function uploadUserFile(
  bucket: "photos" | "resumes",
  userId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

export async function signedUrl(
  bucket: "photos" | "resumes",
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function openUserFile(
  bucket: "photos" | "resumes",
  path: string | null | undefined,
) {
  if (!path) return;
  const url = await signedUrl(bucket, path);
  if (!url) throw new Error("Could not generate file link");
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function downloadUserFile(
  bucket: "photos" | "resumes",
  path: string | null | undefined,
  namePrefix: string,
) {
  if (!path) return;
  const url = await signedUrl(bucket, path);
  if (!url) throw new Error("Could not generate file download URL");

  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch file for download");
  
  const blob = await response.blob();
  const ext = path.split(".").pop()?.split("?")[0] ?? (bucket === "resumes" ? "pdf" : "jpg");
  const cleanName = namePrefix.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${cleanName}_${bucket === "photos" ? "photo" : "resume"}.${ext}`;

  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(blobUrl);
}