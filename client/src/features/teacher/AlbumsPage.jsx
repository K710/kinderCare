import { useState } from 'react';
import { Plus, Images, Trash2, ImagePlus, X, Pencil } from 'lucide-react';
import { albumApi } from '../../api/album.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useMyClasses } from '../../hooks/useMyClasses.js';
import { usePagination } from '../../hooks/usePagination.js';
import { useAuth } from '../../hooks/useAuth.js';
import { toast } from '../../stores/toast.store.js';
import { Button, Input, Textarea, Modal, Skeleton, EmptyState, ConfirmDialog, Pagination, IconButton } from '../../components/ui/index.js';
import { ClassSelect } from '../../components/shared/ClassSelect.jsx';
import { FormError } from '../../components/shared/FormError.jsx';
import { ErrorBanner } from '../../components/shared/ErrorBanner.jsx';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { formatDate, toInputDate } from '../../utils/format.js';
import { compressImages, validateImage, ACCEPT_IMAGES } from '../../utils/image.js';

/* ---------- Chọn ảnh có xem trước ---------- */
function FilePicker({ files, setFiles, max = 20 }) {
  // Kiểm tra định dạng/kích thước rồi nén về ~1600px trước khi thêm vào danh sách
  const add = async (list) => {
    const ok = [];
    for (const f of list) {
      const err = validateImage(f);
      if (err) toast.error(err);
      else ok.push(f);
    }
    const small = await compressImages(ok);
    setFiles((f) => [...f, ...small].slice(0, max));
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <span key={i} className="relative">
            <img src={URL.createObjectURL(f)} alt="" className="h-20 w-20 rounded-photo object-cover" onLoad={(e) => URL.revokeObjectURL(e.target.src)} />
            <button type="button" onClick={() => setFiles((arr) => arr.filter((_, idx) => idx !== i))} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white" aria-label="Bỏ ảnh"><X size={12} /></button>
          </span>
        ))}
        {files.length < max && (
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-photo border border-dashed border-line text-xs text-ink-soft hover:bg-paper">
            <ImagePlus size={20} aria-hidden /> Thêm ảnh
            <input type="file" accept={ACCEPT_IMAGES} multiple className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
          </label>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-soft">{files.length}/{max} ảnh · JPG, PNG, WebP, HEIC · tối đa 10MB, tự nén về 1600px.</p>
    </div>
  );
}

/* ---------- Tạo album ---------- */
function CreateAlbumModal({ open, onClose, classId, onDone }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(toInputDate(new Date()));
  const [files, setFiles] = useState([]);
  const [err, setErr] = useState('');
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr('');
    if (!title.trim()) return setErr('Nhập tiêu đề album.');
    if (!files.length) return setErr('Chọn ít nhất 1 ảnh.');
    setLoading(true);
    try {
      await albumApi.create({ title: title.trim(), description: description.trim(), class: classId, date }, files, (e) => setProgress(Math.round((e.loaded / (e.total || 1)) * 100)));
      toast.success('Đã đăng album');
      onDone();
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Đăng album ảnh" description="Phụ huynh của lớp sẽ thấy ngay sau khi đăng." footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button onClick={submit} loading={loading}>{loading ? `Đang tải ${progress}%` : 'Đăng album'}</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <Input label="Tiêu đề" placeholder="vd: Hoạt động ngoài trời" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Ngày hoạt động" type="date" value={date} max={toInputDate(new Date())} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Textarea label="Mô tả" rows={2} placeholder="Không bắt buộc" value={description} onChange={(e) => setDescription(e.target.value)} />
        <FilePicker files={files} setFiles={setFiles} />
        <FormError message={err} />
      </div>
    </Modal>
  );
}

