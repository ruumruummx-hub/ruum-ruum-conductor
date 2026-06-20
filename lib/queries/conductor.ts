// lib/queries/conductor.ts — conductor-ruum

import { supabase } from '@/lib/supabase'
import type { EstatusViaje } from '@/lib/supabase'

// ── AUTH ────────────────────────────────────────────────────

export async function loginConductorOTP(telefono: string) {
  const numero = '+52' + telefono.replace(/\D/g, '')
  const { data, error } = await supabase.auth.signInWithOtp({ phone: numero })
  if (error) throw error
  return data
}

export async function verificarOTPConductor(telefono: string, token: string) {
  const numero = '+52' + telefono.replace(/\D/g, '')
  const { data, error } = await supabase.auth.verifyOtp({
    phone: numero, token, type: 'sms',
  })
  if (error) throw error
  return data
}

// ── PERFIL ──────────────────────────────────────────────────

// Recibe el auth_id ya resuelto por el caller (normalmente desde el
// listener de onAuthStateChange) en vez de volver a llamar a
// supabase.auth.getUser() aquí dentro. Esto es deliberado: identificar
// al conductor correcto es responsabilidad del cliente, que ya validó
// la sesión real antes de pedir el perfil — re-derivarlo aquí podría
// mostrarle a un conductor el panel de otro si hay una sesión obsoleta.
// maybeSingle() (no single()) porque una cuenta recién registrada o
// "Pendiente de validación" puede no tener fila aún, y eso no debe
// lanzar una excepción.
export async function getMiPerfilConductor(authId: string) {
  const { data } = await supabase
    .from('conductores')
    .select('id, nombre, apellido, telefono, disponibilidad, calificacion, viajes_realizados, ganancias_total, certificacion')
    .eq('auth_id', authId)
    .maybeSingle()

  return data
}

export async function updateDisponibilidad(
  conductorId: string,
  disponibilidad: 'Disponible' | 'No disponible' | 'En viaje' | 'Pausado'
) {
  const { data, error } = await supabase
    .from('conductores')
    .update({ disponibilidad })
    .eq('id', conductorId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── VIAJES ──────────────────────────────────────────────────

// Una sola query con todos los viajes no cerrados del conductor. El
// split entre "solicitados" (Conductor asignado) y "aceptados" (en
// curso) se hace en el cliente con .filter() — así es como ya opera
// el componente real, que muestra ambos grupos como pestañas de una
// misma lista cargada una vez. (El diseño original de esta función
// hacía dos queries separadas devolviendo {solicitados, aceptados}
// pre-divididos; no se usaba en ningún lado y no coincidía con cómo
// el componente realmente arma sus pestañas, así que se reemplazó.)
export async function getMisViajesConductor(conductorId: string) {
  const { data, error } = await supabase
    .from('viajes')
    .select(`
      id, folio, status, fecha_programada, hora_programada,
      origen_calle, origen_colonia, origen_estado, origen_contacto, origen_telefono,
      destino_calle, destino_colonia, destino_estado, destino_contacto, destino_telefono,
      instrucciones, pago_conductor, gastos_autorizados,
      vehiculos(marca, modelo, placas, transmision),
      usuarios(nombre, apellido)
    `)
    .eq('conductor_id', conductorId)
    .not('status', 'in', '("Finalizado","Cancelado")')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function aceptarViaje(viajeId: string, conductorId: string, conductorNombre: string) {
  const { data, error } = await supabase.rpc('aceptar_viaje_conductor', {
    p_viaje_id: viajeId,
    p_conductor_id: conductorId,
    p_actor_nombre: conductorNombre,
  })

  if (error) throw error
  return data
}

// No reutiliza cambiarStatusViaje a propósito: rechazar también debe
// limpiar conductor_id (ver RT-02), algo que las demás transiciones
// de estatus no deben hacer. Mezclar ese caso especial dentro de la
// función genérica lo esconde; mejor una función dedicada.
export async function rechazarViaje(viajeId: string, conductorNombre: string) {
  // No se encadena .select().single(): al limpiar conductor_id en este
  // mismo update, la fila deja de cumplir la política RLS
  // conductor_select_viajes (conductor_id = mi_conductor_id()), así que
  // el RETURNING vendría vacío bajo RLS aunque el UPDATE sí se aplique
  // — y .single() lanzaría un error de "0 filas" sobre una operación
  // que en realidad sí tuvo éxito. Nada en el código consume el valor
  // de retorno de esta función, así que no hay costo en omitirlo.
  const { error } = await supabase
    .from('viajes')
    .update({ status: 'Pendiente de asignación', conductor_id: null })
    .eq('id', viajeId)

  if (error) throw error

  await supabase.from('timeline_viaje').insert({
    viaje_id: viajeId,
    evento: 'Conductor rechazó el viaje',
    actor: conductorNombre,
    actor_tipo: 'conductor',
  })
}

export async function cambiarStatusViaje(
  viajeId: string,
  status: EstatusViaje,
  conductorNombre: string,
  evento: string
) {
  const { data, error } = await supabase
    .from('viajes')
    .update({ status })
    .eq('id', viajeId)
    .select()
    .single()

  if (error) throw error

  await supabase.from('timeline_viaje').insert({
    viaje_id: viajeId,
    evento,
    actor: conductorNombre,
    actor_tipo: 'conductor',
  })

  return data
}

export async function cerrarViajeConductor(
  viajeId: string,
  conductorId: string,
  conductorNombre: string
) {
  const { data, error } = await supabase.rpc('cerrar_viaje_conductor', {
    p_viaje_id: viajeId,
    p_conductor_id: conductorId,
    p_actor_nombre: conductorNombre,
  })

  if (error) throw error
  return data
}

// ── EVIDENCIA ───────────────────────────────────────────────

export async function subirEvidencia(payload: {
  viaje_id: string
  conductor_id: string
  conductor_nombre: string
  km_inicial?: number
  km_final?: number
  combustible_inicial?: string
  combustible_final?: string
  llaves_recibidas?: number
  danos_iniciales?: string
  danos_finales?: string
  tipo: 'inicial' | 'final'
}) {
  const inicial = payload.tipo === 'inicial'
  const { data, error } = await supabase.rpc('guardar_evidencia_conductor', {
    p_viaje_id: payload.viaje_id,
    p_conductor_id: payload.conductor_id,
    p_tipo: payload.tipo,
    p_actor_nombre: payload.conductor_nombre,
    p_km: inicial ? payload.km_inicial ?? null : payload.km_final ?? null,
    p_combustible: inicial ? payload.combustible_inicial ?? null : payload.combustible_final ?? null,
    p_danos: inicial ? payload.danos_iniciales ?? null : payload.danos_finales ?? null,
    p_llaves: payload.llaves_recibidas ?? null,
  })

  if (error) throw error
  return data
}

// ── GANANCIAS ────────────────────────────────────────────────

export async function getMisGanancias(conductorId: string) {
  const { data, error } = await supabase
    .from('pagos_conductores')
    .select('*')
    .eq('conductor_id', conductorId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ── REALTIME ────────────────────────────────────────────────

export function suscribirViajesAsignados(conductorId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`conductor-viajes-${conductorId}`)
    .on(
      'postgres_changes',
      {
        event: '*', schema: 'public', table: 'viajes',
        filter: `conductor_id=eq.${conductorId}`,
      },
      callback
    )
    .subscribe()
}
