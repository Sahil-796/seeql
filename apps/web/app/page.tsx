import Link from "next/link";

const views = [
  {
    id: 1,
    name: "Editorial",
    description: "Clean, minimalist design with serif typography and generous whitespace",
    gradient: "from-stone-100 to-stone-200",
    textColor: "text-stone-800",
    accentColor: "bg-stone-800",
  },
  {
    id: 2,
    name: "Terminal",
    description: "Brutalist terminal aesthetic with monospace fonts and ASCII art",
    gradient: "from-zinc-900 to-black",
    textColor: "text-green-400",
    accentColor: "bg-green-400",
  },
  {
    id: 3,
    name: "Organic",
    description: "Soft, rounded shapes with pastel colors and gentle animations",
    gradient: "from-emerald-50 to-amber-50",
    textColor: "text-emerald-800",
    accentColor: "bg-emerald-500",
  },
  {
    id: 4,
    name: "Luxury",
    description: "Premium dark theme with gold accents and elegant typography",
    gradient: "from-zinc-900 to-zinc-950",
    textColor: "text-amber-300",
    accentColor: "bg-amber-500",
  },
  {
    id: 5,
    name: "Neon",
    description: "Cyberpunk-inspired with neon glows, glitch effects, and CRT aesthetics",
    gradient: "from-slate-900 via-purple-950 to-slate-900",
    textColor: "text-cyan-400",
    accentColor: "bg-gradient-to-r from-cyan-400 to-pink-500",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Background Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        <div className="relative max-w-6xl mx-auto px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm text-slate-600 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            SQL Playground & Schema Visualizer
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
              Seeql
            </span>
          </h1>
          
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed">
            Write a SQL query and watch as we infer the schema, generate mock data, 
            and visualize everything in real-time. No database required.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link 
              href="/1"
              className="px-8 py-4 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
            >
              Get Started
            </Link>
            <a 
              href="https://github.com"
              className="px-8 py-4 bg-white text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors border border-slate-200"
            >
              View Source
            </a>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {[
            {
              title: "Schema Inference",
              description: "Write a SELECT query and we'll automatically infer the table structure, relationships, and column types.",
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6M9 8h6M9 16h3" />
                </svg>
              ),
            },
            {
              title: "Mock Data Generation",
              description: "Generate realistic fake data that respects relationships and constraints. Powered by intelligent type detection.",
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
            },
            {
              title: "Instant Visualization",
              description: "See your data come to life with beautiful visualizations. Five distinct design themes to choose from.",
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ),
            },
          ].map((feature) => (
            <div key={feature.title} className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 mb-6">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* View Selection */}
      <section className="max-w-6xl mx-auto px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Choose Your Experience</h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            Five distinct design themes, each with its own personality. Pick the one that matches your vibe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {views.map((view) => (
            <Link
              key={view.id}
              href={`/${view.id}`}
              className="group relative overflow-hidden rounded-2xl aspect-[4/3] shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
            >
              {/* Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${view.gradient}`} />
              
              {/* Content */}
              <div className="relative h-full p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-mono ${view.textColor} opacity-60`}>
                    /{view.id}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${view.accentColor}`} />
                </div>
                
                <div>
                  <h3 className={`text-2xl font-bold ${view.textColor} mb-2`}>
                    {view.name}
                  </h3>
                  <p className={`text-sm ${view.textColor} opacity-70 line-clamp-2`}>
                    {view.description}
                  </p>
                </div>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-slate-600">Seeql</span>
            </div>
            
            <div className="flex items-center gap-8 text-sm text-slate-500">
              <span>SQL Playground & Schema Visualizer</span>
              <span className="hidden md:inline">Built with Next.js & Go</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
