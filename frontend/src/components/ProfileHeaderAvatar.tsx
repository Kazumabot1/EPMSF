import { useCallback, useEffect, useMemo, useState } from 'react';
import { profileService, type UserProfile } from '../services/profileService';

type ProfileHeaderAvatarProps = {
  name?: string | null;
  email?: string | null;
  className: string;
};

const initials = (name?: string | null, email?: string | null) => {
  const source = name?.trim() || email?.trim() || 'User';

  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'U'
  );
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

const ProfileHeaderAvatar = ({
  name,
  email,
  className,
}: ProfileHeaderAvatarProps) => {
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

  const src = useMemo(() => imageSrc(profile), [profile]);

  const displayName = profile?.fullName || name || profile?.email || email || 'User';
  const displayEmail = profile?.email || email || '';

  return (
    <span className={className} aria-hidden>
      {src ? (
        <img
          src={src}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 'inherit',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        initials(displayName, displayEmail)
      )}
    </span>
  );
};

export default ProfileHeaderAvatar;