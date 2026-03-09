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
  const [currentCodingIdx, setCurrentCodingIdx] = useState(0);
  const [codingAnswers, setCodingAnswers] = useState<Record<number, string>>({});
  const [testResults, setTestResults] = useState<Record<number, any>>({});
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

  const runTestCases = async (code: string, testCases: any[]) => {
    try {
      const response = await fetch('/api/run-test-cases', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code, testCases })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.log('Test execution failed:', error);
      return { success: false, passedCount: 0, totalCount: testCases.length, score: 0, results: [] };
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
      
      // Calculate coding score
      for (let idx = 0; idx < test.content.coding.length; idx++) {
        const codingQ = test.content.coding[idx];
        const code = codingAnswers[idx] || '';
        if (code.trim()) {
          const testResult = await runTestCases(code, codingQ.testCases);
          score += testResult.score; // 2 for all pass, 1 for 2+ pass, 0 for less
        }
      }
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
                    <p className="text-sm text-[#141414]/60">15 minutes to solve 2 programming problems. Evaluated against test cases.</p>
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
              className="w-full max-w-7xl mx-auto"
            >
              {/* Navigation buttons at top right */}
              <div className="flex justify-end mb-4 gap-2">
                {currentCodingIdx > 0 && (
                  <button
                    onClick={() => setCurrentCodingIdx(prev => prev - 1)}
                    className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors rounded"
                  >
                    Previous Problem
                  </button>
                )}
                {currentCodingIdx < test.content.coding.length - 1 ? (
                  <button
                    onClick={() => setCurrentCodingIdx(prev => prev + 1)}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded"
                  >
                    Next Problem
                  </button>
                ) : (
                  <button
                    onClick={() => submitFinalScore()}
                    className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors rounded"
                  >
                    Submit Assessment
                  </button>
                )}
              </div>

              {/* LeetCode-style layout - Code Editor on Left, Problem on Right */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-0 min-h-[80vh]">
                {/* Code Editor - Left Side (Full Height) */}
                <div className="bg-gray-900 min-h-[80vh] flex flex-col">
                  {/* Editor Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">Solution</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">JavaScript</span>
                      <button
                        onClick={async () => {
                          const code = codingAnswers[currentCodingIdx] || '';
                          if (!code.trim()) return;

                          const result = await runTestCases(code, test.content.coding[currentCodingIdx].testCases);
                          setTestResults(prev => ({ ...prev, [currentCodingIdx]: result }));
                        }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                      >
                        Run Code
                      </button>
                    </div>
                  </div>

                  {/* Code Editor - Full Height */}
                  <div className="flex-1 relative">
                    <textarea
                      className="w-full h-full bg-gray-900 text-green-400 font-mono text-sm leading-6 p-4 outline-none resize-none border-0 focus:ring-0"
                      placeholder={`// ${currentCodingIdx === 0 ? 'Add two numbers and print the sum' : 'Subtract two numbers and print the result'}\n// Example:\n// let a = prompt("Enter first number");\n// let b = prompt("Enter second number");\n// let result = ${currentCodingIdx === 0 ? 'a + b' : 'a - b'};\n// console.log(result);`}
                      value={codingAnswers[currentCodingIdx] || ''}
                      onChange={e => setCodingAnswers({ ...codingAnswers, [currentCodingIdx]: e.target.value })}
                      spellCheck={false}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                    />
                  </div>
                </div>

                {/* Problem Description and Test Cases - Right Side */}
                <div className="bg-white border-l border-gray-200 flex flex-col min-h-[80vh]">
                  {/* Problem Header */}
                  <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {currentCodingIdx + 1}
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900">{test.content.coding[currentCodingIdx].question}</h2>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Easy</span>
                      <span>Accepted Rate: 85%</span>
                    </div>
                  </div>

                  {/* Problem Description */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="prose prose-sm max-w-none mb-6">
                      <p className="text-gray-700 mb-6">
                        {currentCodingIdx === 0
                          ? 'Write a program that gets two values from users, adds them, stores the result in a third variable, and prints the value of the sum.'
                          : 'Write a program that gets two values from users, subtracts them, stores the result in a third variable, and prints the value of the sum.'
                        }
                      </p>

                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Examples</h3>
                      {test.content.coding[currentCodingIdx].testCases.slice(0, 2).map((tc: any, i: number) => (
                        <div key={i} className="bg-gray-50 p-4 rounded-lg mb-4 font-mono text-sm">
                          <div className="text-gray-600 mb-2">Example {i + 1}:</div>
                          <div><span className="text-blue-600">Input:</span> {tc.input.replace('\n', ', ')}</div>
                          <div><span className="text-blue-600">Output:</span> {tc.expectedOutput}</div>
                        </div>
                      ))}

                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Note</h3>
                      <p className="text-gray-700 text-sm">
                        Use <code>prompt()</code> to get input from users and <code>console.log()</code> to print the result.
                      </p>
                    </div>

                    {/* Test Cases and Results */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Cases</h3>

                      {testResults[currentCodingIdx] ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium text-gray-700">
                                {testResults[currentCodingIdx].passedCount} / {testResults[currentCodingIdx].totalCount} test cases passed
                              </span>
                              <span className="text-sm font-medium text-blue-600">
                                Score: {testResults[currentCodingIdx].score} marks
                              </span>
                            </div>
                          </div>

                          {testResults[currentCodingIdx].results.map((result: any, i: number) => (
                            <div key={i} className={`p-3 rounded-lg border ${result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`w-4 h-4 rounded-full ${result.passed ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                <span className="text-sm font-medium">Test Case {i + 1}</span>
                                <span className={`text-xs px-2 py-1 rounded ${result.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {result.passed ? 'PASS' : 'FAIL'}
                                </span>
                              </div>
                              <div className="text-xs font-mono text-gray-600 space-y-1">
                                <div><span className="text-gray-500">Input:</span> {result.input}</div>
                                <div><span className="text-gray-500">Expected:</span> {result.expected}</div>
                                <div><span className="text-gray-500">Output:</span> {result.actual}</div>
                                {result.error && <div className="text-red-600">Error: {result.error}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {test.content.coding[currentCodingIdx].testCases.map((tc: any, i: number) => (
                            <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-4 h-4 rounded-full bg-gray-300"></span>
                                <span className="text-sm font-medium">Test Case {i + 1}</span>
                              </div>
                              <div className="text-xs font-mono text-gray-600 space-y-1">
                                <div><span className="text-gray-500">Input:</span> {tc.input}</div>
                                <div><span className="text-gray-500">Expected:</span> {tc.expectedOutput}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
