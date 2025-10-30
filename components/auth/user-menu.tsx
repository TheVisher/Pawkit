'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/contexts/auth-context'
import { User, LogOut, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProfileModal } from '@/components/modals/profile-modal'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [showProfile, setShowProfile] = useState(false)

  if (!user) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-accent transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent">
            <User className="h-4 w-4" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-gray-100">
                {user.displayName || 'Account'}
              </p>
              <p className="text-xs leading-none text-gray-400">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowProfile(true)}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => signOut()}
            className="cursor-pointer text-rose-400 focus:text-rose-300"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileModal
        open={showProfile}
        onClose={() => setShowProfile(false)}
        username={user.email || 'User'}
        email={user.email}
      />
    </>
  )
}
