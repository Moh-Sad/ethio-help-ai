import { useEffect, useRef, useState } from 'react'
import { User, Bot, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageLike {
  id: string
  role: string
  parts?: Array<{ type: string; text?: string }>
}

function getMessageText(message: MessageLike): string {
  if (!message.parts || !Array.isArray(message.parts)) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

interface ChatMessageListProps {
  messages: MessageLike[]
  isLoading: boolean
}

const ETHIOPIAN_FACTS = [
  {
    id: 'calendar',
    en: 'Ethiopia uses a unique calendar with 13 months, making it 7 to 8 years behind the Gregorian calendar!',
    am: 'ኢትዮጵያ 13 ወራት ያሉት ልዩ የቀን አቆጣጠር ስለምትጠቀም ከጎርጎርዮሳውያን የቀን አቆጣጠር ከ7 እስከ 8 ዓመታት ዘግይታ ትገኛለች!',
    ar: 'تستخدم إثيوبيا تقويماً فريداً يتكون من 13 شهراً، مما يجعلها متأخرة عن التقويم الميلادي بـ 7 إلى 8 سنوات!',
    link: 'https://en.wikipedia.org/wiki/Ethiopian_calendar'
  },
  {
    id: 'coffee',
    en: 'Coffee was originally discovered in the Kaffa region of Ethiopia by a goat herder named Kaldi!',
    am: 'ቡና መጀመሪያ የተገኘው በኢትዮጵያ በካፋ ክልል ካልዲ በተባለ ፍየል ጠባቂ ነው!',
    ar: 'تم اكتشاف القهوة لأول مرة في منطقة كافا في إثيوبيا بواسطة راعي ماعز يدعى كالدي!',
    link: 'https://en.wikipedia.org/wiki/History_of_coffee'
  },
  {
    id: 'colonization',
    en: 'Ethiopia is the only African nation that was never colonized by European powers, maintaining its sovereignty!',
    am: 'ኢትዮጵያ ሉዓላዊነቷን ጠብቃ የኖረችና በአውሮፓውያን ኃይሎች ያልተገዛች ብቸኛዋ የአፍሪካ ሀገር ናት!',
    ar: 'إثيوبيا هي الدولة الأفريقية الوحيدة التي لم يتم استعمارها قط من قبل القوى الأوروبية، وحافظت على سيادتها!',
    link: 'https://en.wikipedia.org/wiki/Ethiopia#History'
  },
  {
    id: 'lucy',
    en: 'The oldest fossilized human ancestor, "Lucy" (Dinknesh), dating back 3.2 million years, was discovered in the Afar region of Ethiopia!',
    am: 'ዕድሜው 3.2 ሚሊዮን ዓመታት የሆደው ጥንታዊው የሰው ዘር ቅሪተ አካል "ሉሲ" (ድንቅነሽ) በኢትዮጵያ የአፋር ክልል ተገኝቷል!',
    ar: 'تم اكتشاف أقدم حفرية لأسلاف البشر، "لوسي" (دينقنيش)، والتي يعود تاريخها إلى 3.2 مليون سنة، في منطقة عفار بإثيوبيا!',
    link: 'https://en.wikipedia.org/wiki/Lucy_(Australopithecus)'
  }
]

export function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const { t, isRTL, language } = useLanguage()
  const [factIndex, setFactIndex] = useState(0)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Select a random fact when loading starts
  useEffect(() => {
    if (isLoading) {
      setFactIndex(Math.floor(Math.random() * ETHIOPIAN_FACTS.length))
    }
  }, [isLoading])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex flex-col gap-4">
          {messages.map((message) => {
            const isUser = message.role === 'user'
            const text = getMessageText(message)

            return (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  isUser ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    isUser ? 'bg-secondary' : 'bg-primary'
                  )}
                >
                  {isUser ? (
                    <User className="h-4 w-4 text-primary-foreground" />
                  ) : (
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  )}
                </div>

                <div
                  className={cn(
                    'max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed',
                    isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-card-foreground'
                  )}
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap break-words">{text}</div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-4 max-w-[85%] sm:max-w-[70%] shadow-sm" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary animate-duration-1000" />
                  {t('chat.thinking')}
                </div>
                <div className="h-px bg-border w-full" />
                <div className="text-xs leading-relaxed text-muted-foreground flex flex-col gap-2">
                  <p className="font-semibold text-primary">
                    {language === 'am' ? 'ይህን ያውቁ ነበር? 🇪🇹' : language === 'ar' ? 'هل تعلم؟ 🇪🇹' : 'Did you know!? 🇪🇹'}
                  </p>
                  <p>
                    {ETHIOPIAN_FACTS[factIndex]?.[language as 'en' | 'am' | 'ar'] || ETHIOPIAN_FACTS[factIndex]?.en}
                  </p>
                  <div className="flex justify-start">
                    <a
                      href={ETHIOPIAN_FACTS[factIndex]?.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-[10px] font-semibold text-secondary-foreground px-2.5 py-1.5 transition-colors shadow-sm"
                    >
                      {language === 'am' ? 'የበለጠ ይረዱ' : language === 'ar' ? 'معرفة المزيد' : 'Know more'}
                      <span className="text-[8px] opacity-75">↗</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
