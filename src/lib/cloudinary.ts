import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

// Prescription images upload through the "robakeye-prescriptions" preset,
// which MUST be configured with delivery type = "private" in the Cloudinary
// dashboard (Milestone 1 step) — this makes the asset unreachable by a
// guessed/public URL, which NDPA 2023 treats prescription images as
// sensitive personal health data under.
export function getSignedPrescriptionUrl(publicId: string, format: string = "jpg") {
  return cloudinary.utils.private_download_url(publicId, format, {
    type: "private",
    expires_at: Math.floor(Date.now() / 1000) + 60 * 10, // 10-minute signed link
  });
}

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

// Signed direct-upload parameters for the browser to POST straight to
// Cloudinary (never through our server — avoids holding a 10MB file in a
// serverless function). type: "private" is signed into the request itself
// so it can't be tampered with client-side into a public upload.
export function getPrescriptionUploadSignature(folder: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { timestamp, folder, type: "private" as const };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!,
  );
  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
  };
}

// Product images are public (catalogue pages serve them directly) — no
// "type: private" baked in, unlike the prescription signature above.
export function getProductImageUploadSignature(folder: string = "robakeye-products") {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!,
  );
  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
  };
}
