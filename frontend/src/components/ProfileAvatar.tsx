
import { useEffect, useMemo, useState } from 'react';
import { profileImageService } from '../services/profileImageService';

type ProfileAvatarProps = {
  userId?: number | string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profileImageData?: string | null;
  profileImageType?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  subtitle?: string | null;
  className?: string;
};

const sizeClass = {
  xs: 'employee-avatar-xs',
  sm: 'employee-avatar-sm',
  md: 'employee-avatar-md',
  lg: 'employee-avatar-lg',
  xl: 'employee-avatar-xl',
};

const toNumber = (value?: number | string | null) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const getDisplayName = ({
  fullName,
  firstName,
  lastName,
  email,
}: Pick<ProfileAvatarProps, 'fullName' | 'firstName' | 'lastName' | 'email'>) => {
  const joined = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return fullName?.trim() || joined || email?.trim() || 'User';
};

const getInitials = (name: string, email?: string | null) => {
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

const getImageSrc = (data?: string | null, type?: string | null) => {
  if (!data) return '';
  if (data.startsWith('data:')) return data;
  return `data:${type || 'image/png'};base64,${data}`;
};

const ProfileAvatar = ({
  userId,
  fullName,
  firstName,
  lastName,
  email,
  profileImageData,
  profileImageType,
  size = 'sm',
  showName = false,
  subtitle,
  className = '',
}: ProfileAvatarProps) => {
  const numericUserId = toNumber(userId);
  const [remoteImageData, setRemoteImageData] = useState(profileImageData ?? '');
  const [remoteImageType, setRemoteImageType] = useState(profileImageType ?? '');

  const name = useMemo(
    () => getDisplayName({ fullName, firstName, lastName, email }),
    [fullName, firstName, lastName, email],
  );

  useEffect(() => {
    let cancelled = false;

    if (profileImageData) {
      setRemoteImageData(profileImageData);
      setRemoteImageType(profileImageType ?? '');
      return;
    }

    if (!numericUserId) {
      setRemoteImageData('');
      setRemoteImageType('');
      return;
    }

    profileImageService
      .getUserProfileImage(numericUserId)
      .then((image) => {
        if (cancelled) return;
        setRemoteImageData(image.profileImageData ?? '');
        setRemoteImageType(image.profileImageType ?? '');
      })
      .catch(() => {
        if (cancelled) return;
        setRemoteImageData('');
        setRemoteImageType('');
      });

    return () => {
      cancelled = true;
    };
  }, [numericUserId, profileImageData, profileImageType]);

  const src = getImageSrc(remoteImageData, remoteImageType);

  return (
    <div className={`employee-avatar-wrap ${className}`.trim()}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`employee-avatar-image ${sizeClass[size]}`}
          style={{ objectFit: 'cover', display: 'block', maxWidth: '100%', maxHeight: '100%' }}
          loading="lazy"
        />
      ) : (
        <span className={`employee-avatar-initials ${sizeClass[size]}`}>
          {getInitials(name, email)}
        </span>
      )}

      {showName && (
        <span className="employee-avatar-text">
          <strong title={name}>{name}</strong>
          {subtitle && <small title={subtitle}>{subtitle}</small>}
        </span>
      )}
    </div>
  );
};

export default ProfileAvatar;
