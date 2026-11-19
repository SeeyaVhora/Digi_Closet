import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, LogOut, Trash2, Download, KeyRound, User, AlertTriangle
} from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import useProfile from '../hooks/useProfile';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Settings() {
  const { logout, user } = useAuth();
  const { profile, updateProfile, deleteProfileData, exportData, deleteAccount } = useProfile();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [exporting, setExporting] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);

  // Privacy toggles
  const [allowAI, setAllowAI] = useState(true);
  const [allowPhysical, setAllowPhysical] = useState(false);

  useEffect(() => {
    if (profile?.privacySettings) {
      setAllowAI(profile.privacySettings.allowAIPersonalization ?? true);
      setAllowPhysical(profile.privacySettings.allowPhysicalDataUse ?? false);
    }
  }, [profile]);

  // Dialogs
  const [showDeleteProfileConfirm, setShowDeleteProfileConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handlePrivacyToggle = async (field, value) => {
    try {
      if (field === 'ai') {
        setAllowAI(value);
        await updateProfile({
          privacySettings: {
            allowAIPersonalization: value,
            allowPhysicalDataUse: allowPhysical,
          },
        });
      } else {
        setAllowPhysical(value);
        await updateProfile({
          privacySettings: {
            allowAIPersonalization: allowAI,
            allowPhysicalDataUse: value,
          },
        });
      }
      showToast('Privacy preferences updated.', 'success');
    } catch {
      showToast('Failed to update privacy settings.', 'error');
    }
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `digi-closet-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Data exported successfully!', 'success');
    } catch {
      showToast('Failed to export data.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      setResettingPw(true);
      await sendPasswordResetEmail(auth, user.email);
      showToast(`Password reset link sent to ${user.email}`, 'success');
    } catch (err) {
      showToast(err.message || 'Could not send reset link.', 'error');
    } finally {
      setResettingPw(false);
    }
  };

  const handleDeleteProfileData = async () => {
    try {
      await deleteProfileData();
      showToast('Style and physical data deleted.', 'success');
      setShowDeleteProfileConfirm(false);
    } catch {
      showToast('Failed to delete profile data.', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      await logout();
      showToast('Your account and closet data have been permanently deleted.', 'info');
      navigate('/');
    } catch {
      showToast('Failed to delete account.', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '42rem' }}>
      <PageHeader
        eyebrow="Account"
        title="Settings & privacy."
        subtitle="Control how your data is used, export it, or delete your account."
      />

      {/* AI & Privacy Controls */}
      <Card className="section">
        <h2 className="section__title">
          <Shield size={18} style={{ verticalAlign: 'middle', marginRight: 'var(--space-2)' }} />
          AI & Data Privacy
        </h2>
        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__title">AI Style Personalization</span>
            <span className="settings-row__desc">
              Allow Gemini AI to use your style tastes to curate outfits and critique combinations.
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={allowAI}
              onChange={(e) => handlePrivacyToggle('ai', e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__title">Physical Profile & Size Tailoring</span>
            <span className="settings-row__desc">
              Use body frame, fit preferences, and clothing sizes when building outfits.
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={allowPhysical}
              onChange={(e) => handlePrivacyToggle('physical', e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </Card>

      {/* Data Export & Portability */}
      <Card className="section">
        <h2 className="section__title">
          <Download size={18} style={{ verticalAlign: 'middle', marginRight: 'var(--space-2)' }} />
          Data Portability & Backup
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-4)' }}>
          Download a complete JSON export of your wardrobe items, curated outfits, shopping lists, and style preferences.
        </p>
        <Button variant="outline" onClick={handleExportData} loading={exporting}>
          <Download size={16} /> Download My Data (JSON)
        </Button>
      </Card>

      {/* Account Security */}
      <Card className="section">
        <h2 className="section__title">
          <User size={18} style={{ verticalAlign: 'middle', marginRight: 'var(--space-2)' }} />
          Account Security
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
          Signed in as <strong>{user?.email || user?.phoneNumber}</strong>
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
          {/* Phone-only accounts sign in with an SMS code and have no password. */}
          {user?.email && (
            <Button variant="outline" onClick={handlePasswordReset} loading={resettingPw}>
              <KeyRound size={16} /> Send Password Reset Email
            </Button>
          )}
          <Button variant="ghost" onClick={() => setShowLogoutConfirm(true)}>
            <LogOut size={16} /> Sign Out
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="section" style={{ borderColor: 'var(--color-danger)' }}>
        <h2 className="section__title" style={{ color: 'var(--color-danger)' }}>
          <AlertTriangle size={18} style={{ verticalAlign: 'middle', marginRight: 'var(--space-2)' }} />
          Danger Zone
        </h2>
        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__title">Reset Style Profile Data</span>
            <span className="settings-row__desc">Wipes preferred aesthetics, colors, sizes, and onboarding flags.</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowDeleteProfileConfirm(true)}>
            <Trash2 size={14} /> Reset
          </Button>
        </div>

        <div className="settings-row">
          <div className="settings-row__info">
            <span className="settings-row__title" style={{ color: 'var(--color-danger)' }}>Delete Account & Closet</span>
            <span className="settings-row__desc">Permanently deletes your account, all wardrobe items, outfits, and data.</span>
          </div>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteAccountConfirm(true)}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </Card>

      {/* Confirmation Modals */}
      <ConfirmDialog
        isOpen={showDeleteProfileConfirm}
        onClose={() => setShowDeleteProfileConfirm(false)}
        onConfirm={handleDeleteProfileData}
        title="Reset profile data?"
        message="This will clear your style preferences, colors, and body profile. Your wardrobe items will remain intact."
        confirmLabel="Reset Profile"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showDeleteAccountConfirm}
        onClose={() => setShowDeleteAccountConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete entire account?"
        message="This action CANNOT be undone. All your wardrobe items, uploaded photos, saved outfits, and shopping lists will be permanently deleted."
        confirmLabel="Permanently Delete Account"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign out?"
        message="You will need to sign in again to access your digital wardrobe."
        confirmLabel="Sign Out"
        variant="danger"
      />
    </div>
  );
}
