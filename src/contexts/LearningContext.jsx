/* eslint-disable no-console */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { modulesApi, quizzesApi, learningProgressApi } from '../api/index.js';

const LearningContext = createContext(undefined);

export const useLearning = () => {
  const ctx = useContext(LearningContext);
  if (!ctx) throw new Error('useLearning must be used within LearningProvider');
  return ctx;
};

export const LearningProvider = ({ children }) => {
  const [courseProgress, setCourseProgress] = useState(null);
  const [modules, setModules] = useState([]);
  const [currentModule, setCurrentModule] = useState(null);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizAttempt, setQuizAttempt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch course progress with modules
  const fetchCourseProgress = useCallback(async (courseId) => {
    setLoading(true);
    setError(null);
    try {
      const progress = await learningProgressApi.getCourseProgress(courseId);
      setCourseProgress(progress);
      setModules(progress.modules || []);
      return progress;
    } catch (err) {
      console.error('Error fetching course progress:', err);
      setError(err.message || 'Failed to fetch course progress');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch modules for a course (without progress - for public view)
  const fetchModules = useCallback(async (courseId) => {
    setLoading(true);
    setError(null);
    try {
      const moduleList = await modulesApi.getModulesByCourse(courseId);
      setModules(moduleList || []);
      return moduleList;
    } catch (err) {
      console.error('Error fetching modules:', err);
      setError(err.message || 'Failed to fetch modules');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single module details
  const fetchModule = useCallback(async (moduleId) => {
    setLoading(true);
    try {
      const module = await modulesApi.getModuleById(moduleId);
      setCurrentModule(module);
      return module;
    } catch (err) {
      console.error('Error fetching module:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update module progress
  const updateModuleProgress = useCallback(async (moduleId, data) => {
    try {
      const result = await learningProgressApi.updateModuleProgress(moduleId, data);
      // Refresh progress if we have a course loaded
      if (courseProgress?.courseId) {
        await fetchCourseProgress(courseProgress.courseId);
      }
      return result;
    } catch (err) {
      console.error('Error updating module progress:', err);
      throw err;
    }
  }, [courseProgress, fetchCourseProgress]);

  // Update lesson progress
  const updateLessonProgress = useCallback(async (lessonId, data) => {
    try {
      const result = await learningProgressApi.updateLessonProgress(lessonId, data);
      // Refresh progress
      if (courseProgress?.courseId) {
        await fetchCourseProgress(courseProgress.courseId);
      }
      return result;
    } catch (err) {
      console.error('Error updating lesson progress:', err);
      throw err;
    }
  }, [courseProgress, fetchCourseProgress]);

  // Mark module as complete
  const completeModule = useCallback(async (moduleId) => {
    try {
      const result = await learningProgressApi.completeModule(moduleId);
      // Refresh progress
      if (courseProgress?.courseId) {
        await fetchCourseProgress(courseProgress.courseId);
      }
      return result;
    } catch (err) {
      console.error('Error completing module:', err);
      throw err;
    }
  }, [courseProgress, fetchCourseProgress]);

  // =====================================================
  // Quiz Functions
  // =====================================================

  // Fetch quiz with questions
  const fetchQuiz = useCallback(async (quizId) => {
    setLoading(true);
    try {
      const quiz = await quizzesApi.getQuizById(quizId);
      setCurrentQuiz(quiz);
      return quiz;
    } catch (err) {
      console.error('Error fetching quiz:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Start quiz attempt
  const startQuiz = useCallback(async (quizId) => {
    try {
      const result = await quizzesApi.startQuizAttempt(quizId);
      setQuizAttempt(result.attempt);
      return result;
    } catch (err) {
      console.error('Error starting quiz:', err);
      throw err;
    }
  }, []);

  // Submit quiz answers
  const submitQuiz = useCallback(async (quizId, answers, timeSpentSeconds = 0) => {
    if (!quizAttempt) {
      throw new Error('No active quiz attempt');
    }
    
    try {
      const result = await quizzesApi.submitQuizAnswers(quizId, {
        attemptId: quizAttempt.id,
        answers,
        timeSpentSeconds,
      });
      
      // Update the attempt with results
      setQuizAttempt(result.attempt);
      
      // Refresh course progress after quiz submission
      if (courseProgress?.courseId) {
        await fetchCourseProgress(courseProgress.courseId);
      }
      
      return result;
    } catch (err) {
      console.error('Error submitting quiz:', err);
      throw err;
    }
  }, [quizAttempt, courseProgress, fetchCourseProgress]);

  // Get quiz attempts history
  const fetchQuizAttempts = useCallback(async (quizId) => {
    try {
      return await quizzesApi.getQuizAttempts(quizId);
    } catch (err) {
      console.error('Error fetching quiz attempts:', err);
      return [];
    }
  }, []);

  // Reset quiz state
  const resetQuiz = useCallback(() => {
    setCurrentQuiz(null);
    setQuizAttempt(null);
  }, []);

  // Check if a module is unlocked
  const isModuleUnlocked = useCallback((moduleId) => {
    if (!courseProgress?.modules) return false;
    const moduleData = courseProgress.modules.find(m => m.module.id === moduleId);
    return moduleData?.progress?.isUnlocked || false;
  }, [courseProgress]);

  // Get module progress
  const getModuleProgress = useCallback((moduleId) => {
    if (!courseProgress?.modules) return null;
    const moduleData = courseProgress.modules.find(m => m.module.id === moduleId);
    return moduleData?.progress || null;
  }, [courseProgress]);

  const value = useMemo(() => ({
    // State
    courseProgress,
    modules,
    currentModule,
    currentQuiz,
    quizAttempt,
    loading,
    error,
    
    // Module functions
    fetchCourseProgress,
    fetchModules,
    fetchModule,
    updateModuleProgress,
    updateLessonProgress,
    completeModule,
    
    // Quiz functions
    fetchQuiz,
    startQuiz,
    submitQuiz,
    fetchQuizAttempts,
    resetQuiz,
    
    // Helpers
    isModuleUnlocked,
    getModuleProgress,
  }), [
    courseProgress,
    modules,
    currentModule,
    currentQuiz,
    quizAttempt,
    loading,
    error,
    fetchCourseProgress,
    fetchModules,
    fetchModule,
    updateModuleProgress,
    updateLessonProgress,
    completeModule,
    fetchQuiz,
    startQuiz,
    submitQuiz,
    fetchQuizAttempts,
    resetQuiz,
    isModuleUnlocked,
    getModuleProgress,
  ]);

  return (
    <LearningContext.Provider value={value}>
      {children}
    </LearningContext.Provider>
  );
};

export default LearningContext;
