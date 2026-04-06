import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  LogOut, 
  BookOpen,
  Zap,
  Mail,
  GraduationCap,
  BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { user, logout, token } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const navigate = useNavigate();

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/student/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        console.error('Failed to fetch profile:', res.status);
        return;
      }
      const data = await res.json();
      setProfile(data);
      
      if (data.groupId) {
        const gRes = await fetch('/api/groups', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (gRes.ok) {
          const groups = await gRes.json();
          const myGroup = groups.find((g: any) => g.id === data.groupId);
          setGroup(myGroup);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (!profile) return null;

  const testStatus = profile.testStatus === 'Completed';
  const testScore = profile.testScore || 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="bg-linear-to-br from-accent-purple to-accent-pink rounded-lg p-2">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-bold tracking-wide text-gray-900">STUDENT PORTAL</span>
            </div>
            
            <div className="hidden md:flex items-center gap-1 border-l border-gray-100 pl-8">
              <button
                onClick={() => navigate('/student')}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-wide text-accent-purple rounded-lg hover:bg-primary-50 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => navigate('/student/test')}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-wide text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Skill Test
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 border-r border-gray-100 pr-4">
              <div className="w-9 h-9 bg-linear-to-br from-accent-purple to-accent-pink text-white flex items-center justify-center font-bold text-sm rounded-full">
                {profile.name.charAt(0)}
              </div>
              <div className="text-right text-xs">
                <p className="font-semibold text-gray-900">{profile.name}</p>
                <p className="text-gray-500">ID #{profile.id}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold tracking-wide text-gray-600 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Profile & Status */}
          <div className="space-y-4">
            {/* Academic Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xs font-bold tracking-wide text-gray-500 mb-4 uppercase">Academic Profile</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">CGPA</span>
                  <span className="font-bold text-lg text-accent-purple">{profile.cgpa}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Department</span>
                  <span className="text-sm font-semibold text-gray-900">{profile.department}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gender</span>
                  <span className="text-sm font-semibold text-gray-900">{profile.gender}</span>
                </div>
              </div>
            </motion.div>

            {/* Performance Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`rounded-lg border p-6 shadow-sm text-white ${
                profile.tier === 'Excellent' ? 'bg-linear-to-br from-green-500 to-emerald-600 border-green-600' :
                profile.tier === 'Good' ? 'bg-linear-to-br from-blue-500 to-cyan-600 border-blue-600' :
                profile.tier === 'Low' ? 'bg-linear-to-br from-orange-500 to-red-600 border-orange-600' :
                'bg-linear-to-br from-purple-500 to-pink-600 border-purple-600'
              }`}
            >
              <p className="text-xs font-bold tracking-wide mb-2 opacity-90">PERFORMANCE TIER</p>
              <p className="text-2xl font-bold">{profile.tier}</p>
            </motion.div>

            {/* Test Status */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg border border-gray-100 p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${testStatus ? 'bg-green-500' : 'bg-orange-500'}`} />
                <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">Skill Test</p>
              </div>
              <p className={`font-bold text-lg ${testStatus ? 'text-green-600' : 'text-orange-600'}`}>
                {testStatus ? 'Completed' : 'Pending'}
              </p>
              {testStatus && (
                <p className="text-sm text-gray-600 mt-2">
                  Score: <span className="font-bold text-accent-purple">{testScore}/40</span>
                </p>
              )}
              {!testStatus && (
                <button
                  onClick={() => navigate('/student/test')}
                className="mt-4 w-full bg-linear-to-r from-accent-purple to-accent-pink text-white text-xs font-bold py-2 rounded-lg hover:shadow-lg transition-shadow"
                >
                  Start Test Now
                </button>
              )}
            </motion.div>
          </div>

          {/* Right Content - Group Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-white rounded-lg border border-gray-100 p-8 shadow-sm"
          >
            {group ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Group #{group.groupNumber}</h2>
                    <p className="text-sm text-gray-500">Your AI-optimized collaborative team</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">GROUP STATS</p>
                    <p className="text-2xl font-bold text-accent-purple">{group.members?.length || 4}</p>
                    <p className="text-xs text-gray-500">Members</p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-linear-to-br from-primary-50 to-primary-100 rounded-lg p-4 border border-primary-200">
                    <p className="text-xs text-gray-600 font-bold mb-1">AVG CGPA</p>
                    <p className="text-xl font-bold text-accent-purple">{group.avgCgpa?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <p className="text-xs text-gray-600 font-bold mb-1">FAIRNESS</p>
                    <p className="text-xl font-bold text-blue-600">{group.fairnessScore?.toFixed(0) || '0'}</p>
                  </div>
                  <div className="bg-linear-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
                    <p className="text-xs text-gray-600 font-bold mb-1">DIVERSITY</p>
                    <p className="text-xl font-bold text-emerald-600">{group.diversityScore?.toFixed(0) || '0'}</p>
                  </div>
                </div>

                {/* Team Members */}
                <div>
                  <h3 className="text-sm font-bold tracking-wide text-gray-700 mb-4">TEAM MEMBERS</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.members?.map((member: any) => (
                      <div 
                        key={member.id} 
                        className={`p-4 rounded-lg border transition-all ${
                          member.id === profile.id 
                            ? 'bg-primary-50 border-accent-purple' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                            member.id === profile.id
                              ? 'bg-linear-to-br from-accent-purple to-accent-pink'
                              : 'bg-gray-300'
                          }`}>
                            {member.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {member.name} {member.id === profile.id && <span className="text-accent-pink">(You)</span>}
                            </p>
                            <p className="text-xs text-gray-500">
                              <span className="font-medium">{member.department}</span> • <span>{member.tier}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Group Assigned Yet</h3>
                <p className="text-gray-600">
                  Groups will be formed once all students complete the skill test.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
