import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, ArrowLeftRight, Phone } from 'lucide-react';
import { studentApi } from '../../api/student.api.js';
import { classApi } from '../../api/class.api.js';
import { userApi } from '../../api/user.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch, useDebounce } from '../../hooks/useFetch.js';
import { usePagination } from '../../hooks/usePagination.js';
import { toast } from '../../stores/toast.store.js';
import { Button, Input, Select, Textarea, SearchInput, DataTable, StatusChip, Modal, Avatar, DatePicker } from '../../components/ui/index.js';
import { EntityPicker } from '../../components/shared/EntityPicker.jsx';
import { FormError } from '../../components/shared/FormError.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { GENDER_LABEL, STUDENT_STATUS } from '../../utils/constants.js';
import { formatDate, formatAge, toInputDate } from '../../utils/format.js';

const STATUS_OPTIONS = Object.entries(STUDENT_STATUS).map(([value, s]) => ({ value, label: s.label }));
const GENDER_OPTIONS = Object.entries(GENDER_LABEL).map(([value, label]) => ({ value, label }));
const todayStr = () => new Date().toISOString().slice(0, 10);

const schema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên tối thiểu 2 ký tự.').max(100),
  nickname: z.string().trim().max(50).optional(),
  dateOfBirth: z.string().min(1, 'Chọn ngày sinh.').refine((d) => d < todayStr(), 'Ngày sinh phải trong quá khứ.'),
  gender: z.enum(['male', 'female'], { message: 'Chọn giới tính.' }),
  class: z.string().optional(),
  enrollDate: z.string().optional(),
  allergies: z.string().optional(),
  medicalNotes: z.string().trim().max(2000).optional(),
  ecName: z.string().trim().max(100).optional(),
  ecPhone: z.union([z.string().trim().regex(/^(0|\+84)\d{9,10}$/, 'Số điện thoại chưa đúng, cần 10 chữ số.'), z.literal('')]),
  ecRelation: z.string().trim().max(50).optional(),
});

