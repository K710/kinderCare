// Lỗi từ server hiển thị trong form
export function FormError({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-btn bg-berry-soft px-3 py-2 text-sm text-berry">
      {message}
    </p>
  );
}
