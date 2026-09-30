import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

initializeApp()
const db = getFirestore()

/**
 * Creates a login for a doctor or receptionist. Must run server-side: it's
 * the only place allowed to mint a Firebase Auth user and stamp its role,
 * so a receptionist account can never grant itself admin by editing a
 * Firestore document directly (the security rules also block that, but this
 * function is the only *legitimate* path to a new account).
 */
export const createStaffUser = onCall(async (request) => {
  const callerUid = request.auth?.uid
  if (!callerUid) throw new HttpsError('unauthenticated', 'Sign in required.')

  const callerDoc = await db.collection('users').doc(callerUid).get()
  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin' || callerDoc.data()?.active !== true) {
    throw new HttpsError('permission-denied', 'Only an active admin can create staff accounts.')
  }

  const { email, password, displayName, role } = request.data as {
    email: string
    password: string
    displayName: string
    role: 'admin' | 'receptionist' | 'doctor'
  }

  if (!email || !password || !displayName || !role) {
    throw new HttpsError('invalid-argument', 'email, password, displayName and role are required.')
  }
  if (password.length < 8) {
    throw new HttpsError('invalid-argument', 'Password must be at least 8 characters.')
  }

  const userRecord = await getAuth().createUser({ email, password, displayName })

  await db.collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid,
    email,
    displayName,
    role,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: callerUid
  })

  return { uid: userRecord.uid }
})

/**
 * Runs every 5 minutes. Anything still PENDING_DOCTOR_CONFIRMATION past its
 * temporaryBookingExpiresAt is marked EXPIRED and its slot lock is released,
 * independent of whether anyone has the app open — this is the
 * authoritative enforcement of the temporary-booking window described in
 * section 9 of the spec; the client-side expireIfStale() call is just a fast
 * path for the UI.
 */
export const expireStaleBookings = onSchedule('every 5 minutes', async () => {
  const now = FieldValue.serverTimestamp()
  const staleSnap = await db
    .collection('appointments')
    .where('status', '==', 'PENDING_DOCTOR_CONFIRMATION')
    .where('temporaryBookingExpiresAt', '<=', new Date())
    .get()

  for (const apptDoc of staleSnap.docs) {
    const appt = apptDoc.data()
    const lockId = `${appt.doctorId}_${appt.date}_${appt.startTime}`

    await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(apptDoc.ref)
      const fresh = freshSnap.data()
      if (!fresh || fresh.status !== 'PENDING_DOCTOR_CONFIRMATION') return

      tx.update(apptDoc.ref, { status: 'EXPIRED', updatedAt: FieldValue.serverTimestamp() })
      tx.delete(db.collection('slotLocks').doc(lockId))
      tx.set(db.collection('notifications').doc(), {
        recipientRole: 'receptionist',
        recipientId: fresh.createdBy,
        title: 'Temporary booking expired',
        body: `${fresh.patientName} · ${fresh.date} ${fresh.startTime} — doctor did not respond in time.`,
        appointmentId: apptDoc.id,
        channel: 'in_app',
        read: false,
        createdAt: FieldValue.serverTimestamp()
      })
      tx.set(db.collection('auditLogs').doc(), {
        appointmentId: apptDoc.id,
        actorId: 'system',
        actorName: 'System',
        actorRole: 'admin',
        action: 'Temporary booking expired',
        previousStatus: 'PENDING_DOCTOR_CONFIRMATION',
        newStatus: 'EXPIRED',
        timestamp: FieldValue.serverTimestamp()
      })
    })
  }

  void now
})
