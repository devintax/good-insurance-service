import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  Award,
  BadgeCheck,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  ShieldCheck,
  Star,
  Users,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Controller,
  type FieldErrors,
  type FieldPath,
  type UseFormRegister,
  useForm,
} from 'react-hook-form'
import { LeadFormSchema, type LeadFormData } from './lib/schema'

const API_URL = import.meta.env.VITE_API_URL || ''

const makes = [
  'Acura',
  'Alfa Romeo',
  'Audi',
  'BMW',
  'Buick',
  'Cadillac',
  'Chevrolet',
  'Chrysler',
  'Dodge',
  'Ford',
  'GMC',
  'Honda',
  'Hyundai',
  'Infiniti',
  'Jeep',
  'Kia',
  'Lexus',
  'Lincoln',
  'Mazda',
  'Mercedes-Benz',
  'Mitsubishi',
  'Nissan',
  'Ram',
  'Subaru',
  'Tesla',
  'Toyota',
  'Volkswagen',
  'Volvo',
  'Other',
]

const states = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'MD',
  'NJ',
  'NY',
  'PA',
  'VA',
  'WV',
  'DC',
]

const stepLabels = ['Personal', 'Drivers', 'Insurance', 'Vehicles', 'History', 'Finish']

const stats = [
  { icon: Star, value: '4.9/5', label: 'Customer Rating', color: 'text-amber-500' },
  { icon: Clock, value: '15+ Years', label: 'Experience', color: 'text-blue-600' },
  { icon: Users, value: '5,000+', label: 'Happy Customers', color: 'text-teal-600' },
  { icon: Award, value: '24/7', label: 'Support', color: 'text-purple-600' },
]

const contactActions = [
  { icon: Phone, label: 'Call Us', value: '(302) 322-5515', href: 'tel:+13023225515', tone: 'border-blue-100 bg-blue-50/80 text-blue-700' },
  { icon: MessageCircle, label: 'Text Us', value: '(302) 648-7858', href: 'sms:+13026487858', tone: 'border-teal-100 bg-teal-50/80 text-teal-700' },
  { icon: MessageCircle, label: 'WhatsApp', value: '(302) 522-6002', href: 'https://wa.me/13025226002', tone: 'border-emerald-100 bg-emerald-50/80 text-emerald-700' },
  { icon: Mail, label: 'Email', value: 'gis@dfgbusiness.com', href: 'mailto:gis@dfgbusiness.com', tone: 'border-purple-100 bg-purple-50/80 text-purple-700' },
]

const trustItems = [
  { icon: ShieldCheck, label: 'Secure & Private' },
  { icon: CheckCircle2, label: 'No Obligation' },
  { icon: Clock, label: '24hr Response' },
]

const valueCards = [
  {
    icon: Car,
    title: 'All Vehicle Types',
    text: 'Whether you drive a sedan, SUV, truck, or sports car, we have coverage options tailored to your vehicle.',
  },
  {
    icon: Heart,
    title: 'Personalized Service',
    text: 'Our experienced agents take the time to understand your needs and find coverage that fits your life.',
  },
  {
    icon: Award,
    title: 'Best Price Guaranteed',
    text: 'We shop multiple carriers to find competitive rates without sacrificing quality coverage.',
  },
]

const testimonials = [
  {
    quote: 'Saved me over $400 a year! The process was so easy, and they found me better coverage than I had before.',
    name: 'Michael R.',
    location: 'New Castle, DE',
    initials: 'M',
  },
  {
    quote: "After my accident, they handled everything personally. I didn't have to stress about a single thing.",
    name: 'Sarah T.',
    location: 'Wilmington, DE',
    initials: 'S',
  },
  {
    quote: "Professional, friendly, and they actually listen. I've been with them for 5 years now and couldn't be happier.",
    name: 'James L.',
    location: 'Dover, DE',
    initials: 'J',
  },
]

