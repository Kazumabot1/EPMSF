import { z } from 'zod';

export const employeeFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  email: z.string().email('Enter a valid email').or(z.literal('')),
  staffNrc: z.string().optional(),
  gender: z.string().optional(),
  race: z.string().optional(),
  religion: z.string().optional(),
  dateOfBirth: z.string().optional(),
  contactAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  maritalStatus: z.string().optional(),
  spouseName: z.string().optional(),
  spouseNrc: z.string().optional(),
  fatherName: z.string().optional(),
  fatherNrc: z.string().optional(),
  positionId: z.string().optional(),
  departmentId: z.string().optional(),
  createLoginAccount: z.boolean().optional(),
  sendTemporaryPasswordEmail: z.boolean().optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export const defaultEmployeeFormValues: EmployeeFormValues = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  email: '',
  staffNrc: '',
  gender: '',
  race: '',
  religion: '',
  dateOfBirth: '',
  contactAddress: '',
  permanentAddress: '',
  maritalStatus: '',
  spouseName: '',
  spouseNrc: '',
  fatherName: '',
  fatherNrc: '',
  positionId: '',
  departmentId: '',
  createLoginAccount: true,
  sendTemporaryPasswordEmail: true,
};

export function formValuesToPayload(values: EmployeeFormValues) {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    phoneNumber: values.phoneNumber,
    email: values.email,
    staffNrc: values.staffNrc,
    gender: values.gender,
    race: values.race,
    religion: values.religion,
    dateOfBirth: values.dateOfBirth,
    contactAddress: values.contactAddress,
    permanentAddress: values.permanentAddress,
    maritalStatus: values.maritalStatus,
    spouseName: values.spouseName,
    spouseNrc: values.spouseNrc,
    fatherName: values.fatherName,
    fatherNrc: values.fatherNrc,
    positionId: (() => {
      if (!values.positionId || values.positionId === '') {
        return null;
      }
      const n = Number.parseInt(values.positionId, 10);
      return Number.isFinite(n) ? n : null;
    })(),
    departmentId: (() => {
      if (!values.departmentId || values.departmentId === '') {
        return null;
      }
      const n = Number.parseInt(values.departmentId, 10);
      return Number.isFinite(n) ? n : null;
    })(),
    createLoginAccount: values.createLoginAccount ?? true,
    sendTemporaryPasswordEmail: values.sendTemporaryPasswordEmail ?? true,
  };
}
