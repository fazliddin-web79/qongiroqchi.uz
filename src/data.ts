import {
  BarChart3,
  Bell,
  Clock3,
  ContactRound,
  History,
  Megaphone,
  Music2,
  PhoneCall,
  PhoneOff,
  PhoneOutgoing,
  Plug,
  Settings,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

export type Tone = 'green' | 'blue' | 'violet' | 'orange'

export interface NavGroup {
  label: string
  items: Array<{ label: string; icon: LucideIcon; badge?: string; active?: boolean }>
}

export const navGroups: NavGroup[] = [
  {
    label: 'ASOSIY',
    items: [
      { label: 'Bosh sahifa', icon: BarChart3, active: true },
      { label: 'Kampaniyalar', icon: Megaphone, badge: '4' },
      { label: 'Kontaktlar', icon: ContactRound },
      { label: 'Audio xabarlar', icon: Music2 },
    ],
  },
  {
    label: 'TAHLIL',
    items: [
      { label: 'Statistika', icon: TrendingUp },
      { label: "Qo'ng'iroqlar tarixi", icon: History },
    ],
  },
  {
    label: 'SOZLAMALAR',
    items: [
      { label: 'Integratsiyalar', icon: Plug },
      { label: 'Sozlamalar', icon: Settings },
    ],
  },
]

export const metrics: Array<{
  label: string
  value: string
  change: string
  detail: string
  progress: number
  tone: Tone
  icon: LucideIcon
  down?: boolean
}> = [
  { label: "Jami qo'ng'iroqlar", value: '12,847', change: '18.2%', detail: '+1,248 bugun', progress: 78, tone: 'green', icon: PhoneOutgoing },
  { label: 'Javob berildi', value: '8,420', change: '6.4%', detail: '65.5% natija', progress: 65, tone: 'blue', icon: PhoneCall },
  { label: "O'rtacha davomiylik", value: '01:42', change: '9.1%', detail: '+12 soniya', progress: 55, tone: 'violet', icon: Clock3 },
  { label: 'Konversiya', value: '24.8%', change: '2.8%', detail: '2,089 ta mijoz', progress: 25, tone: 'orange', icon: TrendingUp, down: true },
]

export const campaigns: Array<{
  name: string
  date: string
  current: string
  total: string
  progress: number
  tone: Exclude<Tone, 'violet'>
  icon: LucideIcon
}> = [
  { name: 'Yozgi chegirmalar', date: 'Bugun, 09:30', current: '3,840', total: '5,000', progress: 72, tone: 'green', icon: Megaphone },
  { name: 'Yangi mijozlar', date: 'Bugun, 11:00', current: '1,920', total: '4,000', progress: 48, tone: 'blue', icon: ContactRound },
  { name: "To'lov eslatmasi", date: 'Kecha, 16:20', current: '2,730', total: '3,000', progress: 91, tone: 'orange', icon: Bell },
]

export const activities: Array<{
  phone: string
  detail: string
  time: string
  tone: 'success' | 'info' | 'warning'
  icon: LucideIcon
}> = [
  { phone: '+998 90 123 45 67', detail: 'Javob berdi · 2:14 daqiqa', time: 'Hozir', tone: 'success', icon: PhoneCall },
  { phone: '+998 93 456 78 90', detail: '1 tugmasini bosdi', time: '1 daq.', tone: 'info', icon: PhoneOutgoing },
  { phone: '+998 97 765 43 21', detail: 'Javob bermadi', time: '3 daq.', tone: 'warning', icon: PhoneOff },
  { phone: '+998 99 888 77 66', detail: 'Javob berdi · 0:48 daqiqa', time: '5 daq.', tone: 'success', icon: PhoneCall },
]
