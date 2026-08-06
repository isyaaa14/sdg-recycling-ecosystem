import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential
} from "@azure/storage-blob";
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

async function uploadToBlobStorage(fileBuffer, meta, userId, { containerName, purpose }) {
  if (!config.azureStorageConnectionString) {
    throw new UploadServiceError(503, "File upload storage is not configured.");
  }
  if (!containerName) {
    throw new UploadServiceError(503, "File upload container is not configured.");
  }

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
      purpose
    })
  );
}

export function uploadMissionProof(fileBuffer, meta, userId) {
  return uploadToBlobStorage(fileBuffer, meta, userId, {
    containerName: config.azureStorageContainerMissionProofs,
    purpose: "MISSION_PROOF"
  });
}

export function uploadContentImage(fileBuffer, meta, userId) {
  return uploadToBlobStorage(fileBuffer, meta, userId, {
    containerName: config.azureStorageContainerContentImages,
    purpose: "CONTENT_IMAGE"
  });
}

export function uploadMissionImage(fileBuffer, meta, userId) {
  return uploadToBlobStorage(fileBuffer, meta, userId, {
    containerName: config.azureStorageContainerMissionImages,
    purpose: "MISSION_IMAGE"
  });
}

export function uploadRecyclingProof(fileBuffer, meta, userId) {
  return uploadToBlobStorage(fileBuffer, meta, userId, {
    containerName: config.azureStorageContainerRecyclingProofs,
    purpose: "RECYCLING_PROOF"
  });
}

export function uploadRewardImage(fileBuffer, meta, userId) {
  return uploadToBlobStorage(fileBuffer, meta, userId, {
    containerName: config.azureStorageContainerRewardImages,
    purpose: "REWARD_IMAGE"
  });
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

function getSharedKeyCredential() {
  if (!config.azureStorageConnectionString) {
    return null;
  }

  const parts = Object.fromEntries(
    config.azureStorageConnectionString
      .split(";")
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf("=");
        return [part.slice(0, separatorIndex), part.slice(separatorIndex + 1)];
      })
  );

  if (!parts.AccountName || !parts.AccountKey) {
    return null;
  }

  return new StorageSharedKeyCredential(parts.AccountName, parts.AccountKey);
}

function blobUrl(containerName, blobName) {
  const encodedBlobName = blobName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${config.azureStorageBlobBaseUrl}/${containerName}/${encodedBlobName}`;
}

function createBlobReadUrl(upload, expiresInMinutes = 60) {
  const credential = getSharedKeyCredential();
  if (!credential || !config.azureStorageBlobBaseUrl || !upload?.containerName || !upload?.blobName) {
    return upload?.fileUrl ?? null;
  }

  const startsOn = new Date(Date.now() - 5 * 60 * 1000);
  const expiresOn = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: upload.containerName,
      blobName: upload.blobName,
      permissions: BlobSASPermissions.parse("r"),
      startsOn,
      expiresOn
    },
    credential
  ).toString();

  return `${blobUrl(upload.containerName, upload.blobName)}?${sas}`;
}

export function createMissionProofReadUrl(upload, expiresInMinutes = 60) {
  return createBlobReadUrl(upload, expiresInMinutes);
}

export function createRecyclingProofReadUrl(upload, expiresInMinutes = 60) {
  return createBlobReadUrl(upload, expiresInMinutes);
}

export function createRewardImageReadUrl(upload, expiresInMinutes = 60) {
  return createBlobReadUrl(upload, expiresInMinutes);
}
