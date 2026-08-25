'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  GraduationCap,
  PlayCircle,
  Play,
  Pause,
  CheckCircle,
  Clock,
  BookOpen,
  Award,
  Sparkles,
  X,
  MessageSquare,
  Send,
  ArrowLeft,
  Volume2,
  VolumeX,
  Maximize,
  CheckCheck,
  FileText,
  Download,
  ChevronRight,
  ListVideo,
  Pencil,
  Save,
  Video,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Layers,
  FolderPlus,
  Settings2,
  Link2,
  Tag,
  Tags,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Course, MOCK_COURSES } from '@/lib/mock-data';
import { useNotifications } from '@/lib/notification-context';
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal';

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoSrc: string;
  description: string;
  materials?: { name: string; size?: string; link: string }[];
  completed: boolean;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

const DEFAULT_CATEGORIES = [
  'Vendas & Negócios',
  'Comercial & Negociação',
  'Gestão & Processos',
  'Marketing & Tráfego',
  'Finanças & Lucro',
  'Liderança & Cultura',
  'Mentalidade & Estratégia',
];

const DEFAULT_COURSE_MODULES: Record<string, Module[]> = {
  c1: [
    {
      id: 'm1',
      title: 'Módulo 1: Fundamentos da Mentoria High-Ticket',
      lessons: [
        {
          id: 'l1',
          title: '1.1 Definindo a Proposta Única de Valor & Nicho de Alto Padrão',
          duration: '15:20',
          videoSrc: 'https://vjs.zencdn.net/v/oceans.mp4',
          description: 'Aprenda como posicionar sua consultoria e mentoria para atrair empresários dispostos a pagar R$ 10k a R$ 50k.',
          materials: [
            { name: 'Canvas de Posicionamento High-Ticket.pdf', size: '2.4 MB', link: '#' },
            { name: 'Matriz de ICP & Segmentação.xlsx', size: '1.1 MB', link: '#' },
          ],
          completed: true,
        },
        {
          id: 'l2',
          title: '1.2 Estruturação da Oferta Irrecusável & Esteira de Produtos',
          duration: '22:45',
          videoSrc: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
          description: 'Construção da promessa primária, entregáveis da mentoria em grupo e individual, e bônus estratégicos.',
          materials: [{ name: 'Template de Apresentação de Oferta.pdf', size: '3.8 MB', link: '#' }],
          completed: true,
        },
        {
          id: 'l3',
          title: '1.3 Precificação Estratégica & Formas de Pagamento',
          duration: '18:10',
          videoSrc: 'https://vjs.zencdn.net/v/oceans.mp4',
          description: 'Como calcular o ticket, modelos de parcelamento inteligente e ancoragem de valor perceptível.',
          completed: false,
        },
      ],
    },
    {
      id: 'm2',
      title: 'Módulo 2: Processo Comercial & Fechamento no Zoom',
      lessons: [
        {
          id: 'l4',
          title: '2.1 Script da Reunião de Diagnóstico de 45 Minutos',
          duration: '32:00',
          videoSrc: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
          description: 'Roteiro validado passo a passo para conduzir calls com empresários sem parecer vendedor chato.',
          completed: false,
        },
        {
          id: 'l5',
          title: '2.2 Contorno de Objeções de Alto Ticket',
          duration: '25:15',
          videoSrc: 'https://vjs.zencdn.net/v/oceans.mp4',
          description: 'Como responder a "está caro", "preciso falar com meu sócio" e "não tenho tempo agora".',
          completed: false,
        },
      ],
    },
  ],
  c2: [
    {
      id: 'm2-1',
      title: 'Módulo 1: Roteiro & Pitch Executivo',
      lessons: [
        {
          id: 'l2-1',
          title: '1.1 Abertura Magnética & Conexão Inicial',
          duration: '14:30',
          videoSrc: 'https://vjs.zencdn.net/v/oceans.mp4',
          description: 'Como quebrar o gelo e estabelecer autoridade imediata nos primeiros 3 minutos de videoconferência.',
          completed: false,
        },
      ],
    },
  ],
};

