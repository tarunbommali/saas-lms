/* eslint-disable no-unused-vars */
// src/pages/CourseContent.jsx

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLearnPage } from '../contexts/LearnPageContext.jsx';
import { useRealtimeEnrollmentStatus } from '../hooks/useRealtimeApi.js';
import { updateUserProgress } from '../services/index.js';
import VideoPlayer from '../components/Course/VideoPlayer.jsx';
import CourseContentShimmer from '../components/Course/CourseContentShimmer.jsx';
import LessonQuizPane from '../components/learning/LessonQuizPane.jsx';
import { global_classnames } from "../utils/classnames.js";
import { PlayCircle, List, ArrowRight, Clock, CheckCircle, Lock, AlertTriangle, FileText, FileQuestion, Link as LinkIcon, Image as ImageIcon, Download } from 'lucide-react';

const clampPercentage = (value) => Math.min(100, Math.max(0, Number(value) || 0));

const normalizeCompletionFlag = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value >= 1;
    if (typeof value === 'string') {
        const trimmed = value.trim().toLowerCase();
        return trimmed === 'true' || trimmed === '1' || trimmed === 'yes';
    }
    return false;
};

const lookupStoredCompletion = (progress, moduleId, videoId) => {
    if (!progress) return undefined;

    const moduleEntry = progress.modules?.[moduleId];
    const moduleVideoEntry = moduleEntry?.videos?.[videoId];
    if (moduleVideoEntry && Object.prototype.hasOwnProperty.call(moduleVideoEntry, 'completed')) {
        return normalizeCompletionFlag(moduleVideoEntry.completed);
    }

    if (Array.isArray(progress.completedVideoIds) && progress.completedVideoIds.includes(videoId)) {
        return true;
    }

    if (Array.isArray(progress.completedVideos)) {
        const found = progress.completedVideos.find((entry) => entry?.videoId === videoId);
        if (found) {
            return normalizeCompletionFlag(found.completed ?? found.isCompleted);
        }
    }

    if (Array.isArray(progress.videosWatched)) {
        const watchedEntry = progress.videosWatched.find((entry) => entry?.videoId === videoId);
        if (watchedEntry) {
            if (Object.prototype.hasOwnProperty.call(watchedEntry, 'completed')) {
                return normalizeCompletionFlag(watchedEntry.completed);
            }
            if (Object.prototype.hasOwnProperty.call(watchedEntry, 'progress')) {
                return Number(watchedEntry.progress) >= 100;
            }
        }
    }

    if (progress.videoProgress && Object.prototype.hasOwnProperty.call(progress.videoProgress, videoId)) {
        const videoProgressEntry = progress.videoProgress[videoId];
        if (videoProgressEntry && Object.prototype.hasOwnProperty.call(videoProgressEntry, 'completed')) {
            return normalizeCompletionFlag(videoProgressEntry.completed);
        }
        if (videoProgressEntry && Object.prototype.hasOwnProperty.call(videoProgressEntry, 'percentage')) {
            return Number(videoProgressEntry.percentage) >= 100;
        }
    }

    return undefined;
};

const deriveInitialVideoCompletion = (modules, previousCompletionMap, progress) => {
    const next = {};
    if (!Array.isArray(modules)) return next;

    modules.forEach((module) => {
        const moduleId = module.id;
        const videos = Array.isArray(module.videos) ? module.videos : [];
        const prevModuleMap = previousCompletionMap?.[moduleId] || {};
        const moduleMap = {};

        videos.forEach((video) => {
            const videoId = video.id;
            const stored = lookupStoredCompletion(progress, moduleId, videoId);
            if (typeof stored === 'boolean') {
                moduleMap[videoId] = stored;
            } else if (Object.prototype.hasOwnProperty.call(prevModuleMap, videoId)) {
                moduleMap[videoId] = Boolean(prevModuleMap[videoId]);
            } else {
                moduleMap[videoId] = false;
            }
        });

        next[moduleId] = moduleMap;
    });

    return next;
};

