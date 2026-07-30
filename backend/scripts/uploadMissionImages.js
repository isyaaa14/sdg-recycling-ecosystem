import fs from "node:fs/promises";
import { BlobServiceClient } from "@azure/storage-blob";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const storageConnectionString =
  process.env.AZURE_STORAGE_CONNECTION_STRING ??
  "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://localhost:10000/devstoreaccount1;";

const blobBaseUrl =
  process.env.AZURE_STORAGE_BLOB_BASE_URL ??
  "http://192.168.0.77:10000/devstoreaccount1";

const containerName = process.env.AZURE_STORAGE_CONTAINER_MISSION_IMAGES ?? "mission-images";

const missionImages = [
  {
    missionId: "MIS001",
    filePath: "C:/Users/User/Desktop/Bottle Waste.jpg",
    blobName: "MIS001/bottle-waste.jpg"
  },
  {
    missionId: "MIS002",
    filePath: "C:/Users/User/Desktop/Daily Recycle.jpg",
    blobName: "MIS002/daily-recycle.jpg"
  },
  {
    missionId: "MIS003",
    filePath: "C:/Users/User/Desktop/E-Waste.jpg",
    blobName: "MIS003/e-waste.jpg"
  }
];

async function main() {
  const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists({ access: "blob" });
  await containerClient.setAccessPolicy("blob");

  for (const missionImage of missionImages) {
    const fileBuffer = await fs.readFile(missionImage.filePath);
    const blockBlobClient = containerClient.getBlockBlobClient(missionImage.blobName);

    await blockBlobClient.uploadData(fileBuffer, {
      blobHTTPHeaders: { blobContentType: "image/jpeg" }
    });

    const imageUrl = `${blobBaseUrl}/${containerName}/${missionImage.blobName}`;

    await prisma.mission.update({
      where: { id: missionImage.missionId },
      data: { imageUrl }
    });

    console.log(`${missionImage.missionId} -> ${imageUrl}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
