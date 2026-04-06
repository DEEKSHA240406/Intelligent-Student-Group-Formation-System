import React, { useState, useEffect } from 'react';
import { apiUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  BrainCircuit, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  BarChart3,
  Edit2,
  X,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function AdminDashboard() {
  const { user, logout, token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [compareData, setCompareData] = useState<any>(null);
  const [algorithm, setAlgorithm] = useState('genetic');
  const [newStudent, setNewStudent] = useState({
    name: '', email: '', password: 'password123', cgpa: '', department: '', gender: 'Male'
  });
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [groupSize, setGroupSize] = useState(4);

  const fetchStudents = async () => {
    const res = await fetch(apiUrl('/api/admin/students'), {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setStudents(data);
  };
  const fetchGroups = async () => {
    const res = await fetch(apiUrl('/api/groups'), {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setGroups(data);
  };
  useEffect(() => {
    fetchStudents();
    fetchGroups();
  }, [activeTab]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(apiUrl('/api/admin/students'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(newStudent),
    });
    if (res.ok) {
      setNewStudent({ name: '', email: '', password: 'password123', cgpa: '', department: '', gender: 'Male' });
      fetchStudents();
      alert('Student added successfully!');
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(apiUrl(`/api/admin/students/${editingStudent.id}`), {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(editingStudent),
    });
    if (res.ok) {
      setEditingStudent(null);
      fetchStudents();
      alert('Student updated successfully!');
    }
  };

  const handleAssignRetest = async (studentId: number) => {
    const res = await fetch(apiUrl(`/api/admin/students/${studentId}/assign-retest`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      fetchStudents();
      alert('Retest assigned successfully!');
    }
  };

  const handleDeleteStudent = async (studentId: number) => {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) return;
    const res = await fetch(apiUrl(`/api/admin/students/${studentId}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      fetchStudents();
      fetchGroups();
      alert('Student deleted successfully!');
    } else {
      alert('Failed to delete student');
    }
  };

  const compareAlgorithms = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/admin/compare-grouping'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ groupSize }),
      });
      if (res.ok) {
        const data = await res.json();
        setCompareData(data);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to compare algorithms');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/admin/generate-groups'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ groupSize, method: algorithm }),
      });
      if (res.ok) {
        setActiveTab('groups');
        await fetchStudents();
        await fetchGroups();
        setCompareData(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to generate groups');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex flex-col font-sans">
      {/* Top Navbar */}
      <nav className="bg-[#141414] text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tighter text-xl">Group Formation</span>
            </div>
            
            <div className="hidden md:flex items-center gap-1">
              {[
                { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
                { id: 'students', icon: Users, label: 'Students' },
                { id: 'add', icon: UserPlus, label: 'Add Student' },
                { id: 'groups', icon: BarChart3, label: 'Groups' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    activeTab === item.id ? 'bg-white text-[#141414]' : 'hover:bg-white/10'
                  }`}
                >
                  <item.icon className="w-3 h-3" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right mr-4">
              <p className="text-[10px] uppercase tracking-widest text-white/40">Admin</p>
              <p className="text-xs font-bold">{user?.name}</p>
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

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <header className="flex justify-between items-end mb-8 border-b border-[#141414] pb-4">
          <div>
            <h2 className="text-3xl font-bold uppercase tracking-tighter text-[#141414]">
              {activeTab === 'overview' && 'System Overview'}
              {activeTab === 'students' && 'Student Directory'}
              {activeTab === 'add' && 'Enroll New Student'}
              {activeTab === 'groups' && 'Optimized Formations'}
            </h2>
            <p className="text-sm italic font-serif text-[#141414]/60">
              Welcome back, {user?.name}
            </p>
          </div>
          {(activeTab === 'students' || activeTab === 'groups') && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold uppercase tracking-widest text-[#141414]">Group Size:</label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={groupSize}
                  onChange={(e) => setGroupSize(parseInt(e.target.value) || 4)}
                  className="w-16 px-2 py-1 border border-[#141414] bg-white text-center font-bold"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold uppercase tracking-widest text-[#141414]">Method:</label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  className="px-2 py-1 border border-[#141414] bg-white"
                >
                  <option value="genetic">Genetic</option>
                  <option value="round_robin">Round Robin</option>
                  <option value="random">Random</option>
                </select>
              </div>
              <button 
                onClick={generateGroups}
                disabled={loading}
                className="bg-[#141414] text-white px-6 py-3 font-bold uppercase tracking-widest hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Processing...' : 'Generate Groups'}
                <BrainCircuit className="w-4 h-4" />
              </button>

              {activeTab === 'groups' && (
                <>
                  <button
                    onClick={compareAlgorithms}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 font-bold uppercase tracking-widest hover:bg-blue-500 transition-colors disabled:opacity-50"
                  >
                    Compare Methods
                  </button>
                </>
              )}
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <div className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                <div className="flex justify-between items-start mb-4">
                  <Users className="w-8 h-8 text-[#141414]/20" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Total Students</span>
                </div>
                <div className="text-4xl font-bold font-mono">{students.length}</div>
              </div>
              <div className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                <div className="flex justify-between items-start mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/20" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Tests Completed</span>
                </div>
                <div className="text-4xl font-bold font-mono">{students.filter(s => s.testStatus === 'Completed').length}</div>
              </div>
              <div className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                <div className="flex justify-between items-start mb-4">
                  <TrendingUp className="w-8 h-8 text-blue-500/20" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Groups Formed</span>
                </div>
                <div className="text-4xl font-bold font-mono">{groups.length}</div>
              </div>
            </motion.div>
          )}

          {activeTab === 'students' && (
            <motion.div 
              key="students"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-[#141414] overflow-hidden"
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#141414] text-white text-[10px] uppercase tracking-widest">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email (Login ID)</th>
                    <th className="p-4">Dept</th>
                    <th className="p-4">CGPA</th>
                    <th className="p-4">Marks</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Tier</th>
                    <th className="p-4">Group</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-[#141414]/10 hover:bg-[#F5F5F5] transition-colors">
                      <td className="p-4 font-bold">{s.name}</td>
                      <td className="p-4 text-[#141414]/60">{s.email}</td>
                      <td className="p-4 font-mono">{s.department}</td>
                      <td className="p-4 font-mono">{s.cgpa}</td>
                      <td className="p-4 font-mono font-bold text-blue-600">{s.testScore}/40</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase ${
                          s.testStatus === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {s.testStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase ${
                          s.tier === 'Excellent' ? 'bg-purple-100 text-purple-700' : 
                          s.tier === 'Good' ? 'bg-blue-100 text-blue-700' : 
                          s.tier === 'Low' ? 'bg-gray-100 text-gray-700' : 'bg-transparent'
                        }`}>
                          {s.tier}
                        </span>
                      </td>
                      <td className="p-4 font-mono">
                        {s.groupId ? `Group #${groups.find(g => g.id === s.groupId)?.groupNumber || 'N/A'}` : 'N/A'}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setEditingStudent(s)}
                            className="p-2 hover:bg-[#141414] hover:text-white transition-colors"
                            title="Edit Student"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {s.testStatus === 'Completed' && (
                            <button 
                              onClick={() => handleAssignRetest(s.id)}
                              className="p-2 hover:bg-emerald-600 hover:text-white transition-colors text-emerald-600"
                              title="Assign Retest"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteStudent(s.id)}
                            className="p-2 hover:bg-red-600 hover:text-white transition-colors text-red-600"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
          {activeTab === 'add' && (
            <motion.div 
              key="add"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-2xl bg-white border border-[#141414] p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]"
            >
              <form onSubmit={handleAddStudent} className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#141414]/60 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 focus:outline-none"
                    value={newStudent.name}
                    onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#141414]/60 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 focus:outline-none"
                    value={newStudent.email}
                    onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#141414]/60 mb-2">CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 focus:outline-none"
                    value={newStudent.cgpa}
                    onChange={e => setNewStudent({...newStudent, cgpa: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#141414]/60 mb-2">Department</label>
                  <select
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 focus:outline-none"
                    value={newStudent.department}
                    onChange={e => setNewStudent({...newStudent, department: e.target.value})}
                  >
                    <option value="">Select Dept</option>
                    <option value="CS">Computer Science</option>
                    <option value="IT">Information Tech</option>
                    <option value="ECE">Electronics</option>
                    <option value="MECH">Mechanical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#141414]/60 mb-2">Gender</label>
                  <select
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 focus:outline-none"
                    value={newStudent.gender}
                    onChange={e => setNewStudent({...newStudent, gender: e.target.value})}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#141414]/60 mb-2">Initial Password</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 focus:outline-none"
                    value={newStudent.password}
                    onChange={e => setNewStudent({...newStudent, password: e.target.value})}
                  />
                </div>
                <div className="col-span-2 pt-4">
                  <button type="submit" className="w-full bg-[#141414] text-white py-4 font-bold uppercase tracking-widest hover:bg-emerald-600 transition-colors">
                    Register Student
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'groups' && (
            <div className="space-y-8">
              {/* Metrics Panel */}
              <div className="bg-[#141414] text-white p-8 shadow-[8px_8px_0px_0px_rgba(16,185,129,1)]">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="text-emerald-400 w-6 h-6" />
                  <h3 className="text-xl font-bold uppercase tracking-tighter">System Fairness Metrics</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Overall AI Fitness</p>
                    <p className="text-3xl font-bold font-mono">
                      {groups.length > 0 ? (groups.reduce((acc, g) => acc + (g.fairnessScore ?? 0), 0) / groups.length).toFixed(1) : '0.0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">CGPA Variance</p>
                    <p className="text-3xl font-bold font-mono text-emerald-400">LOW</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Diversity Index</p>
                    <p className="text-3xl font-bold font-mono text-blue-400">HIGH</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Tier Balance</p>
                    <p className="text-3xl font-bold font-mono text-purple-400">OPTIMIZED</p>
                  </div>
                </div>

                {compareData && compareData.comparisons && (
                  <div className="mt-8 bg-white text-black p-6 rounded-lg">
                    <h4 className="text-lg font-bold mb-4">Method Comparison ⏱</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(compareData.comparisons || []).map((comparison: any) => (
                        <div key={comparison.method} className="p-4 border border-slate-300 rounded-lg">
                          <h5 className="font-bold uppercase mb-2">{comparison.method.replace('_', ' ')}</h5>
                          <p className="text-sm">Avg Fitness: {comparison.stats.averageFitness?.toFixed(1) ?? 'N/A'}</p>
                          <p className="text-sm">Total Fitness: {comparison.stats.totalFitness?.toFixed(1) ?? 'N/A'}</p>
                          <p className="text-sm">Dur: {comparison.stats.durationSeconds?.toFixed(2)}s</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(compareData.comparisons || []).map((c:any)=>({method:c.method, avg:c.stats.averageFitness ??0}))}>
                          <XAxis dataKey="method" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="avg" fill="#0f766e" name="Avg Fitness" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}


              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {groups.map((group) => (
                <div key={group.id} className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                  <div className="flex justify-between items-center mb-6 border-b border-[#141414] pb-2">
                    <h3 className="text-xl font-bold uppercase tracking-tighter">Group #{group.groupNumber}</h3>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-1">Score: {group.fairnessScore.toFixed(2)}</span>
                      <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-2 py-1">Avg CGPA: {group.avgCgpa.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    {group.members.map((member: any) => (
                      <div key={member.id} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#141414] text-white flex items-center justify-center text-[10px] font-bold">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold">{member.name}</p>
                            <p className="text-[10px] uppercase text-[#141414]/40">{member.department} • {member.gender}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 ${
                          member.tier === 'Excellent' ? 'text-purple-600' : 
                          member.tier === 'Good' ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {member.tier}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#141414]/10">
                    <div className="text-center">
                      <p className="text-[8px] uppercase font-bold text-[#141414]/40">Excellent</p>
                      <p className="font-mono font-bold">{group.excellentCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] uppercase font-bold text-[#141414]/40">Good</p>
                      <p className="font-mono font-bold">{group.goodCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] uppercase font-bold text-[#141414]/40">Low</p>
                      <p className="font-mono font-bold">{group.lowCount}</p>
                    </div>
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <div className="col-span-2 flex flex-col items-center justify-center py-20 bg-white border border-dashed border-[#141414]/40">
                  <AlertCircle className="w-12 h-12 text-[#141414]/20 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest text-[#141414]/40">No groups generated yet</p>
                  <button 
                    onClick={generateGroups}
                    className="mt-4 text-[10px] font-bold uppercase tracking-widest underline hover:text-emerald-600"
                  >
                    Run Genetic Algorithm Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#141414] p-8 shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] max-w-2xl w-full"
            >
              <div className="flex justify-between items-center mb-8 border-b border-[#141414] pb-4">
                <h3 className="text-2xl font-bold uppercase tracking-tighter">Edit Student Details</h3>
                <button onClick={() => setEditingStudent(null)} className="p-2 hover:bg-[#141414] hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateStudent} className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#141414]/60 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 focus:outline-none"
                    value={editingStudent.name}
                    onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#141414]/60 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 focus:outline-none"
                    value={editingStudent.email}
                    onChange={e => setEditingStudent({...editingStudent, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#141414]/60 mb-2">CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 focus:outline-none"
                    value={editingStudent.cgpa}
                    onChange={e => setEditingStudent({...editingStudent, cgpa: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#141414]/60 mb-2">Department</label>
                  <select
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 focus:outline-none"
                    value={editingStudent.department}
                    onChange={e => setEditingStudent({...editingStudent, department: e.target.value})}
                  >
                    <option value="CS">Computer Science</option>
                    <option value="IT">Information Tech</option>
                    <option value="ECE">Electronics</option>
                    <option value="MECH">Mechanical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#141414]/60 mb-2">Gender</label>
                  <select
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 focus:outline-none"
                    value={editingStudent.gender}
                    onChange={e => setEditingStudent({...editingStudent, gender: e.target.value})}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#141414]/60 mb-2">Update Password (Optional)</label>
                  <input
                    type="text"
                    className="w-full bg-[#F5F5F5] border border-[#141414] p-3 focus:outline-none"
                    placeholder="Leave blank to keep current"
                    onChange={e => setEditingStudent({...editingStudent, password: e.target.value})}
                  />
                </div>
                <div className="col-span-2 pt-4">
                  <button type="submit" className="w-full bg-[#141414] text-white py-4 font-bold uppercase tracking-widest hover:bg-emerald-600 transition-colors">
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
