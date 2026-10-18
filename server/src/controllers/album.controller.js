import * as svc from '../services/album.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.list(req.user, req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});
export const getById = asyncHandler(async (req, res) => sendSuccess(res, await svc.getById(req.resource._id)));
export const create = asyncHandler(async (req, res) =>
  sendCreated(res, await svc.create(req.user, req.body, req.files || []), 'Đã tạo album'),
);
export const update = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.update(req.resource, req.body), 'Đã cập nhật album'),
);
export const addPhotos = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.addPhotos(req.resource, req.files), 'Đã thêm ảnh'),
);
export const setCaption = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.setCaption(req.resource, req.params.photoId, req.body.caption), 'Đã cập nhật chú thích'),
);
export const removePhoto = asyncHandler(async (req, res) => {
  await svc.removePhoto(req.resource, req.params.photoId);
  sendSuccess(res, null, 'Đã xoá ảnh');
});
export const remove = asyncHandler(async (req, res) => {
  await svc.remove(req.resource);
  sendSuccess(res, null, 'Đã xoá album');
});
