"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { supabase as sb } from "@/lib/supabase";
import type { EstatusViaje } from "@/lib/supabase";
import {
  getMiPerfilConductor, updateDisponibilidad, getMisViajesConductor,
  aceptarViaje, rechazarViaje, cambiarStatusViaje, getMisGanancias,
  cerrarViajeConductor, subirEvidencia, suscribirViajesAsignados,
} from "@/lib/queries/conductor";
import {
  AlertCircle, Camera, Car, Check, ChevronRight,
  FileText, Fuel, Gauge, Home, Landmark, MapPin,
  Settings, Star, User, Wallet, X, Loader,
  Eye, EyeOff, Upload, Shield
} from "lucide-react";
import {
  RRBadge,
  RRBottomNav,
  RRButton,
  RRCard,
  RREvidenceGallery,
  RRStatCard,
  RRTimeline,
} from "@/components/rr";
import { formatMoney } from "@/lib/design-system/utils";

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
  certificacion?: string
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
  evidencias: {
    id: string
    km_inicial: number | null
    km_final: number | null
    combustible_inicial: string | null
    combustible_final: string | null
    foto_frente_i: string | null
    foto_piloto_i: string | null
    foto_copiloto_i: string | null
    foto_trasera_i: string | null
    foto_tablero_i: string | null
    foto_frente_f: string | null
    foto_piloto_f: string | null
    foto_copiloto_f: string | null
    foto_trasera_f: string | null
    foto_tablero_f: string | null
  }[] | null
}

const CAMPOS_FOTO_EVIDENCIA = [
  ['foto_frente_i', 'Frente inicial'], ['foto_piloto_i', 'Piloto inicial'],
  ['foto_copiloto_i', 'Copiloto inicial'], ['foto_trasera_i', 'Trasera inicial'],
  ['foto_tablero_i', 'Tablero inicial'], ['foto_frente_f', 'Frente final'],
  ['foto_piloto_f', 'Piloto final'], ['foto_copiloto_f', 'Copiloto final'],
  ['foto_trasera_f', 'Trasera final'], ['foto_tablero_f', 'Tablero final'],
] as const

function contarFotos(viaje: ViajeDB) {
  return (viaje.evidencias ?? []).reduce((total, evidencia) =>
    total + CAMPOS_FOTO_EVIDENCIA.filter(([campo]) => Boolean(evidencia[campo])).length, 0)
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
  `w-full border ${err ? "border-rr-danger bg-rr-dangerLight" : "border-rr-gray300"} rounded-rrMd px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rr-primary bg-white`

function OLabel({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-rr-gray500 mb-1 uppercase tracking-wide">
      {children}{req && <span className="text-rr-danger ml-0.5">*</span>}
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
          error ? "border-red-400 bg-red-50" : value ? "border-[#00C853] bg-[#F0FFF6]" : "border-slate-300 hover:border-slate-400 bg-[#F8FAFC]"
        }`}
      >
        {value ? (
          <div className="flex items-center gap-3 w-full">
            {value.preview
              ? <img src={value.preview} alt="" className="w-14 h-14 object-cover rounded-lg" />
              : <div className="w-14 h-14 bg-slate-200 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-[#6B7280]" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#008F3A] truncate">{value.file.name}</p>
              <p className="text-xs text-[#94A3B8]">{(value.file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button onClick={e => { e.stopPropagation(); onChange(null) }}
              className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <X className="w-3 h-3 text-red-500" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-5 h-5 text-[#94A3B8] mb-1" />
            <p className="text-xs text-[#6B7280] text-center">Toca para subir<br /><span className="text-[#94A3B8]">JPG, PNG o PDF</span></p>
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
    <div className="min-h-screen bg-gradient-to-br from-[#14141A] via-[#1E1F28] to-[#0F1015] flex flex-col">
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
          className="w-full bg-[#FFC400] text-[#14141A] font-bold py-4 rounded-2xl text-base shadow-xl hover:brightness-95 transition-all active:scale-95">
          Registrarme como conductor
        </button>
        <button onClick={onLogin}
          className="w-full border-2 border-[#FFC400]/50 text-[#FFC400] font-semibold py-4 rounded-2xl text-base hover:bg-white/5 transition-all active:scale-95">
          Ya tengo cuenta
        </button>
      </div>
    </div>
  )
}

// ─── ONBOARDING: REGISTRO ────────────────────────────────────────────────────
function StepRegister({ onBack, onNext }: {
  onBack: () => void
  onNext: (data: { nombre: string; apellido: string; telefono: string; email: string; password: string; curp: string; calle: string; numero: string; colonia: string; cp: string; municipio: string; estado: string; banco: string; clabe: string; titular: string }) => void
}) {
  const [form, setForm] = useState({
    nombre: "", apellido: "", curp: "", telefono: "", email: "",
    password: "", confirmar: "",
    calle: "", numero: "", colonia: "", cp: "", municipio: "", estado: "",
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
    if (!form.calle.trim())     e.calle     = "Requerido"
    if (!form.cp.trim())        e.cp        = "Requerido"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const sec = "text-xs font-bold text-[#6B7280] uppercase tracking-wide border-b border-slate-100 pb-2 mb-3"

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-[#14141A] px-6 pt-12 pb-6">
        <button onClick={onBack} className="text-[#FFFFFF]/60 text-sm mb-4 flex items-center gap-1 hover:text-[#FFC400]">← Regresar</button>
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
                <div className="px-3 py-3 border border-slate-300 rounded-xl text-sm text-slate-600 bg-[#F8FAFC] whitespace-nowrap">🇲🇽 +52</div>
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
          </div>
        </div>

        {/* ── Domicilio ── */}
        <div>
          <p className={sec}>🏠 Domicilio</p>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <OLabel req>Calle</OLabel>
                <input type="text" value={form.calle} placeholder="NOMBRE DE LA CALLE"
                  onChange={e => set("calle", e.target.value.toUpperCase())} className={inputCls(errors.calle)} />
                <OErr msg={errors.calle} />
              </div>
              <div>
                <OLabel>Número</OLabel>
                <input type="text" value={form.numero} placeholder="EXT/INT"
                  onChange={e => set("numero", e.target.value.toUpperCase())} className={inputCls()} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <OLabel>Colonia</OLabel>
                <input type="text" value={form.colonia} placeholder="COLONIA"
                  onChange={e => set("colonia", e.target.value.toUpperCase())} className={inputCls()} />
              </div>
              <div>
                <OLabel req>Código Postal</OLabel>
                <input type="text" value={form.cp} placeholder="00000" maxLength={5}
                  onChange={e => set("cp", e.target.value.replace(/\D/g,"").slice(0,5))} className={inputCls(errors.cp)} />
                <OErr msg={errors.cp} />
              </div>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-slate-700">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-slate-700">
                  {showC ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <OErr msg={errors.confirmar} />
            </div>
          </div>
        </div>

        {/* ── Cuenta bancaria ── */}
        <div>
          <p className={sec}>🏦 Cuenta bancaria <span className="text-[#94A3B8] font-normal normal-case">(opcional — puedes completarla después)</span></p>
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
          className="w-full bg-[#FFC400] text-[#14141A] font-bold py-4 rounded-2xl text-base hover:brightness-95 transition-all active:scale-95 flex items-center justify-center gap-2">
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
    await sb.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/recuperar-password`,
    })
    setForgotSent(true)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-[#14141A] px-6 pt-12 pb-6">
        <button onClick={onBack} className="text-[#FFFFFF]/60 text-sm mb-4 flex items-center gap-1 hover:text-[#FFC400]">← Regresar</button>
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-slate-700">
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        {forgotSent
          ? <p className="text-xs text-[#00A846] font-medium">✓ Te enviamos un correo para restablecer tu contraseña</p>
          : <button onClick={handleForgot} className="text-sm text-[#14141A] font-semibold hover:underline">
              ¿Olvidaste tu contraseña?
            </button>
        }
      </div>
      <div className="p-6 border-t border-slate-100">
        <button onClick={handleLogin} disabled={loading}
          className="w-full bg-[#14141A] text-[#FFFFFF] font-bold py-4 rounded-2xl text-base hover:bg-[#2a2a2a] disabled:opacity-60 transition-all active:scale-95">
          {loading ? "Verificando..." : "Entrar"}
        </button>
      </div>
    </div>
  )
}

