import * as authService from '../services/auth.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { REFRESH_COOKIE } from '../config/constants.js';
import { durationToMs } from '../utils/jwt.js';

// Refresh token nằm trong cookie httpOnly, client JS không đọc được. sameSite/secure cấu hình qua env.
const cookieBase = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: '/api/v1/auth',
};

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, { ...cookieBase, maxAge: durationToMs(env.JWT_REFRESH_EXPIRES) });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, cookieBase);
}

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  setRefreshCookie(res, refreshToken);
  sendSuccess(res, { user, accessToken }, 'Đăng nhập thành công');
});

export const refresh = asyncHandler(async (req, res) => {
  // Ưu tiên cookie, dự phòng body (mobile/webview không giữ cookie)
  const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
  const { user, accessToken, refreshToken } = await authService.refresh(token);
  setRefreshCookie(res, refreshToken);
  sendSuccess(res, { user, accessToken }, 'Làm mới phiên thành công');
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
  await authService.logout(req.user.id, token);
  clearRefreshCookie(res);
  sendSuccess(res, null, 'Đăng xuất thành công');
});

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  sendCreated(res, user, 'Tạo tài khoản thành công');
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  sendSuccess(res, user);
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateMe(req.user.id, req.body);
  sendSuccess(res, user, 'Cập nhật thành công');
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  clearRefreshCookie(res);
  sendSuccess(res, null, 'Đổi mật khẩu thành công, vui lòng đăng nhập lại');
});
