import { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { VideosPanel } from './pages/VideosPanel';

interface ConfigMenuProps {
  onLogout?: () => void;
}

export function ConfigMenu({ onLogout }: ConfigMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'menu' | 'videos' | 'users'>('menu');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVideosPanelOpen = () => {
    setActivePanel('videos');
    setIsModalOpen(true);
    setIsOpen(false);
  };

  const handleUsersPanel = () => {
    setActivePanel('users');
    setIsModalOpen(true);
    setIsOpen(false);
  };

  return (
    <>
      {/* Config Button */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-[#D3A67F]/10 rounded-full transition text-xl"
          title="Configurações"
        >
          ⚙️
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {activePanel === 'menu' ? (
              <div className="py-2">
                {/* Menu Items */}
                <button
                  onClick={handleVideosPanelOpen}
                  className="w-full px-4 py-3 text-left text-[#4A4A4A] hover:bg-[#D3A67F]/5 transition flex items-center gap-3"
                >
                  <span className="text-lg">📹</span>
                  <div>
                    <div className="font-semibold">Gerenciar Vídeos</div>
                    <div className="text-xs text-[#4A4A4A]/60">Manage carousel videos</div>
                  </div>
                </button>

                <button
                  onClick={handleUsersPanel}
                  className="w-full px-4 py-3 text-left text-[#4A4A4A] hover:bg-[#D3A67F]/5 transition flex items-center gap-3"
                >
                  <span className="text-lg">👥</span>
                  <div>
                    <div className="font-semibold">Gerenciar Usuários</div>
                    <div className="text-xs text-[#4A4A4A]/60">User management</div>
                  </div>
                </button>

                <div className="border-t border-gray-200 my-2" />

                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout?.();
                  }}
                  className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition flex items-center gap-3"
                >
                  <span className="text-lg">🚪</span>
                  <div>
                    <div className="font-semibold">Sair</div>
                    <div className="text-xs text-red-500">Logout</div>
                  </div>
                </button>
              </div>
            ) : (
              <div className="py-2">
                <button
                  onClick={() => setActivePanel('menu')}
                  className="w-full px-4 py-3 text-left text-[#D3A67F] hover:bg-[#D3A67F]/5 transition font-semibold"
                >
                  ← Voltar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal for Panels */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 flex justify-between items-center p-6 border-b border-gray-200 bg-white">
              <h2 className="text-2xl font-bold text-[#4A4A4A]">
                {activePanel === 'videos' ? '📹 Gerenciar Vídeos' : '👥 Gerenciar Usuários'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-3xl text-gray-400 hover:text-gray-600 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8">
              {activePanel === 'videos' ? (
                <VideosPanel />
              ) : (
                <div className="text-center py-12">
                  <p className="text-lg text-[#4A4A4A]/60">
                    Painel de usuários em desenvolvimento...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
