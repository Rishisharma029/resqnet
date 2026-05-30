/* ═══════════════════════════════════════════════════════════════
   ResQNet — AI-Powered Disaster Coordination Platform
   app.js — Complete Application Logic
   Architecture: State-driven SPA with simulated microservices
   ═══════════════════════════════════════════════════════════════ */

// ResQNet — strict mode disabled for dynamic compatibility

// ═══════════════════════════════════════════════════ STATE MANAGEMENT
// Zustand-inspired centralized state store
const AppState = {
  auth: { user: null, role: 'citizen', token: 'jwt_demo_token', isAuthenticated: false },
  ui: { activePanel: 'dashboard', sidebarOpen: true, notifPanelOpen: false },
  realtime: { connected: true, lastPing: Date.now() },
  incidents: { list: [], filters: { severity: 'all', type: 'all', search: '' } },
  volunteers: { list: [], tasks: [] },
  resources: { items: [] },
  shelters: { list: [] },
  notifications: [],
  city: 'delhi',
  scenario: null,
  charts: {},
  maps: { mini: null, main: null, predict: null, satellite: null },
  layers: { incidents: true, flood: false, safe: false, rescue: false, shelter: false, crowd: false },
  sos: { holding: false, timer: null, triggered: false },
  chat: { messages: [], lang: 'en' },
  quiz: { current: 0, score: 0, answered: false },
  training: { tab: 'lessons' },
  market: { tab: 'requests' },
  selectedSeverity: 'high',
  selectedAlertType: 'general',
  broadcastHistory: [],
};

function setState(path, value) {
  const keys = path.split('.');
  let obj = AppState;
  for (let i = 0; i < keys.length - 1; i++) {
    if (['__proto__', 'constructor', 'prototype'].includes(keys[i])) return;
    obj = obj[keys[i]];
  }
  if (['__proto__', 'constructor', 'prototype'].includes(keys[keys.length - 1])) return;
  obj[keys[keys.length - 1]] = value;
}

// ═══════════════════════════════════════════════════ ROLE-BASED ACCESS CONTROL
// Admin + Rescue = full access. Everyone else = limited citizen view.
const ROLE_FULL_ACCESS = ['admin', 'rescue'];

// Panels that restricted roles (citizen/volunteer/hospital/ngo) CANNOT access
const RESTRICTED_PANELS = [
  'incidents', 'map', 'volunteers', 'resources', 'healthcare',
  'broadcast', 'predict', 'iot', 'analytics', 'blockchain',
  'satellite', 'settings', 'market'
];

// Nav items that are hidden entirely for restricted roles
const RESTRICTED_NAV = [
  'nav-incidents', 'nav-map', 'nav-volunteers', 'nav-resources', 'nav-healthcare',
  'nav-broadcast', 'nav-predict', 'nav-iot', 'nav-analytics', 'nav-blockchain',
  'nav-satellite', 'nav-settings', 'nav-market'
];

function isFullAccess() {
  return ROLE_FULL_ACCESS.includes(AppState.auth.role);
}

function hasPermission(panel) {
  if (isFullAccess()) return true;
  return !RESTRICTED_PANELS.includes(panel);
}

function applyRoleUI() {
  const role = AppState.auth.role;
  const full = isFullAccess();

  // Hide restricted nav items
  RESTRICTED_NAV.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = full ? '' : 'none';
  });

  // Show role banner in sidebar
  const banner = document.getElementById('role-access-banner');
  if (banner) {
    if (!full) {
      const roleLabel = {
        citizen: 'Citizen', volunteer: 'Volunteer',
        hospital: 'Hospital', ngo: 'NGO Partner'
      }[role] || role;
      banner.innerHTML = `
        <div style="background:rgba(245,166,35,0.15);border:1px solid rgba(245,166,35,0.4);border-radius:8px;padding:0.6rem 0.75rem;margin:0.5rem 0;font-size:0.75rem;">
          <div style="color:#f5a623;font-weight:700;margin-bottom:0.2rem;">🔒 ${roleLabel} Access</div>
          <div style="color:var(--text-muted);line-height:1.4;">Limited view. Contact admin to request elevated access.</div>
        </div>`;
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  }

  // Update header user badge
  const userBadge = document.getElementById('user-role-badge');
  if (userBadge) {
    userBadge.textContent = role.toUpperCase();
    userBadge.className = 'user-role-badge ' + (full ? 'badge-full' : 'badge-limited');
  }

  // Show/hide dispatch/broadcast buttons in dashboard
  document.querySelectorAll('.dispatch-btn, .broadcast-action-btn').forEach(btn => {
    btn.style.display = full ? '' : 'none';
  });
}

function showAccessDenied(panelId) {
  const panel = document.getElementById('panel-' + panelId);
  if (!panel) return;
  // Only inject once
  if (panel.querySelector('.access-denied-wall')) return;
  const roleLabel = {
    citizen: 'Citizen', volunteer: 'Volunteer',
    hospital: 'Hospital Staff', ngo: 'NGO Partner'
  }[AppState.auth.role] || 'User';
  const wall = document.createElement('div');
  wall.className = 'access-denied-wall';
  wall.innerHTML = `
    <div class="access-denied-card">
      <div class="access-denied-icon">🔒</div>
      <h2 class="access-denied-title">Access Restricted</h2>
      <p class="access-denied-sub">This module requires <strong>Rescue Team</strong> or <strong>Administrator</strong> credentials.</p>
      <div class="access-denied-role">Your role: <span>${roleLabel}</span></div>
      <div class="access-denied-actions">
        <button class="btn-primary" onclick="showPanel('dashboard')">← Back to Dashboard</button>
        <button class="btn-secondary" onclick="showPanel('ai')">Ask AI Assistant</button>
      </div>
      <div class="access-denied-hint">Need access? Contact your district administrator or call <strong>1070</strong>.</div>
    </div>
  `;
  // Put wall on top of panel content
  panel.style.position = 'relative';
  panel.appendChild(wall);
}

// ═══════════════════════════════════════════════════ SCENARIO DATA
const SCENARIOS = {
  delhi: {
    name: 'New Delhi', emoji: '🌊',
    label: 'FLOOD CRISIS — Yamuna River at 208m',
    type: 'flood', color: '#00d4ff',
    stats: { critical: 12, affected: 47200, volunteers: 234, resources: 89, shelter: 72, saved: 1847 },
    ticker: '🌊 CRITICAL: Yamuna at 208m — 47 zones flooded | 🚨 Evacuate: Mayur Vihar, Laxmi Nagar | 🚑 12 rescue teams deployed | ☎ Helpline: 1070',
    incidents: [
      { id: 'INC001', type: 'flood', icon: '🌊', title: 'Yamuna Floodplain — Mayur Vihar', severity: 'critical', location: [28.608, 77.294], address: 'Mayur Vihar Phase 1', affected: 8400, time: '14 min ago', status: 'responding' },
      { id: 'INC002', type: 'flood', icon: '🌊', title: 'Residential Waterlogging — Laxmi Nagar', severity: 'critical', location: [28.631, 77.276], address: 'Laxmi Nagar Metro', affected: 5200, time: '28 min ago', status: 'active' },
      { id: 'INC003', type: 'medical', icon: '🏥', title: 'Mass Casualty — GTB Hospital', severity: 'high', location: [28.667, 77.305], address: 'GTB Hospital, Dilshad Garden', affected: 340, time: '1h ago', status: 'responding' },
      { id: 'INC004', type: 'collapse', icon: '🏚', title: 'Building Collapse — Geeta Colony', severity: 'high', location: [28.643, 77.269], address: 'Geeta Colony, East Delhi', affected: 120, time: '2h ago', status: 'responding' },
      { id: 'INC005', type: 'flood', icon: '🌊', title: 'Flood — Wazirabad', severity: 'medium', location: [28.716, 77.217], address: 'Wazirabad, North Delhi', affected: 2100, time: '3h ago', status: 'active' },
      { id: 'INC006', type: 'medical', icon: '🏥', title: 'Oxygen Shortage — LNJP Hospital', severity: 'high', location: [28.638, 77.234], address: 'LNJP Hospital, Daryaganj', affected: 89, time: '4h ago', status: 'active' },
      { id: 'INC007', type: 'flood', icon: '🌊', title: 'Flood — ITO Bridge Area', severity: 'medium', location: [28.627, 77.247], address: 'ITO, Central Delhi', affected: 1400, time: '5h ago', status: 'active' },
      { id: 'INC008', type: 'missing', icon: '🔍', title: 'Missing: 3 Children — Yamuna Khadar', severity: 'critical', location: [28.614, 77.283], address: 'Yamuna Khadar, East Delhi', affected: 3, time: '6h ago', status: 'active' },
    ],
  },
  mumbai: {
    name: 'Mumbai', emoji: '🔥',
    label: 'FIRE EMERGENCY — Industrial Zone, Dharavi',
    type: 'fire', color: '#ff3b3b',
    stats: { critical: 8, affected: 12400, volunteers: 167, resources: 64, shelter: 45, saved: 923 },
    ticker: '🔥 CRITICAL: Industrial Fire — Dharavi | ⚗ Chemical leak detected — 2km evacuation zone | 🚒 6 fire engines deployed | 💨 AQI: 487 Hazardous',
    incidents: [
      { id: 'INC101', type: 'fire', icon: '🔥', title: 'Industrial Fire — Dharavi Compound', severity: 'critical', location: [19.041, 72.853], address: 'Dharavi, Mumbai', affected: 3200, time: '22 min ago', status: 'responding' },
      { id: 'INC102', type: 'chemical', icon: '⚗', title: 'Chemical Leak — MIDC Plant', severity: 'critical', location: [19.076, 72.876], address: 'MIDC Industrial Area, Andheri', affected: 1800, time: '45 min ago', status: 'active' },
      { id: 'INC103', type: 'medical', icon: '🏥', title: 'Mass Respiratory Cases — KEM Hospital', severity: 'high', location: [18.992, 72.842], address: 'KEM Hospital, Parel', affected: 234, time: '1h ago', status: 'responding' },
      { id: 'INC104', type: 'fire', icon: '🔥', title: 'Slum Fire — Govandi', severity: 'high', location: [19.067, 72.928], address: 'Govandi, East Mumbai', affected: 890, time: '2h ago', status: 'active' },
      { id: 'INC105', type: 'flood', icon: '🌊', title: 'Storm Drain Overflow — Kurla', severity: 'medium', location: [19.070, 72.885], address: 'Kurla West', affected: 1200, time: '3h ago', status: 'active' },
    ],
  },
  chennai: {
    name: 'Chennai', emoji: '🌪',
    label: 'CYCLONE ALERT — Category 3 Approaching',
    type: 'cyclone', color: '#a855f7',
    stats: { critical: 6, affected: 89000, volunteers: 445, resources: 123, shelter: 83, saved: 2341 },
    ticker: '🌪 CYCLONE WARNING: Category 3 landfall in 6h | ⚠ Evacuate coastal zones | 🏠 445 shelters activated | 🌊 Storm surge: 3-5m expected',
    incidents: [
      { id: 'INC201', type: 'cyclone', icon: '🌪', title: 'Cyclone Landfall — Marina Beach Zone', severity: 'critical', location: [13.050, 80.282], address: 'Marina Beach, Chennai', affected: 45000, time: '2h ago', status: 'active' },
      { id: 'INC202', type: 'flood', icon: '🌊', title: 'Storm Surge — Ennore', severity: 'critical', location: [13.205, 80.319], address: 'Ennore Port Area', affected: 12000, time: '3h ago', status: 'active' },
      { id: 'INC203', type: 'collapse', icon: '🏚', title: 'Roof Collapse — T. Nagar', severity: 'high', location: [13.041, 80.234], address: 'T. Nagar, Chennai', affected: 45, time: '4h ago', status: 'responding' },
    ],
  },
  kolkata: {
    name: 'Kolkata', emoji: '🏚',
    label: 'EARTHQUAKE M5.8 — Structural Damage Widespread',
    type: 'earthquake', color: '#f5a623',
    stats: { critical: 19, affected: 134000, volunteers: 389, resources: 201, shelter: 91, saved: 4102 },
    ticker: '🌍 EARTHQUAKE M5.8 — 124 incidents reported | 🏚 7 building collapses confirmed | 🚑 89 injured, 4 hospitals overwhelmed | 🔍 23 missing persons',
    incidents: [
      { id: 'INC301', type: 'collapse', icon: '🏚', title: 'Building Collapse — Park Street', severity: 'critical', location: [22.547, 88.351], address: 'Park Street, Kolkata', affected: 420, time: '1h ago', status: 'responding' },
      { id: 'INC302', type: 'medical', icon: '🏥', title: 'Mass Casualty — SSKM Hospital', severity: 'critical', location: [22.534, 88.340], address: 'SSKM Hospital, Kolkata', affected: 890, time: '1.5h ago', status: 'active' },
      { id: 'INC303', type: 'missing', icon: '🔍', title: 'Survivors Trapped — Behala', severity: 'critical', location: [22.486, 88.310], address: 'Behala, South Kolkata', affected: 23, time: '2h ago', status: 'active' },
    ],
  },
  bangalore: {
    name: 'Bangalore', emoji: '🪨',
    label: 'LANDSLIDE — Nandi Hills, NH-44 Blocked',
    type: 'landslide', color: '#f5a623',
    stats: { critical: 4, affected: 8900, volunteers: 98, resources: 42, shelter: 34, saved: 567 },
    ticker: '🪨 LANDSLIDE: NH-44 blocked, 3 villages cut off | 🚁 Air rescue deployed | ☎ Helpline: 1800-425-1515',
    incidents: [
      { id: 'INC401', type: 'landslide', icon: '🪨', title: 'Major Landslide — Nandi Hills', severity: 'critical', location: [13.371, 77.683], address: 'Nandi Hills, Bangalore Rural', affected: 2400, time: '3h ago', status: 'active' },
    ],
  },
  hyderabad: {
    name: 'Hyderabad', emoji: '⛈',
    label: 'FLASH FLOOD — Musi River Overflow',
    type: 'flood', color: '#00d4ff',
    stats: { critical: 7, affected: 23000, volunteers: 178, resources: 76, shelter: 58, saved: 1234 },
    ticker: '⛈ FLASH FLOOD: Musi River at danger level | 🚨 Evacuate: Charminar Zone, Old City | 🚑 7 rescue teams active',
    incidents: [
      { id: 'INC501', type: 'flood', icon: '🌊', title: 'Musi Overflow — Charminar Area', severity: 'critical', location: [17.360, 78.473], address: 'Charminar, Old City', affected: 8900, time: '1h ago', status: 'responding' },
    ],
  },
};

// ═══════════════════════════════════════════════════ VOLUNTEER DATA
const VOLUNTEERS_DATA = [
  { id: 'V001', name: 'Arjun Sharma', avatar: 'A', color: '#00d4ff', skills: ['Medical', 'Rescue'], xp: 4820, status: 'active', location: 'Sector 14', hours: 234, badges: ['🏅','⭐','🚑'] },
  { id: 'V002', name: 'Priya Menon', avatar: 'P', color: '#a855f7', skills: ['Logistics', 'Translation'], xp: 3640, status: 'active', location: 'Connaught Place', hours: 189, badges: ['⭐','🌐'] },
  { id: 'V003', name: 'Rahul Gupta', avatar: 'R', color: '#f5a623', skills: ['Tech', 'Rescue'], xp: 3210, status: 'busy', location: 'ITO Bridge', hours: 156, badges: ['💻','🚑'] },
  { id: 'V004', name: 'Sunita Verma', avatar: 'S', color: '#00ff88', skills: ['Medical', 'First Aid'], xp: 2890, status: 'active', location: 'GTB Hospital', hours: 201, badges: ['🏥','❤️'] },
  { id: 'V005', name: 'Karthik Rajan', avatar: 'K', color: '#3b82f6', skills: ['Rescue', 'Diving'], xp: 2560, status: 'active', location: 'Yamuna Bank', hours: 143, badges: ['🏊','🚑'] },
  { id: 'V006', name: 'Anita Desai', avatar: 'A', color: '#ff3b3b', skills: ['NGO', 'Logistics'], xp: 2100, status: 'offline', location: 'Sarojini Nagar', hours: 98, badges: ['🌍'] },
  { id: 'V007', name: 'Vikram Singh', avatar: 'V', color: '#00d4ff', skills: ['Police', 'Rescue'], xp: 1980, status: 'active', location: 'Laxmi Nagar', hours: 87, badges: ['🚔'] },
  { id: 'V008', name: 'Deepa Nair', avatar: 'D', color: '#a855f7', skills: ['Medical', 'Counseling'], xp: 1750, status: 'busy', location: 'LNJP Hospital', hours: 76, badges: ['❤️','💆'] },
];

