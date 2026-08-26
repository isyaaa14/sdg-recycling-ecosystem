import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import UserLayout from '../components/UserLayout';
import AdminLayout from '../components/AdminLayout';
import UserLogin from '../pages/auth/UserLogin';
import UserRegister from '../pages/auth/UserRegister';
import AdminLogin from '../pages/auth/AdminLogin';
import { ROLES } from '../context/AuthContext';

import UserDashboard from '../pages/user/UserDashboard';
import Leaderboard from '../pages/user/Leaderboard';
import RewardsCatalogue from '../pages/user/RewardsCatalogue';
import Badges from '../pages/user/Badges';
import EducationalContent from '../pages/user/EducationalContent';
import Quizzes from '../pages/user/Quizzes';
import QuizTake from '../pages/user/QuizTake';
import Events from '../pages/user/Events';
import QrClaim from '../pages/user/QrClaim';
import Settings from '../pages/user/Settings';
import PointRates from '../pages/user/PointRates';
import MyRedemptions from '../pages/user/MyRedemptions';
import NatureHub from '../pages/user/NatureHub';

import AdminDashboard from '../pages/admin/AdminDashboard';
import DepositApproval from '../pages/admin/DepositApproval';
import QrIssuance from '../pages/admin/QrIssuance';
import ContentMissionAuthoring from '../pages/admin/ContentMissionAuthoring';
import BadgeAuthoring from '../pages/admin/BadgeAuthoring';
import MissionReviews from '../pages/admin/MissionReviews';
import RewardsAdministration from '../pages/admin/RewardsAdministration';
import RewardCreate from '../pages/admin/RewardCreate';
import RedemptionRequests from '../pages/admin/RedemptionRequests';
import DataAnalystPlaceholder from '../pages/admin/DataAnalystPlaceholder';
import AuditLogs from '../pages/admin/AuditLogs';
import Unauthorized from '../pages/admin/Unauthorized';
import FallbackRedirect from '../components/FallbackRedirect';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<UserLogin />} />
      <Route path="/register" element={<UserRegister />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route
        element={
          <ProtectedRoute allowedRoles={[ROLES.END_USER]}>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/rewards" element={<RewardsCatalogue />} />
        <Route path="/badges" element={<Badges />} />
        <Route path="/content" element={<EducationalContent />} />
        <Route path="/quizzes" element={<Quizzes />} />
        <Route path="/quizzes/:id" element={<QuizTake />} />
        <Route path="/missions" element={<Events />} />
        <Route path="/events" element={<Navigate to="/missions" replace />} />
        <Route path="/qr-claim" element={<QrClaim />} />
        <Route path="/point-rates" element={<PointRates />} />
        <Route path="/my-redemptions" element={<MyRedemptions />} />
        <Route path="/nature-hub" element={<NatureHub />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              ROLES.MODERATOR,
              ROLES.CONTENT_MANAGER,
              ROLES.REWARDS_MANAGER,
              ROLES.DATA_ANALYST,
              ROLES.SYSTEM_ADMIN,
            ]}
          >
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />

        <Route
          path="/admin/deposits"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MODERATOR, ROLES.SYSTEM_ADMIN]}>
              <DepositApproval />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/qr"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MODERATOR, ROLES.SYSTEM_ADMIN]}>
              <QrIssuance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/content"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.CONTENT_MANAGER, ROLES.SYSTEM_ADMIN]}
            >
              <ContentMissionAuthoring />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/badges"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.CONTENT_MANAGER, ROLES.SYSTEM_ADMIN]}
            >
              <BadgeAuthoring />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/mission-reviews"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.CONTENT_MANAGER, ROLES.SYSTEM_ADMIN]}
            >
              <MissionReviews />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/rewards"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.REWARDS_MANAGER, ROLES.SYSTEM_ADMIN]}
            >
              <RewardsAdministration />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/rewards/new"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.REWARDS_MANAGER, ROLES.SYSTEM_ADMIN]}
            >
              <RewardCreate />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/redemptions"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.REWARDS_MANAGER, ROLES.SYSTEM_ADMIN]}
            >
              <RedemptionRequests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.DATA_ANALYST, ROLES.SYSTEM_ADMIN]}
            >
              <DataAnalystPlaceholder />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />

        <Route path="/admin/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<FallbackRedirect />} />
    </Routes>
  );
}
