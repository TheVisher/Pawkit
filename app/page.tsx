"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Github,
  Zap,
  FolderTree,
  Lock,
  BookOpen,
  RefreshCw,
  Chrome,
  Paperclip,
  Folder,
  Search,
  Dog,
} from "lucide-react"
import { useEffect, useRef } from "react"
import Link from "next/link"

export default function PawkitLanding() {
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up")
          }
        })
      },
      { threshold: 0.1 },
    )

    document.querySelectorAll(".fade-in-section").forEach((el) => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-5">
        <Dog className="absolute top-20 left-10 w-16 h-16 animate-float text-purple-400" />
        <Dog className="absolute top-40 right-20 w-14 h-14 animate-float-delayed text-purple-400" />
        <Dog className="absolute bottom-40 left-1/4 w-12 h-12 animate-float text-purple-400" />
        <Dog className="absolute top-1/3 right-1/3 w-14 h-14 animate-float-delayed text-purple-400" />
        <Dog className="absolute bottom-20 right-10 w-16 h-16 animate-float text-purple-400" />
      </div>

      {/* Hero Section */}
      <section ref={heroRef} className="relative container mx-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block animate-bounce-slow">
            <Dog className="w-24 h-24 mx-auto text-purple-400 stroke-[1.5]" />
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-balance bg-gradient-to-r from-[#6d5cff] to-[#a36bff] bg-clip-text text-transparent">
            Your Bookmarks, Fetched and Organized
          </h1>

          <p className="text-xl md:text-2xl text-zinc-400 text-balance max-w-2xl mx-auto">
            Kit helps you save, organize, and find your bookmarks. Fast, private, and always by your side.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/home">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#6d5cff] to-[#a36bff] hover:from-[#5d4cef] hover:to-[#9361ef] text-white text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
              >
                Launch Pawkit
              </Button>
            </Link>
            <a href="https://github.com/TheVisher/Pawkit/tree/main/packages/extension" target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-[#6d5cff] text-[#6d5cff] hover:bg-[#6d5cff] hover:text-white text-lg px-8 py-6 transition-all bg-transparent"
              >
                Get Browser Extension
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 fade-in-section">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-balance text-white">
          Everything You Need to Tame the Web
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <FeatureCard
            icon={<Zap className="w-10 h-10 text-purple-400 stroke-[1.5]" />}
            title="Local-First Speed"
            description="Instant access. Your bookmarks live on your device, not waiting for a server. Works offline."
          />
          <FeatureCard
            icon={<FolderTree className="w-10 h-10 text-purple-400 stroke-[1.5]" />}
            title="Smart Pawkits"
            description="Organize with nested collections. Drag, drop, done. Like folders, but actually useful."
          />
          <FeatureCard
            icon={<Lock className="w-10 h-10 text-purple-400 stroke-[1.5]" />}
            title="The Den"
            description="Private, encrypted space for sensitive bookmarks. Your secrets stay secret."
          />
          <FeatureCard
            icon={<BookOpen className="w-10 h-10 text-purple-400 stroke-[1.5]" />}
            title="Reader Mode"
            description="Distraction-free reading with automatic article extraction. Focus on what matters."
          />
          <FeatureCard
            icon={<RefreshCw className="w-10 h-10 text-purple-400 stroke-[1.5]" />}
            title="Cross-Device Sync"
            description="Edit on desktop, read on mobile. Your bookmarks follow you everywhere."
          />
          <FeatureCard
            icon={<Chrome className="w-10 h-10 text-purple-400 stroke-[1.5]" />}
            title="Browser Extension"
            description="Save any page in one click. Chrome, Firefox, and Safari supported."
          />
        </div>
      </section>

      <div className="flex justify-center items-center gap-4 my-12 opacity-20">
        <Dog className="w-8 h-8 text-purple-400 stroke-[1.5]" />
        <Dog className="w-8 h-8 text-purple-400 stroke-[1.5]" />
        <Dog className="w-8 h-8 text-purple-400 stroke-[1.5]" />
      </div>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-20 fade-in-section">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-balance text-white">Simple as 1-2-3</h2>

        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          <StepCard
            number="1"
            title="Save"
            icon={<Paperclip className="w-12 h-12 text-purple-400 stroke-[1.5]" />}
            description="Click the extension or paste a URL. Kit fetches it instantly."
          />
          <StepCard
            number="2"
            title="Organize"
            icon={<Folder className="w-12 h-12 text-purple-400 stroke-[1.5]" />}
            description="Drop into Pawkits. Tag, note, or toss in The Den for privacy."
          />
          <StepCard
            number="3"
            title="Find"
            icon={<Search className="w-12 h-12 text-purple-400 stroke-[1.5]" />}
            description="Search, filter, or browse. Your bookmarks are always right where you left them."
          />
        </div>
      </section>

      {/* Tech Highlights */}
      <section className="container mx-auto px-4 py-20 fade-in-section">
        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          <Badge text="Built with Next.js" />
          <Badge text="Local-First Architecture" />
          <Badge text="End-to-End Encrypted" />
          <a href="https://github.com/TheVisher/Pawkit" target="_blank" rel="noopener noreferrer">
            <Badge text="Open Source" icon={<Github className="w-4 h-4" />} />
          </a>
          <Badge text="Cross-Platform" />
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="container mx-auto px-4 py-20 fade-in-section">
        <div className="max-w-3xl mx-auto text-center space-y-6 bg-gradient-to-r from-[#6d5cff] to-[#a36bff] rounded-3xl p-12 md:p-16 shadow-2xl">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-balance">
            Ready to Get Your Bookmarks in Order?
          </h2>
          <p className="text-xl text-purple-100 text-balance">Join the pack. Kit is waiting.</p>
          <Link href="/home">
            <Button
              size="lg"
              className="bg-white text-[#6d5cff] hover:bg-purple-50 text-lg px-10 py-6 shadow-lg hover:shadow-xl transition-all mt-4"
            >
              Get Started
            </Button>
          </Link>
          <p className="text-sm text-purple-100 pt-4">Free to use. Privacy guaranteed. No tracking, ever.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 mt-20 border-t border-zinc-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            Built with <Dog className="w-4 h-4 text-purple-400" /> by{" "}
            <span className="text-zinc-300 font-medium">Pawkit Team</span>
          </div>

          <div className="flex gap-6">
            <a href="https://github.com/TheVisher/Pawkit" target="_blank" rel="noopener noreferrer" className="hover:text-[#6d5cff] transition-colors flex items-center gap-2">
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <Link href="/privacy" className="hover:text-[#6d5cff] transition-colors">
              Privacy Policy
            </Link>
            <a href="https://github.com/TheVisher/Pawkit#readme" target="_blank" rel="noopener noreferrer" className="hover:text-[#6d5cff] transition-colors">
              Documentation
            </a>
          </div>

          <div>© 2025 Pawkit</div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="p-6 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 border-2 border-zinc-800 hover:border-[#6d5cff]/30 bg-zinc-900/50">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
      <p className="text-zinc-400 leading-relaxed">{description}</p>
    </Card>
  )
}

function StepCard({
  number,
  title,
  icon,
  description,
}: { number: string; title: string; icon: React.ReactNode; description: string }) {
  return (
    <div className="relative">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-[#6d5cff] to-[#a36bff] text-white text-2xl font-bold shadow-lg">
          {number}
        </div>
        <div className="flex justify-center">{icon}</div>
        <h3 className="text-2xl font-semibold text-white">{title}</h3>
        <p className="text-zinc-400 leading-relaxed">{description}</p>
      </div>
      {number !== "3" && (
        <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-[#6d5cff] to-transparent -z-10" />
      )}
    </div>
  )
}

function Badge({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 text-purple-400 font-medium text-sm border border-[#6d5cff]/30">
      {icon}
      {text}
    </div>
  )
}
