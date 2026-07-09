import { z } from 'zod'

const phoneRegex = /^[\d\s\-\(\)]{10,20}$/

export const LeadFormSchema = z
  .object({
    first_name: z.string().min(2, 'First name required'),
    last_name: z.string().min(2, 'Last name required'),
    gender: z.enum(['male', 'female'], { required_error: 'Select gender' }),
    date_of_birth: z.string().min(1, 'Date of birth required'),
    drivers_license: z.string().min(1, "Driver's license required"),
    email: z.string().email('Enter a valid email address'),
    phone_home: z.string().regex(phoneRegex, 'Enter a valid phone number'),
    phone_cell_work: z.string().regex(phoneRegex).optional().or(z.literal('')),
    address: z.string().min(5, 'Address required'),
    city: z.string().min(2, 'City required'),
    state: z.string().length(2).default('DE'),
    zip: z.string().regex(/^\d{5}$/, 'Enter a valid 5-digit ZIP'),
    marital_status: z.enum(['single', 'married', 'divorced', 'separated', 'widow']),
    housing_status: z.enum(['rent', 'own', 'live_with_parents', 'other']),
    licensed_over_3yrs: z.boolean(),
    drivers_in_household: z.number().int().min(1).max(10),
    driver2_first_name: z.string().optional(),
    driver2_last_name: z.string().optional(),
    driver2_date_of_birth: z.string().optional(),
    driver2_drivers_license: z.string().optional(),
    driver2_excluded: z.boolean().optional(),
    driver2_defensive_driving: z.enum(['none', 'basic', 'advanced']).optional(),
    has_current_insurance: z.boolean(),
    current_insurance_company: z.string().optional(),
    coverage_type: z.enum(['full_coverage', 'liability']),
    has_lien_holder: z.boolean(),
    lien_holder_name: z.string().optional(),
    veh1_year: z.string().regex(/^\d{4}$/, 'Enter a valid year'),
    veh1_make: z.string().min(1, 'Make required'),
    veh1_model: z.string().min(1, 'Model required'),
    veh1_vin: z.string().length(17).optional().or(z.literal('')),
    veh1_body_type: z.enum(['2dr', '4dr', 'pickup', 'convertible', '4x4', '4x2']).optional(),
    veh2_year: z.string().optional(),
    veh2_make: z.string().optional(),
    veh2_model: z.string().optional(),
    veh2_vin: z.string().optional(),
    veh2_body_type: z.enum(['2dr', '4dr', 'pickup', 'convertible', '4x4', '4x2', '']).optional(),
    veh3_year: z.string().optional(),
    veh3_make: z.string().optional(),
    veh3_model: z.string().optional(),
    veh3_vin: z.string().optional(),
    veh3_body_type: z.enum(['2dr', '4dr', 'pickup', 'convertible', '4x4', '4x2', '']).optional(),
    has_violations: z.boolean(),
    violation_1_type: z.string().optional(),
    violation_1_date: z.string().optional(),
    violation_2_type: z.string().optional(),
    violation_2_date: z.string().optional(),
    violation_3_type: z.string().optional(),
    violation_3_date: z.string().optional(),
    referral_source: z.string().optional(),
    notes: z.string().max(500).optional(),
    date_of_inquiry: z.string().default(() => new Date().toISOString()),
  })
  .superRefine((data, ctx) => {
    if (data.has_current_insurance && !data.current_insurance_company) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter your current insurance company',
        path: ['current_insurance_company'],
      })
    }
    if (data.has_lien_holder && !data.lien_holder_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter the lien holder name',
        path: ['lien_holder_name'],
      })
    }
    if (data.has_violations && !data.violation_1_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Describe the violation',
        path: ['violation_1_type'],
      })
    }
  })

export type LeadFormData = z.infer<typeof LeadFormSchema>
