import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { classApi } from '../../api/class.api.js';
import { schoolYearApi } from '../../api/schoolYear.api.js';
import { userApi } from '../../api/user.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch, useDebounce } from '../../hooks/useFetch.js';
import { usePagination } from '../../hooks/usePagination.js';
import { toast } from '../../stores/toast.store.js';
import { Button, Input, Select, SearchInput, DataTable, Chip, Modal, ConfirmDialog, Avatar } from '../../components/ui/index.js';
import { EntityPicker } from '../../components/shared/EntityPicker.jsx';
import { FormError } from '../../components/shared/FormError.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { PATHS } from '../../router/paths.js';
import { AGE_GROUP_LABEL } from '../../utils/constants.js';

export const AGE_OPTIONS = ['nha_tre', 'mam', 'choi', 'la'].map((v) => ({ value: v, label: AGE_GROUP_LABEL[v] }));

const schema = z.object({
  name: z.string().trim().min(1, 'Nhập tên lớp.').max(50),
  ageGroup: z.enum(['nha_tre', 'mam', 'choi', 'la'], { message: 'Chọn nhóm tuổi.' }),
  schoolYear: z.string().min(1, 'Chọn năm học.'),
  room: z.string().trim().max(50).optional(),
  capacity: z.coerce.number().int('Sĩ số là số nguyên.').min(1, 'Sĩ số tối thiểu 1.').max(100, 'Sĩ số tối đa 100.'),
});

