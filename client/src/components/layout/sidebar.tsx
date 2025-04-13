import React from "react";
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
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

function SidebarLink({ href, icon, children, active }: SidebarLinkProps) {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center px-3 py-2 rounded-md font-medium text-sm transition-colors",
          active 
            ? "bg-primary/10 text-primary" 
            : "text-secondary hover:bg-gray-100"
        )}
      >
        {React.cloneElement(icon as React.ReactElement, {
          className: "h-5 w-5 mr-3"
        })}
        {children}
      </a>
    </Link>
  );
}

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = React.useState(false);
  
  if (!user) return null;
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const toggleSidebar = () => {
    setExpanded(!expanded);
  };
  
  // If mobile and not expanded, only show the minimal sidebar
  if (isMobile && !expanded) {
    return (
      <div className={cn("bg-white shadow-md w-full p-4 flex items-center justify-between", className)}>
        <Logo size="sm" />
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <LayoutGrid className="h-6 w-6" />
        </Button>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "bg-white shadow-md flex flex-col",
      isMobile 
        ? "fixed inset-0 z-50 w-full h-full overflow-auto" 
        : "w-64 min-h-screen",
      className
    )}>
      <div className="p-4 flex items-center justify-between border-b">
        <Logo size="md" />
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <LogOut className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      <nav className="p-4 space-y-1 flex-grow">
        <SidebarLink href="/" icon={<LayoutGrid />} active={location === "/"}>
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
        
        <div className="pt-4 mt-4 border-t border-gray-200">
          <SidebarLink href="/settings" icon={<Settings />} active={location === "/settings"}>
            Settings
          </SidebarLink>
        </div>
      </nav>
      
      <div className="p-4 border-t border-gray-200 mt-auto">
        <div className="flex items-center">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="text-sm font-medium">{user.fullName}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-auto text-gray-400 hover:text-gray-600"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
