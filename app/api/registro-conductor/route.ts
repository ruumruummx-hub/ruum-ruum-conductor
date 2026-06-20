import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type PerfilConductor = {
  nombre: string
  apellido: string
  telefono: string
  email: string
  curp: string | null
  domicilio_calle: string | null
  domicilio_numero: string | null
  domicilio_colonia: string | null
  domicilio_cp: string | null
  municipio: string | null
  estado_geo: string | null
  cuenta_banco: string | null
  cuenta_clabe: string | null
  cuenta_titular: string | null
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return badRequest('Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.', 500)
  }

  const body = await request.json().catch(() => null) as {
    password?: string
    perfilConductor?: Partial<PerfilConductor>
  } | null
  if (!body) return badRequest('No se pudo leer la solicitud.')

  const password = body.password ?? null
  const perfil = body.perfilConductor ?? null

  if (!perfil?.email || !password) return badRequest('Correo y contraseña son requeridos.')
  if (!perfil.nombre || !perfil.apellido || !perfil.telefono) return badRequest('Datos personales incompletos.')

  const email = String(perfil.email).toLowerCase().trim()
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const conductorPayload: PerfilConductor = {
    nombre: String(perfil.nombre),
    apellido: String(perfil.apellido),
    telefono: String(perfil.telefono),
    email,
    curp: perfil.curp ? String(perfil.curp) : null,
    domicilio_calle: perfil.domicilio_calle ? String(perfil.domicilio_calle) : null,
    domicilio_numero: perfil.domicilio_numero ? String(perfil.domicilio_numero) : null,
    domicilio_colonia: perfil.domicilio_colonia ? String(perfil.domicilio_colonia) : null,
    domicilio_cp: perfil.domicilio_cp ? String(perfil.domicilio_cp) : null,
    municipio: perfil.municipio ? String(perfil.municipio) : null,
    estado_geo: perfil.estado_geo ? String(perfil.estado_geo) : null,
    cuenta_banco: perfil.cuenta_banco ? String(perfil.cuenta_banco) : null,
    cuenta_clabe: perfil.cuenta_clabe ? String(perfil.cuenta_clabe) : null,
    cuenta_titular: perfil.cuenta_titular ? String(perfil.cuenta_titular) : null,
  }

  // ── 1. Crear la cuenta de autenticación ─────────────────────────────────────
  // email_confirm: true evita que el login posterior dependa de la confirmación
  // por correo (que rompía la creación del registro de negocio por falta de sesión).
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { conductor_perfil: conductorPayload },
  })

  if (authError || !authData.user) {
    const msg = authError?.message?.includes('already been registered')
      ? 'Ya existe una cuenta con ese correo.'
      : (authError?.message ?? 'No se pudo crear el usuario de autenticación.')
    return badRequest(msg, 422)
  }

  // ── 2. Insertar el perfil de negocio en `conductores` ───────────────────────
  const { data: nuevoConductor, error: dbError } = await admin
    .from('conductores')
    .insert({
      auth_id: authData.user.id,
      ...conductorPayload,
      disponibilidad: 'No disponible',
      certificacion: 'Pendiente de validación',
      calificacion: 0,
    })
    .select('id')
    .single()

  if (dbError || !nuevoConductor) {
    await admin.auth.admin.deleteUser(authData.user.id).catch(() => undefined)
    return badRequest(dbError?.message ?? 'No se pudo crear el perfil de conductor.', 422)
  }

  return NextResponse.json({ ok: true, userId: authData.user.id, conductorId: nuevoConductor.id })
}
