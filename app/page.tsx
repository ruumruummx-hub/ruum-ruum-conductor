"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  AlertCircle, Camera, Car, Check, ChevronRight,
  FileText, Fuel, Gauge, Home, Landmark, MapPin,
  Settings, Star, User, Wallet, X, Loader,
  Eye, EyeOff, Upload, Shield
} from "lucide-react";

// ─── SUPABASE ────────────────────────────────────────────────────────────────
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type View = "panel" | "viajes" | "ganancias" | "configuracion";
type TripTab = "solicitados" | "aceptados";
type OnboardingStep = "welcome" | "register" | "login" | "documents" | "legal";
type DocFile = { file: File; preview: string } | null;

interface ConductorPerfil {
  id: string
  nombre: string
  apellido: string
  telefono: string
  disponibilidad: string
  calificacion: number
  viajes_realizados: number
  ganancias_total: number
}

interface ViajeDB {
  id: string
  folio: string | null
  status: string
  fecha_programada: string | null
  hora_programada: string | null
  origen_calle: string | null
  origen_colonia: string | null
  origen_estado: string | null
  origen_contacto: string | null
  origen_telefono: string | null
  destino_calle: string | null
  destino_colonia: string | null
  destino_estado: string | null
  destino_contacto: string | null
  destino_telefono: string | null
  instrucciones: string | null
  pago_conductor: number
  gastos_autorizados: number
  vehiculos: { marca: string; modelo: string; placas: string; transmision: string | null } | null
  usuarios: { nombre: string; apellido: string } | null
}

interface PagoResumen {
  id: string
  periodo: string
  viajes_revisados: number
  ganancias: number
  gastos_autorizados: number
  ajustes: number
  deposito_esperado: number
  estatus: string
  fecha_pago: string | null
}

const navItems = [
  { id: "panel" as View,         label: "Panel",     icon: Home },
  { id: "viajes" as View,        label: "Viajes",    icon: Car },
  { id: "ganancias" as View,     label: "Ganancias", icon: Wallet },
  { id: "configuracion" as View, label: "Config.",   icon: Settings },
];

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── ONBOARDING HELPERS ──────────────────────────────────────────────────────
const inputCls = (err?: string) =>
  `w-full border ${err ? "border-red-400 bg-red-50" : "border-slate-300"} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white`