const stepFields: Record<number, FieldPath<LeadFormData>[]> = {
  1: [
    'first_name',
    'last_name',
    'gender',
    'date_of_birth',
    'drivers_license',
    'email',
    'phone_home',
    'phone_cell_work',
    'address',
    'city',
    'state',
    'zip',
    'marital_status',
    'housing_status',
  ],
  2: [
    'licensed_over_3yrs',
    'drivers_in_household',
    'driver2_first_name',
    'driver2_last_name',
    'driver2_date_of_birth',
    'driver2_drivers_license',
    'driver2_excluded',
    'driver2_defensive_driving',
  ],
  3: [
    'has_current_insurance',
    'current_insurance_company',
    'coverage_type',
    'has_lien_holder',
    'lien_holder_name',
  ],
  4: [
    'veh1_year',
    'veh1_make',
    'veh1_model',
    'veh1_vin',
    'veh1_body_type',
    'veh2_year',
    'veh2_make',
    'veh2_model',
    'veh2_vin',
    'veh2_body_type',
    'veh3_year',
    'veh3_make',
    'veh3_model',
    'veh3_vin',
    'veh3_body_type',
  ],
  5: [
    'has_violations',
    'violation_1_type',
    'violation_1_date',
    'violation_2_type',
    'violation_2_date',
    'violation_3_type',
    'violation_3_date',
  ],
  6: ['referral_source', 'notes'],
}

type InputProps = {
  label: string
  name: FieldPath<LeadFormData>
  register: UseFormRegister<LeadFormData>
  errors: FieldErrors<LeadFormData>
  type?: string
  placeholder?: string
  required?: boolean
  rows?: number
  maxLength?: number
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="input-error">{message}</p> : null
}

function TextInput({
  label,
  name,
  register,
  errors,
  type = 'text',
  placeholder,
  required,
  rows,
  maxLength,
}: InputProps) {
  const error = errors[name]?.message as string | undefined

  return (
    <label className="focus-scale block transition duration-200">
      <span className="form-label">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      {rows ? (
        <textarea
          {...register(name)}
          className={`input-field h-auto resize-none ${error ? 'error' : ''}`}
          maxLength={maxLength}
          placeholder={placeholder}
          rows={rows}
        />
      ) : (
        <input
          {...register(name)}
          className={`input-field ${error ? 'error' : ''}`}
          maxLength={maxLength}
          placeholder={placeholder}
          type={type}
        />
      )}
      <FieldError message={error} />
    </label>
  )
}

function SelectInput({
  label,
  name,
  register,
  errors,
  children,
  required,
}: {
  label: string
  name: FieldPath<LeadFormData>
  register: UseFormRegister<LeadFormData>
  errors: FieldErrors<LeadFormData>
  children: React.ReactNode
  required?: boolean
}) {
  const error = errors[name]?.message as string | undefined

  return (
    <label className="focus-scale block transition duration-200">
      <span className="form-label">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <select {...register(name)} className={`input-field ${error ? 'error' : ''}`}>
        {children}
      </select>
      <FieldError message={error} />
    </label>
  )
}

function BooleanRadio({
  control,
  name,
  label,
  errors,
  yesLabel = 'Yes',
  noLabel = 'No',
}: {
  control: ReturnType<typeof useForm<LeadFormData>>['control']
  name: FieldPath<LeadFormData>
  label: string
  errors: FieldErrors<LeadFormData>
  yesLabel?: string
  noLabel?: string
}) {
  const error = errors[name]?.message as string | undefined

  return (
    <div>
      <span className="form-label">
        {label} <span className="text-red-500">*</span>
      </span>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="grid grid-cols-2 gap-3">
            {[{ label: yesLabel, value: true }, { label: noLabel, value: false }].map((option) => (
              <button
                className={`option-card ${field.value === option.value ? 'active' : ''}`}
                key={option.label}
                onClick={() => field.onChange(option.value)}
                type="button"
              >
                <span
                  className={`mt-1 h-4 w-4 rounded-full border ${
                    field.value === option.value ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  }`}
                />
                <span className="font-semibold text-slate-800">{option.label}</span>
              </button>
            ))}
          </div>
        )}
      />
      <FieldError message={error} />
    </div>
  )
}

