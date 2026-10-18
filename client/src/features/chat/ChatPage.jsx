import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { Send, ArrowLeft, Paperclip, MessageCircle, Plus, X, FileText } from 'lucide-react';
import { messageApi } from '../../api/message.api.js';
import { errorMessage } from '../../api/axios.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useAuth } from '../../hooks/useAuth.js';
import { toast } from '../../stores/toast.store.js';
import { Avatar, Button, Skeleton, EmptyState, Modal, SearchInput } from '../../components/ui/index.js';
import { fromNow, formatTime, formatDate } from '../../utils/format.js';
import { compressImage, MAX_UPLOAD_MB } from '../../utils/image.js';
import dayjs from '../../utils/dayjs.js';

const POLL_MS = 10000; // dự phòng khi chưa có socket (GĐ7.1)

/* ---------- Bong bóng tin nhắn ---------- */
function ChatBubble({ msg, mine }) {
  return (
    <div className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={clsx('max-w-[78%] rounded-card px-3 py-2 text-sm', mine ? 'rounded-br-md bg-leaf text-white' : 'rounded-bl-md bg-surface border border-line text-ink')}>
        {msg.student && <p className={clsx('mb-0.5 text-xs', mine ? 'text-white/80' : 'text-ink-soft')}>Về bé {msg.student.fullName}</p>}
        {msg.attachments?.map((a, i) =>
          a.type === 'image' ? (
            <a key={i} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.name || 'Ảnh'} className="mb-1 max-h-60 rounded-photo object-cover" loading="lazy" /></a>
          ) : (
            <a key={i} href={a.url} target="_blank" rel="noreferrer" className={clsx('mb-1 flex items-center gap-1 underline', mine ? 'text-white' : 'text-sky')}><FileText size={14} aria-hidden />{a.name || 'Tệp đính kèm'}</a>
          ),
        )}
        {msg.content && <p className="whitespace-pre-line break-words">{msg.content}</p>}
        <p className={clsx('mt-0.5 text-right text-[11px] tabular-nums', mine ? 'text-white/70' : 'text-ink-soft')} title={formatDate(msg.createdAt)}>
          {formatTime(msg.createdAt)}{mine && msg.readAt ? ' · Đã xem' : ''}
        </p>
      </div>
    </div>
  );
}