/* ---------- Xem album: lưới ảnh, thêm / xoá ảnh ---------- */
export function AlbumViewModal({ albumId, onClose, canEdit = false, onChanged }) {
  const { data: album, loading, reload } = useFetch(() => albumApi.get(albumId), [albumId], { enabled: !!albumId });
  const [adding, setAdding] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [delPhoto, setDelPhoto] = useState(null);
  const [delAlbum, setDelAlbum] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  if (!albumId) return null;

  const upload = async () => {
    if (!adding.length) return;
    setUploading(true);
    try {
      await albumApi.addPhotos(albumId, adding);
      toast.success(`Đã thêm ${adding.length} ảnh`);
      setAdding([]);
      reload();
      onChanged?.();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };
  const saveInfo = async () => {
    try {
      await albumApi.update(albumId, { title: title.trim(), description: description.trim() });
      toast.success('Đã lưu album');
      setEditing(false);
      reload();
      onChanged?.();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="xl"
        title={album?.title || 'Album'}
        description={album ? `${album.class?.name || ''} · ${formatDate(album.date)} · ${album.photos.length} ảnh${album.createdBy ? ` · ${album.createdBy.fullName}` : ''}` : ''}
        footer={
          canEdit ? (
            <>
              <Button variant="ghost" icon={Trash2} className="mr-auto text-berry" onClick={() => setDelAlbum(true)}>Xoá album</Button>
              <Button variant="secondary" icon={Pencil} onClick={() => { setTitle(album.title); setDescription(album.description || ''); setEditing(true); }}>Sửa thông tin</Button>
              <Button variant="secondary" onClick={onClose}>Đóng</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onClose}>Đóng</Button>
          )
        }
      >
        {loading || !album ? (
          <div className="grid grid-cols-3 gap-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-photo" />)}</div>
        ) : (
          <div className="space-y-4">
            {editing ? (
              <div className="space-y-3 rounded-card border border-line p-3">
                <Input label="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Textarea label="Mô tả" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                <div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Huỷ</Button><Button size="sm" onClick={saveInfo}>Lưu</Button></div>
              </div>
            ) : (
              album.description && <p className="text-sm text-ink-soft">{album.description}</p>
            )}
            {/* PhotoGrid */}
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {album.photos.map((p) => (
                <li key={p._id} className="group relative">
                  <button type="button" onClick={() => setLightbox(p)} className="block w-full">
                    <img src={p.url} alt={p.caption || album.title} className="aspect-square w-full rounded-photo object-cover" loading="lazy" />
                  </button>
                  {canEdit && (
                    <button type="button" onClick={() => setDelPhoto(p)} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label="Xoá ảnh"><X size={14} /></button>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && (
              <div className="rounded-card border border-line p-3">
                <p className="mb-2 text-sm font-medium">Thêm ảnh</p>
                <FilePicker files={adding} setFiles={setAdding} max={20} />
                {adding.length > 0 && <Button className="mt-2" size="sm" icon={ImagePlus} onClick={upload} loading={uploading}>Tải lên {adding.length} ảnh</Button>}
              </div>
            )}
          </div>
        )}
      </Modal>

      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-4" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <img src={lightbox.url} alt={lightbox.caption || ''} className="max-h-full max-w-full rounded-photo object-contain" />
          {lightbox.caption && <p className="absolute bottom-6 left-0 right-0 text-center text-sm text-white">{lightbox.caption}</p>}
          <button type="button" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Đóng"><X size={22} /></button>
        </div>
      )}
      <ConfirmDialog open={!!delPhoto} onClose={() => setDelPhoto(null)} danger title="Xoá ảnh" confirmLabel="Xoá ảnh" message="Ảnh sẽ bị xoá khỏi album và kho lưu trữ." onConfirm={() => albumApi.removePhoto(albumId, delPhoto._id).then(() => { toast.success('Đã xoá ảnh'); reload(); onChanged?.(); }).catch((e) => toast.error(errorMessage(e)))} />
      <ConfirmDialog open={delAlbum} onClose={() => setDelAlbum(false)} danger title="Xoá album" confirmLabel="Xoá album" message={`Xoá "${album?.title}" cùng toàn bộ ${album?.photos.length || 0} ảnh? Thao tác không hoàn tác.`} onConfirm={() => albumApi.remove(albumId).then(() => { toast.success('Đã xoá album'); onChanged?.(); onClose(); }).catch((e) => toast.error(errorMessage(e)))} />
    </>
  );
}

/* ---------- Lưới album (dùng chung GV / PH) ---------- */
export function AlbumGrid({ albums, loading, onOpen, emptyAction }) {
  if (loading) return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-card" />)}</div>;
  if (!albums?.length) return <EmptyState icon={Images} title="Chưa có album nào" description="Đăng ảnh hoạt động đầu tiên để ba mẹ cùng xem." actionLabel={emptyAction?.label} onAction={emptyAction?.onClick} />;
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {albums.map((a) => (
        <li key={a._id}>
          <button type="button" onClick={() => onOpen(a)} className="card block w-full overflow-hidden text-left transition-colors hover:bg-paper">
            {a.cover ? <img src={a.cover} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" /> : <div className="flex aspect-[4/3] items-center justify-center bg-paper text-ink-soft"><Images size={28} strokeWidth={1.5} aria-hidden /></div>}
            <div className="p-3">
              <p className="truncate font-medium">{a.title}</p>
              <p className="text-xs text-ink-soft">{formatDate(a.date)} · {a.photoCount} ảnh{a.class?.name ? ` · ${a.class.name}` : ''}</p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Trang GV ---------- */
export default function AlbumsPage() {
  const { role } = useAuth();
  const { classes, loading: lc, selectedId, select } = useMyClasses();
  const { page, setPage, params } = usePagination({}, 12);
  const { data, loading, error, reload } = useFetch(() => albumApi.list({ ...params, class: selectedId }), [selectedId, params.page], { enabled: !!selectedId });
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);

  if (!lc && !classes.length) return <EmptyState icon={Images} title="Bạn chưa được phân công lớp" />;

  return (
    <>
      <PageHeader
        description="Ảnh hoạt động của lớp, phụ huynh xem được ngay."
        actions={
          <>
            <ClassSelect classes={classes} value={selectedId} onChange={select} />
            <Button icon={Plus} onClick={() => setCreating(true)}>Đăng album</Button>
          </>
        }
      />
      <ErrorBanner message={error} onRetry={reload} className="mb-4" />
      <AlbumGrid albums={data?.data} loading={loading} onOpen={(a) => setOpen(a._id)} emptyAction={{ label: 'Đăng album đầu tiên', onClick: () => setCreating(true) }} />
      {data?.pagination?.totalPages > 1 && <div className="mt-4 flex justify-end"><Pagination {...data.pagination} page={page} onChange={setPage} /></div>}

      {creating && <CreateAlbumModal open classId={selectedId} onClose={() => setCreating(false)} onDone={reload} />}
      <AlbumViewModal albumId={open} onClose={() => setOpen(null)} canEdit={role === 'teacher'} onChanged={reload} />
    </>
  );
}
