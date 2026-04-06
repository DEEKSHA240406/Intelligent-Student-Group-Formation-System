import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  LogOut, 
  BrainCircuit, 
  X,
  RefreshCw,
  Trash2,
  Edit2,
  Plus,
  AlertCircle,
  Zap,
  TrendingUp,
  BarChart3
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
  const [improveData, setImproveData] = useState<any>(null);
  const [algorithm, setAlgorithm] = useState('genetic');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '', email: '', password: 'password123', cgpa: '', department: 'CS', gender: 'Male'
  });
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [groupSize, setGroupSize] = useState(4);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/admin/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch students:', res.status);
        setStudents([]);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents([]);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch groups:', res.status);
        setGroups([]);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      setGroups([]);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchGroups();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/students', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(newStudent),
    });
    if (res.ok) {
      setNewStudent({ name: '', email: '', password: 'password123', cgpa: '', department: 'CS', gender: 'Male' });
      setShowAddForm(false);
      fetchStudents();
      alert('Student added successfully!');
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/admin/students/${editingStudent.id}`, {
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

  const handleDeleteStudent = async (studentId: number) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/students/${studentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      fetchStudents();
      fetchGroups();
      alert('Student deleted successfully!');
    }
  };

  const generateGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/generate-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ groupSize, method: algorithm }),
      });
      if (res.ok) {
        await fetchStudents();
        await fetchGroups();
        setCompareData(null);
        setImproveData(null);
      } else {
        alert('Failed to generate groups');
      }
    } finally {
      setLoading(false);
    }
  };

  const compareAlgorithms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/compare-grouping', {
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
      }
    } finally {
      setLoading(false);
    }
  };

  const improveGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/improve-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ groupSize, extraGenerations: 80 }),
      });
      if (res.ok) {
        const data = await res.json();
        setImproveData(data);
        await fetchGroups();
      }
    } finally {
      setLoading(false);
    }
  };

  const completedTests = students.filter(s => s.testStatus === 'Completed').length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
            <div className="bg-linear-to-br from-accent-purple to-accent-pink rounded-lg p-2">
                <BrainCircuit className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-bold tracking-wide text-gray-900">ADMIN PANEL</span>
            </div>
            
            <div className="hidden md:flex items-center gap-1 border-l border-gray-100 pl-8">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'students', label: 'Students', icon: Users },
                { id: 'groups', label: 'Groups', icon: TrendingUp },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-wide rounded-lg transition-colors ${
                    activeTab === item.id 
                      ? 'text-accent-purple bg-primary-50' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 border-r border-gray-100 pr-4 text-xs">
              <div className="text-right">
                <p className="text-gray-500 text-[11px]">Admin</p>
                <p className="font-semibold text-gray-900">{user?.name}</p>
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
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <AnimatePresence mode="wait">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Students', value: students.length, color: 'from-blue-500 to-blue-600' },
                  { label: 'Tests Completed', value: completedTests, color: 'from-green-500 to-green-600' },
                  { label: 'Groups Formed', value: groups.length, color: 'from-accent-purple to-accent-pink' },
                  { label: 'Pending Tests', value: students.length - completedTests, color: 'from-amber-500 to-amber-600' },
                ].map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`bg-gradient-to-br ${stat.color} rounded-lg p-6 text-white shadow-sm`}
                  >
                    <p className="text-xs font-bold tracking-wide opacity-90 mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-lg border border-gray-100 p-6 shadow-sm">
                  <h3 className="text-sm font-bold tracking-wide text-gray-700 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setShowAddForm(true);
                        setActiveTab('students');
                      }}
                      className="w-full flex items-center gap-3 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg p-3 transition-colors"
                    >
                      <UserPlus className="w-5 h-5 text-accent-purple" />
                      <span className="text-sm font-semibold text-gray-900">Add New Student</span>
                    </button>
                    <button
                      onClick={generateGroups}
                      disabled={loading}
                      className="w-full flex items-center gap-3 bg-linear-to-r from-accent-purple to-accent-pink text-white rounded-lg p-3 hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      <Zap className="w-5 h-5" />
                      <span className="text-sm font-semibold">{loading ? 'Generating...' : 'Generate Groups'}</span>
                    </button>
                  </div>
                </div>

                {/* System Status */}
                <div className="bg-white rounded-lg border border-gray-100 p-6 shadow-sm">
                  <h3 className="text-sm font-bold tracking-wide text-gray-700 mb-4">System Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Test Completion</span>
                      <span className="font-bold text-accent-purple">{Math.round((completedTests / Math.max(students.length, 1)) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-linear-to-r from-accent-purple to-accent-pink h-2 rounded-full transition-all"
                        style={{ width: `${(completedTests / Math.max(students.length, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <motion.div
              key="students"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Student Directory</h2>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-2 bg-linear-to-r from-accent-purple to-accent-pink text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Student
                </button>
              </div>

              {/* Add Form */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white rounded-lg border border-gray-100 p-6 shadow-sm"
                  >
                    <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="John Doe"
                          value={newStudent.name}
                          onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                        <input
                          type="email"
                          required
                          placeholder="john@example.com"
                          value={newStudent.email}
                          onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">CGPA</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="3.8"
                          value={newStudent.cgpa}
                          onChange={e => setNewStudent({...newStudent, cgpa: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                        <select
                          value={newStudent.department}
                          onChange={e => setNewStudent({...newStudent, department: e.target.value})}
                        >
                          <option value="CS">Computer Science</option>
                          <option value="IT">Information Tech</option>
                          <option value="ECE">Electronics</option>
                          <option value="MECH">Mechanical</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                        <select
                          value={newStudent.gender}
                          onChange={e => setNewStudent({...newStudent, gender: e.target.value})}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                        <input
                          type="text"
                          value={newStudent.password}
                          onChange={e => setNewStudent({...newStudent, password: e.target.value})}
                        />
                      </div>
                      <div className="md:col-span-2 flex gap-3">
                        <button
                          type="submit"
                          className="flex-1 bg-linear-to-r from-accent-purple to-accent-pink text-white font-semibold py-2 rounded-lg hover:shadow-lg transition-all"
                        >
                          Register Student
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="px-6 border border-gray-200 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Students Table */}
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold tracking-wide text-gray-600">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-bold tracking-wide text-gray-600">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-bold tracking-wide text-gray-600">Dept</th>
                        <th className="px-6 py-3 text-left text-xs font-bold tracking-wide text-gray-600">CGPA</th>
                        <th className="px-6 py-3 text-left text-xs font-bold tracking-wide text-gray-600">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-bold tracking-wide text-gray-600">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold tracking-wide text-gray-600">Tier</th>
                        <th className="px-6 py-3 text-center text-xs font-bold tracking-wide text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map(student => (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 font-semibold text-gray-900">{student.name}</td>
                          <td className="px-6 py-3 text-gray-600 text-xs">{student.email}</td>
                          <td className="px-6 py-3 text-gray-600">{student.department}</td>
                          <td className="px-6 py-3 font-semibold text-gray-900">{student.cgpa}</td>
                          <td className="px-6 py-3 font-bold text-accent-purple">{student.testScore}/40</td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                              student.testStatus === 'Completed' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {student.testStatus}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                              student.tier === 'Excellent' ? 'bg-purple-100 text-purple-700' :
                              student.tier === 'Good' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {student.tier}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => setEditingStudent(student)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-accent-purple"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student.id)}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* GROUPS TAB */}
          {activeTab === 'groups' && (
            <motion.div
              key="groups"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Group Formations</h2>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-700">Group Size:</label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={groupSize}
                    onChange={(e) => setGroupSize(parseInt(e.target.value) || 4)}
                    className="w-16"
                  />
                  <label className="text-sm font-semibold text-gray-700">Algorithm:</label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value)}
                  >
                    <option value="genetic">Genetic</option>
                    <option value="round_robin">Round Robin</option>
                    <option value="random">Random</option>
                  </select>
                  <button
                    onClick={generateGroups}
                    disabled={loading}
                    className="bg-linear-to-r from-accent-purple to-accent-pink text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate'}
                  </button>
                  {groups.length > 0 && (
                    <>
                      <button
                        onClick={compareAlgorithms}
                        disabled={loading}
                        className="bg-white border border-gray-200 px-4 py-2 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Compare
                      </button>
                      <button
                        onClick={improveGroups}
                        disabled={loading}
                        className="bg-white border border-gray-200 px-4 py-2 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Improve
                      </button>
                    </>
                  )}
                </div>
              </div>

              {groups.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {groups.map((group, idx) => (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-lg border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Group #{group.groupNumber}</h3>
                        <div className="flex gap-2">
                          <span className="bg-linear-to-r from-accent-purple to-accent-pink text-white text-xs font-bold px-3 py-1 rounded-full">
                            Score: {group.fairnessScore?.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 mb-4">
                        {group.members?.map((member: any) => (
                          <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.department} • {member.gender}</p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              member.tier === 'Excellent' ? 'bg-purple-100 text-purple-700' :
                              member.tier === 'Good' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {member.tier}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Avg CGPA</p>
                          <p className="font-bold text-accent-purple">{group.avgCgpa?.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Size</p>
                          <p className="font-bold text-accent-purple">{group.members?.length || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Diversity</p>
                          <p className="font-bold text-accent-purple">{group.diversityScore?.toFixed(0) || '0'}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-200">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-2">No groups generated yet</p>
                  <p className="text-gray-500 text-sm"> Generate groups using the button above</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg border border-gray-100 p-8 max-w-2xl w-full shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Edit Student</h3>
                <button
                  onClick={() => setEditingStudent(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateStudent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editingStudent.name}
                      onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      required
                      value={editingStudent.email}
                      onChange={e => setEditingStudent({...editingStudent, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">CGPA</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingStudent.cgpa}
                      onChange={e => setEditingStudent({...editingStudent, cgpa: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                    <select
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                    <select
                      value={editingStudent.gender}
                      onChange={e => setEditingStudent({...editingStudent, gender: e.target.value})}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                    <input
                      type="text"
                      placeholder="Leave blank to keep current"
                      onChange={e => setEditingStudent({...editingStudent, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    className="flex-1 bg-linear-to-r from-accent-purple to-accent-pink text-white font-semibold py-2 rounded-lg hover:shadow-lg transition-all"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-6 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                  >
                    Cancel
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
