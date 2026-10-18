import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Header } from './Header.jsx';

// Bố cục admin / hiệu trưởng / giáo viên: sidebar trái + header + nội dung max-w 1280 căn trái
export function StaffLayout() {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
