import { Navigate } from 'react-router-dom';
import { useAuth, getDashboardPath } from '../context/AuthContext';

/** Unknown paths: keep session and send users home instead of forcing login. */
export default function FallbackRedirect() {
  const { user } = useAuth();

  if (user?.role) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Navigate to="/login" replace />;
}
