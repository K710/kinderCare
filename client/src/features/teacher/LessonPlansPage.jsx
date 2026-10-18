import { useState } from 'react';
import { Plus, Pencil, Eye, Send, Trash2, BookOpen } from 'lucide-react';
import { lessonPlanApi } from '../../api/lessonPlan.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useMyClasses } from '../../hooks/useMyClasses.js';
import { usePagination } from '../../hooks/usePagination.js';
import { toast } from '../../stores/toast.store.js';
import { Button, Input, Textarea, Modal, DataTable, StatusChip, ConfirmDialog, Tabs, EmptyState, IconButton, DatePicker } from '../../components/ui/index.js';
import { ClassSelect } from '../../components/shared/ClassSelect.jsx';
import { FormError } from '../../components/shared/FormError.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { APPROVAL_STATUS, DAY_LABEL } from '../../utils/constants.js';
import { formatWeek, toMonday } from '../../utils/format.js';
import { LessonPlanViewModal } from '../principal/LessonPlansPage.jsx';

const STATUS_TABS = [{ value: '', label: 'Tất cả' }, ...Object.entries(APPROVAL_STATUS).map(([value, s]) => ({ value, label: s.label }))];
const DAYS = [1, 2, 3, 4, 5];
const emptyAct = () => ({ time: '', title: '', goal: '', materials: '' });

