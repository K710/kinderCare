import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, UserPlus, UserMinus, Phone } from 'lucide-react';
import { classApi } from '../../api/class.api.js';
import { studentApi } from '../../api/student.api.js';
import { schoolYearApi } from '../../api/schoolYear.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { toast } from '../../stores/toast.store.js';
import { Button, DataTable, Chip, Modal, ConfirmDialog, Avatar, Skeleton } from '../../components/ui/index.js';
import { EntityPicker } from '../../components/shared/EntityPicker.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { PATHS } from '../../router/paths.js';
import { AGE_GROUP_LABEL, GENDER_LABEL } from '../../utils/constants.js';
import { formatDate, formatAge } from '../../utils/format.js';
import { ClassFormModal } from './ClassesPage.jsx';

// Thêm bé chưa xếp lớp vào lớp này
function AddStudentsModal({ open, onClose, cls, onDone }) {
  const [picked, setPicked] = useState([]);
  const [loading, setLoading] = useState(false);
  const remaining = Math.max(0, (cls?.capacity || 0) - (cls?.studentCount || 0));

  const submit = async () => {
    if (!picked.length) return;
    setLoading(true);
    try {
      const r = await classApi.addStudents(cls._id, picked.map((s) => s._id));
      toast.success(`Đã thêm ${r.added} bé vào lớp`);
      setPicked([]);
      onDone();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm học sinh vào lớp"
      description={`Còn ${remaining} chỗ. Chỉ hiện bé đang học và chưa xếp lớp.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={submit} loading={loading} disabled={!picked.length}>
            Thêm {picked.length || ''} bé
          </Button>
        </>
      }
    >
      <EntityPicker
        selected={picked}
        onChange={setPicked}
        max={remaining || undefined}
        fetcher={(search) => studentApi.list({ search, unassigned: 'true', limit: 15 }).then((r) => r.data)}
        getSub={(s) => `${GENDER_LABEL[s.gender]} · ${formatAge(s.dateOfBirth)}`}
        renderAvatar={(s) => <Avatar name={s.fullName} src={s.avatar} size="sm" />}
        placeholder="Tìm bé theo tên…"
      />
    </Modal>
  );
}

export default function ClassDetailPage() {
  const { id } = useParams();
  const { data: cls, loading, error, reload } = useFetch(() => classApi.get(id), [id]);
  const { data: students, loading: ls, reload: reloadStudents } = useFetch(() => classApi.students(id), [id]);
  const { data: schoolYears } = useFetch(schoolYearApi.list, []);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);

  const reloadAll = () => {
    reload();
    reloadStudents();
  };
  const clsWithCount = cls ? { ...cls, studentCount: students?.length ?? cls.studentCount ?? 0 } : null;

  return (
    <>
      <Link to={PATHS.principal.classes} className="mb-3 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft size={16} aria-hidden /> Danh sách lớp
      </Link>
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      {loading || !cls ? (
        <div className="card space-y-3 p-4">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      ) : (
        <>
          <PageHeader
            title={
              <span className="flex items-center gap-2">
                {cls.name} <Chip tone="sky">{AGE_GROUP_LABEL[cls.ageGroup]}</Chip>
                {!cls.isActive && <Chip tone="muted">Ngừng hoạt động</Chip>}
              </span>
            }
            description={`${cls.schoolYear?.name || ''}${cls.room ? ` · Phòng ${cls.room}` : ''} · Sĩ số ${students?.length ?? 0}/${cls.capacity}`}
            actions={
              <>
                <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
                  Sửa lớp
                </Button>
                <Button icon={UserPlus} onClick={() => setAdding(true)} disabled={!cls.isActive}>
                  Thêm học sinh
                </Button>
              </>
            }
          />

          <section className="card mb-4 p-4">
            <h3 className="text-base">Giáo viên phụ trách</h3>
            {cls.teachers?.length ? (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cls.teachers.map((t) => (
                  <li key={t._id} className="flex items-center gap-3">
                    <Avatar name={t.fullName} src={t.avatar} role="teacher" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.fullName}</p>
                      <p className="truncate text-xs text-ink-soft">{t.phone || t.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Chưa phân công giáo viên. Bấm "Sửa lớp" để chọn.</p>
            )}
          </section>

          <h3 className="mb-2 text-base">Học sinh</h3>
          <DataTable
            loading={ls}
            rows={students || []}
            emptyTitle="Lớp chưa có học sinh"
            emptyDescription="Thêm các bé chưa xếp lớp vào đây."
            columns={[
              {
                key: 'fullName',
                title: 'Bé',
                render: (s) => (
                  <div className="flex items-center gap-3">
                    <Avatar name={s.fullName} src={s.avatar} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {s.fullName}
                        {s.nickname && <span className="ml-1 text-xs text-ink-soft">({s.nickname})</span>}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {GENDER_LABEL[s.gender]} · {formatAge(s.dateOfBirth)}
                      </p>
                    </div>
                  </div>
                ),
              },
              { key: 'dateOfBirth', title: 'Ngày sinh', render: (s) => <span className="tabular-nums">{formatDate(s.dateOfBirth)}</span> },
              {
                key: 'parents',
                title: 'Phụ huynh',
                render: (s) =>
                  s.parents?.length ? (
                    <div className="space-y-0.5 text-sm">
                      {s.parents.map((p) => (
                        <p key={p._id} className="flex items-center gap-1.5">
                          <span className="truncate">{p.fullName}</span>
                          {p.phone && (
                            <a href={`tel:${p.phone}`} className="inline-flex items-center gap-0.5 text-xs text-sky tabular-nums" onClick={(e) => e.stopPropagation()}>
                              <Phone size={12} aria-hidden /> {p.phone}
                            </a>
                          )}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-ink-soft">—</span>
                  ),
              },
              {
                key: 'actions',
                title: '',
                align: 'right',
                actions: (s) => [{ key: 'remove', label: 'Chuyển ra khỏi lớp', icon: UserMinus, danger: true, onClick: () => setRemoving(s) }],
              },
            ]}
          />

          <ClassFormModal open={editing} cls={cls} schoolYears={schoolYears || []} onClose={() => setEditing(false)} onSaved={reloadAll} />
          <AddStudentsModal open={adding} cls={clsWithCount} onClose={() => setAdding(false)} onDone={reloadAll} />
          <ConfirmDialog
            open={!!removing}
            onClose={() => setRemoving(null)}
            danger
            title="Chuyển bé ra khỏi lớp"
            confirmLabel="Chuyển ra khỏi lớp"
            message={`${removing?.fullName} sẽ về trạng thái chưa xếp lớp. Hồ sơ, điểm danh cũ vẫn giữ nguyên.`}
            onConfirm={() =>
              classApi
                .removeStudent(cls._id, removing._id)
                .then(() => {
                  toast.success('Đã chuyển bé ra khỏi lớp');
                  reloadAll();
                })
                .catch((e) => toast.error(errorMessage(e)))
            }
          />
        </>
      )}
    </>
  );
}
