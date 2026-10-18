import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Eye, Send, Check, X, Trash2 } from 'lucide-react';
import { menuApi } from '../../api/menu.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { usePagination } from '../../hooks/usePagination.js';
import { toast } from '../../stores/toast.store.js';
import { Button, Input, Select, Textarea, DataTable, StatusChip, Chip, Modal, ConfirmDialog, Tabs } from '../../components/ui/index.js';
import { FormError } from '../../components/shared/FormError.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { AGE_GROUP_LABEL, APPROVAL_STATUS, DAY_LABEL } from '../../utils/constants.js';
import { formatWeek, toMonday } from '../../utils/format.js';

const AGE_OPTIONS = ['all', 'nha_tre', 'mam', 'choi', 'la'].map((v) => ({ value: v, label: AGE_GROUP_LABEL[v] }));
const STATUS_TABS = [{ value: '', label: 'Tất cả' }, ...Object.entries(APPROVAL_STATUS).map(([value, s]) => ({ value, label: s.label }))];
const MEALS = [
  { key: 'breakfast', label: 'Bữa sáng' },
  { key: 'lunch', label: 'Bữa trưa' },
  { key: 'snack', label: 'Bữa xế' },
];
const DAYS = [1, 2, 3, 4, 5];
const emptyDays = () => DAYS.map((d) => ({ dayOfWeek: d, breakfast: '', lunch: '', snack: '', note: '' }));
const toText = (arr) => (arr || []).join(', ');
const toList = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

/* ---------- Soạn thực đơn: 5 ngày × 3 bữa, món cách nhau bằng dấu phẩy ---------- */
function MenuEditorModal({ open, onClose, menu, onSaved }) {
  const isEdit = !!menu;
  const [weekStart, setWeekStart] = useState(menu ? toMonday(menu.weekStart) : toMonday(new Date()));
  const [ageGroup, setAgeGroup] = useState(menu?.ageGroup || 'all');
  const [days, setDays] = useState(() =>
    menu ? DAYS.map((d) => { const x = (menu.days || []).find((y) => y.dayOfWeek === d); return { dayOfWeek: d, breakfast: toText(x?.breakfast), lunch: toText(x?.lunch), snack: toText(x?.snack), note: x?.note || '' }; }) : emptyDays(),
  );
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const setDay = (d, patch) => setDays((ds) => ds.map((x) => (x.dayOfWeek === d ? { ...x, ...patch } : x)));

  const submit = async (andSubmit = false) => {
    setErr('');
    const payloadDays = days
      .map((d) => ({ dayOfWeek: d.dayOfWeek, breakfast: toList(d.breakfast), lunch: toList(d.lunch), snack: toList(d.snack), note: d.note.trim() || undefined }))
      .filter((d) => d.breakfast.length || d.lunch.length || d.snack.length || d.note);
    if (!payloadDays.length) return setErr('Nhập món cho ít nhất 1 ngày.');
    for (const d of payloadDays) {
      for (const m of MEALS) if (d[m.key].length > 10) return setErr(`${DAY_LABEL[d.dayOfWeek]} – ${m.label}: tối đa 10 món.`);
    }
    setLoading(true);
    try {
      let saved = isEdit ? await menuApi.update(menu._id, { days: payloadDays, ageGroup }) : await menuApi.create({ weekStart, ageGroup, days: payloadDays });
      if (andSubmit) saved = await menuApi.submit(saved._id);
      toast.success(andSubmit ? 'Đã gửi duyệt thực đơn' : 'Đã lưu thực đơn');
      onSaved(saved);
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={isEdit ? 'Sửa thực đơn' : 'Soạn thực đơn tuần'}
      description="Các món cách nhau bằng dấu phẩy. Lưu nháp rồi gửi duyệt, hoặc gửi duyệt ngay."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="secondary" onClick={() => submit(false)} loading={loading}>
            Lưu nháp
          </Button>
          <Button icon={Send} onClick={() => submit(true)} loading={loading}>
            Lưu và gửi duyệt
          </Button>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Input label="Tuần (chọn ngày bất kỳ)" type="date" value={weekStart} disabled={isEdit} onChange={(e) => setWeekStart(toMonday(e.target.value))} hint={formatWeek(weekStart)} />
        <Select label="Áp dụng cho" options={AGE_OPTIONS} value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} />
      </div>
      <div className="space-y-3">
        {days.map((d) => (
          <fieldset key={d.dayOfWeek} className="rounded-card border border-line p-3">
            <legend className="px-1 text-sm font-medium">{DAY_LABEL[d.dayOfWeek]}</legend>
            <div className="grid gap-3 md:grid-cols-3">
              {MEALS.map((m) => (
                <Textarea key={m.key} label={m.label} rows={2} value={d[m.key]} onChange={(e) => setDay(d.dayOfWeek, { [m.key]: e.target.value })} placeholder="vd: Cháo thịt bằm, sữa" />
              ))}
            </div>
            <Input className="mt-2" placeholder="Ghi chú (không bắt buộc)" value={d.note} onChange={(e) => setDay(d.dayOfWeek, { note: e.target.value })} aria-label={`Ghi chú ${DAY_LABEL[d.dayOfWeek]}`} />
          </fieldset>
        ))}
      </div>
      <FormError message={err} />
    </Modal>
  );
}