const TASKS_DATA = [
  { id: 'T001', title: 'Evacuate Mayur Vihar Block C', priority: 'critical', volunteer: 'Arjun Sharma', status: 'in_progress', time: '30 min' },
  { id: 'T002', title: 'Distribute food packets — Ramlila Ground', priority: 'high', volunteer: 'Priya Menon', status: 'pending', time: '1h' },
  { id: 'T003', title: 'Medical assessment — GTB Hospital', priority: 'high', volunteer: 'Sunita Verma', status: 'in_progress', time: '45 min' },
  { id: 'T004', title: 'Rescue boat deployment — ITO Bridge', priority: 'critical', volunteer: 'Karthik Rajan', status: 'in_progress', time: '15 min' },
  { id: 'T005', title: 'Set up water purification — Shelter 3', priority: 'medium', volunteer: 'Unassigned', status: 'pending', time: '2h' },
];

// ═══════════════════════════════════════════════════ RESOURCE DATA
const RESOURCES_DATA = [
  { type: 'Ambulances', icon: '🚑', count: 23, total: 30, status: 'low', unit: 'vehicles' },
  { type: 'Food Packets', icon: '🍱', count: 8420, total: 15000, status: 'ok', unit: 'packets' },
  { type: 'Medicines', icon: '💊', count: 3840, total: 8000, status: 'low', unit: 'kits' },
  { type: 'Water Tanks', icon: '🚰', count: 12, total: 20, status: 'ok', unit: 'tankers' },
  { type: 'Generators', icon: '⚡', count: 8, total: 15, status: 'low', unit: 'units' },
  { type: 'Rescue Boats', icon: '⛵', count: 6, total: 10, status: 'ok', unit: 'boats' },
  { type: 'Rescue Kits', icon: '🎒', count: 340, total: 500, status: 'ok', unit: 'kits' },
  { type: 'Oxygen Cylinders', icon: '🫁', count: 89, total: 200, status: 'critical', unit: 'cylinders' },
];

// ═══════════════════════════════════════════════════ SHELTER DATA
const SHELTERS_DATA = [
  { name: 'Ramlila Maidan Camp', capacity: 5000, occupancy: 3620, food: 72, water: 88, beds: 1380, medical: true, women: true, status: 'open', dist: '1.2km' },
  { name: 'Pragati Maidan Shelter', capacity: 3000, occupancy: 1350, food: 90, water: 95, beds: 1650, medical: false, women: true, status: 'open', dist: '2.4km' },
  { name: 'Talkatora Stadium', capacity: 2500, occupancy: 2480, food: 45, water: 62, beds: 20, medical: true, women: false, status: 'open', dist: '3.1km' },
  { name: 'DDA Flats, Geeta Colony', capacity: 800, occupancy: 800, food: 30, water: 40, beds: 0, medical: false, women: false, status: 'full', dist: '0.8km' },
  { name: 'Jawaharlal Nehru Stadium', capacity: 4000, occupancy: 1200, food: 95, water: 98, beds: 2800, medical: true, women: true, status: 'open', dist: '4.5km' },
  { name: 'Thyagraj Sports Complex', capacity: 1200, occupancy: 870, food: 80, water: 75, beds: 330, medical: false, women: true, status: 'open', dist: '5.2km' },
];

// ═══════════════════════════════════════════════════ HOSPITAL DATA
const HOSPITALS_DATA = [
  { name: 'AIIMS New Delhi', icu: 78, beds: 65, oxygen: 90, blood: 70, emergency: true, status: 'high' },
  { name: 'Safdarjung Hospital', icu: 92, beds: 88, oxygen: 45, blood: 55, emergency: true, status: 'critical' },
  { name: 'GTB Hospital', icu: 45, beds: 40, oxygen: 78, blood: 85, emergency: true, status: 'moderate' },
  { name: 'LNJP Hospital', icu: 85, beds: 72, oxygen: 30, blood: 65, emergency: true, status: 'high' },
];

// ═══════════════════════════════════════════════════ MISSING PERSONS DATA
const MISSING_DATA = [
  { name: 'Raju (8)', age: 8, emoji: '👦', lastSeen: 'Yamuna Khadar', time: '6h ago', status: 'searching' },
  { name: 'Sita Devi (67)', age: 67, emoji: '👵', lastSeen: 'Mayur Vihar Block B', time: '8h ago', status: 'searching' },
  { name: 'Mohammed Rafi (12)', age: 12, emoji: '👦', lastSeen: 'Laxmi Nagar Market', time: '10h ago', status: 'searching' },
  { name: 'Priya (25)', age: 25, emoji: '👩', lastSeen: 'ITO Bridge', time: '12h ago', status: 'found' },
  { name: 'Anil Kumar (45)', age: 45, emoji: '👨', lastSeen: 'Geeta Colony', time: '14h ago', status: 'searching' },
  { name: 'Baby Sunita (2)', age: 2, emoji: '👶', lastSeen: 'Wazirabad', time: '5h ago', status: 'found' },
];

// ═══════════════════════════════════════════════════ FAMILY DATA
const FAMILY_DATA = [
  { name: 'Maa (Mom)', emoji: '👩', relation: 'Mother', status: 'safe', location: 'Saket, Delhi', lastCheck: '2h ago' },
  { name: 'Papa (Dad)', emoji: '👨', relation: 'Father', status: 'safe', location: 'Saket, Delhi', lastCheck: '2h ago' },
  { name: 'Priya (Sister)', emoji: '👧', relation: 'Sister', status: 'unknown', location: 'Mayur Vihar', lastCheck: '8h ago' },
  { name: 'Rahul (Brother)', emoji: '👦', relation: 'Brother', status: 'danger', location: 'Laxmi Nagar', lastCheck: '45 min ago' },
];

// ═══════════════════════════════════════════════════ AI RESPONSES
const AI_RESPONSES = {
  en: {
    flood: `🌊 **Flood Safety Protocol:**\n\n**IMMEDIATELY:**\n1. Move to higher ground NOW — don't wait\n2. Avoid walking in moving water (6 inches can knock you down)\n3. If trapped in a building, go to the roof — signal rescuers\n\n**DO NOT:**\n• Drive through flooded roads\n• Touch electrical equipment near water\n• Enter flood water (hidden debris, currents)\n\n**Contact:** Call 1070 or text RESQNET SOS to 1070\n📍 Nearest shelter: Ramlila Maidan (1.2km) — 1,380 beds available`,
    fire: `🔥 **Fire Emergency Protocol:**\n\n**IMMEDIATELY:**\n1. Call 101 (Fire) + activate nearest alarm\n2. Crawl low — smoke rises, air is cleaner near floor\n3. Feel doors before opening — if hot, use alternate route\n4. Meet at designated assembly point\n\n**NEVER:**\n• Use elevator during fire\n• Re-enter building to collect belongings\n• Open windows (feeds fire)\n\n**Burns:** Cool with running water 20 min. DO NOT use ice or butter.\n📞 Fire: 101 | Medical: 102 | ResQNet: 1070`,
    earthquake: `🌍 **Earthquake Response:**\n\n**DURING shaking:**\n1. DROP to hands and knees\n2. COVER — get under sturdy desk/table, or against interior wall\n3. HOLD ON until shaking stops\n\n**AFTER:**\n• Check for injuries before moving\n• Expect aftershocks — stay away from damaged structures\n• Do NOT use matches/lighters (gas leak risk)\n• Listen for official evacuation orders\n\n**Trapped? Make noise:** Tap pipes or walls rhythmically\n📍 AI Survivor Detection teams are being deployed to your area`,
    shelter: `🏠 **Nearest Shelters (AI Recommended):**\n\n1. 🟢 **Ramlila Maidan** — 1.2km\n   Capacity: 5,000 | Available: 1,380 beds\n   ✅ Medical ✅ Women safe ✅ Food/Water\n\n2. 🟢 **Pragati Maidan** — 2.4km\n   Capacity: 3,000 | Available: 1,650 beds\n   ✅ Women safe ✅ Food/Water\n\n3. 🟢 **JLN Stadium** — 4.5km\n   Capacity: 4,000 | Available: 2,800 beds\n   ✅ Medical ✅ Women safe ✅ Full facilities\n\n🚨 **DDA Flats Geeta Colony** is FULL — do not proceed there\n\n📞 Shelter helpline: 011-23490000`,
    panic: `💆 **Panic Calming Protocol — Breathe With Me:**\n\nI hear you. You're safe right now. Let's slow down together.\n\n**Box Breathing (4-4-4-4):**\n• Breathe IN for 4 seconds...\n• HOLD for 4 seconds...\n• Breathe OUT for 4 seconds...\n• HOLD for 4 seconds...\n\nRepeat 3 times. You've got this. 💙\n\n**Grounding (5-4-3-2-1):**\n• 5 things you can SEE\n• 4 things you can TOUCH\n• 3 things you can HEAR\n• 2 things you can SMELL\n• 1 thing you can TASTE\n\nHelp is coming. You are not alone. 🤝`,
    evacuation: `🚗 **AI Evacuation Route Recommendations:**\n\n**Recommended Route 1 (Fastest):**\nRing Road → NH-24 → NH-58 → Safer Zone\nEstimated time: 45 min | Status: ✅ CLEAR\n\n**Recommended Route 2 (Backup):**\nVikas Marg → DND Flyway → Noida\nEstimated time: 55 min | Status: ⚠️ Slow traffic\n\n**AVOID:**\n❌ Yamuna Expressway (flooded sections)\n❌ ITO Bridge (at risk of closure)\n❌ Noida-Greater Noida Link Road\n\n📻 Tune to All India Radio 100.1 FM for live updates\n📍 Next check point: Noida Sector 62 Relief Camp`,
    firstaid: `🩺 **First Aid — General Emergency:**\n\n**Bleeding:** Apply direct pressure with clean cloth. Do not remove cloth — add more on top if needed. Elevate the limb.\n\n**CPR (if no pulse):**\n1. 30 chest compressions — hard and fast\n2. 2 rescue breaths\n3. Repeat until help arrives\n\n**Choking:**\n• Adult: 5 back blows + 5 abdominal thrusts (Heimlich)\n• Infant: Face down, 5 back blows\n\n**Burns:** Cool water 20 minutes. Cover loosely.\n\n**Fracture:** Immobilize, do not straighten.\n\n🚑 Call 108 for ambulance | Open AR First Aid Guide in app →`,
    default: `🤖 **ResQNet AI Assistant**\n\nI'm analyzing your query with real-time disaster data...\n\nI can help you with:\n• 🌊 Flood safety protocols\n• 🔥 Fire emergency response\n• 🌍 Earthquake procedures\n• 🏠 Nearest shelter locations\n• 🩺 First aid instructions\n• 🚗 Evacuation routes\n• 💆 Panic calming\n• 📍 Resource locations\n\nAsk me anything — I'm here 24/7 during the emergency. What do you need?`,
  },
  hi: {
    flood: `🌊 **बाढ़ सुरक्षा प्रोटोकॉल:**\n\n**तुरंत करें:**\n1. ऊंची जगह पर जाएं — अभी, देर न करें\n2. बहते पानी में न चलें\n3. अगर घर में फंसे हैं — छत पर जाएं और संकेत दें\n\n**मदद के लिए:** 1070 पर कॉल करें\n📍 नजदीकी शेल्टर: रामलीला मैदान (1.2km)`,
    default: `🤖 **ResQNet AI सहायक**\n\nनमस्ते! मैं आपकी मदद के लिए यहां हूं।\n\nआप पूछ सकते हैं:\n• बाढ़ सुरक्षा\n• आग से बचाव\n• भूकंप प्रोटोकॉल\n• नजदीकी शेल्टर\n• प्राथमिक चिकित्सा\n\nक्या मदद चाहिए?`,
  },
  ta: {
    default: `🤖 **ResQNet AI உதவியாளர்**\n\nவணக்கம்! நான் உங்களுக்கு உதவ இங்கே இருக்கிறேன்.\n\nகேட்கலாம்:\n• வெள்ளப் பாதுகாப்பு\n• தீ அவசரநிலை\n• நிவாரண முகாம்கள்\n• முதலுதவி\n\nதயவுசெய்து கேளுங்கள்!`,
  },
};

// ═══════════════════════════════════════════════════ QUIZ DATA
const QUIZ_DATA = {
  flood: [
    { q: 'What is the minimum water depth that can knock an adult off their feet?', options: ['2 inches', '6 inches', '12 inches', '18 inches'], answer: 1, explanation: 'Just 6 inches of moving water can knock an adult down.' },
    { q: 'During a flood, you should:', options: ['Drive through if the water looks shallow', 'Walk through flooded streets', 'Move to higher ground immediately', 'Open windows for ventilation'], answer: 2, explanation: 'Always move to higher ground immediately.' },
    { q: 'If trapped in a flooded building, you should go to:', options: ['The basement', 'The ground floor', 'The roof', 'Under a staircase'], answer: 2, explanation: 'Go to the roof to signal for rescue and stay above rising water.' },
    { q: 'Flood water is dangerous because it may contain:', options: ['Only clean rainwater', 'Sewage, chemicals, and debris', 'Minerals beneficial for health', 'Nothing harmful'], answer: 1, explanation: 'Flood water is contaminated with sewage, chemicals, and hidden debris.' },
    { q: 'What should you do with electrical equipment during a flood?', options: ['Move it to higher ground first', 'Turn it off and avoid all contact', 'Cover with plastic wrap', 'Unplug and carry it out'], answer: 1, explanation: 'Avoid all electrical equipment — water conducts electricity.' },
  ],
  fire: [
    { q: 'When smoke is present in a building, you should:', options: ['Stand upright to see better', 'Crawl low to the ground', 'Run as fast as possible', 'Shout for help'], answer: 1, explanation: 'Crawl low — smoke and toxic gases rise, air near the floor is cleaner.' },
    { q: 'Before opening a door during a fire, you should:', options: ['Open it quickly', 'Feel it with your palm', 'Use your foot to kick it open', 'Look through the keyhole'], answer: 1, explanation: 'Feel the door with the back of your hand. If hot, do not open — find another exit.' },
    { q: 'For a small kitchen fire in a pan:', options: ['Pour water on it', 'Slide a lid over the pan and turn off heat', 'Blow on it', 'Use a towel to fan it'], answer: 1, explanation: 'Slide a lid on the pan to cut off oxygen, and turn off the heat.' },
    { q: 'During evacuation, should you use the elevator?', options: ['Yes, it is fastest', 'Only if fire is not on your floor', 'Never — use stairs only', 'If you have heavy bags'], answer: 2, explanation: 'Never use elevators during a fire — power can fail, trapping you.' },
    { q: 'After escaping a building fire, you should:', options: ['Re-enter to get valuables', 'Wait by the entrance', 'Go to the assembly point and call emergency services', 'Drive away immediately'], answer: 2, explanation: 'Go to your designated assembly point and never re-enter a burning building.' },
  ],
  earthquake: [
    { q: 'During an earthquake, the correct position is:', options: ['Stand in a doorframe', 'Drop, Cover, and Hold On under a sturdy table', 'Run outside immediately', 'Lie flat on the floor'], answer: 1, explanation: 'Drop, Cover, and Hold On is the proven safe response during shaking.' },
    { q: 'After an earthquake, you should check for gas leaks by:', options: ['Using a match or lighter', 'Smelling the air carefully', 'Both sight and smell — do not use open flame', 'Turning on the stove briefly'], answer: 2, explanation: 'Check by smell but NEVER use any open flame — even a light switch can ignite gas.' },
    { q: 'Aftershocks after a major earthquake are:', options: ['Impossible', 'Rare — only once', 'Common and can be nearly as strong', 'Only happen undersea'], answer: 2, explanation: 'Aftershocks are very common and may occur days or weeks after the main quake.' },
    { q: 'If you are trapped under rubble, the most effective way to signal is:', options: ['Scream continuously', 'Tap on pipes or walls rhythmically', 'Try to dig yourself out', 'Lie still and wait'], answer: 1, explanation: 'Tapping rhythmically on pipes or walls conserves energy and travels far.' },
    { q: 'The "Triangle of Life" theory (sheltering next to large objects) is:', options: ['Scientifically proven and recommended', 'Controversial — Drop-Cover-Hold On is safer', 'Only for buildings over 5 stories', 'Recommended by FEMA'], answer: 1, explanation: 'Drop, Cover, and Hold On under a table is safer and recommended by emergency experts.' },
  ],
};

