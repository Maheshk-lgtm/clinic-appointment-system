import type { Plugin } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import admin from 'firebase-admin'

async function syncDoctorsAndUsers(db: admin.firestore.Firestore) {
  try {
    const [doctorsSnap, usersSnap] = await Promise.all([
      db.collection('doctors').get(),
      db.collection('users').where('role', '==', 'doctor').get()
    ])

    const doctorUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string; email?: string; displayName?: string; doctorId?: string }))
    const doctors = doctorsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string; userId?: string; email?: string; name?: string }))

    console.log(`[vite-admin-api] Syncing ${doctors.length} doctors and ${doctorUsers.length} doctor users...`)

    for (const doc of doctors) {
      let matchedUser = doctorUsers.find((u) => u.id === doc.userId)
      if (!matchedUser && doc.email) {
        matchedUser = doctorUsers.find((u) => (u.email || '').trim().toLowerCase() === (doc.email || '').trim().toLowerCase())
      }
      if (matchedUser) {
        if (matchedUser.doctorId !== doc.id) {
          console.log(`[vite-admin-api] Auto-linking user "${matchedUser.displayName}" (${matchedUser.id}) -> doctor ${doc.id}`)
          await db.collection('users').doc(matchedUser.id).set({
            doctorId: doc.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true })
          matchedUser.doctorId = doc.id
        }
        if (doc.userId !== matchedUser.id) {
          console.log(`[vite-admin-api] Auto-updating doctor "${doc.name}" (${doc.id}) -> userId ${matchedUser.id}`)
          await db.collection('doctors').doc(doc.id).set({
            userId: matchedUser.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true })
          doc.userId = matchedUser.id
        }
      }
    }

    for (const u of doctorUsers) {
      if (!u.doctorId) {
        const matchingDoc = doctors.find((d) => d.userId === u.id || (d.email && u.email && d.email.trim().toLowerCase() === u.email.trim().toLowerCase()))
        if (matchingDoc) {
          console.log(`[vite-admin-api] Auto-linking doctor user "${u.displayName}" (${u.id}) -> doctor ${matchingDoc.id}`)
          await db.collection('users').doc(u.id).set({
            doctorId: matchingDoc.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true })
          u.doctorId = matchingDoc.id
        } else {
          console.log(`[vite-admin-api] Auto-creating missing doctor profile for doctor user "${u.displayName}" (${u.id})`)
          const newDocRef = await db.collection('doctors').add({
            name: u.displayName ? (u.displayName.startsWith('Dr.') ? u.displayName : `Dr. ${u.displayName}`) : 'Doctor',
            userId: u.id,
            specializationId: '',
            specializationName: 'General Dentistry',
            qualification: 'BDS / DDS',
            phone: '',
            email: u.email || '',
            consultationMinutes: 30,
            workingHours: [
              { day: 'mon', enabled: true, start: '09:00', end: '17:00' },
              { day: 'tue', enabled: true, start: '09:00', end: '17:00' },
              { day: 'wed', enabled: true, start: '09:00', end: '17:00' },
              { day: 'thu', enabled: true, start: '09:00', end: '17:00' },
              { day: 'fri', enabled: true, start: '09:00', end: '17:00' },
              { day: 'sat', enabled: false, start: '09:00', end: '17:00' },
              { day: 'sun', enabled: false, start: '09:00', end: '17:00' }
            ],
            exceptions: [],
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          })
          await db.collection('users').doc(u.id).set({
            doctorId: newDocRef.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true })
          u.doctorId = newDocRef.id
          console.log(`[vite-admin-api] Created & linked doctor ${newDocRef.id} for user ${u.id}`)
        }
      }
    }
    console.log('[vite-admin-api] ✓ Doctor-user synchronization complete.')
  } catch (err) {
    console.error('[vite-admin-api] Error during syncDoctorsAndUsers:', err)
  }
}

