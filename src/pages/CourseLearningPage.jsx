/* eslint-disable no-unused-vars */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import PageContainer from '../components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Alert, AlertDescription, AlertIcon } from '../components/ui/Alert';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Lock,
  PlayCircle,
  FileQuestion,
  Trophy,
  ChevronRight,
  Award,
} from 'lucide-react';
import { formatINR } from '../utils/currency';

const CourseLearningPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const {
    courseProgress,
    modules,
    loading,
    error,
    fetchCourseProgress,
  } = useLearning();

  const [expandedModules, setExpandedModules] = useState(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/signin');
      return;
    }
    
    if (courseId) {
      fetchCourseProgress(courseId);
    }
  }, [courseId, isAuthenticated, fetchCourseProgress, navigate]);

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const breadcrumbItems = [
    { label: 'Home', link: '/' },
    { label: 'My Learning', link: '/dashboard' },
    { label: 'Course', link: `/learn/${courseId}` },
  ];

  if (loading) {
    return (
      <PageContainer items={breadcrumbItems} className="min-h-screen">
        <div className="mt-8">
          <LoadingSpinner size="lg" message="Loading course content..." />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer items={breadcrumbItems} className="min-h-screen">
        <Alert variant="destructive" className="mt-8">
          <AlertIcon variant="destructive" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  if (!courseProgress) {
    return (
      <PageContainer items={breadcrumbItems} className="min-h-screen">
        <Alert variant="warning" className="mt-8">
          <AlertIcon variant="warning" />
          <AlertDescription>
            Course not found or you are not enrolled. Please enroll first.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate('/courses')}>Browse Courses</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer items={breadcrumbItems} className="min-h-screen py-8">
      {/* Course Progress Overview */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Course Progress</CardTitle>
            <Badge
              variant={
                courseProgress.overallProgress >= 100
                  ? 'success'
                  : courseProgress.overallProgress > 0
                  ? 'warning'
                  : 'secondary'
              }
              className="text-lg px-4 py-1"
            >
              {courseProgress.overallProgress}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${courseProgress.overallProgress}%` }}
            />
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>
              <BookOpen size={16} className="inline mr-1" />
              {courseProgress.modulesCompleted} of {courseProgress.totalModules} modules
            </span>
            {courseProgress.overallProgress >= 100 && (
              <span className="text-green-600 font-medium">
                <Trophy size={16} className="inline mr-1" />
                Course Completed!
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modules List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen size={24} />
          Course Modules
        </h2>

        {modules.length === 0 ? (
          <Alert variant="info">
            <AlertIcon variant="info" />
            <AlertDescription>
              No modules available yet. Check back soon!
            </AlertDescription>
          </Alert>
        ) : (
          modules.map((moduleData, index) => {
            const { module, progress, lessons, quizzes } = moduleData;
            const isUnlocked = progress?.isUnlocked || index === 0;
            const isCompleted = progress?.isCompleted;
            const isExpanded = expandedModules.has(module.id);

            return (
              <Card
                key={module.id}
                className={`transition-all ${
                  !isUnlocked ? 'opacity-60' : ''
                } ${isCompleted ? 'border-green-500' : ''}`}
              >
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => isUnlocked && toggleModule(module.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Module Number */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isUnlocked
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle size={20} />
                        ) : isUnlocked ? (
                          index + 1
                        ) : (
                          <Lock size={16} />
                        )}
                      </div>

                      {/* Module Title */}
                      <div>
                        <CardTitle className="text-lg">{module.title}</CardTitle>
                        {module.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {module.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Module Status */}
                    <div className="flex items-center gap-4">
                      {isUnlocked && (
                        <div className="text-sm text-muted-foreground">
                          {progress?.progressPercentage || 0}%
                        </div>
                      )}
                      <ChevronRight
                        size={20}
                        className={`transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Module Progress Bar */}
                  {isUnlocked && (
                    <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isCompleted ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progress?.progressPercentage || 0}%` }}
                      />
                    </div>
                  )}
                </CardHeader>

                {/* Expanded Content */}
                {isExpanded && isUnlocked && (
                  <CardContent className="pt-0">
                    {/* Lessons */}
                    {lessons && lessons.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <PlayCircle size={18} />
                          Lessons ({lessons.length})
                        </h4>
                        <div className="space-y-2">
                          {lessons.map((lesson, lessonIndex) => {
                            const lessonProgress = lesson.progress;
                            const lessonCompleted = lessonProgress?.isCompleted;
                            const lessonQuiz = lesson.quiz;

                            return (
                              <div
                                key={lesson.id}
                                className={`flex items-center justify-between p-3 rounded-lg border ${
                                  lessonCompleted
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {lessonCompleted ? (
                                    <CheckCircle
                                      size={18}
                                      className="text-green-500"
                                    />
                                  ) : (
                                    <PlayCircle
                                      size={18}
                                      className="text-blue-500"
                                    />
                                  )}
                                  <span className="text-sm font-medium">
                                    {lesson.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {lesson.duration && (
                                    <span>
                                      <Clock size={14} className="inline mr-1" />
                                      {lesson.duration} min
                                    </span>
                                  )}
                                  <Button
                                    size="sm"
                                    variant={lessonCompleted ? 'outline' : 'default'}
                                    onClick={() =>
                                      navigate(
                                        `/learn/${courseId}/lesson/${lesson.id}`
                                      )
                                    }
                                  >
                                    {lessonCompleted ? 'Review' : 'Start'}
                                  </Button>
                                  {lessonQuiz && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => navigate(`/learn/${courseId}/quiz/${lessonQuiz.id}`)}
                                    >
                                      Take Quiz
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Quizzes */}
                    {quizzes && quizzes.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <FileQuestion size={18} />
                          Quizzes ({quizzes.length})
                        </h4>
                        <div className="space-y-2">
                          {quizzes.map((quiz) => (
                            <div
                              key={quiz.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
                            >
                              <div className="flex items-center gap-3">
                                <FileQuestion size={18} className="text-purple-500" />
                                <div>
                                  <span className="text-sm font-medium">
                                    {quiz.title}
                                  </span>
                                  <div className="text-xs text-muted-foreground">
                                    {quiz.totalQuestions} questions •{' '}
                                    {quiz.passingScore}% to pass
                                    {quiz.timeLimit && ` • ${quiz.timeLimit} min`}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {progress?.quizPassed && (
                                  <Badge variant="success" className="mr-2">
                                    <CheckCircle size={14} className="mr-1" />
                                    Passed
                                  </Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant={progress?.quizPassed ? 'outline' : 'default'}
                                  onClick={() =>
                                    navigate(`/learn/${courseId}/quiz/${quiz.id}`)
                                  }
                                >
                                  {progress?.quizPassed ? 'Retake' : 'Start Quiz'}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No content */}
                    {(!lessons || lessons.length === 0) &&
                      (!quizzes || quizzes.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No content available for this module yet.
                        </p>
                      )}
                  </CardContent>
                )}

                {/* Locked Module Message */}
                {!isUnlocked && (
                  <CardContent className="pt-0">
                    <Alert variant="warning">
                      <Lock size={16} className="mr-2" />
                      <AlertDescription>
                        Complete the previous module to unlock this one.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Certificate Section (if completed) */}
      {courseProgress.overallProgress >= 100 && (
        <Card className="mt-8 border-2 border-green-500 bg-green-50">
          <CardContent className="py-8 text-center">
            <Award size={48} className="mx-auto text-green-600 mb-4" />
            <h3 className="text-2xl font-bold text-green-700 mb-2">
              Congratulations!
            </h3>
            <p className="text-green-600 mb-6">
              You have completed this course. Your certificate is ready!
            </p>
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => navigate(`/certificates/${courseId}`)}
            >
              <Award size={20} className="mr-2" />
              View Certificate
            </Button>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
};

export default CourseLearningPage;
