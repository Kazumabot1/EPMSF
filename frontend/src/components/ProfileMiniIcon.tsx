/*Z*/import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService, type UserProfile } from '../services/profileService';

type ProfileMiniIconProps = {
  fallbackName?: string | null;
  fallbackEmail?: string | null;
  fallbackRole?: string | null;
};

const initials = (name?: string | null, email?: string | null) => {
  const source = name?.trim() || email?.trim() || 'User';

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';
};

const imageSrc = (profile?: UserProfile | null) => {
  if (!profile?.profileImageData || !profile?.profileImageType) {
    return '';
  }

  if (profile.profileImageData.startsWith('data:')) {
    return profile.profileImageData;
  }

  return `data:${profile.profileImageType};base64,${profile.profileImageData}`;
};

const formatRole = (role?: string | null) => {
  const safeRole = role || 'Profile';

  return safeRole
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const displayMeta = (
  profile?: UserProfile | null,
  fallbackRole?: string | null,
) => {
  return formatRole(profile?.role || profile?.dashboard || fallbackRole);
};

const ProfileMiniIcon = ({
  fallbackName,
  fallbackEmail,
  fallbackRole,
}: ProfileMiniIconProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const data = await profileService.getMyProfile();
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    void loadProfile();

    const refresh = () => {
      void loadProfile();
    };

    window.addEventListener('focus', refresh);
    window.addEventListener('profile-updated', refresh);

    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('profile-updated', refresh);
    };
  }, [loadProfile]);

  const avatarSrc = useMemo(() => imageSrc(profile), [profile]);

  const name =
    profile?.fullName ||
    fallbackName ||
    profile?.email ||
    fallbackEmail ||
    'My Profile';

  const email = profile?.email || fallbackEmail || '';

  return (
    <button
      type="button"
      onClick={() => navigate('/profile')}
      title="Open profile"
      className="profile-mini-button"
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt="Profile"
          className="profile-mini-avatar"
        />
      ) : (
        <span className="profile-mini-initials">
          {initials(name, email)}
        </span>
      )}

      <span className="profile-mini-text">
        <strong>{name}</strong>
        <small>{displayMeta(profile, fallbackRole)}</small>
      </span>
    </button>
  );
};

export default ProfileMiniIcon;