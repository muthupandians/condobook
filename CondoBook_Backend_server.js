const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'condo_secret_key_2026';
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ─── SERVE FRONTEND ───────────────────────────────────────────────────────────
// Place CondoBook_Frontend.html renamed as index.html inside ./public/
// EC2 folder structure:
//   ~/condo-booking/
//     server.js
//     public/
//       index.html   <-- CondoBook_Frontend.html goes here
app.use(express.static(path.join(__dirname, 'public')));

// ─── IN-MEMORY DATABASE ───────────────────────────────────────────────────────

const db = {
  users: [
    { id: 'u1', name: 'Admin User', email: 'admin@condo.sg', password: bcrypt.hashSync('admin123', 10), role: 'admin', unit: 'Management' },
    { id: 'u2', name: 'Alice Tan', email: 'alice@resident.sg', password: bcrypt.hashSync('pass123', 10), role: 'resident', unit: '#05-12' },
    { id: 'u3', name: 'Bob Lim', email: 'bob@resident.sg', password: bcrypt.hashSync('pass123', 10), role: 'resident', unit: '#08-03' },
    { id: 'u4', name: 'Carol Ng', email: 'carol@resident.sg', password: bcrypt.hashSync('pass123', 10), role: 'resident', unit: '#12-21' },
  ],
  facilities: [
    { id: 'f1', name: 'Swimming Pool', category: 'Recreation', capacity: 30, pricePerHour: 0, description: 'Olympic-sized pool with lap lanes and leisure zone', image: '🏊', availability: 'available', rules: 'No food, shower before use, children under 12 must be supervised' },
    { id: 'f2', name: 'BBQ Pit A', category: 'Entertainment', capacity: 15, pricePerHour: 20, description: 'Covered BBQ area with 2 grills, sink, and picnic tables', image: '🍖', availability: 'available', rules: 'Bring own charcoal, clean up after use, no alcohol after 10pm' },
    { id: 'f3', name: 'BBQ Pit B', category: 'Entertainment', capacity: 15, pricePerHour: 20, description: 'Open-air BBQ pit with panoramic garden view', image: '🔥', availability: 'available', rules: 'Bring own charcoal, clean up after use, no alcohol after 10pm' },
    { id: 'f4', name: 'Function Room', category: 'Events', capacity: 50, pricePerHour: 80, description: 'Air-conditioned hall with projector, sound system, and tables', image: '🎉', availability: 'available', rules: 'No loud music after 10pm, clean up within 30 mins of booking end' },
    { id: 'f5', name: 'Gym', category: 'Fitness', capacity: 20, pricePerHour: 0, description: 'Fully equipped gym with cardio and weight training equipment', image: '💪', availability: 'available', rules: 'Wipe down equipment after use, no food or drinks except water' },
    { id: 'f6', name: 'Tennis Court', category: 'Sports', capacity: 4, pricePerHour: 10, description: 'Full-sized hard court with night lighting', image: '🎾', availability: 'available', rules: 'Proper sports attire required, maximum 2 hours per booking' },
    { id: 'f7', name: 'Sky Garden', category: 'Recreation', capacity: 25, pricePerHour: 0, description: 'Rooftop garden with city views and seating areas', image: '🌿', availability: 'available', rules: 'No loud music, do not damage plants, open 7am–10pm' },
    { id: 'f8', name: "Children's Playground", category: 'Recreation', capacity: 20, pricePerHour: 0, description: 'Safe outdoor play area with slides, swings, and sandpit', image: '🛝', availability: 'available', rules: 'Children must be supervised by adult at all times' },
  ],
  bookings: [
    {
      id: 'b1', facilityId: 'f1', userId: 'u2', userName: 'Alice Tan', unit: '#05-12',
      date: '2026-05-05', startTime: '09:00', endTime: '11:00', status: 'approved',
      pax: 4, notes: 'Morning lap swimming', createdAt: '2026-05-01T08:00:00Z', totalCost: 0
    },
    {
      id: 'b2', facilityId: 'f2', userId: 'u3', userName: 'Bob Lim', unit: '#08-03',
      date: '2026-05-06', startTime: '17:00', endTime: '21:00', status: 'pending',
      pax: 12, notes: 'Family gathering', createdAt: '2026-05-01T10:00:00Z', totalCost: 80
    },
    {
      id: 'b3', facilityId: 'f4', userId: 'u4', userName: 'Carol Ng', unit: '#12-21',
      date: '2026-05-08', startTime: '14:00', endTime: '18:00', status: 'approved',
      pax: 30, notes: 'Birthday celebration', createdAt: '2026-05-01T09:00:00Z', totalCost: 320
    },
  ]
};

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, unit } = req.body;
  if (!name || !email || !password || !unit)
    return res.status(400).json({ error: 'All fields required' });
  if (db.users.find(u => u.email === email))
    return res.status(409).json({ error: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), name, email, password: hashed, role: 'resident', unit };
  db.users.push(user);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, unit: user.unit }, JWT_SECRET, { expiresIn: '24h' });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, unit: user.unit } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user || !await bcrypt.compare(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, unit: user.unit }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, unit: user.unit } });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, unit: user.unit });
});