function EnumRadio<T extends string>({
  control,
  name,
  label,
  options,
  errors,
  required = true,
}: {
  control: ReturnType<typeof useForm<LeadFormData>>['control']
  name: FieldPath<LeadFormData>
  label: string
  options: Array<{ value: T; label: string; description?: string }>
  errors: FieldErrors<LeadFormData>
  required?: boolean
}) {
  const error = errors[name]?.message as string | undefined

  return (
    <div>
      <span className="form-label">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((option) => (
              <button
                className={`option-card ${field.value === option.value ? 'active' : ''}`}
                key={option.value}
                onClick={() => field.onChange(option.value)}
                type="button"
              >
                <span
                  className={`mt-1 h-4 w-4 rounded-full border ${
                    field.value === option.value ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  }`}
                />
                <span>
                  <span className="block font-semibold text-slate-800">{option.label}</span>
                  {option.description ? (
                    <span className="block text-sm text-slate-500">{option.description}</span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        )}
      />
      <FieldError message={error} />
    </div>
  )
}

function VehicleFields({
  prefix,
  title,
  register,
  errors,
  required,
  years,
}: {
  prefix: 'veh1' | 'veh2' | 'veh3'
  title: string
  register: UseFormRegister<LeadFormData>
  errors: FieldErrors<LeadFormData>
  required?: boolean
  years: string[]
}) {
  const yearName = `${prefix}_year` as FieldPath<LeadFormData>
  const makeName = `${prefix}_make` as FieldPath<LeadFormData>
  const modelName = `${prefix}_model` as FieldPath<LeadFormData>
  const vinName = `${prefix}_vin` as FieldPath<LeadFormData>
  const bodyName = `${prefix}_body_type` as FieldPath<LeadFormData>

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <h3 className="font-heading mb-4 text-lg font-bold text-slate-900">{title}</h3>
      <div className="grid gap-4 md:grid-cols-3">
        <SelectInput errors={errors} label="Year" name={yearName} register={register} required={required}>
          <option value="">Select year</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </SelectInput>
        <SelectInput errors={errors} label="Make" name={makeName} register={register} required={required}>
          <option value="">Select make</option>
          {makes.map((make) => (
            <option key={make} value={make}>
              {make}
            </option>
          ))}
        </SelectInput>
        <TextInput
          errors={errors}
          label="Model"
          name={modelName}
          placeholder="Camry, F-150, Model 3"
          register={register}
          required={required}
        />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <TextInput
          errors={errors}
          label="VIN #"
          maxLength={17}
          name={vinName}
          placeholder="17-character VIN"
          register={register}
        />
        <SelectInput errors={errors} label="Body Type" name={bodyName} register={register} required={required}>
          <option value="">Select body type</option>
          <option value="2dr">2Dr</option>
          <option value="4dr">4Dr</option>
          <option value="pickup">Pick-up</option>
          <option value="convertible">Convertible</option>
          <option value="4x4">4x4</option>
          <option value="4x2">4x2</option>
        </SelectInput>
      </div>
    </section>
  )
}

function ReviewSummary({ data }: { data: Partial<LeadFormData> }) {
  const row = (label: string, value?: unknown) => (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm" key={label}>
      <span className="font-medium text-slate-500">{label}</span>
      <span className="text-right text-slate-800">{String(value || 'Not provided')}</span>
    </div>
  )

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4" open>
      <summary className="cursor-pointer font-heading text-lg font-bold text-slate-900">
        Review your information
      </summary>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <section>
          <h4 className="font-semibold text-slate-900">Personal</h4>
          {[
            row('Name', `${data.first_name || ''} ${data.last_name || ''}`.trim()),
            row('Email', data.email),
            row('Home Phone', data.phone_home),
            row('Address', `${data.address || ''}, ${data.city || ''}, ${data.state || ''} ${data.zip || ''}`),
          ]}
        </section>
        <section>
          <h4 className="font-semibold text-slate-900">Vehicle 1</h4>
          {[
            row('Vehicle', `${data.veh1_year || ''} ${data.veh1_make || ''} ${data.veh1_model || ''}`.trim()),
            row('VIN', data.veh1_vin),
            row('Coverage', data.coverage_type),
            row('Current Insurance', data.has_current_insurance ? 'Yes' : 'No'),
          ]}
        </section>
      </div>
    </details>
  )
}

