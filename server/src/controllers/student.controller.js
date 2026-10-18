import * as svc from '../services/student.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { items, pagination } = await svc.list(req.user, req.query);
  sendSuccess(res, items, 'Thành công', { pagination });
});

export const myChildren = asyncHandler(async (req, res) => sendSuccess(res, await svc.myChildren(req.user.id)));
export const getById = asyncHandler(async (req, res) => sendSuccess(res, await svc.getById(req.params.id)));

export const create = asyncHandler(async (req, res) =>
  sendCreated(res, await svc.create(req.body), 'Tạo hồ sơ học sinh thành công'),
);
export const update = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.update(req.params.id, req.body), 'Cập nhật thành công'),
);
export const setParents = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.setParents(req.params.id, req.body.parents), 'Đã cập nhật phụ huynh'),
);
export const setStatus = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.setStatus(req.params.id, req.body.status), 'Đã cập nhật trạng thái'),
);
export const updateAvatar = asyncHandler(async (req, res) =>
  sendSuccess(res, await svc.updateAvatar(req.params.id, req.file), 'Đã cập nhật ảnh đại diện'),
);
