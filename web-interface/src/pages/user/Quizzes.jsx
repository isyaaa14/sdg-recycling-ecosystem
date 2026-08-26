import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Icon from '../../components/icons/Icon';
import styles from './Quizzes.module.css';

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/quizzes');
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        'Unable to load quizzes. Please check your connection and try again.';
      setError(message);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  return (
    <div className="page page--ambient">
      <header className="page-header">
        <span className="page-header__mark" aria-hidden="true">
          <Icon name="quiz" size={96} />
        </span>
        <h1>Quizzes</h1>
        <p>Test what you learned from the educational content.</p>
      </header>

      {loading && (
        <p className={styles.status} aria-live="polite">
          Loading quizzes…
        </p>
      )}

      {!loading && error && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={loadQuizzes}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className={styles.list} data-undo="UNDO QUIZ GLASS">
          {quizzes.map((quiz) => (
            <article key={quiz.id} className={`card ${styles.quizCard}`}>
              <div className={styles.quizInner}>
                <div className={styles.meta}>
                  <span className="tag">
                    <Icon name="quiz" size={12} />
                    Pass {quiz.passingScore}
                  </span>
                </div>
                <h3 className={styles.title}>{quiz.title}</h3>
                <p className={styles.description}>
                  Answer the questions to check your recycling knowledge.
                </p>
                <Link to={`/quizzes/${quiz.id}`} className={styles.startLink}>
                  Start quiz
                </Link>
                <span className={styles.date}>{quiz.date}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
