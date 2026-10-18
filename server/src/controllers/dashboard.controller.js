import * as svc from '../services/dashboard.service.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const principal = asyncHandler(async (req, res) => sendSuccess(res, await svc.principal()));
export const teacher = asyncHandler(async (req, res) => sendSuccess(res, await svc.teacher(req.user)));
export const parent = asyncHandler(async (req, res) => sendSuccess(res, await svc.parent(req.user)));
export const admin = asyncHandler(async (req, res) => sendSuccess(res, await svc.admin()));
