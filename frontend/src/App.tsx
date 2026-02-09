import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { DynamicGenerator } from './components/generator/DynamicGenerator';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TypeBuilder } from './components/admin/TypeBuilder';
import { LibraryManager } from './components/admin/LibraryManager';
import { SlideSelectionTester } from './components/generator/SlideSelectionTester';
import { Sparkles, Settings, Folder, ListFilter } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-slate-100 selection:bg-primary/30 font-sans">

        {/* Header */}
        <header className="border-b border-slate-800 bg-surface/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
                <Sparkles className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Smart Presentation Machine
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <Link to="/admin/library" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
                <Folder className="w-4 h-4" /> Library
              </Link>
              <Link to="/test-slides" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
                <ListFilter className="w-4 h-4" /> Test Filter
              </Link>
              <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
                <Settings className="w-4 h-4" /> Admin
              </Link>
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600"></div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-12">
          <Routes>
            <Route path="/" element={
              <>
                <div className="text-center mb-16">
                  <h1 className="text-5xl font-extrabold text-white mb-6 leading-tight">
                    Generate Professional <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                      Feasibility Studies
                    </span>
                    {' '}in Seconds
                  </h1>
                  <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                    Select a template, define your criteria, and let AI build your perfect presentation.
                  </p>
                </div>
                <DynamicGenerator />
              </>
            } />

            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/create" element={<TypeBuilder />} />
            <Route path="/admin/edit/:id" element={<TypeBuilder />} />
            <Route path="/admin/library" element={<LibraryManager />} />
            <Route path="/test-slides" element={<SlideSelectionTester />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