// ═══════════════════════════════════════════════════ BLOCKCHAIN DATA
const BLOCKCHAIN_CHAIN = [];
function generateBlockHash(data, prevHash) {
  const str = JSON.stringify(data) + prevHash + Date.now();
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash).toString(16).padStart(64, '0').substring(0, 64);
}
function addBlock(action, data) {
  const prevHash = BLOCKCHAIN_CHAIN.length > 0 ? BLOCKCHAIN_CHAIN[BLOCKCHAIN_CHAIN.length - 1].hash : '0'.repeat(64);
  const blockData = { action, data, timestamp: new Date().toISOString() };
  const hash = generateBlockHash(blockData, prevHash);
  const block = { index: BLOCKCHAIN_CHAIN.length, hash, prevHash, data: blockData };
  BLOCKCHAIN_CHAIN.push(block);
  return block;
}

// ═══════════════════════════════════════════════════ INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
  runLoadingSequence();
});

function runLoadingSequence() {
  const steps = [
    { msg: 'Initializing secure connection...', pct: 15 },
    { msg: 'Loading GIS map services...', pct: 30 },
    { msg: 'Connecting to incident database...', pct: 50 },
    { msg: 'Authenticating JWT token...', pct: 65 },
    { msg: 'Starting AI assistant...', pct: 80 },
    { msg: 'Connecting to Socket.IO server...', pct: 92 },
    { msg: 'System ready. Loading command center...', pct: 100 },
  ];
  let i = 0;
  const bar = document.getElementById('loading-bar');
  const status = document.getElementById('loading-status');
  const interval = setInterval(() => {
    if (i < steps.length) {
      bar.style.width = steps[i].pct + '%';
      status.textContent = steps[i].msg;
      i++;
    } else {
      clearInterval(interval);
      setTimeout(showApp, 400);
    }
  }, 350);
}

function showApp() {
  const ls = document.getElementById('loading-screen');
  ls.classList.add('hide');
  setTimeout(() => {
    ls.style.display = 'none';
    document.getElementById('auth-modal').classList.remove('hidden');
    lucide.createIcons();
  }, 500);
}

// ═══════════════════════════════════════════════════ AUTH
let authStep = 'phone';
function selectRole(role) {
  AppState.auth.role = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-role="${role}"]`).classList.add('active');
  const avatarMap = { citizen: 'C', volunteer: 'V', admin: 'A', rescue: 'R', hospital: 'H', ngo: 'N' };
  document.getElementById('user-avatar').textContent = avatarMap[role] || 'U';
}

function handleAuth() {
  const btn = document.getElementById('auth-btn');
  if (authStep === 'phone') {
    authStep = 'otp';
    document.getElementById('otp-group').style.display = 'block';
    btn.textContent = 'Verify OTP';
    document.getElementById('auth-title').textContent = 'Enter OTP Code';
    document.querySelectorAll('.otp-box').forEach((box, i) => {
      if (i === 0) box.value = '1';
      else if (i === 1) box.value = '0';
      else if (i === 2) box.value = '7';
      else if (i === 3) box.value = '0';
      else box.value = String(Math.floor(Math.random() * 9) + 1);
    });
    setupOTPInputs();
  } else {
    launchApp();
  }
}

function setupOTPInputs() {
  const boxes = document.querySelectorAll('.otp-box');
  boxes.forEach((box, i) => {
    box.addEventListener('input', () => { if (box.value && i < boxes.length - 1) boxes[i + 1].focus(); });
    box.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus(); });
  });
}

function launchApp() {
  document.getElementById('auth-modal').classList.add('hidden');
  const app = document.getElementById('app');
  app.style.display = 'block';
  AppState.auth.isAuthenticated = true;
  const roleNames = { citizen: 'Citizen', volunteer: 'Volunteer', admin: 'Administrator', rescue: 'Rescue Team', hospital: 'Hospital', ngo: 'NGO Partner' };
  AppState.auth.user = { name: roleNames[AppState.auth.role] || 'User', role: AppState.auth.role };
  lucide.createIcons();
  initializeApp();
  // Apply RBAC after DOM is ready
  setTimeout(applyRoleUI, 50);
}

// ═══════════════════════════════════════════════════ APP INITIALIZATION
function initializeApp() {
  changeCity('delhi');
  startLiveClock();
  startRealtimeSimulation();
  startWeatherUpdate();
  populateNotifications();
  populateBlockchain();
  populateVolunteers();
  populateResources();
  populateShelters();
  populateHospitals();
  populateMissingPersons();
  populateFamilySafety();
  populateCommunityFeed();
  populateBroadcastHistory();
  populateIoTSensors();
  populateSettings();
  populateMarketplace();
  populateTraining();
  initCharts();
  showPanel('dashboard');
  showToast('success', 'Connected to ResQNet Command Network');
  showToast('info', 'Real-time incident feed is live');
  setTimeout(() => showToast('warning', '🌊 Flood alert: Yamuna at 208m'), 2000);
  addBlock('system_boot', { message: 'ResQNet platform initialized', operator: AppState.auth.role });
}

// ═══════════════════════════════════════════════════ CITY / SCENARIO SWITCH
function changeCity(city) {
  AppState.city = city;
  const scenario = SCENARIOS[city];
  if (!scenario) return;
  AppState.scenario = scenario;
  AppState.incidents.list = scenario.incidents || [];

  // Update ticker
  document.getElementById('ticker-content').textContent = scenario.ticker;
  // Update header stats
  animateCounter('hdr-incidents', scenario.incidents.length);
  animateCounter('hdr-critical', scenario.stats.critical);
  // Update stat cards
  animateCounter('stat-critical', scenario.stats.critical);
  animateCounter('stat-affected', scenario.stats.affected.toLocaleString());
  animateCounter('stat-volunteers', scenario.stats.volunteers);
  animateCounter('stat-resources', scenario.stats.resources);
  setState('ui.statShelter', scenario.stats.shelter);
  document.getElementById('stat-shelter').textContent = scenario.stats.shelter + '%';
  animateCounter('stat-saved', scenario.stats.saved.toLocaleString());
  // Update incident badge
  document.getElementById('nav-incidents-badge').textContent = scenario.incidents.length;

  renderIncidentsFeed();
  renderIncidentsGrid();
  renderTimeline();
  renderNearby();
  updateMaps();
  updateTicker(scenario);

  document.getElementById('city-select').value = city;
  showToast('info', `📍 Switched to ${scenario.name} — ${scenario.label}`);
}

function updateTicker(scenario) {
  const ticker = document.getElementById('ticker-content');
  ticker.textContent = scenario.ticker;
  // Restart animation
  ticker.style.animation = 'none';
  ticker.offsetHeight;
  ticker.style.animation = 'tickerScroll 25s linear infinite';
}

// ═══════════════════════════════════════════════════ PANEL NAVIGATION
function showPanel(panelId) {
  // ── RBAC gate ──────────────────────────────────────────────────
  if (!hasPermission(panelId)) {
    // Still switch panel visually so user sees the denied wall
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const panel = document.getElementById('panel-' + panelId);
    if (panel) panel.classList.add('active');
    AppState.ui.activePanel = panelId;
    showAccessDenied(panelId);
    if (window.innerWidth < 900) document.getElementById('sidebar').classList.remove('mobile-open');
    return;
  }
  // ── Normal flow ────────────────────────────────────────────────
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const panel = document.getElementById(`panel-${panelId}`);
  if (panel) panel.classList.add('active');
  const navBtn = document.getElementById(`nav-${panelId}`);
  if (navBtn) navBtn.classList.add('active');
  AppState.ui.activePanel = panelId;

  // Lazy init maps on first visit
  if (panelId === 'map' && !AppState.maps.main) initMainMap();
  if (panelId === 'predict' && !AppState.maps.predict) initPredictMap();
  if (panelId === 'satellite' && !AppState.maps.satellite) initSatelliteMap();
  if (panelId === 'analytics') renderAnalytics();
  if (panelId === 'predict') renderPredictions();
  if (panelId === 'iot') { startSensorUpdates(); if (!AppState.charts.sensor) initSensorChart(); }
  if (panelId === 'blockchain') renderBlockchain();
  if (panelId === 'satellite') renderDigitalTwin();

  // On mobile, close sidebar
  if (window.innerWidth < 900) {
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('main-content');
  if (window.innerWidth < 900) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('expanded');
  }
}

// ═══════════════════════════════════════════════════ MINI MAP INIT
function initMiniMap() {
  if (AppState.maps.mini) return;
  const scenario = AppState.scenario || SCENARIOS.delhi;
  const center = [28.6139, 77.2090]; // Default Delhi
  try {
    const map = L.map('mini-map', { zoomControl: false, attributionControl: false }).setView(center, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    AppState.maps.mini = map;
    setTimeout(() => { map.invalidateSize(); addMarkersToMap(map); }, 100);
  } catch (e) { console.warn('Mini map init error:', e); }
}

function initMainMap() {
  const scenario = AppState.scenario || SCENARIOS.delhi;
  const incident = (scenario.incidents || [])[0];
  const center = incident ? incident.location : [28.6139, 77.2090];
  try {
    const map = L.map('main-map', { zoomControl: true, attributionControl: true }).setView(center, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
    AppState.maps.main = map;
    setTimeout(() => { map.invalidateSize(); addMarkersToMap(map, true); }, 100);
  } catch (e) { console.warn('Main map init error:', e); }
}

function initPredictMap() {
  const scenario = AppState.scenario || SCENARIOS.delhi;
  const center = (scenario.incidents[0] || {}).location || [28.6139, 77.2090];
  try {
    const map = L.map('predict-map', { zoomControl: false, attributionControl: false }).setView(center, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    AppState.maps.predict = map;
    setTimeout(() => { map.invalidateSize(); addPredictionOverlay(map); }, 100);
  } catch (e) { console.warn('Predict map init error:', e); }
}

function initSatelliteMap() {
  const scenario = AppState.scenario || SCENARIOS.delhi;
  const center = (scenario.incidents[0] || {}).location || [28.6139, 77.2090];
  try {
    const map = L.map('satellite-map', { zoomControl: true, attributionControl: false }).setView(center, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    AppState.maps.satellite = map;
    setTimeout(() => { map.invalidateSize(); }, 100);
  } catch (e) { console.warn('Satellite map init error:', e); }
}

function addMarkersToMap(map, withPopup = false) {
  const scenario = AppState.scenario || SCENARIOS.delhi;
  // Clear existing markers
  map.eachLayer(layer => { if (layer instanceof L.Marker || layer instanceof L.Circle) map.removeLayer(layer); });
  (scenario.incidents || []).forEach(inc => {
    if (!inc.location) return;
    const colorMap = { critical: '#ff3b3b', high: '#ff8c00', medium: '#f5a623', low: '#00ff88' };
    const color = colorMap[inc.severity] || '#00d4ff';
    const marker = L.circleMarker(inc.location, {
      radius: inc.severity === 'critical' ? 14 : inc.severity === 'high' ? 11 : 8,
      fillColor: color, color: color, weight: 2, opacity: 0.9, fillOpacity: 0.5,
    }).addTo(map);
    if (withPopup) {
      marker.bindPopup(`<div style="font-family:Inter;min-width:200px;background:#071428;color:#e8f4fd;border-radius:8px;padding:10px;"><strong>${inc.icon} ${inc.title}</strong><br><small>${inc.address}</small><br><span style="color:${color};font-weight:700;text-transform:uppercase;font-size:11px;">${inc.severity}</span><br><small>Affected: ${inc.affected.toLocaleString()}</small></div>`);
    }
  });
  // Add shelter markers (purple)
  SHELTERS_DATA.slice(0, 3).forEach((sh, i) => {
    const shelterCoords = [[28.642, 77.231], [28.618, 77.249], [28.625, 77.208]];
    if (shelterCoords[i]) {
      L.circleMarker(shelterCoords[i], { radius: 9, fillColor: '#a855f7', color: '#a855f7', weight: 2, opacity: 0.9, fillOpacity: 0.6 }).addTo(map).bindPopup(`<div style="font-family:Inter;background:#071428;color:#e8f4fd;padding:8px;border-radius:6px;"><strong>🏠 ${sh.name}</strong><br>Beds: ${sh.beds_available || sh.capacity - sh.occupancy}</div>`);
    }
  });
}

function addPredictionOverlay(map) {
  const scenario = AppState.scenario || SCENARIOS.delhi;
  const inc = scenario.incidents[0];
  if (!inc) return;
  // Flood spread simulation
  [1.5, 3, 5].forEach((radius, i) => {
    const colors = ['rgba(255,59,59,0.3)', 'rgba(245,166,35,0.2)', 'rgba(0,212,255,0.1)'];
    L.circle(inc.location, { radius: radius * 1000, color: colors[i], fillColor: colors[i], fillOpacity: 0.4, weight: 1 }).addTo(map);
  });
  addMarkersToMap(map);
}

function updateMaps() {
  if (AppState.maps.mini) addMarkersToMap(AppState.maps.mini);
  if (AppState.maps.main) addMarkersToMap(AppState.maps.main, true);
}

// ═══════════════════════════════════════════════════ LAYER TOGGLES
function toggleLayer(layer) {
  AppState.layers[layer] = !AppState.layers[layer];
  const btn = document.getElementById(`layer-${layer}`);
  if (btn) btn.classList.toggle('active', AppState.layers[layer]);
  const map = AppState.maps.main;
  if (!map) return;
  if (layer === 'flood' && AppState.layers.flood) {
    const scenario = AppState.scenario || SCENARIOS.delhi;
    const inc = scenario.incidents[0];
    if (inc) L.circle(inc.location, { radius: 5000, color: '#00d4ff', fillColor: '#00d4ff', fillOpacity: 0.15, weight: 1 }).addTo(map);
    showToast('info', '🌊 Flood zone overlay enabled');
  }
  if (layer === 'safe' && AppState.layers.safe) {
    showToast('success', '✅ Safe routes highlighted');
  }
}

function filterMapDisaster(value) {
  showToast('info', `🗺 Filtering map: ${value === 'all' ? 'All disasters' : value}`);
}

// ═══════════════════════════════════════════════════ INCIDENTS RENDERING
function renderIncidentsFeed() {
  const feed = document.getElementById('incidents-feed');
  if (!feed) return;
  const incidents = AppState.incidents.list;
  feed.innerHTML = incidents.map(inc => `
    <div class="incident-item" onclick="showIncidentDetail('${inc.id}')">
      <div class="incident-icon">${inc.icon}</div>
      <div class="incident-info">
        <div class="incident-title">${inc.title}</div>
        <div class="incident-meta">
          <span>${inc.address}</span>
          <span>•</span><span>${inc.time}</span>
        </div>
      </div>
      <span class="severity-badge ${inc.severity}">${inc.severity.toUpperCase()}</span>
    </div>
  `).join('');
}

function renderIncidentsGrid() {
  const grid = document.getElementById('incidents-grid');
  if (!grid) return;
  const sevFilter = document.getElementById('sev-filter')?.value || 'all';
  const search = document.getElementById('incident-search')?.value?.toLowerCase() || '';
  let incidents = AppState.incidents.list;
  if (sevFilter !== 'all') incidents = incidents.filter(i => i.severity === sevFilter);
  if (search) incidents = incidents.filter(i => i.title.toLowerCase().includes(search) || i.address.toLowerCase().includes(search));
  grid.innerHTML = incidents.map(inc => `
    <div class="incident-card ${inc.severity}" onclick="showIncidentDetail('${inc.id}')">
      <div class="incident-card-header">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span style="font-size:1.4rem">${inc.icon}</span>
          <span class="severity-badge ${inc.severity}">${inc.severity}</span>
        </div>
        <span style="font-size:0.72rem;color:var(--text-muted)">${inc.time}</span>
      </div>
      <div class="incident-title" style="font-size:0.95rem;font-weight:700;margin-bottom:0.4rem;">${inc.title}</div>
      <div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.75rem;">📍 ${inc.address}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;">
        <span>👥 ${inc.affected.toLocaleString()} affected</span>
        <span style="color:${inc.status==='responding'?'var(--green)':'var(--amber)'}">● ${inc.status}</span>
      </div>
      <div style="margin-top:0.75rem;display:flex;gap:0.5rem;">
        <button class="btn-sm" onclick="event.stopPropagation();dispatchVolunteer('${inc.id}')"><i data-lucide="heart-handshake"></i> Dispatch</button>
        <button class="btn-sm" onclick="event.stopPropagation();showOnMap('${inc.id}')"><i data-lucide="map-pin"></i> Map</button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

