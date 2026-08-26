import { ROLES } from '../context/AuthContext';

const BFF_ADMIN_ROLES = new Set([
  ROLES.MODERATOR,
  ROLES.CONTENT_MANAGER,
  ROLES.REWARDS_MANAGER,
  ROLES.DATA_ANALYST,
  ROLES.SYSTEM_ADMIN,
]);

/** Normalise login payload from our BFF or Student 4's API. */
export function parseLoginResponse(data) {
  const payload = data?.data ?? data;

  if (!payload?.token) {
    throw new Error('Login response missing token');
  }

  return {
    token: payload.token,
    student4Token: payload.student4Token || null,
    role: payload.user?.role ?? payload.role,
    name: payload.user?.name ?? payload.name,
    email: payload.user?.email ?? payload.email ?? '',
  };
}

export function mapApiRoleToFrontend(apiRole) {
  if (apiRole === 'STUDENT') return ROLES.END_USER;
  if (apiRole === 'ADMIN') return ROLES.SYSTEM_ADMIN;
  return apiRole;
}

export function isStudentApiRole(apiRole) {
  return apiRole === 'STUDENT' || apiRole === ROLES.END_USER;
}

export function isAdminApiRole(apiRole) {
  return apiRole === 'ADMIN' || BFF_ADMIN_ROLES.has(apiRole);
}
