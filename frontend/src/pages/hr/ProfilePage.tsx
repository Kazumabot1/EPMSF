/*Z*/import { useEffect, useMemo, useRef, useState } from 'react';
import {
  profileService,
  type UserProfile,
} from '../../services/profileService';
import { profileImageService } from '../../services/profileImageService';

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

const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_OUTPUT_SIZE = 512;
const PROFILE_IMAGE_PREVIEW_SIZE = 280;
const ALLOWED_PROFILE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

type CropSettings = {
  zoom: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
};

type ImageSize = {
  width: number;
  height: number;
};

const normalizeImageType = (type: string) => (type === 'image/jpg' ? 'image/jpeg' : type);

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

const base64FromDataUrl = (dataUrl: string) => {
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
};

const imageTypeFromDataUrl = (dataUrl: string, fallbackType: string) => {
  const match = dataUrl.match(/^data:([^;]+);base64,/i);
  return normalizeImageType(match?.[1] || fallbackType || 'image/png');
};

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image for cropping.'));
    image.src = src;
  });

const createCroppedProfileImage = async (
  src: string,
  imageType: string,
  crop: CropSettings,
  imageSize: ImageSize,
) => {
  const image = await loadImageElement(src);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Your browser could not prepare the cropped image.');
  }

  const outputSize = PROFILE_IMAGE_OUTPUT_SIZE;
  const previewSize = PROFILE_IMAGE_PREVIEW_SIZE;
  const baseScale = Math.max(
    previewSize / Math.max(imageSize.width, 1),
    previewSize / Math.max(imageSize.height, 1),
  );
  const outputScale = outputSize / previewSize;
  const targetType = normalizeImageType(imageType || 'image/png');

  canvas.width = outputSize;
  canvas.height = outputSize;

  context.clearRect(0, 0, outputSize, outputSize);
  context.save();
  context.translate(
    outputSize / 2 + crop.offsetX * outputScale,
    outputSize / 2 + crop.offsetY * outputScale,
  );
  context.rotate((crop.rotation * Math.PI) / 180);
  context.scale(baseScale * crop.zoom * outputScale, baseScale * crop.zoom * outputScale);
  context.drawImage(image, -imageSize.width / 2, -imageSize.height / 2);
  context.restore();

  return canvas.toDataURL(targetType, targetType === 'image/png' ? undefined : 0.92);
};

type ImageCropModalProps = {
  source: string;
  fileType: string;
  onCancel: () => void;
  onApply: (base64: string, imageType: string) => void;
  onError: (message: string) => void;
};