function OLabel({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
      {children}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function OErr({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-red-500 mt-0.5">{msg}</p> : null
}

function UploadBox({ label, accept = "image/*,.pdf", value, onChange, error }: {
  label: string; accept?: string; value: DocFile
  onChange: (f: DocFile) => void; error?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const handle = (file: File) => {
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : ""
    onChange({ file, preview })
  }
  return (
    <div>
      <OLabel>{label}</OLabel>
      <div
        onClick={() => ref.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[90px] ${
          error ? "border-red-400 bg-red-50" : value ? "border-green-400 bg-green-50" : "border-slate-300 hover:border-slate-400 bg-slate-50"
        }`}
      >
        {value ? (
          <div className="flex items-center gap-3 w-full">
            {value.preview
              ? <img src={value.preview} alt="" className="w-14 h-14 object-cover rounded-lg" />
              : <div className="w-14 h-14 bg-slate-200 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-slate-500" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-green-700 truncate">{value.file.name}</p>
              <p className="text-xs text-slate-400">{(value.file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button onClick={e => { e.stopPropagation(); onChange(null) }}
              className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <X className="w-3 h-3 text-red-500" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-5 h-5 text-slate-400 mb-1" />
            <p className="text-xs text-slate-500 text-center">Toca para subir<br /><span className="text-slate-400">JPG, PNG o PDF</span></p>
          </>
        )}
        <input ref={ref} type="file" accept={accept} className="hidden"
          onChange={e => e.target.files?.[0] && handle(e.target.files[0])} />
      </div>
      <OErr msg={error} />
    </div>
  )
}

// ─── ONBOARDING: BIENVENIDA ──────────────────────────────────────────────────
function StepWelcome({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center py-12">
        <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
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
          Únete a nuestra red de conductores certificados. Trabaja a tu ritmo y recibe pagos puntuales.
        </p>
        <div className="mt-8 space-y-3 w-full max-w-xs">
          {[
            { icon: "💰", text: "Pagos semanales garantizados" },
            { icon: "🗓️", text: "Tú decides cuándo trabajar" },
            { icon: "📍", text: "Viajes en tu zona o foráneos" },
          ].map(b => (
            <div key={b.text} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              <span className="text-xl">{b.icon}</span>
              <span className="text-white/80 text-sm font-medium">{b.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="px-8 pb-12 space-y-3">
        <button onClick={onRegister}
          className="w-full bg-white text-slate-900 font-bold py-4 rounded-2xl text-base shadow-xl hover:bg-white/90 transition-all active:scale-95">
          Registrarme como conductor
        </button>
        <button onClick={onLogin}
          className="w-full border-2 border-white/30 text-white font-semibold py-4 rounded-2xl text-base hover:bg-white/5 transition-all active:scale-95">
          Ya tengo cuenta
        </button>
      </div>
    </div>
  )
}

// ─── ONBOARDING: REGISTRO ────────────────────────────────────────────────────
function StepRegister({ onBack, onNext }: {
  onBack: () => void
  onNext: (data: { nombre: string; apellido: string; telefono: string; email: string; password: string; curp: string; municipio: string; estado: string; banco: string; clabe: string; titular: string }) => void
}) {
  const [form, setForm] = useState({
    nombre: "", apellido: "", curp: "", telefono: "", email: "",
    password: "", confirmar: "",
    municipio: "", estado: "",
    banco: "", clabe: "", titular: "",
  })
  const [show, setShow] = useState(false)
  const [showC, setShowC] = useState(false)
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const set = (k: keyof typeof form, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })) }
  const fmtTel = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 10)
    return d.length <= 3 ? d : d.length <= 6 ? `${d.slice(0,3)}-${d.slice(3)}` : `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`
  }

  const validate = () => {
    const e: Partial<typeof form> = {}
    if (!form.nombre.trim())    e.nombre    = "Requerido"
    if (!form.apellido.trim())  e.apellido  = "Requerido"
    if (form.telefono.replace(/\D/g,"").length < 10) e.telefono = "Ingresa 10 dígitos"
    if (!form.email)            e.email     = "Requerido"
    if (form.password.length < 8) e.password = "Mínimo 8 caracteres"
    if (form.password !== form.confirmar) e.confirmar = "Las contraseñas no coinciden"
    if (!form.municipio.trim()) e.municipio = "Requerido"
    if (!form.estado.trim())    e.estado    = "Requerido"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const sec = "text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2 mb-3"

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-slate-900 px-6 pt-12 pb-6">
        <button onClick={onBack} className="text-white/60 text-sm mb-4 flex items-center gap-1 hover:text-white">← Regresar</button>
        <h2 className="text-2xl font-black text-white">Crear cuenta</h2>
        <p className="text-white/50 text-sm mt-1">Empieza tu registro como conductor</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── Datos personales ── */}
        <div>
          <p className={sec}>👤 Datos personales</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <OLabel req>Nombre(s)</OLabel>
                <input type="text" value={form.nombre} placeholder="NOMBRE(S)"
                  onChange={e => set("nombre", e.target.value.toUpperCase())} className={inputCls(errors.nombre)} />
                <OErr msg={errors.nombre} />
              </div>
              <div>
                <OLabel req>Apellido(s)</OLabel>
                <input type="text" value={form.apellido} placeholder="APELLIDO(S)"
                  onChange={e => set("apellido", e.target.value.toUpperCase())} className={inputCls(errors.apellido)} />
                <OErr msg={errors.apellido} />
              </div>
            </div>

            <div>
              <OLabel>CURP</OLabel>
              <input type="text" value={form.curp} placeholder="18 CARACTERES" maxLength={18}
                onChange={e => set("curp", e.target.value.toUpperCase())} className={inputCls()} />
            </div>

            <div>
              <OLabel req>Teléfono celular</OLabel>
              <div className="flex gap-2">
                <div className="px-3 py-3 border border-slate-300 rounded-xl text-sm text-slate-600 bg-slate-50 whitespace-nowrap">🇲🇽 +52</div>
                <input type="tel" value={form.telefono} placeholder="55-0000-0000"
                  onChange={e => set("telefono", fmtTel(e.target.value))} className={`flex-1 ${inputCls(errors.telefono)}`} />
              </div>
              <OErr msg={errors.telefono} />
            </div>

            <div>
              <OLabel req>Correo electrónico</OLabel>
              <input type="email" value={form.email} placeholder="correo@ejemplo.com"
                onChange={e => set("email", e.target.value)} className={inputCls(errors.email)} />
              <OErr msg={errors.email} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <OLabel req>Municipio / Alcaldía</OLabel>
                <input type="text" value={form.municipio} placeholder="MUNICIPIO"
                  onChange={e => set("municipio", e.target.value.toUpperCase())} className={inputCls(errors.municipio)} />
                <OErr msg={errors.municipio} />
              </div>
              <div>
                <OLabel req>Estado</OLabel>
                <input type="text" value={form.estado} placeholder="ESTADO"
                  onChange={e => set("estado", e.target.value.toUpperCase())} className={inputCls(errors.estado)} />
                <OErr msg={errors.estado} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Contraseña ── */}
        <div>
          <p className={sec}>🔒 Acceso a la cuenta</p>
          <div className="space-y-3">
            <div>
              <OLabel req>Contraseña</OLabel>
              <div className="relative">
                <input type={show ? "text" : "password"} value={form.password} placeholder="Mínimo 8 caracteres"
                  onChange={e => set("password", e.target.value)} className={inputCls(errors.password)} />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <OErr msg={errors.password} />
            </div>
            <div>
              <OLabel req>Confirmar contraseña</OLabel>
              <div className="relative">
                <input type={showC ? "text" : "password"} value={form.confirmar} placeholder="Repite tu contraseña"
                  onChange={e => set("confirmar", e.target.value)} className={inputCls(errors.confirmar)} />
                <button type="button" onClick={() => setShowC(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showC ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <OErr msg={errors.confirmar} />
            </div>
          </div>
        </div>

        {/* ── Cuenta bancaria ── */}
        <div>
          <p className={sec}>🏦 Cuenta bancaria <span className="text-slate-400 font-normal normal-case">(opcional — puedes completarla después)</span></p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <OLabel>Banco</OLabel>
                <input type="text" value={form.banco} placeholder="BBVA, SANTANDER..."
                  onChange={e => set("banco", e.target.value.toUpperCase())} className={inputCls()} />
              </div>
              <div>
                <OLabel>Titular de la cuenta</OLabel>
                <input type="text" value={form.titular} placeholder="NOMBRE COMPLETO"
                  onChange={e => set("titular", e.target.value.toUpperCase())} className={inputCls()} />
              </div>
            </div>
            <div>
              <OLabel>CLABE interbancaria</OLabel>
              <input type="text" value={form.clabe} placeholder="18 DÍGITOS" maxLength={18}
                onChange={e => set("clabe", e.target.value.replace(/\D/g,"").slice(0,18))} className={inputCls()} />
            </div>
          </div>
        </div>

      </div>

      <div className="p-6 border-t border-slate-100">
        <button onClick={() => { if (validate()) onNext(form) }}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl text-base hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2">
          Continuar <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// ─── ONBOARDING: LOGIN ───────────────────────────────────────────────────────
function StepLogin({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [form, setForm] = useState({ email: "", password: "" })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [forgotSent, setForgotSent] = useState(false)

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError("Completa todos los campos"); return }
    setLoading(true); setError("")
    try {
      const { error: err } = await sb.auth.signInWithPassword({ email: form.email, password: form.password })
      if (err) { setError("Correo o contraseña incorrectos"); return }
      onNext()
    } catch { setError("Error de conexión. Intenta de nuevo.") }
    finally { setLoading(false) }
  }

  const handleForgot = async () => {
    if (!form.email) { setError("Ingresa tu correo primero"); return }
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
          <OLabel req>Correo electrónico</OLabel>
          <input type="email" value={form.email} placeholder="correo@ejemplo.com"
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls()} />
        </div>
        <div>
          <OLabel req>Contraseña</OLabel>
          <div className="relative">
            <input type={show ? "text" : "password"} value={form.password} placeholder="Tu contraseña"
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleLogin()} className={inputCls()} />
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
          {loading ? "Verificando..." : "Entrar"}
        </button>
      </div>
    </div>
  )
}

// ─── ONBOARDING: DOCUMENTOS ──────────────────────────────────────────────────
function StepDocumentos({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [licTipo, setLicTipo] = useState("")
  const [licNumero, setLicNumero] = useState("")
  const [licVigencia, setLicVigencia] = useState("")
  const [licFrente, setLicFrente] = useState<DocFile>(null)
  const [licReverso, setLicReverso] = useState<DocFile>(null)
  const [ineNumero, setIneNumero] = useState("")
  const [ineVigencia, setIneVigencia] = useState("")
  const [ineFrente, setIneFrente] = useState<DocFile>(null)
  const [domicilio, setDomicilio] = useState<DocFile>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!licTipo)     e.licTipo     = "Selecciona tipo"
    if (!licNumero)   e.licNumero   = "Requerido"
    if (!licVigencia) e.licVigencia = "Requerido"
    if (!licFrente)   e.licFrente   = "Sube la imagen"
    if (!licReverso)  e.licReverso  = "Sube la imagen"
    if (!ineNumero)   e.ineNumero   = "Requerido"
    if (!ineVigencia) e.ineVigencia = "Requerido"
    if (!ineFrente)   e.ineFrente   = "Sube la imagen"
    if (!domicilio)   e.domicilio   = "Sube el comprobante"
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
        {/* Licencia */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-lg">🪪</span>
            <p className="text-sm font-bold text-slate-800">Licencia de conducir</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <OLabel req>Tipo</OLabel>
              <select value={licTipo}
                onChange={e => { setLicTipo(e.target.value); setErrors(er => ({ ...er, licTipo: "" })) }}
                className={inputCls(errors.licTipo)}>
                <option value="">Seleccionar...</option>
                {["A","B","C","D","E"].map(t => <option key={t} value={t}>Tipo {t}</option>)}
              </select>
              <OErr msg={errors.licTipo} />
            </div>
            <div>
              <OLabel req>Número</OLabel>
              <input type="text" value={licNumero} placeholder="N° LICENCIA"
                onChange={e => { setLicNumero(e.target.value.toUpperCase()); setErrors(er => ({ ...er, licNumero: "" })) }}
                className={inputCls(errors.licNumero)} />
              <OErr msg={errors.licNumero} />
            </div>
            <div className="col-span-2">
              <OLabel req>Vigencia</OLabel>
              <input type="date" value={licVigencia}
                onChange={e => { setLicVigencia(e.target.value); setErrors(er => ({ ...er, licVigencia: "" })) }}
                className={inputCls(errors.licVigencia)} />
              <OErr msg={errors.licVigencia} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <UploadBox label="Frente" value={licFrente}
              onChange={v => { setLicFrente(v); setErrors(er => ({ ...er, licFrente: "" })) }} error={errors.licFrente} />
            <UploadBox label="Reverso" value={licReverso}
              onChange={v => { setLicReverso(v); setErrors(er => ({ ...er, licReverso: "" })) }} error={errors.licReverso} />
          </div>
        </div>
        {/* INE */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-lg">🪪</span>
            <p className="text-sm font-bold text-slate-800">Identificación oficial (INE)</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <OLabel req>Número de folio</OLabel>
              <input type="text" value={ineNumero} placeholder="FOLIO INE"
                onChange={e => { setIneNumero(e.target.value.toUpperCase()); setErrors(er => ({ ...er, ineNumero: "" })) }}
                className={inputCls(errors.ineNumero)} />
              <OErr msg={errors.ineNumero} />
            </div>
            <div>
              <OLabel req>Vigencia</OLabel>
              <input type="date" value={ineVigencia}
                onChange={e => { setIneVigencia(e.target.value); setErrors(er => ({ ...er, ineVigencia: "" })) }}
                className={inputCls(errors.ineVigencia)} />
              <OErr msg={errors.ineVigencia} />
            </div>
          </div>
          <UploadBox label="Frente (foto o PDF)" accept="image/*,.pdf" value={ineFrente}
            onChange={v => { setIneFrente(v); setErrors(er => ({ ...er, ineFrente: "" })) }} error={errors.ineFrente} />
        </div>
        {/* Domicilio */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-lg">🏠</span>
            <p className="text-sm font-bold text-slate-800">Comprobante de domicilio</p>
            <span className="text-xs text-slate-400">(máx. 3 meses)</span>
          </div>
          <UploadBox label="Foto o PDF del comprobante" accept="image/*,.pdf" value={domicilio}
            onChange={v => { setDomicilio(v); setErrors(er => ({ ...er, domicilio: "" })) }} error={errors.domicilio} />
        </div>
        {Object.keys(errors).length > 0 && (
          <p className="text-xs text-red-500 font-medium text-center">Completa todos los campos marcados antes de continuar</p>
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

// ─── ONBOARDING: TÉRMINOS ────────────────────────────────────────────────────
function StepLegal({ onBack, onAccept, loading }: { onBack: () => void; onAccept: () => void; loading: boolean }) {
  const [checks, setChecks] = useState({ terminos: false, privacidad: false, conducta: false })
  const toggle = (k: keyof typeof checks) => setChecks(c => ({ ...c, [k]: !c[k] }))
  const allChecked = Object.values(checks).every(Boolean)

  const items = [
    { key: "terminos" as const, title: "Términos y condiciones", desc: "Acepto los términos de uso de la plataforma Ruum Ruum, incluyendo las políticas de pago, cancelación y operación de traslados." },
    { key: "privacidad" as const, title: "Aviso de privacidad", desc: "Autorizo el tratamiento de mis datos personales conforme al aviso de privacidad de MoviliaX S.A. de C.V." },
    { key: "conducta" as const, title: "Código de conducta", desc: "Me comprometo a tratar los vehículos con cuidado, reportar evidencia honestamente y mantener comunicación con el equipo de operaciones." },
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
              checks[item.key] ? "border-green-500 bg-green-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
            }`}>
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                checks[item.key] ? "border-green-500 bg-green-500" : "border-slate-300 bg-white"
              }`}>
                {checks[item.key] && <Check className="w-3 h-3 text-white" />}
              </div>
              <div>
                <p className={`text-sm font-bold mb-1 ${checks[item.key] ? "text-green-700" : "text-slate-800"}`}>{item.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          </button>
        ))}
        {!allChecked && <p className="text-xs text-slate-400 text-center">Acepta todos los documentos para continuar</p>}
      </div>
      <div className="p-6 border-t border-slate-100">
        <button onClick={onAccept} disabled={!allChecked || loading}
          className={`w-full font-bold py-4 rounded-2xl text-base transition-all active:scale-95 ${
            allChecked && !loading
              ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}>
          {loading ? "Creando cuenta..." : "✓ Activar mi cuenta"}
        </button>
      </div>
    </div>
  )
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
function Header({ onOpenSettings, conductor }: {
  onOpenSettings: () => void
  conductor: ConductorPerfil | null
}) {
  return (
    <header className="flex items-center justify-between bg-slate-900 px-5 py-3 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <span className="text-sm font-black text-white">R</span>
        </div>
        <div>
          <p className="text-xs font-bold text-white leading-tight">Ruum Ruum</p>
          <p className="text-[10px] text-slate-400 leading-tight">Conductor</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {conductor && (
          <div className="flex items-center gap-1.5">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            <span className="text-xs font-semibold text-white">{conductor.calificacion.toFixed(1)}</span>
          </div>
        )}
        <button type="button" onClick={onOpenSettings}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600">
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function StatusBadge({ disponibilidad }: { disponibilidad: string }) {
  const activo = disponibilidad === "Disponible"
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
      activo ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600")}>
      <span className={cx("h-2 w-2 rounded-full", activo ? "animate-pulse bg-green-500" : "bg-slate-400")} />
      {disponibilidad}
    </span>
  );
}

// ─── PANEL VIEW ───────────────────────────────────────────────────────────────
function PanelView({ conductor, viajes, onDisponibilidadChange, cargando }: {
  conductor: ConductorPerfil | null; viajes: ViajeDB[]
  onDisponibilidadChange: (d: string) => void; cargando: boolean
}) {
  const disponible = conductor?.disponibilidad === "Disponible"
  const viajeActivo = viajes.find(v =>
    ["Conductor en camino","Recolección en proceso","Evidencia inicial pendiente",
     "Traslado en curso","Entrega en proceso"].includes(v.status))
  const viajesCompletados = viajes.filter(v => v.status === "Finalizado").length
  const gananciasSemana = viajes.filter(v => v.status !== "Cancelado").reduce((s, v) => s + (v.pago_conductor ?? 0), 0)

  return (
    <section className="fade-in p-5 pb-24">
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            {cargando
              ? <div className="h-5 w-32 animate-pulse bg-slate-100 rounded mb-1" />
              : <h2 className="text-lg font-bold text-slate-800">Hola, {conductor?.nombre ?? "Conductor"}</h2>
            }
            <p className="text-sm text-slate-500">Que tengas un excelente día de trabajo.</p>
          </div>
          {conductor && <StatusBadge disponibilidad={conductor.disponibilidad} />}
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
          <span className="text-sm font-semibold text-slate-700">Recibir nuevos viajes</span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="peer sr-only" checked={disponible}
              onChange={e => onDisponibilidadChange(e.target.checked ? "Disponible" : "No disponible")} />
            <span className="h-6 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-green-500" />
            <span className="absolute left-0.5 h-5 w-5 rounded-full border-2 border-slate-300 bg-white transition-transform peer-checked:translate-x-6 peer-checked:border-green-500" />
          </label>
        </div>
      </div>
      <h3 className="mb-3 text-sm font-bold text-slate-700">Resumen de esta semana</h3>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-blue-600 p-4 text-white shadow-md">
          <p className="mb-1 text-xs text-blue-100">Tus viajes</p>
          {cargando ? <div className="h-8 w-12 animate-pulse bg-blue-500 rounded" />
            : <p className="text-2xl font-bold">{viajes.length}</p>}
          <p className="mt-1 text-[10px] text-blue-200">{viajesCompletados} completados</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-xs text-slate-500">Ganancia estimada</p>
          {cargando ? <div className="h-8 w-20 animate-pulse bg-slate-100 rounded" />
            : <p className="text-2xl font-bold text-slate-800">${gananciasSemana.toLocaleString()}</p>}
          <p className="mt-1 text-[10px] text-slate-400">Antes de gastos</p>
        </div>
      </div>
      {viajeActivo && (
        <div className="mb-5 rounded-xl border-l-4 border-blue-500 bg-white p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{viajeActivo.status.toUpperCase()}</span>
            <span className="text-xs text-slate-400">{viajeActivo.folio}</span>
          </div>
          <p className="text-sm font-bold text-slate-800 mb-1">{viajeActivo.origen_calle} → {viajeActivo.destino_calle}</p>
          {viajeActivo.vehiculos && <p className="text-xs text-slate-500">{viajeActivo.vehiculos.marca} {viajeActivo.vehiculos.modelo} · {viajeActivo.vehiculos.placas}</p>}
          <p className="text-sm font-bold text-green-600 mt-2">${viajeActivo.pago_conductor.toLocaleString()}</p>
        </div>
      )}
      <h3 className="mb-3 text-sm font-bold text-slate-700">Avisos importantes</h3>
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Mantén tus documentos al día</p>
          <p className="mt-1 text-xs text-amber-700">Verifica tus documentos en Configuración para operar sin interrupciones.</p>
        </div>
      </div>
    </section>
  );
}

// ─── VIAJES VIEW ──────────────────────────────────────────────────────────────
function VijesView({ conductor, viajes, onAceptar, onCambiarStatus, cargando }: {
  conductor: ConductorPerfil | null; viajes: ViajeDB[]
  onAceptar: (id: string) => Promise<void>
  onCambiarStatus: (id: string, status: string, evento: string) => Promise<void>
  cargando: boolean
}) {
  const [activeTab, setActiveTab] = useState<TripTab>("solicitados")
  const [aceptando, setAceptando] = useState<string | null>(null)
  const [evidenceViaje, setEvidenceViaje] = useState<ViajeDB | null>(null)

  const solicitados = viajes.filter(v => v.status === "Conductor asignado")
  const aceptados = viajes.filter(v =>
    ["Conductor en camino","Recolección en proceso","Evidencia inicial pendiente",
     "Traslado en curso","Entrega en proceso","Evidencia final pendiente"].includes(v.status))

  const handleAceptar = async (viaje: ViajeDB) => {
    setAceptando(viaje.id)
    await onAceptar(viaje.id)
    setAceptando(null)
    setActiveTab("aceptados")
  }

  const handleRechazar = async (viaje: ViajeDB) => {
    if (!window.confirm("¿Estás seguro de rechazar esta oferta?")) return
    await onCambiarStatus(viaje.id, "Pendiente de asignación", "Conductor rechazó el viaje")
  }

  return (
    <section className="fade-in p-5 pb-24">
      <h2 className="mb-4 text-xl font-bold text-slate-800">Tus viajes</h2>
      <div className="mb-5 flex gap-2 rounded-lg bg-slate-100 p-1">
        {(["solicitados","aceptados"] as TripTab[]).map(tab => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={cx("flex-1 rounded-md py-2 text-sm font-semibold transition-all",
              activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>
            {tab === "solicitados" ? `Solicitados (${solicitados.length})` : `Aceptados (${aceptados.length})`}
          </button>
        ))}
      </div>
      {cargando && <div className="flex items-center justify-center py-12 text-slate-400 gap-2"><Loader className="h-5 w-5 animate-spin" /><span className="text-sm">Cargando viajes...</span></div>}
      {!cargando && activeTab === "solicitados" && (
        <div className="space-y-4">
          {solicitados.length === 0
            ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"><Car className="h-10 w-10 text-slate-200 mx-auto mb-2" /><p className="text-sm text-slate-400">No hay viajes disponibles en este momento.</p><p className="text-xs text-slate-300 mt-1">Activa tu disponibilidad para recibir ofertas.</p></div>
            : solicitados.map(viaje => (
              <div key={viaje.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">NUEVA OFERTA</span>
                  <span className="text-xs text-slate-400">{viaje.folio}</span>
                </div>
                <div className="mb-4 flex gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    <div className="my-1 h-8 w-0.5 bg-slate-200" />
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">Origen</p>
                    <p className="text-sm font-semibold leading-tight text-slate-800 truncate">{[viaje.origen_calle, viaje.origen_colonia].filter(Boolean).join(", ")}</p>
                    <p className="mt-2 text-xs text-slate-500">Destino</p>
                    <p className="text-sm font-semibold leading-tight text-slate-800 truncate">{[viaje.destino_calle, viaje.destino_colonia].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
                <div className="mb-4 space-y-2 border-t border-slate-100 pt-3">
                  {viaje.vehiculos && <div className="flex justify-between text-sm"><span className="text-slate-500">Vehículo:</span><span className="font-medium text-slate-800">{viaje.vehiculos.marca} {viaje.vehiculos.modelo} · {viaje.vehiculos.transmision ?? ""}</span></div>}
                  {viaje.fecha_programada && <div className="flex justify-between text-sm"><span className="text-slate-500">Fecha:</span><span className="font-medium text-slate-800">{viaje.fecha_programada} {viaje.hora_programada ? `· ${viaje.hora_programada.slice(0,5)}` : ""}</span></div>}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-bold text-slate-700">Tu ganancia estimada:</span>
                    <span className="text-xl font-bold text-green-600">${viaje.pago_conductor.toLocaleString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => handleRechazar(viaje)}
                    className="rounded-lg border border-slate-300 py-3 font-semibold text-slate-600 hover:bg-slate-50">Rechazar</button>
                  <button type="button" onClick={() => handleAceptar(viaje)} disabled={aceptando === viaje.id}
                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {aceptando === viaje.id ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Aceptar
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      )}
      {!cargando && activeTab === "aceptados" && (
        <div className="space-y-4">
          {aceptados.length === 0
            ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"><Check className="h-10 w-10 text-slate-200 mx-auto mb-2" /><p className="text-sm text-slate-400">No tienes viajes aceptados activos.</p></div>
            : aceptados.map(viaje => (
              <div key={viaje.id} className="rounded-xl border-l-4 border-blue-500 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{viaje.status.toUpperCase()}</span>
                  <span className="text-xs text-slate-400">{viaje.folio}</span>
                </div>
                <p className="mb-1 text-sm font-bold text-slate-800">{viaje.origen_calle} → {viaje.destino_calle}</p>
                {viaje.vehiculos && <p className="mb-1 text-xs text-slate-500">{viaje.vehiculos.marca} {viaje.vehiculos.modelo} · {viaje.vehiculos.placas}</p>}
                {viaje.origen_contacto && <p className="text-xs text-slate-500 mb-1">Contacto: {viaje.origen_contacto} {viaje.origen_telefono && `· ${viaje.origen_telefono}`}</p>}
                {viaje.instrucciones && <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mt-2">{viaje.instrucciones}</p>}
                <p className="text-sm font-bold text-green-600 mt-2">${viaje.pago_conductor.toLocaleString()}</p>
                <div className="mt-3 space-y-2">
                  {viaje.status === "Conductor en camino" && <button type="button" onClick={() => onCambiarStatus(viaje.id, "Recolección en proceso", "Llegada al origen")} className="w-full rounded-lg bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800">✓ Confirmé llegada al origen</button>}
                  {viaje.status === "Recolección en proceso" && <button type="button" onClick={() => setEvidenceViaje(viaje)} className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800"><Camera className="h-4 w-4" /> Cargar Evidencia Inicial</button>}
                  {viaje.status === "Evidencia inicial pendiente" && <button type="button" onClick={() => onCambiarStatus(viaje.id, "Traslado en curso", "Traslado iniciado")} className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700">🚗 Iniciar traslado</button>}
                  {viaje.status === "Traslado en curso" && <button type="button" onClick={() => onCambiarStatus(viaje.id, "Entrega en proceso", "Llegada al destino")} className="w-full rounded-lg bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800">✓ Llegué al destino</button>}
                  {viaje.status === "Entrega en proceso" && <button type="button" onClick={() => setEvidenceViaje(viaje)} className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800"><Camera className="h-4 w-4" /> Cargar Evidencia Final</button>}
                </div>
              </div>
            ))
          }
        </div>
      )}
      {evidenceViaje && (
        <EvidenceModal viaje={evidenceViaje} onClose={() => setEvidenceViaje(null)}
          onSubmit={async (datos) => {
            const tipo = evidenceViaje.status === "Recolección en proceso" ? "inicial" : "final"
            await sb.from("evidencias").upsert({
              viaje_id: evidenceViaje.id,
              km_inicial: tipo === "inicial" ? datos.km : undefined,
              km_final: tipo === "final" ? datos.km : undefined,
              combustible_inicial: tipo === "inicial" ? datos.combustible : undefined,
              combustible_final: tipo === "final" ? datos.combustible : undefined,
              danos_iniciales: tipo === "inicial" ? datos.danos : undefined,
              danos_finales: tipo === "final" ? datos.danos : undefined,
              estatus: "En revisión",
            }, { onConflict: "viaje_id" })
            const nuevoStatus = tipo === "inicial" ? "Evidencia inicial pendiente" : "Evidencia final pendiente"
            const evento = tipo === "inicial" ? "Evidencia inicial cargada" : "Evidencia final cargada"
            await onCambiarStatus(evidenceViaje.id, nuevoStatus, evento)
            setEvidenceViaje(null)
          }}
        />
      )}
    </section>
  );
}

// ─── GANANCIAS VIEW ───────────────────────────────────────────────────────────
function GananciasView({ conductor, pagos, cargando }: { conductor: ConductorPerfil | null; pagos: PagoResumen[]; cargando: boolean }) {
  const pagoEstilo: Record<string, string> = { Pagado: "text-green-600", Pendiente: "text-amber-600", "En revisión": "text-blue-600", Rechazado: "text-red-600" }
  return (
    <section className="fade-in p-5 pb-24">
      <h2 className="mb-4 text-xl font-bold text-slate-800">Mis ganancias</h2>
      <div className="mb-6 rounded-xl bg-slate-900 p-5 text-white shadow-lg">
        <p className="mb-1 text-sm text-slate-400">Ganancias totales acumuladas</p>
        {cargando ? <div className="h-9 w-32 animate-pulse bg-slate-700 rounded mb-4" /> : <h3 className="mb-4 text-3xl font-bold">${(conductor?.ganancias_total ?? 0).toLocaleString()}</h3>}
        <div className="grid grid-cols-2 gap-2 border-t border-slate-700 pt-4 text-center">
          <div><p className="text-xs text-slate-400">Viajes realizados</p><p className="text-sm font-semibold">{conductor?.viajes_realizados ?? 0}</p></div>
          <div><p className="text-xs text-slate-400">Calificación</p><p className="text-sm font-semibold text-amber-400">★ {conductor?.calificacion?.toFixed(1) ?? "—"}</p></div>
        </div>
      </div>
      <h3 className="mb-3 text-sm font-bold text-slate-700">Historial de pagos</h3>
      {cargando ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse bg-slate-100 rounded-xl" />)}</div>
        : pagos.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center"><p className="text-sm text-slate-400">Sin registros de pago aún.</p></div>
        : <div className="space-y-3">{pagos.map(pago => (
            <div key={pago.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div><p className="text-sm font-semibold text-slate-800">{pago.periodo}</p><p className="text-xs text-slate-500">{pago.viajes_revisados} viajes · {pago.fecha_pago ?? "Pendiente"}</p></div>
              <div className="text-right"><p className="text-base font-bold text-slate-800">${pago.deposito_esperado.toLocaleString()}</p><p className={`text-xs font-semibold ${pagoEstilo[pago.estatus] ?? "text-slate-500"}`}>{pago.estatus}</p></div>
            </div>
          ))}</div>
      }
    </section>
  );
}

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────
function SettingsView({ conductor, onBack }: { conductor: ConductorPerfil | null; onBack: () => void }) {
  return (
    <section className="fade-in p-5 pb-24">
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-slate-500 hover:text-slate-800">← Volver</button>
        <h2 className="text-xl font-bold text-slate-800">Mi perfil</h2>
      </div>
      {conductor && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold">
            {conductor.nombre[0]}{conductor.apellido[0]}
          </div>
          <h3 className="text-lg font-bold text-slate-800">{conductor.nombre} {conductor.apellido}</h3>
          <p className="text-sm text-slate-500">{conductor.telefono}</p>
          <div className="flex justify-center gap-4 mt-3">
            <div className="text-center"><p className="text-lg font-bold text-slate-800">{conductor.viajes_realizados}</p><p className="text-xs text-slate-400">Viajes</p></div>
            <div className="text-center"><p className="text-lg font-bold text-amber-500">★ {conductor.calificacion.toFixed(1)}</p><p className="text-xs text-slate-400">Calificación</p></div>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {[
          { icon: FileText, label: "Mis documentos", sub: "Licencia, INE, CSF" },
          { icon: Landmark, label: "Cuenta bancaria", sub: "CLABE y banco" },
          { icon: MapPin, label: "Mi ubicación", sub: "Municipio y estado" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><item.icon className="h-4 w-4" /></div>
            <div className="flex-1"><p className="text-sm font-semibold text-slate-800">{item.label}</p><p className="text-xs text-slate-400">{item.sub}</p></div>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── EVIDENCE MODAL ───────────────────────────────────────────────────────────
function EvidenceModal({ viaje, onClose, onSubmit }: {
  viaje: ViajeDB; onClose: () => void
  onSubmit: (datos: { km: number; combustible: string; danos: string }) => Promise<void>
}) {
  const [km, setKm] = useState("")
  const [combustible, setCombustible] = useState("1/2")
  const [danos, setDanos] = useState("")
  const [enviando, setEnviando] = useState(false)
  const tipo = viaje.status === "Recolección en proceso" ? "inicial" : "final"
  const slots = ["Frente","Lado piloto","Copiloto","Trasera","Tablero"]

  const handleSubmit = async () => {
    setEnviando(true)
    await onSubmit({ km: parseInt(km) || 0, combustible, danos })
    setEnviando(false)
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 p-4">
        <button type="button" onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        <h3 className="font-bold text-slate-800">Evidencia {tipo === "inicial" ? "Inicial" : "Final"} · {viaje.folio}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">📷 Fotografías (5 ángulos)</p>
          <div className="grid grid-cols-5 gap-2">
            {slots.map(slot => (
              <div key={slot} className="aspect-square rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100">
                <Camera className="h-5 w-5 text-slate-300 mb-1" />
                <p className="text-[9px] text-slate-400 text-center leading-tight">{slot}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Kilometraje {tipo === "inicial" ? "inicial" : "final"}</label>
          <input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="45820"
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Nivel de combustible</label>
          <div className="grid grid-cols-5 gap-2">
            {["Vacío","1/4","1/2","3/4","Lleno"].map(n => (
              <button key={n} type="button" onClick={() => setCombustible(n)}
                className={cx("py-2 rounded-lg text-xs font-semibold border transition-colors",
                  combustible === n ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-300")}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Daños visibles</label>
          <textarea value={danos} onChange={e => setDanos(e.target.value)}
            placeholder="Sin daños. / Describir cualquier daño preexistente..." rows={3}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="border-t border-slate-200 p-4">
        <button type="button" onClick={handleSubmit} disabled={enviando}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 font-bold text-white hover:bg-blue-700 disabled:opacity-60">
          {enviando ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {enviando ? "Guardando..." : `Confirmar evidencia ${tipo}`}
        </button>
      </div>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNavigation({ activeView, onChange }: { activeView: View; onChange: (v: View) => void }) {
  return (
    <nav className="flex flex-shrink-0 border-t border-slate-200 bg-white">
      {navItems.map(({ id, label, icon: Icon }) => {
        const active = activeView === id;
        return (
          <button key={id} type="button" onClick={() => onChange(id)}
            className={cx("flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
              active ? "text-blue-600" : "text-slate-500 hover:text-slate-700")}>
            <Icon className={cx("h-5 w-5", active && "fill-blue-100")} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function DriverApp() {
  const [activeView, setActiveView] = useState<View>("panel");
  const [conductor, setConductor] = useState<ConductorPerfil | null>(null);
  const [viajes, setViajes] = useState<ViajeDB[]>([]);
  const [pagos, setPagos] = useState<PagoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const mainRef = useRef<HTMLElement>(null);

  // ── ONBOARDING ──
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("ruum_conductor_onboarding") === "1"
  })
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("welcome")
  const [registerData, setRegisterData] = useState<{
    nombre: string; apellido: string; telefono: string; email: string; password: string
    curp: string; municipio: string; estado: string; banco: string; clabe: string; titular: string
  } | null>(null)
  const [legalLoading, setLegalLoading] = useState(false)
  const [conductorAuthId, setConductorAuthId] = useState<string | null>(null)

  // ── CARGAR CONDUCTOR ──
  const cargarConductor = useCallback(async () => {
    const authId = conductorAuthId
    const query = sb.from("conductores")
      .select("id, nombre, apellido, telefono, disponibilidad, calificacion, viajes_realizados, ganancias_total")

    const { data } = authId
      ? await query.eq("auth_id", authId).single()
      : await query.eq("certificacion", "Activo").limit(1).single()

    if (data) setConductor(data as ConductorPerfil)
  }, [conductorAuthId])

  const cargarViajes = useCallback(async () => {
    if (!conductor) return
    const { data } = await sb.from("viajes").select(`
        id, folio, status, fecha_programada, hora_programada,
        origen_calle, origen_colonia, origen_estado, origen_contacto, origen_telefono,
        destino_calle, destino_colonia, destino_estado, destino_contacto, destino_telefono,
        instrucciones, pago_conductor, gastos_autorizados,
        vehiculos(marca, modelo, placas, transmision),
        usuarios(nombre, apellido)
      `)
      .eq("conductor_id", conductor.id)
      .not("status", "in", '("Finalizado","Cancelado")')
      .order("created_at", { ascending: false })
    if (data) setViajes(data as unknown as ViajeDB[])
  }, [conductor])

  const cargarPagos = useCallback(async () => {
    if (!conductor) return
    const { data } = await sb.from("pagos_conductores").select("*")
      .eq("conductor_id", conductor.id).order("created_at", { ascending: false })
    if (data) setPagos(data as PagoResumen[])
  }, [conductor])

  useEffect(() => { cargarConductor() }, [cargarConductor])

  useEffect(() => {
    if (conductor) {
      Promise.all([cargarViajes(), cargarPagos()]).then(() => setCargando(false))
      const channel = sb.channel(`conductor-viajes-${conductor.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "viajes", filter: `conductor_id=eq.${conductor.id}` },
          () => cargarViajes())
        .subscribe()
      return () => { sb.removeChannel(channel) }
    }
  }, [conductor, cargarViajes, cargarPagos])

  const showView = (view: View) => {
    setActiveView(view)
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDisponibilidadChange = async (disponibilidad: string) => {
    if (!conductor) return
    await sb.from("conductores").update({ disponibilidad }).eq("id", conductor.id)
    setConductor(prev => prev ? { ...prev, disponibilidad } : null)
  }

  const handleAceptar = async (viajeId: string) => {
    await sb.from("viajes").update({ status: "Conductor en camino" }).eq("id", viajeId)
    await sb.from("timeline_viaje").insert({
      viaje_id: viajeId, evento: "Conductor aceptó el viaje",
      actor: conductor ? `${conductor.nombre} ${conductor.apellido}` : "Conductor", actor_tipo: "conductor",
    })
    await cargarViajes()
  }

  const handleCambiarStatus = async (viajeId: string, status: string, evento: string) => {
    await sb.from("viajes").update({ status }).eq("id", viajeId)
    await sb.from("timeline_viaje").insert({
      viaje_id: viajeId, evento,
      actor: conductor ? `${conductor.nombre} ${conductor.apellido}` : "Conductor", actor_tipo: "conductor",
    })
    await cargarViajes()
  }

  // ── ONBOARDING: Crear cuenta al aceptar términos ──
  const handleAcceptLegal = async () => {
    if (!registerData) return
    setLegalLoading(true)
    try {
      const { data: authData, error: authError } = await sb.auth.signUp({
        email: registerData.email,
        password: registerData.password,
      })
      if (authError) throw authError
      const authId = authData.user?.id
      if (!authId) throw new Error("No se pudo crear el usuario")

      await sb.from("conductores").insert({
        auth_id:        authId,
        nombre:         registerData.nombre,
        apellido:       registerData.apellido,
        telefono:       registerData.telefono,
        email:          registerData.email,
        curp:           registerData.curp?.toUpperCase() || null,
        municipio:      registerData.municipio?.toUpperCase() || null,
        estado_geo:     registerData.estado?.toUpperCase() || null,
        cuenta_banco:   registerData.banco?.toUpperCase() || null,
        cuenta_clabe:   registerData.clabe || null,
        cuenta_titular: registerData.titular?.toUpperCase() || null,
        disponibilidad: "No disponible",
        certificacion:  "Pendiente de validación",
        calificacion:   0,
      })

      setConductorAuthId(authId)
      localStorage.setItem("ruum_conductor_onboarding", "1")
      setOnboardingDone(true)
    } catch (e) {
      console.error("Error en registro:", e)
      alert("Ocurrió un error al crear tu cuenta. Intenta de nuevo.")
    } finally {
      setLegalLoading(false)
    }
  }

  // ── ONBOARDING GATE ──
  if (!onboardingDone) {
    return (
      <div className="flex min-h-screen items-center justify-center p-0 md:p-4">
        <div className="mobile-mockup overflow-y-auto">
          {onboardingStep === "welcome" && (
            <StepWelcome
              onRegister={() => setOnboardingStep("register")}
              onLogin={() => setOnboardingStep("login")}
            />
          )}
          {onboardingStep === "register" && (
            <StepRegister
              onBack={() => setOnboardingStep("welcome")}
              onNext={(data) => { setRegisterData(data); setOnboardingStep("documents") }}
            />
          )}
          {onboardingStep === "login" && (
            <StepLogin
              onBack={() => setOnboardingStep("welcome")}
              onNext={() => {
                localStorage.setItem("ruum_conductor_onboarding", "1")
                setOnboardingDone(true)
              }}
            />
          )}
          {onboardingStep === "documents" && (
            <StepDocumentos
              onBack={() => setOnboardingStep("register")}
              onNext={() => setOnboardingStep("legal")}
            />
          )}
          {onboardingStep === "legal" && (
            <StepLegal
              onBack={() => setOnboardingStep("documents")}
              onAccept={handleAcceptLegal}
              loading={legalLoading}
            />
          )}
        </div>
      </div>
    )
  }

  // ── APP PRINCIPAL ──
  return (
    <div className="flex min-h-screen items-center justify-center p-0 md:p-4">
      <div className="mobile-mockup flex flex-col relative">
        <Header onOpenSettings={() => showView("configuracion")} conductor={conductor} />
        <main ref={mainRef} className="no-scrollbar relative flex-1 overflow-y-auto bg-slate-50">
          {activeView === "panel" && <PanelView conductor={conductor} viajes={viajes} onDisponibilidadChange={handleDisponibilidadChange} cargando={cargando} />}
          {activeView === "viajes" && <VijesView conductor={conductor} viajes={viajes} onAceptar={handleAceptar} onCambiarStatus={handleCambiarStatus} cargando={cargando} />}
          {activeView === "ganancias" && <GananciasView conductor={conductor} pagos={pagos} cargando={cargando} />}
          {activeView === "configuracion" && <SettingsView conductor={conductor} onBack={() => showView("panel")} />}
        </main>
        <BottomNavigation activeView={activeView} onChange={showView} />
      </div>
    </div>
  );
}