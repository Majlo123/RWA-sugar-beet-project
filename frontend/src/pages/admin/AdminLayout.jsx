import { Outlet } from 'react-router-dom';

function AdminLayout() {
  return (
    <div className="page-container py-12 animate-fade-in">
      <Outlet />
    </div>
  );
}

export default AdminLayout;
