import { Album } from '../models/Album.js';
import { Class } from '../models/Class.js';
import { Student } from '../models/Student.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildPagination } from '../utils/paginate.js';
import { toDateKey } from '../utils/date.js';
import { ROLES } from '../config/constants.js';
import * as uploadService from './upload.service.js';

const FOLDER = 'kindercare/albums';
const MAX_PHOTOS = 100;

// Lớp mà user được xem album: T = lớp phụ trách, PH = lớp của con, A/P = tất cả (null)
async function visibleClassIds(user) {
  if (user.role === ROLES.TEACHER) {
    return (await Class.find({ teachers: user.id }).select('_id').lean()).map((c) => c._id);
  }
  if (user.role === ROLES.PARENT) {
    const kids = await Student.find({ parents: user.id, status: 'active', class: { $ne: null } }).select('class').lean();
    return [...new Set(kids.map((k) => k.class.toString()))];
  }
  return null;
}

export async function list(user, query) {
  const pg = parsePagination(query, { defaultSort: '-date', defaultLimit: 12 });
  const filter = {};
  const visible = await visibleClassIds(user);
  if (query.class) filter.class = query.class; // quyền đã kiểm ở checkOwnership
  else if (visible) filter.class = { $in: visible };
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = toDateKey(query.from);
    if (query.to) filter.date.$lte = toDateKey(query.to);
  }

  const [docs, total] = await Promise.all([
    Album.find(filter).populate('class', 'name').populate('createdBy', 'fullName avatar').sort(pg.sort).skip(pg.skip).limit(pg.limit).lean(),
    Album.countDocuments(filter),
  ]);
  // Danh sách chỉ cần ảnh bìa + số ảnh
  const items = docs.map(({ photos, ...a }) => ({ ...a, cover: photos[0]?.url || null, photoCount: photos.length }));
  return { items, pagination: buildPagination(pg, total) };
}

export async function getById(id) {
  const a = await Album.findById(id).populate('class', 'name').populate('createdBy', 'fullName avatar');
  if (!a) throw ApiError.notFound('Không tìm thấy album');
  return a;
}

export async function create(user, data, files = []) {
  const cls = await Class.findById(data.class).select('isActive');
  if (!cls || !cls.isActive) throw ApiError.notFound('Không tìm thấy lớp');
  if (files.length > MAX_PHOTOS) throw ApiError.badRequest(`Tối đa ${MAX_PHOTOS} ảnh / album`);

  const photos = files.length ? await uploadService.uploadMany(files, { folder: FOLDER }) : [];
  const album = await Album.create({
    ...data,
    date: toDateKey(data.date || new Date()),
    photos: photos.map((p) => ({ url: p.url, publicId: p.publicId })),
    createdBy: user.id,
  });
  return getById(album._id);
}

export async function update(doc, data) {
  if (data.date) data.date = toDateKey(data.date);
  Object.assign(doc, data);
  await doc.save();
  return getById(doc._id);
}

export async function addPhotos(doc, files) {
  if (doc.photos.length + files.length > MAX_PHOTOS) {
    throw ApiError.badRequest(`Album chỉ chứa tối đa ${MAX_PHOTOS} ảnh (hiện ${doc.photos.length})`);
  }
  const uploaded = await uploadService.uploadMany(files, { folder: FOLDER });
  doc.photos.push(...uploaded.map((p) => ({ url: p.url, publicId: p.publicId })));
  await doc.save();
  return getById(doc._id);
}

export async function setCaption(doc, photoId, caption) {
  const photo = doc.photos.id(photoId);
  if (!photo) throw ApiError.notFound('Không tìm thấy ảnh');
  photo.caption = caption;
  await doc.save();
  return photo;
}

export async function removePhoto(doc, photoId) {
  const photo = doc.photos.id(photoId);
  if (!photo) throw ApiError.notFound('Không tìm thấy ảnh');
  const publicId = photo.publicId;
  photo.deleteOne();
  await doc.save();
  await uploadService.deleteByPublicId(publicId);
}

export async function remove(doc) {
  const publicIds = doc.photos.map((p) => p.publicId).filter(Boolean);
  await doc.deleteOne();
  await Promise.all(publicIds.map((id) => uploadService.deleteByPublicId(id)));
}
