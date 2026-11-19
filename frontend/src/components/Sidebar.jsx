import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, Shirt, Wand2, CloudSun, Palette, Sparkles, Bot,
  Search, Wallet, Camera, Heart, Settings, LogOut, X, Scissors,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

const navGroups = [
  {
    label: null,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/wardrobe', label: 'Wardrobe', icon: Shirt },
    ],
  },
  {
    label: 'Styling',
    items: [
      { to: '/outfits', label: 'Outfit Generator', icon: Wand2 },
      { to: '/recommendations', label: 'Smart Picks', icon: CloudSun },
      { to: '/fashion-critic', label: 'Fashion Critic', icon: Sparkles },
      { to: '/colors', label: 'Colour Palette', icon: Palette },
      { to: '/chat', label: 'Stylist Chat', icon: Bot },
    ],
  },
  {
    label: 'Shopping',
    items: [
      { to: '/shopping/finder', label: 'Clothes Finder', icon: Search },
      { to: '/shopping/budget', label: 'Budget Planner', icon: Wallet },
      { to: '/saved', label: 'Saved', icon: Heart },
    ],
  },
  {
    label: 'More',
    items: [
      { to: '/try-on', label: 'Virtual Try-On', icon: Camera },
      { to: '/profile', label: 'Profile', icon: User },
      { to: '/settings', label: 'Settings & Privacy', icon: Settings },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, firebaseUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
    onClose?.();
  };

  const linkClass = ({ isActive }) =>
    `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`;

  return (
    <>
      {isOpen && <div className="sidebar__backdrop" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <div className="navbar__brand">
            <div className="navbar__logo"><Scissors size={16} /></div>
            <span className="navbar__title">DIGI CLOSET</span>
          </div>
          <button className="sidebar__close" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar__nav custom-scrollbar">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              {group.label && <p className="sidebar__section-label">{group.label}</p>}
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={linkClass} onClick={onClose}>
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <Avatar name={user?.name || firebaseUser?.displayName || ''} size="sm" />
            <div style={{ minWidth: 0 }}>
              <p className="sidebar__user-name">{user?.name || firebaseUser?.displayName || 'User'}</p>
              <p className="sidebar__user-email">{user?.email || firebaseUser?.email}</p>
            </div>
          </div>
          <button className="sidebar__logout" onClick={handleLogout}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
