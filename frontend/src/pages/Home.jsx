import { Link } from 'react-router-dom';
import {
  Sparkles, Shirt, Wand2, Palette, CloudSun, Wallet, Search, Bot, ArrowRight,
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';

const features = [
  { icon: Shirt, title: 'Digital Wardrobe', description: 'Photograph a piece and Gemini tags its category, colours, pattern and season. You review before it is saved.' },
  { icon: Wand2, title: 'Outfit Generator', description: 'Complete looks built only from clothes you own, for the occasion, style, season and colours you pick.' },
  { icon: CloudSun, title: 'Smart Picks', description: 'Daily suggestions for college, office, parties or travel that follow live weather and your favourite looks.' },
  { icon: Sparkles, title: 'Fashion Critic', description: 'A score out of ten and constructive notes on colour, balance and fit for the occasion, from a photo or your wardrobe.' },
  { icon: Palette, title: 'Colour Palette', description: 'Clothing colours suggested from a face photo, with swatches and combinations you can edit. The photo is never stored.' },
  { icon: Bot, title: 'Stylist Chat', description: 'Ask what to wear, what goes with your black jeans or what to buy next. Answers use your actual wardrobe.' },
  { icon: Search, title: 'Clothes Finder', description: 'Describe what you want in plain words, like "white sneakers under ₹2,000", and search real stores.' },
  { icon: Wallet, title: 'Budget Planner', description: 'A prioritised shopping list that fills gaps in your wardrobe and never goes over your budget.' },
];

export default function Home() {
  return (
    <div>
      <section className="home-hero">
        <span className="home-hero__badge"><Sparkles size={14} /> AI-Powered Fashion Companion</span>
        <h1 className="home-hero__title">
          Your closet, <span>made intelligent</span>
        </h1>
        <p className="home-hero__subtitle">
          Digi Closet organizes your wardrobe, recommends outfits from clothes you already own,
          and helps you shop smarter — all in one place.
        </p>
        <div className="home-hero__actions">
          <Link to="/register">
            <Button size="lg">Get Started Free <ArrowRight size={16} /></Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">Sign In</Button>
          </Link>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__header">
          <h2 className="home-section__title">Everything you need to dress smarter</h2>
          <p className="home-section__subtitle">
            Eight tools that share one wardrobe, so every suggestion starts from what you already own.
          </p>
        </div>
        <div className="home-feature-grid">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} hover className="home-feature-card">
              <div className="home-feature-card__icon"><Icon size={22} /></div>
              <h3 className="home-feature-card__title">{title}</h3>
              <p className="home-feature-card__description">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="home-cta">
        <Card className="home-cta__card">
          <h2 className="home-cta__title">Ready to organize your style?</h2>
          <p className="home-cta__subtitle">Create a free account and start building your digital wardrobe today.</p>
          <Link to="/register">
            <Button size="lg">Create Your Account <ArrowRight size={16} /></Button>
          </Link>
        </Card>
      </section>

      <footer className="home-footer">
        © 2026 Digi Closet. All rights reserved.
      </footer>
    </div>
  );
}
