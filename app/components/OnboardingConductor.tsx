'use client'

import { useState, useRef } from 'react'
import { Eye, EyeOff, Upload, ChevronRight, Check, X, FileText, Shield } from 'lucide-react'

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type OnboardingStep = 'welcome' | 'register' | 'login' | 'documents' | 'legal'

type DocFile = { file: File; preview: string } | null

interface Props {
  onComplete: (data: { authId: string; conductorId: string }) => void
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const inputCls = (err?: string) =>
  `w-full border ${err ? 'border-red-400 bg-red-50' : 'border-slate-300'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white`

const Label = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
    {children}{req && <span className="text-red-500 ml-0.5">*</span>}
  </label>
)

const Err = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-xs text-red-500 mt-0.5">{msg}</p> : null

// ─── UPLOAD BOX ──────────────────────────────────────────────────────────────
function UploadBox({
  label, accept = 'image/*,.pdf', value, onChange, error
}: {
  label: string
  accept?: string
  value: DocFile
  onChange: (f: DocFile) => void
  error?: string
}) {
  const ref = useRef<HTMLInputElement>(null)

  const handle = (file: File) => {
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
    onChange({ file, preview })
  }

  return (
    <div>
      <Label>{label}</Label>
      <div
        onClick={() => ref.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[100px] ${
          error ? 'border-red-400 bg-red-50' : value ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
        }`}
      >
        {value ? (
          <div className="flex items-center gap-3 w-full">
            {value.preview
              ? <img src={value.preview} alt="" className="w-16 h-16 object-cover rounded-lg" />
              : <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center"><FileText className="w-6 h-6 text-slate-500" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-green-700 truncate">{value.file.name}</p>
              <p className="text-xs text-slate-400">{(value.file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onChange(null) }}
              className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <X className="w-3 h-3 text-red-500" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-slate-400 mb-2" />
            <p className="text-xs text-slate-500 text-center">Toca para subir<br /><span className="text-slate-400">JPG, PNG o PDF</span></p>
          </>
        )}
        <input ref={ref} type="file" accept={accept} className="hidden"
          onChange={e => e.target.files?.[0] && handle(e.target.files[0])} />
      </div>
      <Err msg={error} />
    </div>
  )
}

// ─── STEP 1: BIENVENIDA ──────────────────────────────────────────────────────
function StepWelcome({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center py-12">
        <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center mb-6 shadow-2xl backdrop-blur">
          <span className="text-5xl">🚘</span>
        </div>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">RR</span>
          </div>
          <span className="text-white/50 text-xs font-medium tracking-widest uppercase">Ruum Ruum · Conductor</span>
        </div>
        <h1 className="text-3xl font-black text-white mb-4 leading-tight">
          Genera ingresos trasladando vehículos
        </h1>
        <p className="text-white/60 text-sm leading-relaxed max-w-xs">
          Únete a nuestra red de conductores certificados. Trabaja a tu ritmo, recibe pagos puntuales y construye tu reputación.
        </p>

        {/* Beneficios */}
        <div className="mt-8 space-y-3 w-full max-w-xs">
          {[
            { icon: '💰', text: 'Pagos semanales garantizados' },
            { icon: '🗓️', text: 'Tú decides cuándo trabajar' },
            { icon: '📍', text: 'Viajes en tu zona o foráneos' },
          ].map(b => (
            <div key={b.text} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              <span className="text-xl">{b.icon}</span>
              <span className="text-white/80 text-sm font-medium">{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Botones */}
      <div className="px-8 pb-12 space-y-3">
        <button
          onClick={onRegister}
          className="w-full bg-white text-slate-900 font-bold py-4 rounded-2xl text-base shadow-xl hover:bg-white/90 transition-all active:scale-95"
        >
          Registrarme como conductor
        </button>
        <button
          onClick={onLogin}
          className="w-full border-2 border-white/30 text-white font-semibold py-4 rounded-2xl text-base hover:bg-white/5 transition-all active:scale-95"
        >
          Ya tengo cuenta
        </button>
      </div>
    </div>
  )
}

// ─── STEP 2: REGISTRO ────────────────────────────────────────────────────────
function StepRegister({
  onBack, onNext
}: {
  onBack: () => void
  onNext: (data: { nombre: string; apellido: string; telefono: string; email: string; password: string }) => void
}) {
  const [form, setForm] = useState({ nombre: '', apellido: '', telefono: '', email: '', password: '', confirmar: '' })
  const [show, setShow] = useState(false)
  const [showC, setShowC] = useState(false)
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const set = (k: keyof typeof form, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e: Partial<typeof form> = {}
    if (!form.nombre.trim())   e.nombre    = 'Requerido'
    if (!form.apellido.trim()) e.apellido  = 'Requerido'
    if (!form.telefono || form.telefono.replace(/\D/g,'').length < 10) e.telefono = 'Ingresa 10 dígitos'
    if (!form.email)           e.email     = 'Requerido'
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (form.password !== form.confirmar) e.confirmar = 'Las contraseñas no coinciden'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const fmtTel = (v: string) => {
    const d = v.replace(/\D/g,'').slice(0,10)
    return d.length<=3?d:d.length<=6?`${d.slice(0,3)}-${d.slice(3)}`:`${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 px-6 pt-12 pb-6">
        <button onClick={onBack} className="text-white/60 text-sm mb-4 flex items-center gap-1 hover:text-white">
          ← Regresar
        </button>
        <h2 className="text-2xl font-black text-white">Crear cuenta</h2>
        <p className="text-white/50 text-sm mt-1">Empieza tu registro como conductor</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label req>Nombre(s)</Label>
            <input type="text" value={form.nombre} placeholder="NOMBRE(S)"
              onChange={e => set('nombre', e.target.value.toUpperCase())} className={inputCls(errors.nombre)} />
            <Err msg={errors.nombre} />
          </div>
          <div>
            <Label req>Apellido(s)</Label>
            <input type="text" value={form.apellido} placeholder="APELLIDO(S)"
              onChange={e => set('apellido', e.target.value.toUpperCase())} className={inputCls(errors.apellido)} />
            <Err msg={errors.apellido} />
          </div>
        </div>

        <div>
          <Label req>Teléfono celular</Label>
          <div className="flex gap-2">
            <div className="px-3 py-3 border border-slate-300 rounded-xl text-sm text-slate-600 bg-slate-50 whitespace-nowrap">🇲🇽 +52</div>
            <input type="tel" value={form.telefono} placeholder="55-0000-0000"
              onChange={e => set('telefono', fmtTel(e.target.value))} className={`flex-1 ${inputCls(errors.telefono)}`} />
          </div>
          <Err msg={errors.telefono} />
        </div>

        <div>
          <Label req>Correo electrónico</Label>
          <input type="email" value={form.email} placeholder="correo@ejemplo.com"
            onChange={e => set('email', e.target.value)} className={inputCls(errors.email)} />
          <Err msg={errors.email} />
        </div>

        <div>
          <Label req>Contraseña</Label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={form.password} placeholder="Mínimo 8 caracteres"
              onChange={e => set('password', e.target.value)} className={inputCls(errors.password)} />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <Err msg={errors.password} />
        </div>

        <div>
          <Label req>Confirmar contraseña</Label>
          <div className="relative">
            <input type={showC ? 'text' : 'password'} value={form.confirmar} placeholder="Repite tu contraseña"
              onChange={e => set('confirmar', e.target.value)} className={inputCls(errors.confirmar)} />
            <button type="button" onClick={() => setShowC(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              {showC ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <Err msg={errors.confirmar} />
        </div>
      </div>

      <div className="p-6 border-t border-slate-100">
        <button
          onClick={() => { if (validate()) onNext(form) }}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl text-base hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          Continuar <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// ─── STEP 2B: LOGIN ──────────────────────────────────────────────────────────
function StepLogin({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError('Completa todos los campos'); return }
    setLoading(true)
    setError('')
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const { error: err } = await sb.auth.signInWithPassword({ email: form.email, password: form.password })
      if (err) { setError('Correo o contraseña incorrectos'); return }
      onNext()
    } catch { setError('Error de conexión. Intenta de nuevo.') }
    finally { setLoading(false) }
  }

  const handleForgot = async () => {
    if (!form.email) { setError('Ingresa tu correo primero'); return }
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await sb.auth.resetPasswordForEmail(form.email)
    setForgotSent(true)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-slate-900 px-6 pt-12 pb-6">
        <button onClick={onBack} className="text-white/60 text-sm mb-4 flex items-center gap-1 hover:text-white">← Regresar</button>
        <h2 className="text-2xl font-black text-white">Iniciar sesión</h2>
        <p className="text-white/50 text-sm mt-1">Bienvenido de nuevo</p>
      </div>

      <div className="flex-1 p-6 space-y-4">
        <div>
          <Label req>Correo electrónico</Label>
          <input type="email" value={form.email} placeholder="correo@ejemplo.com"
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls(error ? ' ' : '')} />
        </div>
        <div>
          <Label req>Contraseña</Label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={form.password} placeholder="Tu contraseña"
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={inputCls(error ? ' ' : '')}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        {forgotSent
          ? <p className="text-xs text-green-600 font-medium">✓ Te enviamos un correo para restablecer tu contraseña</p>
          : <button onClick={handleForgot} className="text-sm text-blue-600 font-medium hover:underline">
              ¿Olvidaste tu contraseña?
            </button>
        }
      </div>

      <div className="p-6 border-t border-slate-100">
        <button onClick={handleLogin} disabled={loading}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl text-base hover:bg-slate-800 disabled:opacity-60 transition-all active:scale-95">
          {loading ? 'Verificando...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}

// ─── STEP 3: DOCUMENTOS ──────────────────────────────────────────────────────
type LicenciaTipo = 'A' | 'B' | 'C' | 'D' | 'E' | ''

function StepDocumentos({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [licTipo, setLicTipo] = useState<LicenciaTipo>('')
  const [licNumero, setLicNumero] = useState('')
  const [licVigencia, setLicVigencia] = useState('')
  const [licFrente, setLicFrente] = useState<DocFile>(null)
  const [licReverso, setLicReverso] = useState<DocFile>(null)

  const [ineNumero, setIneNumero] = useState('')
  const [ineVigencia, setIneVigencia] = useState('')
  const [ineFrente, setIneFrente] = useState<DocFile>(null)

  const [domicilio, setDomicilio] = useState<DocFile>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!licTipo)      e.licTipo    = 'Selecciona tipo'
    if (!licNumero)    e.licNumero  = 'Requerido'
    if (!licVigencia)  e.licVigencia= 'Requerido'
    if (!licFrente)    e.licFrente  = 'Sube la imagen'
    if (!licReverso)   e.licReverso = 'Sube la imagen'
    if (!ineNumero)    e.ineNumero  = 'Requerido'
    if (!ineVigencia)  e.ineVigencia= 'Requerido'
    if (!ineFrente)    e.ineFrente  = 'Sube la imagen'
    if (!domicilio)    e.domicilio  = 'Sube el comprobante'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-slate-900 px-6 pt-12 pb-6">
        <button onClick={onBack} className="text-white/60 text-sm mb-4 flex items-center gap-1 hover:text-white">← Regresar</button>
        <h2 className="text-2xl font-black text-white">Tus documentos</h2>
        <p className="text-white/50 text-sm mt-1">Los revisaremos en menos de 24 horas</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── Licencia ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-lg">🪪</span>
            <p className="text-sm font-bold text-slate-800">Licencia de conducir</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label req>Tipo</Label>
              <select value={licTipo} onChange={e => { setLicTipo(e.target.value as LicenciaTipo); setErrors(er => ({ ...er, licTipo: '' })) }}
                className={inputCls(errors.licTipo)}>
                <option value="">Seleccionar...</option>
                {['A','B','C','D','E'].map(t => <option key={t} value={t}>Tipo {t}</option>)}
              </select>
              <Err msg={errors.licTipo} />
            </div>
            <div>
              <Label req>Número</Label>
              <input type="text" value={licNumero} placeholder="N° LICENCIA"
                onChange={e => { setLicNumero(e.target.value.toUpperCase()); setErrors(er => ({ ...er, licNumero: '' })) }}
                className={inputCls(errors.licNumero)} />
              <Err msg={errors.licNumero} />
            </div>
            <div className="col-span-2">
              <Label req>Vigencia</Label>
              <input type="date" value={licVigencia}
                onChange={e => { setLicVigencia(e.target.value); setErrors(er => ({ ...er, licVigencia: '' })) }}
                className={inputCls(errors.licVigencia)} />
              <Err msg={errors.licVigencia} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <UploadBox label="Frente" value={licFrente} onChange={v => { setLicFrente(v); setErrors(er => ({ ...er, licFrente: '' })) }} error={errors.licFrente} />
            <UploadBox label="Reverso" value={licReverso} onChange={v => { setLicReverso(v); setErrors(er => ({ ...er, licReverso: '' })) }} error={errors.licReverso} />
          </div>
        </div>

        {/* ── INE ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-lg">🪪</span>
            <p className="text-sm font-bold text-slate-800">Identificación oficial (INE)</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label req>Número de folio</Label>
              <input type="text" value={ineNumero} placeholder="FOLIO INE"
                onChange={e => { setIneNumero(e.target.value.toUpperCase()); setErrors(er => ({ ...er, ineNumero: '' })) }}
                className={inputCls(errors.ineNumero)} />
              <Err msg={errors.ineNumero} />
            </div>
            <div>
              <Label req>Vigencia</Label>
              <input type="date" value={ineVigencia}
                onChange={e => { setIneVigencia(e.target.value); setErrors(er => ({ ...er, ineVigencia: '' })) }}
                className={inputCls(errors.ineVigencia)} />
              <Err msg={errors.ineVigencia} />
            </div>
          </div>
          <UploadBox label="Frente (foto o PDF)" value={ineFrente} onChange={v => { setIneFrente(v); setErrors(er => ({ ...er, ineFrente: '' })) }} error={errors.ineFrente} accept="image/*,.pdf" />
        </div>

        {/* ── Comprobante domicilio ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-lg">🏠</span>
            <p className="text-sm font-bold text-slate-800">Comprobante de domicilio</p>
            <span className="text-xs text-slate-400">(máx. 3 meses de antigüedad)</span>
          </div>
          <UploadBox label="Foto o PDF del comprobante" accept="image/*,.pdf" value={domicilio}
            onChange={v => { setDomicilio(v); setErrors(er => ({ ...er, domicilio: '' })) }} error={errors.domicilio} />
        </div>

        {Object.keys(errors).length > 0 && (
          <p className="text-xs text-red-500 font-medium text-center">
            Completa todos los campos marcados antes de continuar
          </p>
        )}
      </div>

      <div className="p-6 border-t border-slate-100">
        <button onClick={() => { if (validate()) onNext() }}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl text-base hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2">
          Continuar <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// ─── STEP 4: TÉRMINOS Y CONDICIONES ──────────────────────────────────────────
function StepLegal({ onBack, onAccept, loading }: { onBack: () => void; onAccept: () => void; loading: boolean }) {
  const [checks, setChecks] = useState({ terminos: false, privacidad: false, conducta: false })
  const toggle = (k: keyof typeof checks) => setChecks(c => ({ ...c, [k]: !c[k] }))
  const allChecked = Object.values(checks).every(Boolean)

  const items = [
    { key: 'terminos' as const, title: 'Términos y condiciones', desc: 'Acepto los términos de uso de la plataforma Ruum Ruum, incluyendo las políticas de pago, cancelación y operación de traslados.' },
    { key: 'privacidad' as const, title: 'Aviso de privacidad', desc: 'Autorizo el tratamiento de mis datos personales conforme al aviso de privacidad de MoviliaX S.A. de C.V.' },
    { key: 'conducta' as const, title: 'Código de conducta', desc: 'Me comprometo a tratar los vehículos con cuidado, reportar evidencia honestamente y mantener comunicación con el equipo de operaciones.' },
  ]

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-slate-900 px-6 pt-12 pb-6">
        <button onClick={onBack} className="text-white/60 text-sm mb-4 flex items-center gap-1 hover:text-white">← Regresar</button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Documentos legales</h2>
            <p className="text-white/50 text-sm">Último paso para activar tu cuenta</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {items.map(item => (
          <button key={item.key} onClick={() => toggle(item.key)}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-colors ${
              checks[item.key] ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }`}>
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                checks[item.key] ? 'border-green-500 bg-green-500' : 'border-slate-300 bg-white'
              }`}>
                {checks[item.key] && <Check className="w-3 h-3 text-white" />}
              </div>
              <div>
                <p className={`text-sm font-bold mb-1 ${checks[item.key] ? 'text-green-700' : 'text-slate-800'}`}>
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          </button>
        ))}

        {!allChecked && (
          <p className="text-xs text-slate-400 text-center">
            Acepta todos los documentos para continuar
          </p>
        )}
      </div>

      <div className="p-6 border-t border-slate-100">
        <button onClick={onAccept} disabled={!allChecked || loading}
          className={`w-full font-bold py-4 rounded-2xl text-base transition-all active:scale-95 ${
            allChecked && !loading
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}>
          {loading ? 'Creando cuenta...' : '✓ Activar mi cuenta'}
        </button>
      </div>
    </div>
  )
}

// ─── ONBOARDING CONDUCTOR (orquestador) ──────────────────────────────────────
export default function OnboardingConductor({ onComplete }: Props) {
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [registerData, setRegisterData] = useState<{
    nombre: string; apellido: string; telefono: string; email: string; password: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRegisterNext = (data: typeof registerData) => {
    setRegisterData(data)
    setStep('documents')
  }

  const handleLoginSuccess = () => {
    // Ya autenticado — ir directo a la app principal
    onComplete({ authId: '', conductorId: '' })
  }

  const handleDocumentsNext = () => {
    setStep('legal')
  }

  const handleAcceptLegal = async () => {
    if (!registerData) return
    setLoading(true)
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await sb.auth.signUp({
        email: registerData.email,
        password: registerData.password,
      })
      if (authError) throw authError

      const authId = authData.user?.id
      if (!authId) throw new Error('No se pudo crear el usuario')

      // 2. Insertar en tabla conductores
      const { data: conductor, error: condError } = await sb.from('conductores').insert({
        auth_id:       authId,
        nombre:        registerData.nombre,
        apellido:      registerData.apellido,
        telefono:      registerData.telefono,
        email:         registerData.email,
        disponibilidad:'No disponible',
        certificacion: 'Pendiente de validación',
        calificacion:  0,
      }).select('id').single()

      if (condError) throw condError

      // 3. Registrar en timeline/notas
      await sb.from('timeline_viaje').insert({
        viaje_id: null,
        evento: 'Conductor registrado vía onboarding',
        actor: `${registerData.nombre} ${registerData.apellido}`,
        actor_tipo: 'conductor',
      }).catch(() => {}) // no crítico

      onComplete({ authId, conductorId: conductor.id })

    } catch (e) {
      console.error('Error en registro:', e)
      alert('Ocurrió un error al crear tu cuenta. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  switch (step) {
    case 'welcome':
      return <StepWelcome onRegister={() => setStep('register')} onLogin={() => setStep('login')} />
    case 'register':
      return <StepRegister onBack={() => setStep('welcome')} onNext={handleRegisterNext} />
    case 'login':
      return <StepLogin onBack={() => setStep('welcome')} onNext={handleLoginSuccess} />
    case 'documents':
      return <StepDocumentos onBack={() => setStep('register')} onNext={handleDocumentsNext} />
    case 'legal':
      return <StepLegal onBack={() => setStep('documents')} onAccept={handleAcceptLegal} loading={loading} />
  }
}