/* ---------- Khung chat với 1 người ---------- */
function Thread({ other, onBack }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const otherId = other.user._id;

  const load = async (before) => {
    const r = await messageApi.history(otherId, { before, limit: 30 });
    const asc = [...r.items].reverse();
    setItems((cur) => (before ? [...asc, ...cur] : mergeNew(cur, asc)));
    setHasMore(r.hasMore);
    return asc;
  };
  // Gộp tin mới (poll) không trùng
  const mergeNew = (cur, incoming) => {
    const ids = new Set(cur.map((m) => m._id));
    const fresh = incoming.filter((m) => !ids.has(m._id));
    // cập nhật readAt của tin cũ
    const updated = cur.map((m) => incoming.find((x) => x._id === m._id) || m);
    return [...updated, ...fresh];
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setItems([]);
    load().then(() => alive && setLoading(false)).catch((e) => alive && toast.error(errorMessage(e)));
    messageApi.markRead(otherId).catch(() => {});
    const t = setInterval(() => load().then(() => messageApi.markRead(otherId).catch(() => {})).catch(() => {}), POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [otherId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [items.length, loading]);

  const send = async () => {
    const content = text.trim();
    if (!content && !files.length) return;
    setSending(true);
    try {
      const attachments = [];
      for (const f of files) {
        const up = await messageApi.upload(await compressImage(f));
        attachments.push({ url: up.url, type: up.type, name: up.name });
      }
      const msg = await messageApi.send({ receiver: otherId, content: content || undefined, attachments: attachments.length ? attachments : undefined, student: other.students?.length === 1 ? other.students[0]._id : undefined });
      setItems((cur) => [...cur, msg]);
      setText('');
      setFiles([]);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  // Nhóm theo ngày
  let lastDay = '';
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <button type="button" onClick={onBack} className="touch -ml-2 flex items-center justify-center rounded-btn text-ink-soft md:hidden" aria-label="Quay lại"><ArrowLeft size={22} /></button>
        <Avatar name={other.user.fullName} src={other.user.avatar} role={other.user.role} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{other.user.fullName}</p>
          {other.students?.length > 0 && <p className="truncate text-xs text-ink-soft">{other.students.map((s) => `${s.class?.name ? `${s.class.name} · ` : ''}${s.nickname || s.fullName}`).join(' | ')}</p>}
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto bg-paper px-3 py-3">
        {hasMore && <div className="text-center"><Button size="sm" variant="ghost" onClick={() => load(items[0]?.createdAt)}>Tải tin cũ hơn</Button></div>}
        {loading && <div className="space-y-2"><Skeleton className="ml-auto h-10 w-1/2" /><Skeleton className="h-10 w-2/3" /></div>}
        {!loading && !items.length && <p className="py-10 text-center text-sm text-ink-soft">Chưa có tin nhắn. Gửi lời chào đầu tiên!</p>}
        {items.map((m) => {
          const day = dayjs(m.createdAt).format('YYYY-MM-DD');
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={m._id}>
              {showDay && <p className="my-2 text-center text-[11px] text-ink-soft">{dayjs(m.createdAt).isSame(dayjs(), 'day') ? 'Hôm nay' : formatDate(m.createdAt)}</p>}
              <ChatBubble msg={m} mine={(m.sender?._id || m.sender) === user?._id} />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="safe-bottom border-t border-line bg-surface p-2">
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((f, i) => <span key={i} className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-xs">{f.name}<button type="button" onClick={() => setFiles((a) => a.filter((_, idx) => idx !== i))} aria-label="Bỏ tệp"><X size={12} /></button></span>)}
          </div>
        )}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label className="touch flex cursor-pointer items-center justify-center rounded-btn text-ink-soft hover:bg-paper" aria-label="Đính kèm">
            <Paperclip size={20} aria-hidden />
            <input
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf"
              onChange={(e) => {
                const f = e.target.files[0];
                if (f && f.size > MAX_UPLOAD_MB * 1024 * 1024) toast.error(`Tệp vượt ${MAX_UPLOAD_MB}MB`);
                else if (f) setFiles((a) => [...a, f].slice(0, 5));
                e.target.value = '';
              }}
            />
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder="Nhập tin nhắn… (Enter để gửi)"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-btn border border-line bg-surface px-3 py-2.5 text-base md:text-sm"
            aria-label="Tin nhắn"
          />
          <Button type="submit" size="icon" icon={Send} loading={sending} aria-label="Gửi" disabled={!text.trim() && !files.length} />
        </form>
      </div>
    </div>
  );
}

/* ---------- Trang chat (GV ↔ PH) ---------- */
export default function ChatPage() {
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const { data: convs, loading, error, reload } = useFetch(messageApi.conversations, []);
  const { data: contacts } = useFetch(messageApi.contacts, []);
  const [pickOpen, setPickOpen] = useState(false);
  const [q, setQ] = useState('');
  const activeId = sp.get('with');

  // Làm mới danh sách hội thoại định kỳ
  useEffect(() => { const t = setInterval(reload, POLL_MS * 2); return () => clearInterval(t); }, [reload]);

  const contactMap = new Map((contacts || []).map((c) => [c.user._id, c]));
  const active = activeId ? contactMap.get(activeId) || (convs || []).map((c) => ({ user: c.user, students: [] })).find((c) => c.user?._id === activeId) : null;
  const open = (id) => { setSp({ with: id }); setPickOpen(false); };
  const filteredContacts = (contacts || []).filter((c) => !q || c.user.fullName.toLowerCase().includes(q.toLowerCase()) || c.students.some((s) => s.fullName.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="card flex h-[calc(100dvh-8.5rem)] min-h-[480px] overflow-hidden md:h-[calc(100dvh-9.5rem)]">
      {/* Danh sách hội thoại */}
      <aside className={clsx('w-full shrink-0 flex-col border-r border-line md:flex md:w-80', activeId ? 'hidden' : 'flex')}>
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          <span className="text-sm text-ink-soft">{convs?.length ? `${convs.length} hội thoại` : ''}</span>
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setPickOpen(true)}>Mới</Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {error && <p className="p-3 text-sm text-berry">{error}</p>}
          {loading ? (
            <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : !convs?.length ? (
            <EmptyState icon={MessageCircle} title="Chưa có hội thoại" description={user?.role === 'teacher' ? 'Nhắn cho ba mẹ của các bé trong lớp.' : 'Nhắn cho cô giáo của bé.'} actionLabel="Bắt đầu trò chuyện" onAction={() => setPickOpen(true)} className="m-3 border-0" />
          ) : (
            <ul className="divide-y divide-line">
              {convs.map((c) => (
                <li key={c.conversationId}>
                  <button type="button" onClick={() => open(c.user?._id)} className={clsx('flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-paper', activeId === c.user?._id && 'bg-leaf-soft/40')}>
                    <Avatar name={c.user?.fullName} src={c.user?.avatar} role={c.user?.role} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><p className={clsx('truncate text-sm', c.unread ? 'font-semibold' : 'font-medium')}>{c.user?.fullName || 'Người dùng'}</p><span className="shrink-0 text-[11px] text-ink-soft">{fromNow(c.lastMessage.createdAt)}</span></div>
                      {contactMap.get(c.user?._id)?.students?.length > 0 && (
                        <p className="truncate text-[11px] text-ink-soft">{contactMap.get(c.user._id).students.map((s) => `${s.class?.name || ''} · ${s.nickname || s.fullName}`).join(' | ')}</p>
                      )}
                      <div className="flex items-center justify-between gap-2"><p className={clsx('truncate text-xs', c.unread ? 'text-ink' : 'text-ink-soft')}>{c.lastMessage.sender === user?._id ? 'Bạn: ' : ''}{c.lastMessage.content || (c.lastMessage.attachments?.length ? '[Tệp đính kèm]' : '')}</p>{c.unread > 0 && <span className="min-w-[18px] rounded-full bg-sun px-1 text-center text-[11px] font-semibold leading-[18px] text-ink">{c.unread}</span>}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Khung chat */}
      <section className={clsx('min-w-0 flex-1 flex-col md:flex', activeId ? 'flex' : 'hidden')}>
        {active ? (
          <Thread key={active.user._id} other={active} onBack={() => setSp({})} />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-soft">Chọn một hội thoại hoặc bấm "Mới" để bắt đầu.</div>
        )}
      </section>

      <Modal open={pickOpen} onClose={() => setPickOpen(false)} size="sm" title="Trò chuyện mới" description={user?.role === 'teacher' ? 'Phụ huynh của các bé trong lớp bạn' : 'Giáo viên lớp của bé'}>
        <SearchInput value={q} onChange={setQ} placeholder="Tìm theo tên…" className="mb-3" />
        {!contacts ? <Skeleton className="h-20" /> : !filteredContacts.length ? <p className="text-sm text-ink-soft">Không có ai để nhắn.</p> : (
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {filteredContacts.map((c) => (
              <li key={c.user._id}>
                <button type="button" onClick={() => open(c.user._id)} className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-paper">
                  <Avatar name={c.user.fullName} src={c.user.avatar} role={c.user.role} size="sm" />
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{c.user.fullName}</p><p className="truncate text-xs text-ink-soft">{c.students.map((s) => `${s.class?.name ? `${s.class.name} · ` : ''}${s.nickname || s.fullName}`).join(' | ')}</p></div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
