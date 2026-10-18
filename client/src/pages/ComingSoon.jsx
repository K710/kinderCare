import { Hammer } from 'lucide-react';
import { EmptyState } from '../components/ui/index.js';

// Trang giữ chỗ cho GĐ6
export default function ComingSoon({ title }) {
  return <EmptyState icon={Hammer} title={title} description="Màn hình này đang được hoàn thiện ở giai đoạn tiếp theo." />;
}
