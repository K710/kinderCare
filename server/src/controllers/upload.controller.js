import * as uploadService from '../services/upload.service.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const FOLDER = 'kindercare/misc';

export const image = asyncHandler(async (req, res) =>
  sendSuccess(res, await uploadService.uploadBuffer(req.file.buffer, { folder: FOLDER }), 'Upload thành công'),
);
export const images = asyncHandler(async (req, res) =>
  sendSuccess(res, await uploadService.uploadMany(req.files, { folder: FOLDER }), 'Upload thành công'),
);
