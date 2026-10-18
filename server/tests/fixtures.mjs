// Dữ liệu mẫu dùng chung: admin, principal, 2 GV, 2 PH, 1 năm học, 2 lớp, 3 bé
// c1 (GV t1): s1 (PH p1), s2 (PH p2)   |   c2 (GV t2): s3 (PH p1, p2)
export async function seedBasic(app) {
  const M = await import('../src/models/index.js');
  const mk = (fullName, email, role, phone) => ({ fullName, email, role, phone, password: '123456' });
  const [admin, principal, t1, t2, p1, p2] = await M.User.create([
    mk('Admin', 'admin@kc.vn', 'admin'),
    mk('Hiệu trưởng', 'ht@kc.vn', 'principal'),
    mk('Cô Lan', 'lan@kc.vn', 'teacher', '0901000001'),
    mk('Cô Mai', 'mai@kc.vn', 'teacher', '0901000002'),
    mk('PH An', 'an@kc.vn', 'parent', '0902000001'),
    mk('PH Bình', 'binh@kc.vn', 'parent', '0902000002'),
  ]);
  const sy = await M.SchoolYear.create({
    name: '2025-2026', startDate: '2025-09-01', endDate: '2026-05-31', isCurrent: true, tuitionDefault: 2000000,
  });
  const [c1, c2] = await M.Class.create([
    { name: 'Mầm 1', ageGroup: 'mam', schoolYear: sy._id, teachers: [t1._id] },
    { name: 'Chồi 1', ageGroup: 'choi', schoolYear: sy._id, teachers: [t2._id] },
  ]);
  const st = (fullName, cls, parents) => ({ fullName, dateOfBirth: '2021-05-01', gender: 'male', class: cls, parents });
  const [s1, s2, s3] = await M.Student.create([
    st('Bé An', c1._id, [p1._id]),
    st('Bé Bình', c1._id, [p2._id]),
    st('Bé Cúc', c2._id, [p1._id, p2._id]),
  ]);

  const ids = {
    admin: admin.id, principal: principal.id, t1: t1.id, t2: t2.id, p1: p1.id, p2: p2.id,
    sy: sy.id, c1: c1.id, c2: c2.id, s1: s1.id, s2: s2.id, s3: s3.id,
  };

  const tok = {};
  for (const [k, e] of Object.entries({
    admin: 'admin@kc.vn', principal: 'ht@kc.vn', t1: 'lan@kc.vn', t2: 'mai@kc.vn', p1: 'an@kc.vn', p2: 'binh@kc.vn',
  })) {
    const r = await app.call('POST', '/api/v1/auth/login', { body: { identifier: e, password: '123456' } });
    tok[k] = r.body.data.accessToken;
  }
  return { M, ids, tok };
}
