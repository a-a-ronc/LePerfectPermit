import React, { useState, useEffect } from "react";
import { 
  LayoutGrid, 
  Folder, 
  FileText, 
  CheckSquare, 
  Users, 
  BarChart, 
  Settings, 
  LogOut 
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

function SidebarLink({ href, icon, children, active }: SidebarLinkProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center px-3 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer",
          active 
            ? "bg-primary/10 text-primary" 
            : "text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
        )}
      >
        {React.cloneElement(icon as React.ReactElement, {
          className: "h-5 w-5 mr-3 text-black dark:text-white"
        })}
        {children}
      </div>
    </Link>
  );
}

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  
  // Redirect to auth if no user
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);
  
  if (!user) return null;
  
  const handleLogout = () => {
    logoutMutation.mutate();
    // Navigate to auth page after logout
    navigate('/auth');
  };
  
  const toggleSidebar = () => {
    setExpanded(!expanded);
  };
  
  // If mobile and not expanded, only show the minimal sidebar
  if (isMobile && !expanded) {
    return (
      <div className={cn("bg-white dark:bg-gray-900 shadow-md w-full p-4 flex items-center justify-between", className)}>
        <Logo size="sm" />
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <LayoutGrid className="h-6 w-6" />
        </Button>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "bg-white dark:bg-gray-900 shadow-md flex flex-col",
      isMobile 
        ? "fixed inset-0 z-50 w-full h-full overflow-auto" 
        : "w-64 min-h-screen",
      className
    )}>
      <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <Logo size="md" />
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <LogOut className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      <nav className="p-4 space-y-1 flex-grow">
        <SidebarLink href="/dashboard" icon={<LayoutGrid />} active={location === "/dashboard"}>
          Dashboard
        </SidebarLink>
        <SidebarLink href="/projects" icon={<Folder />} active={location === "/projects" || location.startsWith("/project/")}>
          Projects
        </SidebarLink>
        <SidebarLink href="/documents" icon={<FileText />} active={location === "/documents"}>
          Documents
        </SidebarLink>
        {user.role === "specialist" && (
          <>
            <SidebarLink href="/reviews" icon={<CheckSquare />} active={location === "/reviews"}>
              Reviews
            </SidebarLink>
            <SidebarLink href="/stakeholders" icon={<Users />} active={location === "/stakeholders"}>
              Stakeholders
            </SidebarLink>
            <SidebarLink href="/reports" icon={<BarChart />} active={location === "/reports"}>
              Reports
            </SidebarLink>
          </>
        )}
        
        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <SidebarLink href="/settings" icon={<Settings />} active={location === "/settings"}>
            Settings
          </SidebarLink>
        </div>
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="flex items-center">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {user.fullName ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : user.username?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{user.fullName || user.username}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-auto text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
