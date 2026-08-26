import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Icon from '../../components/icons/Icon';
import { requestBadgeCheck } from '../../utils/badgeUnlocks';
import styles from './Events.module.css';

function statusLabel(status) {
  switch (status) {
    case 'ONGOING':
      return 'Joined';
    case 'PENDING_REVIEW':
      return 'Pending review';
    case 'APPROVED':
      return 'Completed';
    case 'REJECTED':
      return 'Rejected';
    default:
      return '';
  }
}

function pickLatestByMission(submissions) {
  const map = new Map();
  for (const item of submissions) {
    if (!item?.missionId) continue;
    const prev = map.get(item.missionId);
    if (!prev) {
      map.set(item.missionId, item);
      continue;
    }
    const prevTime = new Date(prev.submittedAt || 0).getTime();
    const nextTime = new Date(item.submittedAt || 0).getTime();
    if (nextTime >= prevTime) map.set(item.missionId, item);
  }
  return map;
}

function missionGoalText(event) {
  if (event?.type === 'QUANTITY_BASED' && event.targetQuantity != null) {
    return `Goal: ${event.targetQuantity} items (then ${event.points ?? 0} pts)`;
  }
  if (event?.type === 'STREAK_BASED' && event.targetDays != null) {
    return `Goal: ${event.targetDays} approved submissions (then ${event.points ?? 0} pts)`;
  }
  if (event?.points != null) {
    return `${event.points} pts on completion`;
  }
  return '';
}

