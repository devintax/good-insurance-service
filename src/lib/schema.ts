import { z } from 'zod'

const phoneRegex = /^[\d\s\-\(\)]{10,20}$/
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value)
const optionalString = z.preprocess(emptyToUndefined, z.string().optional())
const requiredString = (message: string) => z.string().trim().min(1, message)
const vinField = z
  .string()
  .trim()
  .refine((value) => value === '' || value.length === 17, 'Enter a 17-character VIN')
  .optional()
  .or(z.literal(''))
const boolField = z.preprocess((value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}, z.boolean())

export const AdditionalDriverSchema = z.object({
  first_name: requiredString('First name required'),
  last_name: requiredString('Last name required'),
  date_of_birth: requiredString('Date of birth required'),
  drivers_license: requiredString("Driver's license required"),
  excluded: boolField,
  defensive_driving: z.enum(['none', 'basic', 'advanced']).default('none'),
})

export const LeadFormSchema = z
  .object({
    first_name: z.string().trim().min(2, 'First name required'),
    last_name: z.string().trim().min(2, 'Last name required'),
    gender: z.enum(['male', 'female'], { required_error: 'Select gender' }),
    date_of_birth: requiredString('Date of birth required'),
    drivers_license: requiredString("Driver's license required"),
    email: z.string().email('Enter a valid email address'),
    phone_home: z.string().regex(phoneRegex, 'Enter a valid phone number'),
    phone_cell_work: z.string().regex(phoneRegex).optional().or(z.literal('')),
    address: z.string().trim().min(5, 'Address required'),
    city: z.string().trim().min(2, 'City required'),
    state: z.string().length(2).default('DE'),
    zip: z.string().regex(/^\d{5}$/, 'Enter a valid 5-digit ZIP'),
    marital_status: z.enum(['single', 'married', 'divorced', 'separated', 'widow']),
    housing_status: z.enum(['rent', 'own', 'live_with_parents', 'other']),
    licensed_over_3yrs: boolField,
    drivers_in_household: z.coerce.number().int('Enter a whole number').min(1, 'Enter at least 1 driver'),
    additional_drivers: z.array(AdditionalDriverSchema).default([]),
    has_current_insurance: boolField,
    current_insurance_company: optionalString,
    coverage_type: z.enum(['full_coverage', 'liability']),
    has_lien_holder: boolField,
    lien_holder_name: optionalString,
    veh1_year: z.string().regex(/^\d{4}$/, 'Enter a valid year'),
    veh1_make: requiredString('Make required'),
    veh1_model: requiredString('Model required'),
    veh1_vin: vinField,
    veh1_body_type: z.enum(['2dr', '4dr', 'pickup', 'convertible', '4x4', '4x2']).optional(),
    veh2_year: optionalString,
    veh2_make: optionalString,
    veh2_model: optionalString,
    veh2_vin: vinField,
    veh2_body_type: z.enum(['2dr', '4dr', 'pickup', 'convertible', '4x4', '4x2', '']).optional(),
    veh3_year: optionalString,
    veh3_make: optionalString,
    veh3_model: optionalString,
    veh3_vin: vinField,
    veh3_body_type: z.enum(['2dr', '4dr', 'pickup', 'convertible', '4x4', '4x2', '']).optional(),
    has_violations: boolField,
    violation_1_type: optionalString,
    violation_1_date: optionalString,
    violation_2_type: optionalString,
    violation_2_date: optionalString,
    violation_3_type: optionalString,
    violation_3_date: optionalString,
    referral_source: optionalString,
    notes: z.string().max(500).optional().or(z.literal('')),
    date_of_inquiry: z.string().default(() => new Date().toISOString()),
  })
  .superRefine((data, ctx) => {
    const requiredAdditionalDrivers = Math.max(data.drivers_in_household - 1, 0)
    if (data.additional_drivers.length !== requiredAdditionalDrivers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Add ${requiredAdditionalDrivers} additional driver${requiredAdditionalDrivers === 1 ? '' : 's'} to match the household count`,
        path: ['additional_drivers'],
      })
    }
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
