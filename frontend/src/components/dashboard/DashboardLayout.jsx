import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Globe2,
  MessageSquare,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X
} from 'lucide-react';

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
            ? 'bg-blue-pale text-blue font-medium'
            : 'text-muted hover:bg-surface hover:text-navy'
        }`}
      >
        <Icon size={18} className={`shrink-0 ${isActive ? 'text-blue' : 'text-faint'}`} />
        {expanded && <span className="text-sm whitespace-nowrap">{item.label}</span>}
      </button>
    );
  };

  const renderSidebarBody = (expanded) => (
    <>
      <div className="h-16 flex items-center justify-between px-4 border-b border-line">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded bg-blue flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          {expanded && <span className="font-bold text-navy whitespace-nowrap">GlobeX AI</span>}
        </div>
        {/* Mobile close button (only rendered inside the drawer) */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded-md text-muted hover:text-navy hover:bg-surface"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
        {expanded && (
          <div className="text-[10px] font-bold text-faint uppercase tracking-wider mb-2 px-2 mt-2">
            Main Menu
          </div>
        )}
        {menuItems.map((item) => renderNavButton(item, expanded))}
      </nav>

      <div className="p-4 border-t border-line">
        <button
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted hover:bg-surface hover:text-navy transition-colors w-full mb-1"
          title={!expanded ? 'Settings' : undefined}
          aria-label={!expanded ? 'Settings' : undefined}
        >
          <Settings size={18} className="text-faint shrink-0" />
          {expanded && <span className="text-sm whitespace-nowrap">Settings</span>}
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red hover:bg-red-pale transition-colors w-full"
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
        className={`hidden lg:flex bg-white border-r border-line flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}
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
          <aside className="absolute left-0 top-0 h-full w-64 bg-white border-r border-line flex flex-col shadow-xl">
            {renderSidebarBody(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-line flex items-center justify-between px-4 sm:px-6 shrink-0">
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
            <span className="text-sm font-semibold text-muted capitalize">
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
                className="pl-9 pr-4 py-1.5 bg-page border border-line rounded-full text-sm w-64 focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue"
              />
            </form>
            <button className="relative p-2 text-muted hover:text-navy transition-colors rounded-full hover:bg-surface" aria-label="Notifications">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red rounded-full border border-white"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-line border border-line-dark flex items-center justify-center text-sm font-bold text-soft">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Page Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
