import { z } from 'zod';

export const vehicleMakes = [
  'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler',
  'Dodge', 'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jeep', 'Kia',
  'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz', 'Nissan', 'Porsche',
  'Ram', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo', 'Other'
] as const;

export const vehicleYears = Array.from(
  { length: 26 },
  (_, i) => new Date().getFullYear() - i
) as number[];

export const coverageTypes = [
  { value: 'basic_liability', label: 'Basic Liability', description: 'Minimum required coverage' },
  { value: 'full_coverage', label: 'Full Coverage', description: 'Liability + collision + comprehensive' },
  { value: 'comprehensive', label: 'Comprehensive', description: 'Full protection with added benefits' },
] as const;

export const leadFormSchema = z.object({
  // Personal Information
  fullName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string()
    .email('Please enter a valid email address'),
  phone: z.string()
    .min(10, 'Please enter a valid 10-digit phone number')
    .max(20, 'Phone number is too long')
    .regex(/^[\d\s\-\(\)\+]+$/, 'Please enter a valid phone number'),

  // Vehicle Information
  vehicleMake: z.string()
    .min(1, 'Please select a vehicle make'),
  vehicleModel: z.string()
    .min(1, 'Please enter the vehicle model')
    .max(50, 'Model name is too long'),
  vehicleYear: z.string()
    .min(1, 'Please select the vehicle year'),
  vinNumber: z.string()
    .max(17, 'VIN must be 17 characters or less')
    .optional()
    .or(z.literal('')),

  // Coverage Preferences
  coverageType: z.enum(['basic_liability', 'full_coverage', 'comprehensive'], {
    errorMap: () => ({ message: 'Please select a coverage type' }),
  }),
  hasCurrentInsurance: z.boolean().optional(),
  coverageStartDate: z.string().optional(),

  // Additional Information
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;

export interface LeadFormDataWithMeta extends LeadFormData {
  source: string;
  createdAt: string;
  leadId?: string;
}
