import { signAssets } from '../services/storage.js';

// Lớp mỏng để service emit Socket.IO mà không phụ thuộc io đã khởi tạo hay chưa (GĐ7.1 gọi setIO)
let io = null;

export const setIO = (instance) => {
  io = instance;
};
export const getIO = () => io;

export const roomUser = (userId) => `user:${userId}`;
export const roomClass = (classId) => `class:${classId}`;
export const roomRole = (role) => `role:${role}`;

function emit(rooms, event, payload) {
  if (!io || !rooms.length) return;
  io.to(rooms).emit(event, signAssets(payload));
}

export const emitToUsers = (userIds, event, payload) => emit(userIds.map((id) => roomUser(id)), event, payload);
export const emitToClass = (classId, event, payload) => emit([roomClass(classId)], event, payload);
export const emitToRole = (role, event, payload) => emit([roomRole(role)], event, payload);
export const emitToAll = (event, payload) => io?.emit(event, signAssets(payload));
