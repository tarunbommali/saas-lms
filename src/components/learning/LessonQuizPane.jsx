/* eslint-disable no-unused-vars */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getQuizById,
  startQuizAttempt,
  submitQuizAnswers,
  getQuizAttempts,
} from '../../api/quizzes.js';
import Button from '../ui/Button.jsx';
import { Alert, AlertDescription, AlertIcon } from '../ui/Alert.jsx';
import Badge from '../ui/Badge.jsx';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';
import { CheckCircle, Clock, Flame, Layers, RefreshCw, XCircle } from 'lucide-react';

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
};

const sortAttemptsDesc = (attempts) => [...attempts].sort((a, b) => (b.attemptNumber || 0) - (a.attemptNumber || 0));

const getLatestCompletedAttempt = (attempts) => {
  const sorted = sortAttemptsDesc(attempts);
  return sorted.find((attempt) => attempt.status === 'completed') || null;
};

const getActiveAttempt = (attempts) => attempts.find((attempt) => attempt.status === 'in_progress') || null;

const extractStoredAnswers = (attempt) => {
  if (!attempt) return {};
  if (attempt.answers && typeof attempt.answers === 'object') {
    return attempt.answers;
  }
  if (typeof attempt.answers === 'string') {
    try {
      const parsed = JSON.parse(attempt.answers);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }
  return {};
};

const QuizSummary = ({ result }) => {
  if (!result) {
    return null;
  }

  const passed = Boolean(result.passed);
  return (
    <div
      className={`mt-4 rounded-lg border p-4 ${passed ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {passed ? (
            <CheckCircle size={20} className="text-green-600" />
          ) : (
            <XCircle size={20} className="text-amber-600" />
          )}
          <div>
            <p className="font-semibold">
              {passed ? 'Quiz Passed' : 'Quiz Submitted'}
            </p>
            <p className="text-sm text-muted-foreground">
              Score: {result.score}% ・ Points: {(result.pointsEarned ?? 0)}/{result.totalPoints ?? 0}
            </p>
          </div>
        </div>
        <Badge variant={passed ? 'success' : 'warning'}>
          Attempt #{result.attempt?.attemptNumber || '-'}
        </Badge>
      </div>
      {result.attempt?.submittedAt && (
        <p className="mt-2 text-xs text-muted-foreground">
          Submitted on {new Date(result.attempt.submittedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
};

const LessonQuizPane = ({ quizMeta, courseId, moduleId, lessonId, onQuizCompleted }) => {
  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const startTimestampRef = useRef(null);
  const completionNotifiedRef = useRef(null);

  const quizId = quizMeta?.id;

  const refreshData = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    setError(null);

    try {
      const [quizResponse, attemptResponse] = await Promise.all([
        getQuizById(quizId),
        getQuizAttempts(quizId),
      ]);

      setQuiz(quizResponse);
      const sortedAttempts = sortAttemptsDesc(attemptResponse || []);
      setAttempts(sortedAttempts);

      const inProgressAttempt = getActiveAttempt(sortedAttempts);
      setActiveAttempt(inProgressAttempt || null);
      setAnswers(extractStoredAnswers(inProgressAttempt));
      startTimestampRef.current = inProgressAttempt ? Date.now() : null;

      const latestCompleted = getLatestCompletedAttempt(sortedAttempts);
      if (latestCompleted) {
        setResult({
          attempt: latestCompleted,
          passed: latestCompleted.passed,
          score: latestCompleted.score,
          correctAnswers: latestCompleted.correctAnswers,
          totalQuestions: latestCompleted.totalQuestions,
          pointsEarned: latestCompleted.pointsEarned,
          totalPoints: latestCompleted.totalPoints,
        });
      } else {
        setResult(null);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load quiz details.');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    completionNotifiedRef.current = null;
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!result?.passed || !result?.attempt?.id) {
      return;
    }

    if (completionNotifiedRef.current === result.attempt.id) {
      return;
    }

    completionNotifiedRef.current = result.attempt.id;
    if (typeof onQuizCompleted === 'function') {
      onQuizCompleted({
        quizId,
        courseId,
        moduleId,
        lessonId,
        result,
      });
    }
  }, [result, onQuizCompleted, quizId, courseId, moduleId, lessonId]);

  const maxAttemptsReached = useMemo(() => {
    if (!quiz?.maxAttempts || !Array.isArray(attempts)) {
      return false;
    }
    const countedAttempts = attempts.filter((attempt) => attempt.status === 'completed' || attempt.status === 'in_progress');
    return countedAttempts.length >= quiz.maxAttempts;
  }, [attempts, quiz]);

  const questions = useMemo(() => {
    if (!quiz?.questions) return [];
    return quiz.questions.map((question) => ({
      ...question,
      options: ensureArray(question.options),
      questionType: question.questionType || 'multiple_choice',
    }));
  }, [quiz]);

  const handleStart = useCallback(async () => {
    if (!quizId || starting) return;
    setStarting(true);
    setError(null);

    try {
      const response = await startQuizAttempt(quizId);
      const attempt = response?.attempt;
      if (attempt) {
        setActiveAttempt(attempt);
        setAttempts((prev) => sortAttemptsDesc([attempt, ...prev.filter((item) => item.id !== attempt.id)]));
        setAnswers(extractStoredAnswers(attempt));
        startTimestampRef.current = Date.now();
        setResult(null);
      }
    } catch (err) {
      setError(err?.message || 'Unable to start quiz.');
    } finally {
      setStarting(false);
    }
  }, [quizId, starting]);

  const handleAnswerChange = useCallback((questionId, value, questionType) => {
    setAnswers((prev) => {
      if (questionType === 'multiple_select') {
        const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
        const exists = current.includes(value);
        const nextValues = exists ? current.filter((option) => option !== value) : [...current, value];
        return { ...prev, [questionId]: nextValues };
      }
      return { ...prev, [questionId]: value };
    });
  }, []);

  const handleShortAnswerChange = useCallback((questionId, event) => {
    const { value } = event.target;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!quizId || !activeAttempt || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const startedAt = startTimestampRef.current || Date.now();
      const timeSpentSeconds = Math.max(Math.round((Date.now() - startedAt) / 1000), 0);

      const payload = {
        attemptId: activeAttempt.id,
        answers,
        timeSpentSeconds,
      };

      const response = await submitQuizAnswers(quizId, payload);
      const latestAttempt = response?.attempt;
      if (latestAttempt) {
        setAttempts((prev) => sortAttemptsDesc([
          latestAttempt,
          ...prev.filter((item) => item.id !== latestAttempt.id),
        ]));
        setResult({
          attempt: latestAttempt,
          passed: response?.passed,
          score: response?.score,
          correctAnswers: response?.correctAnswers,
          totalQuestions: response?.totalQuestions,
          pointsEarned: response?.pointsEarned,
          totalPoints: response?.totalPoints,
        });
        setActiveAttempt(null);
        setAnswers({});
        startTimestampRef.current = null;
      }
    } catch (err) {
      setError(err?.message || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  }, [quizId, activeAttempt, answers, submitting]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6">
        <LoadingSpinner size="md" />
        <p className="text-sm text-muted-foreground">Loading quiz…</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertIcon variant="destructive" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!quiz) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
        Quiz unavailable right now.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{quiz.title || 'Lesson Quiz'}</h2>
            {quiz.description && (
              <p className="mt-1 text-sm text-muted-foreground">{quiz.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Layers size={14} />{questions.length} questions</span>
              {quiz.timeLimit && (
                <span className="inline-flex items-center gap-1"><Clock size={14} />{quiz.timeLimit} min</span>
              )}
              <span className="inline-flex items-center gap-1"><Flame size={14} />Pass at {quiz.passingScore}%</span>
              {quiz.maxAttempts && (
                <span className="inline-flex items-center gap-1"><RefreshCw size={14} />Max {quiz.maxAttempts} attempts</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {result && <QuizSummary result={result} />}
            <div className="flex gap-2">
              {!activeAttempt && !maxAttemptsReached && (
                <Button onClick={handleStart} disabled={starting}>
                  {starting ? 'Starting…' : result ? 'Retake Quiz' : 'Start Quiz'}
                </Button>
              )}
              {activeAttempt && (
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Answers'}
                </Button>
              )}
            </div>
            {maxAttemptsReached && !activeAttempt && (
              <p className="text-xs text-amber-600">You have used all available attempts for this quiz.</p>
            )}
          </div>
        </div>
      </div>

      {activeAttempt ? (
        <div className="rounded-lg border p-4">
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions configured for this quiz yet.</p>
          ) : (
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">
                      Q{index + 1}. {question.questionText}
                    </p>
                    <Badge variant="secondary">
                      {question.questionType.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {question.questionType === 'short_answer' ? (
                    <textarea
                      className="w-full rounded border border-gray-300 p-2 text-sm"
                      rows={3}
                      value={answers[question.id] || ''}
                      onChange={(event) => handleShortAnswerChange(question.id, event)}
                    />
                  ) : (
                    <div className="space-y-2">
                      {question.options.map((option) => {
                        const fieldId = `${question.id}-${option}`;
                        const isMultiple = question.questionType === 'multiple_select';
                        const isChecked = isMultiple
                          ? Array.isArray(answers[question.id]) && answers[question.id].includes(option)
                          : answers[question.id] === option;

                        return (
                          <label
                            key={fieldId}
                            htmlFor={fieldId}
                            className={`flex cursor-pointer items-center gap-3 rounded border p-2 text-sm ${
                              isChecked ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                          >
                            <input
                              id={fieldId}
                              type={isMultiple ? 'checkbox' : 'radio'}
                              name={question.id}
                              value={option}
                              checked={isChecked}
                              onChange={() => handleAnswerChange(question.id, option, question.questionType)}
                              className="h-4 w-4"
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        !result && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Start the quiz to view questions.
          </div>
        )
      )}
    </div>
  );
};

export default LessonQuizPane;
