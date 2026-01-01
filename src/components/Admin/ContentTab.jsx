/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, Video, ListOrdered, FileText, Link, Image, Download } from 'lucide-react';
import FormField from '../ui/FormField';

const ContentTab = ({
    modules = [], // Add default value
    handleModuleChange,
    handleLessonChange,
    addModule,
    deleteModule,
    addLesson,
    deleteLesson,
    totalLessons,
    totalDuration,
    contentType = 'modules',
    onContentTypeChange,
}) => {
    const [expandedLessons, setExpandedLessons] = useState({});
    const [expandedQuizPanels, setExpandedQuizPanels] = useState({});

    const createDefaultQuiz = (lesson) => ({
        id: `quiz-${Date.now()}`,
        title: lesson?.title ? `${lesson.title} Quiz` : 'New Quiz',
        description: '',
        passingScore: 70,
        timeLimit: '',
        maxAttempts: 1,
        shuffleQuestions: true,
        shuffleOptions: true,
        showCorrectAnswers: false,
        showScore: true,
        isRequired: true,
        isPublished: true,
        questions: [],
    });

    const createDefaultQuestion = () => ({
        id: `question-${Date.now()}`,
        questionText: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: '',
        points: 5,
    });

    const toggleLessonExpansion = (lessonId) => {
        setExpandedLessons(prev => ({
            ...prev,
            [lessonId]: !prev[lessonId]
        }));
    };

    const toggleQuizExpansion = (lessonId) => {
        setExpandedQuizPanels(prev => ({
            ...prev,
            [lessonId]: !prev[lessonId]
        }));
    };

    const getLessonById = (moduleId, lessonId) => {
        const module = modules.find((m) => m.id === moduleId);
        if (!module) return { module: null, lesson: null };
        const lesson = Array.isArray(module.lessons)
            ? module.lessons.find((l) => l.id === lessonId)
            : null;
        return { module, lesson };
    };

    const updateLessonQuiz = (moduleId, lessonId, updater) => {
        const { lesson } = getLessonById(moduleId, lessonId);
        if (!lesson) return;
        const nextQuiz = updater(lesson.quiz ? { ...lesson.quiz } : null, lesson);
        handleLessonChange(moduleId, lessonId, { quiz: nextQuiz });
    };

    const addQuizToLesson = (moduleId, lessonId) => {
        updateLessonQuiz(moduleId, lessonId, (current, lesson) => {
            if (current) {
                setExpandedQuizPanels(prev => ({ ...prev, [lessonId]: true }));
                return current;
            }
            const quiz = createDefaultQuiz(lesson);
            setExpandedQuizPanels(prev => ({ ...prev, [lessonId]: true }));
            return quiz;
        });
    };

    const removeQuizFromLesson = (moduleId, lessonId) => {
        handleLessonChange(moduleId, lessonId, { quiz: null });
        setExpandedQuizPanels(prev => ({ ...prev, [lessonId]: false }));
    };

    const updateQuizSettings = (moduleId, lessonId, updates) => {
        updateLessonQuiz(moduleId, lessonId, (current) => {
            if (!current) {
                return { ...updates };
            }
            return { ...current, ...updates };
        });
    };

    const addQuizQuestion = (moduleId, lessonId) => {
        updateLessonQuiz(moduleId, lessonId, (current, lesson) => {
            const quiz = current || createDefaultQuiz(lesson);
            const questions = Array.isArray(quiz.questions) ? [...quiz.questions] : [];
            questions.push(createDefaultQuestion());
            return { ...quiz, questions };
        });
    };

    const updateQuizQuestion = (moduleId, lessonId, questionId, updates) => {
        updateLessonQuiz(moduleId, lessonId, (current) => {
            if (!current) return current;
            const questions = Array.isArray(current.questions)
                ? current.questions.map((question) =>
                    question.id === questionId ? { ...question, ...updates } : question
                )
                : [];
            return { ...current, questions };
        });
    };

    const removeQuizQuestion = (moduleId, lessonId, questionId) => {
        updateLessonQuiz(moduleId, lessonId, (current) => {
            if (!current) return current;
            const questions = Array.isArray(current.questions)
                ? current.questions.filter((question) => question.id !== questionId)
                : [];
            return { ...current, questions };
        });
    };

    const addQuestionOption = (moduleId, lessonId, questionId) => {
        updateLessonQuiz(moduleId, lessonId, (current) => {
            if (!current) return current;
            const questions = Array.isArray(current.questions)
                ? current.questions.map((question) => {
                    if (question.id !== questionId) return question;
                    const options = Array.isArray(question.options) ? [...question.options] : [];
                    if (options.length >= 6) {
                        return question;
                    }
                    return { ...question, options: [...options, ''] };
                })
                : [];
            return { ...current, questions };
        });
    };

    const updateQuestionOption = (moduleId, lessonId, questionId, optionIndex, value) => {
        updateLessonQuiz(moduleId, lessonId, (current) => {
            if (!current) return current;
            const questions = Array.isArray(current.questions)
                ? current.questions.map((question) => {
                    if (question.id !== questionId) return question;
                    const options = Array.isArray(question.options) ? [...question.options] : [];
                    options[optionIndex] = value;
                    return { ...question, options };
                })
                : [];
            return { ...current, questions };
        });
    };

    const removeQuestionOption = (moduleId, lessonId, questionId, optionIndex) => {
        updateLessonQuiz(moduleId, lessonId, (current) => {
            if (!current) return current;
            const questions = Array.isArray(current.questions)
                ? current.questions.map((question) => {
                    if (question.id !== questionId) return question;
                    const options = Array.isArray(question.options) ? [...question.options] : [];
                    if (options.length <= 2) {
                        return question;
                    }
                    const filtered = options.filter((_, idx) => idx !== optionIndex);
                    let correctOptionIndex = question.correctOptionIndex || 0;
                    if (optionIndex === correctOptionIndex) {
                        correctOptionIndex = 0;
                    } else if (optionIndex < correctOptionIndex) {
                        correctOptionIndex = Math.max(0, correctOptionIndex - 1);
                    }
                    return { ...question, options: filtered, correctOptionIndex };
                })
                : [];
            return { ...current, questions };
        });
    };

    const setCorrectOption = (moduleId, lessonId, questionId, optionIndex) => {
        updateQuizQuestion(moduleId, lessonId, questionId, { correctOptionIndex: optionIndex });
    };

    const addResource = (moduleId, lessonId) => {
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        const lesson = module.lessons?.find(l => l.id === lessonId);
        if (!lesson) return;

        const newResource = {
            id: Date.now().toString(),
            type: 'pdf',
            title: '',
            url: '',
            file: null
        };

        const updatedResources = [...(lesson.resources || []), newResource];
        handleLessonChange(moduleId, lessonId, { resources: updatedResources });
    };

    const deleteResource = (moduleId, lessonId, resourceId) => {
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        const lesson = module.lessons?.find(l => l.id === lessonId);
        if (!lesson) return;

        const updatedResources = (lesson.resources || []).filter(r => r.id !== resourceId);
        handleLessonChange(moduleId, lessonId, { resources: updatedResources });
    };

    const handleResourceChange = (moduleId, lessonId, resourceId, updates) => {
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        const lesson = module.lessons?.find(l => l.id === lessonId);
        if (!lesson) return;

        const updatedResources = (lesson.resources || []).map(resource =>
            resource.id === resourceId ? { ...resource, ...updates } : resource
        );

        handleLessonChange(moduleId, lessonId, { resources: updatedResources });
    };

    const handleFileUpload = (moduleId, lessonId, resourceId, file) => {
        if (!file) return;

        const updates = {
            title: file.name,
            url: URL.createObjectURL(file),
            file: file
        };
        handleResourceChange(moduleId, lessonId, resourceId, updates);
    };

    const getResourceIcon = (type) => {
        switch (type) {
            case 'pdf': return <FileText className="w-4 h-4" />;
            case 'link': return <Link className="w-4 h-4" />;
            case 'image': return <Image className="w-4 h-4" />;
            case 'document': return <FileText className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    // Safe array access for modules
    const safeModules = Array.isArray(modules) ? modules : [];

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Course Content</h2>
                    <p className="text-gray-600 mt-1">
                        {totalLessons || 0} lessons • {totalDuration || 0} hours total
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => onContentTypeChange ? onContentTypeChange('modules') : null}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${contentType === 'modules'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <BookOpen className="w-4 h-4" />
                            Modules
                        </button>
                        <button
                            type="button"
                            onClick={() => onContentTypeChange ? onContentTypeChange('series') : null}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${contentType === 'series'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <ListOrdered className="w-4 h-4" />
                            Series
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={addModule}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add {contentType === 'modules' ? 'Module' : 'Series'}
                    </button>
                </div>
            </div>

            {safeModules.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No {contentType === 'modules' ? 'modules' : 'series'} yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Start by adding your first {contentType === 'modules' ? 'module' : 'series'}
                    </p>
                    <button
                        type="button"
                        onClick={addModule}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Add First {contentType === 'modules' ? 'Module' : 'Series'}
                    </button>
                </div>
            ) : (
                safeModules.map((module, moduleIndex) => {
                    // Safe array access for lessons
                    const safeLessons = Array.isArray(module.lessons) ? module.lessons : [];

                    return (
                        <div key={module.id || moduleIndex} className="border border-gray-200 rounded-lg p-4 mb-4">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 space-y-3">
                                    <FormField
                                        type="text"
                                        value={module.title || ''}
                                        onChange={(value) => handleModuleChange(module.id, { title: value })}
                                        placeholder={`${contentType === 'modules' ? 'Module' : 'Series'} Title`}
                                        className="mb-0"
                                        inputClassName="text-lg font-bold border-none focus:ring-0 p-0"
                                    />
                                    <FormField
                                        type="text"
                                        value={module.description || ''}
                                        onChange={(value) => handleModuleChange(module.id, { description: value })}
                                        placeholder={`${contentType === 'modules' ? 'Module' : 'Series'} Description`}
                                        className="mb-0"
                                        inputClassName="text-gray-600 border-none focus:ring-0 p-0"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => deleteModule(module.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-4"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <FormField
                                    label="Order"
                                    type="number"
                                    value={module.order || 1}
                                    onChange={(value) => handleModuleChange(module.id, { order: parseInt(value) || 1 })}
                                    min="1"
                                    className="mb-0"
                                />
                                <FormField
                                    label="Duration"
                                    type="text"
                                    value={module.duration || ''}
                                    onChange={(value) => handleModuleChange(module.id, { duration: value })}
                                    placeholder="e.g., 2 hours"
                                    className="mb-0"
                                />
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={() => addLesson(module.id)}
                                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add {contentType === 'modules' ? 'Lesson' : 'Video'}
                                    </button>
                                </div>
                            </div>

                            {/* Lessons/Videos */}
                            <div className="space-y-3">
                                {safeLessons.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                                        No {contentType === 'modules' ? 'lessons' : 'videos'} added yet. Click "Add {contentType === 'modules' ? 'Lesson' : 'Video'}" to get started.
                                    </div>
                                ) : (
                                    safeLessons.map((lesson, lessonIndex) => {
                                        // Safe array access for resources
                                        const safeResources = Array.isArray(lesson.resources) ? lesson.resources : [];

                                        return (
                                            <div key={lesson.id || lessonIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                                                {/* Lesson Header */}
                                                <div className="flex items-center gap-4 p-3 bg-gray-50">
                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2">
                                                        <div className="md:col-span-4">
                                                            <FormField
                                                                type="text"
                                                                value={lesson.title || ''}
                                                                onChange={(value) => handleLessonChange(module.id, lesson.id, { title: value })}
                                                                placeholder={`${contentType === 'modules' ? 'Lesson' : 'Video'} Title`}
                                                                className="mb-0"
                                                                inputClassName="text-sm"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <FormField
                                                                type="text"
                                                                value={lesson.duration || ''}
                                                                onChange={(value) => handleLessonChange(module.id, lesson.id, { duration: value })}
                                                                placeholder="Duration"
                                                                className="mb-0"
                                                                inputClassName="text-sm"
                                                            />
                                                        </div>
                                                        <div className="md:col-span-3">
                                                            <FormField
                                                                type="select"
                                                                value={lesson.type || 'video'}
                                                                onChange={(value) => handleLessonChange(module.id, lesson.id, { type: value })}
                                                                className="mb-0"
                                                                inputClassName="text-sm"
                                                            >
                                                                <option value="video">Video</option>
                                                                <option value="article">Article</option>
                                                                <option value="quiz">Quiz</option>
                                                                <option value="assignment">Assignment</option>
                                                            </FormField>
                                                        </div>
                                                        <div className="md:col-span-3">
                                                            <FormField
                                                                type="text"
                                                                value={lesson.content || ''}
                                                                onChange={(value) => handleLessonChange(module.id, lesson.id, { content: value })}
                                                                placeholder="Content URL/Text"
                                                                className="mb-0"
                                                                inputClassName="text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {lesson.quiz ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleQuizExpansion(lesson.id)}
                                                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-sm"
                                                            >
                                                                {expandedQuizPanels[lesson.id] ? 'Hide Quiz' : 'Quiz Settings'}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => addQuizToLesson(module.id, lesson.id)}
                                                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-sm"
                                                            >
                                                                Add Quiz
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleLessonExpansion(lesson.id)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                                                        >
                                                            {expandedLessons[lesson.id] ? 'Hide Resources' : `Resources (${safeResources.length})`}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteLesson(module.id, lesson.id)}
                                                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Resources Section */}
                                                {expandedLessons[lesson.id] && (
                                                    <div className="p-4 bg-white border-t border-gray-200">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <h4 className="font-medium text-gray-900">Resources</h4>
                                                            <button
                                                                type="button"
                                                                onClick={() => addResource(module.id, lesson.id)}
                                                                className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                                Add Resource
                                                            </button>
                                                        </div>

                                                        <div className="space-y-2">
                                                            {safeResources.length === 0 ? (
                                                                <div className="text-center py-4 text-gray-500">
                                                                    No resources added yet. Click "Add Resource" to attach files, links, or notes.
                                                                </div>
                                                            ) : (
                                                                safeResources.map((resource, resourceIndex) => (
                                                                    <div key={resource.id || resourceIndex} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                                        <div className="flex-shrink-0">
                                                                            {getResourceIcon(resource.type)}
                                                                        </div>
                                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2">
                                                                            <div className="md:col-span-3">
                                                                                <FormField
                                                                                    type="select"
                                                                                    value={resource.type || 'pdf'}
                                                                                    onChange={(value) => handleResourceChange(module.id, lesson.id, resource.id, { type: value })}
                                                                                    className="mb-0"
                                                                                    inputClassName="text-sm"
                                                                                >
                                                                                    <option value="pdf">PDF</option>
                                                                                    <option value="document">Document</option>
                                                                                    <option value="image">Image</option>
                                                                                    <option value="link">Task</option>
                                                                                    <option value="notes">Notes</option>
                                                                                </FormField>
                                                                            </div>
                                                                            <div className="md:col-span-4">
                                                                                <FormField
                                                                                    type="text"
                                                                                    value={resource.title || ''}
                                                                                    onChange={(value) => handleResourceChange(module.id, lesson.id, resource.id, { title: value })}
                                                                                    placeholder="Resource Title"
                                                                                    className="mb-0"
                                                                                    inputClassName="text-sm"
                                                                                />
                                                                            </div>
                                                                            <div className="md:col-span-4">
                                                                                {resource.type === 'link' ? (
                                                                                    <FormField
                                                                                        type="url"
                                                                                        value={resource.url || ''}
                                                                                        onChange={(value) => handleResourceChange(module.id, lesson.id, resource.id, { url: value })}
                                                                                        placeholder="https://example.com"
                                                                                        className="mb-0"
                                                                                        inputClassName="text-sm"
                                                                                    />
                                                                                ) : (
                                                                                    <input
                                                                                        type="file"
                                                                                        onChange={(e) => handleFileUpload(module.id, lesson.id, resource.id, e.target.files[0])}
                                                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                                                                        accept={resource.type === 'image' ? 'image/*' : resource.type === 'pdf' ? '.pdf' : '*/*'}
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                            <div className="md:col-span-1">
                                                                                {resource.url && (
                                                                                    <a
                                                                                        href={resource.url}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                                        title="View Resource"
                                                                                    >
                                                                                        <Download className="w-4 h-4" />
                                                                                    </a>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => deleteResource(module.id, lesson.id, resource.id)}
                                                                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {lesson.quiz && expandedQuizPanels[lesson.id] && (
                                                    <div className="p-4 bg-white border-t border-gray-200">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <h4 className="font-medium text-gray-900">Quiz Settings</h4>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addQuizQuestion(module.id, lesson.id)}
                                                                    className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                    Add Question
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeQuizFromLesson(module.id, lesson.id)}
                                                                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                                                                >
                                                                    Remove Quiz
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                            <FormField
                                                                label="Quiz Title"
                                                                type="text"
                                                                value={lesson.quiz.title || ''}
                                                                onChange={(value) => updateQuizSettings(module.id, lesson.id, { title: value })}
                                                                placeholder="Lesson Quiz Title"
                                                                className="mb-0"
                                                            />
                                                            <FormField
                                                                label="Passing Score (%)"
                                                                type="number"
                                                                value={lesson.quiz.passingScore ?? 70}
                                                                onChange={(value) => updateQuizSettings(module.id, lesson.id, { passingScore: value === '' ? '' : Number(value) })}
                                                                min="0"
                                                                max="100"
                                                                className="mb-0"
                                                            />
                                                            <FormField
                                                                label="Time Limit (minutes)"
                                                                type="number"
                                                                value={lesson.quiz.timeLimit || ''}
                                                                onChange={(value) => updateQuizSettings(module.id, lesson.id, { timeLimit: value === '' ? '' : Number(value) })}
                                                                min="0"
                                                                className="mb-0"
                                                            />
                                                            <FormField
                                                                label="Max Attempts"
                                                                type="number"
                                                                value={lesson.quiz.maxAttempts || ''}
                                                                onChange={(value) => updateQuizSettings(module.id, lesson.id, { maxAttempts: value === '' ? '' : Number(value) })}
                                                                min="0"
                                                                className="mb-0"
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                            <FormField
                                                                type="checkbox"
                                                                label="Shuffle questions"
                                                                value={Boolean(lesson.quiz.shuffleQuestions)}
                                                                onChange={(value) => updateQuizSettings(module.id, lesson.id, { shuffleQuestions: value })}
                                                                className="mb-0"
                                                            />
                                                            <FormField
                                                                type="checkbox"
                                                                label="Shuffle options"
                                                                value={Boolean(lesson.quiz.shuffleOptions)}
                                                                onChange={(value) => updateQuizSettings(module.id, lesson.id, { shuffleOptions: value })}
                                                                className="mb-0"
                                                            />
                                                            <FormField
                                                                type="checkbox"
                                                                label="Show score after submit"
                                                                value={Boolean(lesson.quiz.showScore)}
                                                                onChange={(value) => updateQuizSettings(module.id, lesson.id, { showScore: value })}
                                                                className="mb-0"
                                                            />
                                                            <FormField
                                                                type="checkbox"
                                                                label="Reveal correct answers"
                                                                value={Boolean(lesson.quiz.showCorrectAnswers)}
                                                                onChange={(value) => updateQuizSettings(module.id, lesson.id, { showCorrectAnswers: value })}
                                                                className="mb-0"
                                                            />
                                                            <FormField
                                                                type="checkbox"
                                                                label="Quiz required"
                                                                value={lesson.quiz.isRequired !== false}
                                                                onChange={(value) => updateQuizSettings(module.id, lesson.id, { isRequired: value })}
                                                                className="mb-0"
                                                            />
                                                            <FormField
                                                                type="checkbox"
                                                                label="Publish quiz"
                                                                value={lesson.quiz.isPublished !== false}
                                                                onChange={(value) => updateQuizSettings(module.id, lesson.id, { isPublished: value })}
                                                                className="mb-0"
                                                            />
                                                        </div>

                                                        <div className="space-y-4">
                                                            {Array.isArray(lesson.quiz.questions) && lesson.quiz.questions.length > 0 ? (
                                                                lesson.quiz.questions.map((question, questionIndex) => (
                                                                    <div key={question.id || questionIndex} className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                                                                        <div className="flex justify-between items-center mb-3">
                                                                            <h5 className="font-medium text-purple-900">
                                                                                Question {questionIndex + 1}
                                                                            </h5>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removeQuizQuestion(module.id, lesson.id, question.id)}
                                                                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors text-sm"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>

                                                                        <FormField
                                                                            label="Question prompt"
                                                                            type="text"
                                                                            value={question.questionText || ''}
                                                                            onChange={(value) => updateQuizQuestion(module.id, lesson.id, question.id, { questionText: value })}
                                                                            placeholder="Enter question"
                                                                            className="mb-4"
                                                                        />

                                                                        <div className="space-y-2 mb-4">
                                                                            <p className="text-sm font-medium text-gray-700">Options</p>
                                                                            {Array.isArray(question.options) && question.options.map((option, optionIndex) => (
                                                                                <div key={optionIndex} className="flex items-center gap-3">
                                                                                    <input
                                                                                        type="radio"
                                                                                        name={`correct-${question.id}`}
                                                                                        className="h-4 w-4 text-purple-600"
                                                                                        checked={(question.correctOptionIndex || 0) === optionIndex}
                                                                                        onChange={() => setCorrectOption(module.id, lesson.id, question.id, optionIndex)}
                                                                                    />
                                                                                    <input
                                                                                        type="text"
                                                                                        value={option || ''}
                                                                                        onChange={(e) => updateQuestionOption(module.id, lesson.id, question.id, optionIndex, e.target.value)}
                                                                                        placeholder={`Option ${optionIndex + 1}`}
                                                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                                                    />
                                                                                    {question.options.length > 2 && (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => removeQuestionOption(module.id, lesson.id, question.id, optionIndex)}
                                                                                            className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                                                                        >
                                                                                            <Trash2 className="w-4 h-4" />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => addQuestionOption(module.id, lesson.id, question.id)}
                                                                                className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                                                            >
                                                                                <Plus className="w-3 h-3" />
                                                                                Add Option
                                                                            </button>
                                                                        </div>

                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <FormField
                                                                                label="Points"
                                                                                type="number"
                                                                                value={question.points ?? 1}
                                                                                onChange={(value) => updateQuizQuestion(module.id, lesson.id, question.id, { points: value === '' ? '' : Number(value) })}
                                                                                min="1"
                                                                                className="mb-0"
                                                                            />
                                                                            <FormField
                                                                                label="Explanation"
                                                                                type="text"
                                                                                value={question.explanation || ''}
                                                                                onChange={(value) => updateQuizQuestion(module.id, lesson.id, question.id, { explanation: value })}
                                                                                placeholder="Optional explanation"
                                                                                className="mb-0"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="text-center py-6 border border-dashed border-purple-200 rounded-lg text-purple-700">
                                                                    No questions added yet. Click "Add Question" to get started.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default ContentTab;