function showIncidentDetail(id) {
  const inc = AppState.incidents.list.find(i => i.id === id);
  if (!inc) return;
  const panel = document.getElementById('map-info-panel');
  const content = document.getElementById('map-info-content');
  if (panel && content) {
    content.innerHTML = `
      <div style="font-weight:700;font-size:1rem;margin-bottom:0.5rem;">${inc.icon} ${inc.title}</div>
      <div class="severity-badge ${inc.severity}" style="margin-bottom:0.75rem;display:inline-block">${inc.severity.toUpperCase()}</div>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.75rem;">
        📍 ${inc.address}<br>⏰ ${inc.time}<br>👥 ${inc.affected.toLocaleString()} people affected
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button class="btn-sm btn-primary" onclick="dispatchVolunteer('${inc.id}')">Dispatch Team</button>
        <button class="btn-sm" onclick="closeModal('map-info-panel')">Close</button>
      </div>
    `;
    panel.classList.remove('hidden');
    lucide.createIcons();
  }
}

function renderTimeline() {
  const wrap = document.getElementById('timeline-wrap');
  if (!wrap) return;
  const incidents = [...(AppState.incidents.list || [])];
  const sorted = incidents.sort((a, b) => a.time.localeCompare(b.time));
  wrap.innerHTML = `<div class="timeline">${sorted.map(inc => `
    <div class="timeline-point" onclick="showIncidentDetail('${inc.id}')">
      <div class="timeline-dot ${inc.severity}"></div>
      <div class="timeline-label">${inc.icon} ${inc.type}</div>
      <div class="timeline-time">${inc.time}</div>
    </div>
  `).join('')}</div>`;
}

function renderNearby() {
  const list = document.getElementById('nearby-list');
  if (!list) return;
  const incidents = (AppState.incidents.list || []).slice(0, 6);
  list.innerHTML = incidents.map((inc, i) => `
    <div class="nearby-item" onclick="showIncidentDetail('${inc.id}')">
      <span>${inc.icon}</span>
      <div>
        <div style="font-size:0.82rem;font-weight:600">${inc.title.substring(0, 35)}...</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">${inc.severity}</div>
      </div>
      <span class="nearby-dist">${(0.3 + i * 0.8).toFixed(1)}km</span>
    </div>
  `).join('');
}

function searchIncidents(value) {
  AppState.incidents.filters.search = value;
  renderIncidentsGrid();
}

function filterIncidents(value) {
  AppState.incidents.filters.severity = value;
  renderIncidentsGrid();
}

function dispatchVolunteer(incId) {
  if (!isFullAccess()) {
    showToast('error', '🔒 Dispatch requires Rescue or Admin credentials');
    return;
  }
  addBlock('rescue_dispatched', { incident: incId, team: 'Alpha-7', timestamp: new Date().toISOString() });
  showToast('success', `🚑 Rescue team dispatched to incident ${incId}`);
}

function showOnMap(incId) {
  showPanel('map');
  showToast('info', `📍 Incident ${incId} highlighted on map`);
}

// ═══════════════════════════════════════════════════ VOLUNTEERS
function populateVolunteers() {
  AppState.volunteers.list = VOLUNTEERS_DATA;
  AppState.volunteers.tasks = TASKS_DATA;
  renderVolunteers();
  renderTasks();
  renderLeaderboard();
  const active = VOLUNTEERS_DATA.filter(v => v.status === 'active').length;
  animateCounter('vol-total', VOLUNTEERS_DATA.length);
  animateCounter('vol-active', active);
  animateCounter('vol-nearby', 12);
  animateCounter('vol-hours', VOLUNTEERS_DATA.reduce((s, v) => s + v.hours, 0));
}

