import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } },
})

export type EstatusViaje =
  | 'Solicitud recibida' | 'Pendiente de asignación'
  | 'Conductor asignado' | 'Conductor en camino' | 'Recolección en proceso'
  | 'Evidencia inicial pendiente' | 'Traslado en curso' | 'Entrega en proceso'
  | 'Evidencia final pendiente' | 'Finalizado' | 'Cancelado' | 'En revisión por incidencia'

export interface Viaje {
  id: string; folio: string | null; usuario_id: string | null
  empresa_id: string | null; conductor_id: string | null; vehiculo_id: string | null
  origen_calle: string | null; origen_numero: string | null; origen_colonia: string | null
  origen_estado: string | null; origen_cp: string | null
  origen_contacto: string | null; origen_telefono: string | null
  destino_calle: string | null; destino_numero: string | null; destino_colonia: string | null
  destino_estado: string | null; destino_cp: string | null
  destino_contacto: string | null; destino_telefono: string | null
  referencias: string | null; instrucciones: string | null
  fecha_programada: string | null; hora_programada: string | null
  status: EstatusViaje; tarifa_cliente: number; pago_conductor: number
  gastos_autorizados: number; ajustes: number
  observaciones_conductor: string | null; revision_admin: string | null
  created_at: string; updated_at: string
}

export interface Conductor {
  id: string; auth_id: string | null; nombre: string; apellido: string
  email: string; telefono: string; municipio: string | null; estado_geo: string | null
  disponibilidad: 'Disponible' | 'No disponible' | 'En viaje' | 'Pausado'
  certificacion: string; calificacion: number; viajes_realizados: number
  ganancias_total: number; cuenta_banco: string | null
  cuenta_clabe: string | null; cuenta_titular: string | null; created_at: string
}

export interface Usuario {
  id: string; auth_id: string | null; empresa_id: string | null
  nombre: string; apellido: string; email: string; telefono: string | null
  tipo: string; estatus: string; viajes_solicitados: number; created_at: string
}
