import { ThemeToggle } from '@/components/theme-toggle'
import { UserNav } from '@/components/user-nav'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <ThemeToggle />
        </div>
        <div className="flex items-center space-x-4">
          <UserNav />
        </div>
      </div>
    </header>
  )
} 