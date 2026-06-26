import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import VolunteerLogin from './pages/VolunteerLogin';
import VolunteerFlow from './pages/VolunteerFlow';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<VolunteerLogin />} />
      <Route path="/game" element={<VolunteerFlow />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