// ─── FACILITIES ROUTES ────────────────────────────────────────────────────────

app.get('/api/facilities', authenticate, (req, res) => {
  const { category, availability } = req.query;
  let results = [...db.facilities];
  if (category) results = results.filter(f => f.category === category);
  if (availability) results = results.filter(f => f.availability === availability);
  res.json(results);
});

app.get('/api/facilities/:id', authenticate, (req, res) => {
  const facility = db.facilities.find(f => f.id === req.params.id);
  if (!facility) return res.status(404).json({ error: 'Facility not found' });
  res.json(facility);
});

app.post('/api/facilities', authenticate, requireAdmin, (req, res) => {
  const { name, category, capacity, pricePerHour, description, image, rules } = req.body;
  if (!name || !category || !capacity) return res.status(400).json({ error: 'Name, category, and capacity required' });
  const facility = { id: uuidv4(), name, category, capacity: parseInt(capacity), pricePerHour: parseFloat(pricePerHour || 0), description: description || '', image: image || '🏢', availability: 'available', rules: rules || '' };
  db.facilities.push(facility);
  res.status(201).json(facility);
});

app.put('/api/facilities/:id', authenticate, requireAdmin, (req, res) => {
  const idx = db.facilities.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Facility not found' });
  db.facilities[idx] = { ...db.facilities[idx], ...req.body, id: req.params.id };
  res.json(db.facilities[idx]);
});

app.delete('/api/facilities/:id', authenticate, requireAdmin, (req, res) => {
  const idx = db.facilities.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Facility not found' });
  db.facilities.splice(idx, 1);
  res.json({ message: 'Facility deleted' });
});

// ─── BOOKINGS ROUTES ──────────────────────────────────────────────────────────

app.get('/api/bookings', authenticate, (req, res) => {
  const { facilityId, status, date } = req.query;
  let results = req.user.role === 'admin'
    ? [...db.bookings]
    : db.bookings.filter(b => b.userId === req.user.id);

  if (facilityId) results = results.filter(b => b.facilityId === facilityId);
  if (status) results = results.filter(b => b.status === status);
  if (date) results = results.filter(b => b.date === date);

  results = results.map(b => ({
    ...b,
    facility: db.facilities.find(f => f.id === b.facilityId) || null
  }));

  res.json(results);
});

app.get('/api/bookings/availability', authenticate, (req, res) => {
  const { facilityId, date } = req.query;
  if (!facilityId || !date) return res.status(400).json({ error: 'facilityId and date required' });

  const dayBookings = db.bookings.filter(b =>
    b.facilityId === facilityId && b.date === date && b.status !== 'rejected' && b.status !== 'cancelled'
  );

  res.json({ date, facilityId, bookedSlots: dayBookings.map(b => ({ startTime: b.startTime, endTime: b.endTime, status: b.status })) });
});

