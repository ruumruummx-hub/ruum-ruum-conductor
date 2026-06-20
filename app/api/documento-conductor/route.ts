import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAX_FILE_BYTES = 3 * 1024 * 1024
const TIPOS_PERMITIDOS = new Set(['Licencia', 'INE / Pasaporte', 'Comprobante domicilio'])
const NOMBRES_PERMITIDOS = new Set(['licencia-frente', 'licencia-reverso', 'ine-frente', 'comprobante-domicilio'])

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return response('Configuración incompleta.', 500)

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return response('No autenticado.', 401)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return response('Sesión inválida.', 401)

  const { data: conductor } = await admin
    .from('conductores')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle()
  if (!conductor) return response('Perfil de conductor no encontrado.', 404)

  const form = await request.formData().catch(() => null)
  if (!form) return response('No se pudo leer el documento.', 400)
  const file = form.get('file') as File | null
  const nombreArchivo = String(form.get('nombreArchivo') ?? '')
  const tipoDoc = String(form.get('tipoDoc') ?? '')
  const folio = String(form.get('folio') ?? '') || null
  const vigencia = String(form.get('vigencia') ?? '') || null

  if (!file || file.size === 0) return response('Archivo requerido.', 400)
  if (file.size > MAX_FILE_BYTES) return response('El archivo excede el límite de 3 MB.', 413)
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return response('Formato no permitido.', 415)
  if (!NOMBRES_PERMITIDOS.has(nombreArchivo) || !TIPOS_PERMITIDOS.has(tipoDoc)) return response('Tipo de documento inválido.', 400)

  const ext = (file.name.split('.').pop() || (file.type === 'application/pdf' ? 'pdf' : 'jpg')).toLowerCase()
  const path = `conductores/${user.id}/${nombreArchivo}.${ext}`
  const { error: storageError } = await admin.storage.from('documentos').upload(
    path,
    Buffer.from(await file.arrayBuffer()),
    { contentType: file.type || 'application/octet-stream', upsert: true }
  )
  if (storageError) return response('No se pudo almacenar el documento.', 500)

  const { error: dbError } = await admin.from('documentos').insert({
    tipo_doc: tipoDoc,
    entidad_tipo: 'Conductor',
    entidad_id: conductor.id,
    folio,
    fecha_vencimiento: vigencia,
    estatus: 'Pendiente',
    archivo_url: path,
  })
  if (dbError) return response('El archivo se guardó, pero no pudo registrarse para revisión.', 500)

  return NextResponse.json({ ok: true, path })
}
