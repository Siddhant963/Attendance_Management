import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import { PublicOnly, RequireAuth, RequireRole } from './components/RouteGuards.jsx';
import { LoginPage, SignupPage } from './pages/AuthPages.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import PunchPage from './pages/PunchPage.jsx';
import MyAttendancePage from './pages/MyAttendancePage.jsx';
import { ApprovalsPage, MyOvertimePage } from './pages/OvertimePages.jsx';
import VerificationPage from './pages/VerificationPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/punch" element={<PunchPage />} />
          <Route path="/my-attendance" element={<MyAttendancePage />} />
          <Route path="/my-overtime" element={<MyOvertimePage />} />
          <Route path="/reports" element={<ReportPage />} />
          <Route element={<RequireRole roles={['manager', 'admin']} />}>
            <Route path="/verification" element={<VerificationPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
          </Route>
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
