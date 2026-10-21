// Public site content release date in YYYY-MM-DD format. Update this only when
// a meaningful website/content release is made, not on every deployment.
export const SITE_LAST_UPDATED = '2026-10-21'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function formatSiteLastUpdated(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''))
  if (!match) return ''

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return ''
  }

  return `${String(day).padStart(2, '0')} ${MONTH_NAMES[month - 1]} ${year}`
}

const whatsappNumber = '916291089226'
const whatsappEnquiryMessage =
  'Hello Expert Learning Center, I would like to enquire about admissions. Please share information about available courses, eligibility, fees, and admission procedures. Thank you.'

export const institute = {
  name: 'Expert Learning Center',
  shortName: 'ELC',
  tagline: 'Learn Today. Lead Tomorrow.',
  director: {
    name: 'Mr. Director',
    designation: 'Director',
  },
  phone: {
    display: '+91 6291089226',
    href: 'tel:+916291089226',
  },
  email: {
    display: 'elcdirector@gmail.com',
    href: 'mailto:elcdirector@gmail.com',
  },
  address: {
    street: 'Mirganj',
    city: 'Gopalganj',
    state: 'Bihar',
    postalCode: '841438',
    country: 'India',
    display: 'Mirganj, Gopalganj, Bihar, 841438',
  },
  admissionEnquiry: {
    label: 'Call for Admission Enquiry',
    href: 'tel:+916291089226',
  },
  whatsapp: {
    number: whatsappNumber,
    display: '+91 6291089226',
    label: 'Admission Enquiry on WhatsApp',
    isConfirmed: false,
    message: whatsappEnquiryMessage,
    href: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappEnquiryMessage)}`,
  },
  socialProfiles: [
    {
      platform: 'YouTube',
      url: 'https://www.youtube.com',
      isVerified: false,
    },
    {
      platform: 'Facebook',
      url: 'https://www.facebook.com',
      isVerified: false,
    },
    {
      platform: 'Instagram',
      url: 'https://www.instagram.com',
      isVerified: false,
    },
    {
      platform: 'X',
      url: 'https://www.x.com',
      isVerified: false,
    },
  ],
}