export function adminApiPlugin(): Plugin {
  return {
    name: 'admin-api-plugin',
    configureServer(server) {
      const saPath = path.resolve(process.cwd(), 'serviceAccountKey.json')
      if (fs.existsSync(saPath) && !admin.apps.length) {
        try {
          const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'))
          admin.initializeApp({
            credential: admin.credential.cert(sa)
          })
          console.log('[vite-admin-api] Firebase Admin initialized successfully.')
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          console.error('[vite-admin-api] Error initializing Firebase Admin:', msg)
        }
      }

      // Synchronize doctor-user links in the background on startup
      if (admin.apps.length) {
        syncDoctorsAndUsers(admin.firestore()).catch((err) => {
          console.error('[vite-admin-api] Startup sync error:', err)
        })
      }

      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0]
        if (url.startsWith('/api/')) {
          console.log(`[vite-admin-api] Incoming ${req.method} ${url}`)
        }

        // ── Health check ──
        if (url === '/api/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, adminReady: admin.apps.length > 0, timestamp: new Date().toISOString() }))
          return
        }

        // ── Doctor self-heal / profile sync ──
        if (url === '/api/syncDoctorProfile' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const authHeader = req.headers.authorization
            const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
            if (!token) {
              res.statusCode = 401
              res.end(JSON.stringify({ error: 'Sign in required.' }))
              return
            }

            let callerUid: string
            let callerEmail: string | undefined
            try {
              const decoded = await admin.auth().verifyIdToken(token)
              callerUid = decoded.uid
              callerEmail = decoded.email
            } catch (e: unknown) {
              res.statusCode = 401
              res.end(JSON.stringify({ error: 'Invalid token.' }))
              return
            }

            const db = admin.firestore()
            const userDoc = await db.collection('users').doc(callerUid).get()
            const userData = userDoc.data() || {}

            if (userData.role !== 'doctor') {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Caller is not a doctor.' }))
              return
            }

            if (userData.doctorId) {
              res.statusCode = 200
              res.end(JSON.stringify({ ok: true, doctorId: userData.doctorId }))
              return
            }

            // Find doctor record
            let docSnap = await db.collection('doctors').where('userId', '==', callerUid).get()
            if (docSnap.empty && callerEmail) {
              docSnap = await db.collection('doctors').where('email', '==', callerEmail.trim().toLowerCase()).get()
            }
            if (docSnap.empty && callerEmail) {
              docSnap = await db.collection('doctors').where('email', '==', callerEmail.trim()).get()
            }

            let doctorId: string
            if (!docSnap.empty) {
              doctorId = docSnap.docs[0].id
              await db.collection('users').doc(callerUid).set({ doctorId }, { merge: true })
              await db.collection('doctors').doc(doctorId).set({ userId: callerUid }, { merge: true })
              console.log(`[vite-admin-api] Auto-linked doctor ${doctorId} to user ${callerUid}`)
            } else {
              const newDoc = await db.collection('doctors').add({
                name: userData.displayName || 'Doctor',
                userId: callerUid,
                specializationId: '',
                specializationName: 'General Dentistry',
                qualification: 'BDS / DDS',
                phone: '',
                email: callerEmail || userData.email || '',
                consultationMinutes: 30,
                workingHours: [
                  { day: 'mon', enabled: true, start: '09:00', end: '17:00' },
                  { day: 'tue', enabled: true, start: '09:00', end: '17:00' },
                  { day: 'wed', enabled: true, start: '09:00', end: '17:00' },
                  { day: 'thu', enabled: true, start: '09:00', end: '17:00' },
                  { day: 'fri', enabled: true, start: '09:00', end: '17:00' },
                  { day: 'sat', enabled: false, start: '09:00', end: '17:00' },
                  { day: 'sun', enabled: false, start: '09:00', end: '17:00' }
                ],
                exceptions: [],
                active: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              })
              doctorId = newDoc.id
              await db.collection('users').doc(callerUid).set({ doctorId }, { merge: true })
              console.log(`[vite-admin-api] Auto-created & linked doctor ${doctorId} for user ${callerUid}`)
            }

            res.statusCode = 200
            res.end(JSON.stringify({ ok: true, doctorId }))
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            console.error('[vite-admin-api] Error in syncDoctorProfile:', msg)
            res.statusCode = 500
            res.end(JSON.stringify({ error: msg }))
          }
          return
        }

        // ── Admin link doctor to user ──
        if (url === '/api/linkDoctor' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json')
            try {
              const authHeader = req.headers.authorization
              const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
              if (!token) {
                res.statusCode = 401
                res.end(JSON.stringify({ error: 'Sign in required.' }))
                return
              }

              let callerUid: string
              try {
                const decoded = await admin.auth().verifyIdToken(token)
                callerUid = decoded.uid
              } catch (e: unknown) {
                res.statusCode = 401
                res.end(JSON.stringify({ error: 'Invalid token.' }))
                return
              }

              const db = admin.firestore()
              const callerDoc = await db.collection('users').doc(callerUid).get()
              if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
                res.statusCode = 403
                res.end(JSON.stringify({ error: 'Only admins can link doctor accounts.' }))
                return
              }

              const { doctorId, userId } = JSON.parse(body)
              if (!doctorId || !userId) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'doctorId and userId are required.' }))
                return
              }

              await Promise.all([
                db.collection('users').doc(userId).set({ doctorId }, { merge: true }),
                db.collection('doctors').doc(doctorId).set({ userId }, { merge: true })
              ])

              console.log(`[vite-admin-api] ✓ Admin linked doctor ${doctorId} to user ${userId}`)
              res.statusCode = 200
              res.end(JSON.stringify({ success: true }))
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err)
              res.statusCode = 500
              res.end(JSON.stringify({ error: msg }))
            }
          })
          return
        }

        // ── Doctor cancellation / Can't attend ──
        if (url === '/api/requestDoctorCancellation' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json')
            try {
              const authHeader = req.headers.authorization
              const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
              if (!token) {
                res.statusCode = 401
                res.end(JSON.stringify({ error: 'Sign in required.' }))
                return
              }

              let callerUid: string
              try {
                const decoded = await admin.auth().verifyIdToken(token)
                callerUid = decoded.uid
              } catch (e: unknown) {
                res.statusCode = 401
                res.end(JSON.stringify({ error: 'Invalid token.' }))
                return
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
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid JSON payload.' }))
                return
              }

              const { appointmentId, reason, nextAvailableDate, nextAvailableTime, actorName } = parsed

              if (!appointmentId) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'appointmentId is required.' }))
                return
              }

              const finalReason = (reason && reason.trim()) || 'Doctor is unavailable at this scheduled time'

              const db = admin.firestore()
              const apptRef = db.collection('appointments').doc(appointmentId)
              const apptSnap = await apptRef.get()

              if (!apptSnap.exists) {
                res.statusCode = 404
                res.end(JSON.stringify({ error: 'Appointment not found.' }))
                return
              }

              const appt = apptSnap.data() || {}

              // Allow update from confirmed, pending, or already requested
              const allowedStatuses = ['PENDING_DOCTOR_CONFIRMATION', 'CONFIRMED', 'DOCTOR_CANCELLATION_REQUESTED']
              if (appt.status && !allowedStatuses.includes(appt.status)) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: `Cannot submit cancellation for appointment in status "${appt.status}".` }))
                return
              }

              // Update appointment status to DOCTOR_CANCELLATION_REQUESTED
              await apptRef.update({
                status: 'DOCTOR_CANCELLATION_REQUESTED',
                cancellationReason: finalReason,
                nextAvailableDate: nextAvailableDate || '',
                nextAvailableTime: nextAvailableTime || '',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              })

              // Format clean doctor name
              const rawDocName = appt.doctorName || 'Doctor'
              const docTitle = rawDocName.startsWith('Dr.') ? rawDocName : `Dr. ${rawDocName}`

              // Notify receptionist (creator)
              if (appt.createdBy) {
                await db.collection('notifications').add({
                  recipientRole: 'receptionist',
                  recipientId: appt.createdBy,
                  title: 'Doctor requested rescheduling',
                  body: `${docTitle} can't see ${appt.patientName} on ${appt.date} ${appt.startTime}. Reason: ${reason.trim()}`,
                  appointmentId,
                  channel: 'in_app',
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp()
                }).catch(console.warn)
              }

              // Notify active admins
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
                console.warn('[vite-admin-api] Error notifying admins:', adminNotifyErr)
              }

              // Write audit entry
              await db.collection('auditLogs').add({
                appointmentId,
                actorId: callerUid,
                actorName: actorName || 'Doctor',
                actorRole: 'doctor',
                action: 'Requested cancellation',
                previousStatus: appt.status,
                newStatus: 'DOCTOR_CANCELLATION_REQUESTED',
                reason: reason.trim(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              }).catch(console.warn)

              console.log(`[vite-admin-api] ✓ Doctor cancellation requested for appointment "${appointmentId}"`)
              res.statusCode = 200
              res.end(JSON.stringify({ success: true }))
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err)
              console.error('[vite-admin-api] Error in requestDoctorCancellation:', msg)
              res.statusCode = 500
              res.end(JSON.stringify({ error: msg }))
            }
          })
          return
        }

        // ── Create user ──
        if (url === '/api/createUser' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json')
            try {
              const authHeader = req.headers.authorization
              const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
              if (!token) {
                res.statusCode = 401
                res.end(JSON.stringify({ error: 'Sign in required.' }))
                return
              }

              let callerUid: string
              try {
                const decoded = await admin.auth().verifyIdToken(token)
                callerUid = decoded.uid
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e)
                res.statusCode = 401
                res.end(JSON.stringify({ error: `Authentication failed: ${msg}` }))
                return
              }

              const callerDoc = await admin.firestore().collection('users').doc(callerUid).get()
              const callerData = callerDoc.data()
              if (!callerDoc.exists || callerData?.role !== 'admin' || callerData?.active !== true) {
                res.statusCode = 403
                res.end(JSON.stringify({ error: 'Only an active administrator can create user accounts.' }))
                return
              }

              let parsed: { email?: string; password?: string; displayName?: string; role?: string }
              try {
                parsed = JSON.parse(body)
              } catch {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid JSON payload.' }))
                return
              }

              const { email, password, displayName, role } = parsed
              if (!email || !password || !displayName || !role) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Full name, email, password, and role are required.' }))
                return
              }

              if (password.length < 8) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Password must be at least 8 characters long.' }))
                return
              }

              if (!['admin', 'receptionist', 'doctor'].includes(role)) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Role must be admin, receptionist, or doctor.' }))
                return
              }

              const cleanEmail = email.trim().toLowerCase()
              const cleanName = displayName.trim()

              // Check if email already registered
              try {
                const existing = await admin.auth().getUserByEmail(cleanEmail)
                if (existing) {
                  res.statusCode = 409
                  res.end(JSON.stringify({ error: `An account with email "${cleanEmail}" already exists.` }))
                  return
                }
              } catch {
                // Email is available
              }

              // Create Auth user
              const userRecord = await admin.auth().createUser({
                email: cleanEmail,
                password,
                displayName: cleanName
              })

              let doctorId: string | undefined = undefined
              if (role === 'doctor') {
                const docRef = await admin.firestore().collection('doctors').add({
                  name: cleanName.startsWith('Dr.') ? cleanName : `Dr. ${cleanName}`,
                  userId: userRecord.uid,
                  specializationId: '',
                  specializationName: 'General Dentistry',
                  qualification: 'BDS / DDS',
                  phone: '',
                  email: cleanEmail,
                  consultationMinutes: 30,
                  workingHours: [
                    { day: 'mon', enabled: true, start: '09:00', end: '17:00' },
                    { day: 'tue', enabled: true, start: '09:00', end: '17:00' },
                    { day: 'wed', enabled: true, start: '09:00', end: '17:00' },
                    { day: 'thu', enabled: true, start: '09:00', end: '17:00' },
                    { day: 'fri', enabled: true, start: '09:00', end: '17:00' },
                    { day: 'sat', enabled: false, start: '09:00', end: '17:00' },
                    { day: 'sun', enabled: false, start: '09:00', end: '17:00' }
                  ],
                  exceptions: [],
                  active: true,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                })
                doctorId = docRef.id
              }

              // Write Firestore profile
              const userProfileData: Record<string, unknown> = {
                uid: userRecord.uid,
                email: cleanEmail,
                displayName: cleanName,
                role,
                active: true,
                tempPassword: password,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: callerUid
              }
              if (doctorId) {
                userProfileData.doctorId = doctorId
              }

              await admin.firestore().collection('users').doc(userRecord.uid).set(userProfileData)

              console.log(`[vite-admin-api] ✓ Successfully created ${role} user: "${cleanName}" (${cleanEmail}) [${userRecord.uid}]${doctorId ? ` linked to doctor [${doctorId}]` : ''}`)
              res.statusCode = 200
              res.end(JSON.stringify({ uid: userRecord.uid }))
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Failed to create user.'
              console.error('[vite-admin-api] Error creating user:', err)
              res.statusCode = 500
              res.end(JSON.stringify({ error: msg }))
            }
          })
          return
        }

        // ── Update user (admin edit details: name, email, password, role, active) ──
        if (url === '/api/updateUser' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json')
            try {
              const authHeader = req.headers.authorization
              const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
              if (!token) {
                res.statusCode = 401
                res.end(JSON.stringify({ error: 'Sign in required.' }))
                return
              }

              let callerUid: string
              try {
                const decoded = await admin.auth().verifyIdToken(token)
                callerUid = decoded.uid
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e)
                res.statusCode = 401
                res.end(JSON.stringify({ error: `Authentication failed: ${msg}` }))
                return
              }

              const callerDoc = await admin.firestore().collection('users').doc(callerUid).get()
              const callerData = callerDoc.data()
              if (!callerDoc.exists || callerData?.role !== 'admin' || callerData?.active !== true) {
                res.statusCode = 403
                res.end(JSON.stringify({ error: 'Only an active administrator can edit user accounts.' }))
                return
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
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid JSON payload.' }))
                return
              }

              const { uid, email, password, displayName, role, active } = parsed
              if (!uid) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'User UID is required.' }))
                return
              }

              const targetDoc = await admin.firestore().collection('users').doc(uid).get()
              if (!targetDoc.exists) {
                res.statusCode = 404
                res.end(JSON.stringify({ error: 'User account not found.' }))
                return
              }

              const existingData = targetDoc.data() || {}

              // Prepare Firebase Auth updates
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
                      res.statusCode = 409
                      res.end(JSON.stringify({ error: `Email "${cleanEmail}" is already registered to another account.` }))
                      return
                    }
                  } catch {
                    // Email available
                  }
                }
                authUpdates.email = cleanEmail
              }

              if (password && password.trim()) {
                if (password.length < 8) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: 'Password must be at least 8 characters long.' }))
                  return
                }
                authUpdates.password = password
              }

              if (Object.keys(authUpdates).length > 0) {
                await admin.auth().updateUser(uid, authUpdates)
              }

              // Prepare Firestore updates
              const firestoreUpdates: Record<string, unknown> = {
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              }

              if (displayName && displayName.trim()) {
                firestoreUpdates.displayName = displayName.trim()
              }
              if (email && email.trim()) {
                firestoreUpdates.email = email.trim().toLowerCase()
              }
              if (role && ['admin', 'receptionist', 'doctor'].includes(role)) {
                firestoreUpdates.role = role
              }
              if (typeof active === 'boolean') {
                firestoreUpdates.active = active
              }

              if (password && password.trim()) {
                firestoreUpdates.tempPassword = password.trim()
              }

              await admin.firestore().collection('users').doc(uid).update(firestoreUpdates)

              // If linked doctor account, keep name & email in sync
              if (existingData.doctorId) {
                const docUpdates: Record<string, unknown> = {}
                if (displayName) docUpdates.name = displayName.trim()
                if (email) docUpdates.email = email.trim().toLowerCase()
                if (Object.keys(docUpdates).length > 0) {
                  docUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp()
                  await admin.firestore().collection('doctors').doc(existingData.doctorId).update(docUpdates).catch(() => {})
                }
              }

              console.log(`[vite-admin-api] ✓ Updated user "${displayName || existingData.displayName}" [${uid}]`)
              res.statusCode = 200
              res.end(JSON.stringify({ success: true, uid }))
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Failed to update user.'
              console.error('[vite-admin-api] Error updating user:', err)
              res.statusCode = 500
              res.end(JSON.stringify({ error: msg }))
            }
          })
          return
        }

        // ── Generate password reset link ──
        if (url === '/api/generateResetLink' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json')
            try {
              const authHeader = req.headers.authorization
              const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
              if (!token) {
                res.statusCode = 401
                res.end(JSON.stringify({ error: 'Sign in required.' }))
                return
              }

              let callerUid: string
              try {
                const decoded = await admin.auth().verifyIdToken(token)
                callerUid = decoded.uid
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e)
                res.statusCode = 401
                res.end(JSON.stringify({ error: `Authentication failed: ${msg}` }))
                return
              }

              const callerDoc = await admin.firestore().collection('users').doc(callerUid).get()
              const callerData = callerDoc.data()
              if (!callerDoc.exists || callerData?.role !== 'admin' || callerData?.active !== true) {
                res.statusCode = 403
                res.end(JSON.stringify({ error: 'Only an active administrator can generate password reset links.' }))
                return
              }

              let parsed: { email?: string }
              try {
                parsed = JSON.parse(body)
              } catch {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid JSON payload.' }))
                return
              }

              const { email } = parsed
              if (!email || !email.trim()) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Email is required.' }))
                return
              }

              const cleanEmail = email.trim().toLowerCase()
              const resetLink = await admin.auth().generatePasswordResetLink(cleanEmail)
              console.log(`[vite-admin-api] ✓ Generated reset link for "${cleanEmail}"`)
              res.statusCode = 200
              res.end(JSON.stringify({ success: true, resetLink }))
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Failed to generate reset link.'
              console.error('[vite-admin-api] Error generating reset link:', err)
              res.statusCode = 500
              res.end(JSON.stringify({ error: msg }))
            }
          })
          return
        }

        // ── Delete user ──
        if (url === '/api/deleteUser' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json')
            try {
              const authHeader = req.headers.authorization
              const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
              if (!token) {
                res.statusCode = 401
                res.end(JSON.stringify({ error: 'Sign in required.' }))
                return
              }

              let callerUid: string
              try {
                const decoded = await admin.auth().verifyIdToken(token)
                callerUid = decoded.uid
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e)
                res.statusCode = 401
                res.end(JSON.stringify({ error: `Authentication failed: ${msg}` }))
                return
              }

              const callerDoc = await admin.firestore().collection('users').doc(callerUid).get()
              const callerData = callerDoc.data()
              if (!callerDoc.exists || callerData?.role !== 'admin' || callerData?.active !== true) {
                res.statusCode = 403
                res.end(JSON.stringify({ error: 'Only an active administrator can delete accounts.' }))
                return
              }

              let parsed: { uid?: string }
              try {
                parsed = JSON.parse(body)
              } catch {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid JSON payload.' }))
                return
              }

              const { uid } = parsed
              if (!uid) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'User UID is required.' }))
                return
              }

              if (uid === callerUid) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'You cannot delete your own admin account.' }))
                return
              }

              const targetDoc = await admin.firestore().collection('users').doc(uid).get()
              const targetData = targetDoc.data()

              // Delete from Firebase Auth
              try {
                await admin.auth().deleteUser(uid)
              } catch (authErr: unknown) {
                console.warn(`[vite-admin-api] User ${uid} not found in Firebase Auth or already deleted:`, authErr)
              }

              // Delete from Firestore users collection
              await admin.firestore().collection('users').doc(uid).delete()

              // If linked doctor, delete doctor profile
              if (targetData?.doctorId) {
                await admin.firestore().collection('doctors').doc(targetData.doctorId).delete().catch(() => {})
              }

              console.log(`[vite-admin-api] ✓ Deleted user "${targetData?.displayName || uid}" [${uid}]`)
              res.statusCode = 200
              res.end(JSON.stringify({ success: true, uid }))
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Failed to delete user.'
              console.error('[vite-admin-api] Error deleting user:', err)
              res.statusCode = 500
              res.end(JSON.stringify({ error: msg }))
            }
          })
          return
        }

        next()
      })
    }
  }
}
