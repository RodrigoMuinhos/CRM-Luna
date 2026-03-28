'use client';

import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Patients } from './components/Patients';
import { Appointments } from './components/Appointments';
import { Doctors } from './components/Doctors';
import { Calendar } from './components/Calendar';
import { Calendar as CalendarIcon, Users, UserCog, LayoutDashboard, Clock } from 'lucide-react';
import { BrandIcon } from './components/BrandIcon';
import { ConfigMenu } from '@/components/ConfigMenu';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'appointments', label: 'Consultas', icon: Clock },
    { id: 'calendar', label: 'Agenda', icon: CalendarIcon },
    { id: 'patients', label: 'Pacientes', icon: Users },
    { id: 'doctors', label: 'Médicos', icon: UserCog },
  ];

  return (
    <div className="flex h-screen bg-[#ECEDDE]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#CDDCDC]">
        <div className="p-6 border-b border-[#CDDCDC] flex items-center justify-center">
          <div className="rounded-full bg-white/80 p-2 shadow">
            <BrandIcon size={56} />
          </div>
        </div>
        <nav className="p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  activeTab === item.id
                    ? 'bg-[#D3A67F] text-white'
                    : 'text-gray-600 hover:bg-[#ECEDDE]'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-[#CDDCDC] px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="rounded-full bg-white/80 p-2 shadow">
                <BrandIcon size={48} />
              </div>
              <h1 className="text-gray-800 text-2xl font-semibold">
                {menuItems.find((item) => item.id === activeTab)?.label}
              </h1>
            </div>
            <ConfigMenu onLogout={() => {
              localStorage.removeItem('lv_token');
              localStorage.removeItem('lv_role');
              window.location.href = '/';
            }} />
          </div>
        </header>
        <div className="p-8">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'appointments' && <Appointments />}
          {activeTab === 'calendar' && <Calendar />}
          {activeTab === 'patients' && <Patients />}
          {activeTab === 'doctors' && <Doctors />}
        </div>
      </main>
    </div>
  );
}
