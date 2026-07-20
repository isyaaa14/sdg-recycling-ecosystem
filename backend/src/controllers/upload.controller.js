import { uploadMissionProof, getUploadById, listMyUploads, UploadServiceError } from "../services/upload.service.js";

function handleError(error, response) {
  if (error instanceof UploadServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function uploadMissionProofHandler(request, response) {
  try {
    if (!request.file) {
      return response.status(400).json({ error: { message: "No file provided or unsupported file type." } });
    }

    const upload = await uploadMissionProof(
      request.file.buffer,
      {
        mimeType: request.file.mimetype,
        fileSize: request.file.size,
        originalName: request.file.originalname
      },
      request.user.id
    );
    return response.status(201).json({ data: { upload } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function getUploadHandler(request, response) {
  try {
    const upload = await getUploadById(request.params.id, request.user);
    return response.status(200).json({ data: { upload } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listMyUploadsHandler(request, response) {
  try {
    const uploads = await listMyUploads(request.user.id);
    return response.status(200).json({ data: { uploads } });
  } catch (error) {
    return handleError(error, response);
  }
}
