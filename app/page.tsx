"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  CircleUserRound as Github,
  Zap,
  FolderTree,
  Lock,
  BookOpen,
  RefreshCw,
  Globe as Chrome,
  Paperclip,
  Folder,
  Search,
  Shield,
  WifiOff,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import { useEffect } from "react"
import Link from "next/link"
import Image from "next/image"

export default function PawkitLanding() {
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
    <div className="min-h-screen bg-[#0a0814]">
      {/* Gradient background effects matching 3-panel UI */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#7c3aed]/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#a36bff]/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-[#6d5cff]/15 rounded-full blur-[128px]" />
      </div>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold text-balance bg-gradient-to-r from-[#7c3aed] via-[#a36bff] to-[#7c3aed] bg-clip-text text-transparent leading-tight">
            Your Bookmarks,<br />Fetched and Organized
          </h1>

          <p className="text-xl md:text-2xl text-[#a3a3b0] text-balance max-w-3xl mx-auto">
            Fast, private, and local-first—your bookmarks live on your device.
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/home">
              <Button
                size="lg"
                className="bg-[#7c3aed] hover:bg-[#6d2fd9] text-white text-lg px-10 py-7 rounded-xl shadow-lg shadow-[#7c3aed]/25 hover:shadow-[#7c3aed]/40 transition-all duration-300"
              >
                Launch Pawkit
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-[#7c3aed]/30 text-[#f5f5f7] hover:bg-[#7c3aed]/10 hover:border-[#7c3aed] text-lg px-10 py-7 rounded-xl transition-all duration-300 bg-transparent"
              >
                Try Demo
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center items-center gap-6 pt-6 text-sm text-[#a3a3b0]">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-[#7c3aed]" />
              <span>Open Source</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-[#a3a3b0]/30" />
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#7c3aed]" />
              <span>End-to-End Encryption</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-[#a3a3b0]/30" />
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-[#7c3aed]" />
              <span>Works Offline</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security Module */}
      <section className="relative container mx-auto px-4 py-12 fade-in-section">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-[#7c3aed]/5 to-transparent border-2 border-[#7c3aed]/20 p-8 rounded-2xl backdrop-blur-sm">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#7c3aed]" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-[#f5f5f7] mb-4">How Pawkit Protects You</h3>
                <ul className="space-y-3 text-[#a3a3b0]">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                    <span>Your data lives on your device—works offline, loads instantly</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                    <span>End-to-end encryption in The Den—only you hold the keys</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                    <span>No tracking. No ads. No nonsense.</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <a
                    href="https://github.com/TheVisher/Pawkit#readme"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#7c3aed] hover:text-[#a36bff] transition-colors"
                  >
                    Privacy & Security Overview
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Features Section - Reordered to emphasize differentiators */}
      <section className="container mx-auto px-4 py-24 fade-in-section">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-balance text-[#f5f5f7]">
          Built for Speed, Privacy, and Control
        </h2>
        <p className="text-center text-[#a3a3b0] text-lg mb-16 max-w-2xl mx-auto">
          Pawkit gives you everything you need to save, organize, and rediscover your bookmarks—without compromising on privacy.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <FeatureCard
            icon={<Zap className="w-10 h-10 text-[#7c3aed]" />}
            title="Instant Speed"
            description="No server lag. Everything loads instantly because it's already on your device."
          />
          <FeatureCard
            icon={<Lock className="w-10 h-10 text-[#7c3aed]" />}
            title="Private Collections"
            description="End-to-end encrypted collections for sensitive bookmarks—only you hold the keys."
          />
          <FeatureCard
            icon={<FolderTree className="w-10 h-10 text-[#7c3aed]" />}
            title="Smart Pawkits"
            description="Nested collections with drag-and-drop. Organize like folders—only smarter."
          />
          <FeatureCard
            icon={<BookOpen className="w-10 h-10 text-[#7c3aed]" />}
            title="Reader Mode"
            description="Automatic article extraction for distraction-free reading."
          />
          <FeatureCard
            icon={<RefreshCw className="w-10 h-10 text-[#7c3aed]" />}
            title="Cross-Device Sync"
            description="Encrypted sync; keys never leave your device."
          />
          <FeatureCard
            icon={<Chrome className="w-10 h-10 text-[#7c3aed]" />}
            title="Browser Extension"
            description="Save any page in one click—Chrome, Firefox, and Safari."
          />
        </div>
      </section>

      {/* Visual Proof Gallery */}
      <section className="container mx-auto px-4 py-20 fade-in-section">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-balance text-[#f5f5f7]">
          See Pawkit in Action
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <ProofCard
            title="Library View"
            description="Browse your complete collection with grid, list, and timeline layouts"
            imagePath="/images/screenshots/Libraryview.jpeg"
          />
          <ProofCard
            title="Notes"
            description="Create and manage rich markdown notes with powerful editing"
            imagePath="/images/screenshots/Notesview.png"
          />
          <ProofCard
            title="Pawkits"
            description="Organize bookmarks into visual collections with preview cards"
            imagePath="/images/screenshots/Pawkitsview.png"
          />
        </div>
      </section>

      {/* Simple as 1-2-3 - Horizontal Stepper */}
      <section className="container mx-auto px-4 py-20 fade-in-section">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-balance text-[#f5f5f7]">
          Simple as 1-2-3
        </h2>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 md:gap-4 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-[#7c3aed] via-[#a36bff] to-[#7c3aed] opacity-20 -z-10" />

            <StepCard
              number="1"
              title="Save"
              icon={<Paperclip className="w-10 h-10 text-[#7c3aed]" />}
              description="Click the extension or paste a URL. Pawkit fetches details instantly."
            />
            <StepCard
              number="2"
              title="Organize"
              icon={<Folder className="w-10 h-10 text-[#7c3aed]" />}
              description="Drop into Pawkits. Tag, note, and organize however you like."
            />
            <StepCard
              number="3"
              title="Find"
              icon={<Search className="w-10 h-10 text-[#7c3aed]" />}
              description="Search and filter with Dig Up. Your bookmarks are right where you left them—even offline."
            />
          </div>
        </div>
      </section>

      {/* Get Pawkit Section */}
      <section className="container mx-auto px-4 py-20 fade-in-section">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-[#7c3aed] to-[#a36bff] rounded-3xl p-12 md:p-16 shadow-2xl shadow-[#7c3aed]/20 border-0">
            <div className="text-center space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold text-white text-balance">
                Get Pawkit
              </h2>
              <p className="text-xl text-purple-100 text-balance max-w-2xl mx-auto">
                Start organizing your bookmarks with privacy-first, local-first technology.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
                <Link href="/home">
                  <Button
                    size="lg"
                    className="bg-white text-[#7c3aed] hover:bg-purple-50 text-lg px-10 py-7 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                  >
                    Launch Pawkit
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white/10 text-lg px-10 py-7 rounded-xl transition-all duration-300"
                  >
                    Try Demo
                  </Button>
                </Link>
              </div>

              {/* Browser Extension Links */}
              <div className="pt-8 border-t border-white/20">
                <p className="text-purple-100 mb-4 font-medium">Get Browser Extension</p>
                <div className="flex flex-wrap justify-center gap-4">
                  <a
                    href="https://chromewebstore.google.com/detail/pawkit-web-clipper/bbmhcminlncbpkmblbaelhkamhmknjcj"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/30 transition-all duration-300"
                  >
                    <Chrome className="w-5 h-5" />
                    Chrome & Safari
                  </a>
                  <a
                    href="https://addons.mozilla.org/en-US/firefox/addon/pawkit-web-clipper/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/30 transition-all duration-300"
                  >
                    <Chrome className="w-5 h-5" />
                    Firefox
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Open Source Card */}
      <section className="container mx-auto px-4 py-12 fade-in-section">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] p-8 rounded-2xl backdrop-blur-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-semibold text-[#f5f5f7] mb-2">Explore the Code on GitHub</h3>
                <p className="text-[#a3a3b0] mb-4">Built with Next.js, local-first architecture, and privacy by design.</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  <Badge text="Next.js" />
                  <Badge text="Local-First" />
                  <Badge text="Open Source" />
                </div>
              </div>
              <div className="flex-shrink-0">
                <a
                  href="https://github.com/TheVisher/Pawkit"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="border-2 border-[#7c3aed] text-[#7c3aed] hover:bg-[#7c3aed] hover:text-white px-8 py-6 rounded-xl transition-all duration-300"
                  >
                    <Github className="w-5 h-5 mr-2" />
                    View on GitHub
                  </Button>
                </a>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 mt-20 border-t border-[rgba(255,255,255,0.08)]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-[#a3a3b0]">
          <div className="flex items-center gap-2">
            Built by the <span className="text-[#f5f5f7] font-medium">Pawkit Team</span>
          </div>

          <div className="flex gap-6">
            <a
              href="https://github.com/TheVisher/Pawkit"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#7c3aed] transition-colors flex items-center gap-2"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <Link href="/privacy" className="hover:text-[#7c3aed] transition-colors">
              Privacy Policy
            </Link>
            <a
              href="https://github.com/TheVisher/Pawkit#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#7c3aed] transition-colors"
            >
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
    <Card className="p-8 hover:shadow-lg hover:shadow-[#7c3aed]/10 hover:-translate-y-1 transition-all duration-300 border-2 border-[rgba(255,255,255,0.08)] hover:border-[#7c3aed]/30 bg-[rgba(255,255,255,0.03)] rounded-2xl backdrop-blur-sm group">
      <div className="mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <h3 className="text-xl font-semibold mb-3 text-[#f5f5f7]">{title}</h3>
      <p className="text-[#a3a3b0] leading-relaxed">{description}</p>
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
    <div className="relative h-full">
      <Card className="p-8 bg-[rgba(255,255,255,0.03)] border-2 border-[rgba(255,255,255,0.08)] rounded-2xl backdrop-blur-sm hover:border-[#7c3aed]/30 transition-all duration-300 h-full flex flex-col">
        <div className="text-center space-y-4 flex-1 flex flex-col">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a36bff] text-white text-2xl font-bold shadow-lg shadow-[#7c3aed]/25 mx-auto">
            {number}
          </div>
          <div className="flex justify-center">{icon}</div>
          <h3 className="text-2xl font-semibold text-[#f5f5f7]">{title}</h3>
          <p className="text-[#a3a3b0] leading-relaxed flex-1">{description}</p>
        </div>
      </Card>
    </div>
  )
}

function ProofCard({
  title,
  description,
  imagePath,
}: { title: string; description: string; imagePath?: string }) {
  return (
    <Card className="p-6 bg-[rgba(255,255,255,0.03)] border-2 border-[rgba(255,255,255,0.08)] rounded-2xl backdrop-blur-sm hover:border-[#7c3aed]/30 transition-all duration-300 group flex flex-col h-full">
      <div className="aspect-video bg-gradient-to-br from-[#7c3aed]/10 to-[#a36bff]/5 rounded-xl mb-4 flex items-center justify-center border border-[rgba(255,255,255,0.08)] group-hover:border-[#7c3aed]/20 transition-colors overflow-hidden">
        {imagePath ? (
          <Image
            src={imagePath}
            alt={title}
            width={800}
            height={450}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[#a3a3b0] text-sm">Screenshot placeholder</span>
        )}
      </div>
      <h3 className="text-xl font-semibold text-[#f5f5f7] mb-2">{title}</h3>
      <p className="text-[#a3a3b0] flex-1">{description}</p>
    </Card>
  )
}

function Badge({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(255,255,255,0.05)] text-[#7c3aed] font-medium text-sm border border-[#7c3aed]/20">
      {icon}
      {text}
    </div>
  )
}
