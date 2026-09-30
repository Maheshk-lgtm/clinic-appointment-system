/**
 * Standalone API server for Firebase Admin operations.
 * (Note: Vite also serves this directly via Vite middleware during `npm run dev`!)
 *
 * Can be run independently with: npm run dev:api
 */
import * as http from 'node:http'
import * as fs from 'node:fs'
import * as path from 'node:path'
import admin from 'firebase-admin'

const PORT = 5174
const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'serviceAccountKey.json')

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('[api-server] ❌ serviceAccountKey.json not found.')
  process.exit(1)
}

if (!admin.apps.length) {
  const sa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))
  admin.initializeApp({
    credential: admin.credential.cert(sa)
  })
}

function sendJson(res: http.ServerResponse, status: number, data: unknown) {
  if (res.headersSent) return
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.end(JSON.stringify(data))
}

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET'
  const pathname = (req.url ?? '/').split('?')[0]

  if (method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.end()
    return
  }

  if (method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, adminReady: admin.apps.length > 0, timestamp: new Date().toISOString() })
  }

  if (method === 'POST' && pathname === '/api/createUser') {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', async () => {
      try {
        const authHeader = req.headers.authorization
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
        if (!token) {
          return sendJson(res, 401, { error: 'Sign in required.' })
        }

        let callerUid: string
        try {
          const decoded = await admin.auth().verifyIdToken(token)
          callerUid = decoded.uid
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          return sendJson(res, 401, { error: `Authentication failed: ${msg}` })
        }

        const callerDoc = await admin.firestore().collection('users').doc(callerUid).get()
        const callerData = callerDoc.data()
        if (!callerDoc.exists || callerData?.role !== 'admin' || callerData?.active !== true) {
          return sendJson(res, 403, { error: 'Only an active administrator can create user accounts.' })
        }

        const { email, password, displayName, role } = JSON.parse(body)
        if (!email || !password || !displayName || !role) {
          return sendJson(res, 400, { error: 'Full name, email, password, and role are required.' })
        }
        if (password.length < 8) {
          return sendJson(res, 400, { error: 'Password must be at least 8 characters long.' })
        }
        if (!['admin', 'receptionist', 'doctor'].includes(role)) {
          return sendJson(res, 400, { error: 'Invalid role.' })
        }

        const cleanEmail = email.trim().toLowerCase()
        const cleanName = displayName.trim()

        try {
          const existing = await admin.auth().getUserByEmail(cleanEmail)
          if (existing) {
            return sendJson(res, 409, { error: `An account with email "${cleanEmail}" already exists.` })
          }
        } catch {
          // Available
        }

        const userRecord = await admin.auth().createUser({
          email: cleanEmail,
          password,
          displayName: cleanName
        })

        await admin.firestore().collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          email: cleanEmail,
          displayName: cleanName,
          role,
          active: true,
          tempPassword: password,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: callerUid
        })

        console.log(`[api-server] ✓ Created user ${cleanName} (${cleanEmail}) as ${role}`)
        return sendJson(res, 200, { uid: userRecord.uid })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Internal server error'
        console.error('[api-server] Error:', err)
        return sendJson(res, 500, { error: msg })
      }
    })
    return
  }

  if (method === 'POST' && pathname === '/api/updateUser') {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', async () => {
      try {
        const authHeader = req.headers.authorization
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
        if (!token) {
          return sendJson(res, 401, { error: 'Sign in required.' })
        }

        let callerUid: string
        try {
          const decoded = await admin.auth().verifyIdToken(token)
          callerUid = decoded.uid
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          return sendJson(res, 401, { error: `Authentication failed: ${msg}` })
        }

        const callerDoc = await admin.firestore().collection('users').doc(callerUid).get()
        const callerData = callerDoc.data()
        if (!callerDoc.exists || callerData?.role !== 'admin' || callerData?.active !== true) {
          return sendJson(res, 403, { error: 'Only an active administrator can edit user accounts.' })
        }

        let parsed: {
          uid?: string
          email?: string
          password?: string
          displayName?: string
          role?: string
          active?: boolean
        }
        try {
          parsed = JSON.parse(body)
        } catch {
          return sendJson(res, 400, { error: 'Invalid JSON payload.' })
        }

        const { uid, email, password, displayName, role, active } = parsed
        if (!uid) {
          return sendJson(res, 400, { error: 'User UID is required.' })
        }

        const targetDoc = await admin.firestore().collection('users').doc(uid).get()
        if (!targetDoc.exists) {
          return sendJson(res, 404, { error: 'User account not found.' })
        }

        const existingData = targetDoc.data() || {}

        // Firebase Auth updates
        const authUpdates: admin.auth.UpdateRequest = {}
        if (displayName && displayName.trim()) {
          authUpdates.displayName = displayName.trim()
        }
        if (email && email.trim()) {
          const cleanEmail = email.trim().toLowerCase()
          if (cleanEmail !== existingData.email) {
            try {
              const existingUser = await admin.auth().getUserByEmail(cleanEmail)
              if (existingUser && existingUser.uid !== uid) {
                return sendJson(res, 409, { error: `Email "${cleanEmail}" is already registered to another account.` })
              }
            } catch {
              // Email available
            }
          }
          authUpdates.email = cleanEmail
        }
        if (password && password.trim()) {
          if (password.length < 8) {
            return sendJson(res, 400, { error: 'Password must be at least 8 characters long.' })
          }
          authUpdates.password = password
        }

        if (Object.keys(authUpdates).length > 0) {
          await admin.auth().updateUser(uid, authUpdates)
        }

        // Firestore updates
        const firestoreUpdates: Record<string, unknown> = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
        if (displayName && displayName.trim()) firestoreUpdates.displayName = displayName.trim()
        if (email && email.trim()) firestoreUpdates.email = email.trim().toLowerCase()
        if (role && ['admin', 'receptionist', 'doctor'].includes(role)) firestoreUpdates.role = role
        if (typeof active === 'boolean') firestoreUpdates.active = active

        if (password && password.trim()) firestoreUpdates.tempPassword = password.trim()

        await admin.firestore().collection('users').doc(uid).update(firestoreUpdates)

        if (existingData.doctorId) {
          const docUpdates: Record<string, unknown> = {}
          if (displayName) docUpdates.name = displayName.trim()
          if (email) docUpdates.email = email.trim().toLowerCase()
          if (Object.keys(docUpdates).length > 0) {
            docUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp()
            await admin.firestore().collection('doctors').doc(existingData.doctorId).update(docUpdates).catch(() => {})
          }
        }

        return sendJson(res, 200, { success: true, uid })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update user.'
        return sendJson(res, 500, { error: msg })
      }
    })
    return
  }

  if (method === 'POST' && pathname === '/api/generateResetLink') {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', async () => {
      try {
        const authHeader = req.headers.authorization
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
        if (!token) {
          return sendJson(res, 401, { error: 'Sign in required.' })
        }

        let callerUid: string
        try {
          const decoded = await admin.auth().verifyIdToken(token)
          callerUid = decoded.uid
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          return sendJson(res, 401, { error: `Authentication failed: ${msg}` })
        }

        const callerDoc = await admin.firestore().collection('users').doc(callerUid).get()
        const callerData = callerDoc.data()
        if (!callerDoc.exists || callerData?.role !== 'admin' || callerData?.active !== true) {
          return sendJson(res, 403, { error: 'Only an active administrator can generate password reset links.' })
        }

        const { email } = JSON.parse(body)
        if (!email || !email.trim()) {
          return sendJson(res, 400, { error: 'Email is required.' })
        }

        const cleanEmail = email.trim().toLowerCase()
        const resetLink = await admin.auth().generatePasswordResetLink(cleanEmail)
        return sendJson(res, 200, { success: true, resetLink })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to generate reset link.'
        return sendJson(res, 500, { error: msg })
      }
    })
    return
  }

  if (method === 'POST' && pathname === '/api/deleteUser') {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', async () => {
      try {
        const authHeader = req.headers.authorization
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
        if (!token) {
          return sendJson(res, 401, { error: 'Sign in required.' })
        }

        let callerUid: string
        try {
          const decoded = await admin.auth().verifyIdToken(token)
          callerUid = decoded.uid
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          return sendJson(res, 401, { error: `Authentication failed: ${msg}` })
        }

        const callerDoc = await admin.firestore().collection('users').doc(callerUid).get()
        const callerData = callerDoc.data()
        if (!callerDoc.exists || callerData?.role !== 'admin' || callerData?.active !== true) {
          return sendJson(res, 403, { error: 'Only an active administrator can delete accounts.' })
        }

        const { uid } = JSON.parse(body)
        if (!uid) {
          return sendJson(res, 400, { error: 'User UID is required.' })
        }

        if (uid === callerUid) {
          return sendJson(res, 400, { error: 'You cannot delete your own admin account.' })
        }

        const targetDoc = await admin.firestore().collection('users').doc(uid).get()
        const targetData = targetDoc.data()

        try {
          await admin.auth().deleteUser(uid)
        } catch (authErr: unknown) {
          console.warn(`[api-server] User ${uid} not found in Auth or already deleted:`, authErr)
        }

        await admin.firestore().collection('users').doc(uid).delete()

        if (targetData?.doctorId) {
          await admin.firestore().collection('doctors').doc(targetData.doctorId).delete().catch(() => {})
        }

        return sendJson(res, 200, { success: true, uid })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete user.'
        return sendJson(res, 500, { error: msg })
      }
    })
    return
  }

  // ── Doctor cancellation / Can't attend ──
  if (method === 'POST' && pathname === '/api/requestDoctorCancellation') {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', async () => {
      try {
        const authHeader = req.headers.authorization
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
        if (!token) {
          return sendJson(res, 401, { error: 'Sign in required.' })
        }

        let callerUid: string
        try {
          const decoded = await admin.auth().verifyIdToken(token)
          callerUid = decoded.uid
        } catch (e: unknown) {
          return sendJson(res, 401, { error: 'Invalid token.' })
        }

        let parsed: {
          appointmentId?: string
          reason?: string
          nextAvailableDate?: string
          nextAvailableTime?: string
          actorName?: string
        }
        try {
          parsed = JSON.parse(body)
        } catch {
          return sendJson(res, 400, { error: 'Invalid JSON payload.' })
        }

        const { appointmentId, reason, nextAvailableDate, nextAvailableTime, actorName } = parsed

        if (!appointmentId) {
          return sendJson(res, 400, { error: 'appointmentId is required.' })
        }

        const finalReason = (reason && reason.trim()) || 'Doctor is unavailable at this scheduled time'

        const db = admin.firestore()
        const apptRef = db.collection('appointments').doc(appointmentId)
        const apptSnap = await apptRef.get()

        if (!apptSnap.exists) {
          return sendJson(res, 404, { error: 'Appointment not found.' })
        }

        const appt = apptSnap.data() || {}

        const allowedStatuses = ['PENDING_DOCTOR_CONFIRMATION', 'CONFIRMED', 'DOCTOR_CANCELLATION_REQUESTED']
        if (appt.status && !allowedStatuses.includes(appt.status)) {
          return sendJson(res, 400, { error: `Cannot submit cancellation for appointment in status "${appt.status}".` })
        }

        await apptRef.update({
          status: 'DOCTOR_CANCELLATION_REQUESTED',
          cancellationReason: finalReason,
          nextAvailableDate: nextAvailableDate || '',
          nextAvailableTime: nextAvailableTime || '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        const rawDocName = appt.doctorName || 'Doctor'
        const docTitle = rawDocName.startsWith('Dr.') ? rawDocName : `Dr. ${rawDocName}`

        if (appt.createdBy) {
          await db.collection('notifications').add({
            recipientRole: 'receptionist',
            recipientId: appt.createdBy,
            title: 'Doctor requested rescheduling',
            body: `${docTitle} can't see ${appt.patientName} on ${appt.date} ${appt.startTime}. Reason: ${finalReason}`,
            appointmentId,
            channel: 'in_app',
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          }).catch(console.warn)
        }

        try {
          const adminsSnap = await db.collection('users').where('role', '==', 'admin').where('active', '==', true).get()
          for (const adminDoc of adminsSnap.docs) {
            await db.collection('notifications').add({
              recipientRole: 'admin',
              recipientId: adminDoc.id,
              title: 'Doctor cancellation requested',
              body: `${docTitle} · ${appt.patientName} · ${appt.date} ${appt.startTime}`,
              appointmentId,
              channel: 'in_app',
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            }).catch(console.warn)
          }
        } catch (adminNotifyErr) {
          console.warn('[api-server] Error notifying admins:', adminNotifyErr)
        }

        await db.collection('auditLogs').add({
          appointmentId,
          actorId: callerUid,
          actorName: actorName || 'Doctor',
          actorRole: 'doctor',
          action: 'Requested cancellation',
          previousStatus: appt.status,
          newStatus: 'DOCTOR_CANCELLATION_REQUESTED',
          reason: finalReason,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }).catch(console.warn)

        console.log(`[api-server] ✓ Doctor cancellation requested for appointment "${appointmentId}"`)
        return sendJson(res, 200, { success: true })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[api-server] Error in requestDoctorCancellation:', msg)
        return sendJson(res, 500, { error: msg })
      }
    })
    return
  }

  sendJson(res, 404, { error: `Not found: ${method} ${pathname}` })
})

server.listen(PORT, () => {
  console.log(`[api-server] ✓ Ready on http://localhost:${PORT}`)
})
