import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Globe2, 
  MessageSquare, 
  Settings, 
  LogOut,
  Bell,
  Search
} from 'lucide-react';

export default function DashboardLayout({ children, currentPage, onNavigate, onLogout, searchQuery = '', onSearchChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [headerSearch, setHeaderSearch] = useState(searchQuery);

  useEffect(() => {
    setHeaderSearch(searchQuery);
  }, [searchQuery]);

  const handleHeaderSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearchChange) {
      onSearchChange(headerSearch);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'buyers', label: 'Buyer Discovery', icon: Users },
    { id: 'markets', label: 'Market Intelligence', icon: Globe2 },
    { id: 'copilot', label: 'AI Copilot', icon: MessageSquare },
  ];

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <aside className={`bg-white border-r border-[#E2E8F0] flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded bg-[#2563EB] flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            {sidebarOpen && <span className="font-bold text-[#0F172A] whitespace-nowrap">GlobeX AI</span>}
          </div>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-2 mt-2">
            {sidebarOpen ? 'Main Menu' : '•••'}
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={!sidebarOpen ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full ${
                  isActive 
                    ? 'bg-[#EFF6FF] text-[#2563EB] font-medium' 
                    : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-[#2563EB]' : 'text-[#94A3B8]'} />
                {sidebarOpen && <span className="text-sm whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E2E8F0]">
          <button 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors w-full mb-1"
            title={!sidebarOpen ? 'Settings' : undefined}
          >
            <Settings size={18} className="text-[#94A3B8]" />
            {sidebarOpen && <span className="text-sm whitespace-nowrap">Settings</span>}
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] transition-colors w-full"
            title={!sidebarOpen ? 'Logout' : undefined}
          >
            <LogOut size={18} />
            {sidebarOpen && <span className="text-sm whitespace-nowrap">Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-md hover:bg-[#F1F5F9]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="text-lg font-bold text-[#0F172A] capitalize">
              {menuItems.find(i => i.id === currentPage)?.label || 'Dashboard'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <form onSubmit={handleHeaderSearchSubmit} className="relative hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input 
                type="text" 
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Search HS codes, buyers..." 
                className="pl-9 pr-4 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full text-sm w-64 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
            </form>
            <button className="relative p-2 text-[#64748B] hover:text-[#0F172A] transition-colors rounded-full hover:bg-[#F1F5F9]">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full border border-white"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-[#E2E8F0] border border-[#CBD5E1] flex items-center justify-center text-sm font-bold text-[#475569]">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Page Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