function renderVolunteers(filter = '') {
  const list = document.getElementById('volunteer-list');
  if (!list) return;
  let vols = AppState.volunteers.list;
  if (filter) vols = vols.filter(v => v.name.toLowerCase().includes(filter.toLowerCase()) || v.skills.some(s => s.toLowerCase().includes(filter.toLowerCase())));
  list.innerHTML = vols.map(v => `
    <div class="vol-card">
      <div class="vol-avatar" style="background:${v.color}22;color:${v.color};border:2px solid ${v.color}44">${v.avatar}</div>
      <div class="vol-info">
        <div class="vol-name">${v.name}</div>
        <div class="vol-skills">${v.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>
        <div class="vol-xp">⭐ ${v.xp.toLocaleString()} XP • ${v.hours}h served</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.3rem;">
        <span class="vol-status ${v.status}">● ${v.status}</span>
        <div style="display:flex;gap:0.3rem;">${v.badges.map(b => `<span class="badge-icon">${b}</span>`).join('')}</div>
        <button class="btn-sm" onclick="assignVolunteer('${v.id}')">Assign</button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

function renderTasks() {
  const board = document.getElementById('task-board');
  if (!board) return;
  const priorityColors = { critical: 'var(--red)', high: 'var(--orange)', medium: 'var(--amber)', low: 'var(--green)' };
  board.innerHTML = AppState.volunteers.tasks.map(t => `
    <div class="task-item" style="border-left:3px solid ${priorityColors[t.priority]}">
      <div class="task-title">${t.title}</div>
      <div class="task-meta">👤 ${t.volunteer} • ⏱ ${t.time} • 
        <span style="color:${t.status==='in_progress'?'var(--green)':'var(--amber)'}">${t.status.replace('_',' ')}</span>
      </div>
    </div>
  `).join('');
}

function renderLeaderboard() {
  const lb = document.getElementById('leaderboard');
  if (!lb) return;
  const sorted = [...AppState.volunteers.list].sort((a, b) => b.xp - a.xp);
  const rankClasses = ['gold', 'silver', 'bronze'];
  lb.innerHTML = sorted.map((v, i) => `
    <div class="lb-item">
      <div class="lb-rank ${rankClasses[i] || 'other'}">${i + 1}</div>
      <div class="vol-avatar" style="background:${v.color}22;color:${v.color}">${v.avatar}</div>
      <div class="lb-info">
        <div class="lb-name">${v.name}</div>
        <div class="lb-sub">${v.skills.join(', ')} • ${v.hours}h served</div>
      </div>
      <div class="lb-badges">${v.badges.map(b => `<span>${b}</span>`).join('')}</div>
      <div class="lb-xp">${v.xp.toLocaleString()} XP</div>
    </div>
  `).join('');
}

function searchVolunteers(val) { renderVolunteers(val); }
function assignVolunteer(id) {
  if (!isFullAccess()) {
    showToast('error', '🔒 Assignment requires Rescue or Admin credentials');
    return;
  }
  const v = VOLUNTEERS_DATA.find(x => x.id === id);
  if (v) { showToast('success', `✅ ${v.name} assigned to task`); addBlock('volunteer_assigned', { volunteer: v.name, incidentId: AppState.incidents.list[0]?.id }); }
}
function openVolunteerModal() { showToast('info', '📋 Volunteer registration form — Coming Soon'); }
function addTask() { showToast('info', '📝 Task creation panel — Coming Soon'); }

// ═══════════════════════════════════════════════════ RESOURCES
function populateResources() {
  AppState.resources.items = RESOURCES_DATA;
  renderResources();
  renderFleet();
}

function renderResources() {
  const grid = document.getElementById('resource-grid');
  if (!grid) return;
  grid.innerHTML = RESOURCES_DATA.map(r => {
    const pct = Math.round((r.count / r.total) * 100);
    const barClass = pct < 30 ? 'critical' : pct < 60 ? 'low' : 'ok';
    return `
      <div class="resource-card">
        <div class="resource-icon">${r.icon}</div>
        <div class="resource-name">${r.type}</div>
        <div class="resource-count">${r.count.toLocaleString()}</div>
        <div class="resource-bar-wrap"><div class="resource-bar ${barClass}" style="width:${pct}%"></div></div>
        <div class="resource-status">${r.count} / ${r.total} ${r.unit} • ${pct}% available</div>
        ${pct < 30 ? '<div style="color:var(--red);font-size:0.72rem;font-weight:700;margin-top:0.3rem;">⚠ CRITICAL LOW</div>' : ''}
      </div>
    `;
  }).join('');
}

function renderFleet() {
  const list = document.getElementById('fleet-list');
  if (!list) return;
  const ambulances = [
    { id: 'AMB-01', driver: 'Ramesh Kumar', status: 'available', location: 'AIIMS, Delhi', eta: 'Ready' },
    { id: 'AMB-02', driver: 'Suresh Patel', status: 'dispatched', location: 'En route — Mayur Vihar', eta: '4 min' },
    { id: 'AMB-03', driver: 'Mahesh Singh', status: 'dispatched', location: 'En route — Laxmi Nagar', eta: '7 min' },
    { id: 'AMB-04', driver: 'Dinesh Verma', status: 'available', location: 'Safdarjung Hospital', eta: 'Ready' },
    { id: 'AMB-05', driver: 'Ganesh Rao', status: 'offline', location: 'Maintenance', eta: 'N/A' },
  ];
  list.innerHTML = ambulances.map(a => `
    <div class="fleet-item">
      <div class="fleet-status-dot ${a.status}"></div>
      <span style="font-family:'JetBrains Mono',monospace;font-size:0.8rem;font-weight:700">${a.id}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.82rem">${a.driver}</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">${a.location}</div>
      </div>
      <span style="font-size:0.72rem;color:var(--cyan)">${a.eta}</span>
    </div>
  `).join('');
  // Also fill ambulance list in healthcare
  const ambList = document.getElementById('ambulance-list');
  if (ambList) ambList.innerHTML = list.innerHTML;
}

function submitResourceRequest() {
  showToast('success', '📦 Resource request submitted and routed to nearest depot');
  addBlock('resource_requested', { type: 'ambulance', quantity: 2, location: 'Mayur Vihar' });
}

// ═══════════════════════════════════════════════════ SHELTERS
function populateShelters() {
  AppState.shelters.list = SHELTERS_DATA;
  renderShelters();
}

function renderShelters() {
  const grid = document.getElementById('shelter-grid');
  if (!grid) return;
  grid.innerHTML = SHELTERS_DATA.map(s => {
    const foodPct = s.food; const waterPct = s.water; const bedsPct = Math.round(((s.capacity - s.occupancy) / s.capacity) * 100);
    const occupancyPct = Math.round((s.occupancy / s.capacity) * 100);
    return `
      <div class="shelter-card" style="border-color:${s.status === 'full' ? 'rgba(255,59,59,0.4)' : 'var(--border)'}">
        <div class="shelter-name">${s.name} ${s.status === 'full' ? '🔴' : '🟢'}</div>
        <div class="shelter-capacity">${s.occupancy.toLocaleString()} / ${s.capacity.toLocaleString()} people (${occupancyPct}% full)</div>
        <div class="shelter-metrics">
          <div class="shelter-metric"><span>🍱 Food</span><div class="sm-bar-wrap"><div class="sm-bar food" style="width:${foodPct}%"></div></div><span>${foodPct}%</span></div>
          <div class="shelter-metric"><span>💧 Water</span><div class="sm-bar-wrap"><div class="sm-bar water" style="width:${waterPct}%"></div></div><span>${waterPct}%</span></div>
          <div class="shelter-metric"><span>🛏 Beds</span><div class="sm-bar-wrap"><div class="sm-bar beds" style="width:${bedsPct}%"></div></div><span>${s.capacity - s.occupancy} free</span></div>
        </div>
        <div class="shelter-tags">
          ${s.medical ? '<span class="shelter-tag">🏥 Medical</span>' : ''}
          ${s.women ? '<span class="shelter-tag">👩 Women Safe</span>' : ''}
          <span class="shelter-tag">📍 ${s.dist}</span>
        </div>
        <button class="btn-sm" style="margin-top:0.75rem;width:100%;" onclick="showToast('success','Directions to ${s.name} sent to your device')">Get Directions</button>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════ HEALTHCARE
function populateHospitals() {
  const grid = document.getElementById('hospital-grid');
  if (!grid) return;
  grid.innerHTML = HOSPITALS_DATA.map(h => {
    const statusColors = { critical: 'var(--red)', high: 'var(--orange)', moderate: 'var(--green)' };
    const c = statusColors[h.status] || 'var(--cyan)';
    return `
      <div class="hospital-card" style="border-left:3px solid ${c}">
        <div class="hospital-name">🏥 ${h.name} <span style="font-size:0.72rem;font-weight:700;color:${c}">${h.status.toUpperCase()}</span></div>
        <div class="hospital-metric"><span>🛏 ICU</span><div class="hm-bar-wrap"><div class="hm-bar" style="width:${h.icu}%;background:${h.icu>80?'var(--red)':'var(--green)'}"></div></div><span>${h.icu}% full</span></div>
        <div class="hospital-metric"><span>🏨 Beds</span><div class="hm-bar-wrap"><div class="hm-bar" style="width:${h.beds}%;background:${h.beds>80?'var(--red)':'var(--green)'}"></div></div><span>${h.beds}% full</span></div>
        <div class="hospital-metric"><span>🫁 O₂</span><div class="hm-bar-wrap"><div class="hm-bar" style="width:${h.oxygen}%;background:${h.oxygen<40?'var(--red)':'var(--cyan)'}"></div></div><span>${h.oxygen}%</span></div>
        <div class="hospital-metric"><span>🩸 Blood</span><div class="hm-bar-wrap"><div class="hm-bar" style="width:${h.blood}%;background:var(--red)"></div></div><span>${h.blood}%</span></div>
        <div style="margin-top:0.75rem;display:flex;gap:0.5rem;">
          <button class="btn-sm" onclick="showToast('info','Routing ambulance to ${h.name}')">Route Ambulance</button>
          <button class="btn-sm" onclick="showToast('info','Blood bank status fetched')">Blood Status</button>
        </div>
      </div>
    `;
  }).join('');
  populateBloodBank();
  initICUChart();
}

function populateBloodBank() {
  const grid = document.getElementById('blood-grid');
  if (!grid) return;
  const types = [
    { type: 'A+', pct: 68 }, { type: 'A-', pct: 22 }, { type: 'B+', pct: 55 }, { type: 'B-', pct: 15 },
    { type: 'O+', pct: 43 }, { type: 'O-', pct: 8 }, { type: 'AB+', pct: 71 }, { type: 'AB-', pct: 31 },
  ];
  grid.innerHTML = types.map(t => `
    <div class="blood-card">
      <div class="blood-type">${t.type}</div>
      <div class="blood-level">${t.pct}%</div>
      <div class="blood-bar-wrap"><div class="blood-bar" style="width:${t.pct}%;background:${t.pct<25?'var(--red)':t.pct<50?'var(--amber)':'var(--green)'}"></div></div>
      ${t.pct < 25 ? '<div style="font-size:0.6rem;color:var(--red);margin-top:2px">⚠ LOW</div>' : ''}
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════ MISSING PERSONS
function populateMissingPersons() {
  const stats = document.getElementById('missing-stats');
  if (stats) {
    const searching = MISSING_DATA.filter(m => m.status === 'searching').length;
    const found = MISSING_DATA.filter(m => m.status === 'found').length;
    stats.innerHTML = `
      <div class="missing-stat"><div class="missing-stat-val" style="color:var(--amber)">${searching}</div><div class="missing-stat-label">Searching</div></div>
      <div class="missing-stat"><div class="missing-stat-val" style="color:var(--green)">${found}</div><div class="missing-stat-label">Found</div></div>
      <div class="missing-stat"><div class="missing-stat-val" style="color:var(--text-primary)">${MISSING_DATA.length}</div><div class="missing-stat-label">Total Reports</div></div>
      <div class="missing-stat"><div class="missing-stat-val" style="color:var(--cyan)">AI</div><div class="missing-stat-label">Face Matching Active</div></div>
    `;
  }
  const grid = document.getElementById('missing-grid');
  if (!grid) return;
  grid.innerHTML = MISSING_DATA.map(m => `
    <div class="missing-card">
      <div class="missing-photo">${m.emoji}</div>
      <div class="missing-name">${m.name}</div>
      <div class="missing-info">Last seen: ${m.lastSeen}<br>Reported: ${m.time}</div>
      <div class="missing-status ${m.status}">${m.status === 'found' ? '✅ FOUND' : '🔍 SEARCHING'}</div>
      ${m.status === 'searching' ? '<button class="btn-sm" style="margin-top:0.5rem" onclick="showToast(\'info\',\'AI face match scanning...\')">AI Match Scan</button>' : ''}
    </div>
  `).join('');
}

function previewMissingPhoto(input) {
  const preview = document.getElementById('missing-photo-preview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => { if (preview) preview.innerHTML = `<img src="${e.target.result}" style="width:100%;border-radius:8px;margin-top:0.5rem;" />`; };
    reader.readAsDataURL(input.files[0]);
  }
}

function submitMissingReport() {
  closeModal('missing-modal');
  showToast('success', '🔍 Missing person report filed — AI face matching initiated');
  addBlock('missing_person_reported', { name: 'Unknown', reportTime: new Date().toISOString() });
}

// ═══════════════════════════════════════════════════ FAMILY SAFETY
function populateFamilySafety() {
  const members = document.getElementById('family-members');
  if (!members) return;
  members.innerHTML = FAMILY_DATA.map(f => `
    <div class="family-card">
      <div class="family-avatar">${f.emoji}</div>
      <div class="family-info">
        <div class="family-name">${f.name}</div>
        <div class="family-sub">${f.relation} • ${f.location} • Last check: ${f.lastCheck}</div>
      </div>
      <span class="family-status ${f.status}">${f.status === 'safe' ? '✅ Safe' : f.status === 'danger' ? '🚨 Needs Help' : '❓ Unknown'}</span>
      ${f.status !== 'safe' ? `<button class="btn-sm btn-danger" onclick="showToast('warning','SOS sent for ${f.name}')">SOS</button>` : ''}
    </div>
  `).join('');
  lucide.createIcons();
}

function markSafe() {
  const ring = document.getElementById('safety-status-ring');
  const text = document.getElementById('safety-status-text');
  const sub = document.getElementById('safety-status-sub');
  ring.className = 'safety-status-ring safe';
  ring.querySelector('.safety-status-icon').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>';
  text.textContent = "I'm Safe ✅";
  sub.textContent = `Status updated: ${new Date().toLocaleTimeString()}`;
  showToast('success', '✅ Safety status broadcast to your family network');
  addBlock('safety_checkin', { status: 'safe', user: AppState.auth.user?.name, timestamp: new Date().toISOString() });
}

function markUnsafe() {
  const ring = document.getElementById('safety-status-ring');
  ring.className = 'safety-status-ring unsafe';
  document.getElementById('safety-status-text').textContent = '🚨 Need Help';
  document.getElementById('safety-status-sub').textContent = `Emergency alert sent: ${new Date().toLocaleTimeString()}`;
  triggerSOS();
}

// ═══════════════════════════════════════════════════ COMMUNITY
function populateCommunityFeed() {
  const feed = document.getElementById('community-feed');
  if (!feed) return;
  const posts = [
    { author: 'Ravi K.', avatar: 'R', color: '#00d4ff', time: '5 min ago', content: '🌊 Water level rising fast near Yamuna Khadar — bridge at risk. 3 families need rescue. Please send boat ASAP!', type: 'flood', votes: 47, replies: 12 },
    { author: 'Sunita M.', avatar: 'S', color: '#00ff88', time: '12 min ago', content: '📍 Ramlila Maidan shelter has space but running low on food. Need 500 more food packets urgently.', type: 'resource', votes: 89, replies: 34 },
    { author: 'Delhi Rescue NGO', avatar: 'D', color: '#a855f7', time: '25 min ago', content: '✅ We have 2 rescue boats at ITO. Currently helping 40 people cross to safety. Will return for more.', type: 'update', votes: 234, replies: 56 },
    { author: 'Anil T.', avatar: 'A', color: '#f5a623', time: '45 min ago', content: '⚠️ WARNING: Avoid the Noida route — NH-24 is flooded near Akshardham. Take Ring Road instead.', type: 'warning', votes: 312, replies: 78 },
  ];
  feed.innerHTML = posts.map(p => `
    <div class="community-post">
      <div class="post-header">
        <div class="post-author">
          <div class="post-avatar" style="background:${p.color}22;color:${p.color}">${p.avatar}</div>
          <div><div class="post-name">${p.author}</div><div class="post-time">${p.time}</div></div>
        </div>
        <span class="severity-badge ${p.type === 'flood'||p.type==='warning' ? 'high' : p.type==='update'?'low':'medium'}">${p.type}</span>
      </div>
      <div class="post-content">${p.content}</div>
      <div class="post-actions">
        <button class="post-action" onclick="this.innerHTML='▲ '+(${p.votes}+1)"><span>▲ ${p.votes}</span></button>
        <button class="post-action"><span>💬 ${p.replies} replies</span></button>
        <button class="post-action" onclick="showToast('success','Report forwarded to command center')"><span>🚨 Report</span></button>
        <button class="post-action" onclick="showToast('info','Verified and shared to broadcast')"><span>✅ Verify</span></button>
      </div>
    </div>
  `).join('');
}

function checkFakeNews() {
  const input = document.getElementById('fakenews-input')?.value?.trim();
  const result = document.getElementById('fakenews-result');
  if (!input || !result) return;
  showToast('info', '🤖 AI analyzing report...');
  setTimeout(() => {
    const keywords = { fake: ['forward this', 'share immediately', '100%', 'guaranteed'], real: ['yamuna', 'rescue', 'shelter', 'flood', 'fire', 'hospital'] };
    const lower = input.toLowerCase();
    const fakeScore = keywords.fake.filter(k => lower.includes(k)).length;
    const realScore = keywords.real.filter(k => lower.includes(k)).length;
    result.className = 'fakenews-result hidden';
    setTimeout(() => {
      if (fakeScore > realScore) {
        result.className = 'fakenews-result fake';
        result.innerHTML = '❌ <strong>LIKELY MISINFORMATION</strong><br>This report matches patterns of viral misinformation. Sentiment analysis detected emotional manipulation language. Do not forward without verification.';
      } else if (realScore > 0) {
        result.className = 'fakenews-result real';
        result.innerHTML = '✅ <strong>LIKELY AUTHENTIC</strong><br>Report matches verified incident patterns. Cross-referenced with 3 official sources. Confidence: 87%.';
      } else {
        result.className = 'fakenews-result warning';
        result.innerHTML = '⚠️ <strong>UNCERTAIN — NEEDS REVIEW</strong><br>Cannot verify authenticity automatically. Forwarded to human moderator for review.';
      }
      result.classList.remove('hidden');
    }, 100);
  }, 1500);
}

function verifyImage(input) {
  const result = document.getElementById('img-result');
  if (!input.files[0] || !result) return;
  showToast('info', '🤖 AI analyzing image authenticity...');
  setTimeout(() => {
    const outcomes = [
      { cls: 'real', msg: '✅ <strong>AUTHENTIC IMAGE</strong><br>No metadata tampering detected. EXIF data matches reported location. AI confidence: 91%.' },
      { cls: 'fake', msg: '❌ <strong>MANIPULATED IMAGE</strong><br>Error Level Analysis detected tampering in 3 regions. EXIF data inconsistent. Do not use for emergency coordination.' },
      { cls: 'warning', msg: '⚠️ <strong>NEEDS MANUAL REVIEW</strong><br>Image metadata is incomplete. Cannot fully verify authenticity. Forwarded to verification team.' },
    ];
    const chosen = outcomes[Math.floor(Math.random() * outcomes.length)];
    result.className = `fakenews-result ${chosen.cls}`;
    result.innerHTML = chosen.msg;
    result.classList.remove('hidden');
  }, 2000);
}

function submitIncidentReport() {
  closeModal('report-modal');
  showToast('success', '📡 Incident reported — AI priority scoring in progress...');
  const scenario = AppState.scenario || SCENARIOS.delhi;
  const newInc = {
    id: 'INC' + Date.now(), type: 'flood', icon: '📍',
    title: 'Community Report — Awaiting Verification',
    severity: AppState.selectedSeverity, location: (scenario.incidents[0] || {}).location || [28.6, 77.2],
    address: document.getElementById('report-location')?.value || 'Location pending GPS',
    affected: 0, time: 'Just now', status: 'active',
  };
  AppState.incidents.list.unshift(newInc);
  renderIncidentsFeed();
  renderIncidentsGrid();
  document.getElementById('nav-incidents-badge').textContent = AppState.incidents.list.length;
  addBlock('incident_reported', { id: newInc.id, severity: newInc.severity, reporter: AppState.auth.user?.name });
}

function selectSeverity(sev) {
  AppState.selectedSeverity = sev;
  document.querySelectorAll('.severity-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-sev="${sev}"]`)?.classList.add('active');
}

// ═══════════════════════════════════════════════════ AI CHAT
function sendMessage() {
  const input = document.getElementById('chat-input');
  if (!input?.value.trim()) return;
  const msg = input.value.trim();
  input.value = '';
  appendChatMessage('user', msg);
  document.getElementById('quick-replies')?.remove();
  showTypingIndicator();
  const delay = 800 + Math.random() * 800;
  setTimeout(() => {
    removeTypingIndicator();
    const response = getAIResponse(msg);
    appendChatMessage('bot', response);
  }, delay);
}

function sendQuickReply(msg) {
  document.getElementById('chat-input').value = msg;
  sendMessage();
}

function appendChatMessage(role, content) {
  const area = document.getElementById('chat-area');
  const lang = AppState.chat.lang;
  const escapeHTML = (str) => String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
  const formattedContent = escapeHTML(content).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  const msg = document.createElement('div');
  msg.className = `chat-message ${role}`;
  if (role === 'user') {
    const avatarLetter = AppState.auth.role?.[0]?.toUpperCase() || 'U';
    msg.innerHTML = `<div class="chat-avatar">${avatarLetter}</div><div class="chat-bubble">${formattedContent}</div>`;
  } else {
    msg.innerHTML = `<div class="chat-avatar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg></div><div class="chat-bubble">${formattedContent}</div>`;
  }
  area.appendChild(msg);
  area.scrollTop = area.scrollHeight;
}

function showTypingIndicator() {
  const area = document.getElementById('chat-area');
  const typing = document.createElement('div');
  typing.className = 'chat-message bot';
  typing.id = 'typing-indicator';
  typing.innerHTML = `<div class="chat-avatar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg></div><div class="chat-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  area.appendChild(typing);
  area.scrollTop = area.scrollHeight;
}

function removeTypingIndicator() {
  document.getElementById('typing-indicator')?.remove();
}

function getAIResponse(msg) {
  const lang = AppState.chat.lang;
  const responses = AI_RESPONSES[lang] || AI_RESPONSES.en;
  const lower = msg.toLowerCase();
  if (lower.includes('flood') || lower.includes('water') || lower.includes('बाढ़')) return responses.flood || responses.default;
  if (lower.includes('fire') || lower.includes('burn') || lower.includes('आग')) return responses.fire || responses.default;
  if (lower.includes('earthquake') || lower.includes('quake') || lower.includes('भूकंप')) return responses.earthquake || responses.default;
  if (lower.includes('shelter') || lower.includes('camp') || lower.includes('शेल्टर')) return responses.shelter || responses.default;
  if (lower.includes('panic') || lower.includes('scared') || lower.includes('calm') || lower.includes('breathe')) return responses.panic || responses.default;
  if (lower.includes('evacuat') || lower.includes('route') || lower.includes('escape')) return responses.evacuation || responses.default;
  if (lower.includes('first aid') || lower.includes('injury') || lower.includes('cpr') || lower.includes('bleed')) return responses.firstaid || responses.default;
  return responses.default;
}

function clearChat() {
  const area = document.getElementById('chat-area');
  AppState.chat.messages = [];
  area.innerHTML = '';
  showToast('info', '🗑 Chat history cleared');
}

function changeAILang(lang) {
  AppState.chat.lang = lang;
  const langNames = { en: 'English', hi: 'Hindi', ta: 'Tamil', bn: 'Bengali', pa: 'Punjabi', mr: 'Marathi' };
  showToast('info', `🌐 AI language set to ${langNames[lang]}`);
  appendChatMessage('bot', `Language switched to **${langNames[lang]}**. All responses will now be in ${langNames[lang]}.`);
}

function toggleVoiceInput() {
  const btn = document.getElementById('voice-input-btn');
  btn?.classList.toggle('active');
  showToast('info', '🎤 Voice input ' + (btn?.classList.contains('active') ? 'activated' : 'deactivated'));
}

// ═══════════════════════════════════════════════════ SOS SYSTEM
let sosHoldTimer = null;
let sosProgress = 0;
let sosAnimFrame = null;

function startSOSHold() {
  const btn = document.getElementById('sos-btn');
  const ring = document.getElementById('sos-ring-fill');
  if (!btn || !ring) return;
  btn.classList.add('active');
  document.querySelector('.sos-progress-ring').style.display = 'block';
  sosProgress = 0;
  const circumference = 163;
  const startTime = Date.now();
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / 3000, 1);
    ring.style.strokeDashoffset = circumference - (circumference * progress);
    if (progress < 1) {
      sosAnimFrame = requestAnimationFrame(animate);
    } else {
      triggerSOS();
    }
  }
  sosAnimFrame = requestAnimationFrame(animate);
}

function cancelSOSHold() {
  const btn = document.getElementById('sos-btn');
  const ring = document.getElementById('sos-ring-fill');
  if (sosAnimFrame) cancelAnimationFrame(sosAnimFrame);
  if (btn) btn.classList.remove('active');
  if (ring) ring.style.strokeDashoffset = 163;
  document.querySelector('.sos-progress-ring').style.display = 'none';
}

function triggerSOS() {
  cancelSOSHold();
  const modal = document.getElementById('sos-modal');
  if (modal) modal.classList.remove('hidden');
  document.getElementById('sos-time').textContent = new Date().toLocaleTimeString();
  document.getElementById('sos-user').textContent = AppState.auth.user?.name || 'User';
  document.getElementById('sos-location').textContent = 'Acquiring GPS...';
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      document.getElementById('sos-location').textContent = `${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E`;
    }, () => {
      document.getElementById('sos-location').textContent = '28.6139°N, 77.2090°E (Estimated)';
    });
  } else {
    document.getElementById('sos-location').textContent = '28.6139°N, 77.2090°E (Estimated)';
  }
  addBlock('sos_triggered', { user: AppState.auth.user?.name, role: AppState.auth.role, time: new Date().toISOString() });
  showToast('error', '🚨 SOS TRIGGERED — Emergency services notified!');
}

function triggerVoiceSOS() {
  showToast('warning', '🎤 Voice SOS activated — Listening for distress call...');
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance('SOS Alert sent. Help is on the way. Stay calm.');
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

function triggerSilentSOS() {
  closeModal('sos-modal');
  showToast('warning', '🤫 Silent SOS mode — Authorities alerted without sound');
}

// Shake detection
let lastX = 0, lastY = 0, lastZ = 0, shakeCount = 0;
window.addEventListener('devicemotion', (e) => {
  const acc = e.accelerationIncludingGravity;
  if (!acc) return;
  const dx = Math.abs(acc.x - lastX), dy = Math.abs(acc.y - lastY), dz = Math.abs(acc.z - lastZ);
  if (dx + dy + dz > 30) { shakeCount++; if (shakeCount >= 3) { shakeCount = 0; triggerSOS(); } }
  lastX = acc.x; lastY = acc.y; lastZ = acc.z;
});

// ═══════════════════════════════════════════════════ BROADCAST
function selectAlertType(type) {
  AppState.selectedAlertType = type;
  document.querySelectorAll('.alert-type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-type="${type}"]`)?.classList.add('active');
}

function sendBroadcast() {
  if (!isFullAccess()) {
    showToast('error', '🔒 Broadcasting requires Rescue or Admin credentials');
    return;
  }
  const msg = document.getElementById('broadcast-msg')?.value?.trim();
  if (!msg) { showToast('error', 'Please enter a message'); return; }
  const item = { type: AppState.selectedAlertType, message: msg.substring(0, 80) + (msg.length > 80 ? '...' : ''), time: new Date().toLocaleTimeString(), recipients: Math.floor(Math.random() * 50000) + 10000 };
  AppState.broadcastHistory.unshift(item);
  renderBroadcastHistory();
  document.getElementById('broadcast-msg').value = '';
  showToast('success', `📡 Broadcast sent to ${item.recipients.toLocaleString()} recipients`);
  addBlock('broadcast_sent', { type: item.type, message: item.message, recipients: item.recipients });
}

function renderBroadcastHistory() {
  const hist = document.getElementById('broadcast-history');
  if (!hist) return;
  const typeEmoji = { general: '📢', evacuation: '🚗', sos: '🚨', allclear: '✅' };
  hist.innerHTML = AppState.broadcastHistory.map(b => `
    <div class="broadcast-item">
      <div class="bi-header"><span>${typeEmoji[b.type] || '📢'} ${b.type.toUpperCase()}</span><span class="bi-time">${b.time}</span></div>
      <div>${b.message}</div>
      <div style="margin-top:0.3rem;font-size:0.72rem;color:var(--text-muted)">📬 ${b.recipients.toLocaleString()} recipients</div>
    </div>
  `).join('') || '<div style="color:var(--text-muted);font-size:0.82rem;text-align:center;padding:1rem">No broadcasts yet</div>';
}

function populateBroadcastHistory() {
  AppState.broadcastHistory = [
    { type: 'sos', message: 'CRITICAL FLOOD ALERT: Evacuate Mayur Vihar immediately', time: '2:34 PM', recipients: 84200 },
    { type: 'evacuation', message: 'Route NH-24 via Ring Road — Yamuna bridge closing in 30 min', time: '1:15 PM', recipients: 42000 },
    { type: 'general', message: 'Ramlila Maidan shelter now open — 1380 beds available', time: '11:30 AM', recipients: 31500 },
  ];
  renderBroadcastHistory();
  // Offline mesh
  const mesh = document.getElementById('offline-mesh');
  if (mesh) {
    const nodes = [
      { id: 'Node-Delhi-01', type: 'Bluetooth Mesh', signal: 85, status: 'Active' },
      { id: 'Node-Delhi-02', type: 'LoRa Gateway', signal: 62, status: 'Active' },
      { id: 'Node-Delhi-03', type: 'SMS Relay', signal: 40, status: 'Limited' },
    ];
    mesh.innerHTML = nodes.map(n => `
      <div class="mesh-node">
        <div class="mesh-signal">${[1,2,3,4].map((b, i) => `<div class="mesh-bar" style="height:${(i+1)*5}px;opacity:${n.signal > i*25 ? 1 : 0.2}"></div>`).join('')}</div>
        <div style="flex:1"><div style="font-size:0.82rem;font-weight:600">${n.id}</div><div style="font-size:0.72rem;color:var(--text-muted)">${n.type}</div></div>
        <span style="font-size:0.72rem;color:${n.status==='Active'?'var(--green)':'var(--amber)'}">${n.status}</span>
      </div>
    `).join('');
  }
}

// ═══════════════════════════════════════════════════ ANALYTICS
function renderAnalytics() {
  initAnalyticsCharts();
  renderDistrictHeatmap();
  renderAnalyticsTable();
}

function renderDistrictHeatmap() {
  const hm = document.getElementById('district-heatmap');
  if (!hm) return;
  const districts = [
    { name: 'Mayur Vihar', level: 95, color: '#ff3b3b' }, { name: 'Laxmi Nagar', level: 88, color: '#ff3b3b' },
    { name: 'ITO', level: 72, color: '#ff8c00' }, { name: 'Wazirabad', level: 65, color: '#ff8c00' },
    { name: 'Sarojini Nagar', level: 30, color: '#00ff88' }, { name: 'Connaught Place', level: 15, color: '#00ff88' },
    { name: 'Geeta Colony', level: 80, color: '#ff8c00' }, { name: 'Dilshad Garden', level: 55, color: '#f5a623' },
    { name: 'Rohini', level: 20, color: '#00ff88' },
  ];
  hm.innerHTML = districts.map(d => `
    <div class="district-cell" style="background:${d.color}${Math.round(d.level * 0.8 + 20).toString(16)};color:white;text-shadow:0 1px 3px rgba(0,0,0,0.5)">
      ${d.name}<br><strong>${d.level}%</strong>
    </div>
  `).join('');
}

function renderAnalyticsTable() {
  const table = document.getElementById('analytics-table');
  if (!table) return;
  const data = [
    { district: 'Mayur Vihar', incidents: 18, critical: 7, resolved: 4, respTime: '4.2 min', affected: 8400, status: 'Active' },
    { district: 'Laxmi Nagar', incidents: 12, critical: 5, resolved: 3, respTime: '6.1 min', affected: 5200, status: 'Active' },
    { district: 'GTB Hospital Area', incidents: 8, critical: 3, resolved: 5, respTime: '2.8 min', affected: 340, status: 'Responding' },
    { district: 'Wazirabad', incidents: 6, critical: 2, resolved: 4, respTime: '8.3 min', affected: 2100, status: 'Active' },
    { district: 'ITO', incidents: 5, critical: 1, resolved: 4, respTime: '5.5 min', affected: 1400, status: 'Responding' },
  ];
  table.innerHTML = `
    <tr><th>District</th><th>Incidents</th><th>Critical</th><th>Resolved</th><th>Avg Response</th><th>Affected</th><th>Status</th></tr>
    ${data.map(d => `
      <tr>
        <td style="font-weight:600">${d.district}</td>
        <td><span style="font-family:'JetBrains Mono';font-weight:700">${d.incidents}</span></td>
        <td><span style="color:var(--red);font-weight:700">${d.critical}</span></td>
        <td><span style="color:var(--green);font-weight:700">${d.resolved}</span></td>
        <td style="font-family:'JetBrains Mono'">${d.respTime}</td>
        <td>${d.affected.toLocaleString()}</td>
        <td><span style="color:${d.status==='Active'?'var(--amber)':'var(--cyan)'}">${d.status}</span></td>
      </tr>
    `).join('')}
  `;
}

function updateAnalytics(range) {
  showToast('info', `📊 Analytics updated for: ${range}`);
  renderAnalytics();
}

// ═══════════════════════════════════════════════════ AI PREDICTIONS
function renderPredictions() {
  if (!AppState.maps.predict) initPredictMap();
  renderPriorityList();
  renderEvacRoutes();
  renderThermalDisplay();
}

function renderPriorityList() {
  const list = document.getElementById('priority-list');
  if (!list) return;
  const incidents = [...(AppState.incidents.list || [])].map(inc => ({
    ...inc,
    score: inc.severity === 'critical' ? 95 + Math.floor(Math.random() * 5) :
           inc.severity === 'high' ? 75 + Math.floor(Math.random() * 15) :
           inc.severity === 'medium' ? 45 + Math.floor(Math.random() * 20) : 20 + Math.floor(Math.random() * 20),
  })).sort((a, b) => b.score - a.score);
  list.innerHTML = incidents.map(inc => `
    <div class="priority-item">
      <div class="priority-score ${inc.severity}">${inc.score}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.82rem;font-weight:600">${inc.icon} ${inc.title.substring(0, 35)}...</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">AI recommends: Deploy Team Alpha-${Math.floor(Math.random()*9)+1}</div>
      </div>
    </div>
  `).join('');
}

function renderEvacRoutes() {
  const evac = document.getElementById('evac-routes');
  if (!evac) return;
  const routes = [
    { num: 1, name: 'Ring Road → NH-58 → Ghaziabad', status: 'CLEAR', time: '35 min', color: 'var(--green)' },
    { num: 2, name: 'Vikas Marg → DND → Noida Sector 62', status: 'SLOW', time: '52 min', color: 'var(--amber)' },
    { num: 3, name: 'GT Road → NH-44 → Sonipat', status: 'CLEAR', time: '48 min', color: 'var(--green)' },
    { num: 4, name: 'Yamuna Expressway', status: 'CLOSED', time: 'N/A', color: 'var(--red)' },
  ];
  evac.innerHTML = routes.map(r => `
    <div class="evac-route-item">
      <div class="evac-route-num">${r.num}</div>
      <div style="flex:1">
        <div style="font-size:0.82rem;font-weight:600">${r.name}</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">⏱ ETA: ${r.time}</div>
      </div>
      <span style="color:${r.color};font-weight:700;font-size:0.72rem">${r.status}</span>
    </div>
  `).join('');
}

function renderThermalDisplay() {
  const thermal = document.getElementById('thermal-display');
  if (!thermal) return;
  thermal.innerHTML = `
    <div style="text-align:center;padding:1rem;width:100%">
      <div style="font-family:'JetBrains Mono';font-size:0.75rem;color:#00ff88;margin-bottom:0.5rem">THERMAL SCAN ACTIVE — SECTOR 7G</div>
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:3px;max-width:200px;margin:0 auto">
        ${Array.from({length:64}).map((_,i) => {
          const val = Math.random();
          const color = val > 0.9 ? '#ff3b3b' : val > 0.7 ? '#ff8c00' : val > 0.5 ? '#f5a623' : val > 0.3 ? '#1a3a5c' : '#0a1f3d';
          return `<div style="height:20px;background:${color};border-radius:2px;opacity:${0.6+val*0.4}"></div>`;
        }).join('')}
      </div>
      <div style="font-family:'JetBrains Mono';font-size:0.72rem;color:var(--text-muted);margin-top:0.75rem">🔴 3 HEAT SIGNATURES DETECTED<br>Probable: 2 Adults, 1 Child</div>
      <button class="btn-sm" style="margin-top:0.75rem" onclick="showToast('success','Survivor coordinates sent to rescue team')">Deploy Rescue Team</button>
    </div>
  `;
  lucide.createIcons();
}

function runPrediction() {
  if (!AppState.maps.predict) initPredictMap();
  else addPredictionOverlay(AppState.maps.predict);
  showToast('success', '🤖 AI flood prediction model running — Results in 3 seconds...');
  setTimeout(() => showToast('warning', '⚠ Prediction: Flood to expand 3.2km north in next 6h — Pre-evacuate Zone 4'), 3000);
}

// ═══════════════════════════════════════════════════ IOT SENSORS
let sensorIntervals = [];
function populateIoTSensors() {
  const sensors = [
    { name: 'Water Level Sensor', icon: '💧', value: 208, unit: 'm', status: 'danger', max: 250, warn: 205 },
    { name: 'Smoke Detector A', icon: '🌫', value: 0.12, unit: 'ppm', status: 'normal', max: 1, warn: 0.5 },
    { name: 'Seismic Sensor', icon: '📡', value: 0.8, unit: 'Richter', status: 'normal', max: 10, warn: 3 },
    { name: 'Temperature Sensor', icon: '🌡', value: 34, unit: '°C', status: 'alert', max: 50, warn: 35 },
    { name: 'Air Quality (AQI)', icon: '💨', value: 187, unit: 'AQI', status: 'alert', max: 500, warn: 150 },
    { name: 'Flood Gate Pressure', icon: '⚙', value: 8.4, unit: 'bar', status: 'danger', max: 10, warn: 7 },
  ];
  const grid = document.getElementById('sensor-grid');
  if (!grid) return;
  grid.innerHTML = sensors.map((s, i) => `
    <div class="sensor-card" id="sensor-${i}">
      <div class="sensor-icon">${s.icon}</div>
      <div class="sensor-name">${s.name}</div>
      <div class="sensor-value" id="sensor-val-${i}" style="color:${s.status==='danger'?'var(--red)':s.status==='alert'?'var(--amber)':'var(--green)'}">${s.value}</div>
      <div class="sensor-unit">${s.unit}</div>
      <div class="sensor-status ${s.status}">${s.status.toUpperCase()}</div>
    </div>
  `).join('');
  populateWearables();
  populateDrones();
}

function startSensorUpdates() {
  sensorIntervals.forEach(clearInterval);
  sensorIntervals = [];
  const baseValues = [208, 0.12, 0.8, 34, 187, 8.4];
  baseValues.forEach((base, i) => {
    const iv = setInterval(() => {
      const el = document.getElementById(`sensor-val-${i}`);
      if (el) { const newVal = (base + (Math.random() - 0.4) * base * 0.05).toFixed(i === 1 || i === 2 ? 2 : 1); el.textContent = newVal; }
    }, 2000 + i * 300);
    sensorIntervals.push(iv);
  });
}

function populateWearables() {
  const panel = document.getElementById('wearable-panel');
  if (!panel) return;
  const wearables = [
    { id: 'WB-001', user: 'Arjun Sharma', pulse: 84, status: 'ok', battery: 72 },
    { id: 'WB-002', user: 'Priya Menon', pulse: 91, status: 'ok', battery: 45 },
    { id: 'WB-003', user: 'Karthik Rajan', pulse: 128, status: 'alert', battery: 88 },
    { id: 'WB-004', user: 'Rahul Gupta', pulse: 77, status: 'ok', battery: 93 },
  ];
  panel.innerHTML = wearables.map(w => `
    <div class="wearable-item">
      <div class="wearable-pulse ${w.status}"></div>
      <div style="flex:1">
        <div style="font-size:0.82rem;font-weight:600">${w.user}</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">${w.id} • 🔋 ${w.battery}%</div>
      </div>
      <span style="font-family:'JetBrains Mono';font-size:0.85rem;color:${w.status==='alert'?'var(--red)':'var(--green)'}">${w.pulse} bpm</span>
      ${w.status === 'alert' ? '<button class="btn-sm btn-danger" onclick="showToast(\'error\',\'High pulse alert — Checking on volunteer\')">!</button>' : ''}
    </div>
  `).join('');
  lucide.createIcons();
}

function populateDrones() {
  const panel = document.getElementById('drone-panel');
  if (!panel) return;
  const drones = [
    { id: 'DRN-01', mission: 'Flood survey — Yamuna Bank', battery: 67, status: 'active', altitude: '120m' },
    { id: 'DRN-02', mission: 'Thermal scan — Geeta Colony', battery: 44, status: 'active', altitude: '85m' },
    { id: 'DRN-03', mission: 'Supply drop — Shelter 2', battery: 23, status: 'returning', altitude: '60m' },
    { id: 'DRN-04', mission: 'Standby at base', battery: 100, status: 'standby', altitude: '0m' },
  ];
  panel.innerHTML = drones.map(d => `
    <div class="drone-item">
      <span>🚁</span>
      <div style="flex:1">
        <div style="font-size:0.82rem;font-weight:600">${d.id}</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">${d.mission}</div>
      </div>
      <div style="text-align:right;font-size:0.72rem">
        <div style="color:${d.battery<30?'var(--red)':'var(--green)'};font-family:'JetBrains Mono'">🔋${d.battery}%</div>
        <div style="color:var(--cyan)">${d.altitude}</div>
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════ BLOCKCHAIN
function populateBlockchain() {
  addBlock('platform_initialized', { version: '2.0', operator: 'ResQNet', location: 'Delhi NCR' });
  addBlock('incident_reported', { id: 'INC001', type: 'flood', severity: 'critical' });
  addBlock('rescue_dispatched', { team: 'Alpha-7', incident: 'INC001', eta: '4 min' });
  addBlock('sos_triggered', { user: 'Anonymous', location: 'Mayur Vihar', time: new Date().toISOString() });
  addBlock('shelter_allocated', { shelter: 'Ramlila Maidan', people: 340, coordinator: 'Admin' });
}

function renderBlockchain() {
  const stats = document.getElementById('blockchain-stats');
  if (stats) {
    stats.innerHTML = `
      <div class="bc-stat"><div class="bc-stat-val">${BLOCKCHAIN_CHAIN.length}</div><div class="bc-stat-label">Total Blocks</div></div>
      <div class="bc-stat"><div class="bc-stat-val" style="color:var(--green)">100%</div><div class="bc-stat-label">Chain Integrity</div></div>
      <div class="bc-stat"><div class="bc-stat-val">${BLOCKCHAIN_CHAIN.filter(b=>b.data.action==='sos_triggered').length}</div><div class="bc-stat-label">SOS Events</div></div>
      <div class="bc-stat"><div class="bc-stat-val">${BLOCKCHAIN_CHAIN.filter(b=>b.data.action==='rescue_dispatched').length}</div><div class="bc-stat-label">Dispatches</div></div>
    `;
  }
  const chain = document.getElementById('blockchain-chain');
  if (!chain) return;
  chain.innerHTML = [...BLOCKCHAIN_CHAIN].reverse().slice(0, 8).map(b => `
    <div class="block">
      <div class="block-header">
        <span class="block-num">BLOCK #${b.index}</span>
        <span class="block-hash">${b.hash.substring(0, 16)}...${b.hash.substring(48)}</span>
      </div>
      <div class="block-data">${JSON.stringify(b.data, null, 2)}</div>
      <div class="block-chain-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        Prev: ${b.prevHash.substring(0, 24)}...
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════ TRAINING
function populateTraining() { showTrainingTab('lessons'); }

function showTrainingTab(tab) {
  AppState.training.tab = tab;
  document.querySelectorAll('.training-tab').forEach(t => t.classList.remove('active'));
  const btn = document.querySelector(`.training-tab[onclick="showTrainingTab('${tab}')"]`);
  if (btn) btn.classList.add('active');
  const content = document.getElementById('training-content');
  if (!content) return;
  if (tab === 'lessons') {
    const lessons = [
      { emoji: '🌊', title: 'Flood Survival Guide', desc: 'Complete protocol for flood emergencies — evacuation, rescue signals, survival', dur: '12 min' },
      { emoji: '🔥', title: 'Fire Safety & Prevention', desc: 'Fire escape planning, extinguisher use, smoke inhalation treatment', dur: '10 min' },
      { emoji: '🌍', title: 'Earthquake Preparedness', desc: 'Drop-Cover-Hold On, aftershock protocol, building safety assessment', dur: '15 min' },
      { emoji: '🩺', title: 'Emergency First Aid', desc: 'CPR, AED use, bleeding control, fracture management', dur: '20 min' },
      { emoji: '🧪', title: 'Chemical Incident Response', desc: 'Hazmat identification, PPE, decontamination procedures', dur: '18 min' },
      { emoji: '🌪', title: 'Cyclone & Storm Safety', desc: 'Early warning signs, shelter-in-place, post-storm safety', dur: '14 min' },
      { emoji: '🏔', title: 'Landslide Awareness', desc: 'Risk zone identification, warning signs, evacuation procedure', dur: '8 min' },
      { emoji: '📡', title: 'Emergency Communication', desc: 'Radio protocols, SOS signals, offline mesh network usage', dur: '10 min' },
    ];
    content.innerHTML = `<div class="lesson-grid">${lessons.map(l => `
      <div class="lesson-card" onclick="showToast('info','Opening: ${l.title}')">
        <div class="lesson-emoji">${l.emoji}</div>
        <div class="lesson-title">${l.title}</div>
        <div class="lesson-desc">${l.desc}</div>
        <div class="lesson-duration">⏱ ${l.dur} read</div>
        <button class="btn-sm" style="margin-top:0.75rem;width:100%" onclick="event.stopPropagation()">Start Lesson →</button>
      </div>
    `).join('')}</div>`;
  } else if (tab === 'quiz') {
    AppState.quiz = { current: 0, score: 0, answered: false };
    renderQuiz();
  } else if (tab === 'certs') {
    const certs = [
      { emoji: '🌊', title: 'Flood Response Certified', date: 'June 2025', earned: true },
      { emoji: '🩺', title: 'Emergency First Aid', date: 'May 2025', earned: true },
      { emoji: '🔥', title: 'Fire Safety Responder', date: 'Locked', earned: false },
      { emoji: '🌍', title: 'Earthquake Preparedness', date: 'Locked', earned: false },
    ];
    content.innerHTML = `<div class="cert-grid">${certs.map(c => `
      <div class="cert-card" style="opacity:${c.earned?1:0.5}">
        <div class="cert-emoji">${c.emoji}</div>
        <div class="cert-title">${c.title}</div>
        <div class="cert-date">${c.earned ? '✅ ' + c.date : '🔒 Complete quiz to unlock'}</div>
        ${c.earned ? '<button class="btn-sm btn-primary" style="margin-top:0.75rem" onclick="showToast(\'success\',\'Certificate downloaded!\')">Download PDF</button>' : ''}
      </div>
    `).join('')}</div>`;
  }
}

function renderQuiz() {
  const content = document.getElementById('training-content');
  if (!content) return;
  const topic = 'flood';
  const questions = QUIZ_DATA[topic];
  const q = questions[AppState.quiz.current];
  const progress = ((AppState.quiz.current) / questions.length) * 100;
  if (AppState.quiz.current >= questions.length) {
    content.innerHTML = `
      <div class="quiz-container" style="text-align:center;padding:2rem">
        <div style="font-size:3rem;margin-bottom:1rem">${AppState.quiz.score >= 4 ? '🏆' : AppState.quiz.score >= 3 ? '🥈' : '📚'}</div>
        <h2 style="margin-bottom:0.5rem">Quiz Complete!</h2>
        <p style="color:var(--text-muted);margin-bottom:1.5rem">Score: ${AppState.quiz.score}/${questions.length}</p>
        <div style="font-size:1.5rem;font-weight:800;color:${AppState.quiz.score >= 4 ? 'var(--green)' : 'var(--amber)'}">
          ${AppState.quiz.score >= 4 ? '✅ CERTIFIED!' : '📖 Keep Learning'}
        </div>
        ${AppState.quiz.score >= 4 ? '<p style="color:var(--green);margin-top:0.5rem">Flood Response Certificate Unlocked!</p>' : '<p style="color:var(--text-muted);margin-top:0.5rem">Score 4/5 or above to get certified</p>'}
        <button class="btn-primary" style="margin-top:1.5rem" onclick="showTrainingTab(\'quiz\')">Retry Quiz</button>
      </div>
    `;
    return;
  }
  content.innerHTML = `
    <div class="quiz-container">
      <div style="display:flex;justify-content:space-between;margin-bottom:0.75rem;font-size:0.8rem;color:var(--text-muted)">
        <span>Question ${AppState.quiz.current + 1} of ${questions.length}</span>
        <span>Score: ${AppState.quiz.score}/${AppState.quiz.current}</span>
      </div>
      <div class="quiz-progress"><div class="quiz-progress-fill" style="width:${progress}%"></div></div>
      <div class="quiz-question">
        <div class="quiz-q-text">${q.q}</div>
        <div class="quiz-options">${q.options.map((opt, i) => `
          <button class="quiz-option" id="quiz-opt-${i}" onclick="answerQuiz(${i}, ${q.answer}, decodeURIComponent('${encodeURIComponent(q.explanation)}'))">
            ${String.fromCharCode(65+i)}. ${opt}
          </button>
        `).join('')}</div>
      </div>
    </div>
  `;
}

function answerQuiz(selected, correct, explanation) {
  if (AppState.quiz.answered) return;
  AppState.quiz.answered = true;
  const opts = document.querySelectorAll('.quiz-option');
  opts.forEach((opt, i) => {
    opt.disabled = true;
    if (i === correct) opt.classList.add('correct');
    else if (i === selected) opt.classList.add('wrong');
  });
  if (selected === correct) { AppState.quiz.score++; showToast('success', '✅ Correct!'); }
  else { showToast('error', `❌ Wrong — ${explanation}`); }
  setTimeout(() => {
    AppState.quiz.current++;
    AppState.quiz.answered = false;
    renderQuiz();
  }, 1800);
}

// ═══════════════════════════════════════════════════ MARKETPLACE
function populateMarketplace() { showMarketTab('requests'); }

function showMarketTab(tab) {
  AppState.market.tab = tab;
  document.querySelectorAll('.market-tab').forEach(t => t.classList.remove('active'));
  const btn = document.querySelector(`.market-tab[onclick="showMarketTab('${tab}')"]`);
  if (btn) btn.classList.add('active');
  const content = document.getElementById('market-content');
  if (!content) return;
  if (tab === 'requests') {
    const requests = [
      { type: 'Food', emoji: '🍱', description: '500 food packets needed at Ramlila Maidan shelter', urgency: 'URGENT', location: 'Ramlila Maidan', status: 'Unfulfilled', user: 'Shelter Admin' },
      { type: 'Medicine', emoji: '💊', description: 'ORS and antibiotics for flood victims — GTB Hospital', urgency: 'CRITICAL', location: 'GTB Hospital', status: 'Partially fulfilled', user: 'Dr. Sharma' },
      { type: 'Shelter', emoji: '🏠', description: 'Need temporary shelter for 45 displaced families', urgency: 'URGENT', location: 'Geeta Colony', status: 'Unfulfilled', user: 'NGO Delhi' },
      { type: 'Transport', emoji: '🚌', description: 'Bus needed to evacuate elderly from Mayur Vihar Phase 3', urgency: 'URGENT', location: 'Mayur Vihar', status: 'Unfulfilled', user: 'Rescue Team 4' },
    ];
    content.innerHTML = `<div class="market-grid">${requests.map(r => `
      <div class="market-card">
        <div class="market-card-header">
          <span style="font-size:1.5rem">${r.emoji}</span>
          <span class="market-urgent">${r.urgency}</span>
        </div>
        <div style="font-size:0.9rem;font-weight:700;margin-bottom:0.5rem">${r.type} Request</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem">${r.description}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">📍 ${r.location} • By: ${r.user}</div>
        <div style="margin-top:0.75rem;display:flex;gap:0.5rem;">
          <button class="btn-primary" style="flex:1" onclick="fulfillRequest('${r.type}')">Fulfill Request</button>
          <button class="btn-secondary" onclick="showToast('info','Contact: ${r.user}')">Contact</button>
        </div>
      </div>
    `).join('')}</div>`;
  } else if (tab === 'donations') {
    content.innerHTML = `
      <div class="market-grid">
        <div class="dash-card">
          <div class="card-header"><h3>💝 Make a Donation</h3></div>
          <div class="form-group"><label>Resource Type</label><select class="form-input"><option>Food Packets</option><option>Medicines</option><option>Blankets</option><option>Water Bottles</option><option>Financial Aid</option></select></div>
          <div class="form-group"><label>Quantity / Amount</label><input type="text" class="form-input" placeholder="e.g., 100 packets or ₹5000" /></div>
          <div class="form-group"><label>Pickup Location</label><input type="text" class="form-input" placeholder="Your address" /></div>
          <button class="btn-primary btn-full" onclick="submitDonation()"><i data-lucide="heart"></i> Donate Now</button>
        </div>
        <div class="dash-card span-2">
          <div class="card-header"><h3>Recent Donations</h3></div>
          <div style="display:flex;flex-direction:column;gap:0.5rem;">
            ${[['Rajesh Kumar','500 food packets','Ramlila Camp','Delivered'],['Anita NGO','₹50,000','GTB Hospital','In Transit'],['Delhi Rotary','200 blankets','Shelter 3','Delivered']].map(d=>`
              <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;background:var(--surface);border-radius:var(--radius-sm);font-size:0.82rem;border:1px solid var(--border)">
                <span>💝</span><div style="flex:1"><div style="font-weight:600">${d[0]}</div><div style="color:var(--text-muted)">${d[1]} → ${d[2]}</div></div>
                <span style="color:${d[3]==='Delivered'?'var(--green)':'var(--amber)'}">● ${d[3]}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    lucide.createIcons();
  } else if (tab === 'ngos') {
    content.innerHTML = `
      <div class="market-grid">
        ${[['Delhi NGO Network','🌍','Food, Shelter','Active — 34 workers'],['Doctors Without Borders','🏥','Medical Aid','Active — 12 doctors'],['Rotary International','🔄','Logistics','Active — 45 volunteers'],['Red Cross India','➕','Multi-purpose','Active — 78 members']].map(n => `
          <div class="market-card">
            <div style="font-size:2rem;margin-bottom:0.75rem">${n[1]}</div>
            <div style="font-size:0.9rem;font-weight:700;margin-bottom:0.3rem">${n[0]}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem">${n[2]}</div>
            <div style="font-size:0.72rem;color:var(--green)">● ${n[3]}</div>
            <button class="btn-sm" style="margin-top:0.75rem;width:100%" onclick="showToast('info','Connecting to ${n[0]}...')">Partner With Us</button>
          </div>
        `).join('')}
      </div>
    `;
  }
  lucide.createIcons();
}

function fulfillRequest(type) {
  addBlock('donation_made', { type, donor: AppState.auth.user?.name, timestamp: new Date().toISOString() });
  showToast('success', `✅ Fulfilling ${type} request — Coordinator will contact you shortly`);
}

function submitDonation() {
  addBlock('donation_made', { donor: AppState.auth.user?.name, timestamp: new Date().toISOString() });
  showToast('success', '💝 Donation registered! Our team will coordinate pickup within 2 hours.');
}

function openDonateModal() { showMarketTab('donations'); }

// ═══════════════════════════════════════════════════ SATELLITE & DIGITAL TWIN
function toggleSatOverlay(type) {
  document.querySelectorAll('.sat-overlay-btn').forEach(b => b.classList.remove('active'));
  event.target.closest('.sat-overlay-btn')?.classList.add('active');
  showToast('info', `🛰 Activating ${type} satellite overlay...`);
  if (AppState.maps.satellite) {
    const colors = { flood: '#00d4ff', fire: '#ff3b3b', weather: '#a855f7', thermal: '#f5a623' };
    const scenario = AppState.scenario || SCENARIOS.delhi;
    const center = (scenario.incidents[0] || {}).location || [28.6, 77.2];
    AppState.maps.satellite.eachLayer(layer => { if (layer instanceof L.Circle) AppState.maps.satellite.removeLayer(layer); });
    L.circle(center, { radius: 8000, color: colors[type], fillColor: colors[type], fillOpacity: 0.2, weight: 2 }).addTo(AppState.maps.satellite);
  }
}

function renderDigitalTwin() {
  const twin = document.getElementById('digital-twin');
  if (!twin) return;
  const buildings = [
    { floors: 8, danger: false }, { floors: 12, danger: false }, { floors: 5, danger: true },
    { floors: 15, danger: false }, { floors: 6, danger: true }, { floors: 10, danger: false },
    { floors: 4, danger: false }, { floors: 8, danger: false }, { floors: 3, danger: true },
    { floors: 12, danger: false }, { floors: 7, danger: false }, { floors: 9, danger: false },
  ];
  const colors = ['#1a3a5c', '#1e4a7a', '#234d82', '#1b3d5f', '#1a3a5c', '#1f4d80'];
  twin.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:4px;height:100%;padding:1rem;position:relative">
      <div style="position:absolute;bottom:0;left:0;right:0;height:20px;background:rgba(0,100,200,0.4);z-index:1;border-radius:0 0 4px 4px"></div>
      ${buildings.map((b, i) => `
        <div class="twin-building" style="z-index:2">
          ${Array.from({length:b.floors}).map((_, j) => `<div class="twin-floor ${b.danger && j < 2 ? 'twin-danger' : ''}" style="background:${b.danger && j < 2 ? '' : colors[i % colors.length]};width:${16 + (i%3)*4}px"></div>`).join('')}
        </div>
      `).join('')}
      <div style="position:absolute;bottom:10px;left:0;right:0;text-align:center;font-size:0.65rem;color:var(--text-muted);z-index:3;font-family:'JetBrains Mono'">🔴 DANGER ZONES HIGHLIGHTED</div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════ SETTINGS
function populateSettings() {
  const profile = document.getElementById('profile-card');
  if (profile) {
    const roleLabels = { citizen: 'Citizen', volunteer: 'Volunteer', admin: 'Administrator', rescue: 'Rescue Team', hospital: 'Hospital', ngo: 'NGO' };
    const avatarLetters = { citizen: 'C', volunteer: 'V', admin: 'A', rescue: 'R', hospital: 'H', ngo: 'N' };
    profile.innerHTML = `
      <div class="profile-avatar">${avatarLetters[AppState.auth.role] || 'U'}</div>
      <div class="profile-name">${roleLabels[AppState.auth.role] || 'User'} Account</div>
      <div class="profile-role">${AppState.auth.role.toUpperCase()}</div>
      <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem">JWT Token: Active</div>
      <div style="font-size:0.72rem;color:var(--text-muted)">Session expires in 14:32</div>
      <button class="btn-secondary" style="margin-top:1rem;width:100%" onclick="showToast('info','Refreshing JWT token...')">Refresh Token</button>
    `;
  }
  const roleMatrix = document.getElementById('role-matrix');
  if (roleMatrix) {
    const permissions = [
      ['Feature', 'Citizen', 'Vol.', 'Rescue', 'Admin'],
      ['View Incidents', '✓', '✓', '✓', '✓'],
      ['Report Incident', '✓', '✓', '✓', '✓'],
      ['SOS Trigger', '✓', '✓', '✓', '✓'],
      ['Dispatch Team', '✗', '✗', '✓', '✓'],
      ['Broadcast Alert', '✗', '✗', '✓', '✓'],
      ['View Analytics', '✗', '✓', '✓', '✓'],
      ['Manage Resources', '✗', '✗', '✓', '✓'],
      ['Blockchain Access', '✗', '✗', '✗', '✓'],
    ];
    roleMatrix.innerHTML = `<table class="perm-table">${permissions.map((row, i) => `<${i===0?'thead':'tbody'}><tr>${row.map(cell => `<${i===0?'th':'td'}>${cell==='✓'?`<span class="perm-check">✓</span>`:cell==='✗'?`<span class="perm-x">✗</span>`:cell}</${i===0?'th':'td'}>`).join('')}</tr></${i===0?'thead':'tbody'}>`).join('')}</table>`;
  }
  const apiList = document.getElementById('api-status-list');
  if (apiList) {
    const apis = [
      { name: 'OpenStreetMap', status: 'online' }, { name: 'Gemini AI', status: 'online' },
      { name: 'Weather API', status: 'online' }, { name: 'Twilio SMS', status: 'online' },
      { name: 'Socket.IO Server', status: 'online' }, { name: 'Supabase DB', status: 'online' },
      { name: 'Cloudinary CDN', status: 'limited' }, { name: 'Govt Alert API', status: 'offline' },
    ];
    apiList.innerHTML = apis.map(a => `
      <div class="api-item">
        <div class="api-dot ${a.status}"></div>
        <span style="flex:1;font-size:0.82rem">${a.name}</span>
        <span style="font-size:0.72rem;color:${a.status==='online'?'var(--green)':a.status==='limited'?'var(--amber)':'var(--red)'}">${a.status}</span>
      </div>
    `).join('');
  }
}

// ═══════════════════════════════════════════════════ CHARTS
function initCharts() {
  // Wait for dashboard to be visible first
  setTimeout(() => {
    initMiniMap();
    initResponseChart();
    initTypesChart();
  }, 100);
}

function initResponseChart() {
  const ctx = document.getElementById('chart-response');
  if (!ctx || AppState.charts.response) return;
  const labels = ['6am','8am','10am','12pm','2pm','4pm','6pm','8pm'];
  AppState.charts.response = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Response Time (min)',
        data: [8.2, 7.1, 6.4, 9.2, 5.8, 4.9, 6.1, 5.2],
        borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.1)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#00d4ff',
      }, {
        label: 'Target (5 min)',
        data: [5,5,5,5,5,5,5,5],
        borderColor: '#00ff88', borderDash: [6,3], pointRadius: 0, tension: 0,
      }],
    },
    options: chartOptions('Response Time (minutes)'),
  });
}

