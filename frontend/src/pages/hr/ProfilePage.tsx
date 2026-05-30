import { useEffect, useMemo, useRef, useState } from 'react';
import {
  profileService,
  type UserProfile,
} from '../../services/profileService';

const getApiErrorMessage = (err: any) => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Request failed.'
  );
};

const initials = (name?: string | null, email?: string | null) => {
  const source = name?.trim() || email?.trim() || 'User';

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const imageSrc = (profile: UserProfile) => {
  if (!profile.profileImageData || !profile.profileImageType) {
    return '';
  }

  if (profile.profileImageData.startsWith('data:')) {
    return profile.profileImageData;
  }

  return `data:${profile.profileImageType};base64,${profile.profileImageData}`;
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIndex = result.indexOf(',');

      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };

    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

const normalizeProfileRole = (value?: string | null) =>
  String(value ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/[\s_-]+/g, '')
    .toUpperCase();

const passwordRules = (password: string) => ({
  hasMinLength: password.length >= 8,
  hasMaxLength: password.length <= 128,
  hasUppercase: /[A-Z]/.test(password),
  hasLowercase: /[a-z]/.test(password),
  hasNumber: /\d/.test(password),
  hasSpecial: /[^A-Za-z0-9]/.test(password),
  hasNoOuterSpaces: password === password.trim(),
});

const ProfilePage = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImageData, setProfileImageData] = useState('');
  const [profileImageType, setProfileImageType] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const previewProfile = useMemo<UserProfile>(() => {
    return {
      ...(profile ?? ({} as UserProfile)),
      fullName,
      email,
      phoneNumber,
      profileImageData,
      profileImageType,
    };
  }, [profile, fullName, email, phoneNumber, profileImageData, profileImageType]);

  const avatarSrc = imageSrc(previewProfile);
  const normalizedRole = normalizeProfileRole(profile?.role);
  const normalizedDashboard = normalizeProfileRole(profile?.dashboard);
  const showDepartmentFields = [
    normalizedRole,
    normalizedDashboard,
  ].some((value) =>
    ['EMPLOYEE', 'EMPLOYEEDASHBOARD', 'MANAGER', 'MANAGERDASHBOARD', 'DEPARTMENTHEAD', 'DEPARTMENTHEADDASHBOARD', 'HR', 'HRDASHBOARD'].includes(value),
  );

  const newPasswordRules = useMemo(
    () => passwordRules(newPassword),
    [newPassword],
  );

  const passwordStrengthCount = useMemo(() => {
    return Object.values(newPasswordRules).filter(Boolean).length;
  }, [newPasswordRules]);

  const passwordStrengthLabel = useMemo(() => {
    if (!newPassword) return 'Not started';
    if (passwordStrengthCount <= 3) return 'Weak';
    if (passwordStrengthCount <= 5) return 'Medium';
    return 'Strong';
  }, [newPassword, passwordStrengthCount]);

  const passwordStrengthClass = useMemo(() => {
    if (!newPassword) return 'bg-slate-100 text-slate-500 border-slate-200';
    if (passwordStrengthCount <= 3) return 'bg-red-50 text-red-700 border-red-200';
    if (passwordStrengthCount <= 5) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }, [newPassword, passwordStrengthCount]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');

      const data = await profileService.getMyProfile();

      setProfile(data);
      setFullName(data.fullName ?? '');
      setEmail(data.email ?? '');
      setPhoneNumber(data.phoneNumber ?? '');
      setProfileImageData(data.profileImageData ?? '');
      setProfileImageType(data.profileImageType ?? '');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const chooseImage = () => {
    fileInputRef.current?.click();
  };

  const onImageSelected = async (file?: File) => {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Profile image must be smaller than 2MB.');
      setMessage('');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setError('Only PNG, JPG, JPEG, or WEBP images are allowed.');
      setMessage('');
      return;
    }

    try {
      setError('');
      setMessage('');

      const base64 = await fileToBase64(file);

      setProfileImageData(base64);
      setProfileImageType(file.type);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setMessage('');
    }
  };

  const removeImage = () => {
    setProfileImageData('');
    setProfileImageType('');
    setError('');
    setMessage('');
  };

  const validateProfileBeforeSubmit = () => {
    if (!fullName.trim()) {
      return 'Full name is required.';
    }

    if (!email.trim()) {
      return 'Email is required.';
    }

    if (!email.includes('@') || !email.includes('.')) {
      return 'Please enter a valid email address.';
    }

    return '';
  };

  const saveProfile = async () => {
    const validationError = validateProfileBeforeSubmit();

    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }

    try {
      setSavingProfile(true);
      setError('');
      setMessage('');

      const updated = await profileService.updateMyProfile({
        fullName,
        email,
        phoneNumber,
        profileImageData,
        profileImageType,
      });

      setProfile(updated);
      setFullName(updated.fullName ?? '');
      setEmail(updated.email ?? '');
      setPhoneNumber(updated.phoneNumber ?? '');
      setProfileImageData(updated.profileImageData ?? '');
      setProfileImageType(updated.profileImageType ?? '');

    setMessage('Profile updated successfully.');
    window.dispatchEvent(new Event('profile-updated'));
    } catch (err) {
      setError(getApiErrorMessage(err));
      setMessage('');
    } finally {
      setSavingProfile(false);
    }
  };

  const validatePasswordBeforeSubmit = () => {
    if (!currentPassword.trim()) {
      return 'Current password is required.';
    }

    if (!newPassword.trim()) {
      return 'New password is required.';
    }

    if (!confirmPassword.trim()) {
      return 'Confirm password is required.';
    }

    if (newPassword !== confirmPassword) {
      return 'New password and confirm password do not match.';
    }

    if (newPassword !== newPassword.trim()) {
      return 'Password must not start or end with spaces.';
    }

    if (newPassword.length < 8) {
      return 'New password must be at least 8 characters.';
    }

    if (newPassword.length > 128) {
      return 'New password must be 128 characters or less.';
    }

    if (!/[A-Z]/.test(newPassword)) {
      return 'New password must contain at least one uppercase letter.';
    }

    if (!/[a-z]/.test(newPassword)) {
      return 'New password must contain at least one lowercase letter.';
    }

    if (!/\d/.test(newPassword)) {
      return 'New password must contain at least one number.';
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return 'New password must contain at least one special character.';
    }

    if (currentPassword === newPassword) {
      return 'New password must be different from current password.';
    }

    const lowerPassword = newPassword.toLowerCase();
    const lowerEmailName = email.includes('@')
      ? email.slice(0, email.indexOf('@')).toLowerCase()
      : email.toLowerCase();

    if (lowerEmailName.length >= 3 && lowerPassword.includes(lowerEmailName)) {
      return 'Password must not contain your email name.';
    }

    const nameParts = fullName
      .toLowerCase()
      .split(/\s+/)
      .filter((part) => part.length >= 3);

    if (nameParts.some((part) => lowerPassword.includes(part))) {
      return 'Password must not contain your name.';
    }

    return '';
  };

  const changePassword = async () => {
    const validationError = validatePasswordBeforeSubmit();

    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }

    try {
      setChangingPassword(true);
      setError('');
      setMessage('');

      await profileService.changeMyPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password changed successfully. Please use your new password next time you log in.');
    } catch (err) {
      setError(getApiErrorMessage(err));
      setMessage('');
    } finally {
      setChangingPassword(false);
    }
  };

  const RuleItem = ({
    valid,
    children,
  }: {
    valid: boolean;
    children: React.ReactNode;
  }) => (
    <li
      className={`flex items-center gap-2 text-xs font-bold ${
        valid ? 'text-emerald-700' : 'text-slate-500'
      }`}
    >
      <span
        className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
          valid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
        }`}
      >
        {valid ? '✓' : '•'}
      </span>
      {children}
    </li>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-sm">
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-xl">
          <h1 className="text-2xl font-black">My Profile</h1>
          <p className="mt-2 text-sm text-indigo-100">
            Update your profile picture, Gmail/email, phone number, and password.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Profile Information</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">
                  Full Name
                </span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Your name"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">
                  Gmail / Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  placeholder="your.email@gmail.com"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-bold text-slate-700">
                  Phone Number
                </span>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  placeholder="+95..."
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">
                  Position Name
                </span>
                <input
                  value={profile?.positionName ?? profile?.position ?? ''}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
                  disabled
                  placeholder="Position not assigned"
                />
              </label>

              {showDepartmentFields && (
                <>
                  <label className="block">
                    <span className="mb-1 block text-sm font-bold text-slate-700">
                      Current Department
                    </span>
                    <input
                      value={profile?.currentDepartmentName ?? profile?.departmentName ?? ''}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
                      disabled
                      placeholder="Department not assigned"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-sm font-bold text-slate-700">
                      Parent Department
                    </span>
                    <input
                      value={profile?.parentDepartmentName ?? ''}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
                      disabled
                      placeholder="Parent department not assigned"
                    />
                  </label>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={savingProfile}
              className="mt-6 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Profile Image</h2>

            <div className="mt-6 flex justify-center">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="h-36 w-36 rounded-full border-4 border-indigo-100 object-cover shadow-lg"
                />
              ) : (
                <div className="grid h-36 w-36 place-items-center rounded-full border-4 border-indigo-100 bg-indigo-50 text-4xl font-black text-indigo-700 shadow-lg">
                  {initials(fullName, email)}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => void onImageSelected(e.target.files?.[0])}
            />

            <div className="mt-6 flex justify-center gap-2">
              <button
                type="button"
                onClick={chooseImage}
                className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
              >
                Upload Image
              </button>

              <button
                type="button"
                onClick={removeImage}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Remove
              </button>
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500">
              PNG, JPG, JPEG, or WEBP. Max 2MB.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Change Password</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Use a strong password that is different from your current password.
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${passwordStrengthClass}`}
            >
              Strength: {passwordStrengthLabel}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-700">
                Current Password
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                autoComplete="current-password"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-700">
                New Password
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                autoComplete="new-password"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-700">
                Confirm Password
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                autoComplete="new-password"
              />
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-black text-slate-700">
              Password requirements
            </p>

            <ul className="grid gap-2 md:grid-cols-2">
              <RuleItem valid={newPasswordRules.hasMinLength}>
                At least 8 characters
              </RuleItem>
              <RuleItem valid={newPasswordRules.hasMaxLength}>
                128 characters or less
              </RuleItem>
              <RuleItem valid={newPasswordRules.hasUppercase}>
                One uppercase letter
              </RuleItem>
              <RuleItem valid={newPasswordRules.hasLowercase}>
                One lowercase letter
              </RuleItem>
              <RuleItem valid={newPasswordRules.hasNumber}>
                One number
              </RuleItem>
              <RuleItem valid={newPasswordRules.hasSpecial}>
                One special character
              </RuleItem>
              <RuleItem valid={newPasswordRules.hasNoOuterSpaces}>
                No starting or ending spaces
              </RuleItem>
              <RuleItem valid={!newPassword || currentPassword !== newPassword}>
                Different from current password
              </RuleItem>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => void changePassword()}
            disabled={changingPassword}
            className="mt-6 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-purple-200 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {changingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
