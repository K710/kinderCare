import * as uploadService from '../services/upload.service.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const FOLDER = 'misc';
// Client chỉ cần link ký (url); gửi lại url này server tự quy về asset ref
const pick = ({ url, key }) => ({ url, key });

export const image = asyncHandler(async (req, res) =>
  sendSuccess(res, pick(await uploadService.uploadBuffer(req.file.buffer, { folder: FOLDER, mimetype: req.file.mimetype })), 'Upload thành công'),
);
export const images = asyncHandler(async (req, res) =>
  sendSuccess(res, (await uploadService.uploadMany(req.files, { folder: FOLDER })).map(pick), 'Upload thành công'),
);