function BrandMark({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-blue)] text-white shadow-sm">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <div className={compact ? 'hidden sm:block' : ''}>
        <p className={`font-heading text-base font-extrabold leading-tight sm:text-lg ${dark ? 'text-white' : 'text-slate-900'}`}>
          Good Insurance Service
        </p>
        <p className={`text-xs font-semibold ${dark ? 'text-blue-200' : 'text-slate-500'}`}>Trusted Auto Insurance</p>
      </div>
    </div>
  )
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a aria-label="Good Insurance Service home" href="#">
          <BrandMark />
        </a>
        <a
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 sm:text-base"
          href="tel:+13023225515"
        >
          <Phone className="h-4 w-4" />
          <span className="hidden sm:inline">(302) 322-5515</span>
          <span className="sm:hidden">Call</span>
        </a>
      </div>
    </header>
  )
}

function HeroSection({ onQuoteClick }: { onQuoteClick: () => void }) {
  return (
    <section className="px-4 pb-8 pt-12 sm:px-6 sm:pb-10 sm:pt-16 lg:pb-12 lg:pt-20">
      <div className="mx-auto max-w-6xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm font-bold text-teal-700 ring-1 ring-teal-100">
          <BadgeCheck className="h-4 w-4" />
          Licensed & Certified
        </span>
        <h1 className="font-heading mx-auto mt-5 max-w-5xl text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
          Get Your Free Auto Insurance Quote in Minutes
        </h1>
        <p className="mx-auto mt-5 max-w-4xl text-base leading-7 text-slate-600 sm:text-lg lg:text-xl">
          Serving Delaware and surrounding areas. No obligation, no pressure, just honest coverage
          that fits your budget.
        </p>

        <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
          {stats.map(({ icon: Icon, value, label, color }) => (
            <div className="rounded-xl bg-white/45 px-3 py-4 text-center sm:bg-transparent" key={label}>
              <Icon className={`mx-auto h-6 w-6 ${color}`} />
              <p className="mt-3 text-lg font-extrabold text-slate-900">{value}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:gap-5">
          {contactActions.map(({ icon: Icon, label, value, href, tone }) => (
            <a
              className={`flex min-h-16 items-center gap-4 rounded-xl border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tone}`}
              href={href}
              key={label}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>
                <span className="block text-xs font-bold opacity-70">{label}</span>
                <span className="block text-sm font-extrabold sm:text-base">{value}</span>
              </span>
            </a>
          ))}
        </div>
        <button
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 font-heading text-base font-extrabold text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-700 sm:w-auto"
          onClick={onQuoteClick}
          type="button"
        >
          Get a Quote
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  )
}

function TrustBar() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 px-4 py-6 text-sm font-semibold text-slate-500 sm:flex-row sm:gap-8">
      {trustItems.map(({ icon: Icon, label }) => (
        <span className="inline-flex items-center gap-2" key={label}>
          <Icon className="h-5 w-5 text-teal-500" />
          {label}
        </span>
      ))}
    </div>
  )
}

function WhyChooseSection() {
  return (
    <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-extrabold text-slate-950 sm:text-4xl">
            Why Choose Good Insurance Service?
          </h2>
          <p className="mt-3 text-slate-600">Serving Delaware with personalized auto insurance coverage</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {valueCards.map(({ icon: Icon, title, text }) => (
            <article className="rounded-xl bg-slate-50 p-6 shadow-sm ring-1 ring-slate-100" key={title}>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-heading text-lg font-extrabold text-slate-900">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  return (
    <section className="bg-slate-50 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-heading text-center text-3xl font-extrabold text-slate-950 sm:text-4xl">
          What Our Customers Say
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100" key={testimonial.name}>
              <div className="flex gap-1 text-amber-400" aria-label="Five star review">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star className="h-4 w-4 fill-current" key={index} />
                ))}
              </div>
              <p className="mt-4 text-sm italic leading-6 text-slate-700">"{testimonial.quote}"</p>
              <div className="mt-5 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                  {testimonial.initials}
                </span>
                <span>
                  <span className="block font-bold text-slate-900">{testimonial.name}</span>
                  <span className="text-sm text-slate-500">{testimonial.location}</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer({ onQuoteClick }: { onQuoteClick: () => void }) {
  return (
    <footer className="bg-[var(--primary-blue)] px-4 py-10 text-blue-100 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-4">
        <div>
          <BrandMark dark />
          <p className="mt-4 text-sm leading-6">Providing reliable auto insurance coverage to Delaware since 2009.</p>
        </div>
        <div>
          <h3 className="font-heading font-bold text-white">Contact Us</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>(302) 322-5515 (Main)</li>
            <li>(302) 648-7858 (Text)</li>
            <li>gis@dfgbusiness.com</li>
            <li>622 E. Basin Rd, Ste A, New Castle DE 19720</li>
          </ul>
        </div>
        <div>
          <h3 className="font-heading font-bold text-white">Quick Links</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <button className="text-left hover:text-white" onClick={onQuoteClick} type="button">
                Get a Quote
              </button>
            </li>
            <li><a className="hover:text-white" href="#why-choose-us">About Us</a></li>
            <li><a className="hover:text-white" href="tel:+13023225515">Claims</a></li>
            <li><a className="hover:text-white" href="mailto:gis@dfgbusiness.com">FAQs</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-heading font-bold text-white">Legal</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>Privacy Policy</li>
            <li>Terms of Service</li>
            <li>Licenses</li>
            <li className="pt-3 text-blue-200">Fax: (302) 846-7881</li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t border-white/10 pt-6 text-center text-xs text-blue-200">
        <p>© 2026 Good Insurance Service. All rights reserved. Licensed in Delaware.</p>
        <p className="mt-2">Coverage availability varies by state. Not all applicants may qualify.</p>
      </div>
    </footer>
  )
}

export default function App() {
  const [step, setStep] = useState(1)
  const [showVehicle2, setShowVehicle2] = useState(false)
  const [showVehicle3, setShowVehicle3] = useState(false)
  const [incidentRows, setIncidentRows] = useState(1)
  const [submitError, setSubmitError] = useState('')
  const [submittedName, setSubmittedName] = useState('')
  const [showQuoteOverlay, setShowQuoteOverlay] = useState(false)
  const [showThankYouBanner, setShowThankYouBanner] = useState(false)
  const formTopRef = useRef<HTMLDivElement | null>(null)
  const overlayScrollRef = useRef<HTMLElement | null>(null)
  const previousStepRef = useRef(step)

  const years = useMemo(() => {
    const current = new Date().getFullYear() + 1
    return Array.from({ length: current - 1990 + 1 }, (_, index) => String(current - index))
  }, [])

  const {
    control,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    handleSubmit,
    register,
    trigger,
    watch,
  } = useForm<LeadFormData>({
    resolver: zodResolver(LeadFormSchema),
    defaultValues: {
      state: 'DE',
      drivers_in_household: 1,
      phone_cell_work: '',
      date_of_inquiry: new Date().toISOString(),
      veh1_vin: '',
      veh2_year: '',
      veh2_make: '',
      veh2_model: '',
      veh2_vin: '',
      veh2_body_type: '',
      veh3_year: '',
      veh3_make: '',
      veh3_model: '',
      veh3_vin: '',
      veh3_body_type: '',
      notes: '',
    },
  })

  const values = watch()
  const notes = watch('notes') || ''

  useEffect(() => {
    if (!showQuoteOverlay) {
      return
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [showQuoteOverlay])

  useEffect(() => {
    if (previousStepRef.current === step) {
      return
    }

    previousStepRef.current = step

    if (window.matchMedia('(min-width: 768px)').matches) {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    overlayScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  function handleQuoteClick() {
    setShowThankYouBanner(false)

    if (window.matchMedia('(min-width: 768px)').matches) {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    setShowQuoteOverlay(true)
  }

  function closeQuoteOverlay() {
    setShowQuoteOverlay(false)
  }

  async function nextStep() {
    const valid = await trigger(stepFields[step])
    if (valid) {
      setStep((current) => Math.min(current + 1, 6))
      setSubmitError('')
    }
  }

  function previousStep() {
    setStep((current) => Math.max(current - 1, 1))
    setSubmitError('')
  }

  async function onSubmit(data: LeadFormData) {
    setSubmitError('')

    const response = await fetch(`${API_URL}/api/leads`, {
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'Unable to submit quote request')
    }

    setSubmittedName(data.first_name)
  }

  async function submitWithErrorHandling(data: LeadFormData) {
    try {
      await onSubmit(data)
      setShowThankYouBanner(true)
      setShowQuoteOverlay(false)
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to submit quote request')
    }
  }

  return (
    <main className="min-h-screen pb-24 md:pb-0">
      <LandingHeader />
      {showThankYouBanner && !submitError ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-5 max-w-6xl px-4 sm:px-6"
          initial={{ opacity: 0, y: -12 }}
        >
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
            <div>
              <p className="font-heading text-lg font-extrabold">Thank you, {submittedName || 'friend'}!</p>
              <p className="mt-1 text-sm font-medium">Your quote request was submitted. We'll be in touch within 24 hours.</p>
            </div>
          </div>
        </motion.div>
      ) : null}
      <HeroSection onQuoteClick={handleQuoteClick} />
      <section
        className={`${
          showQuoteOverlay
            ? 'fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 px-3 py-3 backdrop-blur-sm'
            : 'hidden px-4 pb-4'
        } md:static md:block md:overflow-visible md:bg-transparent md:px-6 md:pb-4 md:pt-0 md:backdrop-blur-0`}
        id="quote"
        ref={overlayScrollRef}
      >
        {showQuoteOverlay ? (
          <div className="sticky top-0 z-10 mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg md:hidden">
            <BrandMark compact />
            <button
              aria-label="Close quote form"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"
              onClick={closeQuoteOverlay}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : null}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-6xl"
          initial={{ opacity: 0, y: 24 }}
          ref={formTopRef}
          transition={{ duration: 0.45 }}
        >
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="bg-[var(--primary-blue)] px-6 py-5 text-white">
            <h2 className="font-heading text-2xl font-bold">GIS Quote Intake</h2>
            <p className="mt-1 text-sm text-blue-100">Step {step} of 6: {stepLabels[step - 1]}</p>
          </div>

          <div className="border-b border-slate-100 bg-slate-50 px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              {stepLabels.map((label, index) => {
                const number = index + 1
                const active = number <= step
                return (
                  <div className="flex flex-1 items-center last:flex-none" key={label}>
                    <div className="flex flex-col items-center gap-2">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition ${
                          active ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 ring-1 ring-slate-200'
                        }`}
                      >
                        {number}
                      </span>
                      <span className="hidden text-xs font-semibold text-slate-500 sm:block">{label}</span>
                    </div>
                    {number < stepLabels.length ? (
                      <span className={`mx-2 h-1 flex-1 rounded ${number < step ? 'bg-blue-500' : 'bg-slate-200'}`} />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit(submitWithErrorHandling)}>
            <fieldset className="p-6" disabled={isSubmitting}>
              {step === 1 ? (
                <motion.div animate={{ opacity: 1, x: 0 }} className="space-y-5" initial={{ opacity: 0, x: 16 }}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput errors={errors} label="First Name" name="first_name" register={register} required />
                    <TextInput errors={errors} label="Last Name" name="last_name" register={register} required />
                  </div>
                  <EnumRadio
                    control={control}
                    errors={errors}
                    label="Gender"
                    name="gender"
                    options={[
                      { label: 'Male', value: 'male' },
                      { label: 'Female', value: 'female' },
                    ]}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput
                      errors={errors}
                      label="Date of Birth"
                      name="date_of_birth"
                      register={register}
                      required
                      type="date"
                    />
                    <TextInput
                      errors={errors}
                      label="Driver License #"
                      name="drivers_license"
                      register={register}
                      required
                    />
                  </div>
                  <TextInput errors={errors} label="Email Address" name="email" register={register} required type="email" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput
                      errors={errors}
                      label="Home Phone"
                      name="phone_home"
                      placeholder="(302) 555-1234"
                      register={register}
                      required
                      type="tel"
                    />
                    <TextInput
                      errors={errors}
                      label="Cell/Work Phone"
                      name="phone_cell_work"
                      placeholder="(302) 555-1234"
                      register={register}
                      type="tel"
                    />
                  </div>
                  <TextInput errors={errors} label="Street Address" name="address" register={register} required />
                  <div className="grid gap-4 md:grid-cols-[1fr_120px_160px]">
                    <TextInput errors={errors} label="City" name="city" register={register} required />
                    <SelectInput errors={errors} label="State" name="state" register={register} required>
                      {states.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </SelectInput>
                    <TextInput errors={errors} label="ZIP" name="zip" register={register} required />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectInput
                      errors={errors}
                      label="Marital Status"
                      name="marital_status"
                      register={register}
                      required
                    >
                      <option value="">Select status</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="separated">Separated</option>
                      <option value="widow">Widow</option>
                    </SelectInput>
                    <EnumRadio
                      control={control}
                      errors={errors}
                      label="Housing Status"
                      name="housing_status"
                      options={[
                        { label: 'Rent', value: 'rent' },
                        { label: 'Own', value: 'own' },
                        { label: 'Live with Parents', value: 'live_with_parents' },
                        { label: 'Other', value: 'other' },
                      ]}
                    />
                  </div>
                </motion.div>
              ) : null}

              {step === 2 ? (
                <motion.div animate={{ opacity: 1, x: 0 }} className="space-y-5" initial={{ opacity: 0, x: 16 }}>
                  <BooleanRadio
                    control={control}
                    errors={errors}
                    label="Licensed for more than 3 years?"
                    name="licensed_over_3yrs"
                  />
                  <TextInput
                    errors={errors}
                    label="How many drivers in your household?"
                    name="drivers_in_household"
                    register={register}
                    required
                    type="number"
                  />
                  {(values.drivers_in_household || 0) >= 2 ? (
                    <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="font-heading text-lg font-bold text-slate-900">Additional Driver</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <TextInput errors={errors} label="Driver 2 First Name" name="driver2_first_name" register={register} />
                        <TextInput errors={errors} label="Driver 2 Last Name" name="driver2_last_name" register={register} />
                        <TextInput
                          errors={errors}
                          label="Driver 2 Date of Birth"
                          name="driver2_date_of_birth"
                          register={register}
                          type="date"
                        />
                        <TextInput
                          errors={errors}
                          label="Driver 2 Driver License #"
                          name="driver2_drivers_license"
                          register={register}
                        />
                      </div>
                      <BooleanRadio
                        control={control}
                        errors={errors}
                        label="Exclude this driver from policy?"
                        name="driver2_excluded"
                      />
                      <EnumRadio
                        control={control}
                        errors={errors}
                        label="Defensive driving course?"
                        name="driver2_defensive_driving"
                        options={[
                          { label: 'None', value: 'none' },
                          { label: 'Basic', value: 'basic' },
                          { label: 'Advanced', value: 'advanced' },
                        ]}
                        required={false}
                      />
                    </section>
                  ) : null}
                </motion.div>
              ) : null}

              {step === 3 ? (
                <motion.div animate={{ opacity: 1, x: 0 }} className="space-y-5" initial={{ opacity: 0, x: 16 }}>
                  <BooleanRadio
                    control={control}
                    errors={errors}
                    label="Do you currently have auto insurance?"
                    name="has_current_insurance"
                  />
                  {values.has_current_insurance ? (
                    <TextInput
                      errors={errors}
                      label="Current Insurance Company"
                      name="current_insurance_company"
                      register={register}
                      required
                    />
                  ) : null}
                  <EnumRadio
                    control={control}
                    errors={errors}
                    label="Coverage Type"
                    name="coverage_type"
                    options={[
                      { label: 'Full Coverage', value: 'full_coverage', description: 'Liability, collision, and comprehensive' },
                      { label: 'Liability', value: 'liability', description: 'State-required liability coverage' },
                    ]}
                  />
                  <BooleanRadio
                    control={control}
                    errors={errors}
                    label="Is there a lien holder on any vehicle?"
                    name="has_lien_holder"
                  />
                  {values.has_lien_holder ? (
                    <TextInput errors={errors} label="Lien Holder Name" name="lien_holder_name" register={register} required />
                  ) : null}
                </motion.div>
              ) : null}

              {step === 4 ? (
                <motion.div animate={{ opacity: 1, x: 0 }} className="space-y-5" initial={{ opacity: 0, x: 16 }}>
                  <VehicleFields errors={errors} prefix="veh1" register={register} required title="Vehicle 1" years={years} />
                  {showVehicle2 ? (
                    <VehicleFields errors={errors} prefix="veh2" register={register} title="Vehicle 2" years={years} />
                  ) : (
                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
                      onClick={() => setShowVehicle2(true)}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                      Add Second Vehicle
                    </button>
                  )}
                  {showVehicle2 && !showVehicle3 ? (
                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
                      onClick={() => setShowVehicle3(true)}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                      Add Third Vehicle
                    </button>
                  ) : null}
                  {showVehicle3 ? (
                    <VehicleFields errors={errors} prefix="veh3" register={register} title="Vehicle 3" years={years} />
                  ) : null}
                </motion.div>
              ) : null}

              {step === 5 ? (
                <motion.div animate={{ opacity: 1, x: 0 }} className="space-y-5" initial={{ opacity: 0, x: 16 }}>
                  <BooleanRadio
                    control={control}
                    errors={errors}
                    label="Any accidents, violations, or tickets in the past 3 years?"
                    name="has_violations"
                  />
                  {values.has_violations ? (
                    <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      {[1, 2, 3].slice(0, incidentRows).map((incident) => (
                        <div className="grid gap-4 md:grid-cols-2" key={incident}>
                          <TextInput
                            errors={errors}
                            label={`Violation ${incident} Type`}
                            name={`violation_${incident}_type` as FieldPath<LeadFormData>}
                            register={register}
                            required={incident === 1}
                          />
                          <TextInput
                            errors={errors}
                            label={`Violation ${incident} Date`}
                            name={`violation_${incident}_date` as FieldPath<LeadFormData>}
                            register={register}
                            required={incident === 1}
                            type="date"
                          />
                        </div>
                      ))}
                      {incidentRows < 3 ? (
                        <button
                          className="font-semibold text-blue-600 hover:text-blue-700"
                          onClick={() => setIncidentRows((current) => Math.min(current + 1, 3))}
                          type="button"
                        >
                          + Add another incident
                        </button>
                      ) : null}
                    </section>
                  ) : null}
                </motion.div>
              ) : null}

              {step === 6 ? (
                <motion.div animate={{ opacity: 1, x: 0 }} className="space-y-5" initial={{ opacity: 0, x: 16 }}>
                  <TextInput
                    errors={errors}
                    label="How did you hear about us?"
                    name="referral_source"
                    register={register}
                  />
                  <div>
                    <TextInput
                      errors={errors}
                      label="Additional Notes"
                      maxLength={500}
                      name="notes"
                      placeholder="Questions, special circumstances, or timing needs"
                      register={register}
                      rows={5}
                    />
                    <p className="mt-2 text-right text-sm text-slate-500">{notes.length}/500</p>
                  </div>
                  <ReviewSummary data={values} />
                </motion.div>
              ) : null}

              {submitError ? (
                <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium">{submitError}</p>
                </div>
              ) : null}

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  disabled={step === 1 || isSubmitting}
                  onClick={previousStep}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                {step < 6 ? (
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
                    onClick={nextStep}
                    type="button"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 disabled:opacity-50"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Submit Quote Request
                  </button>
                )}
              </div>
            </fieldset>
          </form>
        </section>
        </motion.div>
      </section>
      <TrustBar />
      <div id="why-choose-us">
        <WhyChooseSection />
      </div>
      <TestimonialsSection />
      <Footer onQuoteClick={handleQuoteClick} />
      {!showQuoteOverlay ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-blue-100 bg-white/95 p-3 shadow-2xl backdrop-blur md:hidden">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 font-heading font-extrabold text-white shadow-lg shadow-blue-600/25"
            onClick={handleQuoteClick}
            type="button"
          >
            Get a Quote
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </main>
  )
}
