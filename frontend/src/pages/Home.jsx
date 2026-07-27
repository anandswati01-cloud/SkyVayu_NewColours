import { useState, useRef,useEffect} from 'react'
import { useNavigate } from 'react-router-dom'
import AirportInput from '../components/booking/AirportInput'
import { queryApi } from '../services/api'
import { signInWithGoogle } from '../services/supabase'
import useAuthStore from '../store/authStore'
import { showToast } from '../components/ui/Toast'
import airplane from '../assets/aircraft.png'
import './Home.css'
const TRIP_TYPES = ['One Way', 'Round Trip', 'Multiple Sectors']
const AIRCRAFT_TYPES = [{ label: '✈ Fixed Wing', value: 'fixed_wing' }, { label: '🚁 Helicopter', value: 'helicopter' }]
const SPECIAL_REQS = ['✚ Medivac', '🐾 Pets', '★ VIP Passenger', '👶 Infants']

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const bookRef = useRef(null)

  const [tripType, setTripType] = useState('One Way')
  const [aircraftType, setAircraftType] = useState('fixed_wing')
  const [departure, setDeparture] = useState('')
  const [destination, setDestination] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [returnDateTime, setReturnDateTime] = useState('')
  const [pax, setPax] = useState(2)
  const [specials, setSpecials] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  function toggleSpecial(req) {
    setSpecials(prev => prev.includes(req) ? prev.filter(r => r !== req) : [...prev, req])
  }

  function validate() {
    const errs = {}
    if (!departure.trim()) errs.departure = 'Please enter a departure city'
    if (!destination.trim()) errs.destination = 'Please enter a destination city'
    if (!dateTime) errs.dateTime = 'Please select a departure date & time'
    if (tripType === 'Round Trip' && !returnDateTime) errs.returnDateTime = 'Please select a return date & time'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function getQuotes() {
    if (!validate()) return
    setLoading(true)

    const [flightDate, flightTime] = dateTime.split('T')
    const [returnDate, returnTime] = returnDateTime ? returnDateTime.split('T') : ['', '']

    const queryData = {
      tripType: tripType === 'One Way' ? 'one_way' : tripType === 'Round Trip' ? 'round_trip' : 'multiple_sectors',
      departure, destination, flightDate, flightTime,
      returnDate: returnDate || null, returnTime: returnTime || null,
      passengers: pax,
      aircraftCategory: aircraftType,
      medivac: specials.includes('✚ Medivac'),
      pets: specials.includes('🐾 Pets'),
      vip: specials.includes('★ VIP Passenger'),
      infants: specials.includes('👶 Infants'),
      userId: user?.id || null,
    }

    try {
      const res = await queryApi.create(queryData)
      const query = res.data
      sessionStorage.setItem('sv_query_id', query.id)
      sessionStorage.setItem('sv_query', JSON.stringify(query))
      sessionStorage.setItem('sv_query_start', Date.now().toString())
      navigate('/results')
    } catch (err) {
      if (err.message === 'MEMBERSHIP_REQUIRED') {
        navigate('/register?reason=membership_required&email=' + encodeURIComponent(user?.email || ''))
      } else if (err.status === 401 || !user) {
        // Stash query and prompt sign-in
        sessionStorage.setItem('sv_pending_query', JSON.stringify(queryData))
        signInWithGoogle()
      } else {
        showToast(err.message || 'Could not save your request. Please try again.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  function prefillRoute(from, to) {
    setDeparture(from)
    setDestination(to)
    bookRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const routes = [
  ['https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=800&q=80', 'Mumbai → Delhi', 'Mumbai', 'Delhi', 'Most Popular'],
  ['https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=80', 'Delhi → Goa', 'Delhi', 'Goa', null],
  ['https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=800&q=80', 'Mumbai → Dubai', 'Mumbai', 'Dubai', null],
];


const [activeSlide,setActiveSlide] = useState(0);

useEffect(()=>{

 const interval=setInterval(()=>{

  setActiveSlide(prev =>
    prev === routes.length - 1 ? 0 : prev + 1
  );

 },4000);

 return ()=>clearInterval(interval);

},[]);
  
  const s = {
    inputLabel: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--white-60)', marginBottom: 8, display: 'block' },
    errorMsg: { color: '#e05f5f', fontSize: 11.5, marginTop: 4, fontFamily: 'var(--font-body)' },
    chip: (active) => ({ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', padding: '7px 14px', border: `1px solid ${active ? 'var(--gold)' : 'var(--white-10)'}`, borderRadius: 2, cursor: 'pointer', color: active ? 'var(--gold)' : 'var(--white-60)', background: active ? 'rgba(251,191,36,0.08)' : 'transparent', transition: 'all 0.2s' }),
    tripBtn: (active) => ({ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.2px', textTransform: 'uppercase', padding: '8px 18px', borderRadius: 2, cursor: 'pointer', color: active ? 'var(--navy)' : 'var(--white-60)', background: active ? 'var(--gold)' : 'transparent', border: `1px solid ${active ? 'var(--gold)' : 'var(--white-10)'}`, transition: 'all 0.2s' }),
    acBtn: (active) => ({ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.2px', textTransform: 'uppercase', padding: '8px 20px', borderRadius: 2, cursor: 'pointer', color: active ? '#17b0d6' : 'var(--white-60)', background: active ? 'rgba(23,176,214,0.15)' : 'transparent', border: `1px solid ${active ? '#17b0d6' : 'var(--white-10)'}`, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }),
    inputField: { background: 'var(--white-10)', border: '1px solid var(--white-10)', borderRadius: 2, padding: '12px 16px', color: 'var(--white)', fontFamily: 'var(--font-body)', fontSize: 15, outline: 'none', width: '100%', transition: 'border-color 0.2s' },
  }

  return (
    <div>
      {/* HERO */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
      <div
      className="hero-bg"
      style={{position: "absolute",inset: 0,zIndex: 0,backgroundImage: `url(${airplane})`,backgroundSize: "cover", backgroundRepeat: "no-repeat",backgroundPosition: "center center",
      }}
    />

    <div
      style={{ position: "absolute", inset: 0, zIndex: 1, background:
          "linear-gradient(to bottom, rgba(12,19,36,0.05) 0%, rgba(12,19,36,0.15) 50%, rgba(12,19,36,0.55) 100%)",
      }}
    />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(12,19,36,0.4) 0%, rgba(12,19,36,0.7) 60%, var(--navy) 100%)' }} />

        <div style={{ position: 'relative', zIndex: 2, padding: '140px 48px 80px', maxWidth: 780, animation: 'fadeUp 0.6s ease both' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'block', width: 32, height: 1, background: 'var(--gold)' }} />
            India's largest marketplace of DGCA licensed Non Scheduled operators
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(52px, 7vw, 88px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: -1, marginBottom: 28 }}>
            Private Charter Flights.<br />
          <em style={{ fontStyle: 'italic',color: 'var(--gold)',display: 'inline-block',animation: 'slideText 3s ease-in-out infinite' }}> Direct. Transparent. Fast.
          </em>          
         </h1>
         <p style={{  fontSize: 25,  lineHeight: 1.7,  color: 'var(--white-80)',  maxWidth: 520,  marginBottom: 48,display: 'inline-block', whiteSpace: 'nowrap',animation: 'moveText 25s linear infinite'}}>
          Receive verified quotations within <strong style={{ color: 'var(--gold)', fontWeight: 500 }}>60 minutes</strong> from DGCA-licensed operators.<br />
          No intermediaries. No hidden costs.
        </p>
        </div>

        {/* Trust bar */}
        <div style={{ position: 'relative', zIndex: 2, padding: '0 48px 80px', display: 'flex', gap: 48, animation: 'fadeUp 0.6s 0.3s ease both' }}>
          {[['✈', '350+', 'Airports Covered'], ['⏱', '60 Min', 'Avg. Quotation Time'], ['🔒', '100%', 'Secured Payments']].map(([icon, num, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, border: '1px solid var(--white-30)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--gold)', lineHeight: 1 }}>{num}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--white-60)', marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BOOKING CARD */}
      <section id="book" ref={bookRef} style={{ padding: '0 48px 100px', animation: 'fadeUp 0.6s 0.4s ease both' }}>
        {/* Flow progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '20px 0 24px' }}>
          {['Your Route', 'Live Quotes', 'Confirm'].map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: i === 0 ? '2px solid var(--gold)' : '2px solid var(--white-10)', background: i === 0 ? 'var(--gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: i === 0 ? '#0c1324' : 'var(--white-30)', fontWeight: i === 0 ? 700 : 400 }}>{i + 1}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: i === 0 ? 'var(--gold)' : 'var(--white-30)', whiteSpace: 'nowrap' }}>{label}</div>
              </div>
              {i < 2 && <div style={{ width: 60, height: 1, background: 'var(--white-10)', margin: '0 8px', marginBottom: 14 }} />}
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: 4, padding: '40px 48px', backdropFilter: 'blur(8px)', maxWidth: 1100 }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, marginBottom: 6 }}>Book a charter flight</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)' }}>Get verified quotations within 60 minutes</div>
          </div>

          {/* Aircraft type */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {AIRCRAFT_TYPES.map(({ label, value }) => (
              <button key={value} style={s.acBtn(aircraftType === value)} onClick={() => setAircraftType(value)}>{label}</button>
            ))}
          </div>

          {/* Trip type */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 28 }}>
            {TRIP_TYPES.map(t => (
              <button key={t} style={s.tripBtn(tripType === t)} onClick={() => setTripType(t)}>{t}</button>
            ))}
          </div>

          {/* Inputs */}
          {tripType !== 'Multiple Sectors' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={s.inputLabel}>From</label>
                <AirportInput id="departure" placeholder="Departure city or airport" value={departure} onChange={setDeparture} tabIndex={1} />
                {errors.departure && <div style={s.errorMsg}>{errors.departure}</div>}
              </div>
              <div>
                <label style={s.inputLabel}>To</label>
                <AirportInput id="destination" placeholder="Destination city or airport" value={destination} onChange={setDestination} tabIndex={2} />
                {errors.destination && <div style={s.errorMsg}>{errors.destination}</div>}
              </div>
              <div>
                <label style={s.inputLabel}>Departure Date & Time</label>
                <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} tabIndex={3}
                  style={s.inputField} onFocus={e => e.target.style.borderColor = 'var(--gold)'} onBlur={e => e.target.style.borderColor = 'var(--white-10)'} />
                {errors.dateTime && <div style={s.errorMsg}>{errors.dateTime}</div>}
                {tripType === 'Round Trip' && (
                  <>
                    <label style={{ ...s.inputLabel, marginTop: 12 }}>Return Date & Time</label>
                    <input type="datetime-local" value={returnDateTime} onChange={e => setReturnDateTime(e.target.value)} tabIndex={4}
                      style={s.inputField} onFocus={e => e.target.style.borderColor = 'var(--gold)'} onBlur={e => e.target.style.borderColor = 'var(--white-10)'} />
                    {errors.returnDateTime && <div style={s.errorMsg}>{errors.returnDateTime}</div>}
                  </>
                )}
              </div>
              <div>
                <label style={s.inputLabel}>Passengers</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--white-10)', border: '1px solid var(--white-10)', borderRadius: 2, padding: '12px 16px', height: 48 }}>
                  <button onClick={() => setPax(p => Math.max(1, p - 1))} style={{ width: 24, height: 24, border: '1px solid var(--white-30)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--white)', fontSize: 16, background: 'transparent' }}>−</button>
                  <span style={{ fontSize: 15, color: 'var(--white)', minWidth: 20, textAlign: 'center' }}>{pax}</span>
                  <button onClick={() => setPax(p => Math.min(19, p + 1))} style={{ width: 24, height: 24, border: '1px solid var(--white-30)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--white)', fontSize: 16, background: 'transparent' }}>+</button>
                </div>
              </div>
            </div>
          )}

          {/* Special reqs + CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={s.inputLabel}>Special Requirements</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                {SPECIAL_REQS.map(r => (
                  <button key={r} onClick={() => toggleSpecial(r)} style={s.chip(specials.includes(r))}>{r}</button>
                ))}
              </div>
            </div>
            <button onClick={getQuotes} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: loading ? 'rgba(251,191,36,0.5)' : 'var(--gold)', color: 'var(--navy)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, cursor: loading ? 'not-allowed' : 'pointer', border: 'none', fontWeight: 500, whiteSpace: 'nowrap', transition: 'background 0.2s' }}>
              {loading ? 'Saving...' : 'Get Fastest Quotes'}
              <span style={{ fontSize: 18, transition: 'transform 0.2s' }}>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
     <section style={{ padding: '100px 48px', maxWidth: 1280, margin: '0 auto' }}>

<div style={{ 
fontFamily: 'var(--font-mono)', 
fontSize: 11, 
letterSpacing: 3, 
textTransform: 'uppercase', 
color: 'var(--gold)', 
marginBottom:16 
}}>
The Process
</div>


<h2 style={{ 
fontFamily:'var(--font-display)', 
fontSize:'clamp(36px,4vw,52px)', 
fontWeight:400, 
lineHeight:1.1, 
marginBottom:56 
}}>
Fly private in 3 simple steps
</h2>


<div style={{ 
display:'grid', 
gridTemplateColumns:'repeat(3,1fr)', 
gap:40 
}}>


{[
['01','Enter trip details','Specify your route, dates, and number of passengers. Our system instantly notifies all available verified operators.'],
['02','Get quotes','Receive competitive quotes from multiple DGCA-licensed operators within 60 minutes — directly, with no middlemen.'],
['03','Compare & book','Review aircraft specs, photos, and operator details. Book your preferred choice with one click and secured payment.'],
].map(([num,title,desc])=>(


<div 
key={num}
style={{
position:'relative',
padding:36,
border:'1px solid rgba(251,191,36,0.55)',
borderRadius:4,
background:'rgba(255,255,255,0.03)',
transition:'all 0.3s'
}}

onMouseEnter={e=>{
e.currentTarget.style.borderColor='var(--gold)'
}}

onMouseLeave={e=>{
e.currentTarget.style.borderColor='rgba(251,191,36,0.55)'
}}

>


<div style={{
fontFamily:'var(--font-display)',
fontSize:64,
fontWeight:700,
color:'rgba(251,191,36,0.35)',
lineHeight:1,
marginBottom:16,
textShadow:'0 0 20px rgba(251,191,36,0.25)'
}}>
{num}
</div>


<div style={{
fontFamily:'var(--font-display)',
fontSize:22,
fontWeight:400,
marginBottom:12
}}>
{title}
</div>


<p style={{
fontSize:14,
lineHeight:1.7,
color:'var(--white-60)'
}}>
{desc}
</p>


</div>


))}


</div>

</section>

      {/* WHY SKYVAYU */}
      <section style={{ padding: '100px 48px', background: 'var(--navy-mid)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 }}>Why SkyVayu</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 400, lineHeight: 1.1 }}>Built for those who value their time</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginTop: 56 }}>
            {[
              ['✓', 'Verified operators only', 'Every operator on SkyVayu is DGCA licensed and manually verified before activation. Safety is a baseline, not a selling point.'],
              ['⚡', 'Live competitive quotes', 'Operators compete in real time. You always get the best market rate, not a fixed inflated price.'],
              ['🌏', 'Domestic and international', 'From Leh to Lakshadweep or Mumbai to Dubai — one platform for all your charter needs across 350+ airports.'],
              ['₹', 'No hidden charges', 'No hidden charges — fully transparent pricing on every quotation. GST applicable.'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ padding: 40, border: '1px solid rgba(251,191,36,0.35)', borderRadius: 4, background: 'rgba(255,255,255,0.02)', transition: 'all 0.3s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.8)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.35)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}>
                <div style={{ width: 48, height: 48, border: '1px solid rgba(251,191,36,0.5)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 20 }}>{icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, marginBottom: 12 }}>{title}</div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--white-60)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR ROUTES */}
      <section style={{ 
  background: 'var(--navy)', 
  padding: '100px 48px', 
  maxWidth: 1280, 
  margin: '0 auto' 
}}>

<div style={{
  overflow:'hidden',
  width:'100%'
}}>

<div
style={{
 display:'flex',
 transition:'transform 0.6s ease',
 transform:`translateX(-${activeSlide * 100}%)`
}}
>

{
routes.map(([img,name,from,to,badge])=>(

<div
key={name}
style={{
 minWidth:'100%',
 position:'relative',
 borderRadius:4,
 overflow:'hidden',
 cursor:'pointer'
}}
onClick={()=>prefillRoute(from,to)}
>


<img
src={img}
alt={name}
style={{
 width:'100%',
 height:260,
 objectFit:'cover',
 display:'block',
 transition:'transform 0.5s'
}}

onMouseEnter={e=>{
 e.currentTarget.style.transform='scale(1.04)'
}}

onMouseLeave={e=>{
 e.currentTarget.style.transform='scale(1)'
}}
/>


<div style={{
 position:'absolute',
 inset:0,
 background:'linear-gradient(to top, rgba(12,19,36,0.95) 0%, transparent 60%)'
}}/>


{
badge &&
<div style={{
 position:'absolute',
 top:16,
 left:16,
 fontFamily:'var(--font-mono)',
 fontSize:9,
 letterSpacing:'1.5px',
 textTransform:'uppercase',
 background:'var(--gold)',
 color:'var(--navy)',
 padding:'4px 10px',
 borderRadius:2,
 fontWeight:500
}}>
{badge}
</div>
}


<div style={{
 position:'absolute',
 bottom:0,
 left:0,
 right:0,
 padding:20,
 display:'flex',
 justifyContent:'space-between',
 alignItems:'flex-end'
}}>


<div style={{
 fontFamily:'var(--font-display)',
 fontSize:22,
 fontWeight:400
}}>
{name}
</div>


<button
style={{
 fontFamily:'var(--font-mono)',
 fontSize:10,
 letterSpacing:'1.5px',
 textTransform:'uppercase',
 color:'var(--gold)',
 border:'1px solid var(--gold)',
 padding:'7px 14px',
 borderRadius:2,
 background:'transparent',
 cursor:'pointer'
}}
>
Book Now
</button>


</div>


</div>

))

}

</div>


</div>


{/* Slider dots */}

<div style={{
display:'flex',
justifyContent:'center',
gap:8,
marginTop:20
}}>

{
routes.map((_,index)=>(

<div
key={index}
onClick={()=>setActiveSlide(index)}
style={{
width:8,
height:8,
borderRadius:'50%',
cursor:'pointer',
background:
activeSlide===index
? 'var(--gold)'
: 'rgba(255,255,255,0.3)'
}}
/>

))
}

</div>
</section>

      {/* FINAL CTA */}
      <section style={{ position: 'relative', padding: '120px 48px', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.2)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(12,19,36,0.3) 0%, rgba(12,19,36,0.8) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 6vw, 72px)', fontWeight: 400, marginBottom: 20, lineHeight: 1.1 }}>Ready to fly private?</h2>
          <p style={{ fontSize: 17, color: 'var(--white-60)', marginBottom: 48, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>Experience the pinnacle of aviation logistics. Get your verified quotes in under an hour.</p>
          <button onClick={() => bookRef.current?.scrollIntoView({ behavior: 'smooth' })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--gold)', color: 'var(--navy)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, cursor: 'pointer', border: 'none', fontWeight: 500 }}>
            Get Fastest Quotes <span>→</span>
          </button>
        </div>
      </section>
    </div>
  )
}
