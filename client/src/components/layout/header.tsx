import React, { useState } from "react";
import { Link } from "wouter";
import { 
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
import { Input } from "@/components/ui/input";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";

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
        <NotificationBell />
        <SearchComponent />
      </div>
    </div>
  );
}

function SearchComponent() {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  // Search across projects, documents, and users
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['/api/search', searchValue],
    enabled: searchValue.length > 2,
    staleTime: 5000,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Search">
          <SearchIcon className="h-5 w-5 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Command>
          <CommandInput 
            placeholder="Search projects, documents..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {searchValue.length <= 2 ? 'Type at least 3 characters to search' : 'No results found'}
            </CommandEmpty>
            {searchResults && searchResults.length > 0 && (
              <>
                {searchResults.filter((item: any) => item.type === 'project').length > 0 && (
                  <CommandGroup heading="Projects">
                    {searchResults.filter((item: any) => item.type === 'project').map((project: any) => (
                      <CommandItem
                        key={`project-${project.id}`}
                        onSelect={() => {
                          window.location.href = `/projects/${project.id}`;
                          setOpen(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{project.name}</span>
                          <span className="text-sm text-muted-foreground">{project.clientName}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {searchResults.filter((item: any) => item.type === 'document').length > 0 && (
                  <CommandGroup heading="Documents">
                    {searchResults.filter((item: any) => item.type === 'document').map((document: any) => (
                      <CommandItem
                        key={`document-${document.id}`}
                        onSelect={() => {
                          window.location.href = `/projects/${document.projectId}?document=${document.id}`;
                          setOpen(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{document.filename}</span>
                          <span className="text-sm text-muted-foreground">{document.category}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {searchResults.filter((item: any) => item.type === 'user').length > 0 && (
                  <CommandGroup heading="Users">
                    {searchResults.filter((item: any) => item.type === 'user').map((user: any) => (
                      <CommandItem
                        key={`user-${user.id}`}
                        onSelect={() => {
                          window.location.href = `/stakeholders?user=${user.id}`;
                          setOpen(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{user.fullName}</span>
                          <span className="text-sm text-muted-foreground">{user.email}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
