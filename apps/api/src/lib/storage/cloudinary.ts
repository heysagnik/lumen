import { v2 as cloudinary } from "cloudinary";

cloudinary.config(true);

export interface UploadedFile {
  url: string;
  publicId: string;
}

export async function uploadDocument(buffer: Buffer, filename: string): Promise<UploadedFile> {
  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "documents",
        filename_override: filename,
        use_filename: true,
        unique_filename: true,
      },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve(uploaded);
      },
    );
    stream.end(buffer);
  });

  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteDocument(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
}
