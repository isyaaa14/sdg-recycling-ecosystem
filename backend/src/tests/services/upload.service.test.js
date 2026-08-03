import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const mockCreateIfNotExists = jest.fn().mockResolvedValue(undefined);
const mockUploadData = jest.fn().mockResolvedValue(undefined);
const mockGetBlockBlobClient = jest.fn(() => ({ uploadData: mockUploadData }));
const mockGetContainerClient = jest.fn(() => ({
  createIfNotExists: mockCreateIfNotExists,
  getBlockBlobClient: mockGetBlockBlobClient
}));
const mockFromConnectionString = jest.fn(() => ({ getContainerClient: mockGetContainerClient }));
const mockGenerateBlobSASQueryParameters = jest.fn(() => ({ toString: () => "sas=token" }));

jest.unstable_mockModule("@azure/storage-blob", () => ({
  BlobServiceClient: { fromConnectionString: mockFromConnectionString },
  BlobSASPermissions: { parse: jest.fn(() => "r") },
  generateBlobSASQueryParameters: mockGenerateBlobSASQueryParameters,
  StorageSharedKeyCredential: jest.fn().mockImplementation(function StorageSharedKeyCredential() {})
}));

jest.unstable_mockModule("../../utils/config.js", () => ({
  config: {
    azureStorageConnectionString: "AccountName=testaccount;AccountKey=dGVzdGtleQ==;EndpointSuffix=core.windows.net",
    azureStorageContainerMissionProofs: "mission-proofs",
    azureStorageContainerContentImages: "content-images",
    azureStorageContainerMissionImages: "mission-images",
    azureStorageContainerRecyclingProofs: "recycling-proofs",
    azureStorageContainerRewardImages: "reward-images",
    azureStorageBlobBaseUrl: "https://fake.blob.core.windows.net"
  }
}));

const mockCreateUploadedFile = jest.fn();
const mockFindUploadedFileById = jest.fn();
const mockFindUploadedFilesByUser = jest.fn();
jest.unstable_mockModule("../../repositories/upload.repository.js", () => ({
  createUploadedFile: mockCreateUploadedFile,
  findUploadedFileById: mockFindUploadedFileById,
  findUploadedFilesByUser: mockFindUploadedFilesByUser
}));

const mockCreateWithGeneratedId = jest.fn((model, prefix, createFn) => createFn(`${prefix}-TEST`));
jest.unstable_mockModule("../../utils/idGenerator.js", () => ({
  createWithGeneratedId: mockCreateWithGeneratedId
}));

const {
  uploadMissionProof,
  uploadContentImage,
  uploadMissionImage,
  uploadRecyclingProof,
  uploadRewardImage,
  createRecyclingProofReadUrl
} = await import("../../services/upload.service.js");

const uploadFunctions = { uploadMissionProof, uploadContentImage, uploadMissionImage, uploadRecyclingProof, uploadRewardImage };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("upload purpose functions", () => {
  it.each([
    ["uploadMissionProof", "mission-proofs", "MISSION_PROOF"],
    ["uploadContentImage", "content-images", "CONTENT_IMAGE"],
    ["uploadMissionImage", "mission-images", "MISSION_IMAGE"],
    ["uploadRecyclingProof", "recycling-proofs", "RECYCLING_PROOF"],
    ["uploadRewardImage", "reward-images", "REWARD_IMAGE"]
  ])("%s uses container %s and purpose %s", async (fnName, expectedContainer, expectedPurpose) => {
    mockCreateUploadedFile.mockResolvedValue({ id: "UPL-TEST", containerName: expectedContainer, purpose: expectedPurpose });

    const fn = uploadFunctions[fnName];
    const result = await fn(
      Buffer.from("test"),
      { originalName: "photo.jpg", mimeType: "image/jpeg", fileSize: 100 },
      "USR001"
    );

    expect(mockGetContainerClient).toHaveBeenCalledWith(expectedContainer);
    expect(mockCreateUploadedFile).toHaveBeenCalledWith(
      expect.objectContaining({ containerName: expectedContainer, purpose: expectedPurpose, userId: "USR001" })
    );
    expect(result.purpose).toBe(expectedPurpose);
  });
});

describe("createRecyclingProofReadUrl", () => {
  it("creates a SAS-signed read URL when Azure credentials are configured", () => {
    const upload = { containerName: "recycling-proofs", blobName: "USR001/123-photo.jpg", fileUrl: "https://fallback" };

    const url = createRecyclingProofReadUrl(upload);

    expect(url).toContain("https://fake.blob.core.windows.net/recycling-proofs/");
    expect(url).toContain("sas=token");
  });
});