function initTypesChart() {
  const ctx = document.getElementById('chart-types');
  if (!ctx || AppState.charts.types) return;
  AppState.charts.types = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Flood', 'Medical', 'Collapse', 'Missing', 'Other'],
      datasets: [{ data: [45, 22, 15, 10, 8], backgroundColor: ['#00d4ff', '#ff3b3b', '#f5a623', '#a855f7', '#00ff88'], borderWidth: 0, hoverOffset: 8 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#e8f4fd', font: { family: 'Inter', size: 11 } }, position: 'right' } },
    },
  });
}

function initICUChart() {
  const ctx = document.getElementById('chart-icu');
  if (!ctx || AppState.charts.icu) return;
  AppState.charts.icu = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['AIIMS', 'Safdarjung', 'GTB', 'LNJP'],
      datasets: [{
        label: 'ICU Occupancy %',
        data: [78, 92, 45, 85],
        backgroundColor: ['#00d4ff', '#ff3b3b', '#00ff88', '#ff8c00'],
        borderRadius: 6,
      }],
    },
    options: chartOptions('ICU Occupancy %'),
  });
}

function initAnalyticsCharts() {
  const trendCtx = document.getElementById('chart-trend');
  if (trendCtx && !AppState.charts.trend) {
    AppState.charts.trend = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: ['00:00','02:00','04:00','06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'],
        datasets: [
          { label: 'Active Incidents', data: [3,4,5,8,14,18,22,26,20,15,10,8], borderColor: '#ff3b3b', backgroundColor: 'rgba(255,59,59,0.1)', tension: 0.4, fill: true },
          { label: 'Resolved', data: [0,1,2,3,5,8,12,18,22,25,24,22], borderColor: '#00ff88', backgroundColor: 'rgba(0,255,136,0.05)', tension: 0.4, fill: true },
        ],
      },
      options: chartOptions('Incidents over Time'),
    });
  }
  const respCtx = document.getElementById('chart-resp-time');
  if (respCtx && !AppState.charts.respTime) {
    AppState.charts.respTime = new Chart(respCtx, {
      type: 'bar',
      data: {
        labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        datasets: [{ label: 'Avg Response (min)', data: [6.2, 5.8, 7.1, 5.4, 4.9, 6.8, 5.2], backgroundColor: '#00d4ff', borderRadius: 6 }],
      },
      options: chartOptions('Response Time by Day'),
    });
  }
  const utilCtx = document.getElementById('chart-util');
  if (utilCtx && !AppState.charts.util) {
    AppState.charts.util = new Chart(utilCtx, {
      type: 'doughnut',
      data: {
        labels: ['Ambulances','Food','Medicine','Water','Generators'],
        datasets: [{ data: [77, 56, 48, 60, 53], backgroundColor: ['#ff3b3b','#00ff88','#a855f7','#00d4ff','#f5a623'], borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e8f4fd', font: { family: 'Inter', size: 10 } } } } },
    });
  }
}

function initSensorChart() {
  const ctx = document.getElementById('chart-sensor');
  if (!ctx || AppState.charts.sensor) return;
  const labels = Array.from({length:12}, (_,i) => `-${60-i*5}min`);
  AppState.charts.sensor = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Water Level (m)', data: Array.from({length:12}, (_,i) => 200 + i * 0.7 + Math.random()), borderColor: '#00d4ff', tension: 0.4, yAxisID: 'y' },
        { label: 'AQI', data: Array.from({length:12}, (_,i) => 150 + i * 3 + Math.random() * 10), borderColor: '#f5a623', tension: 0.4, yAxisID: 'y1' },
      ],
    },
    options: { ...chartOptions('Live Sensor Data'), scales: { y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#00d4ff' } }, y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#f5a623' } } } },
  });
}

