import { useState, useEffect } from "react";
import Header from "@/components/Header";
import ChatInterface from "@/components/ChatInterface";
import Sidebar from "@/components/Sidebar";
import AdminDashboard from "@/components/AdminDashboard";

export default function Home() {
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Admin panel toggle (Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setIsAdminPanelOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatInterface />
        </div>
        
        {/* Right Sidebar - Hidden on mobile */}
        <div className="hidden lg:block w-80">
          <Sidebar />
        </div>
      </main>

      {/* Admin Panel Overlay */}
      {isAdminPanelOpen && (
        <AdminDashboard onClose={() => setIsAdminPanelOpen(false)} />
      )}
    </div>
  );
}
