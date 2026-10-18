import { AuditLog } from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildPagination } from '../utils/paginate.js';

export async function list(query) {
  const pg = parsePagination(query);
  const filter = {};
  if (query.user) filter.user = query.user;
  if (query.action) filter.action = query.action;
  if (query.resource) filter.resource = query.resource;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = query.from;
    if (query.to) filter.createdAt.$lte = query.to;
  }
  const [items, total] = await Promise.all([
    AuditLog.find(filter).select('-payload').populate('user', 'fullName email role').sort(pg.sort).skip(pg.skip).limit(pg.limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  return { items, pagination: buildPagination(pg, total) };
}

export async function getById(id) {
  const log = await AuditLog.findById(id).populate('user', 'fullName email role');
  if (!log) throw ApiError.notFound('Không tìm thấy log');
  return log;
}

export const actions = () => AuditLog.distinct('action');
