import React from "react";
import { Link } from "wouter";
import { 
  BellIcon, 
  SearchIcon,
  ChevronRight,
  User,
  LogOut
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  breadcrumb?: BreadcrumbItem[];
}

export function Header({ breadcrumb = [] }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  
  return (
    <div className="bg-white p-4 shadow-sm flex items-center justify-between">
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          {breadcrumb.map((item, i) => (
            <li key={i} className="flex items-center">
              {i > 0 && (
                <svg className="h-5 w-5 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {item.href ? (
                <Link href={item.href}>
                  <div className="text-gray-500 hover:text-gray-700 cursor-pointer">{item.label}</div>
                </Link>
              ) : (
                <span className="text-gray-500">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex items-center space-x-4">
        <NotificationsDropdown />
        <Button variant="ghost" size="icon" aria-label="Search">
          <SearchIcon className="h-5 w-5 text-gray-500" />
        </Button>
      </div>
    </div>
  );
}

function NotificationsDropdown() {
  // In a real app, these would come from an API
  const notifications = [
    {
      id: 1,
      title: "Document Ready for Review",
      description: "Site Plan for CityView Distribution Center requires review",
      time: "1 hour ago",
      unread: true
    },
    {
      id: 2,
      title: "New Stakeholder Added",
      description: "Robert Chen was added to Harbor Logistics Complex",
      time: "2 hours ago",
      unread: true
    },
    {
      id: 3,
      title: "Project Deadline Approaching",
      description: "Northern Distribution Hub is due in 3 days",
      time: "yesterday",
      unread: false
    }
  ];
  
  const unreadCount = notifications.filter(n => n.unread).length;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <div className="relative">
            <BellIcon className="h-5 w-5 text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 rounded-full h-4 w-4 flex items-center justify-center text-xs text-white">
                {unreadCount}
              </span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-auto">
          <DropdownMenuGroup>
            {notifications.map(notification => (
              <DropdownMenuItem key={notification.id} className="py-2 px-4 focus:bg-gray-100">
                <div className={`${notification.unread ? 'font-medium' : ''}`}>
                  <div className="text-sm">{notification.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{notification.description}</div>
                  <div className="text-xs text-gray-400 mt-1">{notification.time}</div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center py-2 focus:bg-gray-100">
          <Link href="/notifications">
            <div className="w-full text-center text-primary text-sm cursor-pointer">View all notifications</div>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
