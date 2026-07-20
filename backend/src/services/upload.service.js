import { BlobServiceClient } from "@azure/storage-blob";
import {
  createUploadedFile,
  findUploadedFileById,
  findUploadedFilesByUser
} from "../repositories/upload.repository.js";
import { createWithGeneratedId } from "../utils/idGenerator.js";
import { slugify } from "../utils/slugify.js";
import { config } from "../utils/config.js";

export class UploadServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function uploadMissionProof(fileBuffer, meta, userId) {
  if (!config.azureStorageConnectionString) {
    throw new UploadServiceError(503, "File upload storage is not configured.");
  }

  const containerName = config.azureStorageContainerMissionProofs;
  const containerClient = BlobServiceClient.fromConnectionString(
    config.azureStorageConnectionString
  ).getContainerClient(containerName);
  await containerClient.createIfNotExists();

  const blobName = `${userId}/${Date.now()}-${slugify(meta.originalName || "upload")}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(fileBuffer, {
    blobHTTPHeaders: { blobContentType: meta.mimeType }
  });

  const fileUrl = `${config.azureStorageBlobBaseUrl}/${containerName}/${blobName}`;

  return createWithGeneratedId("uploadedFile", "UPL", (id) =>
    createUploadedFile({
      id,
      userId,
      containerName,
      blobName,
      fileUrl,
      mimeType: meta.mimeType,
      fileSize: meta.fileSize,
      purpose: "MISSION_PROOF"
    })
  );
}

export async function getUploadById(id, user) {
  const upload = await findUploadedFileById(id);
  if (!upload) {
    throw new UploadServiceError(404, "Upload not found.");
  }

  if (user.role !== "ADMIN" && upload.userId !== user.id) {
    throw new UploadServiceError(403, "You do not have permission to view this upload.");
  }

  return upload;
}

export function listMyUploads(userId) {
  return findUploadedFilesByUser(userId);
}