/* ---------- Modal tạo / sửa hồ sơ bé ---------- */
function StudentFormModal({ open, onClose, student, classes = [], onSaved }) {
  const isEdit = !!student;
  const [parents, setParents] = useState(student?.parents || []);
  const [parentsErr, setParentsErr] = useState('');
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState, reset, control } = useForm({
    resolver: zodResolver(schema),
    values: student
      ? {
          fullName: student.fullName, nickname: student.nickname || '', dateOfBirth: toInputDate(student.dateOfBirth), gender: student.gender,
          class: student.class?._id || '', enrollDate: toInputDate(student.enrollDate), allergies: (student.allergies || []).join(', '),
          medicalNotes: student.medicalNotes || '', ecName: student.emergencyContact?.name || '', ecPhone: student.emergencyContact?.phone || '', ecRelation: student.emergencyContact?.relation || '',
        }
      : { fullName: '', nickname: '', dateOfBirth: '', gender: '', class: '', enrollDate: todayStr(), allergies: '', medicalNotes: '', ecName: '', ecPhone: '', ecRelation: '' },
  });

  const submit = async (values) => {
    setServerError('');
    if (!parents.length) return setParentsErr('Chọn ít nhất 1 phụ huynh.');
    setParentsErr('');
    const { class: classId, ecName, ecPhone, ecRelation, allergies, ...rest } = values;
    const payload = {
      ...rest,
      nickname: rest.nickname || undefined,
      enrollDate: rest.enrollDate || undefined,
      medicalNotes: rest.medicalNotes || undefined,
      allergies: (allergies || '').split(',').map((s) => s.trim()).filter(Boolean),
      emergencyContact: { name: ecName || '', phone: ecPhone || '', relation: ecRelation || '' },
    };
    try {
      let saved;
      if (isEdit) {
        saved = await studentApi.update(student._id, payload);
        const before = (student.parents || []).map((p) => p._id).sort().join();
        const after = parents.map((p) => p._id);
        if (before !== [...after].sort().join()) await studentApi.setParents(student._id, after);
        const oldClass = student.class?._id || '';
        if (classId !== oldClass) {
          if (classId) await classApi.addStudents(classId, [student._id]);
          else await classApi.removeStudent(oldClass, student._id);
        }
      } else {
        saved = await studentApi.create({ ...payload, class: classId || null, parents: parents.map((p) => p._id) });
      }
      toast.success(isEdit ? 'Đã lưu hồ sơ bé' : 'Đã tạo hồ sơ bé');
      onSaved(saved);
      reset();
      onClose();
    } catch (err) {
      setServerError(errorMessage(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Sửa hồ sơ bé' : 'Tạo hồ sơ bé'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" form="student-form" loading={formState.isSubmitting}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo hồ sơ'}
          </Button>
        </>
      }
    >
      <form id="student-form" onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Họ và tên" error={formState.errors.fullName?.message} {...register('fullName')} />
          <Input label="Tên ở nhà" placeholder="Không bắt buộc" error={formState.errors.nickname?.message} {...register('nickname')} />
          <Controller name="dateOfBirth" control={control} render={({ field }) => <DatePicker label="Ngày sinh" value={field.value} onChange={field.onChange} max={todayStr()} error={formState.errors.dateOfBirth?.message} />} />
          <Select label="Giới tính" options={GENDER_OPTIONS} placeholder="Chọn giới tính" error={formState.errors.gender?.message} {...register('gender')} />
          <Select label="Lớp" options={classes.map((c) => ({ value: c._id, label: c.name }))} placeholder="Chưa xếp lớp" error={formState.errors.class?.message} {...register('class')} />
          <Controller name="enrollDate" control={control} render={({ field }) => <DatePicker label="Ngày nhập học" value={field.value} onChange={field.onChange} error={formState.errors.enrollDate?.message} />} />
        </div>

        <EntityPicker
          label="Phụ huynh (1–4 người)"
          max={4}
          selected={parents}
          onChange={(v) => {
            setParents(v);
            if (v.length) setParentsErr('');
          }}
          error={parentsErr}
          fetcher={(search) => userApi.parents({ search, limit: 10 }).then((r) => r.data)}
          getSub={(p) => [p.phone, p.email].filter(Boolean).join(' · ')}
          renderAvatar={(p) => <Avatar name={p.fullName} role="parent" size="sm" />}
          placeholder="Tìm phụ huynh theo tên, số điện thoại…"
          hint="Tài khoản phụ huynh do quản trị viên tạo trước."
        />

        <Input label="Dị ứng" placeholder="Cách nhau bằng dấu phẩy, vd: hải sản, đậu phộng" error={formState.errors.allergies?.message} {...register('allergies')} />
        <Textarea label="Lưu ý sức khoẻ" rows={2} placeholder="Không bắt buộc" error={formState.errors.medicalNotes?.message} {...register('medicalNotes')} />

        <fieldset className="rounded-card border border-line p-3">
          <legend className="px-1 text-sm font-medium text-ink">Liên hệ khẩn cấp</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Họ tên" error={formState.errors.ecName?.message} {...register('ecName')} />
            <Input label="Số điện thoại" inputMode="tel" error={formState.errors.ecPhone?.message} {...register('ecPhone')} />
            <Input label="Quan hệ" placeholder="vd: Bà nội" error={formState.errors.ecRelation?.message} {...register('ecRelation')} />
          </div>
        </fieldset>
        <FormError message={serverError} />
      </form>
    </Modal>
  );
}

/* ---------- Đổi trạng thái ---------- */
function StatusModal({ student, onClose, onDone }) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const current = student?.status;
  const submit = async () => {
    if (!status || status === current) return;
    setLoading(true);
    try {
      await studentApi.setStatus(student._id, status);
      toast.success(`Đã chuyển ${student.fullName} sang "${STUDENT_STATUS[status].label}"`);
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
      open={!!student}
      onClose={onClose}
      size="sm"
      title="Đổi trạng thái học"
      description={student?.fullName}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={submit} loading={loading} disabled={!status || status === current}>
            Lưu trạng thái
          </Button>
        </>
      }
    >
      <Select label="Trạng thái mới" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS.map((o) => ({ ...o, disabled: o.value === current }))} placeholder="Chọn trạng thái" />
      {status && status !== 'active' && <p className="mt-2 text-sm text-ink-soft">Bé sẽ được gỡ khỏi lớp hiện tại và không còn trong danh sách điểm danh.</p>}
    </Modal>
  );
}