/* ---------- Soạn kế hoạch tuần ---------- */
function PlanEditorModal({ plan, classId, onClose, onSaved }) {
  const isEdit = !!plan;
  const [weekStart, setWeekStart] = useState(plan ? toMonday(plan.weekStart) : toMonday(new Date()));
  const [theme, setTheme] = useState(plan?.theme || '');
  const [days, setDays] = useState(() => DAYS.map((d) => ({ dayOfWeek: d, activities: (plan?.days || []).find((x) => x.dayOfWeek === d)?.activities?.map((a) => ({ ...a })) || [] })));
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const setAct = (d, i, patch) => setDays((ds) => ds.map((x) => (x.dayOfWeek === d ? { ...x, activities: x.activities.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) } : x)));
  const addAct = (d) => setDays((ds) => ds.map((x) => (x.dayOfWeek === d ? { ...x, activities: [...x.activities, emptyAct()] } : x)));
  const rmAct = (d, i) => setDays((ds) => ds.map((x) => (x.dayOfWeek === d ? { ...x, activities: x.activities.filter((_, idx) => idx !== i) } : x)));

  const submit = async (andSubmit) => {
    setErr('');
    const payloadDays = days
      .map((d) => ({ dayOfWeek: d.dayOfWeek, activities: d.activities.filter((a) => a.title.trim()).map((a) => ({ time: a.time.trim() || undefined, title: a.title.trim(), goal: a.goal.trim() || undefined, materials: a.materials.trim() || undefined })) }))
      .filter((d) => d.activities.length);
    if (!payloadDays.length) return setErr('Thêm ít nhất 1 hoạt động có tiêu đề.');
    setLoading(true);
    try {
      let saved = isEdit ? await lessonPlanApi.update(plan._id, { theme: theme.trim() || undefined, days: payloadDays }) : await lessonPlanApi.create({ class: classId, weekStart, theme: theme.trim() || undefined, days: payloadDays });
      if (andSubmit) saved = await lessonPlanApi.submit(saved._id);
      toast.success(andSubmit ? 'Đã gửi duyệt kế hoạch' : 'Đã lưu kế hoạch');
      onSaved(saved);
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="xl" title={isEdit ? 'Sửa kế hoạch' : 'Soạn kế hoạch tuần'} description="Lưu nháp để sửa tiếp, hoặc gửi hiệu trưởng duyệt." footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button variant="secondary" onClick={() => submit(false)} loading={loading}>Lưu nháp</Button><Button icon={Send} onClick={() => submit(true)} loading={loading}>Lưu và gửi duyệt</Button></>}>
      <div className="mb-4 grid gap-3 sm:grid-cols-[180px_1fr]">
        <DatePicker label="Tuần" value={weekStart} disabled={isEdit} clearable={false} onChange={(v) => v && setWeekStart(toMonday(v))} hint={formatWeek(weekStart)} />
        <Input label="Chủ đề tuần" placeholder="vd: Thế giới động vật" value={theme} onChange={(e) => setTheme(e.target.value)} />
      </div>
      <div className="space-y-3">
        {days.map((d) => (
          <fieldset key={d.dayOfWeek} className="rounded-card border border-line p-3">
            <legend className="px-1 text-sm font-medium">{DAY_LABEL[d.dayOfWeek]}</legend>
            {d.activities.length === 0 && <p className="text-xs text-ink-soft">Chưa có hoạt động.</p>}
            <div className="space-y-2">
              {d.activities.map((a, i) => (
                <div key={i} className="grid grid-cols-[96px_1fr_auto] gap-2 sm:grid-cols-[110px_1fr_1fr_1fr_auto]">
                  <Input placeholder="08:00-08:30" value={a.time} onChange={(e) => setAct(d.dayOfWeek, i, { time: e.target.value })} aria-label="Giờ" />
                  <Input placeholder="Tên hoạt động *" value={a.title} onChange={(e) => setAct(d.dayOfWeek, i, { title: e.target.value })} aria-label="Hoạt động" />
                  <Input className="col-span-2 sm:col-span-1" placeholder="Mục tiêu" value={a.goal} onChange={(e) => setAct(d.dayOfWeek, i, { goal: e.target.value })} aria-label="Mục tiêu" />
                  <Input className="col-span-2 sm:col-span-1" placeholder="Chuẩn bị" value={a.materials} onChange={(e) => setAct(d.dayOfWeek, i, { materials: e.target.value })} aria-label="Chuẩn bị" />
                  <IconButton label="Xoá hoạt động" icon={Trash2} danger onClick={() => rmAct(d.dayOfWeek, i)} className="row-start-1 col-start-3 sm:col-start-5" />
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" icon={Plus} className="mt-2" onClick={() => addAct(d.dayOfWeek)}>Thêm hoạt động</Button>
          </fieldset>
        ))}
      </div>
      <FormError message={err} />
    </Modal>
  );
}

/* ---------- Trang GV ---------- */
export default function TeacherLessonPlansPage() {
  const { classes, loading: lc, selectedId, select } = useMyClasses();
  const { setPage, filters, setFilters, params } = usePagination({ status: '' });
  const { data, loading, error, reload } = useFetch(() => lessonPlanApi.list({ ...params, class: selectedId }), [selectedId, params.page, params.status], { enabled: !!selectedId });
  const [editor, setEditor] = useState(undefined);
  const [view, setView] = useState(null);
  const [del, setDel] = useState(null);
  const run = (fn, ok) => fn().then(() => { toast.success(ok); reload(); }).catch((e) => toast.error(errorMessage(e)));

  if (!lc && !classes.length) return <EmptyState icon={BookOpen} title="Bạn chưa được phân công lớp" />;

  return (
    <>
      <PageHeader
        description="Kế hoạch giảng dạy theo tuần, gửi hiệu trưởng duyệt để phụ huynh xem."
        actions={<><ClassSelect classes={classes} value={selectedId} onChange={select} /><Button icon={Plus} onClick={() => setEditor(null)}>Soạn kế hoạch</Button></>}
      />
      <Tabs className="mb-4" items={STATUS_TABS} value={filters.status} onChange={(v) => setFilters({ status: v })} />
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />
      <DataTable
        loading={loading}
        rows={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowClick={setView}
        emptyTitle={filters.status ? 'Không có kế hoạch khớp bộ lọc' : 'Chưa có kế hoạch nào'}
        emptyDescription={!filters.status ? 'Soạn kế hoạch tuần đầu tiên cho lớp.' : undefined}
        columns={[
          { key: 'weekStart', title: 'Tuần', render: (p) => <div><p className="font-medium">{formatWeek(p.weekStart)}</p>{p.theme && <p className="truncate text-xs text-ink-soft">{p.theme}</p>}</div> },
          { key: 'days', title: 'Hoạt động', render: (p) => <span className="tabular-nums">{(p.days || []).reduce((s, d) => s + (d.activities?.length || 0), 0)}</span> },
          { key: 'status', title: 'Trạng thái', card: 'chip', render: (p) => <div className="flex flex-wrap items-center gap-1"><StatusChip map={APPROVAL_STATUS} value={p.status} />{p.status === 'rejected' && p.rejectReason && <span className="text-xs text-berry">{p.rejectReason}</span>}</div> },
          {
            key: 'actions', title: '', align: 'right',
            actions: (p) => [
              { key: 'view', label: 'Xem', icon: Eye, onClick: () => setView(p) },
              { key: 'edit', label: 'Sửa', icon: Pencil, hidden: !['draft', 'rejected'].includes(p.status), onClick: () => setEditor(p) },
              { key: 'submit', label: 'Gửi duyệt', icon: Send, hidden: p.status !== 'draft', onClick: () => run(() => lessonPlanApi.submit(p._id), 'Đã gửi duyệt kế hoạch') },
              { key: 'del', label: 'Xoá nháp', icon: Trash2, danger: true, hidden: p.status !== 'draft', onClick: () => setDel(p) },
            ],
          },
        ]}
      />
      {editor !== undefined && <PlanEditorModal key={editor?._id || 'new'} plan={editor} classId={selectedId} onClose={() => setEditor(undefined)} onSaved={reload} />}
      <LessonPlanViewModal plan={view} onClose={() => setView(null)} footer={<Button variant="secondary" onClick={() => setView(null)}>Đóng</Button>} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} danger title="Xoá kế hoạch nháp" confirmLabel="Xoá" message={del ? `Xoá kế hoạch ${formatWeek(del.weekStart)}?` : ''} onConfirm={() => run(() => lessonPlanApi.remove(del._id), 'Đã xoá kế hoạch')} />
    </>
  );
}
