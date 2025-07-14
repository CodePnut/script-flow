'use client'

import { Menu, Database, Settings, Home, Mic } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState } from 'react'

import { cn } from '@/lib/utils'

import { ThemeSwitcher } from './ThemeSwitcher'
import { Button } from './ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from './ui/sheet'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Transcribe', href: '/transcribe', icon: Mic },
  { name: 'Dashboard', href: '/dashboard', icon: Database },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Prevent body scroll when mobile menu is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/60">
      <div className="container flex h-16 max-w-screen-2xl items-center px-6 md:px-8">
        {/* Desktop Logo & Navigation */}
        <div className="mr-8 hidden md:flex">
          <Link href="/" className="mr-10 flex items-center space-x-4">
            <Image
              src="/script-flow-logo.png"
              alt="ScriptFlow Logo"
              width={40}
              height={40}
              className="h-10 w-10"
              priority
            />
            <span className="hidden font-bold text-xl sm:inline-block">
              ScriptFlow
            </span>
          </Link>
          <nav className="flex items-center gap-8 text-base">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'transition-colors font-medium relative',
                    isActive ? 'text-fg' : 'text-fg/60 hover:text-fg/80',
                  )}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute -bottom-6 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Mobile Menu Button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-4 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="px-8 py-4">
              {/* Mobile Logo */}
              <Link
                href="/"
                className="flex items-center space-x-4"
                onClick={() => setIsOpen(false)}
              >
                <Image
                  src="/script-flow-logo.png"
                  alt="ScriptFlow Logo"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
                <span className="font-bold text-xl">ScriptFlow</span>
              </Link>
              <nav className="flex flex-col gap-4 mt-8">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'flex items-center gap-3 select-none space-y-1 rounded-md p-4 leading-none no-underline outline-none transition-colors text-lg font-medium',
                        isActive
                          ? 'bg-accent text-accent-fg'
                          : 'hover:bg-accent hover:text-accent-fg focus:bg-accent focus:text-accent-fg',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile Logo & Theme Switcher */}
        <div className="flex flex-1 items-center justify-between space-x-4 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Link
              href="/"
              className="flex items-center space-x-4 md:hidden ml-4"
            >
              <Image
                src="/script-flow-logo.png"
                alt="ScriptFlow Logo"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="font-bold text-xl">ScriptFlow</span>
            </Link>
          </div>
          <nav className="flex items-center">
            <ThemeSwitcher />
          </nav>
        </div>
      </div>
    </header>
  )
}