app.post('/api/bookings', authenticate, (req, res) => {
  const { facilityId, date, startTime, endTime, pax, notes } = req.body;
  if (!facilityId || !date || !startTime || !endTime || !pax)
    return res.status(400).json({ error: 'All fields required' });

  const facility = db.facilities.find(f => f.id === facilityId);
  if (!facility) return res.status(404).json({ error: 'Facility not found' });

  if (parseInt(pax) > facility.capacity)
    return res.status(400).json({ error: `Maximum capacity is ${facility.capacity} pax` });

  const conflict = db.bookings.find(b =>
    b.facilityId === facilityId &&
    b.date === date &&
    b.status !== 'rejected' &&
    b.status !== 'cancelled' &&
    ((startTime >= b.startTime && startTime < b.endTime) ||
     (endTime > b.startTime && endTime <= b.endTime) ||
     (startTime <= b.startTime && endTime >= b.endTime))
  );
  if (conflict) return res.status(409).json({ error: 'Time slot conflicts with an existing booking' });

  const hours = (parseInt(endTime) - parseInt(startTime));
  const totalCost = facility.pricePerHour * hours;

  const booking = {
    id: uuidv4(),
    facilityId,
    userId: req.user.id,
    userName: req.user.name,
    unit: req.user.unit,
    date, startTime, endTime,
    pax: parseInt(pax),
    notes: notes || '',
    status: 'pending',
    totalCost,
    createdAt: new Date().toISOString()
  };
  db.bookings.push(booking);
  res.status(201).json({ ...booking, facility });
});

app.put('/api/bookings/:id/status', authenticate, requireAdmin, (req, res) => {
  const { status, adminNote } = req.body;
  if (!['approved', 'rejected'].includes(status))
    return res.status(400).json({ error: 'Status must be approved or rejected' });

  const idx = db.bookings.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Booking not found' });

  db.bookings[idx] = { ...db.bookings[idx], status, adminNote: adminNote || '', updatedAt: new Date().toISOString() };
  res.json(db.bookings[idx]);
});

app.put('/api/bookings/:id/cancel', authenticate, (req, res) => {
  const idx = db.bookings.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Booking not found' });

  const booking = db.bookings[idx];
  if (booking.userId !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: "Cannot cancel another resident's booking" });
  if (booking.status === 'cancelled')
    return res.status(400).json({ error: 'Booking already cancelled' });

  db.bookings[idx] = { ...booking, status: 'cancelled', updatedAt: new Date().toISOString() };
  res.json(db.bookings[idx]);
});

// ─── DASHBOARD / STATS ────────────────────────────────────────────────────────

app.get('/api/dashboard/stats', authenticate, requireAdmin, (req, res) => {
  const total = db.bookings.length;
  const pending = db.bookings.filter(b => b.status === 'pending').length;
  const approved = db.bookings.filter(b => b.status === 'approved').length;
  const cancelled = db.bookings.filter(b => b.status === 'cancelled' || b.status === 'rejected').length;
  const facilities = db.facilities.length;
  const residents = db.users.filter(u => u.role === 'resident').length;
  const revenue = db.bookings.filter(b => b.status === 'approved').reduce((sum, b) => sum + (b.totalCost || 0), 0);

  const facilityStats = db.facilities.map(f => ({
    id: f.id, name: f.name, category: f.category, image: f.image,
    totalBookings: db.bookings.filter(b => b.facilityId === f.id).length,
    approvedBookings: db.bookings.filter(b => b.facilityId === f.id && b.status === 'approved').length,
  }));

  res.json({ total, pending, approved, cancelled, facilities, residents, revenue, facilityStats });
});

// ─── USERS (admin) ────────────────────────────────────────────────────────────

app.get('/api/users', authenticate, requireAdmin, (req, res) => {
  res.json(db.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, unit: u.unit })));
});

// ─── FALLBACK: serve index.html for any non-API route ─────────────────────────
// Must be LAST — after all /api routes
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START SERVER ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🏢 CondoBook server running on port ${PORT}`);
  console.log(`   Frontend: http://localhost:${PORT}`);
  console.log(`   API:      http://localhost:${PORT}/api`);
});