/* ---------- Xem thực đơn ---------- */
export function MenuViewModal({ menu, onClose, footer }) {
  if (!menu) return null;
  return (
    <Modal open onClose={onClose} size="lg" title={`Thực đơn ${formatWeek(menu.weekStart)}`} description={`${AGE_GROUP_LABEL[menu.ageGroup]}${menu.createdBy ? ` · ${menu.createdBy.fullName}` : ''}`} footer={footer}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusChip map={APPROVAL_STATUS} value={menu.status} />
        {menu.status === 'rejected' && menu.rejectReason && <span className="text-sm text-berry">Lý do: {menu.rejectReason}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs text-ink-soft">
            <tr>
              <th className="px-3 py-2">Thứ</th>
              {MEALS.map((m) => (
                <th key={m.key} className="px-3 py-2">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {DAYS.map((d) => {
              const x = (menu.days || []).find((y) => y.dayOfWeek === d);
              return (
                <tr key={d} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{DAY_LABEL[d]}</td>
                  {MEALS.map((m) => (
                    <td key={m.key} className="px-3 py-2">{x?.[m.key]?.length ? x[m.key].join(', ') : <span className="text-ink-soft">—</span>}{m.key === 'snack' && x?.note && <p className="mt-1 text-xs text-ink-soft">{x.note}</p>}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

/* ---------- Trang ---------- */
export default function MenusPage() {
  const [sp] = useSearchParams();
  const { setPage, filters, setFilters, params } = usePagination({ status: sp.get('status') || '', ageGroup: '' });
  const { data, loading, error, reload } = useFetch(() => menuApi.list(params), [params.page, params.status, params.ageGroup]);
  const [editor, setEditor] = useState(undefined); // undefined đóng, null tạo, object sửa
  const [view, setView] = useState(null);
  const [reject, setReject] = useState(null);
  const [del, setDel] = useState(null);

  const run = (fn, ok) => fn().then(() => { toast.success(ok); reload(); setView(null); }).catch((e) => toast.error(errorMessage(e)));
  const approveFooter = (m) =>
    m.status === 'pending' ? (
      <>
        <Button variant="danger" icon={X} onClick={() => { setView(null); setReject(m); }}>Từ chối</Button>
        <Button icon={Check} onClick={() => run(() => menuApi.approve(m._id), 'Đã duyệt thực đơn')}>Duyệt</Button>
      </>
    ) : (
      <Button variant="secondary" onClick={() => setView(null)}>Đóng</Button>
    );

  return (
    <>
      <PageHeader
        description="Soạn thực đơn tuần theo nhóm tuổi, gửi duyệt rồi công bố cho phụ huynh."
        actions={
          <Button icon={Plus} onClick={() => setEditor(null)}>
            Soạn thực đơn
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs items={STATUS_TABS} value={filters.status} onChange={(v) => setFilters({ status: v })} className="flex-1" />
        <Select value={filters.ageGroup} onChange={(e) => setFilters({ ageGroup: e.target.value })} options={AGE_OPTIONS} placeholder="Mọi nhóm tuổi" aria-label="Lọc nhóm tuổi" className="md:w-44" />
      </div>
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />

      <DataTable
        loading={loading}
        rows={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowClick={setView}
        emptyTitle={filters.status || filters.ageGroup ? 'Không có thực đơn khớp bộ lọc' : 'Chưa có thực đơn nào'}
        emptyDescription={!filters.status && !filters.ageGroup ? 'Soạn thực đơn tuần đầu tiên cho các bé.' : undefined}
        columns={[
          { key: 'weekStart', title: 'Tuần', render: (m) => <span className="font-medium">{formatWeek(m.weekStart)}</span> },
          { key: 'ageGroup', title: 'Nhóm tuổi', card: 'chip', render: (m) => <Chip tone="sky">{AGE_GROUP_LABEL[m.ageGroup]}</Chip> },
          { key: 'days', title: 'Số ngày', render: (m) => <span className="tabular-nums">{m.days?.length || 0}/5</span> },
          { key: 'status', title: 'Trạng thái', card: 'chip', render: (m) => <StatusChip map={APPROVAL_STATUS} value={m.status} /> },
          { key: 'createdBy', title: 'Người soạn', render: (m) => <span className="text-ink-soft">{m.createdBy?.fullName || '—'}</span> },
          {
            key: 'actions',
            title: '',
            align: 'right',
            actions: (m) => [
              { key: 'view', label: 'Xem', icon: Eye, onClick: () => setView(m) },
              { key: 'edit', label: 'Sửa', icon: Pencil, hidden: !['draft', 'rejected'].includes(m.status), onClick: () => setEditor(m) },
              { key: 'submit', label: 'Gửi duyệt', icon: Send, hidden: m.status !== 'draft', onClick: () => run(() => menuApi.submit(m._id), 'Đã gửi duyệt thực đơn') },
              { key: 'approve', label: 'Duyệt', icon: Check, hidden: m.status !== 'pending', onClick: () => run(() => menuApi.approve(m._id), 'Đã duyệt thực đơn') },
              { key: 'reject', label: 'Từ chối', icon: X, danger: true, hidden: m.status !== 'pending', onClick: () => setReject(m) },
              { key: 'del', label: 'Xoá nháp', icon: Trash2, danger: true, hidden: m.status !== 'draft', onClick: () => setDel(m) },
            ],
          },
        ]}
      />

      {editor !== undefined && <MenuEditorModal key={editor?._id || 'new'} open menu={editor} onClose={() => setEditor(undefined)} onSaved={reload} />}
      <MenuViewModal menu={view} onClose={() => setView(null)} footer={view && approveFooter(view)} />
      <ConfirmDialog
        open={!!reject}
        onClose={() => setReject(null)}
        danger
        requireReason
        reasonLabel="Lý do từ chối (người soạn sẽ thấy)"
        title="Từ chối thực đơn"
        confirmLabel="Từ chối"
        message={reject ? `Thực đơn ${formatWeek(reject.weekStart)} sẽ quay về trạng thái bị từ chối để sửa lại.` : ''}
        onConfirm={(reason) => run(() => menuApi.reject(reject._id, reason), 'Đã từ chối thực đơn')}
      />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        danger
        title="Xoá thực đơn nháp"
        confirmLabel="Xoá"
        message={del ? `Xoá thực đơn ${formatWeek(del.weekStart)}? Thao tác không hoàn tác.` : ''}
        onConfirm={() => run(() => menuApi.remove(del._id), 'Đã xoá thực đơn')}
      />
    </>
  );
}
