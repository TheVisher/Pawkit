import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { ConvexClientProvider } from '../components/providers/convex-provider'
import { ThemeProvider } from '../components/providers/theme-provider'
import { DebugProvider } from '../components/debug'
import { AppShell } from '../components/layout/app-shell'
import { AppDndProvider } from '../lib/contexts/dnd-context'
import { TagColorsProvider } from '../lib/contexts/tag-colors-context'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Pawkit',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
  notFoundComponent: RootNotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <ConvexClientProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <DebugProvider>
              <AppDndProvider>
                <TagColorsProvider>
                  <AppShell>{children}</AppShell>
                </TagColorsProvider>
              </AppDndProvider>
              <TanStackDevtools
                config={{
                  position: 'bottom-right',
                }}
                plugins={[
                  {
                    name: 'Tanstack Router',
                    render: <TanStackRouterDevtoolsPanel />,
                  },
                ]}
              />
            </DebugProvider>
          </ThemeProvider>
        </ConvexClientProvider>
        <Scripts />
      </body>
    </html>
  )
}

function RootNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-100">
      <div className="text-lg font-semibold">Page not found</div>
      <a className="text-sm text-violet-300 hover:text-violet-200" href="/home">
        Go to Home
      </a>
    </div>
  )
}
