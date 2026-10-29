import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Globe2,
  MessageSquare,
  Languages,
  LogOut,
  Bell,
  Search,
  Menu,
  X
} from 'lucide-react';
import { LogoMark } from '../ui/Logo';

function getStoredUser() {
  try {
    const parsed = JSON.parse(localStorage.getItem('user') || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // Corrupt localStorage payload - treat as signed-out shell rather than crashing.
    return {};
  }
}

export default function DashboardLayout({ children, currentPage, onNavigate, onLogout, searchQuery = '', onSearchChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);   // desktop: expanded vs collapsed
  const [mobileOpen, setMobileOpen] = useState(false);    // mobile: off-canvas drawer
  const [headerSearch, setHeaderSearch] = useState(searchQuery);

  // Keep the header search box in sync when the global query changes
  // (render-time adjustment instead of an effect).
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  if (prevSearchQuery !== searchQuery) {
    setPrevSearchQuery(searchQuery);
    setHeaderSearch(searchQuery);
  }

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
    { id: 'drafter', label: 'Email Drafter', icon: Languages },
  ];

  const user = getStoredUser();

  const renderNavButton = (item, expanded) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    return (
      <button
        key={item.id}
        onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
        title={!expanded ? item.label : undefined}
        aria-label={!expanded ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full ${
          isActive
            ? 'bg-white/10 text-cream font-medium shadow-[inset_2px_0_0_0_var(--color-blue-bright)]'
            : 'text-sage hover:bg-white/5 hover:text-cream'
        }`}
      >
        <Icon size={18} className={`shrink-0 ${isActive ? 'text-blue-bright' : 'text-sage'}`} />
        {expanded && <span className="text-sm whitespace-nowrap">{item.label}</span>}
      </button>
    );
  };

  const renderSidebarBody = (expanded) => (
    <>
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <LogoMark size={30} onDark />
          {expanded && (
            <span className="font-bold text-cream whitespace-nowrap font-heading tracking-tight">
              Globe<span className="text-[#F59E0B]">X</span><span className="text-sage font-semibold"> AI</span>
            </span>
          )}
        </div>
        {/* Mobile close button (only rendered inside the drawer) */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded-md text-sage hover:text-cream hover:bg-white/5"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
        {expanded && (
          <div className="text-[10px] font-bold text-sage/70 uppercase tracking-wider mb-2 px-2 mt-2">
            Main Menu
          </div>
        )}
        {menuItems.map((item) => renderNavButton(item, expanded))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-soft hover:bg-white/5 transition-colors w-full"
          title={!expanded ? 'Logout' : undefined}
          aria-label={!expanded ? 'Logout' : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {expanded && <span className="text-sm whitespace-nowrap">Log out</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-page flex">
      {/* Desktop sidebar (collapsible) */}
      <aside
        className={`hidden lg:flex bg-deep flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}
      >
        {renderSidebarBody(sidebarOpen)}
      </aside>

      {/* Mobile off-canvas sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-deep flex flex-col shadow-xl">
            {renderSidebarBody(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-mist border-b border-line flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-muted hover:text-navy p-1 rounded-md hover:bg-surface"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            {/* Desktop collapse toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:block text-muted hover:text-navy p-1 rounded-md hover:bg-surface"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-semibold text-navy capitalize font-heading">
              {menuItems.find(i => i.id === currentPage)?.label || 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <form onSubmit={handleHeaderSearchSubmit} className="relative hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Search HS codes, buyers..."
                className="pl-9 pr-4 py-1.5 bg-white border border-line rounded-lg text-sm w-64 text-ink placeholder:text-faint focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15"
              />
            </form>
            <button className="relative p-2 text-muted hover:text-navy transition-colors rounded-lg hover:bg-surface" aria-label="Notifications">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full border border-mist"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-pale border border-blue-border flex items-center justify-center text-sm font-bold text-blue-dark">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Page Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