function chartOptions(title) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#e8f4fd', font: { family: 'Inter', size: 11 }, boxWidth: 12 } } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#667' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#667' } },
    },
  };
}

// ═══════════════════════════════════════════════════ MODALS
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.remove('hidden'); lucide.createIcons(); }
  if (id === 'report-modal') {
    navigator.geolocation?.getCurrentPosition(pos => {
      const locInput = document.getElementById('report-location');
      if (locInput) locInput.value = `${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E`;
    }, () => { const locInput = document.getElementById('report-location'); if (locInput) locInput.value = 'Location unavailable'; });
  }
}

function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

// ═══════════════════════════════════════════════════ FIRST AID
function showFATab(tab) {
  document.querySelectorAll('.fa-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.fa-tab[onclick="showFATab('${tab}')"]`)?.classList.add('active');
  const content = document.getElementById('fa-content');
  if (!content) return;
  const guides = {
    cpr: { title: 'CPR (Cardiopulmonary Resuscitation)', steps: ['Check for responsiveness — tap shoulder, shout "Are you okay?"','Call 112 immediately or ask someone to call','Tilt head back, lift chin to open airway','Look, listen, feel for breathing (max 10 seconds)','30 chest compressions — hard, fast, center of chest (2 inches deep)','2 rescue breaths — pinch nose, full breath, watch chest rise','Continue 30:2 cycle until help arrives or person recovers'], warning: '⚠ Only attempt rescue breathing if trained. Hands-only CPR (compressions only) is acceptable and effective.' },
    burn: { title: 'Burns First Aid', steps: ['Cool the burn immediately — run cool (not cold) water for 20 minutes','Do NOT use ice, butter, or toothpaste — these worsen injury','Remove jewelry/clothing near the burn area if not stuck to skin','Cover loosely with clean non-fluffy material (cling film ideal)','Do not burst blisters','For face, hands, feet, genitals — seek emergency care immediately'], warning: '⚠ Chemical or electrical burns — call 112 first, do not touch patient without PPE.' },
    bleed: { title: 'Severe Bleeding Control', steps: ['Apply direct firm pressure with clean cloth or dressing','Do NOT remove cloth if soaked — add more material on top','For limb wounds: elevate the limb above heart level','Maintain pressure for minimum 10 minutes without checking','If bleeding does not stop — apply tourniquet 2 inches above wound','Mark time of tourniquet application on patient forehead','Call 112 and keep patient warm and calm'], warning: '⚠ Tourniquets should only be released by medical professionals.' },
    choking: { title: 'Choking Response', steps: ['Ask: "Are you choking?" — if they can cough, encourage coughing','5 firm back blows between shoulder blades (heel of hand)','5 abdominal thrusts (Heimlich Maneuver) — fist above navel, sharp inward-upward thrust','Alternate 5 back blows + 5 abdominal thrusts','If unconscious — lower to ground, begin CPR, check mouth before each rescue breath','Infant (<1 year): Face-down on lap — 5 back blows, face-up 5 chest thrusts (no abdominal thrusts)'], warning: '⚠ After any choking episode requiring Heimlich — seek medical evaluation for internal injury.' },
  };
  const g = guides[tab];
  if (!g) return;
  content.innerHTML = `
    <h3 style="margin-bottom:1rem;color:var(--cyan)">${g.title}</h3>
    ${g.steps.map((step, i) => `
      <div class="fa-step">
        <div class="fa-step-num">${i + 1}</div>
        <div class="fa-step-text">${step}</div>
      </div>
    `).join('')}
    <div class="fa-warning">${g.warning}</div>
  `;
}

// ═══════════════════════════════════════════════════ NOTIFICATIONS
function populateNotifications() {
  AppState.notifications = [
    { type: 'critical', title: '🚨 Critical: Yamuna at 208m', text: 'Water level critical — immediate evacuation', time: '2 min ago' },
    { type: 'warning', title: '⚠ Resource Alert', text: 'Oxygen cylinders at 20% — restock needed', time: '15 min ago' },
    { type: 'info', title: '📡 Broadcast Sent', text: 'Alert sent to 84,200 recipients', time: '30 min ago' },
    { type: 'info', title: '✅ Shelter Update', text: 'Ramlila Maidan now at 72% capacity', time: '1h ago' },
  ];
  renderNotifications();
}

function renderNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  list.innerHTML = AppState.notifications.map(n => `
    <div class="notif-item">
      <div class="notif-dot ${n.type}"></div>
      <div>
        <div style="font-size:0.82rem;font-weight:600">${n.title}</div>
        <div class="notif-text">${n.text}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>
  `).join('');
  document.getElementById('notif-badge').textContent = AppState.notifications.length;
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  panel?.classList.toggle('hidden');
}

