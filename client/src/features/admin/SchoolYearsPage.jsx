import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Star, CheckCircle2 } from 'lucide-react';
import { schoolYearApi } from '../../api/schoolYear.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { toast } from '../../stores/toast.store.js';
import { Button, Input, DataTable, Chip, Modal, ConfirmDialog } from '../../components/ui/index.js';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { formatDate, formatMoney } from '../../utils/format.js';
import dayjs from '../../utils/dayjs.js';

const schema = z
  .object({
    name: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Tên năm học dạng 2025-2026.'),
    startDate: z.string().min(1, 'Chọn ngày bắt đầu.'),
    endDate: z.string().min(1, 'Chọn ngày kết thúc.'),
    tuitionDefault: z.coerce.number().int().min(0, 'Học phí không âm.'),
    isCurrent: z.boolean().optional(),
  })
  .refine((d) => d.endDate > d.startDate, { message: 'Ngày kết thúc phải sau ngày bắt đầu.', path: ['endDate'] });

const toInput = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '');

function SchoolYearModal({ open, onClose, year, onSaved }) {
  const isEdit = !!year;
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState, reset } = useForm({
    resolver: zodResolver(schema),
    values: year
      ? { name: year.name, startDate: toInput(year.startDate), endDate: toInput(year.endDate), tuitionDefault: year.tuitionDefault || 0, isCurrent: year.isCurrent }
      : { name: '', startDate: '', endDate: '', tuitionDefault: 0, isCurrent: false },
  });

  const submit = async (values) => {
    setServerError('');
    try {
      const saved = isEdit ? await schoolYearApi.update(year._id, values) : await schoolYearApi.create(values);
      toast.success(isEdit ? 'Đã lưu năm học' : 'Đã tạo năm học');
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
      title={isEdit ? 'Sửa năm học' : 'Tạo năm học'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" form="sy-form" loading={formState.isSubmitting}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo năm học'}
          </Button>
        </>
      }
    >
      <form id="sy-form" onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <Input label="Tên năm học" placeholder="2025-2026" error={formState.errors.name?.message} {...register('name')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Bắt đầu" type="date" error={formState.errors.startDate?.message} {...register('startDate')} />
          <Input label="Kết thúc" type="date" error={formState.errors.endDate?.message} {...register('endDate')} />
        </div>
        <Input label="Học phí mặc định / tháng (₫)" type="number" inputMode="numeric" min={0} step={10000} error={formState.errors.tuitionDefault?.message} {...register('tuitionDefault')} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-line text-leaf" {...register('isCurrent')} />
          Đặt làm năm học hiện tại
        </label>
        {serverError && (
          <p role="alert" className="rounded-btn bg-berry-soft px-3 py-2 text-sm text-berry">
            {serverError}
          </p>
        )}
      </form>
    </Modal>
  );
}

export default function SchoolYearsPage() {
  const { data, loading, error, reload } = useFetch(schoolYearApi.list, []);
  const [formYear, setFormYear] = useState(undefined);
  const [deleteYear, setDeleteYear] = useState(null);
  const [currentYear, setCurrentYear] = useState(null);

  const run = (fn, ok) => fn().then(() => { toast.success(ok); reload(); }).catch((e) => toast.error(errorMessage(e)));

  return (
    <>
      <PageHeader
        description="Mỗi thời điểm chỉ có một năm học hiện tại; lớp và học phí gắn với năm học."
        actions={
          <Button icon={Plus} onClick={() => setFormYear(null)}>
            Tạo năm học
          </Button>
        }
      />
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      <DataTable
        loading={loading}
        rows={data || []}
        emptyTitle="Chưa có năm học"
        emptyDescription="Tạo năm học đầu tiên để bắt đầu xếp lớp."
        columns={[
          {
            key: 'name',
            title: 'Năm học',
            render: (y) => (
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-semibold">{y.name}</span>
                {y.isCurrent && <Chip tone="leaf" icon={CheckCircle2}>Hiện tại</Chip>}
              </div>
            ),
          },
          { key: 'range', title: 'Thời gian', render: (y) => <span className="tabular-nums">{formatDate(y.startDate)} – {formatDate(y.endDate)}</span> },
          { key: 'tuitionDefault', title: 'Học phí mặc định', align: 'right', render: (y) => <span className="tabular-nums">{formatMoney(y.tuitionDefault)}</span> },
          {
            key: 'actions',
            title: '',
            align: 'right',
            actions: (y) => [
              { key: 'current', label: 'Đặt làm hiện tại', tooltip: y.isCurrent ? 'Đang là năm hiện tại' : undefined, icon: Star, disabled: y.isCurrent, onClick: () => setCurrentYear(y) },
              { key: 'edit', label: 'Sửa', icon: Pencil, onClick: () => setFormYear(y) },
              { key: 'delete', label: 'Xoá', tooltip: y.isCurrent ? 'Không xoá năm hiện tại' : undefined, icon: Trash2, danger: true, disabled: y.isCurrent, onClick: () => setDeleteYear(y) },
            ],
          },
        ]}
      />

      <SchoolYearModal open={formYear !== undefined} year={formYear || null} onClose={() => setFormYear(undefined)} onSaved={reload} />
      <ConfirmDialog
        open={!!currentYear}
        onClose={() => setCurrentYear(null)}
        onConfirm={() => run(() => schoolYearApi.setCurrent(currentYear._id), `Đã đặt ${currentYear?.name} làm năm học hiện tại`)}
        title="Đặt năm học hiện tại"
        confirmLabel="Đặt làm hiện tại"
        message={`Lớp mới và học phí sẽ gắn với ${currentYear?.name}. Năm học hiện tại cũ sẽ không còn là mặc định.`}
      />
      <ConfirmDialog
        open={!!deleteYear}
        onClose={() => setDeleteYear(null)}
        onConfirm={() => run(() => schoolYearApi.remove(deleteYear._id), 'Đã xoá năm học')}
        danger
        title="Xoá năm học"
        confirmLabel="Xoá năm học"
        message={`Chỉ xoá được khi ${deleteYear?.name} chưa có lớp và học phí. Thao tác không hoàn tác.`}
      />
    </>
  );
}
