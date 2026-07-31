type WebMcpTool = {
  name: string
  title?: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: Record<string, unknown>
  execute: (input?: Record<string, unknown>) => Promise<Record<string, unknown>>
}

const CONTACT = {
  mainPhone: '(302) 322-5515',
  textPhone: '(302) 648-7858',
  whatsapp: '(302) 522-6002',
  email: 'gis@dfgbusiness.com',
  address: '622 E. Basin Rd, Ste A, New Castle DE 19720',
}

const quoteFields = [
  'first_name',
  'last_name',
  'gender',
  'date_of_birth',
  'drivers_license',
  'email',
  'phone_home',
  'address',
  'city',
  'state',
  'zip',
  'marital_status',
  'housing_status',
  'licensed_over_3yrs',
  'drivers_in_household',
  'has_current_insurance',
  'coverage_type',
  'has_lien_holder',
  'veh1_year',
  'veh1_make',
  'veh1_model',
  'veh1_body_type',
  'has_violations',
]

const tools: WebMcpTool[] = [
  {
    name: 'gis.get_contact_options',
    title: 'Get Good Insurance Service contact options',
    description:
      'Returns public phone, text, WhatsApp, email, and office address details for Good Insurance Service. This is a read-only tool.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
    annotations: { readOnlyHint: true },
    execute: async () => ({
      contact: CONTACT,
      serviceArea: ['Delaware', 'New Castle County', 'Kent County', 'Sussex County'],
    }),
  },
  {
    name: 'gis.get_quote_form_requirements',
    title: 'Get quote form requirements',
    description:
      'Returns the required fields and step structure for the Good Insurance Service Delaware auto insurance quote form. This is a read-only tool and does not submit customer data.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
    annotations: { readOnlyHint: true },
    execute: async () => ({
      form: 'Good Insurance Service 6-step auto insurance quote intake',
      requiredFields: quoteFields,
      endpoint: '/api/leads',
      warning: 'Do not submit real customer data without explicit user review and consent.',
    }),
  },
  {
    name: 'gis.open_quote_form',
    title: 'Open quote form',
    description:
      'Opens the visible quote form on the current page for the user. This tool only navigates the page and never submits the quote request.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
    annotations: { readOnlyHint: false },
    execute: async () => {
      const button = Array.from(document.querySelectorAll('button')).find((candidate) =>
        /get a quote/i.test(candidate.textContent || ''),
      )
      if (button) {
        button.click()
      } else {
        document.getElementById('quote')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }

      return {
        opened: true,
        userActionRequired: true,
        warning: 'The user must review and submit the form manually.',
      }
    },
  },
]

async function registerWithDraftApi() {
  const modelContext = document.modelContext
  if (!modelContext?.registerTool) {
    return false
  }

  await Promise.all(
    tools.map((tool) =>
      modelContext.registerTool({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
        execute: tool.execute,
      }),
    ),
  )
  return true
}

function registerWithScannerCompatibility() {
  const nav = navigator
  if (!nav.modelContext?.provideContext) {
    return false
  }

  nav.modelContext.provideContext({
    name: 'Good Insurance Service Lead Capture',
    description: 'Agent context and safe tools for the Delaware auto insurance lead capture page.',
    tools,
  })
  return true
}

export function registerWebMcpTools() {
  window.__giaWebMcpTools = tools.map(({ execute: _execute, ...tool }) => tool)

  registerWithDraftApi().catch((error) => {
    console.warn('[webmcp] registerTool failed:', error)
  })
  registerWithScannerCompatibility()
}

declare global {
  interface Document {
    modelContext?: {
      registerTool?: (tool: WebMcpTool, options?: Record<string, unknown>) => Promise<undefined>
      getTools?: (options?: Record<string, unknown>) => Promise<unknown[]>
    }
  }

  interface Navigator {
    modelContext?: {
      provideContext?: (context: Record<string, unknown>) => unknown
    }
  }

  interface Window {
    __giaWebMcpTools?: Array<Omit<WebMcpTool, 'execute'>>
  }
}