const ImageCropModal = ({
  source,
  fileType,
  onCancel,
  onApply,
  onError,
}: ImageCropModalProps) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [imageSize, setImageSize] = useState<ImageSize>({ width: 1, height: 1 });
  const [applying, setApplying] = useState(false);

  const baseScale = Math.max(
    PROFILE_IMAGE_PREVIEW_SIZE / Math.max(imageSize.width, 1),
    PROFILE_IMAGE_PREVIEW_SIZE / Math.max(imageSize.height, 1),
  );

  const resetCrop = () => {
    setZoom(1);
    setRotation(0);
    setOffsetX(0);
    setOffsetY(0);
  };

  const applyCrop = async () => {
    try {
      setApplying(true);
      const dataUrl = await createCroppedProfileImage(source, fileType, {
        zoom,
        rotation,
        offsetX,
        offsetY,
      }, imageSize);

      onApply(base64FromDataUrl(dataUrl), imageTypeFromDataUrl(dataUrl, fileType));
    } catch (err) {
      onError(getApiErrorMessage(err));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">Crop & Rotate Profile Image</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Adjust the image so it fits cleanly inside every dashboard header avatar.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-xl font-black text-slate-500 transition hover:bg-slate-50"
            aria-label="Close image editor"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col items-center">
            <div className="rounded-[2rem] bg-slate-100 p-5 shadow-inner">
              <div
                className="relative overflow-hidden rounded-full border-4 border-blue-100 bg-white shadow-lg"
                style={{ width: PROFILE_IMAGE_PREVIEW_SIZE, height: PROFILE_IMAGE_PREVIEW_SIZE }}
              >
                <img
                  src={source}
                  alt="Crop preview"
                  className="absolute left-1/2 top-1/2 max-w-none select-none"
                  draggable={false}
                  onLoad={(event) => {
                    const img = event.currentTarget;
                    setImageSize({
                      width: img.naturalWidth || 1,
                      height: img.naturalHeight || 1,
                    });
                  }}
                  style={{
                    width: imageSize.width * baseScale,
                    height: imageSize.height * baseScale,
                    transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg) scale(${zoom})`,
                    transformOrigin: 'center',
                  }}
                />
              </div>
            </div>

            <p className="mt-3 text-center text-xs font-bold text-slate-500">
              This circle is what will be saved and shown in the header.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-blue-600"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">Move Left / Right</span>
                <input
                  type="range"
                  min="-140"
                  max="140"
                  step="1"
                  value={offsetX}
                  onChange={(event) => setOffsetX(Number(event.target.value))}
                  className="w-full accent-blue-600"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">Move Up / Down</span>
                <input
                  type="range"
                  min="-140"
                  max="140"
                  step="1"
                  value={offsetY}
                  onChange={(event) => setOffsetY(Number(event.target.value))}
                  className="w-full accent-blue-600"
                />
              </label>
            </div>

            <div>
              <span className="mb-2 block text-sm font-black text-slate-700">Rotate</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRotation((value) => value - 90)}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Rotate Left
                </button>

                <button
                  type="button"
                  onClick={() => setRotation((value) => value + 90)}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Rotate Right
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetCrop}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={applying}
                onClick={() => void applyCrop()}
                className="rounded-2xl bg-blue-600 px-5 py-2 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {applying ? 'Applying...' : 'Apply Crop'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [cropSource, setCropSource] = useState('');
  const [cropFileType, setCropFileType] = useState('');

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

    if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
      setError('Profile image must be smaller than 5MB.');
      setMessage('');
      return;
    }

    if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type)) {
      setError('Only PNG, JPG, JPEG, or WEBP images are allowed.');
      setMessage('');
      return;
    }

    try {
      setError('');
      setMessage('');

      const dataUrl = await fileToDataUrl(file);

      setCropSource(dataUrl);
      setCropFileType(normalizeImageType(file.type));
    } catch (err) {
      setError(getApiErrorMessage(err));
      setMessage('');
    }
  };

  const cancelCrop = () => {
    setCropSource('');
    setCropFileType('');
  };

  const applyCrop = (base64: string, imageType: string) => {
    setProfileImageData(base64);
    setProfileImageType(imageType);
    setCropSource('');
    setCropFileType('');
    setError('');
    setMessage('');
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

      profileImageService.clearCache();
      setMessage('Profile updated successfully.');
      window.dispatchEvent(new Event('profile-updated'));
      window.dispatchEvent(new Event('epms:profile-avatar-updated'));
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

  const formatRole = (value?: string | null) => {
    const safeValue = value || 'Not assigned';

    return safeValue
      .replace(/^ROLE_/i, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const profileSummaryItems = [
    {
      label: 'Position',
      value: profile?.position || 'Not assigned',
      icon: 'bi-person-badge',
    },
    {
      label: 'Department',
      value: profile?.departmentName || 'Not assigned',
      icon: 'bi-building',
    },
    {
      label: 'Employee Code',
      value: profile?.employeeCode || 'Not assigned',
      icon: 'bi-hash',
    },
    {
      label: 'System Role',
      value: formatRole(profile?.role || profile?.dashboard),
      icon: 'bi-shield-check',
    },
  ];

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-sky-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 p-6 text-white shadow-xl shadow-blue-100">
          <h1 className="text-2xl font-black">My Profile</h1>
          <p className="mt-2 text-sm text-blue-50">
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
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Profile Information</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Your editable contact details are below. Work assignment details are shown here for reference.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {profileSummaryItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-blue-100 bg-blue-50/45 p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-blue-700">
                    <i className={`bi ${item.icon}`} aria-hidden />
                    {item.label}
                  </div>
                  <p className="mt-2 text-sm font-black leading-snug text-slate-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-700">
                  Full Name
                </span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
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
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
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
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  placeholder="+95..."
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={savingProfile}
              className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="h-36 w-36 rounded-full border-4 border-blue-100 object-cover shadow-lg"
                />
              ) : (
                <div className="grid h-36 w-36 place-items-center rounded-full border-4 border-blue-100 bg-blue-50 text-4xl font-black text-blue-700 shadow-lg">
                  {initials(fullName, email)}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                void onImageSelected(e.target.files?.[0]);
                e.currentTarget.value = '';
              }}
            />

            <div className="mt-6 flex justify-center gap-2">
              <button
                type="button"
                onClick={chooseImage}
                className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-100"
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
              PNG, JPG, JPEG, or WEBP. Max 5MB.
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
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
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
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
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
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
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
            className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {changingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>

      {cropSource && (
        <ImageCropModal
          source={cropSource}
          fileType={cropFileType}
          onCancel={cancelCrop}
          onApply={applyCrop}
          onError={(messageText) => {
            setError(messageText);
            setMessage('');
          }}
        />
      )}
    </div>
  );
};

export default ProfilePage;