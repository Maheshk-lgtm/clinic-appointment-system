/**
 * Development seed script. Requires a Firebase service account key.
 *
 * Usage:
 *   1. Firebase Console > Project Settings > Service Accounts > Generate new private key
 *   2. Save it as ./serviceAccountKey.json (already gitignored)
 *   3. npm run seed
 *
 * Creates fictional demo data only — no real patient information.
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
initializeApp({ credential: cert(serviceAccount) })
const auth = getAuth()
const db = getFirestore()

async function upsertUser(email: string, password: string, displayName: string, role: 'admin' | 'receptionist' | 'doctor') {
  let uid: string
  try {
    const existing = await auth.getUserByEmail(email)
    uid = existing.uid
  } catch {
    const created = await auth.createUser({ email, password, displayName })
    uid = created.uid
  }
  await db.collection('users').doc(uid).set(
    {
      uid,
      email,
      displayName,
      role,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: 'seed-script'
    },
    { merge: true }
  )
  return uid
}

async function main() {
  console.log('Seeding demo data…')

  await db.collection('settings').doc('global').set(
    { temporaryBookingMinutes: 15, defaultConsultationMinutes: 30, clinicName: 'Bright Smile Dental Clinic' },
    { merge: true }
  )

  const adminUid = await upsertUser('admin@clinic.test', 'Passw0rd!', 'Ashwin Rao (Admin)', 'admin')
  const recep1 = await upsertUser('reception1@clinic.test', 'Passw0rd!', 'Divya Menon', 'receptionist')
  const recep2 = await upsertUser('reception2@clinic.test', 'Passw0rd!', 'Farhan Iqbal', 'receptionist')
  const doc1User = await upsertUser('dr.priya@clinic.test', 'Passw0rd!', 'Dr. Priya Nair', 'doctor')
  const doc2User = await upsertUser('dr.arjun@clinic.test', 'Passw0rd!', 'Dr. Arjun Sethi', 'doctor')
  const doc3User = await upsertUser('dr.meera@clinic.test', 'Passw0rd!', 'Dr. Meera Kulkarni', 'doctor')

  const specs = [
    { id: 'general', name: 'General Dentistry' },
    { id: 'ortho', name: 'Orthodontics' },
    { id: 'endo', name: 'Endodontics' }
  ]
  for (const s of specs) {
    await db.collection('specializations').doc(s.id).set({ name: s.name, active: true })
  }

  const weekdayHours = (enabled: boolean) => ({ enabled, start: '09:00', end: '17:00' })
  const standardWeek = [
    { day: 'mon', ...weekdayHours(true) },
    { day: 'tue', ...weekdayHours(true) },
    { day: 'wed', ...weekdayHours(true) },
    { day: 'thu', ...weekdayHours(true) },
    { day: 'fri', ...weekdayHours(true) },
    { day: 'sat', ...weekdayHours(false) },
    { day: 'sun', ...weekdayHours(false) }
  ]

  async function upsertDoctor(id: string, name: string, userId: string, specializationId: string, specializationName: string) {
    await db.collection('doctors').doc(id).set({
      userId,
      name,
      specializationId,
      specializationName,
      qualification: 'BDS, MDS',
      phone: '+91 90000 00000',
      email: `${id}@clinic.test`,
      consultationMinutes: 30,
      workingHours: standardWeek,
      exceptions: [],
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })
    await db.collection('users').doc(userId).set({ doctorId: id }, { merge: true })
  }

  await upsertDoctor('dr-priya', 'Dr. Priya Nair', doc1User, 'general', 'General Dentistry')
  await upsertDoctor('dr-arjun', 'Dr. Arjun Sethi', doc2User, 'ortho', 'Orthodontics')
  await upsertDoctor('dr-meera', 'Dr. Meera Kulkarni', doc3User, 'endo', 'Endodontics')

  console.log('Done. Demo logins (password: Passw0rd!):')
  console.log('  Admin:        admin@clinic.test')
  console.log('  Receptionist: reception1@clinic.test, reception2@clinic.test')
  console.log('  Doctors:      dr.priya@clinic.test, dr.arjun@clinic.test, dr.meera@clinic.test')
  console.log(`(admin uid: ${adminUid}, receptionists: ${recep1}, ${recep2})`)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
