import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  BookOpen, 
  Users, 
  LogOut, 
  Trophy, 
  Calendar, 
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { user, logout, token } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const navigate = useNavigate();

  const fetchProfile = async () => {
    const res = await fetch('/api/student/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setProfile(data);
    
    if (data.groupId) {
      const gRes = await fetch('/api/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const groups = await gRes.json();
      const myGroup = groups.find((g: any) => g.id === data.groupId);
      setGroup(myGroup);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-[#E4E3E0] font-sans flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-[#141414] text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-emerald-400" />
              <span className="font-bold tracking-tighter text-xl">STUDENT PORTAL</span>
            </div>
            
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => navigate('/student')}
                className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all bg-white text-[#141414]"
              >
                <User className="w-3 h-3" />
                Dashboard
              </button>
              <button
                onClick={() => navigate('/student/test')}
                className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-white/10"
              >
                <BookOpen className="w-3 h-3" />
                Skill Test
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 mr-4 border-r border-white/10 pr-4">
              <div className="w-8 h-8 bg-emerald-400 text-[#141414] flex items-center justify-center font-bold text-xs">
                {profile.name.charAt(0)}
              </div>
              <div className="text-right">
                <p className="text-xs font-bold">{profile.name}</p>
                <p className="text-[8px] uppercase tracking-widest text-white/40">ID: #{profile.id}</p>
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

      <main className="max-w-7xl mx-auto p-8 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stats & Profile */}
          <div className="space-y-8">
            <section className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#141414]/40 mb-6 border-b border-[#141414]/10 pb-2">Academic Profile</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#141414]/60">CGPA</span>
                  <span className="font-mono font-bold text-lg">{profile.cgpa}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#141414]/60">Gender</span>
                  <span className="font-bold">{profile.gender}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#141414]/60">Tier Status</span>
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase ${
                    profile.tier === 'Excellent' ? 'bg-purple-100 text-purple-700' : 
                    profile.tier === 'Good' ? 'bg-blue-100 text-blue-700' : 
                    profile.tier === 'Low' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {profile.tier}
                  </span>
                </div>
              </div>
            </section>

            <section className="bg-[#141414] text-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-6 border-b border-white/10 pb-2">Skill Assessment</h2>
              {profile.testStatus === 'Completed' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-400 w-5 h-5" />
                    <div>
                      <p className="text-sm font-bold">Test Completed</p>
                      <p className="text-[10px] text-white/40 uppercase">Score: {profile.testScore}/40 marks</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-amber-400 w-5 h-5" />
                    <div>
                      <p className="text-sm font-bold">Test Pending</p>
                      <p className="text-[10px] text-white/40 uppercase">Action Required</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/60 italic">Please navigate to the "Skill Test" page from the top navbar to begin your assessment.</p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Group Info */}
          <div className="lg:col-span-2">
            <section className="bg-white border border-[#141414] p-8 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] h-full">
              <div className="flex justify-between items-center mb-8 border-b border-[#141414] pb-4">
                <div>
                  <h2 className="text-2xl font-bold uppercase tracking-tighter">Your Collaborative Group</h2>
                  <p className="text-xs italic font-serif text-[#141414]/60">AI-Optimized Team Formation</p>
                </div>
                {group && (
                  <div className="bg-[#141414] text-white px-4 py-2 text-xl font-bold font-mono">
                    #{group.groupNumber}
                  </div>
                )}
              </div>

              {group ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[#F5F5F5] p-4 border border-[#141414]/10">
                      <p className="text-[8px] uppercase font-bold text-[#141414]/40 mb-1">Avg CGPA</p>
                      <p className="text-xl font-bold font-mono">{group.avgCgpa.toFixed(2)}</p>
                    </div>
                    <div className="bg-[#F5F5F5] p-4 border border-[#141414]/10">
                      <p className="text-[8px] uppercase font-bold text-[#141414]/40 mb-1">Fairness Score</p>
                      <p className="text-xl font-bold font-mono">{group.fairnessScore.toFixed(0)}</p>
                    </div>
                    <div className="bg-[#F5F5F5] p-4 border border-[#141414]/10">
                      <p className="text-[8px] uppercase font-bold text-[#141414]/40 mb-1">Members</p>
                      <p className="text-xl font-bold font-mono">4</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 mb-4">Team Members</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {group.members.map((member: any) => (
                        <div key={member.id} className={`p-4 border border-[#141414]/10 flex items-center gap-3 ${member.id === profile.id ? 'bg-emerald-50 border-emerald-200' : 'bg-[#F5F5F5]'}`}>
                          <div className="w-8 h-8 bg-[#141414] text-white flex items-center justify-center text-[10px] font-bold">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{member.name} {member.id === profile.id && '(You)'}</p>
                            <p className="text-[10px] uppercase text-[#141414]/40">{member.department} • {member.tier}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-[#141414]/10">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Optimized for Diversity & Performance</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Users className="w-16 h-16 text-[#141414]/10 mb-4" />
                  <h3 className="text-lg font-bold uppercase tracking-tight mb-2">Group Formation in Progress</h3>
                  <p className="text-sm text-[#141414]/60 max-w-md mx-auto">
                    The AI is currently analyzing all student assessments to create the most balanced and fair groups possible. You will be notified once your group is assigned.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