// ─── ONBOARDING: DOCUMENTOS ──────────────────────────────────────────────────
interface DocsConductorData {
  licTipo: string
  licNumero: string
  licVigencia: string
  licFrente: DocFile
  licReverso: DocFile
  ineNumero: string
  ineVigencia: string
  ineFrente: DocFile
  domicilio: DocFile
}

function StepDocumentos({ onBack, onNext }: { onBack: () => void; onNext: (data: DocsConductorData) => void }) {
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
      <div className="bg-[#14141A] px-6 pt-12 pb-6">
        <button onClick={onBack} className="text-[#FFFFFF]/60 text-sm mb-4 flex items-center gap-1 hover:text-[#FFC400]">← Regresar</button>
        <h2 className="text-2xl font-black text-white">Tus documentos</h2>
        <p className="text-white/50 text-sm mt-1">Los revisaremos en menos de 24 horas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Licencia */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="text-lg">🪪</span>
            <p className="text-sm font-bold text-[#111827]">Licencia de conducir</p>
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
            <p className="text-sm font-bold text-[#111827]">Identificación oficial (INE)</p>
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
            <p className="text-sm font-bold text-[#111827]">Comprobante de domicilio</p>
            <span className="text-xs text-[#94A3B8]">(máx. 3 meses)</span>
          </div>
          <UploadBox label="Foto o PDF del comprobante" accept="image/*,.pdf" value={domicilio}
            onChange={v => { setDomicilio(v); setErrors(er => ({ ...er, domicilio: "" })) }} error={errors.domicilio} />
        </div>
        {Object.keys(errors).length > 0 && (
          <p className="text-xs text-red-500 font-medium text-center">Completa todos los campos marcados antes de continuar</p>
        )}
      </div>
      <div className="p-6 border-t border-slate-100">
        <button onClick={() => { if (validate()) onNext({ licTipo, licNumero, licVigencia, licFrente, licReverso, ineNumero, ineVigencia, ineFrente, domicilio }) }}
          className="w-full bg-[#FFC400] text-[#14141A] font-bold py-4 rounded-2xl text-base hover:brightness-95 transition-all active:scale-95 flex items-center justify-center gap-2">
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
      <div className="bg-[#14141A] px-6 pt-12 pb-6">
        <button onClick={onBack} className="text-[#FFFFFF]/60 text-sm mb-4 flex items-center gap-1 hover:text-[#FFC400]">← Regresar</button>
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
              checks[item.key] ? "border-[#00C853] bg-[#F0FFF6]" : "border-[#E5E7EB] bg-[#F8FAFC] hover:border-slate-300"
            }`}>
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                checks[item.key] ? "border-[#00C853] bg-[#00C853]" : "border-slate-300 bg-white"
              }`}>
                {checks[item.key] && <Check className="w-3 h-3 text-white" />}
              </div>
              <div>
                <p className={`text-sm font-bold mb-1 ${checks[item.key] ? "text-[#008F3A]" : "text-[#111827]"}`}>{item.title}</p>
                <p className="text-xs text-[#6B7280] leading-relaxed">{item.desc}</p>
              </div>
            </div>
          </button>
        ))}
        {!allChecked && <p className="text-xs text-[#94A3B8] text-center">Acepta todos los documentos para continuar</p>}
      </div>
      <div className="p-6 border-t border-slate-100">
        <button onClick={onAccept} disabled={!allChecked || loading}
          className={`w-full font-bold py-4 rounded-2xl text-base transition-all active:scale-95 ${
            allChecked && !loading
              ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200"
              : "bg-slate-200 text-[#94A3B8] cursor-not-allowed"
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
    <header className="flex items-center justify-between bg-rr-secondary px-5 py-3 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-rrSm bg-rr-primary">
          <span className="text-xs font-black text-rr-secondary">RR</span>
        </div>
        <div>
          <p className="text-xs font-bold text-white leading-tight">Ruum Ruum</p>
          <p className="text-[10px] text-white/50 leading-tight">Conductor</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {conductor && (
          <div className="flex items-center gap-1.5">
            <Star className="h-3 w-3 text-rr-warning fill-rr-warning" />
            <span className="text-xs font-semibold text-white">{conductor.calificacion.toFixed(1)}</span>
          </div>
        )}
        <button type="button" onClick={onOpenSettings}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15">
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function StatusBadge({ disponibilidad }: { disponibilidad: string }) {
  const activo = disponibilidad === "Disponible"
  return (
    <RRBadge variant={activo ? "success" : "neutral"} pulse={activo}>
      {disponibilidad}
    </RRBadge>
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
    <section className="rr-fade-in p-5 pb-24">
      <RRCard className="mb-5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            {cargando
              ? <div className="h-5 w-32 animate-pulse bg-rr-gray100 rounded mb-1" />
              : <h2 className="text-lg font-bold text-rr-black">Hola, {conductor?.nombre ?? "Conductor"}</h2>
            }
            <p className="text-sm text-rr-gray500">Que tengas un excelente día de trabajo.</p>
          </div>
          {conductor && <StatusBadge disponibilidad={conductor.disponibilidad} />}
        </div>
        <div className="flex items-center justify-between rounded-rrMd border border-rr-gray100 bg-rr-bg p-3">
          <span className="text-sm font-semibold text-rr-gray700">Recibir nuevos viajes</span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="peer sr-only" checked={disponible}
              onChange={e => onDisponibilidadChange(e.target.checked ? "Disponible" : "No disponible")} />
            <span className="h-6 w-12 rounded-full bg-rr-gray300 transition-colors peer-checked:bg-rr-success" />
            <span className="absolute left-0.5 h-5 w-5 rounded-full border-2 border-rr-gray300 bg-white transition-transform peer-checked:translate-x-6 peer-checked:border-rr-success" />
          </label>
        </div>
      </RRCard>

      <h3 className="mb-3 text-sm font-bold text-rr-gray700">Resumen de esta semana</h3>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <RRStatCard
          label="Tus viajes"
          value={cargando ? "—" : viajes.length}
          helper={`${viajesCompletados} completados`}
          icon={Car}
          tone="primary"
        />
        <RRStatCard
          label="Ganancia estimada"
          value={cargando ? "—" : formatMoney(gananciasSemana)}
          helper="Antes de gastos"
          icon={Wallet}
          tone="success"
        />
      </div>

      {viajeActivo && (
        <RRCard className="mb-5 border-l-4 border-rr-primary p-4">
          <div className="mb-2 flex items-center justify-between">
            <RRBadge variant="process">{viajeActivo.status.toUpperCase()}</RRBadge>
            <span className="text-xs text-rr-gray500">{viajeActivo.folio}</span>
          </div>
          <p className="mb-1 text-sm font-bold text-rr-black">{viajeActivo.origen_calle} → {viajeActivo.destino_calle}</p>
          {viajeActivo.vehiculos && <p className="text-xs text-rr-gray500">{viajeActivo.vehiculos.marca} {viajeActivo.vehiculos.modelo} · {viajeActivo.vehiculos.placas}</p>}
          <p className="mt-2 text-sm font-bold text-rr-success">{formatMoney(viajeActivo.pago_conductor)}</p>
        </RRCard>
      )}

      <h3 className="mb-3 text-sm font-bold text-rr-gray700">Avisos importantes</h3>
      <div className="flex gap-3 rounded-rrLg border border-rr-warningLight bg-rr-warningLight p-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rr-warning" />
        <div>
          <p className="text-sm font-semibold text-rr-black">Mantén tus documentos al día</p>
          <p className="mt-1 text-xs text-rr-gray700">Verifica tus documentos en Configuración para operar sin interrupciones.</p>
        </div>
      </div>
    </section>
  );
}

// ─── VIAJES VIEW ──────────────────────────────────────────────────────────────
function VijesView({ conductor, viajes, onAceptar, onRechazar, onCambiarStatus, onCerrar, onRecargar, cargando }: {
  conductor: ConductorPerfil | null; viajes: ViajeDB[]
  onAceptar: (id: string) => Promise<void>
  onRechazar: (id: string) => Promise<void>
  onCambiarStatus: (id: string, status: EstatusViaje, evento: string) => Promise<void>
  onCerrar: (id: string) => Promise<void>
  onRecargar: () => Promise<void>
  cargando: boolean
}) {
  const [activeTab, setActiveTab] = useState<TripTab>("solicitados")
  const [aceptando, setAceptando] = useState<string | null>(null)
  const [evidenceViaje, setEvidenceViaje] = useState<ViajeDB | null>(null)
  const [evidenceViewViaje, setEvidenceViewViaje] = useState<ViajeDB | null>(null)

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
    await onRechazar(viaje.id)
  }

  return (
    <section className="rr-fade-in p-5 pb-24">
      <h2 className="mb-4 text-xl font-bold text-rr-black">Tus viajes</h2>
      <div className="mb-5 flex gap-2 rounded-rrMd bg-rr-gray100 p-1">
        {(["solicitados","aceptados"] as TripTab[]).map(tab => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={cx("flex-1 rounded-rrSm py-2 text-sm font-semibold transition-all",
              activeTab === tab ? "bg-white text-rr-black shadow-sm" : "text-rr-gray500")}>
            {tab === "solicitados" ? `Solicitados (${solicitados.length})` : `Aceptados (${aceptados.length})`}
          </button>
        ))}
      </div>
      {cargando && <div className="flex items-center justify-center py-12 text-rr-gray500 gap-2"><Loader className="h-5 w-5 animate-spin" /><span className="text-sm">Cargando viajes...</span></div>}
      {!cargando && activeTab === "solicitados" && (
        <div className="space-y-4">
          {solicitados.length === 0
            ? <RRCard className="p-8 text-center"><Car className="h-10 w-10 text-rr-gray200 mx-auto mb-2" /><p className="text-sm text-rr-gray500">No hay viajes disponibles en este momento.</p><p className="text-xs text-rr-gray300 mt-1">Activa tu disponibilidad para recibir ofertas.</p></RRCard>
            : solicitados.map(viaje => (
              <RRCard key={viaje.id}>
                <div className="mb-3 flex items-start justify-between">
                  <RRBadge variant="pending">NUEVA OFERTA</RRBadge>
                  <span className="text-xs text-rr-gray500">{viaje.folio}</span>
                </div>
                <div className="mb-4 flex gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-rr-success" />
                    <div className="my-1 h-8 w-0.5 bg-rr-gray200" />
                    <div className="h-2.5 w-2.5 rounded-full bg-rr-danger" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-rr-gray500">Origen</p>
                    <p className="text-sm font-semibold leading-tight text-rr-black truncate">{[viaje.origen_calle, viaje.origen_colonia].filter(Boolean).join(", ")}</p>
                    <p className="mt-2 text-xs text-rr-gray500">Destino</p>
                    <p className="text-sm font-semibold leading-tight text-rr-black truncate">{[viaje.destino_calle, viaje.destino_colonia].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
                <div className="mb-4 space-y-2 border-t border-rr-gray100 pt-3">
                  {viaje.vehiculos && <div className="flex justify-between text-sm"><span className="text-rr-gray500">Vehículo:</span><span className="font-medium text-rr-black">{viaje.vehiculos.marca} {viaje.vehiculos.modelo} · {viaje.vehiculos.transmision ?? ""}</span></div>}
                  {viaje.fecha_programada && <div className="flex justify-between text-sm"><span className="text-rr-gray500">Fecha:</span><span className="font-medium text-rr-black">{viaje.fecha_programada} {viaje.hora_programada ? `· ${viaje.hora_programada.slice(0,5)}` : ""}</span></div>}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-bold text-rr-gray700">Tu ganancia estimada:</span>
                    <span className="text-xl font-bold text-rr-success">{formatMoney(viaje.pago_conductor)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <RRButton variant="secondary" onClick={() => handleRechazar(viaje)}>Rechazar</RRButton>
                  <RRButton variant="primary" onClick={() => handleAceptar(viaje)} disabled={aceptando === viaje.id}>
                    {aceptando === viaje.id ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Aceptar
                  </RRButton>
                </div>
              </RRCard>
            ))
          }
        </div>
      )}
      {!cargando && activeTab === "aceptados" && (
        <div className="space-y-4">
          {aceptados.length === 0
            ? <RRCard className="p-8 text-center"><Check className="h-10 w-10 text-rr-gray200 mx-auto mb-2" /><p className="text-sm text-rr-gray500">No tienes viajes aceptados activos.</p></RRCard>
            : aceptados.map(viaje => (
              <RRCard key={viaje.id} className="border-l-4 border-rr-primary">
                <div className="mb-3 flex items-start justify-between">
                  <RRBadge variant="process">{viaje.status.toUpperCase()}</RRBadge>
                  <span className="text-xs text-rr-gray500">{viaje.folio}</span>
                </div>
                <p className="mb-1 text-sm font-bold text-rr-black">{viaje.origen_calle} → {viaje.destino_calle}</p>
                {viaje.vehiculos && <p className="mb-1 text-xs text-rr-gray500">{viaje.vehiculos.marca} {viaje.vehiculos.modelo} · {viaje.vehiculos.placas}</p>}
                {viaje.origen_contacto && <p className="text-xs text-rr-gray500 mb-1">Contacto: {viaje.origen_contacto} {viaje.origen_telefono && `· ${viaje.origen_telefono}`}</p>}
                {viaje.instrucciones && <p className="text-xs text-rr-black bg-rr-warningLight rounded-rrSm p-2 mt-2">{viaje.instrucciones}</p>}
                <p className="text-sm font-bold text-rr-success mt-2">{formatMoney(viaje.pago_conductor)}</p>
                <div className="mt-3 space-y-2">
                  {contarFotos(viaje) > 0 && <RRButton variant="secondary" fullWidth onClick={() => setEvidenceViewViaje(viaje)}><Eye className="h-4 w-4" /> Ver evidencia ({contarFotos(viaje)} fotos)</RRButton>}
                  {viaje.status === "Conductor en camino" && <RRButton variant="dark" fullWidth onClick={() => onCambiarStatus(viaje.id, "Recolección en proceso", "Llegada al origen")}>✓ Confirmé llegada al origen</RRButton>}
                  {viaje.status === "Recolección en proceso" && <RRButton variant="dark" fullWidth onClick={() => setEvidenceViaje(viaje)}><Camera className="h-4 w-4" /> Cargar Evidencia Inicial</RRButton>}
                  {viaje.status === "Evidencia inicial pendiente" && <RRButton variant="dark" fullWidth onClick={() => onCambiarStatus(viaje.id, "Traslado en curso", "Traslado iniciado")}>🚗 Iniciar traslado</RRButton>}
                  {viaje.status === "Traslado en curso" && <RRButton variant="dark" fullWidth onClick={() => onCambiarStatus(viaje.id, "Entrega en proceso", "Llegada al destino")}>✓ Llegué al destino</RRButton>}
                  {viaje.status === "Entrega en proceso" && <RRButton variant="dark" fullWidth onClick={() => setEvidenceViaje(viaje)}><Camera className="h-4 w-4" /> Cargar Evidencia Final</RRButton>}
                  {viaje.status === "Evidencia final pendiente" && <RRButton variant="primary" fullWidth onClick={() => onCerrar(viaje.id)}><Check className="h-4 w-4" /> Cerrar viaje</RRButton>}
                </div>
              </RRCard>
            ))
          }
        </div>
      )}
      {evidenceViaje && (
        <EvidenceModal viaje={evidenceViaje} conductorId={conductor?.id ?? ""} onClose={() => setEvidenceViaje(null)}
          onSubmit={async (datos) => {
            if (!conductor) return
            const tipo = evidenceViaje.status === "Recolección en proceso" ? "inicial" : "final"
            try {
              await subirEvidencia({
              viaje_id: evidenceViaje.id,
              conductor_id: conductor.id,
              conductor_nombre: `${conductor.nombre} ${conductor.apellido}`,
              km_inicial: tipo === "inicial" ? datos.km : undefined,
              km_final: tipo === "final" ? datos.km : undefined,
              combustible_inicial: tipo === "inicial" ? datos.combustible : undefined,
              combustible_final: tipo === "final" ? datos.combustible : undefined,
              danos_iniciales: tipo === "inicial" ? datos.danos : undefined,
              danos_finales: tipo === "final" ? datos.danos : undefined,
              fotos: datos.fotos,
              tipo,
              })
            } catch (error) {
              console.error("Error guardando evidencia:", error)
              alert("No se pudo guardar la evidencia. Intenta de nuevo.")
              return // no avanza el estatus del viaje si la evidencia no se guardó
            }

            setEvidenceViaje(null)
            await onRecargar()
          }}
        />
      )}
      {evidenceViewViaje && <EvidenceViewerModal viaje={evidenceViewViaje} onClose={() => setEvidenceViewViaje(null)} />}
    </section>
  );
}

// ─── GANANCIAS VIEW ───────────────────────────────────────────────────────────
function GananciasView({ conductor, pagos, cargando }: { conductor: ConductorPerfil | null; pagos: PagoResumen[]; cargando: boolean }) {
  const pagoEstilo: Record<string, string> = { Pagado: "text-rr-success", Pendiente: "text-rr-warning", "En revisión": "text-rr-primary", Rechazado: "text-rr-danger" }
  return (
    <section className="rr-fade-in p-5 pb-24">
      <h2 className="mb-4 text-xl font-bold text-rr-black">Mis ganancias</h2>
      <RRCard className="mb-6 bg-rr-secondary p-5 text-white" elevated={false}>
        <p className="mb-1 text-sm text-white/60">Ganancias totales acumuladas</p>
        {cargando ? <div className="h-9 w-32 animate-pulse bg-white/10 rounded mb-4" /> : <h3 className="mb-4 text-3xl font-bold">{formatMoney(conductor?.ganancias_total ?? 0)}</h3>}
        <div className="grid grid-cols-2 gap-2 border-t border-white/15 pt-4 text-center">
          <div><p className="text-xs text-white/60">Viajes realizados</p><p className="text-sm font-semibold">{conductor?.viajes_realizados ?? 0}</p></div>
          <div><p className="text-xs text-white/60">Calificación</p><p className="text-sm font-semibold text-rr-warning">★ {conductor?.calificacion?.toFixed(1) ?? "—"}</p></div>
        </div>
      </RRCard>
      <h3 className="mb-3 text-sm font-bold text-rr-gray700">Historial de pagos</h3>
      {cargando ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse bg-rr-gray100 rounded-rrLg" />)}</div>
        : pagos.length === 0 ? <RRCard className="p-8 text-center"><p className="text-sm text-rr-gray500">Sin registros de pago aún.</p></RRCard>
        : <div className="space-y-3">{pagos.map(pago => (
            <RRCard key={pago.id} className="flex items-center justify-between p-4">
              <div><p className="text-sm font-semibold text-rr-black">{pago.periodo}</p><p className="text-xs text-rr-gray500">{pago.viajes_revisados} viajes · {pago.fecha_pago ?? "Pendiente"}</p></div>
              <div className="text-right"><p className="text-base font-bold text-rr-black">{formatMoney(pago.deposito_esperado)}</p><p className={`text-xs font-semibold ${pagoEstilo[pago.estatus] ?? "text-rr-gray500"}`}>{pago.estatus}</p></div>
            </RRCard>
          ))}</div>
      }
    </section>
  );
}

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────
function SettingsView({ conductor, onBack }: { conductor: ConductorPerfil | null; onBack: () => void }) {
  return (
    <section className="rr-fade-in p-5 pb-24">
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-rr-gray500 hover:text-rr-black">← Volver</button>
        <h2 className="text-xl font-bold text-rr-black">Mi perfil</h2>
      </div>
      {conductor && (
        <RRCard className="mb-5 p-5 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-rr-primary text-rr-secondary text-2xl font-bold">
            {conductor.nombre[0]}{conductor.apellido[0]}
          </div>
          <h3 className="text-lg font-bold text-rr-black">{conductor.nombre} {conductor.apellido}</h3>
          <p className="text-sm text-rr-gray500">{conductor.telefono}</p>
          <div className="flex justify-center gap-4 mt-3">
            <div className="text-center"><p className="text-lg font-bold text-rr-black">{conductor.viajes_realizados}</p><p className="text-xs text-rr-gray500">Viajes</p></div>
            <div className="text-center"><p className="text-lg font-bold text-rr-warning">★ {conductor.calificacion.toFixed(1)}</p><p className="text-xs text-rr-gray500">Calificación</p></div>
          </div>
        </RRCard>
      )}
      <div className="space-y-2">
        {[
          { icon: FileText, label: "Mis documentos", sub: "Licencia, INE, CSF" },
          { icon: Landmark, label: "Cuenta bancaria", sub: "CLABE y banco" },
          { icon: MapPin, label: "Mi ubicación", sub: "Municipio y estado" },
        ].map(item => (
          <RRCard key={item.label} className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-rrSm bg-rr-gray100 text-rr-gray700"><item.icon className="h-4 w-4" /></div>
            <div className="flex-1"><p className="text-sm font-semibold text-rr-black">{item.label}</p><p className="text-xs text-rr-gray500">{item.sub}</p></div>
            <ChevronRight className="h-4 w-4 text-rr-gray300" />
          </RRCard>
        ))}
      </div>
    </section>
  );
}

// ─── EVIDENCE VIEWER ──────────────────────────────────────────────────────────
function EvidenceViewerModal({ viaje, onClose }: { viaje: ViajeDB; onClose: () => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const fotos = useMemo(() => (viaje.evidencias ?? []).flatMap(evidencia =>
    CAMPOS_FOTO_EVIDENCIA.flatMap(([campo, label]) => {
      const path = evidencia[campo]
      return path ? [{ key: `${evidencia.id}-${campo}`, label, path }] : []
    })
  ), [viaje.evidencias])

  useEffect(() => {
    let activo = true
    Promise.all(fotos.map(async foto => {
      const { data } = await sb.storage.from("evidencias-viaje").createSignedUrl(foto.path, 3600)
      return { key: foto.key, url: data?.signedUrl ?? null }
    })).then(resultados => {
      if (!activo) return
      setUrls(Object.fromEntries(resultados.filter(r => r.url).map(r => [r.key, r.url as string])))
    })
    return () => { activo = false }
  }, [fotos])

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-rr-gray200 p-4">
        <button type="button" onClick={onClose}><X className="h-5 w-5 text-rr-gray500" /></button>
        <div>
          <h3 className="font-bold text-rr-black">Evidencia del viaje</h3>
          <p className="text-xs text-rr-gray500">{viaje.folio}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {fotos.map(foto => (
            <a key={foto.key} href={urls[foto.key]} target="_blank" rel="noreferrer"
              className="aspect-square overflow-hidden rounded-rrMd border border-rr-gray200 bg-rr-gray100 relative">
              {urls[foto.key] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[foto.key]} alt={foto.label} className="h-full w-full object-cover" />
              ) : <div className="h-full w-full animate-pulse bg-rr-gray100" />}
              <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-center text-[10px] font-medium text-white">{foto.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── EVIDENCE MODAL ───────────────────────────────────────────────────────────
function EvidenceModal({ viaje, conductorId, onClose, onSubmit }: {
  viaje: ViajeDB; conductorId: string; onClose: () => void
  onSubmit: (datos: { km: number; combustible: string; danos: string; fotos: Record<string, string> }) => Promise<void>
}) {
  const [km, setKm] = useState("")
  const [combustible, setCombustible] = useState("1/2")
  const [danos, setDanos] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [errorFotos, setErrorFotos] = useState("")
  // previews: blob URL local para mostrar de inmediato. paths: ubicación
  // real en el bucket una vez subida — eso es lo que se manda al RPC.
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [paths, setPaths] = useState<Record<string, string>>({})
  const [subiendo, setSubiendo] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const slotActivoRef = useRef<string | null>(null)

  const tipo = viaje.status === "Recolección en proceso" ? "inicial" : "final"
  // El id del slot es el que usa el componente de UI; la columna real en
  // la base (y el nombre de carpeta en el bucket) usa el nombre en
  // español — este mapa traduce entre ambos.
  const slots: { id: string; label: string; columna: string }[] = [
    { id: "front", label: "Frente", columna: "frente" },
    { id: "driver", label: "Lado piloto", columna: "piloto" },
    { id: "passenger", label: "Copiloto", columna: "copiloto" },
    { id: "rear", label: "Trasera", columna: "trasera" },
    { id: "dashboard", label: "Tablero", columna: "tablero" },
  ]

  const abrirSelector = (slotId: string) => {
    slotActivoRef.current = slotId
    fileInputRef.current?.click()
  }

  const handleArchivoSeleccionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const slotId = slotActivoRef.current
    e.target.value = "" // permite volver a elegir el mismo archivo si reintenta
    if (!file || !slotId) return

    const slot = slots.find(s => s.id === slotId)
    if (!slot) return

    setPreviews(p => ({ ...p, [slotId]: URL.createObjectURL(file) }))
    setSubiendo(s => ({ ...s, [slotId]: true }))
    setErrorFotos("")

    const ext = file.name.split(".").pop() || "jpg"
    const path = `${viaje.id}/${conductorId}/${tipo}/${slot.columna}.${ext}`

    const { error } = await sb.storage.from("evidencias-viaje").upload(path, file, { upsert: true })
    setSubiendo(s => ({ ...s, [slotId]: false }))
    if (error) {
      setErrorFotos(`No se pudo subir la foto de "${slot.label}". Intenta de nuevo.`)
      setPreviews(p => { const n = { ...p }; delete n[slotId]; return n })
      return
    }
    setPaths(p => ({ ...p, [slotId]: path }))
  }

  const handleSubmit = async () => {
    const faltantes = slots.filter(s => !paths[s.id])
    if (faltantes.length > 0) {
      setErrorFotos(`Faltan fotos: ${faltantes.map(s => s.label).join(", ")}`)
      return
    }
    setEnviando(true)
    const fotosPorColumna: Record<string, string> = {}
    slots.forEach(s => { fotosPorColumna[s.columna] = paths[s.id] })
    await onSubmit({ km: parseInt(km) || 0, combustible, danos, fotos: fotosPorColumna })
    setEnviando(false)
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handleArchivoSeleccionado} />
      <div className="flex items-center gap-3 border-b border-rr-gray200 p-4">
        <button type="button" onClick={onClose}><X className="h-5 w-5 text-rr-gray500" /></button>
        <h3 className="font-bold text-rr-black">Evidencia {tipo === "inicial" ? "Inicial" : "Final"} · {viaje.folio}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <RREvidenceGallery
            items={slots.map(s => ({ ...s, previewUrl: previews[s.id], subiendo: subiendo[s.id] }))}
            onSelect={abrirSelector}
          />
          {errorFotos && <p className="text-xs text-rr-danger font-medium mt-2">{errorFotos}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-rr-gray500 mb-1">Kilometraje {tipo === "inicial" ? "inicial" : "final"}</label>
          <input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="45820"
            className="w-full border border-rr-gray300 rounded-rrMd px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rr-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-rr-gray500 mb-1">Nivel de combustible</label>
          <div className="grid grid-cols-5 gap-2">
            {["Vacío","1/4","1/2","3/4","Lleno"].map(n => (
              <button key={n} type="button" onClick={() => setCombustible(n)}
                className={cx("py-2 rounded-rrSm text-xs font-semibold border transition-colors",
                  combustible === n ? "bg-rr-primary text-rr-secondary border-rr-primary" : "bg-white text-rr-gray700 border-rr-gray300")}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-rr-gray500 mb-1">Daños visibles</label>
          <textarea value={danos} onChange={e => setDanos(e.target.value)}
            placeholder="Sin daños. / Describir cualquier daño preexistente..." rows={3}
            className="w-full border border-rr-gray300 rounded-rrMd px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rr-primary" />
        </div>
      </div>
      <div className="border-t border-rr-gray200 p-4">
        <RRButton fullWidth onClick={handleSubmit} disabled={enviando || Object.values(subiendo).some(Boolean)}>
          {enviando ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {enviando ? "Guardando..." : `Confirmar evidencia ${tipo}`}
        </RRButton>
      </div>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNavigation({ activeView, onChange }: { activeView: View; onChange: (v: View) => void }) {
  return (
    <nav className="flex flex-shrink-0 border-t border-rr-gray200 bg-white">
      {navItems.map(({ id, label, icon: Icon }) => {
        const active = activeView === id;
        return (
          <button key={id} type="button" onClick={() => onChange(id)}
            className={cx("flex flex-1 flex-col items-center gap-1 py-2 text-xs font-bold transition-colors",
              active ? "text-rr-primary" : "text-rr-gray500 hover:text-rr-black")}>
            <Icon className="h-5 w-5" />
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
    curp: string; calle: string; numero: string; colonia: string; cp: string
    municipio: string; estado: string; banco: string; clabe: string; titular: string
  } | null>(null)
  const [legalLoading, setLegalLoading] = useState(false)
  const [conductorAuthId, setConductorAuthId] = useState<string | null>(null)
  const [docsConductorData, setDocsConductorData] = useState<DocsConductorData | null>(null)
  const [sesionLista, setSesionLista] = useState(false)

  // ── CARGAR CONDUCTOR ──
  // Importante: solo carga por auth_id real. El fallback anterior (tomar
  // cualquier conductor con certificacion="Activo") podía mostrarle a un
  // conductor el panel de otro, o dejarlo sin panel si su cuenta seguía
  // "Pendiente de validación". RLS ya protege los datos por auth.uid(),
  // pero identificar al conductor correcto es responsabilidad del cliente.
  const cargarConductor = useCallback(async () => {
    if (!conductorAuthId) { setConductor(null); return }
    const data = await getMiPerfilConductor(conductorAuthId)
    setConductor(data as ConductorPerfil | null)
  }, [conductorAuthId])

  // ── SESIÓN: detectar sesión persistida real al cargar la app ──
  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setConductorAuthId(session.user.id)
        setOnboardingDone(true)
        localStorage.setItem("ruum_conductor_onboarding", "1")
      } else {
        setConductorAuthId(null)
        setOnboardingDone(false)
        localStorage.removeItem("ruum_conductor_onboarding")
      }
      setSesionLista(true)
    })

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setConductorAuthId(session.user.id)
        setOnboardingDone(true)
        localStorage.setItem("ruum_conductor_onboarding", "1")
      } else {
        setConductorAuthId(null)
        setConductor(null)
        setViajes([])
        setPagos([])
        setOnboardingDone(false)
        localStorage.removeItem("ruum_conductor_onboarding")
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const cargarViajes = useCallback(async () => {
    if (!conductor) return
    try {
      const data = await getMisViajesConductor(conductor.id)
      setViajes(data as unknown as ViajeDB[])
    } catch (e) {
      console.error("Error cargando viajes:", e)
    }
  }, [conductor])

  const cargarPagos = useCallback(async () => {
    if (!conductor) return
    try {
      const data = await getMisGanancias(conductor.id)
      setPagos(data as PagoResumen[])
    } catch (e) {
      console.error("Error cargando pagos:", e)
    }
  }, [conductor])

  useEffect(() => { cargarConductor() }, [cargarConductor])

  useEffect(() => {
    if (conductor) {
      Promise.all([cargarViajes(), cargarPagos()]).then(() => setCargando(false))
      const channel = suscribirViajesAsignados(conductor.id, () => cargarViajes())
      return () => { sb.removeChannel(channel) }
    }
  }, [conductor, cargarViajes, cargarPagos])

  const showView = (view: View) => {
    setActiveView(view)
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDisponibilidadChange = async (disponibilidad: string) => {
    if (!conductor) return
    await updateDisponibilidad(conductor.id, disponibilidad as "Disponible" | "No disponible" | "En viaje" | "Pausado")
    setConductor(prev => prev ? { ...prev, disponibilidad } : null)
  }

  const handleAceptar = async (viajeId: string) => {
    if (!conductor) return
    const nombre = conductor ? `${conductor.nombre} ${conductor.apellido}` : "Conductor"
    await aceptarViaje(viajeId, conductor.id, nombre)
    await cargarConductor()
    await cargarViajes()
  }

  const handleRechazarViaje = async (viajeId: string) => {
    const nombre = conductor ? `${conductor.nombre} ${conductor.apellido}` : "Conductor"
    try {
      await rechazarViaje(viajeId, nombre)
      await cargarViajes()
    } catch (e) {
      console.error("Error rechazando viaje:", e)
      alert("No se pudo rechazar el viaje. Intenta de nuevo.")
    }
  }

  const handleCambiarStatus = async (viajeId: string, status: EstatusViaje, evento: string) => {
    const nombre = conductor ? `${conductor.nombre} ${conductor.apellido}` : "Conductor"
    await cambiarStatusViaje(viajeId, status, nombre, evento)
    await cargarViajes()
  }

  const handleCerrarViaje = async (viajeId: string) => {
    if (!conductor) return
    const nombre = `${conductor.nombre} ${conductor.apellido}`
    try {
      await cerrarViajeConductor(viajeId, conductor.id, nombre)
      await Promise.all([cargarConductor(), cargarViajes(), cargarPagos()])
    } catch (e) {
      console.error("Error cerrando viaje:", e)
      alert("No se pudo cerrar el viaje. Verifica que la evidencia final esté registrada.")
    }
  }

  // ── ONBOARDING: Crear cuenta al aceptar términos ──
  const handleAcceptLegal = async () => {
    if (!registerData) return
    setLegalLoading(true)
    try {
      const perfilConductor = {
        nombre:            registerData.nombre,
        apellido:          registerData.apellido,
        telefono:          registerData.telefono,
        email:             registerData.email,
        curp:              registerData.curp?.toUpperCase() || null,
        domicilio_calle:   registerData.calle?.toUpperCase() || null,
        domicilio_numero:  registerData.numero?.toUpperCase() || null,
        domicilio_colonia: registerData.colonia?.toUpperCase() || null,
        domicilio_cp:      registerData.cp || null,
        municipio:         registerData.municipio?.toUpperCase() || null,
        estado_geo:        registerData.estado?.toUpperCase() || null,
        cuenta_banco:      registerData.banco?.toUpperCase() || null,
        cuenta_clabe:      registerData.clabe || null,
        cuenta_titular:    registerData.titular?.toUpperCase() || null,
      }

      const formData = new FormData()
      formData.append("password", registerData.password)
      formData.append("perfilConductor", JSON.stringify(perfilConductor))
      if (docsConductorData) {
        formData.append("licTipo", docsConductorData.licTipo)
        formData.append("licNumero", docsConductorData.licNumero)
        formData.append("licVigencia", docsConductorData.licVigencia)
        if (docsConductorData.licFrente) formData.append("licFrente", docsConductorData.licFrente.file)
        if (docsConductorData.licReverso) formData.append("licReverso", docsConductorData.licReverso.file)
        formData.append("ineNumero", docsConductorData.ineNumero)
        formData.append("ineVigencia", docsConductorData.ineVigencia)
        if (docsConductorData.ineFrente) formData.append("ineFrente", docsConductorData.ineFrente.file)
        if (docsConductorData.domicilio) formData.append("domicilio", docsConductorData.domicilio.file)
      }

      const registro = await fetch("/api/registro-conductor", { method: "POST", body: formData })
      if (!registro.ok) {
        const data = await registro.json().catch(() => null) as { error?: string } | null
        throw new Error(data?.error ?? "No se pudo crear la cuenta.")
      }

      const { error: loginError } = await sb.auth.signInWithPassword({
        email: registerData.email,
        password: registerData.password,
      })
      if (loginError) throw loginError

      // El listener onAuthStateChange ya se encarga de fijar conductorAuthId
      // y onboardingDone, pero los fijamos aquí también para una transición
      // inmediata sin esperar el round-trip async del listener.
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
  if (!sesionLista) {
    return (
      <div className="flex min-h-screen items-center justify-center p-0 md:p-4">
        <div className="mobile-mockup flex items-center justify-center">
          <Loader className="w-6 h-6 animate-spin text-[#94A3B8]" />
        </div>
      </div>
    )
  }

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
              onNext={data => { setDocsConductorData(data); setOnboardingStep("legal") }}
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
        <main ref={mainRef} className="no-scrollbar relative flex-1 overflow-y-auto bg-[linear-gradient(180deg,#F8FAFC_0%,#EDF4FF_100%)]">
          {activeView === "panel" && <PanelView conductor={conductor} viajes={viajes} onDisponibilidadChange={handleDisponibilidadChange} cargando={cargando} />}
          {activeView === "viajes" && <VijesView conductor={conductor} viajes={viajes} onAceptar={handleAceptar} onRechazar={handleRechazarViaje} onCambiarStatus={handleCambiarStatus} onCerrar={handleCerrarViaje} onRecargar={cargarViajes} cargando={cargando} />}
          {activeView === "ganancias" && <GananciasView conductor={conductor} pagos={pagos} cargando={cargando} />}
          {activeView === "configuracion" && <SettingsView conductor={conductor} onBack={() => showView("panel")} />}
        </main>
        <BottomNavigation activeView={activeView} onChange={showView} />
      </div>
    </div>
  );
}
