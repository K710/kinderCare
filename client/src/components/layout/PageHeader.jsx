// Hàng tiêu đề phụ + mô tả + hành động chính của trang (dùng trong nội dung, dưới Header)
export function PageHeader({ title, description, actions, children }) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:justify-between">
      <div>
        {title && <h2>{title}</h2>}
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
