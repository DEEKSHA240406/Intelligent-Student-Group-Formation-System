import React, { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Timer, 
  AlertTriangle, 
  CheckCircle2, 
  Code2,
  LogOut,
  Zap,
  BarChart3,
  Users,
  ChevronDown,
  ChevronUp,
  Play,
  Copy,
  Check,
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
  const [currentCodingIdx, setCurrentCodingIdx] = useState(0);
  const [codingAnswers, setCodingAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(15);
  const [codingTimeLeft, setCodingTimeLeft] = useState(900);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(apiUrl('/api/student/profile'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        } else {
          console.error('Failed to fetch profile:', res.status);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    fetchProfile();

    const fetchTest = async () => {
      try {
        const res = await fetch(apiUrl('/api/admin/test'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTest(data);
        } else {
          console.error('Failed to fetch test:', res.status);
        }
      } catch (err) {
        console.error('Error fetching test:', err);
      }
    };
    fetchTest();

    const handleVisibilityChange = () => {
      if (document.hidden && currentStep !== 'intro' && currentStep !== 'submitting') {
        alert('Tab switching detected! Test will be submitted.');
        submitFinalScore(0);
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
    
    if (forcedScore === undefined && test) {
      test.content.mcqs.forEach((q: any, idx: number) => {
        if (answers[idx] === q.correctAnswer) score += q.marks;
      });
    }

    try {
      const res = await fetch(apiUrl('/api/student/submit-test'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ score }),
      });
      if (!res.ok) {
        console.error('Failed to submit test:', res.status);
      }
    } catch (err) {
      console.error('Error submitting test:', err);
    } finally {
      navigate('/student');
    }
  };

  if (!test || !profile) return null;

  if (profile.testStatus === 'Completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Top Navigation */}
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="bg-linear-to-br from-accent-purple to-accent-pink rounded-lg p-2">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-bold tracking-wide text-gray-900">SKILL TEST</span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold tracking-wide text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </nav>

        <main className="flex-1 flex items-center justify-center p-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-white rounded-lg border border-gray-100 p-8 text-center shadow-sm"
          >
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Test Completed</h2>
            <p className="text-gray-600 mb-6">
              You have already completed your assessment. Contact your administrator to retake the test.
            </p>
            <button 
              onClick={() => navigate('/student')}
              className="w-full bg-linear-to-r from-accent-purple to-accent-pink text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Back to Dashboard
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  const mcqProgress = ((currentQuestionIdx) / test.content.mcqs.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="bg-linear-to-br from-accent-purple to-accent-pink rounded-lg p-2">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-bold tracking-wide text-gray-900">SKILL ASSESSMENT</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm ${
              currentStep === 'coding' && codingTimeLeft < 120
                ? 'bg-red-100 text-red-700'
                : 'bg-primary-50 text-accent-purple'
            }`}>
              <Timer className="w-4 h-4" />
              <span>
                {currentStep === 'mcq' ? `${timeLeft}s` : `${Math.floor(codingTimeLeft / 60)}:${String(codingTimeLeft % 60).padStart(2, '0')}`}
              </span>
            </div>
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold tracking-wide text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {currentStep === 'intro' && (
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex items-center justify-center p-8"
        >
          <div className="max-w-2xl w-full bg-white rounded-lg border border-gray-100 p-8 shadow-sm">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Skill Assessment Test</h1>
              <p className="text-gray-600">Evaluate your coding and problem-solving abilities</p>
            </div>

            <div className="space-y-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-2">📝 MCQ Round</h3>
                <p className="text-blue-800 text-sm">
                  {test.content.mcqs.length} questions • 15 seconds per question • {test.content.mcqs.reduce((acc: number, q: any) => acc + q.marks, 0)} total marks
                </p>
              </div>

              <div className="bg-linear-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-purple-900 mb-2">💻 Coding Round</h3>
                <p className="text-purple-800 text-sm">
                  {test.content.coding.length} problems • 15 minutes total • Score based on test cases
                </p>
              </div>

              <div className="bg-linear-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-amber-900 mb-2">⚠️ Important Rules</h3>
                <ul className="text-amber-800 text-sm space-y-1">
                  <li>• Tab switching will auto-submit your test</li>
                  <li>• You cannot go back to previous questions</li>
                  <li>• Answers are auto-saved</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep('mcq')}
              className="w-full bg-linear-to-r from-accent-purple to-accent-pink text-white py-3 rounded-lg font-bold hover:shadow-lg transition-all"
            >
              Start Test
            </button>
          </div>
        </motion.main>
      )}

      {currentStep === 'mcq' && test.content.mcqs[currentQuestionIdx] && (
        <motion.main
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 max-w-4xl mx-auto w-full px-6 py-8"
        >
          <div className="bg-white rounded-lg border border-gray-100 p-8 shadow-sm">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-gray-700">Question {currentQuestionIdx + 1} of {test.content.mcqs.length}</p>
                <p className="text-sm font-semibold text-accent-purple">{test.content.mcqs[currentQuestionIdx].marks} points</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-linear-to-r from-accent-purple to-accent-pink h-2 rounded-full transition-all"
                  style={{ width: `${mcqProgress}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {test.content.mcqs[currentQuestionIdx].question}
              </h2>

              <div className="space-y-3">
                {test.content.mcqs[currentQuestionIdx].options.map((option: string, idx: number) => (
                  <label
                    key={idx}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      answers[currentQuestionIdx] === option
                        ? 'border-accent-purple bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="option"
                      value={option}
                      checked={answers[currentQuestionIdx] === option}
                      onChange={(e) => setAnswers({...answers, [currentQuestionIdx]: e.target.value})}
                      className="w-5 h-5"
                    />
                    <span className="ml-4 font-medium text-gray-900">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-end gap-3 pt-8 border-t border-gray-100">
              <button
                onClick={handleNextQuestion}
                className="bg-linear-to-r from-accent-purple to-accent-pink text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                {currentQuestionIdx === test.content.mcqs.length - 1 ? 'Next Section' : 'Next Question'}
              </button>
            </div>
          </div>
        </motion.main>
      )}

      {currentStep === 'coding' && (
        <motion.main
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 max-w-6xl mx-auto w-full px-6 py-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Problem Statement */}
            <div className="bg-white rounded-lg border border-gray-100 p-6 shadow-sm overflow-y-auto max-h-[calc(100vh-100px)]">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-bold text-gray-900">Problem {currentCodingIdx + 1}</h2>
                  <span className="text-xs font-bold bg-primary-50 text-accent-purple px-3 py-1 rounded-full">
                    {currentCodingIdx + 1} of {test.content.coding.length}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">{test.content.coding[currentCodingIdx].title}</h3>
                  <p className="text-gray-600 text-sm">{test.content.coding[currentCodingIdx].description}</p>
                </div>

                {test.content.coding[currentCodingIdx].examples && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="font-semibold text-gray-900 mb-2">Example:</p>
                    <pre className="text-xs text-gray-700 overflow-x-auto">
                      {test.content.coding[currentCodingIdx].examples}
                    </pre>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100">
                <button
                  onClick={() => {
                    if (currentCodingIdx < test.content.coding.length - 1) {
                      setCurrentCodingIdx(prev => prev + 1);
                    } else {
                      submitFinalScore();
                    }
                  }}
                  className="w-full bg-linear-to-r from-accent-purple to-accent-pink text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  {currentCodingIdx === test.content.coding.length - 1 ? 'Submit Test' : 'Next Problem'}
                </button>
              </div>
            </div>

            {/* Code Editor */}
            <div className="bg-white rounded-lg border border-gray-100 p-6 shadow-sm flex flex-col">
              <h3 className="font-bold text-gray-900 mb-4">Write Your Code</h3>
              <textarea
                value={codingAnswers[currentCodingIdx] || ''}
                onChange={(e) => setCodingAnswers({...codingAnswers, [currentCodingIdx]: e.target.value})}
                placeholder="def solve():\n    pass"
                className="flex-1 font-mono text-sm p-4 mb-4"
              />
              <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2 justify-center">
                <Play className="w-4 h-4" />
                Run Code
              </button>
            </div>
          </div>
        </motion.main>
      )}

      {currentStep === 'submitting' && (
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex items-center justify-center p-8"
        >
          <div className="text-center">
            <div className="animate-spin mb-6">
              <Zap className="w-12 h-12 text-accent-purple mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Submitting Your Test</h2>
            <p className="text-gray-600">Your responses are being evaluated...</p>
          </div>
        </motion.main>
      )}
    </div>
  );
}