const areCompletionMapsEqual = (mapA, mapB) => {
    if (mapA === mapB) return true;
    if (!mapA || !mapB) return false;

    const modulesA = Object.keys(mapA);
    const modulesB = Object.keys(mapB);
    if (modulesA.length !== modulesB.length) return false;

    for (const moduleId of modulesA) {
        if (!Object.prototype.hasOwnProperty.call(mapB, moduleId)) return false;
        const videosA = mapA[moduleId] || {};
        const videosB = mapB[moduleId] || {};

        const videoIdsA = Object.keys(videosA);
        const videoIdsB = Object.keys(videosB);
        if (videoIdsA.length !== videoIdsB.length) return false;

        for (const videoId of videoIdsA) {
            if (!Object.prototype.hasOwnProperty.call(videosB, videoId)) return false;
            if (Boolean(videosA[videoId]) !== Boolean(videosB[videoId])) return false;
        }
    }

    return true;
};

const computeProgressStats = (modules, completionMap) => {
    const summary = {
        modules: {},
        totalVideos: 0,
        completedVideos: 0,
        completionPercentage: 0,
        modulesCompleted: 0,
    };

    if (!Array.isArray(modules) || modules.length === 0) {
        return summary;
    }

    modules.forEach((module) => {
        const moduleId = module.id;
        const videos = Array.isArray(module.videos) ? module.videos : [];
        const moduleCompletionMap = completionMap?.[moduleId] || {};
        const totalVideos = videos.length;
        let completedCount = 0;

        videos.forEach((video) => {
            if (Boolean(moduleCompletionMap[video.id])) {
                completedCount += 1;
            }
        });

        if (totalVideos > 0) {
            summary.totalVideos += totalVideos;
            summary.completedVideos += completedCount;
        }

        const modulePercentage = totalVideos > 0 ? clampPercentage((completedCount / totalVideos) * 100) : 0;
        const moduleStats = {
            totalVideos,
            completedCount,
            completionPercentage: Number(modulePercentage.toFixed(2)),
            isCompleted: totalVideos > 0 && completedCount === totalVideos,
        };

        if (moduleStats.isCompleted) {
            summary.modulesCompleted += 1;
        }

        summary.modules[moduleId] = moduleStats;
    });

    const totalPercentage = summary.totalVideos > 0 ? clampPercentage((summary.completedVideos / summary.totalVideos) * 100) : 0;
    summary.completionPercentage = Number(totalPercentage.toFixed(2));

    return summary;
};

const buildProgressPayload = (modules, completionMap, lastPlayed, existingProgress = {}) => {
    if (!Array.isArray(modules) || modules.length === 0) {
        return {
            ...existingProgress,
            modules: {},
            totalVideos: 0,
            completedVideos: 0,
            completionPercentage: 0,
            modulesCompleted: 0,
            completedVideoIds: [],
            videosWatched: [],
            lastPlayed: lastPlayed ?? existingProgress?.lastPlayed ?? null,
        };
    }

    const modulesPayload = {};
    const completedVideoIds = [];
    let totalVideos = 0;
    let completedVideos = 0;
    let modulesCompleted = 0;

    modules.forEach((module) => {
        const moduleId = module.id;
        const videos = Array.isArray(module.videos) ? module.videos : [];
        const moduleCompletionMap = completionMap?.[moduleId] || {};
        const videosPayload = {};
        let moduleCompletedCount = 0;

        videos.forEach((video) => {
            const isCompleted = Boolean(moduleCompletionMap[video.id]);
            videosPayload[video.id] = { completed: isCompleted };
            if (isCompleted) {
                moduleCompletedCount += 1;
                completedVideoIds.push(video.id);
            }
        });

        const moduleTotal = videos.length;
        const modulePercentage = moduleTotal > 0 ? clampPercentage((moduleCompletedCount / moduleTotal) * 100) : 0;

        modulesPayload[moduleId] = {
            totalVideos: moduleTotal,
            completedCount: moduleCompletedCount,
            completionPercentage: Number(modulePercentage.toFixed(2)),
            isCompleted: moduleTotal > 0 && moduleCompletedCount === moduleTotal,
            videos: videosPayload,
        };

        if (modulesPayload[moduleId].isCompleted) {
            modulesCompleted += 1;
        }

        totalVideos += moduleTotal;
        completedVideos += moduleCompletedCount;
    });

    const completionPercentage = totalVideos > 0 ? clampPercentage((completedVideos / totalVideos) * 100) : 0;

    return {
        ...existingProgress,
        modules: modulesPayload,
        totalVideos,
        completedVideos,
        modulesCompleted,
        completionPercentage: Number(completionPercentage.toFixed(2)),
        completedVideoIds,
        videosWatched: completedVideoIds.map((videoId) => ({ videoId, completed: true })),
        lastPlayed: lastPlayed ?? existingProgress?.lastPlayed ?? null,
    };
};

