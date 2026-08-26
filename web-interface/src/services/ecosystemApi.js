import api from './api';

export function getApiErrorMessage(error, fallback = 'Something went wrong') {
  const payload = error.response?.data?.error;
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (payload?.message) return payload.message;
  return fallback;
}

export async function fetchMyPoints() {
  const { data } = await api.get('/points/me');
  return data.data;
}

export async function fetchMySubmissions() {
  const { data } = await api.get('/submissions/me');
  return data.data.submissions;
}

export async function fetchBadgeProgress() {
  const { data } = await api.get('/badges/progress');
  return data.data;
}

export async function fetchContent() {
  const { data } = await api.get('/content');
  return data.data.content;
}

export async function fetchMissions() {
  const { data } = await api.get('/missions');
  return data.data.missions;
}

export async function fetchSubmissions() {
  const { data } = await api.get('/submissions');
  return data.data.submissions;
}

export async function reviewSubmission(id, status, reviewNote) {
  const { data } = await api.patch(`/submissions/${id}/review`, {
    status,
    reviewNote: reviewNote || undefined,
  });
  return data.data.submission;
}

export function formatApiDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function mapSubmissionStatus(status) {
  switch (status) {
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'PENDING_REVIEW':
      return 'Pending';
    case 'ONGOING':
      return 'Ongoing';
    default:
      return status;
  }
}

export function badgeTierIcon(tier) {
  switch (tier) {
    case 'GOLD':
      return 'trophy';
    case 'SILVER':
      return 'star';
    case 'BRONZE':
      return 'leaf';
    default:
      return 'badge';
  }
}
