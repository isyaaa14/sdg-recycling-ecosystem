import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import Icon from '../../components/icons/Icon';
import styles from './EducationalContent.module.css';

function bodyParagraphs(body) {
  if (!body) return [];
  return String(body)
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function EducationalContent() {
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/content');
      setContentList(Array.isArray(data) ? data : []);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        'Unable to load educational content. Please check your connection and try again.';
      setError(message);
      setContentList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const openDetail = async (item) => {
    setSelectedId(item.id);
    setDetail(item);
    setDetailError('');
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/content/${item.id}`);
      if (data?.id) setDetail(data);
    } catch (err) {
      // List item already shown; only surface error if we have no body at all.
      if (!item.body && !item.description) {
        setDetailError(
          err.response?.data?.error || 'Unable to load this article. Please try again.'
        );
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError('');
    setDetailLoading(false);
  };

  return (
    <div className="page page--ambient">
      <header className="page-header">
        <span className={`page-header__mark ${styles.leafMark}`} aria-hidden="true">
          <svg
            className={styles.growSvg}
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
            <circle className={styles.seed} cx="12" cy="21.2" r="1.35" fill="currentColor" stroke="none" />
            <path className={styles.stem} d="M12 21V12" />
            <path className={styles.leafLeft} d="M12 12C12 8 8 6 4 8c4 2 6 6 8 4" />
            <path className={styles.leafRight} d="M12 12c0-4 4-6 8-4-4 2-6 6-8 4" />
          </svg>
        </span>
        <h1>Educational Content</h1>
        <p>Sustainability articles and active campaigns from UOW Malaysia.</p>
      </header>

      {loading && (
        <p className={styles.status} aria-live="polite">
          Loading articles…
        </p>
      )}

      {!loading && error && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={loadContent}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && selectedId && detail && (
        <article className={styles.detail} data-undo="UNDO CONTENT GLASS">
          <button type="button" className={styles.backBtn} onClick={closeDetail}>
            ← Back to articles
          </button>

          <div className={styles.meta}>
            <span className="tag">
              <Icon name="content" size={12} />
              {detail.category || 'General'}
            </span>
            {detail.date ? <span className={styles.dateInline}>{detail.date}</span> : null}
          </div>

          <h2 className={styles.detailTitle}>{detail.title}</h2>

          {detail.summary || detail.description ? (
            <p className={styles.detailSummary}>{detail.summary || detail.description}</p>
          ) : null}

          {detail.imageUrl ? (
            <img
              src={detail.imageUrl}
              alt=""
              className={styles.detailImage}
            />
          ) : null}

          {detailLoading && (
            <p className={styles.status} aria-live="polite">
              Loading full article…
            </p>
          )}

          {detailError ? (
            <p className={styles.errorMessage} role="alert">
              {detailError}
            </p>
          ) : null}

          <div className={styles.detailBody}>
            {bodyParagraphs(detail.body).length > 0
              ? bodyParagraphs(detail.body).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))
              : !detailLoading && (
                  <p className={styles.description}>
                    {detail.description || 'No full article text is available for this item yet.'}
                  </p>
                )}
          </div>

          {Array.isArray(detail.tags) && detail.tags.length > 1 ? (
            <div className={styles.tagRow}>
              {detail.tags.map((tag) => (
                <span key={tag} className={styles.softTag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </article>
      )}

      {!loading && !error && !selectedId && (
        <div className={styles.list} data-undo="UNDO CONTENT GLASS">
          {contentList.length === 0 ? (
            <p className={styles.status}>No published articles yet.</p>
          ) : (
            contentList.map((item) => (
              <article key={item.id} className={`card ${styles.contentCard}`}>
                <button
                  type="button"
                  className={styles.contentButton}
                  onClick={() => openDetail(item)}
                >
                  <div className={styles.contentInner}>
                    <div className={styles.meta}>
                      <span className="tag">
                        <Icon name="content" size={12} />
                        {item.category}
                      </span>
                    </div>
                    <h3 className={styles.title}>{item.title}</h3>
                    <p className={styles.description}>{item.description}</p>
                    <div className={styles.cardFooter}>
                      <span className={styles.date}>{item.date}</span>
                      <span className={styles.readLink}>Read article</span>
                    </div>
                  </div>
                </button>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}
