"use client"

import { useState } from "react"
import { QuickMode } from "@/components/sql/quick-mode"
import { FullPlayground } from "@/components/sql/full-playground"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Zap,
  Database,
  Github,
  Info,
  Sparkles,
  Terminal,
  Table2,
} from "lucide-react"

type Mode = "quick" | "full"

export default function SQLSimulator() {
  const [mode, setMode] = useState<Mode>("quick")

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70">
                  <Database className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">
                    Seeql
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    SQL Playground & Simulator
                  </p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={mode === "quick" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMode("quick")}
                      className="gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      <span className="hidden sm:inline">Quick Mode</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Instant SQL testing with inferred schemas</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={mode === "full" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMode("full")}
                      className="gap-2"
                    >
                      <Terminal className="h-4 w-4" />
                      <span className="hidden sm:inline">Full Playground</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Full schema definition and query playground</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" asChild>
                      <a
                        href="https://github.com/anomalyco/seeql"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Github className="h-5 w-5" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View on GitHub</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Mode Info Banner */}
          <Card className="mb-8 border-l-4 border-l-primary">
            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 shrink-0">
                  {mode === "quick" ? (
                    <Zap className="h-6 w-6 text-yellow-500" />
                  ) : (
                    <Terminal className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold">
                      {mode === "quick" ? "Quick Mode" : "Full Playground"}
                    </h2>
                    <Badge variant="secondary" className="text-xs">
                      {mode === "quick" ? "Beta" : "Stable"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {mode === "quick"
                      ? "Write any SQL query and we&apos;ll automatically infer the schema and generate sample data. Perfect for quick testing without setup."
                      : "Define your database schema first, then run queries against it. Full control with persistent state across queries."}
                  </p>

                  <Separator className="my-4" />

                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {mode === "quick" ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Auto-inferred schema</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Table2 className="h-3.5 w-3.5" />
                          <span>Sample data generation</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5" />
                          <span>Instant results</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Database className="h-3.5 w-3.5" />
                          <span>Custom schema definition</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Terminal className="h-3.5 w-3.5" />
                          <span>Full SQL support</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Table2 className="h-3.5 w-3.5" />
                          <span>Persistent state</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Info className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-xs">
                      {mode === "quick"
                        ? "Quick Mode uses AI to infer table structures from your queries. No need to create tables first!"
                        : "Full Playground runs an in-memory SQLite database. Define your schema with CREATE TABLE statements."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </Card>

          {/* Mode Content */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {mode === "quick" ? <QuickMode /> : <FullPlayground />}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <p>
                Built with{" "}
                <span className="text-foreground">Next.js</span>,{" "}
                <span className="text-foreground">Go</span>, and{" "}
                <span className="text-foreground">SQLite</span>
              </p>
              <p>
                Powered by{" "}
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  seeql
                </span>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