export default function Events() {
  const [eventList, setEventList] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [submitDrafts, setSubmitDrafts] = useState({});
  const [openSubmitId, setOpenSubmitId] = useState(null);

  const submissionByMission = useMemo(
    () => pickLatestByMission(submissions),
    [submissions]
  );

  const loadEvents = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    setActionError('');

    try {
      const [eventsRes, mineRes] = await Promise.all([
        api.get('/events'),
        api.get('/events/my-submissions').catch(() => ({ data: [] })),
      ]);
      setEventList(Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setSubmissions(Array.isArray(mineRes.data) ? mineRes.data : []);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        'Unable to load events. Please check your connection and try again.';
      if (!silent) {
        setError(message);
        setEventList([]);
        setSubmissions([]);
      } else {
        setActionError(message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleJoin = async (eventId) => {
    setBusyId(eventId);
    setActionError('');
    try {
      const { data } = await api.post(`/events/${eventId}/join`);
      setSubmissions((prev) => {
        const without = prev.filter((s) => s.missionId !== eventId);
        return data ? [...without, data] : without;
      });
      setOpenSubmitId(eventId);
    } catch (err) {
      setActionError(
        err.response?.data?.error || 'Unable to join this event. Please try again.'
      );
      await loadEvents({ silent: true });
    } finally {
      setBusyId(null);
    }
  };

  const handleProofPhotoChange = (eventId, file) => {
    setSubmitDrafts((prev) => {
      const current = prev[eventId] || {};
      if (current.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      if (!file) {
        return {
          ...prev,
          [eventId]: { ...current, file: null, previewUrl: '' },
        };
      }
      return {
        ...prev,
        [eventId]: {
          ...current,
          file,
          previewUrl: URL.createObjectURL(file),
        },
      };
    });
  };

  const handleSubmit = async (eventId) => {
    const draft = submitDrafts[eventId] || {};
    const proofText = String(draft.proofText || '').trim();
    if (!proofText) {
      setActionError('Please describe what you completed (proof text).');
      return;
    }

    setBusyId(eventId);
    setActionError('');
    try {
      const body = { proofText };
      if (draft.quantity !== '' && draft.quantity != null) {
        body.quantity = draft.quantity;
      }

      if (draft.file) {
        const formData = new FormData();
        formData.append('file', draft.file);
        const uploadRes = await api.post('/events/mission-proof', formData);
        if (uploadRes.data?.id) {
          body.uploadId = uploadRes.data.id;
        }
        if (uploadRes.data?.fileUrl) {
          body.proofImageUrl = uploadRes.data.fileUrl;
        }
      }

      const { data } = await api.post(`/events/${eventId}/submit`, body);
      setSubmissions((prev) => {
        const without = prev.filter((s) => s.missionId !== eventId);
        return data ? [...without, data] : without;
      });
      setOpenSubmitId(null);
      setSubmitDrafts((prev) => {
        const next = { ...prev };
        if (next[eventId]?.previewUrl) {
          URL.revokeObjectURL(next[eventId].previewUrl);
        }
        delete next[eventId];
        return next;
      });
      // Auto-approved missions can unlock badges immediately.
      if (data?.status === 'APPROVED') {
        setTimeout(() => requestBadgeCheck(), 400);
      }
    } catch (err) {
      setActionError(
        err.response?.data?.error || 'Unable to submit proof. Please try again.'
      );
      await loadEvents({ silent: true });
    } finally {
      setBusyId(null);
    }
  };

  const updateDraft = (eventId, field, value) => {
    setSubmitDrafts((prev) => ({
      ...prev,
      [eventId]: { ...prev[eventId], [field]: value },
    }));
  };

  return (
    <div className="page page--ambient">
      <header className="page-header">
        <span className={`page-header__mark ${styles.calMark}`} aria-hidden="true">
          <svg
            className={styles.calSvg}
            xmlns="http://www.w3.org/2000/svg"
            width={96}
            height={96}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect className={styles.calBody} x="3" y="4" width="18" height="18" rx="2" />
            <line className={styles.calRing} x1="16" y1="2" x2="16" y2="6" />
            <line className={styles.calRing} x1="8" y1="2" x2="8" y2="6" />
            <line className={styles.calHeader} x1="3" y1="10" x2="21" y2="10" />
            <g className={styles.pageFlip1}>
              <rect x="5" y="12" width="14" height="8" rx="0.5" fill="currentColor" stroke="none" opacity="0.18" />
            </g>
            <g className={styles.pageFlip2}>
              <rect x="5" y="12" width="14" height="8" rx="0.5" fill="currentColor" stroke="none" opacity="0.22" />
            </g>
            <g className={styles.pageFlip3}>
              <rect x="5" y="12" width="14" height="8" rx="0.5" fill="currentColor" stroke="none" opacity="0.28" />
              <circle cx="8" cy="15" r="0.7" fill="currentColor" stroke="none" />
              <circle cx="12" cy="15" r="0.7" fill="currentColor" stroke="none" />
              <circle cx="16" cy="15" r="0.7" fill="currentColor" stroke="none" />
              <circle cx="8" cy="18" r="0.7" fill="currentColor" stroke="none" />
              <circle cx="12" cy="18" r="0.7" fill="currentColor" stroke="none" />
            </g>
          </svg>
        </span>
        <h1>Campus Missions</h1>
        <p>Join a mission, submit your proof, and progress toward badges.</p>
      </header>

      {loading && (
        <p className={styles.status} aria-live="polite">
          Loading events…
        </p>
      )}

      {!loading && error && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={() => loadEvents()}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && actionError && (
        <p className={styles.actionError} role="alert">
          {actionError}
        </p>
      )}

      {!loading && !error && (
        <div className={styles.list} data-undo="UNDO MISSION GLASS">
          {eventList.length === 0 ? (
            <p className={styles.status}>No active missions right now.</p>
          ) : (
            eventList.map((event) => {
              const mine = submissionByMission.get(event.id);
              const myStatus = mine?.status || '';
              const label = statusLabel(myStatus);
              const canJoin = !myStatus || myStatus === 'REJECTED';
              const canSubmit = myStatus === 'ONGOING';
              const showForm = canSubmit && openSubmitId === event.id;
              const draft = submitDrafts[event.id] || {
                proofText: '',
                quantity: '',
                file: null,
                previewUrl: '',
              };

              return (
                <article key={event.id} className={`card ${styles.eventCard}`}>
                  <div className={styles.header}>
                    <h3 className={styles.name}>{event.name}</h3>
                    <span className={styles.date}>{event.date}</span>
                  </div>
                  <p className={styles.location}>
                    <Icon name="map-pin" size={15} />
                    {event.location}
                    {event.points != null ? ` · ${event.points} pts` : ''}
                  </p>
                  {missionGoalText(event) ? (
                    <p className={styles.goal}>{missionGoalText(event)}</p>
                  ) : null}
                  <p className={styles.description}>{event.description}</p>

                  <div className={styles.actions}>
                    {label && (
                      <span
                        className={`tag ${
                          myStatus === 'APPROVED' ? '' : 'tag-secondary'
                        }`}
                      >
                        {label}
                      </span>
                    )}

                    {canJoin && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busyId === event.id}
                        onClick={() => handleJoin(event.id)}
                      >
                        {busyId === event.id ? 'Joining…' : 'Join'}
                      </button>
                    )}

                    {canSubmit && !showForm && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setOpenSubmitId(event.id)}
                      >
                        Submit proof
                      </button>
                    )}

                    {myStatus === 'PENDING_REVIEW' && (
                      <span className={styles.hint}>Waiting for admin review</span>
                    )}

                    {myStatus === 'APPROVED' && (
                      <span className={styles.hint}>Counts toward mission badges</span>
                    )}

                    {myStatus === 'REJECTED' && mine?.reviewNote && (
                      <span className={styles.hint}>{mine.reviewNote}</span>
                    )}
                  </div>

                  {showForm && (
                    <div className={styles.submitPanel}>
                      <label className={styles.field}>
                        <span>What did you complete?</span>
                        <textarea
                          rows={3}
                          value={draft.proofText}
                          onChange={(e) =>
                            updateDraft(event.id, 'proofText', e.target.value)
                          }
                          placeholder="Short proof / description"
                        />
                      </label>
                      <label className={styles.field}>
                        <span>
                          {event.type === 'QUANTITY_BASED' && event.targetQuantity != null
                            ? `Quantity (need ${event.targetQuantity} total for points)`
                            : 'Quantity (optional)'}
                        </span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={draft.quantity}
                          onChange={(e) =>
                            updateDraft(event.id, 'quantity', e.target.value)
                          }
                          placeholder={
                            event.targetQuantity != null
                              ? `e.g. ${event.targetQuantity}`
                              : 'e.g. 5'
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Proof photo (optional)</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) =>
                            handleProofPhotoChange(
                              event.id,
                              e.target.files?.[0] || null
                            )
                          }
                        />
                        <span className={styles.photoHint}>
                          JPEG / PNG / WebP, max 5MB. Stored in Azure Blob when configured.
                        </span>
                      </label>
                      {draft.previewUrl ? (
                        <img
                          src={draft.previewUrl}
                          alt="Proof preview"
                          className={styles.photoPreview}
                        />
                      ) : null}
                      <div className={styles.submitActions}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busyId === event.id}
                          onClick={() => handleSubmit(event.id)}
                        >
                          {busyId === event.id ? 'Submitting…' : 'Submit'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={busyId === event.id}
                          onClick={() => setOpenSubmitId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
