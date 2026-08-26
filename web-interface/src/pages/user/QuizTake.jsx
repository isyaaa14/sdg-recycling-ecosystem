import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import Icon from '../../components/icons/Icon';
import { requestBadgeCheck } from '../../utils/badgeUnlocks';
import styles from './Quizzes.module.css';

export default function QuizTake() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [startedAt] = useState(() => Date.now());

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await api.get(`/quizzes/${id}`);
      setQuiz(data);
      setAnswers({});
    } catch (err) {
      const message =
        err.response?.data?.error ||
        'Unable to load this quiz. Please try again.';
      setError(message);
      setQuiz(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const allAnswered = useMemo(() => {
    if (!quiz?.questions?.length) return false;
    return quiz.questions.every((q) => answers[q.code]);
  }, [quiz, answers]);

  const handleSelect = (code, option) => {
    setAnswers((prev) => ({ ...prev, [code]: option }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!allAnswered || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const { data } = await api.post(`/quizzes/${id}/attempts`, {
        answers,
        timeSpentSeconds,
      });
      setResult(data.result || data);
      // Quiz pass can unlock quiz badges on the backend.
      setTimeout(() => requestBadgeCheck(), 400);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        'Unable to submit your answers. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page page--ambient">
      <header className="page-header">
        <span className="page-header__mark" aria-hidden="true">
          <Icon name="quiz" size={96} />
        </span>
        <h1>{quiz?.title || 'Quiz'}</h1>
        <p>
          {quiz
            ? `Pass score: ${quiz.passingScore} correct answers.`
            : 'Loading quiz details…'}
        </p>
      </header>

      <p className={styles.backRow}>
        <Link to="/quizzes" className={styles.backLink}>
          ← Back to quizzes
        </Link>
      </p>

      {loading && (
        <p className={styles.status} aria-live="polite">
          Loading quiz…
        </p>
      )}

      {!loading && error && !result && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={loadQuiz}>
            Retry
          </button>
        </div>
      )}

      {!loading && quiz && !result && (
        <form className={styles.quizForm} onSubmit={handleSubmit}>
          {quiz.questions.map((question, index) => (
            <fieldset key={question.id} className={styles.questionBlock}>
              <legend className={styles.questionText}>
                {index + 1}. {question.questionText}
              </legend>
              <div className={styles.options}>
                {question.options.map((option) => {
                  const selected = answers[question.code] === option;
                  return (
                    <label
                      key={option}
                      className={selected ? `${styles.option} ${styles.optionSelected}` : styles.option}
                    >
                      <input
                        type="radio"
                        name={question.code}
                        value={option}
                        checked={selected}
                        onChange={() => handleSelect(question.code, option)}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {error && (
            <p className={styles.errorMessage} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!allAnswered || submitting}
          >
            {submitting ? 'Submitting…' : 'Submit answers'}
          </button>
        </form>
      )}

      {result && (
        <div className={styles.resultBox} role="status">
          <h2 className={styles.resultTitle}>
            {result.passed ? 'You passed!' : 'Keep practicing'}
          </h2>
          <p className={styles.resultScore}>
            Score: {result.score}/{result.totalQuestions} ({result.accuracy}%)
          </p>
          <p className={styles.description}>
            Correct answers: {result.correctAnswers}. Pass needs {quiz?.passingScore}.
          </p>
          <div className={styles.resultActions}>
            <Link to="/quizzes" className={styles.startLink}>
              Back to quizzes
            </Link>
            <button type="button" className={styles.retryBtn} onClick={loadQuiz}>
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
