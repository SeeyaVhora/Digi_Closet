import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Menu, Search, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Avatar from '../components/Avatar';
import Wordmark from '../components/Wordmark';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { user, firebaseUser } = useAuth();
  const navigate = useNavigate();
  const name = user?.name || firebaseUser?.displayName || '';

  // The top-bar search looks through the user's wardrobe.
  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/wardrobe?search=${encodeURIComponent(q)}` : '/wardrobe');
  };

  return (
    <div className="main-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-layout__content">
        <header className="topbar">
          <button className="topbar__menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <Wordmark to="/dashboard" className="topbar__mark" />
          <form className="topbar__search" onSubmit={handleSearch} role="search">
            <Search size={16} strokeWidth={1.5} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your wardrobe"
              aria-label="Search your wardrobe"
            />
          </form>
          <div className="topbar__actions">
            <Link to="/saved" className="topbar__icon" aria-label="Saved items"><Heart size={18} strokeWidth={1.5} /></Link>
            <Link to="/profile" className="topbar__profile" aria-label="Your profile">
              <span className="topbar__profile-name">{name.split(' ')[0]}</span>
              <Avatar name={name} size="sm" />
            </Link>
          </div>
        </header>

        <main className="main-layout__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
