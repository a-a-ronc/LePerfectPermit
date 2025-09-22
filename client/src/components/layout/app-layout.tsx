import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Search } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState("");
  
  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Implement search functionality - for now just log
      console.log('Searching for:', searchTerm);
      // TODO: Navigate to search results page or filter current content
    }
  };

  // Only render without layout for unauthenticated pages
  const unauthenticatedPaths = ['/', '/auth', '/forgot-password', '/reset-password'];
  const currentPath = window.location.pathname;
  
  if (!user && unauthenticatedPaths.includes(currentPath)) {
    return <>{children}</>;
  }
  
  // For authenticated pages, always show the layout (even if user is still loading)
  if (!user) {
    // Show loading state with layout structure
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <Sidebar />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1" />
              <div className="flex items-center space-x-4">
                <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </header>
          
          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header with Theme Toggle */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            
            {/* Right side controls */}
            <div className="flex items-center space-x-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search projects, documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearch}
                  className="pl-10 w-64 h-8"
                />
              </div>
              
              <ThemeToggle />
              <NotificationBell />
              
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {user.fullName?.split(' ').map(n => n[0]).join('') || user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.fullName || user.username}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user.role}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}