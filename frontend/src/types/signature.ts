export type Role = 'CEO' | 'HR' | 'DEPARTMENT_HEAD' | 'MANAGER' | 'HRADMIN' | 'EMPLOYEE';

export type SignatureSourceType = 'DRAWN' | 'UPLOADED';

export interface Signature {
  id: number;
  userId: number;
  role: Role;
  name: string;
  imageData: string;
  imageType: string;
  sourceType: SignatureSourceType;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureCreateRequest {
  name: string;
  imageData: string;
  imageType: string;
  sourceType: SignatureSourceType;
  isDefault?: boolean;
}

export interface SignatureUpdateRequest {
  name: string;
  imageData?: string;
  imageType?: string;
  sourceType?: SignatureSourceType;
}