/* ---------- Modal tạo / sửa lớp ---------- */
export function ClassFormModal({ open, onClose, cls, schoolYears = [], onSaved }) {
  const isEdit = !!cls;
  const current = schoolYears.find((y) => y.isCurrent);
  const [teachers, setTeachers] = useState(cls?.teachers || []);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState, reset } = useForm({
    resolver: zodResolver(schema),
    values: cls
      ? { name: cls.name, ageGroup: cls.ageGroup, schoolYear: cls.schoolYear?._id || cls.schoolYear, room: cls.room || '', capacity: cls.capacity }
      : { name: '', ageGroup: '', schoolYear: current?._id || '', room: '', capacity: 30 },
  });

  const submit = async (values) => {
    setServerError('');
    try {
      const teacherIds = teachers.map((t) => t._id);
      let saved;
      if (isEdit) {
        const { schoolYear, ...rest } = values; // không đổi năm học của lớp đã tạo
        if (!rest.room) delete rest.room;
        saved = await classApi.update(cls._id, rest);
        const before = (cls.teachers || []).map((t) => t._id).sort().join();
        if (before !== [...teacherIds].sort().join()) saved = await classApi.setTeachers(cls._id, teacherIds);
      } else {
        saved = await classApi.create({ ...values, room: values.room || undefined, teachers: teacherIds });
      }
      toast.success(isEdit ? 'Đã lưu lớp' : 'Đã tạo lớp');
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
      title={isEdit ? 'Sửa lớp' : 'Tạo lớp'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" form="class-form" loading={formState.isSubmitting}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo lớp'}
          </Button>
        </>
      }
    >
      <form id="class-form" onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <Input label="Tên lớp" placeholder="vd: Lá 2" error={formState.errors.name?.message} {...register('name')} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Nhóm tuổi" options={AGE_OPTIONS} placeholder="Chọn nhóm tuổi" error={formState.errors.ageGroup?.message} {...register('ageGroup')} />
          <Select
            label="Năm học"
            options={schoolYears.map((y) => ({ value: y._id, label: y.isCurrent ? `${y.name} (hiện tại)` : y.name }))}
            placeholder="Chọn năm học"
            disabled={isEdit}
            error={formState.errors.schoolYear?.message}
            {...register('schoolYear')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Phòng" placeholder="Không bắt buộc" error={formState.errors.room?.message} {...register('room')} />
          <Input label="Sĩ số tối đa" type="number" inputMode="numeric" min={1} max={100} error={formState.errors.capacity?.message} {...register('capacity')} />
        </div>
        <EntityPicker
          label="Giáo viên phụ trách (tối đa 3)"
          max={3}
          selected={teachers}
          onChange={setTeachers}
          fetcher={(search) => userApi.teachers({ search, limit: 10 }).then((r) => r.data)}
          getSub={(t) => t.email}
          renderAvatar={(t) => <Avatar name={t.fullName} role="teacher" size="sm" />}
          placeholder="Tìm giáo viên theo tên…"
        />
        <FormError message={serverError} />
      </form>
    </Modal>
  );
}

/* ---------- Trang ---------- */
export default function ClassesPage() {
  const navigate = useNavigate();
  const { setPage, filters, setFilters, params } = usePagination({ schoolYear: '', ageGroup: '', search: '' });
  const search = useDebounce(filters.search);
  const { data: schoolYears } = useFetch(schoolYearApi.list, []);
  const { data, loading, error, reload } = useFetch(() => classApi.list({ ...params, search }), [params.page, params.schoolYear, params.ageGroup, search]);
  const [formCls, setFormCls] = useState(undefined);
  const [delCls, setDelCls] = useState(null);

  return (
    <>
      <PageHeader
        description="Lớp theo năm học, giáo viên phụ trách và sĩ số."
        actions={
          <Button icon={Plus} onClick={() => setFormCls(null)}>
            Tạo lớp
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-[1fr_200px_180px]">
        <SearchInput className="col-span-2 md:col-span-1" value={filters.search} onChange={(v) => setFilters({ search: v })} placeholder="Tìm theo tên lớp" />
        <Select value={filters.schoolYear} onChange={(e) => setFilters({ schoolYear: e.target.value })} options={(schoolYears || []).map((y) => ({ value: y._id, label: y.name }))} placeholder="Mọi năm học" aria-label="Lọc năm học" />
        <Select value={filters.ageGroup} onChange={(e) => setFilters({ ageGroup: e.target.value })} options={AGE_OPTIONS} placeholder="Mọi nhóm tuổi" aria-label="Lọc nhóm tuổi" />
      </div>

      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      <DataTable
        loading={loading}
        rows={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowClick={(c) => navigate(PATHS.principal.classDetail(c._id))}
        emptyTitle={filters.search || filters.schoolYear || filters.ageGroup ? 'Không có lớp khớp bộ lọc' : 'Chưa có lớp nào'}
        emptyDescription={!filters.search && !filters.schoolYear && !filters.ageGroup ? 'Tạo lớp đầu tiên cho năm học hiện tại.' : undefined}
        columns={[
          {
            key: 'name',
            title: 'Lớp',
            render: (c) => (
              <div>
                <p className="font-display text-base font-semibold">{c.name}</p>
                <p className="text-xs text-ink-soft">{c.room ? `Phòng ${c.room} · ` : ''}{c.schoolYear?.name}</p>
              </div>
            ),
          },
          { key: 'ageGroup', title: 'Nhóm tuổi', card: 'chip', render: (c) => <Chip tone="sky">{AGE_GROUP_LABEL[c.ageGroup]}</Chip> },
          {
            key: 'teachers',
            title: 'Giáo viên',
            render: (c) =>
              c.teachers?.length ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {c.teachers.map((t) => (
                    <span key={t._id} className="inline-flex items-center gap-1.5 text-sm">
                      <Avatar name={t.fullName} src={t.avatar} size="sm" />
                      {t.fullName}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-ink-soft">Chưa phân công</span>
              ),
          },
          {
            key: 'studentCount',
            title: 'Sĩ số',
            align: 'right',
            render: (c) => (
              <span className="tabular-nums">
                {c.studentCount}/{c.capacity}
              </span>
            ),
          },
          {
            key: 'actions',
            title: '',
            align: 'right',
            actions: (c) => [
              { key: 'view', label: 'Xem lớp', icon: Eye, onClick: () => navigate(PATHS.principal.classDetail(c._id)) },
              { key: 'edit', label: 'Sửa', icon: Pencil, onClick: () => setFormCls(c) },
              { key: 'del', label: 'Xoá lớp', icon: Trash2, danger: true, tooltip: c.studentCount ? 'Lớp còn học sinh' : undefined, disabled: !!c.studentCount, onClick: () => setDelCls(c) },
            ],
          },
        ]}
      />

      <ClassFormModal open={formCls !== undefined} cls={formCls || null} schoolYears={schoolYears || []} onClose={() => setFormCls(undefined)} onSaved={reload} />
      <ConfirmDialog
        open={!!delCls}
        onClose={() => setDelCls(null)}
        danger
        title="Xoá lớp"
        confirmLabel="Xoá lớp"
        message={`Lớp ${delCls?.name} sẽ ngừng hoạt động và không hiện trong danh sách. Chỉ xoá được khi lớp không còn học sinh.`}
        onConfirm={() =>
          classApi
            .remove(delCls._id)
            .then(() => {
              toast.success('Đã xoá lớp');
              reload();
            })
            .catch((e) => toast.error(errorMessage(e)))
        }
      />
    </>
  );
}