/* ---------- Trang ---------- */
export default function StudentsPage() {
  const { setPage, filters, setFilters, params } = usePagination({ class: '', status: 'active', search: '' });
  const search = useDebounce(filters.search);
  const { data: classes } = useFetch(() => classApi.list({ limit: 100 }).then((r) => r.data), []);
  const { data, loading, error, reload } = useFetch(() => studentApi.list({ ...params, search }), [params.page, params.class, params.status, search]);
  const [formStudent, setFormStudent] = useState(undefined);
  const [statusStudent, setStatusStudent] = useState(null);

  return (
    <>
      <PageHeader
        description="Hồ sơ bé, phụ huynh và lớp đang học."
        actions={
          <Button icon={Plus} onClick={() => setFormStudent(null)}>
            Tạo hồ sơ bé
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-[1fr_200px_180px]">
        <SearchInput className="col-span-2 md:col-span-1" value={filters.search} onChange={(v) => setFilters({ search: v })} placeholder="Tìm theo tên bé" />
        <Select value={filters.class} onChange={(e) => setFilters({ class: e.target.value })} options={(classes || []).map((c) => ({ value: c._id, label: c.name }))} placeholder="Mọi lớp" aria-label="Lọc lớp" />
        <Select value={filters.status} onChange={(e) => setFilters({ status: e.target.value })} options={STATUS_OPTIONS} aria-label="Lọc trạng thái" />
      </div>

      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      <DataTable
        loading={loading}
        rows={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyTitle={filters.search || filters.class ? 'Không có bé khớp bộ lọc' : 'Chưa có hồ sơ bé nào'}
        emptyDescription={!filters.search && !filters.class ? 'Tạo hồ sơ bé đầu tiên, rồi xếp vào lớp.' : undefined}
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
                    {GENDER_LABEL[s.gender]} · {formatAge(s.dateOfBirth)} · {formatDate(s.dateOfBirth)}
                  </p>
                </div>
              </div>
            ),
          },
          { key: 'class', title: 'Lớp', render: (s) => (s.class ? <span className="font-medium">{s.class.name}</span> : <span className="text-sm text-ink-soft">Chưa xếp lớp</span>) },
          {
            key: 'parents',
            title: 'Phụ huynh',
            render: (s) =>
              s.parents?.length ? (
                <div className="space-y-0.5 text-sm">
                  {s.parents.slice(0, 2).map((p) => (
                    <p key={p._id} className="flex items-center gap-1.5">
                      <span className="truncate">{p.fullName}</span>
                      {p.phone && (
                        <a href={`tel:${p.phone}`} className="inline-flex items-center gap-0.5 text-xs text-sky tabular-nums">
                          <Phone size={12} aria-hidden /> {p.phone}
                        </a>
                      )}
                    </p>
                  ))}
                  {s.parents.length > 2 && <p className="text-xs text-ink-soft">+{s.parents.length - 2} người</p>}
                </div>
              ) : (
                <span className="text-sm text-ink-soft">—</span>
              ),
          },
          { key: 'status', title: 'Trạng thái', card: 'chip', render: (s) => <StatusChip map={STUDENT_STATUS} value={s.status} /> },
          {
            key: 'actions',
            title: '',
            align: 'right',
            actions: (s) => [
              { key: 'edit', label: 'Sửa hồ sơ', icon: Pencil, onClick: () => setFormStudent(s) },
              { key: 'status', label: 'Đổi trạng thái', icon: ArrowLeftRight, onClick: () => setStatusStudent(s) },
            ],
          },
        ]}
      />

      <StudentFormModal key={formStudent?._id || 'new'} open={formStudent !== undefined} student={formStudent || null} classes={classes || []} onClose={() => setFormStudent(undefined)} onSaved={reload} />
      <StatusModal student={statusStudent} onClose={() => setStatusStudent(null)} onDone={reload} />
    </>
  );
}
