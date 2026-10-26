import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import ProtectedRoute from './components/common/ProtectedRoute';
import StudentLayout from './components/layout/StudentLayout';
import AdminLayout from './components/layout/AdminLayout';

import Login from './pages/Login';
import SignIn from './pages/SignIn';
import Register from './pages/Register';

import StudentDashboard from './pages/student/Dashboard';
import ExamsList from './pages/student/ExamsList';
import ExamDetails from './pages/student/ExamDetails';
import PreExamInstructions from './pages/student/PreExamInstructions';
import ExamInterface from './pages/student/ExamInterface';
import Results from './pages/student/Results';
import ResultDetail from './pages/student/ResultDetail';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminExams from './pages/admin/AdminExams';
import AdminCreateExam from './pages/admin/AdminCreateExam';
import AdminAddQuestion from './pages/admin/AdminAddQuestion';
import AdminResults from './pages/admin/AdminResults';

function RootRedirect() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/student"
        element={
          <ProtectedRoute role="student">
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="exams" element={<ExamsList />} />
        <Route path="exams/:examId" element={<ExamDetails />} />
        <Route path="exams/:examId/instructions" element={<PreExamInstructions />} />
        <Route path="results" element={<Results />} />
        <Route path="results/:attemptId" element={<ResultDetail />} />
      </Route>
      <Route
        path="/student/exam/:attemptId"
        element={
          <ProtectedRoute role="student">
            <ExamInterface />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="exams" element={<AdminExams />} />
        <Route path="exams/create" element={<AdminCreateExam />} />
        <Route path="questions/create" element={<AdminAddQuestion />} />
        <Route path="results" element={<AdminResults />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