function formatEmbedUrl(url: string): string {
  if (!url) return '';
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('watch?v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3`;
  }
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3`;
  }
  if (url.includes('vimeo.com/') && !url.includes('player.vimeo.com')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    return `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0`;
  }
  return url;
}

function isDirectVideo(url: string): boolean {
  if (!url) return true;
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com') || url.includes('loom.com')) {
    return false;
  }
  return true;
}

export default function AcademyPage() {
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODAS');
  const [courseModules, setCourseModules] = useState<Record<string, Module[]>>(DEFAULT_COURSE_MODULES);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { addNotification } = useNotifications();

  // Custom Video Player States
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState(false);

  // Modals Management
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false);
  const [isAddLessonModalOpen, setIsAddLessonModalOpen] = useState(false);
  const [isEditLessonModalOpen, setIsEditLessonModalOpen] = useState(false);
  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);

  // Categories Modal Form
  const [newCategoryName, setNewCategoryName] = useState('');

  // Selected Target States for Editing
  const [targetModuleId, setTargetModuleId] = useState<string>('');
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Form: Create Course
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseCategory, setNewCourseCategory] = useState(categories[0] || 'Vendas & Negócios');
  const [newCourseLevel, setNewCourseLevel] = useState('Avançado');
  const [newCourseCover, setNewCourseCover] = useState('https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80');

  // Form: Edit Course
  const [editCourseTitle, setEditCourseTitle] = useState('');
  const [editCourseDesc, setEditCourseDesc] = useState('');
  const [editCourseCategory, setEditCourseCategory] = useState('');
  const [editCourseLevel, setEditCourseLevel] = useState('');
  const [editCourseCover, setEditCourseCover] = useState('');

  // Form: Add / Edit Lesson
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDuration, setLessonDuration] = useState('20:00');
  const [lessonVideoSrc, setLessonVideoSrc] = useState('https://vjs.zencdn.net/v/oceans.mp4');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonMaterials, setLessonMaterials] = useState<{ name: string; link: string }[]>([
    { name: '', link: '' },
  ]);

  const handleAddMaterialField = () => {
    if (lessonMaterials.length < 5) {
      setLessonMaterials([...lessonMaterials, { name: '', link: '' }]);
    }
  };

  const handleRemoveMaterialField = (index: number) => {
    if (lessonMaterials.length > 1) {
      setLessonMaterials(lessonMaterials.filter((_, i) => i !== index));
    } else {
      setLessonMaterials([{ name: '', link: '' }]);
    }
  };

  const handleMaterialChange = (index: number, field: 'name' | 'link', value: string) => {
    const updated = [...lessonMaterials];
    updated[index][field] = value;
    setLessonMaterials(updated);
  };

  // Form: Add Module
  const [newModuleName, setNewModuleName] = useState('');

  // Delete Confirmation States
  const [deleteTargetCategory, setDeleteTargetCategory] = useState<string | null>(null);
  const [deleteTargetCourse, setDeleteTargetCourse] = useState<Course | null>(null);
  const [deleteTargetLesson, setDeleteTargetLesson] = useState<Lesson | null>(null);

  // Comments State
  const [comments, setComments] = useState<{ id: string; user: string; text: string; time: string }[]>([
    {
      id: 'c1',
      user: 'Carlos Silva',
      text: 'Aula sensacional! Apliquei a mudança de precificação hoje e já fechei o primeiro contrato de R$ 20.000!',
      time: 'Há 2 horas',
    },
    {
      id: 'c2',
      user: 'Dra. Patricia',
      text: 'Excelente o modelo de script de diagnóstico. Muito objetivo e sem enrolação.',
      time: 'Há 5 horas',
    },
  ]);
  const [newComment, setNewComment] = useState('');
  const [contentTab, setContentTab] = useState<'overview' | 'materials' | 'comments'>('overview');

  // Load from localStorage
  useEffect(() => {
    try {
      const savedCourses = localStorage.getItem('rocket_club_academy_courses');
      const savedModules = localStorage.getItem('rocket_club_academy_modules');
      const savedCats = localStorage.getItem('rocket_club_academy_categories');
      if (savedCourses) setCourses(JSON.parse(savedCourses));
      if (savedModules) setCourseModules(JSON.parse(savedModules));
      if (savedCats) setCategories(JSON.parse(savedCats));
    } catch (e) {}
  }, []);

  const saveToStorage = (
    updatedCourses?: Course[],
    updatedModules?: Record<string, Module[]>,
    updatedCats?: string[]
  ) => {
    try {
      if (updatedCourses) {
        setCourses(updatedCourses);
        localStorage.setItem('rocket_club_academy_courses', JSON.stringify(updatedCourses));
      }
      if (updatedModules) {
        setCourseModules(updatedModules);
        localStorage.setItem('rocket_club_academy_modules', JSON.stringify(updatedModules));
      }
      if (updatedCats) {
        setCategories(updatedCats);
        localStorage.setItem('rocket_club_academy_categories', JSON.stringify(updatedCats));
      }
    } catch (e) {}
  };

  const currentModules = selectedCourse
    ? courseModules[selectedCourse.id] || [
        {
          id: `m-init-${selectedCourse.id}`,
          title: 'Módulo 1: Introdução & Primeiros Passos',
          lessons: [
            {
              id: `l-init-${selectedCourse.id}`,
              title: '1.1 Visão Geral e Alinhamento Estratégico',
              duration: '15:00',
              videoSrc: 'https://vjs.zencdn.net/v/oceans.mp4',
              description: 'Aula de boas-vindas e panorama da metodologia.',
              completed: false,
            },
          ],
        },
      ]
    : [];

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    const modules = courseModules[course.id] || currentModules;
    const firstLesson = modules[0]?.lessons[0] || null;
    setActiveLesson(firstLesson);
    setIsPlaying(false);
    setVideoError(false);
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setIsPlaying(false);
    setCurrentTime(0);
    setVideoError(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.load();
    }
  };

  // Safe Video Play Handler
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      setVideoError(false);
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Video play caught:', err);
            setIsPlaying(false);
            setVideoError(true);
          });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleChangeSpeed = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = volume || 1;
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // ── CATEGORY MANAGEMENT ──
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    const catName = newCategoryName.trim();
    if (categories.includes(catName)) {
      alert('Esta categoria já está cadastrada.');
      return;
    }

    const updated = [...categories, catName];
    saveToStorage(undefined, undefined, updated);
    setNewCategoryName('');

    addNotification({
      sector: 'academy',
      type: 'info',
      title: `🏷️ Nova Categoria: ${catName}`,
      message: `Categoria adicionada à Rocket Academy para organização dos cursos.`,
      link: '/academy',
      actionText: 'Ver Categorias',
    });

    setToastMsg(`✅ Categoria "${catName}" cadastrada com sucesso!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleConfirmDeleteCategory = () => {
    if (!deleteTargetCategory) return;
    const cat = deleteTargetCategory;
    const updated = categories.filter((c) => c !== cat);
    saveToStorage(undefined, undefined, updated);
    if (selectedCategoryFilter === cat) setSelectedCategoryFilter('TODAS');
    setDeleteTargetCategory(null);
    setToastMsg(`🗑️ Categoria "${cat}" removida com sucesso.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ── COURSE MANAGEMENT (CREATE, EDIT, DELETE) ──
  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;

    const courseId = `c-${Date.now()}`;
    const newCourse: Course = {
      id: courseId,
      title: newCourseTitle.trim(),
      description: newCourseDesc.trim() || 'Curso prático exclusivo da Rocket Academy.',
      category: newCourseCategory || categories[0] || 'Geral',
      level: newCourseLevel,
      lessonsCount: 1,
      durationMinutes: 45,
      coverImage: newCourseCover.trim() || 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
      progressPercent: 0,
    };

    const initialMod: Module = {
      id: `m-${Date.now()}`,
      title: 'Módulo 1: Introdução & Fundamentos',
      lessons: [
        {
          id: `l-${Date.now()}`,
          title: '1.1 Boas-Vindas & Objetivos da Trilha',
          duration: '15:00',
          videoSrc: 'https://vjs.zencdn.net/v/oceans.mp4',
          description: 'Apresentação da metodologia e direcionamento da mentoria.',
          completed: false,
        },
      ],
    };

    const updatedCourses = [newCourse, ...courses];
    const updatedModules = { ...courseModules, [courseId]: [initialMod] };

    saveToStorage(updatedCourses, updatedModules);

    addNotification({
      sector: 'academy',
      type: 'success',
      title: `🎓 Novo Curso Publicado: ${newCourse.title}`,
      message: `A trilha "${newCourse.title}" já está disponível para os mentorados.`,
      link: '/academy',
      actionText: 'Ver Curso',
    });

    setNewCourseTitle('');
    setNewCourseDesc('');
    setIsCreateCourseModalOpen(false);
    setToastMsg(`🎉 Curso "${newCourse.title}" criado com sucesso!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleOpenEditCourseModal = (course: Course) => {
    setSelectedCourse(course);
    setEditCourseTitle(course.title);
    setEditCourseDesc(course.description);
    setEditCourseCategory(course.category);
    setEditCourseLevel(course.level);
    setEditCourseCover(course.coverImage);
    setIsEditCourseModalOpen(true);
  };

  const handleSaveCourseEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    const updatedCourses = courses.map((c) => {
      if (c.id === selectedCourse.id) {
        return {
          ...c,
          title: editCourseTitle.trim(),
          description: editCourseDesc.trim(),
          category: editCourseCategory,
          level: editCourseLevel,
          coverImage: editCourseCover.trim(),
        };
      }
      return c;
    });

    saveToStorage(updatedCourses);
    setSelectedCourse({
      ...selectedCourse,
      title: editCourseTitle.trim(),
      description: editCourseDesc.trim(),
      category: editCourseCategory,
      level: editCourseLevel,
      coverImage: editCourseCover.trim(),
    });

    setIsEditCourseModalOpen(false);
    setToastMsg('✅ Dados do curso atualizados com sucesso!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleConfirmDeleteCourse = () => {
    if (!deleteTargetCourse) return;
    const courseId = deleteTargetCourse.id;
    const updatedCourses = courses.filter((c) => c.id !== courseId);
    const updatedModules = { ...courseModules };
    delete updatedModules[courseId];

    saveToStorage(updatedCourses, updatedModules);
    setSelectedCourse(null);
    setActiveLesson(null);
    setIsEditCourseModalOpen(false);
    setDeleteTargetCourse(null);
    setToastMsg(`🗑️ Curso "${deleteTargetCourse.title}" excluído com sucesso.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ── LESSON & MODULE MANAGEMENT ──
  const handleOpenAddLessonModal = (moduleId?: string) => {
    if (!selectedCourse) return;
    const mods = courseModules[selectedCourse.id] || currentModules;
    setTargetModuleId(moduleId || mods[0]?.id || '');
    setLessonTitle('');
    setLessonDuration('20:00');
    setLessonVideoSrc('https://vjs.zencdn.net/v/oceans.mp4');
    setLessonDescription('');
    setLessonMaterials([{ name: '', link: '' }]);
    setIsAddLessonModalOpen(true);
  };

  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !lessonTitle.trim()) return;

    const validMaterials = lessonMaterials
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        size: 'Arquivo Anexo',
        link: m.link.trim() || '#',
      }));

    const newLes: Lesson = {
      id: `l-${Date.now()}`,
      title: lessonTitle.trim(),
      duration: lessonDuration.trim() || '20:00',
      videoSrc: lessonVideoSrc.trim() || 'https://vjs.zencdn.net/v/oceans.mp4',
      description: lessonDescription.trim() || 'Aula prática da mentoria.',
      materials: validMaterials,
      completed: false,
    };

    const updatedModules = { ...courseModules };
    const courseModList = [...(updatedModules[selectedCourse.id] || currentModules)];

    const modIndex = courseModList.findIndex((m) => m.id === targetModuleId);
    if (modIndex >= 0) {
      courseModList[modIndex].lessons.push(newLes);
    } else if (courseModList.length > 0) {
      courseModList[0].lessons.push(newLes);
    }

    updatedModules[selectedCourse.id] = courseModList;

    const totalLessons = courseModList.reduce((acc, m) => acc + m.lessons.length, 0);
    const updatedCourses = courses.map((c) =>
      c.id === selectedCourse.id ? { ...c, lessonsCount: totalLessons } : c
    );

    saveToStorage(updatedCourses, updatedModules);
    setActiveLesson(newLes);
    setIsAddLessonModalOpen(false);

    setToastMsg(`✅ Aula "${newLes.title}" adicionada com ${validMaterials.length} materiais!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOpenEditLessonModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonTitle(lesson.title);
    setLessonDuration(lesson.duration);
    setLessonVideoSrc(lesson.videoSrc);
    setLessonDescription(lesson.description);
    setLessonMaterials(
      lesson.materials && lesson.materials.length > 0
        ? lesson.materials.map((m) => ({ name: m.name, link: m.link }))
        : [{ name: '', link: '' }]
    );
    setIsEditLessonModalOpen(true);
  };

  const handleSaveLessonEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !editingLesson) return;

    const validMaterials = lessonMaterials
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        size: 'Arquivo Anexo',
        link: m.link.trim() || '#',
      }));

    const updatedModules = { ...courseModules };
    const courseModList = [...(updatedModules[selectedCourse.id] || currentModules)];

    courseModList.forEach((m) => {
      m.lessons.forEach((l) => {
        if (l.id === editingLesson.id) {
          l.title = lessonTitle.trim();
          l.duration = lessonDuration.trim();
          l.videoSrc = lessonVideoSrc.trim();
          l.description = lessonDescription.trim();
          l.materials = validMaterials;
        }
      });
    });

    updatedModules[selectedCourse.id] = courseModList;
    saveToStorage(undefined, updatedModules);

    if (activeLesson?.id === editingLesson.id) {
      setActiveLesson({
        ...editingLesson,
        title: lessonTitle.trim(),
        duration: lessonDuration.trim(),
        videoSrc: lessonVideoSrc.trim(),
        description: lessonDescription.trim(),
        materials: validMaterials,
      });
    }

    setIsEditLessonModalOpen(false);
    setToastMsg('✅ Aula atualizada com sucesso!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleConfirmDeleteLesson = () => {
    if (!selectedCourse || !deleteTargetLesson) return;
    const lessonId = deleteTargetLesson.id;
    const updatedModules = { ...courseModules };
    const courseModList = [...(updatedModules[selectedCourse.id] || currentModules)];

    courseModList.forEach((m) => {
      m.lessons = m.lessons.filter((l) => l.id !== lessonId);
    });

    updatedModules[selectedCourse.id] = courseModList;

    const totalLessons = courseModList.reduce((acc, m) => acc + m.lessons.length, 0);
    const updatedCourses = courses.map((c) =>
      c.id === selectedCourse.id ? { ...c, lessonsCount: totalLessons } : c
    );

    saveToStorage(updatedCourses, updatedModules);

    if (activeLesson?.id === lessonId) {
      const nextLesson = courseModList[0]?.lessons[0] || null;
      setActiveLesson(nextLesson);
    }

    setIsEditLessonModalOpen(false);
    setEditingLesson(null);
    setDeleteTargetLesson(null);
    setToastMsg(`🗑️ Aula "${deleteTargetLesson.title}" excluída com sucesso.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !newModuleName.trim()) return;

    const newMod: Module = {
      id: `m-${Date.now()}`,
      title: newModuleName.trim(),
      lessons: [],
    };

    const updatedModules = { ...courseModules };
    const courseModList = [...(updatedModules[selectedCourse.id] || currentModules), newMod];
    updatedModules[selectedCourse.id] = courseModList;

    saveToStorage(undefined, updatedModules);
    setNewModuleName('');
    setIsAddModuleModalOpen(false);
    setToastMsg(`✅ Módulo "${newMod.title}" adicionado!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setComments([
      { id: `c-${Date.now()}`, user: 'Comandante Master', text: newComment, time: 'Agora mesmo' },
      ...comments,
    ]);

    addNotification({
      sector: 'academy',
      type: 'info',
      title: '💬 Novo Comentário na Rocket Academy',
      message: `Comentário postado na aula: ${activeLesson?.title || 'Aula da Mentoria'}.`,
      link: '/academy',
      actionText: 'Ver na Academy',
    });

    setNewComment('');
  };

  // Filtered courses by category
  const filteredCourses = courses.filter((c) => {
    if (selectedCategoryFilter === 'TODAS') return true;
    return c.category === selectedCategoryFilter;
  });

  const isDirect = activeLesson ? isDirectVideo(activeLesson.videoSrc) : true;
  const embedUrl = activeLesson ? formatEmbedUrl(activeLesson.videoSrc) : '';

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-xl animate-in slide-in-from-top duration-300">
          <CheckCircle size={18} className="text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* VIEW 1: SINGLE PAGE COURSE PLAYER VIEW                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {selectedCourse && activeLesson ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Course Navigation & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-[#1F293D]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedCourse(null)}
                className="px-3.5 py-2 rounded-xl bg-[#131926] hover:bg-[#1F293D] text-slate-300 hover:text-yellow-400 border border-[#1F293D] text-xs font-bold flex items-center gap-2 transition-all group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span>Voltar aos Cursos</span>
              </button>
              <div>
                <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider block">
                  {selectedCourse.category} • {selectedCourse.level}
                </span>
                <h1 className="text-lg sm:text-xl font-black text-slate-100">{selectedCourse.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleOpenAddLessonModal()}
                className="px-3.5 py-2 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs hover:bg-yellow-400 transition-all flex items-center gap-1.5 shadow-md shadow-yellow-500/10"
              >
                <Plus size={15} />
                <span>Adicionar Aula</span>
              </button>

              <button
                onClick={() => setIsAddModuleModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-[#131926] hover:bg-[#1F293D] text-slate-300 border border-[#1F293D] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <FolderPlus size={15} className="text-yellow-400" />
                <span className="hidden xs:inline">Novo Módulo</span>
              </button>

              <button
                onClick={() => handleOpenEditCourseModal(selectedCourse)}
                className="p-2 rounded-xl bg-[#131926] hover:bg-[#1F293D] text-slate-400 hover:text-yellow-400 border border-[#1F293D] transition-colors"
                title="Editar Configurações do Curso"
              >
                <Settings2 size={16} />
              </button>
            </div>
          </div>

          {/* Main Player & Sidebar Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Custom Video Player & Lesson Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Custom Video Player Container */}
              <div
                ref={playerContainerRef}
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => isPlaying && setShowControls(false)}
                className="relative aspect-video w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-black shadow-2xl border border-yellow-500/30 group"
              >
                {isDirect ? (
                  <>
                    <video
                      ref={videoRef}
                      src={activeLesson.videoSrc}
                      preload="metadata"
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={() => setIsPlaying(false)}
                      onError={() => {
                        console.warn('Video source load error');
                        setVideoError(true);
                        setIsPlaying(false);
                      }}
                      onClick={togglePlay}
                      className="w-full h-full object-cover cursor-pointer"
                      playsInline
                    />

                    {/* Big Center Play/Pause Trigger */}
                    {!isPlaying && !videoError && (
                      <div
                        onClick={togglePlay}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer transition-all"
                      >
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-2xl shadow-yellow-500/40 hover:scale-110 transition-transform pl-1">
                          <Play size={32} className="fill-slate-950 text-slate-950" />
                        </div>
                      </div>
                    )}

                    {/* Video Error Friendly Fallback */}
                    {videoError && (
                      <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-3">
                        <AlertCircle size={32} className="text-yellow-400" />
                        <h4 className="text-sm font-bold text-slate-100">
                          Vídeo de demonstração indisponível temporariamente
                        </h4>
                        <p className="text-xs text-slate-400 max-w-sm">
                          Altere o link desta aula para qualquer vídeo do YouTube, Vimeo ou link MP4.
                        </p>
                        <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                          <button
                            onClick={() => {
                              if (activeLesson) {
                                activeLesson.videoSrc = 'https://vjs.zencdn.net/v/oceans.mp4';
                                setActiveLesson({ ...activeLesson });
                                setVideoError(false);
                                if (videoRef.current) {
                                  videoRef.current.load();
                                }
                              }
                            }}
                            className="px-3.5 py-2 rounded-xl bg-yellow-500 text-slate-950 text-xs font-bold hover:bg-yellow-400 transition-colors flex items-center gap-1.5"
                          >
                            <RefreshCw size={14} /> Fonte Padrão
                          </button>
                          <button
                            onClick={() => handleOpenEditLessonModal(activeLesson)}
                            className="px-3.5 py-2 rounded-xl bg-[#131926] text-yellow-400 border border-yellow-500/40 text-xs font-bold hover:bg-[#1F293D] transition-colors flex items-center gap-1.5"
                          >
                            <Pencil size={14} /> Editar Link
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Video Top Watermark */}
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 pointer-events-none opacity-80">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-yellow-500/20 backdrop-blur-md text-yellow-400 flex items-center justify-center font-bold text-xs border border-yellow-500/30">
                        🚀
                      </div>
                      <span className="text-[11px] sm:text-xs font-black text-slate-200 drop-shadow-md">
                        Rocket Academy HD
                      </span>
                    </div>

                    {/* CLEAN CUSTOM VIDEO CONTROLS BAR */}
                    {!videoError && (
                      <div
                        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 flex flex-col gap-2 ${
                          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                      >
                        {/* Seekbar Progress Slider */}
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-1.5 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-yellow-400 hover:h-2 transition-all"
                          />
                        </div>

                        {/* Controls Row */}
                        <div className="flex items-center justify-between text-xs text-slate-200">
                          {/* Left: Play/Pause, Time, Volume */}
                          <div className="flex items-center gap-2.5 sm:gap-3.5">
                            <button
                              onClick={togglePlay}
                              className="p-1.5 rounded-lg bg-yellow-500 text-slate-950 hover:bg-yellow-400 transition-colors font-bold flex items-center justify-center"
                              title={isPlaying ? 'Pausar' : 'Reproduzir'}
                            >
                              {isPlaying ? <Pause size={15} /> : <Play size={15} className="fill-slate-950" />}
                            </button>

                            <div className="text-[10px] sm:text-[11px] font-mono text-slate-300 font-bold">
                              <span>{formatTime(currentTime)}</span>
                              <span className="text-slate-500"> / </span>
                              <span>{formatTime(duration)}</span>
                            </div>

                            {/* Volume Slider (Hidden on extra small screens) */}
                            <div className="hidden sm:flex items-center gap-2">
                              <button onClick={toggleMute} className="text-slate-300 hover:text-yellow-400 transition-colors">
                                {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                              </button>
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-14 sm:w-16 h-1 bg-slate-700 rounded-lg appearance-none accent-yellow-400 cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Right: Speed Controls & Fullscreen */}
                          <div className="flex items-center gap-2 sm:gap-3">
                            {/* Speed Pills */}
                            <div className="flex items-center gap-0.5 bg-[#131926]/90 p-0.5 sm:p-1 rounded-xl border border-[#1F293D]">
                              {[1, 1.25, 1.5, 2].map((spd) => (
                                <button
                                  key={spd}
                                  onClick={() => handleChangeSpeed(spd)}
                                  className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition-colors ${
                                    playbackRate === spd
                                      ? 'bg-yellow-500 text-slate-950'
                                      : 'text-slate-400 hover:text-slate-100'
                                  }`}
                                >
                                  {spd}x
                                </button>
                              ))}
                            </div>

                            {/* Fullscreen Button */}
                            <button
                              onClick={toggleFullscreen}
                              className="p-1.5 rounded-lg bg-[#131926] hover:bg-[#1F293D] text-slate-300 hover:text-yellow-400 transition-colors"
                              title="Tela Cheia"
                            >
                              <Maximize size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* YouTube / Vimeo Clean Embed Player */
                  <iframe
                    src={embedUrl}
                    title={activeLesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                )}
              </div>

              {/* Lesson Info Header & Action Buttons */}
              <Card className="p-4 sm:p-6 space-y-4 border-[#1F293D] bg-[#131926]">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 pb-4 border-b border-[#1F293D]">
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-500/30">
                      Aula em Reprodução
                    </Badge>
                    <h2 className="text-base sm:text-lg font-bold text-slate-100">{activeLesson.title}</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">{activeLesson.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditLessonModal(activeLesson)}
                      className="px-3 py-2 rounded-xl bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 hover:text-yellow-400 border border-[#1F293D] transition-colors text-xs font-semibold flex items-center gap-1.5"
                      title="Editar Dados desta Aula"
                    >
                      <Pencil size={13} />
                      <span>Editar Aula</span>
                    </button>

                    <button
                      onClick={() => {
                        activeLesson.completed = !activeLesson.completed;
                        setActiveLesson({ ...activeLesson });
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        activeLesson.completed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-yellow-500 text-slate-950 hover:bg-yellow-400'
                      }`}
                    >
                      <CheckCheck size={15} />
                      <span>{activeLesson.completed ? 'Concluída' : 'Marcar Concluída'}</span>
                    </button>
                  </div>
                </div>

                {/* Lesson Tabs */}
                <div className="flex items-center gap-1.5 sm:gap-2 border-b border-[#1F293D] pb-3 text-xs overflow-x-auto">
                  <button
                    onClick={() => setContentTab('overview')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 ${
                      contentTab === 'overview'
                        ? 'bg-yellow-500 text-slate-950'
                        : 'text-slate-400 hover:bg-[#1F293D]'
                    }`}
                  >
                    Resumo
                  </button>
                  <button
                    onClick={() => setContentTab('materials')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                      contentTab === 'materials'
                        ? 'bg-yellow-500 text-slate-950'
                        : 'text-slate-400 hover:bg-[#1F293D]'
                    }`}
                  >
                    <FileText size={13} />
                    <span>Materiais ({activeLesson.materials?.length || 0})</span>
                  </button>
                  <button
                    onClick={() => setContentTab('comments')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                      contentTab === 'comments'
                        ? 'bg-yellow-500 text-slate-950'
                        : 'text-slate-400 hover:bg-[#1F293D]'
                    }`}
                  >
                    <MessageSquare size={13} />
                    <span>Dúvidas ({comments.length})</span>
                  </button>
                </div>

                {/* Tab: Resumo */}
                {contentTab === 'overview' && (
                  <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                    <p>{activeLesson.description}</p>
                    <div className="p-3.5 sm:p-4 rounded-xl bg-[#0B0F17] border border-[#1F293D] space-y-2">
                      <span className="font-bold text-yellow-400 text-xs">💡 Principais Aprendizados:</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                        <li>Aplique a metodologia no seu negócio nesta semana.</li>
                        <li>Baixe os templates e apresentações anexadas na aba de materiais.</li>
                        <li>Deixe suas dúvidas no fórum para feedback do mentor.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Tab: Materiais */}
                {contentTab === 'materials' && (
                  <div className="space-y-2">
                    {activeLesson.materials && activeLesson.materials.length > 0 ? (
                      activeLesson.materials.map((mat, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1F293D] flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
                              <FileText size={16} />
                            </div>
                            <div>
                              <span className="font-bold text-slate-200 block">{mat.name}</span>
                              <span className="text-[10px] text-slate-500">{mat.size || 'Arquivo Anexo'}</span>
                            </div>
                          </div>
                          <a
                            href={mat.link}
                            className="px-3 py-1.5 rounded-lg bg-[#131926] hover:bg-[#1F293D] text-yellow-400 border border-yellow-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Download size={13} /> Baixar
                          </a>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic p-4 text-center">Nenhum anexo para esta aula.</p>
                    )}
                  </div>
                )}

                {/* Tab: Comentários */}
                {contentTab === 'comments' && (
                  <div className="space-y-4">
                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Escreva sua dúvida sobre esta aula..."
                        className="flex-1 bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/40"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs hover:bg-yellow-400 transition-colors flex items-center gap-1 shrink-0"
                      >
                        <Send size={14} /> Enviar
                      </button>
                    </form>

                    <div className="space-y-2.5">
                      {comments.map((c) => (
                        <div key={c.id} className="p-3.5 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-yellow-400">{c.user}</span>
                            <span className="text-[10px] text-slate-500">{c.time}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Right 1 Column: Course Modules & Lessons Playlist */}
            <div className="space-y-4">
              <Card className="p-4 sm:p-5 bg-[#131926] border-[#1F293D] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1F293D]">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <ListVideo size={16} className="text-yellow-400" />
                    <span>Grade Curricular</span>
                  </h3>
                  <button
                    onClick={() => handleOpenAddLessonModal()}
                    className="text-[11px] font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                  >
                    <Plus size={13} /> Nova Aula
                  </button>
                </div>

                {/* Modules Accordion / List */}
                <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1">
                  {currentModules.map((mod) => (
                    <div key={mod.id} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">
                          {mod.title}
                        </span>
                        <button
                          onClick={() => handleOpenAddLessonModal(mod.id)}
                          className="text-[10px] font-bold text-yellow-500 hover:text-yellow-400 p-1"
                          title="Adicionar aula a este módulo"
                        >
                          + Aula
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {mod.lessons.map((les) => {
                          const isActive = activeLesson.id === les.id;

                          return (
                            <div
                              key={les.id}
                              onClick={() => handleSelectLesson(les)}
                              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                                isActive
                                  ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300 shadow-md ring-1 ring-yellow-400'
                                  : 'bg-[#0B0F17]/70 border-[#1F293D] hover:bg-[#1F293D] text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {les.completed ? (
                                  <CheckCircle size={15} className="text-emerald-400 shrink-0" />
                                ) : (
                                  <PlayCircle size={15} className={isActive ? 'text-yellow-400 shrink-0' : 'text-slate-500 shrink-0'} />
                                )}
                                <span className="text-xs font-semibold truncate">{les.title}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditLessonModal(les);
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-yellow-400 hover:bg-[#131926] transition-colors"
                                  title="Editar Aula"
                                >
                                  <Pencil size={12} />
                                </button>
                                <span className="text-[10px] font-mono text-slate-500">{les.duration}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════ */
        /* VIEW 2: COURSE CATALOG & TRACKS LIST                       */
        /* ═══════════════════════════════════════════════════════════ */
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
          {/* Top Banner with Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <Badge variant="default" className="mb-2">
                <GraduationCap size={14} className="mr-1.5" /> Rocket Academy — Sala de Aula
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                Trilhas de <span className="gold-gradient-text">Conhecimento & Escala</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Gerencie e assista às aulas, metodologias e materiais exclusivos do ecossistema.
              </p>
            </div>

            {/* ACTION BUTTONS: + CRIAR NOVO CURSO & GERENCIAR CATEGORIAS */}
            <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
              <button
                onClick={() => setIsManageCategoriesModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#131926] hover:bg-[#1F293D] text-slate-300 hover:text-yellow-400 border border-[#1F293D] font-bold text-xs transition-all flex items-center gap-2 shadow"
              >
                <Tag size={15} className="text-yellow-400" />
                <span>Gerenciar Categorias</span>
              </button>

              <button
                onClick={() => setIsCreateCourseModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-yellow-500/20 hover:scale-105 transition-all flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Criar Novo Curso</span>
              </button>
            </div>
          </div>

          {/* Dynamic Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryFilter('TODAS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategoryFilter === 'TODAS'
                  ? 'bg-yellow-500 text-slate-950 shadow-md font-black'
                  : 'bg-[#131926] text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
              }`}
            >
              Todas as Trilhas ({courses.length})
            </button>

            {categories.map((cat) => {
              const count = courses.filter((c) => c.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategoryFilter === cat
                      ? 'bg-yellow-500 text-slate-950 shadow-md font-black'
                      : 'bg-[#131926] text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
                  }`}
                >
                  {cat} {count > 0 && <span className="text-[10px] opacity-75 font-mono">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Course Cards Catalog Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredCourses.map((course) => (
              <Card
                key={course.id}
                onClick={() => handleSelectCourse(course)}
                className="group overflow-hidden cursor-pointer hover:scale-[1.01] sm:hover:scale-[1.02] flex flex-col justify-between p-0 border-[#1F293D] bg-[#131926] shadow-xl hover:border-yellow-500/50 transition-all relative"
              >
                {/* Cover Image */}
                <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-900">
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#131926] via-transparent to-transparent" />
                  <Badge variant="default" className="absolute top-3 right-3 bg-black/70 backdrop-blur-md">
                    {course.level}
                  </Badge>

                  {/* Edit Course Quick Button on Card */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditCourseModal(course);
                    }}
                    className="absolute top-3 left-3 w-8 h-8 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-slate-300 hover:text-yellow-400 flex items-center justify-center transition-colors shadow-md"
                    title="Editar Curso"
                  >
                    <Pencil size={13} />
                  </button>
                </div>

                {/* Course Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-extrabold text-yellow-500 uppercase tracking-wider">
                      {course.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-yellow-400 transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-[#1F293D]">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={14} className="text-yellow-400" />
                        {course.lessonsCount} aulas
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-yellow-400" />
                        {course.durationMinutes} min
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                        <span>Progresso</span>
                        <span className="text-yellow-400 font-bold">{course.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#0B0F17] rounded-full overflow-hidden border border-[#1F293D]">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-500 to-amber-300 transition-all rounded-full"
                          style={{ width: `${course.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-3.5 sm:p-4 bg-[#0B0F17] border-t border-[#1F293D] flex items-center justify-between text-xs font-bold text-yellow-400 group-hover:text-yellow-300">
                  <span>Acessar Trilha de Aulas</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: GERENCIAR CATEGORIAS DOS CURSOS                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isManageCategoriesModalOpen && (
        <Modal
          isOpen={isManageCategoriesModalOpen}
          onClose={() => setIsManageCategoriesModalOpen(false)}
          title="Gerenciador de Categorias da Academy"
          subtitle="Organize as trilhas de conhecimento e especializações"
          icon={<Tags size={20} />}
          size="lg"
        >
          <div className="space-y-4">
            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="space-y-3">
              <label className="block text-xs text-slate-300 font-semibold">
                Cadastrar Nova Categoria de Cursos
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Inteligência Artificial nos Negócios"
                  className="flex-1 bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/40 font-semibold"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs hover:bg-yellow-400 transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus size={15} /> Cadastrar
                </button>
              </div>
            </form>

            {/* List of Existing Categories */}
            <div className="space-y-2 pt-2 border-t border-[#1F293D]">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Categorias Ativas ({categories.length})
              </span>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const count = courses.filter((c) => c.category === cat).length;
                  return (
                    <div
                      key={cat}
                      className="p-2.5 rounded-xl bg-[#0B0F17] border border-[#1F293D] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Tag size={13} className="text-yellow-400" />
                        <span className="font-semibold text-slate-200">{cat}</span>
                        <span className="text-[10px] text-slate-500">
                          ({count} {count === 1 ? 'curso' : 'cursos'})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeleteTargetCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-[#131926] transition-colors"
                        title="Excluir Categoria"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => setIsManageCategoriesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0B0F17] text-slate-300 text-xs font-semibold hover:bg-[#1F293D] transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL 1: CRIAR NOVO CURSO                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isCreateCourseModalOpen && (
        <Modal
          isOpen={isCreateCourseModalOpen}
          onClose={() => setIsCreateCourseModalOpen(false)}
          title="Cadastrar Novo Curso na Academy"
          subtitle="Crie uma nova formação executiva com trilha modular de aulas"
          icon={<Sparkles size={20} />}
          size="lg"
        >
          <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Título do Curso</label>
                <input
                  type="text"
                  required
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="Ex: Gestão Financeira para Empresas High-Ticket"
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Categoria</label>
                  <select
                    value={newCourseCategory}
                    onChange={(e) => setNewCourseCategory(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-semibold"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nível de Dificuldade</label>
                  <select
                    value={newCourseLevel}
                    onChange={(e) => setNewCourseLevel(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                    <option value="Master">Master</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descrição / Objetivos do Curso</label>
                <textarea
                  rows={3}
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  placeholder="O que o mentorado irá dominar ao concluir este curso..."
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">URL da Imagem de Capa</label>
                <input
                  type="url"
                  value={newCourseCover}
                  onChange={(e) => setNewCourseCover(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => setIsCreateCourseModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-[#0B0F17] text-slate-400 text-xs font-semibold hover:bg-[#1F293D]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-bold text-xs hover:scale-105 transition-all shadow-md shadow-yellow-500/20"
              >
                Criar Curso
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL 2: EDITAR CURSO                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isEditCourseModalOpen && selectedCourse && (
        <Modal
          isOpen={isEditCourseModalOpen}
          onClose={() => setIsEditCourseModalOpen(false)}
          title="Editar Informações do Curso"
          subtitle={`Curso: ${selectedCourse.title}`}
          icon={<Pencil size={20} />}
          size="lg"
        >
          <form onSubmit={handleSaveCourseEdits} className="space-y-4 text-xs">
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Título do Curso</label>
                <input
                  type="text"
                  required
                  value={editCourseTitle}
                  onChange={(e) => setEditCourseTitle(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Categoria</label>
                  <select
                    value={editCourseCategory}
                    onChange={(e) => setEditCourseCategory(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nível</label>
                  <input
                    type="text"
                    value={editCourseLevel}
                    onChange={(e) => setEditCourseLevel(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={editCourseDesc}
                  onChange={(e) => setEditCourseDesc(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">URL da Imagem de Capa</label>
                <input
                  type="url"
                  value={editCourseCover}
                  onChange={(e) => setEditCourseCover(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => setDeleteTargetCourse(selectedCourse)}
                className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={13} /> Excluir Curso
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditCourseModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#0B0F17] text-slate-400 text-xs font-semibold hover:bg-[#1F293D]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs hover:bg-yellow-400 flex items-center gap-1.5"
                >
                  <Save size={14} /> Salvar Alterações
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL 3: ADICIONAR NOVA AULA                                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isAddLessonModalOpen && selectedCourse && (
        <Modal
          isOpen={isAddLessonModalOpen}
          onClose={() => setIsAddLessonModalOpen(false)}
          title="Adicionar Nova Aula no Curso"
          subtitle={`Curso: ${selectedCourse.title}`}
          icon={<Plus size={20} />}
          size="lg"
        >
          <form onSubmit={handleCreateLesson} className="space-y-4 text-xs">
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Módulo de Destino</label>
                <select
                  value={targetModuleId}
                  onChange={(e) => setTargetModuleId(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                >
                  {currentModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Título da Aula</label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Ex: 2.3 Estrutura de Contrato & Garantias"
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Duração da Aula</label>
                  <input
                    type="text"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    placeholder="Ex: 22:30"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">URL do Vídeo</label>
                  <input
                    type="text"
                    required
                    value={lessonVideoSrc}
                    onChange={(e) => setLessonVideoSrc(e.target.value)}
                    placeholder="YouTube, Vimeo ou link MP4"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Resumo & Objetivos</label>
                <textarea
                  rows={3}
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  placeholder="Explicação do conteúdo abordado na aula..."
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40 resize-none"
                />
              </div>

              {/* Dynamic Materials List (Max 5) */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0B0F17] border border-[#1F293D] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider block">
                    Materiais de Apoio ({lessonMaterials.length}/5)
                  </span>
                  {lessonMaterials.length < 5 ? (
                    <button
                      type="button"
                      onClick={handleAddMaterialField}
                      className="text-[11px] font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-1 rounded-lg hover:bg-yellow-500/20 transition-all"
                    >
                      <Plus size={13} /> Adicionar Arquivo
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-yellow-500/80 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                      Limite de 5 atingido
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {lessonMaterials.map((mat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                        <input
                          type="text"
                          value={mat.name}
                          onChange={(e) => handleMaterialChange(idx, 'name', e.target.value)}
                          placeholder={`Nome do Arquivo #${idx + 1} (Ex: Roteiro.pdf)`}
                          className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-yellow-500/40"
                        />
                        <input
                          type="text"
                          value={mat.link}
                          onChange={(e) => handleMaterialChange(idx, 'link', e.target.value)}
                          placeholder="Link do Download / Drive / S3"
                          className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-yellow-500/40"
                        />
                      </div>
                      {lessonMaterials.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterialField(idx)}
                          className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-[#131926] transition-colors shrink-0"
                          title="Remover este arquivo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => setIsAddLessonModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-[#0B0F17] text-slate-400 text-xs font-semibold hover:bg-[#1F293D]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs hover:bg-yellow-400 transition-colors flex items-center gap-1.5"
              >
                <Plus size={15} /> Adicionar Aula
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL 4: EDITAR AULA EXISTENTE                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isEditLessonModalOpen && editingLesson && (
        <Modal
          isOpen={isEditLessonModalOpen}
          onClose={() => setIsEditLessonModalOpen(false)}
          title="Editar Aula"
          subtitle={`Aula: ${editingLesson.title}`}
          icon={<Pencil size={20} />}
          size="lg"
        >
          <form onSubmit={handleSaveLessonEdits} className="space-y-4 text-xs">
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Título da Aula</label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Duração</label>
                  <input
                    type="text"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">URL do Vídeo</label>
                  <input
                    type="text"
                    required
                    value={lessonVideoSrc}
                    onChange={(e) => setLessonVideoSrc(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Resumo & Descrição</label>
                <textarea
                  rows={3}
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40 resize-none"
                />
              </div>

              {/* Dynamic Materials List (Max 5) */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0B0F17] border border-[#1F293D] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider block">
                    Materiais de Apoio ({lessonMaterials.length}/5)
                  </span>
                  {lessonMaterials.length < 5 ? (
                    <button
                      type="button"
                      onClick={handleAddMaterialField}
                      className="text-[11px] font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-1 rounded-lg hover:bg-yellow-500/20 transition-all"
                    >
                      <Plus size={13} /> Adicionar Arquivo
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-yellow-500/80 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                      Limite de 5 atingido
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {lessonMaterials.map((mat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                        <input
                          type="text"
                          value={mat.name}
                          onChange={(e) => handleMaterialChange(idx, 'name', e.target.value)}
                          placeholder={`Nome do Arquivo #${idx + 1}`}
                          className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-yellow-500/40"
                        />
                        <input
                          type="text"
                          value={mat.link}
                          onChange={(e) => handleMaterialChange(idx, 'link', e.target.value)}
                          placeholder="Link do Download"
                          className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-yellow-500/40"
                        />
                      </div>
                      {lessonMaterials.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterialField(idx)}
                          className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-[#131926] transition-colors shrink-0"
                          title="Remover este arquivo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => setDeleteTargetLesson(editingLesson)}
                className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={13} /> Excluir Aula
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditLessonModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#0B0F17] text-slate-400 text-xs font-semibold hover:bg-[#1F293D]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs hover:bg-yellow-400 flex items-center gap-1.5"
                >
                  <Save size={14} /> Salvar Aula
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL 5: CRIAR NOVO MÓDULO                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isAddModuleModalOpen && selectedCourse && (
        <Modal
          isOpen={isAddModuleModalOpen}
          onClose={() => setIsAddModuleModalOpen(false)}
          title="Adicionar Novo Módulo"
          subtitle={`Curso: ${selectedCourse.title}`}
          icon={<FolderPlus size={20} />}
          size="md"
        >
          <form onSubmit={handleCreateModule} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Título do Módulo</label>
              <input
                type="text"
                required
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                placeholder="Ex: Módulo 3: Escala de Tráfego & Funis Perpétuos"
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => setIsAddModuleModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-[#0B0F17] text-slate-400 text-xs font-semibold hover:bg-[#1F293D]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs hover:bg-yellow-400"
              >
                Criar Módulo
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Styled Delete Confirmation Modal: Categoria */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetCategory}
        title="Excluir Categoria"
        itemName={deleteTargetCategory || undefined}
        description={`Tem certeza que deseja remover a categoria "${deleteTargetCategory}" da Rocket Academy?`}
        confirmText="Sim, Excluir Categoria"
        cancelText="Cancelar"
        onConfirm={handleConfirmDeleteCategory}
        onCancel={() => setDeleteTargetCategory(null)}
      />

      {/* Styled Delete Confirmation Modal: Curso */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetCourse}
        title="Excluir Curso Completo"
        itemName={deleteTargetCourse?.title}
        description={`Tem certeza que deseja remover o curso "${deleteTargetCourse?.title}" e todos os seus módulos e aulas da Rocket Academy?`}
        confirmText="Sim, Excluir Curso"
        cancelText="Cancelar"
        onConfirm={handleConfirmDeleteCourse}
        onCancel={() => setDeleteTargetCourse(null)}
      />

      {/* Styled Delete Confirmation Modal: Aula */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetLesson}
        title="Excluir Aula"
        itemName={deleteTargetLesson?.title}
        description={`Tem certeza que deseja remover a aula "${deleteTargetLesson?.title}" e seus materiais anexos?`}
        confirmText="Sim, Excluir Aula"
        cancelText="Cancelar"
        onConfirm={handleConfirmDeleteLesson}
        onCancel={() => setDeleteTargetLesson(null)}
      />
    </div>
  );
}
