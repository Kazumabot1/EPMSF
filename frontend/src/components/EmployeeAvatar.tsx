type EmployeeAvatarProps = {
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

const getDisplayName = ({
  fullName,
  firstName,
  lastName,
  email,
}: Pick<EmployeeAvatarProps, 'fullName' | 'firstName' | 'lastName' | 'email'>) => {
  const joinedName = `${firstName ?? ''} ${lastName ?? ''}`.trim();

  return fullName?.trim() || joinedName || email?.trim() || 'User';
};

const getInitials = (name?: string | null, email?: string | null) => {
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

const getImageSrc = (
  profileImageData?: string | null,
  profileImageType?: string | null,
) => {
  if (!profileImageData) {
    return '';
  }

  if (profileImageData.startsWith('data:')) {
    return profileImageData;
  }

  return `data:${profileImageType || 'image/png'};base64,${profileImageData}`;
};

const EmployeeAvatar = ({
  fullName,
  firstName,
  lastName,
  email,
  profileImageData,
  profileImageType,
  size = 'md',
  showName = false,
  subtitle,
  className = '',
}: EmployeeAvatarProps) => {
  const name = getDisplayName({ fullName, firstName, lastName, email });
  const src = getImageSrc(profileImageData, profileImageType);

  return (
    <div className={`employee-avatar-wrap ${className}`.trim()}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`employee-avatar-image ${sizeClass[size]}`}
          style={{ objectFit: 'cover', display: 'block', maxWidth: '100%', maxHeight: '100%' }}
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

export default EmployeeAvatar;