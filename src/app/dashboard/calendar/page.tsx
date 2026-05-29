'use client'

import { useEffect, useState, useMemo } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, Menu } from 'lucide-react'
import { clsx } from 'clsx'
import { CreateEventModal } from './CreateEventModal'
import { initAuth, googleSignIn } from '@/lib/google-auth'

interface GoogleEvent {
  id: string;
  summary: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  htmlLink?: string;
  description?: string;
}

export default function CalendarPage() {
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [needsAuth, setNeedsAuth] = useState(true)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [authError, setAuthError] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [view, setView] = useState<'month'|'day'>('month')

  // Standard Calendar State
  const [currentDate, setCurrentDate] = useState(new Date()) 

  const fetchGoogleEvents = async (token: string, dateObj: Date) => {
    setLoading(true)
    try {
      const start = new Date(dateObj.getFullYear(), dateObj.getMonth() - 1, 1).toISOString();
      const end = new Date(dateObj.getFullYear(), dateObj.getMonth() + 2, 0).toISOString();
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGoogleEvents(data.items || []);
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setNeedsAuth(false)
        setAuthError('')
        fetchGoogleEvents(token, currentDate)
      },
      () => {
        setNeedsAuth(true)
        setLoading(false)
      }
    );
    return () => {
       if (typeof unsubscribe === 'function') unsubscribe();
    }
  }, [])

  useEffect(() => {
    if (!needsAuth) {
      import('@/lib/google-auth').then(mod => {
        mod.getAccessToken().then(token => {
          if (token) fetchGoogleEvents(token, currentDate);
        });
      });
    }
  }, [currentDate, needsAuth]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const result = await googleSignIn();
      if (result) {
        setNeedsAuth(false);
        fetchGoogleEvents(result.accessToken, currentDate);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setAuthError(err.message || "Erreur de connexion");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const gotoToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() 
  const offset = (firstDayOfMonth === 0 ? 7 : firstDayOfMonth) - 1 // Fix for Monday start
  
  const daysArray = useMemo(() => {
    const arr = []
    for (let i = 0; i < offset; i++) {
      arr.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), -offset + i + 1))
    }
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i))
    }
    const remaining = 42 - arr.length 
    for (let i = 1; i <= remaining; i++) {
      arr.push(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i))
    }
    return arr
  }, [currentDate, daysInMonth, offset])

  const monthName = currentDate.toLocaleString('fr-FR', { month: 'long' })
  const yearStr = currentDate.getFullYear()
  const todayStr = new Date().toISOString().slice(0, 10)
  
  const getSelectedDateStr = () => {
      const offsetMs = selectedDate.getTimezoneOffset() * 60000;
      return new Date(selectedDate.getTime() - offsetMs).toISOString().slice(0, 10)
  }
  const selectedDateStr = getSelectedDateStr()

  const formatEventTime = (dateTime?: string) => {
    if (dateTime) return new Date(dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return ''
  }

  const handleRefresh = async () => {
    import('@/lib/google-auth').then(mod => {
      mod.getAccessToken().then(token => {
        if (token) fetchGoogleEvents(token, currentDate);
      });
    });
  }

  const getEventsForDate = (dateStr: string) => {
    return googleEvents.filter(e => {
       if (e.start.dateTime) return e.start.dateTime.startsWith(dateStr)
       if (e.start.date) return e.start.date === dateStr
       return false
    })
  }

  return (
    <div className="flex-1 font-sans text-gray-900 dark:text-gray-100 flex flex-col h-full w-full bg-white dark:bg-[#1a1c1e]">
      {isModalOpen && (
        <CreateEventModal 
          selectedDate={selectedDate}
          onClose={() => setIsModalOpen(false)} 
          onSuccess={handleRefresh} 
        />
      )}

      {/* Top Navigation Bar - Google Calendar Style */}
      <header className="h-[60px] border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-4 shrink-0 bg-white dark:bg-[#141618]">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-[#4285F4]" /> 
            <span className="text-xl text-gray-600 dark:text-gray-200 hidden sm:block">Agenda</span>
          </div>

          <div className="flex items-center ml-2 sm:ml-6 gap-2">
            <button 
              onClick={gotoToday}
              className="px-4 py-2 border border-gray-300 dark:border-white/20 rounded-md text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors hidden sm:block h-9"
            >
              Aujourd'hui
            </button>
            <div className="flex items-center ml-1">
              <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-600 dark:text-gray-300">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-600 dark:text-gray-300">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-[22px] text-gray-700 dark:text-gray-200 ml-2 hidden sm:block capitalize leading-none pt-0.5">
              {monthName} {yearStr}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {needsAuth && (
            <div className="flex items-center gap-2">
              {authError && <span className="text-[11px] text-red-500 max-w-[200px] truncate hidden xl:block font-medium" title={authError}>{authError}</span>}
              <button 
                onClick={handleGoogleLogin} 
                disabled={isLoggingIn}
                className="flex items-center gap-2 px-3 py-1.5 border border-[#4285F4] text-[#4285F4] hover:bg-[#4285F4]/10 rounded-md font-medium text-[13px] transition-colors h-9"
              >
                {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                )}
                <span className="hidden sm:block">Ajouter Compte Google</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 border border-gray-300 dark:border-white/20 p-1 rounded-md bg-white dark:bg-[#141618] h-9">
            <button 
              onClick={() => setView('month')}
              className={clsx("px-3 py-1 text-[13px] font-medium rounded transition-colors h-full", view === 'month' ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200")}
            >
              Mois
            </button>
            <button 
              onClick={() => setView('day')}
              className={clsx("px-3 py-1 text-[13px] font-medium rounded transition-colors h-full", view === 'day' ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200")}
            >
              Jour
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[256px] border-r border-gray-200 dark:border-white/10 flex flex-col bg-white dark:bg-[#141618] hidden lg:flex shrink-0 px-4 py-[14px]">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-3 bg-white dark:bg-[#1a1c1e] text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 hover:shadow-md shadow-sm transition-all rounded-full py-3 px-4 font-medium mb-6 w-[150px]"
          >
            <div className="shrink-0">
               <svg width="24" height="24" viewBox="0 0 36 36"><path fill="#34A853" d="M16 16v14h4V20z"></path><path fill="#4285F4" d="M30 16H20l-4 4h14z"></path><path fill="#FBBC05" d="M6 16v4h10l4-4z"></path><path fill="#EA4335" d="M20 16V6h-4v14z"></path><path fill="none" d="M0 0h36v36H0z"></path></svg>
            </div>
            Créer
          </button>

          {/* Mini Calendar */}
          <div className="mb-6 select-none pl-2">
            <div className="flex items-center justify-between mb-4 pr-1">
              <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200 capitalize">{monthName} {yearStr}</span>
              <div className="flex">
                <ChevronLeft className="w-4 h-4 text-gray-500 cursor-pointer" onClick={prevMonth}/>
                <ChevronRight className="w-4 h-4 text-gray-500 cursor-pointer ml-3" onClick={nextMonth} />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="text-[11px] font-medium text-gray-500">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center">
              {daysArray.map((date, i) => {
                const dateStr = date.toISOString().slice(0, 10)
                const isSelected = selectedDate.toISOString().slice(0, 10) === dateStr
                const isToday = todayStr === dateStr
                const isCurrentMonth = date.getMonth() === currentDate.getMonth()

                return (
                  <div 
                    key={i} 
                    onClick={() => {
                        setSelectedDate(date)
                        if (!isCurrentMonth) setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1))
                    }}
                    className={clsx(
                      "w-6 h-6 flex items-center justify-center text-[11px] rounded-full cursor-pointer mx-auto",
                      isToday && !isSelected ? "text-[#4285F4] bg-[#4285F4]/10 font-bold" :
                      isSelected && isToday ? "bg-[#4285F4] text-white font-bold" :
                      isSelected ? "bg-[#4285F4]/20 text-[#4285F4] font-bold" :
                      !isCurrentMonth ? "text-gray-400 dark:text-gray-600" :
                      "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                    )}
                  >
                    {date.getDate()}
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2 px-2 group cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 py-1 rounded">
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-transform rotate-90" />
              <h3 className="text-[13px] font-medium text-gray-700 dark:text-gray-200">Mes agendas</h3>
            </div>
            <div className="pl-6">
              <label className="flex items-center gap-3 py-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md cursor-pointer transition-colors -ml-2 px-2">
                <input type="checkbox" checked readOnly className="w-4 h-4 accent-[#4285F4] rounded bg-white shadow-sm" />
                <span className="text-[13px] text-gray-700 dark:text-gray-300">Agenda Principal (Google)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Main Calendar View */}
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-[#1a1c1e]">
          {view === 'month' && (
            <div className="flex-1 flex flex-col pt-2">
              {/* Days Header */}
              <div className="grid grid-cols-7 shrink-0">
                {['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'].map(d => (
                  <div key={d} className="py-2 text-center text-[11px] font-medium text-gray-500 dark:text-gray-400 border-r border-transparent last:border-r-0">
                    {d}
                  </div>
                ))}
              </div>
              
              {/* Days Grid */}
              <div className="flex-1 grid grid-cols-7 grid-rows-6 border-l border-t border-gray-200 dark:border-white/10">
                {daysArray.map((date, i) => {
                  const dateStr = date.toISOString().slice(0, 10)
                  const isToday = dateStr === todayStr
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                  const dayGoogleEvents = getEventsForDate(dateStr)
                  
                  return (
                    <div 
                      key={i} 
                      onClick={() => {
                        setSelectedDate(date)
                        setView('day')
                      }}
                      className={clsx(
                        "border-b border-r border-gray-200 dark:border-white/10 flex flex-col transition-colors cursor-pointer group min-h-0", 
                        !isCurrentMonth ? "bg-gray-50/50 dark:bg-black/20" : "bg-white dark:bg-[#1a1c1e]"
                      )}
                    >
                      <div className="flex justify-center mt-1 mb-0.5">
                        <span className={clsx(
                          "text-[12px] font-medium w-6 h-6 flex flex-col justify-center text-center rounded-full transition-colors", 
                          isToday ? "bg-[#4285F4] text-white shadow-sm" : 
                          !isCurrentMonth ? "text-gray-400 dark:text-gray-600" :
                          "text-gray-700 dark:text-gray-200 group-hover:bg-gray-100 dark:group-hover:bg-white/10"
                        )}>
                          {i < 7 && date.getDate() === 1 ? `${date.getDate()} ${date.toLocaleString('fr-FR', {month:'short'})}` : date.getDate()}
                        </span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 space-y-[2px] max-h-full pb-1">
                        {!loading && dayGoogleEvents.map(event => {
                          const hasTime = !!event.start.dateTime;
                          return (
                            <div 
                              key={event.id}
                              className={clsx(
                                "text-[11px] font-medium px-1.5 py-0.5 rounded-[3px] truncate flex items-center gap-1 cursor-pointer hover:opacity-90 leading-tight",
                                hasTime ? "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10" : "bg-[#4285F4] text-white shadow-sm"
                              )}
                              title={event.summary}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (event.htmlLink) window.open(event.htmlLink, '_blank')
                              }}
                            >
                              {hasTime && <div className="w-2 h-2 rounded-[50%] shrink-0 bg-[#4285F4]"></div>}
                              {hasTime && <span className="font-medium opacity-80 shrink-0">{formatEventTime(event.start.dateTime)}</span>}
                              <span className="truncate">{event.summary || '(Sans titre)'}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {view === 'day' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden relative border-t border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 dark:border-white/10 shrink-0 bg-white dark:bg-[#1a1c1e]">
                <div className="flex flex-col items-center min-w-[50px]">
                  <span className={clsx("text-[11px] font-medium uppercase", selectedDateStr === todayStr ? "text-[#4285F4]" : "text-gray-500")}>
                    {selectedDate.toLocaleString('fr-FR', { weekday: 'short' })}
                  </span>
                  <span className={clsx(
                    "text-[26px] font-normal w-12 h-12 flex items-center justify-center rounded-full mt-0.5", 
                    selectedDateStr === todayStr ? "bg-[#4285F4] text-white" : "text-gray-700 dark:text-gray-200"
                  )}>
                    {selectedDate.getDate()}
                  </span>
                </div>
                <div className="w-px h-12 bg-gray-200 dark:bg-white/10 ml-2"></div>
                
                <div className="flex-1 pl-4">
                  <div className="space-y-1">
                    {!loading && getEventsForDate(selectedDateStr).filter(e => !e.start.dateTime).map(event => (
                      <div key={event.id} onClick={() => event.htmlLink && window.open(event.htmlLink, '_blank')} className="cursor-pointer bg-[#4285F4] text-white text-[12px] px-3 py-1 rounded-[4px] font-medium w-full truncate shadow-sm">
                        {event.summary || '(Sans titre)'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time grid for Day view */}
              <div className="flex-1 overflow-y-auto relative custom-scrollbar bg-white dark:bg-[#1a1c1e]">
                {/* Time labels */}
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="flex h-[60px] relative group border-b border-gray-100 dark:border-white/5 last:border-b-0">
                    <div className="w-20 shrink-0 text-right pr-4 relative -top-3">
                      <span className="text-[10px] text-gray-500 font-medium">
                        {i === 0 ? '' : `${i}:00`}
                      </span>
                    </div>
                    <div className="flex-1 border-l border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors absolute inset-0 left-20" onClick={() => setIsModalOpen(true)}>
                    </div>
                  </div>
                ))}
                
                {/* Events Absolute Layer */}
                <div className="absolute top-0 left-20 right-0 bottom-0 pointer-events-none px-2 py-0 border-l border-transparent">
                  {!loading && getEventsForDate(selectedDateStr)
                    .filter(e => e.start.dateTime)
                    .map(event => {
                      const startDate = new Date(event.start.dateTime!);
                      let endDate = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(startDate.getTime() + 60*60*1000);
                      
                      const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                      const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
                      const duration = Math.max(20, endMinutes - startMinutes);
                      
                      const top = (startMinutes / 60) * 60;
                      const height = (duration / 60) * 60;
                      
                      return (
                        <div 
                          key={event.id}
                          className="absolute left-1 right-2 rounded-[4px] bg-[#4285F4] text-white p-2 text-xs shadow-sm overflow-hidden border border-white/20 pointer-events-auto cursor-pointer flex gap-1 flex-col"
                          style={{ top: `${top}px`, height: `${height}px`, minHeight: '24px' }}
                          onClick={() => event.htmlLink && window.open(event.htmlLink, '_blank')}
                        >
                          <div className="font-medium truncate leading-none">{event.summary || '(Sans titre)'}</div>
                          {height >= 40 && <div className="text-[10px] leading-tight">{formatEventTime(event.start.dateTime)} - {formatEventTime(event.end?.dateTime)}</div>}
                        </div>
                      )
                    })}
                </div>

                {/* Current Time Indicator */}
                {selectedDateStr === todayStr && (
                  <div 
                    className="absolute left-0 right-0 border-t-2 border-[#EA4335] z-10 flex items-center pointer-events-none"
                    style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 60}px` }}
                  >
                    <div className="w-20 pr-2 -my-2 flex justify-end shrink-0">
                      <span className="text-[#EA4335] text-[10px] font-bold">
                        {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#EA4335] -ml-1"></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


