import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Timer, 
  AlertTriangle, 
  ChevronRight, 
  CheckCircle2, 
  Code2, 
  Brain,
  Terminal,
  Trophy,
  User,
  BookOpen,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AttendTest() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [test, setTest] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<'intro' | 'mcq' | 'coding' | 'submitting'>('intro');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [codingAnswer, setCodingAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(15); // 15s for MCQ
  const [codingTimeLeft, setCodingTimeLeft] = useState(900); // 15m for coding
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch('/api/student/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProfile(data);
    };
    fetchProfile();

    const fetchTest = async () => {
      const res = await fetch('/api/admin/test', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTest(data);
    };
    fetchTest();

    // Tab switching detection
    const handleVisibilityChange = () => {
      if (document.hidden && currentStep !== 'intro' && currentStep !== 'submitting') {
        alert('Tab switching detected! Test will be auto-submitted.');
        submitFinalScore(0); // Penalty
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 'mcq') {
      setTimeLeft(15);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleNextQuestion();
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (currentStep === 'coding') {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCodingTimeLeft(prev => {
          if (prev <= 1) {
            submitFinalScore();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentStep, currentQuestionIdx]);

  const handleNextQuestion = () => {
    if (currentQuestionIdx < test.content.mcqs.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      setCurrentStep('coding');
    }
  };

  const submitFinalScore = async (forcedScore?: number) => {
    setCurrentStep('submitting');
    let score = forcedScore ?? 0;
    
    if (forcedScore === undefined) {
      // Calculate MCQ score
      test.content.mcqs.forEach((q: any, idx: number) => {
        if (answers[idx] === q.correctAnswer) score += q.marks;
      });
      // Mock coding score evaluation (in real app, use a sandbox)
      if (codingAnswer.length > 20) score += 10; 
    }

    await fetch('/api/student/submit-test', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ score }),
    });
    navigate('/student');
  };

  if (!test || !profile) return null;

  if (profile.testStatus === 'Completed') {
    return (
      <div className="min-h-screen bg-[#141414] text-white font-sans flex flex-col">
        {/* Top Navbar */}
        <nav className="bg-[#141414] border-b border-white/10 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-emerald-400" />
                <span className="font-bold tracking-tighter text-xl">STUDENT PORTAL</span>
              </div>
              
              <div className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => navigate('/student')}
                  className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-white/10"
                >
                  <User className="w-3 h-3" />
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/student/test')}
                  className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all bg-white text-[#141414]"
                >
                  <BookOpen className="w-3 h-3" />
                  Skill Test
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 mr-4 border-r border-white/10 pr-4">
                <div className="w-8 h-8 bg-emerald-400 text-[#141414] flex items-center justify-center font-bold text-xs">
                  {user?.name?.charAt(0)}
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold">{user?.name}</p>
                  <p className="text-[8px] uppercase tracking-widest text-white/40">ID: #{user?.id}</p>
                </div>
              </div>
              <button 
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:text-red-400 transition-colors border border-white/10"
              >
                <LogOut className="w-3 h-3" />
                Logout
              </button>
            </div>
          </div>
        </nav>

        <main className="flex-1 flex items-center justify-center p-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white text-[#141414] p-12 shadow-[12px_12px_0px_0px_rgba(16,185,129,1)] text-center"
          >
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold uppercase tracking-tighter mb-4">Test Completed</h2>
            <p className="text-sm text-[#141414]/60 mb-8 leading-relaxed">
              You have already completed your assessment. To retake the test, please contact your administrator for permission.
            </p>
            <button 
              onClick={() => navigate('/student')}
              className="w-full bg-[#141414] text-white py-4 font-bold uppercase tracking-widest hover:bg-emerald-600 transition-colors"
            >
              Back to Dashboard
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-[#141414] border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-emerald-400" />
              <span className="font-bold tracking-tighter text-xl">STUDENT PORTAL</span>
            </div>
            
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => navigate('/student')}
                className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-white/10"
              >
                <User className="w-3 h-3" />
                Dashboard
              </button>
              <button
                onClick={() => navigate('/student/test')}
                className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all bg-white text-[#141414]"
              >
                <BookOpen className="w-3 h-3" />
                Skill Test
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 mr-4 border-r border-white/10 pr-4">
              <div className="w-8 h-8 bg-emerald-400 text-[#141414] flex items-center justify-center font-bold text-xs">
                {user?.name?.charAt(0)}
              </div>
              <div className="text-right">
                <p className="text-xs font-bold">{user?.name}</p>
                <p className="text-[8px] uppercase tracking-widest text-white/40">ID: #{user?.id}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:text-red-400 transition-colors border border-white/10"
            >
              <LogOut className="w-3 h-3" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Test Header */}
      <header className="border-b border-white/10 p-4 flex justify-between items-center bg-[#141414]">
        <div className="flex items-center gap-3">
          <Brain className="text-emerald-400 w-6 h-6" />
          <h1 className="text-lg font-bold uppercase tracking-tighter">Skill Assessment Engine</h1>
        </div>
        {(currentStep === 'mcq' || currentStep === 'coding') && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 border border-white/10">
              <Timer className={`w-4 h-4 ${timeLeft < 5 ? 'text-red-400 animate-pulse' : 'text-white/60'}`} />
              <span className="font-mono font-bold text-xl">
                {currentStep === 'mcq' ? timeLeft : `${Math.floor(codingTimeLeft / 60)}:${(codingTimeLeft % 60).toString().padStart(2, '0')}`}
              </span>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {currentStep === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-2xl w-full bg-white text-[#141414] p-12 shadow-[12px_12px_0px_0px_rgba(16,185,129,1)]"
            >
              <h2 className="text-4xl font-bold uppercase tracking-tighter mb-6">Ready to begin?</h2>
              <div className="space-y-6 mb-10">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#141414] text-white flex items-center justify-center shrink-0 font-bold">01</div>
                  <div>
                    <p className="font-bold uppercase text-sm">MCQ Section</p>
                    <p className="text-sm text-[#141414]/60">15 seconds per question. No backward navigation allowed.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#141414] text-white flex items-center justify-center shrink-0 font-bold">02</div>
                  <div>
                    <p className="font-bold uppercase text-sm">Coding Section</p>
                    <p className="text-sm text-[#141414]/60">15 minutes to solve a problem. Evaluated against test cases.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-red-500 text-white flex items-center justify-center shrink-0 font-bold">!!</div>
                  <div>
                    <p className="font-bold uppercase text-sm text-red-600">Anti-Cheat Active</p>
                    <p className="text-sm text-[#141414]/60">Switching tabs or minimizing window will result in immediate disqualification.</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setCurrentStep('mcq')}
                className="w-full bg-[#141414] text-white py-5 font-bold uppercase tracking-widest hover:bg-emerald-600 transition-colors flex items-center justify-center gap-3"
              >
                Initialize Test Environment
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {currentStep === 'mcq' && (
            <motion.div 
              key="mcq"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-3xl w-full"
            >
              <div className="mb-8">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Question {currentQuestionIdx + 1} of {test.content.mcqs.length}</span>
                <h2 className="text-3xl font-bold mt-2">{test.content.mcqs[currentQuestionIdx].question}</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {test.content.mcqs[currentQuestionIdx].options.map((option: string) => (
                  <button
                    key={option}
                    onClick={() => {
                      setAnswers({ ...answers, [currentQuestionIdx]: option });
                      handleNextQuestion();
                    }}
                    className="group bg-white/5 border border-white/10 p-6 text-left hover:bg-white hover:text-[#141414] transition-all flex justify-between items-center"
                  >
                    <span className="font-bold">{option}</span>
                    <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 'coding' && (
            <motion.div 
              key="coding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 h-[70vh]"
            >
              <div className="bg-white text-[#141414] p-8 overflow-y-auto shadow-[8px_8px_0px_0px_rgba(16,185,129,1)]">
                <div className="flex items-center gap-2 mb-4 text-[#141414]/40">
                  <Terminal className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Problem Statement</span>
                </div>
                <h2 className="text-2xl font-bold mb-6">{test.content.coding[0].question}</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-[#141414]/40 mb-2">Test Cases</h3>
                    {test.content.coding[0].testCases.map((tc: any, i: number) => (
                      <div key={i} className="bg-[#F5F5F5] p-3 border border-[#141414]/10 mb-2 font-mono text-xs">
                        <p><span className="text-[#141414]/40">Input:</span> {tc.input}</p>
                        <p><span className="text-[#141414]/40">Expected:</span> {tc.expectedOutput}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex-1 bg-[#0A0A0A] border border-white/10 p-4 font-mono relative">
                  <div className="absolute top-4 right-4 flex items-center gap-2 text-[10px] text-white/40 uppercase">
                    <Code2 className="w-3 h-3" />
                    JavaScript
                  </div>
                  <textarea
                    className="w-full h-full bg-transparent outline-none resize-none text-emerald-400 leading-relaxed"
                    placeholder="// Write your code here..."
                    value={codingAnswer}
                    onChange={e => setCodingAnswer(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => submitFinalScore()}
                  className="bg-emerald-500 text-[#141414] py-4 font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors"
                >
                  Submit Assessment
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 'submitting' && (
            <motion.div 
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
              <h2 className="text-2xl font-bold uppercase tracking-tighter">Finalizing Assessment</h2>
              <p className="text-white/40 italic font-serif mt-2">Calculating scores and determining tier classification...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