function clearNotifications() {
  AppState.notifications = [];
  renderNotifications();
  document.getElementById('notif-badge').textContent = '0';
}

function addNotification(type, title, text) {
  AppState.notifications.unshift({ type, title, text, time: 'Just now' });
  renderNotifications();
}

// ═══════════════════════════════════════════════════ TOASTS
function showToast(type, message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-icon"></div><span></span>`;
  toast.querySelector('span').textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('toast-fade-out'); setTimeout(() => toast.remove(), 300); }, 3500);
}

// ═══════════════════════════════════════════════════ VOICE COMMANDS
function startVoiceCommand() {
  const bar = document.getElementById('voice-cmd-bar');
  bar?.classList.remove('hidden');
  showToast('info', '🎤 Voice Command Mode — Speak your command');
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript.toLowerCase();
      stopVoiceCmd();
      processVoiceCommand(transcript);
    };
    recognition.onerror = () => { stopVoiceCmd(); showToast('warning', '🎤 Voice not recognized — try again'); };
    recognition.start();
  } else {
    setTimeout(() => {
      stopVoiceCmd();
      processVoiceCommand('show flood zone');
    }, 2000);
  }
}

function stopVoiceCmd() {
  document.getElementById('voice-cmd-bar')?.classList.add('hidden');
}

function processVoiceCommand(cmd) {
  showToast('info', `🤖 Command: "${cmd}"`);
  if (cmd.includes('ambulance') || cmd.includes('dispatch')) { showPanel('resources'); showToast('success', '🚑 Dispatching nearest ambulance...'); }
  else if (cmd.includes('flood') || cmd.includes('map')) { showPanel('map'); toggleLayer('flood'); }
  else if (cmd.includes('shelter')) { showPanel('shelters'); }
  else if (cmd.includes('sos')) { triggerSOS(); }
  else if (cmd.includes('volunteer')) { showPanel('volunteers'); }
  else if (cmd.includes('incident')) { showPanel('incidents'); }
  else { showPanel('ai'); document.getElementById('chat-input').value = cmd; sendMessage(); }
}

// ═══════════════════════════════════════════════════ LIVE CLOCK & REAL-TIME
function startLiveClock() {
  function update() {
    const now = new Date();
    const el = document.getElementById('live-clock');
    if (el) el.textContent = now.toLocaleTimeString('en-IN', { hour12: false });
  }
  update(); setInterval(update, 1000);
}

function startWeatherUpdate() {
  const temps = [32, 33, 31, 34, 33, 35];
  let idx = 0;
  setInterval(() => {
    const el = document.getElementById('weather-temp');
    if (el) el.textContent = temps[idx % temps.length] + '°C';
    idx++;
  }, 30000);
  document.getElementById('weather-temp').textContent = '34°C';
}

function startRealtimeSimulation() {
  // Simulate incoming alerts
  const alertMessages = [
    { delay: 12000, type: 'critical', title: '🚨 New SOS: Geeta Colony', text: 'Family of 5 trapped on rooftop' },
    { delay: 25000, type: 'warning', title: '⚠ Shelter Alert', text: 'Ramlila Maidan approaching full capacity (85%)' },
    { delay: 40000, type: 'info', title: '✅ Rescue Complete', text: 'Team Alpha-7 rescued 12 from Mayur Vihar' },
    { delay: 60000, type: 'critical', title: '🌊 Water Rising', text: 'Yamuna at 209m — exceeds danger level by 4m' },
    { delay: 90000, type: 'info', title: '🚁 Drone Deployed', text: 'DRN-01 now surveying flood-affected zone' },
  ];
  alertMessages.forEach(alert => {
    setTimeout(() => {
      addNotification(alert.type, alert.title, alert.text);
      showToast(alert.type === 'critical' ? 'error' : alert.type === 'warning' ? 'warning' : 'info', `${alert.title}: ${alert.text}`);
      // Add new incident occasionally
      if (alert.type === 'critical') {
        const scenario = AppState.scenario || SCENARIOS.delhi;
        const newInc = {
          id: 'INC_RT_' + Date.now(), type: 'flood', icon: '🚨',
          title: alert.title, severity: 'critical',
          location: [(scenario.incidents[0]?.location[0] || 28.6) + (Math.random()-0.5)*0.1, (scenario.incidents[0]?.location[1] || 77.2) + (Math.random()-0.5)*0.1],
          address: 'Real-time report', affected: Math.floor(Math.random()*500+50), time: 'Just now', status: 'active',
        };
        AppState.incidents.list.unshift(newInc);
        if (document.getElementById('panel-incidents')?.classList.contains('active') || document.getElementById('panel-dashboard')?.classList.contains('active')) {
          renderIncidentsFeed(); renderIncidentsGrid();
        }
        document.getElementById('nav-incidents-badge').textContent = AppState.incidents.list.length;
      }
    }, alert.delay);
  });
}

// ═══════════════════════════════════════════════════ COUNTER ANIMATION
function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const isString = typeof target === 'string' && isNaN(target.replace(/,/g, ''));
  if (isString) { el.textContent = target; return; }
  const numTarget = parseInt(String(target).replace(/,/g, ''));
  const duration = 1200;
  const start = Date.now();
  const startVal = parseInt(el.textContent.replace(/,/g, '')) || 0;
  const update = () => {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(startVal + (numTarget - startVal) * eased);
    el.textContent = current.toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target;
  };
  requestAnimationFrame(update);
}

// ═══════════════════════════════════════════════════ MISC


// Notification panel close on outside click
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notif-panel');
  const btn = document.querySelector('.notification-btn');
  if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
    panel.classList.add('hidden');
  }
});

// IoT sensor chart — initialized lazily when panel opens
function maybeInitSensorChart() {
  if (!AppState.charts.sensor) initSensorChart();
}

// IoT sensor chart auto-initializes when showPanel('iot') is called