const PRIMARY_BLUE = "#004080";



const LearnPage = () => {
    const { courseId } = useParams();
    const { currentUser, isAuthenticated } = useAuth();
    // Real-time enrollment status for access gating
    const { isEnrolled, loading: enrollmentLoading } = useRealtimeEnrollmentStatus(currentUser?.uid, courseId);
    const {
        courseContent,
        currentModule,
        enrollmentStatus,
        loadingContent,
        contentError, // Used for showing the notification banner
        fetchCourseContent,
        setCurrentModule,
        isModuleUnlocked,
        lastPlayed,
        contentType,
        userProgress,
    } = useLearnPage();

    // Track the currently selected lesson and the active content view
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [activeContentType, setActiveContentType] = useState('video');
    // Expand/collapse state per module
    const [expandedModules, setExpandedModules] = useState({});
    const [videoCompletionMap, setVideoCompletionMap] = useState({});
    const syncSkipRef = useRef(true);
    const syncTimeoutRef = useRef(null);

    // Build a stable storage key for last played video per user/course
    const lastPlayedKey = useMemo(() => (
        currentUser?.uid && courseId ? `lastPlayed:${currentUser.uid}:${courseId}` : null
    ), [currentUser?.uid, courseId]);

    // 1. Initialize course content and enrollment check
    useEffect(() => {
        if (isAuthenticated && currentUser && courseId && isEnrolled) {
            fetchCourseContent(courseId);
        }
    }, [isAuthenticated, currentUser, courseId, isEnrolled, fetchCourseContent]);

    // Initialize selected lesson on module/content changes, using last played if available
    useEffect(() => {
        if (!Array.isArray(courseContent) || courseContent.length === 0) {
            return;
        }

        const findLesson = (moduleId, lessonId) => {
            if (!moduleId || !lessonId) return null;
            const module = courseContent.find((mod) => mod.id === moduleId);
            if (!module) return null;
            const lesson = Array.isArray(module.videos)
                ? module.videos.find((entry) => entry.id === lessonId)
                : null;
            if (!lesson) return null;
            return { module, lesson };
        };

        const deriveDefaultContentType = (lesson) => {
            if (!lesson) return 'video';
            const lessonType = (lesson.type || 'video').toLowerCase();
            if (lessonType === 'quiz' && lesson.quiz?.id) {
                return 'quiz';
            }
            return 'video';
        };

        const assignSelection = (module, lesson) => {
            if (module) {
                setCurrentModule(module);
            }
            setSelectedLesson(lesson || null);
            const nextType = deriveDefaultContentType(lesson);
            setActiveContentType((prev) => (prev === nextType ? prev : nextType));
        };

        if (!currentModule) {
            if (lastPlayed?.moduleId && lastPlayed?.videoId) {
                const restored = findLesson(lastPlayed.moduleId, lastPlayed.videoId);
                if (restored) {
                    assignSelection(restored.module, restored.lesson);
                    return;
                }
            }

            if (lastPlayedKey) {
                try {
                    const saved = JSON.parse(localStorage.getItem(lastPlayedKey) || 'null');
                    if (saved?.moduleId && saved?.videoId) {
                        const restored = findLesson(saved.moduleId, saved.videoId);
                        if (restored) {
                            assignSelection(restored.module, restored.lesson);
                            return;
                        }
                    }
                } catch {
                    /* ignore */
                }
            }

            const firstModule = courseContent[0];
            const firstLesson = firstModule?.videos?.[0] || null;
            assignSelection(firstModule, firstLesson);
            return;
        }

        if (!selectedLesson) {
            const fallbackLesson = currentModule.videos?.[0] || null;
            if (fallbackLesson !== selectedLesson) {
                assignSelection(null, fallbackLesson);
            }
            return;
        }

        const lessonStillInModule = Array.isArray(currentModule.videos)
            ? currentModule.videos.some((entry) => entry.id === selectedLesson.id)
            : false;

        if (!lessonStillInModule) {
            const nextLesson = currentModule.videos?.[0] || null;
            assignSelection(null, nextLesson);
        }
    }, [courseContent, currentModule, lastPlayed, lastPlayedKey, selectedLesson, setCurrentModule]);

    useEffect(() => {
        if (!courseContent || courseContent.length === 0) return;
        setExpandedModules(() => {
            const all = {};
            courseContent.forEach((m) => { all[m.id] = true; });
            return all;
        });
    }, [courseContent, currentModule]);

    useEffect(() => {
        if (!selectedLesson?.quiz?.id && activeContentType === 'quiz') {
            setActiveContentType('video');
        }
    }, [selectedLesson?.quiz?.id, activeContentType]);

    const progressStats = useMemo(() => computeProgressStats(courseContent, videoCompletionMap), [courseContent, videoCompletionMap]);
    const moduleProgressMap = progressStats.modules;

    useEffect(() => {
        if (!courseContent || courseContent.length === 0) return;
        setVideoCompletionMap((prev) => {
            const derived = deriveInitialVideoCompletion(courseContent, prev, userProgress);
            if (areCompletionMapsEqual(prev, derived)) {
                return prev;
            }
            syncSkipRef.current = true;
            return derived;
        });
    }, [courseContent, userProgress]);

    // Compute all-expanded state and a handler to toggle all
    const allExpanded = useMemo(() => {
        if (!courseContent || courseContent.length === 0) return false;
        return courseContent.every((m) => expandedModules[m.id]);
    }, [courseContent, expandedModules]);

    const handleToggleAll = useCallback(() => {
        if (!courseContent || courseContent.length === 0) return;
        const next = {};
        courseContent.forEach((m) => { next[m.id] = !allExpanded; });
        setExpandedModules(next);
    }, [courseContent, allExpanded]);

    const renderResourceIcon = useCallback((type) => {
        const normalized = (type || '').toLowerCase();
        switch (normalized) {
            case 'link':
            case 'url':
                return <LinkIcon className="w-3 h-3" />;
            case 'image':
            case 'img':
                return <ImageIcon className="w-3 h-3" />;
            case 'pdf':
            case 'document':
            case 'doc':
            case 'notes':
                return <FileText className="w-3 h-3" />;
            default:
                return <Download className="w-3 h-3" />;
        }
    }, []);

    const pushProgressUpdate = useCallback(({ lastPlayedOverride, debounceMs = 500, moduleOverride, lessonOverride } = {}) => {
        if (!currentUser?.uid || !courseId || !Array.isArray(courseContent) || courseContent.length === 0) {
            return;
        }

        const resolvedModule = moduleOverride || currentModule;
        const resolvedLesson = lessonOverride || selectedLesson;
        const resolvedLastPlayed = lastPlayedOverride || (resolvedModule && resolvedLesson
            ? { moduleId: resolvedModule.id, videoId: resolvedLesson.id, ts: Date.now() }
            : (lastPlayed ?? null));

        const payload = buildProgressPayload(courseContent, videoCompletionMap, resolvedLastPlayed, userProgress);
        if (!payload) return;

        const triggerUpdate = () => {
            updateUserProgress(currentUser.uid, courseId, payload).catch(() => {
                /* Swallow progress sync errors to avoid user disruption */
            });
        };

        if (debounceMs > 0) {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = setTimeout(triggerUpdate, debounceMs);
        } else {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = null;
            }
            triggerUpdate();
        }
    }, [courseContent, courseId, currentModule, currentUser?.uid, lastPlayed, selectedLesson, userProgress, videoCompletionMap]);

    // Persist last played selection per course/user (local + cloud)
    useEffect(() => {
        if (!lastPlayedKey || !currentModule || !selectedLesson) return;
        const payload = { moduleId: currentModule.id, videoId: selectedLesson.id, ts: Date.now() };
        try { localStorage.setItem(lastPlayedKey, JSON.stringify(payload)); } catch { /* ignore */ }
        if (isAuthenticated && currentUser?.uid && courseId) {
            pushProgressUpdate({ lastPlayedOverride: payload, debounceMs: 0, moduleOverride: currentModule, lessonOverride: selectedLesson });
        }
    }, [courseId, currentModule, currentUser?.uid, isAuthenticated, lastPlayedKey, pushProgressUpdate, selectedLesson]);

    useEffect(() => {
        if (syncSkipRef.current) {
            syncSkipRef.current = false;
            return;
        }
        pushProgressUpdate({ debounceMs: 600 });
    }, [videoCompletionMap, pushProgressUpdate]);

    useEffect(() => () => {
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = null;
        }
    }, []);

    const activeLesson = selectedLesson || currentModule?.videos?.[0] || null;
    const hasQuizForLesson = Boolean(activeLesson?.quiz?.id);
    const isQuizSelection = hasQuizForLesson && activeContentType === 'quiz';
    const ActiveIcon = isQuizSelection ? FileQuestion : PlayCircle;
    const headerTitle = isQuizSelection
        ? (activeLesson?.quiz?.title || activeLesson?.title || currentModule?.title || 'Lesson Quiz')
        : (activeLesson?.title || currentModule?.title || 'Lesson Video');

    const handleVideoProgress = useCallback(async (progressData) => {
        if (!activeLesson || !currentModule || !courseId || activeContentType !== 'video') return;

        if (progressData.percentage >= 80) {
            setVideoCompletionMap((prev) => {
                const alreadyCompleted = prev[currentModule.id]?.[activeLesson.id];
                if (alreadyCompleted) return prev;
                const nextModuleMap = {
                    ...(prev[currentModule.id] || {}),
                    [activeLesson.id]: true,
                };
                return {
                    ...prev,
                    [currentModule.id]: nextModuleMap,
                };
            });
        }
    }, [activeLesson, activeContentType, courseId, currentModule]);

    // Handle video completion
    const handleVideoComplete = useCallback(async () => {
        if (!currentModule || !courseId || !activeLesson || activeContentType !== 'video') return;
        setVideoCompletionMap((prev) => ({
            ...prev,
            [currentModule.id]: {
                ...(prev[currentModule.id] || {}),
                [activeLesson.id]: true,
            },
        }));
    }, [activeLesson, activeContentType, courseId, currentModule]);

    const handleVideoCompletionToggle = useCallback((moduleId, videoId, checked) => {
        setVideoCompletionMap((prev) => {
            const moduleMap = prev[moduleId] || {};
            if (moduleMap[videoId] === checked) {
                return prev;
            }
            return {
                ...prev,
                [moduleId]: {
                    ...moduleMap,
                    [videoId]: checked,
                },
            };
        });
    }, []);

    // --- Conditional Rendering Guards ---
    if (loadingContent || enrollmentLoading) {
        // RENDER SHIMMER LOADING UI
        return <CourseContentShimmer />;
    }

    // Access Gate: If not enrolled, block access and redirect to the sales page
    if (!isEnrolled) {
        // Redirect to the public course view or checkout page
        return <Navigate to={`/course/${courseId}`} replace />;
    }

    // --- Main Content Display ---

    return (
        <section className="min-h-screen bg-app py-10 transition-colors duration-300">
            <div
                className={`${global_classnames.width.container} mx-auto px-4 sm:px-6 lg:px-8`}>

                {/* 🚨 NEW: Fallback/Error Banner (Shown when contentError is set by context) 🚨 */}
                {contentError && (
                    <div className="p-4 mb-8 bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 rounded-lg flex items-center gap-3" role="alert">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p className="font-medium">
                            **Warning:** {contentError}
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: Video/Quiz Pane (2/3 width) */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="card shadow-md">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme pb-2 mb-4">
                                <div className="flex items-center gap-2">
                                    <ActiveIcon className="w-5 h-5 text-primary" />
                                    <h2 className="text-xl font-semibold text-high">{headerTitle}</h2>
                                </div>
                                {hasQuizForLesson && (
                                    <div className="flex rounded-full border border-theme overflow-hidden text-sm">
                                        <button
                                            type="button"
                                            onClick={() => setActiveContentType('video')}
                                            className={`px-3 py-1 transition-colors ${activeContentType === 'video' ? 'bg-primary text-white' : 'bg-surface text-medium hover:bg-hover'}`}
                                        >
                                            Video
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveContentType('quiz')}
                                            className={`px-3 py-1 transition-colors ${activeContentType === 'quiz' ? 'bg-primary text-white' : 'bg-surface text-medium hover:bg-hover'}`}
                                        >
                                            Quiz
                                        </button>
                                    </div>
                                )}
                            </div>

                            {activeLesson ? (
                                isQuizSelection ? (
                                    <LessonQuizPane
                                        key={activeLesson.quiz.id}
                                        quizMeta={activeLesson.quiz}
                                        courseId={courseId}
                                        moduleId={currentModule?.id}
                                        lessonId={activeLesson.lessonId || activeLesson.id}
                                        onQuizCompleted={() => {
                                            if (currentModule?.id && activeLesson?.id) {
                                                handleVideoCompletionToggle(currentModule.id, activeLesson.id, true);
                                            }
                                        }}
                                    />
                                ) : (
                                    <VideoPlayer
                                        video={activeLesson}
                                        onProgressUpdate={handleVideoProgress}
                                        onVideoComplete={handleVideoComplete}
                                        className="w-full"
                                        showControls={true}
                                        allowDownload={true}
                                    />
                                )
                            ) : (
                                <div className="aspect-video bg-black/90 rounded-lg flex items-center justify-center text-white">
                                    <div className="text-center">
                                        <PlayCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                        <p className="text-lg">Select a module to start learning</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Module Description */}
                        {currentModule && (
                            <div className="card shadow-md">
                                <h3 className="font-semibold text-high mb-2">About this module</h3>
                                <p className="text-medium">{currentModule.description}</p>

                                {/* Learning Objectives */}
                                {currentModule.objectives && currentModule.objectives.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-medium text-high mb-2">Learning Objectives</h4>
                                        <ul className="list-disc list-inside text-sm text-medium space-y-1">
                                            {currentModule.objectives.map((objective, index) => (
                                                <li key={index}>{objective}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}


                    </div>

                    {/* RIGHT COLUMN: Module Navigation (1/3 width) */}
                    <div className="lg:col-span-1 bg-surface rounded-xl shadow-lg border border-theme sticky top-24 h-fit max-h-[80vh] overflow-y-auto custom-scrollbar">
                        <div className="p-4 border-b border-theme flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-high flex items-center gap-2">
                                <List className="w-6 h-6 text-primary" />
                                {contentType === 'series' ? 'Video Series' : 'Course Modules'}
                            </h2>
                            {courseContent?.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleToggleAll}
                                    className="text-sm px-3 py-1 rounded border border-theme text-medium hover:bg-hover transition-colors"
                                >
                                    {allExpanded ? 'Collapse all' : 'Expand all'}
                                </button>
                            )}
                        </div>
                        {courseContent?.length > 0 && (
                            <div className="px-4 py-3 border-b border-theme bg-surface-elevated">
                                <div className="flex items-center justify-between text-sm font-semibold text-medium">
                                    <span>Overall Progress</span>
                                    <span>{progressStats.completionPercentage}%</span>
                                </div>
                                <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                                    <div
                                        className="h-2 rounded-full bg-primary transition-all duration-300"
                                        style={{ width: `${progressStats.completionPercentage}%` }}
                                    />
                                </div>
                                <div className="mt-1 text-xs text-low">
                                    {progressStats.completedVideos} / {progressStats.totalVideos} videos completed
                                </div>
                            </div>
                        )}

                        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                            {courseContent.length > 0 ? (
                                courseContent.map((module, index) => {
                                    const moduleProgress = moduleProgressMap[module.id];
                                    const isUnlocked = isModuleUnlocked(module, index);
                                    const isCompleted = moduleProgress?.isCompleted || false;
                                    const isCurrent = currentModule?.id === module.id;
                                    const lessons = Array.isArray(module.videos) ? module.videos.filter(Boolean) : [];
                                    const videoLessons = lessons.filter((lesson) => (lesson.type || 'video').toLowerCase() !== 'quiz');
                                    const quizLessons = lessons.filter((lesson) => Boolean(lesson.quiz?.id) || (lesson.type || '').toLowerCase() === 'quiz');

                                    return (
                                        <li
                                            key={module.id}
                                            className={`p-4 transition-colors ${isCurrent
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-primary'
                                                    : isUnlocked
                                                        ? 'hover:bg-hover cursor-pointer'
                                                        : 'text-disabled cursor-not-allowed opacity-75'
                                                }`}
                                        >
                                            <div
                                                className="flex items-center justify-between"
                                                onClick={() => {
                                                    if (!isUnlocked) return;
                                                    setCurrentModule(module);
                                                    const containsSelection = lessons.some((lesson) => lesson.id === selectedLesson?.id);
                                                    if (!containsSelection) {
                                                        const nextLesson = videoLessons[0] || lessons[0] || null;
                                                        setSelectedLesson(nextLesson || null);
                                                        if (videoLessons[0]) {
                                                            setActiveContentType('video');
                                                        } else if (nextLesson?.quiz?.id) {
                                                            setActiveContentType('quiz');
                                                        } else {
                                                            setActiveContentType('video');
                                                        }
                                                    }
                                                }}
                                            >
                                                <div className="flex-1">
                                                    <div className={`flex items-center gap-2 mb-1 ${isCurrent ? 'text-primary font-semibold' : 'text-medium'}`}>
                                                        {!isUnlocked ? (
                                                            <Lock className="w-4 h-4" />
                                                        ) : isCompleted ? (
                                                            <CheckCircle className="w-4 h-4 text-success" />
                                                        ) : (
                                                            <PlayCircle className="w-4 h-4" />
                                                        )}
                                                        <span className="text-sm">
                                                            Module {index + 1}
                                                        </span>
                                                    </div>
                                                    <span className={`text-base block ${isCurrent ? 'text-high font-medium' : 'text-medium'}`}>{module.title}</span>
                                                    {module.duration && (
                                                        <div className="flex items-center gap-1 mt-1 text-xs text-low">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{module.duration} min</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {isUnlocked && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setExpandedModules((p) => ({ ...p, [module.id]: !p[module.id] })); }}
                                                        className={`ml-2 text-medium transition-transform ${expandedModules[module.id] ? 'rotate-90' : ''}`}
                                                        aria-label={expandedModules[module.id] ? 'Collapse' : 'Expand'}
                                                    >
                                                        <ArrowRight className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Progress indicator */}
                                            {isUnlocked && moduleProgress && (
                                                <div className="mt-2">
                                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                                                        <div
                                                            className="bg-success h-1 rounded-full transition-all duration-300"
                                                            style={{
                                                                width: `${moduleProgress.completionPercentage || 0}%`
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Lesson lists */}
                                            {isUnlocked && expandedModules[module.id] && lessons.length > 0 && (
                                                <div className="mt-3 space-y-4">
                                                    {videoLessons.length > 0 && (
                                                        <div>
                                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-low">Videos</p>
                                                            <div className="space-y-2">
                                                                {videoLessons.map((lesson, vIdx) => {
                                                                    const isActiveVideo = selectedLesson?.id === lesson.id && activeContentType === 'video';
                                                                    const resourceList = Array.isArray(lesson.resources) ? lesson.resources.filter(Boolean) : [];
                                                                    const isItemCompleted = Boolean(videoCompletionMap[module.id]?.[lesson.id]);
                                                                    return (
                                                                        <div
                                                                            key={lesson.id || vIdx}
                                                                            onClick={() => {
                                                                                if (!isUnlocked) return;
                                                                                setCurrentModule(module);
                                                                                setSelectedLesson(lesson);
                                                                                setActiveContentType('video');
                                                                            }}
                                                                            className={`p-2 rounded border transition-colors ${isActiveVideo
                                                                                    ? 'bg-blue-100 dark:bg-blue-900/40 border-primary'
                                                                                    : 'hover:bg-hover border-theme'
                                                                                } ${isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                                                        >
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="h-4 w-4 rounded border-theme text-primary focus:ring-primary bg-surface"
                                                                                        checked={isItemCompleted}
                                                                                        disabled={!isUnlocked}
                                                                                        onClick={(event) => event.stopPropagation()}
                                                                                        onChange={(event) => {
                                                                                            event.stopPropagation();
                                                                                            handleVideoCompletionToggle(module.id, lesson.id, event.target.checked);
                                                                                        }}
                                                                                    />
                                                                                    <div className={`flex items-center gap-2 text-sm font-medium truncate ${isActiveVideo ? 'text-primary' : 'text-medium'}`}>
                                                                                        <PlayCircle className="h-4 w-4 text-primary" />
                                                                                        <span className="truncate">
                                                                                            {lesson.title || `Video ${vIdx + 1}`}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                {lesson.duration && (
                                                                                    <div className="text-xs text-low ml-3 flex-shrink-0 flex items-center gap-1">
                                                                                        <Clock className="w-3 h-3" />
                                                                                        <span>{lesson.duration}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {resourceList.length > 0 && (
                                                                                <div className="mt-2 space-y-1 text-xs text-medium">
                                                                                    {resourceList.map((resource, rIdx) => {
                                                                                        const resourceTitle = resource.title || resource.type || `Resource ${rIdx + 1}`;
                                                                                        const resourceUrl = resource.url && typeof resource.url === 'string' ? resource.url : null;
                                                                                        const icon = renderResourceIcon(resource.type);

                                                                                        const content = (
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-surface-elevated text-medium">
                                                                                                    {icon}
                                                                                                </span>
                                                                                                <span className="truncate">
                                                                                                    {resourceTitle}
                                                                                                </span>
                                                                                            </div>
                                                                                        );

                                                                                        return resourceUrl ? (
                                                                                            <a
                                                                                                key={resource.id || rIdx}
                                                                                                href={resourceUrl}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                className="block rounded px-2 py-1 hover:bg-hover hover:text-primary transition-colors"
                                                                                                onClick={(event) => event.stopPropagation()}
                                                                                            >
                                                                                                {content}
                                                                                            </a>
                                                                                        ) : (
                                                                                            <div
                                                                                                key={resource.id || rIdx}
                                                                                                className="block rounded px-2 py-1 bg-surface-elevated text-low"
                                                                                                onClick={(event) => event.stopPropagation()}
                                                                                            >
                                                                                                {content}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {quizLessons.length > 0 && (
                                                        <div>
                                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-700">Quizzes</p>
                                                            <div className="space-y-2">
                                                                {quizLessons.map((lesson, qIdx) => {
                                                                    const isActiveQuiz = selectedLesson?.id === lesson.id && activeContentType === 'quiz';
                                                                    const isQuizCompleted = Boolean(videoCompletionMap[module.id]?.[lesson.id]);
                                                                    return (
                                                                        <div
                                                                            key={`${lesson.quiz?.id || lesson.id || qIdx}-quiz`}
                                                                            onClick={() => {
                                                                                if (!isUnlocked) return;
                                                                                setCurrentModule(module);
                                                                                setSelectedLesson(lesson);
                                                                                setActiveContentType('quiz');
                                                                            }}
                                                                            className={`p-2 rounded border transition-colors ${isActiveQuiz
                                                                                    ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500'
                                                                                    : 'hover:bg-hover border-theme'
                                                                                } ${isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                                                        >
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <div className={`flex items-center gap-2 text-sm font-medium truncate ${isActiveQuiz ? 'text-primary' : 'text-medium'}`}>
                                                                                    <FileQuestion className="h-4 w-4 text-purple-600" />
                                                                                    <span className="truncate">
                                                                                        {lesson.quiz?.title || lesson.title || `Quiz ${qIdx + 1}`}
                                                                                    </span>
                                                                                </div>
                                                                                {isQuizCompleted && (
                                                                                    <span className="text-xs font-semibold text-success">Completed</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })
                            ) : (
                                <p className="p-4 text-low">No modules available for this course.</p>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default LearnPage;