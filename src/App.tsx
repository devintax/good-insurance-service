import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  Star,
  Clock,
  Users,
  Award,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Car,
  FileText,
  Heart,
  MessageSquare,
  Send
} from 'lucide-react';
import { leadFormSchema, LeadFormData, vehicleMakes, vehicleYears, coverageTypes } from './lib/schema';

// Contact Information
const CONTACT_INFO = {
  mainPhone: '(302) 322-5515',
  textPhone: '(302) 648-7858',
  whatsappPhone: '(302) 522-6002',
  faxPhone: '(302) 846-7881',
  email1: 'gis@dfgbusiness.com',
  email2: 'insurance@dfgbusiness.com',
  address: '622 E. Basin Rd, Ste A, New Castle DE 19720',
};

const API_BASE_URL = ''; // Use relative path - Vite proxy handles /api/*

interface SubmitResponse {
  success: boolean;
  leadId?: string;
  message?: string;
  error?: string;
}

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const totalSteps = 4;

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    watch,
    setValue,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    mode: 'onBlur',
    defaultValues: {
      hasCurrentInsurance: false,
    },
  });

  const watchValues = watch();

  const stepFields: Record<number, (keyof LeadFormData)[]> = {
    1: ['fullName', 'email', 'phone'],
    2: ['vehicleMake', 'vehicleModel', 'vehicleYear'],
    3: ['coverageType'],
    4: ['notes'],
  };

  const nextStep = async () => {
    const fields = stepFields[currentStep];
    const isValid = await trigger(fields as (keyof LeadFormData)[]);
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const submitToServer = async (data: LeadFormData): Promise<SubmitResponse> => {
    const leadData = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      vehicleMake: data.vehicleMake,
      vehicleModel: data.vehicleModel,
      vehicleYear: parseInt(data.vehicleYear),
      vinNumber: data.vinNumber || null,
      coverageType: data.coverageType,
      hasCurrentInsurance: data.hasCurrentInsurance || false,
      coverageStartDate: data.coverageStartDate || null,
      notes: data.notes || null,
      source: 'web_quote_form',
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('API returned non-JSON response:', response.status);
        throw new Error('API endpoint not configured. Please contact support.');
      }

      const result: SubmitResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit lead');
      }

      console.log('Lead submitted successfully:', result.leadId);
      return result;

    } catch (error) {
      console.error('Submission error:', error);

      // Network-related errors
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
          return {
            success: false,
            error: 'Cannot connect to server. Please ensure the API server is running on port 3000.',
          };
        }
        return {
          success: false,
          error: 'Network error: ' + error.message,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error. Please try again.',
      };
    }
  };

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);

    try {
      const result = await submitToServer(data);

      if (!result.success) {
        throw new Error(result.error || 'Submission failed');
      }

      posthog.capture('lead_submitted', {
        vehicle_make: data.vehicleMake,
        vehicle_model: data.vehicleModel,
        vehicle_year: data.vehicleYear,
        coverage_type: data.coverageType,
        has_current_insurance: data.hasCurrentInsurance,
        source: 'web_quote_form',
      });

      setIsSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
      posthog.capture('lead_submission_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      alert(error instanceof Error ? error.message : 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (isSubmitted) {
    return <SuccessScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-hero font-body">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-primary-blue text-lg">Good Insurance Agency</h1>
              <p className="text-xs text-gray-500">Trusted Auto Insurance</p>
            </div>
          </div>
          <a
            href={`tel:+1${CONTACT_INFO.mainPhone.replace(/\D/g, '')}`}
            className="hidden sm:flex items-center gap-2 text-sm text-primary-blue font-medium hover:text-accent-blue transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>{CONTACT_INFO.mainPhone}</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 md:py-16 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-light-blue rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-teal/10 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Hero Content */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-accent-teal/10 text-accent-teal text-sm font-medium rounded-full mb-4">
                  <Shield className="w-4 h-4" />
                  Licensed & Certified
                </span>
                <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 leading-tight mb-4">
                  Get Your Free Auto Insurance Quote in Minutes
                </h1>
                <p className="text-lg text-gray-600 mb-6">
                  Serving Delaware and surrounding areas. No obligation, no pressure — just honest coverage that fits your budget.
                </p>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <TrustItem icon={<Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />} value="4.9/5" label="Customer Rating" />
                <TrustItem icon={<Clock className="w-5 h-5 text-accent-blue" />} value="15+ Years" label="Experience" />
                <TrustItem icon={<Users className="w-5 h-5 text-accent-teal" />} value="5,000+" label="Happy Customers" />
                <TrustItem icon={<Award className="w-5 h-5 text-purple-500" />} value="24/7" label="Support" />
              </motion.div>

              {/* Contact Cards */}
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <ContactCard
                  icon={<Phone className="w-5 h-5" />}
                  title="Call Us"
                  value={CONTACT_INFO.mainPhone}
                  href={`tel:+1${CONTACT_INFO.mainPhone.replace(/\D/g, '')}`}
                  color="blue"
                />
                <ContactCard
                  icon={<MessageSquare className="w-5 h-5" />}
                  title="Text Us"
                  value={CONTACT_INFO.textPhone}
                  href={`sms:+1${CONTACT_INFO.textPhone.replace(/\D/g, '')}`}
                  color="teal"
                />
                <ContactCard
                  icon={<Send className="w-5 h-5" />}
                  title="WhatsApp"
                  value={CONTACT_INFO.whatsappPhone}
                  href={`https://wa.me/1${CONTACT_INFO.whatsappPhone.replace(/\D/g, '')}`}
                  color="green"
                />
                <ContactCard
                  icon={<Mail className="w-5 h-5" />}
                  title="Email"
                  value={CONTACT_INFO.email1}
                  href={`mailto:${CONTACT_INFO.email1}`}
                  color="purple"
                />
              </motion.div>
            </div>

            {/* Right: Quote Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative"
            >
              <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Form Header */}
                <div className="bg-gradient-primary p-6 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5" />
                    <span className="font-heading font-semibold">Get Your Free Quote</span>
                  </div>
                  <p className="text-blue-100 text-sm">Fill out the form below and we'll contact you within 24 hours</p>
                </div>

                {/* Progress Indicator */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    {[1, 2, 3, 4].map((step) => (
                      <div key={step} className="flex items-center">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                          ${currentStep > step ? 'bg-accent-teal text-white' : ''}
                          ${currentStep === step ? 'bg-accent-blue text-white ring-4 ring-accent-blue/20' : ''}
                          ${currentStep < step ? 'bg-gray-200 text-gray-500' : ''}
                        `}>
                          {currentStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                        </div>
                        {step < 4 && (
                          <div className={`
                            hidden sm:block w-12 md:w-20 h-1 mx-2 rounded
                            ${currentStep > step ? 'bg-accent-teal' : 'bg-gray-200'}
                          `} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>Personal</span>
                    <span className="hidden sm:block">Vehicle</span>
                    <span>Coverage</span>
                    <span>Review</span>
                  </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                  <AnimatePresence mode="wait">
                    {currentStep === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <div>
                          <label className="input-label">Full Name *</label>
                          <input
                            type="text"
                            {...register('fullName')}
                            placeholder="Enter your full name"
                            className={`input-field ${errors.fullName ? 'error' : ''}`}
                          />
                          {errors.fullName && <p className="input-error">{errors.fullName.message}</p>}
                        </div>

                        <div>
                          <label className="input-label">Email Address *</label>
                          <input
                            type="email"
                            {...register('email')}
                            placeholder="you@example.com"
                            autoComplete="email"
                            className={`input-field ${errors.email ? 'error' : ''}`}
                          />
                          {errors.email && <p className="input-error">{errors.email.message}</p>}
                        </div>

                        <div>
                          <label className="input-label">Phone Number *</label>
                          <input
                            type="tel"
                            {...register('phone')}
                            placeholder="(302) 555-1234"
                            autoComplete="tel"
                            className={`input-field ${errors.phone ? 'error' : ''}`}
                          />
                          {errors.phone && <p className="input-error">{errors.phone.message}</p>}
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <div>
                          <label className="input-label">Vehicle Make *</label>
                          <select
                            {...register('vehicleMake')}
                            className={`input-field ${errors.vehicleMake ? 'error' : ''}`}
                          >
                            <option value="">Select make</option>
                            {vehicleMakes.map(make => (
                              <option key={make} value={make}>{make}</option>
                            ))}
                          </select>
                          {errors.vehicleMake && <p className="input-error">{errors.vehicleMake.message}</p>}
                        </div>

                        <div>
                          <label className="input-label">Vehicle Model *</label>
                          <input
                            type="text"
                            {...register('vehicleModel')}
                            placeholder="e.g., Camry, Civic, Model 3"
                            className={`input-field ${errors.vehicleModel ? 'error' : ''}`}
                          />
                          {errors.vehicleModel && <p className="input-error">{errors.vehicleModel.message}</p>}
                        </div>

                        <div>
                          <label className="input-label">Vehicle Year *</label>
                          <select
                            {...register('vehicleYear')}
                            className={`input-field ${errors.vehicleYear ? 'error' : ''}`}
                          >
                            <option value="">Select year</option>
                            {vehicleYears.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                          {errors.vehicleYear && <p className="input-error">{errors.vehicleYear.message}</p>}
                        </div>

                        <div>
                          <label className="input-label">VIN Number (Optional)</label>
                          <input
                            type="text"
                            {...register('vinNumber')}
                            placeholder="17-character VIN"
                            maxLength={17}
                            className={`input-field ${errors.vinNumber ? 'error' : ''}`}
                          />
                          {errors.vinNumber && <p className="input-error">{errors.vinNumber.message}</p>}
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 3 && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <div>
                          <label className="input-label">Coverage Type *</label>
                          <div className="space-y-3">
                            {coverageTypes.map((coverage) => (
                              <label
                                key={coverage.value}
                                className={`
                                  flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                                  ${watchValues.coverageType === coverage.value
                                    ? 'border-accent-blue bg-accent-blue/5'
                                    : 'border-gray-200 hover:border-gray-300'}
                                `}
                              >
                                <input
                                  type="radio"
                                  value={coverage.value}
                                  {...register('coverageType')}
                                  className="mt-1 w-4 h-4 text-accent-blue focus:ring-accent-blue"
                                />
                                <div className="flex-1">
                                  <span className="font-medium text-gray-800">{coverage.label}</span>
                                  <span className="block text-sm text-gray-500">{coverage.description}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                          {errors.coverageType && <p className="input-error">{errors.coverageType.message}</p>}
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="hasInsurance"
                            {...register('hasCurrentInsurance')}
                            className="w-5 h-5 text-accent-blue rounded border-gray-300 focus:ring-accent-blue"
                          />
                          <label htmlFor="hasInsurance" className="text-sm text-gray-600 cursor-pointer">
                            I currently have auto insurance
                          </label>
                        </div>

                        <div>
                          <label className="input-label">Preferred Start Date (Optional)</label>
                          <input
                            type="date"
                            {...register('coverageStartDate')}
                            min={getTomorrowDate()}
                            className="input-field"
                          />
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 4 && (
                      <motion.div
                        key="step4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        {/* Summary */}
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                          <h3 className="font-heading font-semibold text-gray-800 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-accent-blue" />
                            Quote Summary
                          </h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Name:</span>
                              <span className="ml-2 text-gray-800 font-medium">{watchValues.fullName || '—'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Email:</span>
                              <span className="ml-2 text-gray-800 font-medium">{watchValues.email || '—'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Phone:</span>
                              <span className="ml-2 text-gray-800 font-medium">{watchValues.phone || '—'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Vehicle:</span>
                              <span className="ml-2 text-gray-800 font-medium">
                                {watchValues.vehicleYear} {watchValues.vehicleMake} {watchValues.vehicleModel || '—'}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">Coverage:</span>
                              <span className="ml-2 text-gray-800 font-medium">
                                {coverageTypes.find(c => c.value === watchValues.coverageType)?.label || '—'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="input-label">Additional Notes (Optional)</label>
                          <textarea
                            {...register('notes')}
                            rows={4}
                            placeholder="Any special circumstances, questions, or information you'd like us to know..."
                            className="input-field h-auto py-3 resize-none"
                          />
                          {errors.notes && <p className="input-error">{errors.notes.message}</p>}
                        </div>

                        <p className="text-xs text-gray-500 text-center">
                          By submitting this form, you agree to be contacted by our insurance specialists regarding your quote request.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Navigation Buttons */}
                  <div className="flex gap-3 mt-6">
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={prevStep}
                        className="flex-1 h-12 px-4 rounded-md border border-gray-300 text-gray-700 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                    )}
                    {currentStep < totalSteps ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="flex-1 btn-primary flex items-center justify-center gap-2"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 btn-primary flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Get My Free Quote
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Trust badges under form */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm text-gray-500">
                <div className="trust-badge">
                  <Shield className="w-4 h-4" />
                  Secure & Private
                </div>
                <div className="trust-badge">
                  <CheckCircle className="w-4 h-4 text-success" />
                  No Obligation
                </div>
                <div className="trust-badge">
                  <Clock className="w-4 h-4" />
                  24hr Response
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="font-heading text-2xl font-bold text-gray-800 mb-2">
              Why Choose Good Insurance Agency?
            </h2>
            <p className="text-gray-600">Serving Delaware with personalized auto insurance coverage</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Car className="w-6 h-6" />}
              title="All Vehicle Types"
              description="Whether you drive a sedan, SUV, truck, or sports car, we have coverage options tailored to your vehicle."
            />
            <FeatureCard
              icon={<Heart className="w-6 h-6" />}
              title="Personalized Service"
              description="Our experienced agents take the time to understand your needs and find the perfect coverage at the best rate."
            />
            <FeatureCard
              icon={<Award className="w-6 h-6" />}
              title="Best Price Guarantee"
              description="We shop multiple carriers to find you the most competitive rates without sacrificing quality coverage."
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-bold text-gray-800 text-center mb-8">
            What Our Customers Say
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="Saved me over $400 a year! The process was so easy, and they found me better coverage than I had before."
              name="Michael R."
              location="New Castle, DE"
            />
            <TestimonialCard
              quote="After my accident, they handled everything personally. I didn't have to stress about a single thing."
              name="Sarah T."
              location="Wilmington, DE"
            />
            <TestimonialCard
              quote="Professional, friendly, and they actually listen. I've been with them for 5 years now and couldn't be happier."
              name="James L."
              location="Dover, DE"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-blue py-8 text-blue-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="font-heading font-bold text-white">Good Insurance Agency</span>
              </div>
              <p className="text-sm text-blue-200">
                Providing reliable auto insurance coverage to Delaware since 2009.
              </p>
            </div>

            <div>
              <h4 className="font-heading font-semibold text-white mb-4">Contact Us</h4>
              <div className="space-y-2 text-sm">
                <a href={`tel:+1${CONTACT_INFO.mainPhone.replace(/\D/g, '')}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="w-4 h-4" />
                  {CONTACT_INFO.mainPhone} (Main)
                </a>
                <a href={`sms:+1${CONTACT_INFO.textPhone.replace(/\D/g, '')}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  {CONTACT_INFO.textPhone} (Text)
                </a>
                <a href={`mailto:${CONTACT_INFO.email1}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail className="w-4 h-4" />
                  {CONTACT_INFO.email1}
                </a>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{CONTACT_INFO.address}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-heading font-semibold text-white mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="block hover:text-white transition-colors">About Us</a>
                <a href="#" className="block hover:text-white transition-colors">Get a Quote</a>
                <a href="#" className="block hover:text-white transition-colors">Claims</a>
                <a href="#" className="block hover:text-white transition-colors">FAQs</a>
              </div>
            </div>

            <div>
              <h4 className="font-heading font-semibold text-white mb-4">Legal</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="block hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="block hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="block hover:text-white transition-colors">Licenses</a>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-blue-300">Fax: {CONTACT_INFO.faxPhone}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 text-center text-sm text-blue-200">
            <p>&copy; {new Date().getFullYear()} Good Insurance Agency. All rights reserved. | Licensed in Delaware</p>
            <p className="mt-2 text-xs">Coverage availability varies by state. Not all applicants may qualify. Terms and conditions apply.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TrustItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
        {icon}
      </div>
      <span className="font-accent font-bold text-gray-800">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function ContactCard({ icon, title, value, href, color }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  href: string;
  color: 'blue' | 'teal' | 'green' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
    teal: 'bg-teal-50 text-teal-600 border-teal-200 hover:bg-teal-100',
    green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
  };

  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${colorClasses[color]}`}
    >
      {icon}
      <div>
        <span className="block text-xs font-medium opacity-75">{title}</span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
    </a>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className="w-12 h-12 bg-accent-blue/10 rounded-lg flex items-center justify-center text-accent-blue mb-4">
        {icon}
      </div>
      <h3 className="font-heading font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function TestimonialCard({ quote, name, location }: { quote: string; name: string; location: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        ))}
      </div>
      <p className="text-gray-600 mb-4 text-sm italic">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold">
          {name.charAt(0)}
        </div>
        <div>
          <span className="font-medium text-gray-800 text-sm">{name}</span>
          <span className="block text-xs text-gray-500">{location}</span>
        </div>
      </div>
    </div>
  );
}

function SuccessScreen() {
  return (
    <div className="min-h-screen bg-gradient-hero font-body flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-10 h-10 text-white" />
        </motion.div>

        <h1 className="font-heading text-2xl font-bold text-gray-800 mb-2">
          Thank You!
        </h1>
        <p className="text-gray-600 mb-6">
          Your quote request has been submitted successfully. One of our insurance specialists will contact you within 24 hours with personalized coverage options.
        </p>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-heading font-semibold text-gray-800 mb-4">What happens next?</h3>
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-accent-blue/10 rounded-full flex items-center justify-center text-accent-blue text-xs font-semibold shrink-0">1</div>
              <div>
                <span className="font-medium text-gray-800">Review</span>
                <span className="block text-sm text-gray-500">Our team reviews your information</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-accent-blue/10 rounded-full flex items-center justify-center text-accent-blue text-xs font-semibold shrink-0">2</div>
              <div>
                <span className="font-medium text-gray-800">Custom Quote</span>
                <span className="block text-sm text-gray-500">We find the best coverage for your needs</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-accent-blue/10 rounded-full flex items-center justify-center text-accent-blue text-xs font-semibold shrink-0">3</div>
              <div>
                <span className="font-medium text-gray-800">Contact</span>
                <span className="block text-sm text-gray-500">We'll call or email you with options</span>
              </div>
            </div>
          </div>
        </div>

        <a
          href="/"
          className="inline-flex items-center gap-2 text-accent-blue font-medium hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          Return to Homepage
        </a>
      </motion.div>
    </div>
  );
}

export default App;
