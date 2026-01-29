const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
require('dotenv').config();
const twilio = require('twilio');

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const app = express();
// Manual Re-Trigger or Escalation Endpoint
app.post('/api/trigger-alert', (req, res) => {
    try {
        const { hospitalName, bloodGroup, urgencyScore, requestType } = req.body;
        const data = readData();

        // Find Donors
        const donors = data.patients.filter(p =>
            p.bloodGroup === bloodGroup &&
            p.bloodDonation === true &&
            p.bloodDonationStatus === 'available'
        );

        console.log(`\n🔔 [CRITICAL ALERT] Re-broadcasting for Score ${urgencyScore}/100`);

        donors.forEach(async (donor) => {
            const message = `🚨 CRITICAL ESCALATION: Patient death risk increasing. ${hospitalName} needs ${bloodGroup} NOW! Score: ${urgencyScore}.`;

            console.log(`   📲 Sending REPEAT ALERT to ${donor.name}...`);

            if (twilioClient && donor.contactNumber) {
                try {
                    await twilioClient.messages.create({
                        body: message,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: donor.contactNumber
                    });
                } catch (e) { console.error(e.message); }
            } else {
                // Simulated fallback log
                console.log(`   (Simulated SMS): "${message}" sent to ${donor.contactNumber}`);
            }
        });

        res.json({ success: true, count: donors.length });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Helper functions to read/write data
const readData = () => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { users: [], patients: [], hospitals: [], records: [], accessLogs: [] };
    }
};

const writeData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Generate patient ID
const generatePatientId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
};

// ============ USER ENDPOINTS ============

// Create user (signup)
app.post('/api/users', (req, res) => {
    try {
        const { email, password, role, hospitalName, patientName, patientLocation } = req.body;
        const data = readData();

        // Check if user exists
        if (data.users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const userId = uuidv4();
        const newUser = {
            id: userId,
            email,
            password, // Note: In production, hash this!
            role,
            createdAt: new Date().toISOString()
        };

        data.users.push(newUser);

        // Create profile based on role
        if (role === 'patient') {
            const patientId = generatePatientId();
            const newPatient = {
                id: uuidv4(),
                patientId,
                userId,
                name: patientName || '',
                location: patientLocation || '',
                bloodGroup: '',
                allergies: '',
                conditions: '',
                medications: '',
                contactNumber: '',
                emergencyContact: '',
                bloodDonation: false,
                bloodDonationStatus: 'available',
                bloodDonationReason: '',
                bloodDonationDisease: '',
                bloodDonationStatusDate: null,
                hospitalAccessConsent: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            data.patients.push(newPatient);
        } else if (role === 'hospital') {
            const newHospital = {
                id: uuidv4(),
                userId,
                name: hospitalName || 'Hospital',
                createdAt: new Date().toISOString()
            };
            data.hospitals.push(newHospital);
        }

        writeData(data);
        res.json({ user: { ...newUser, password: undefined } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
app.post('/api/users/login', (req, res) => {
    try {
        const { email, password } = req.body;
        const data = readData();

        const user = data.users.find(u => u.email === email && u.password === password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({ user: { ...user, password: undefined } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
    try {
        const data = readData();
        const user = data.users.find(u => u.id === req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ ...user, password: undefined });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ PATIENT ENDPOINTS ============

// Get patient by user ID
app.get('/api/patients/user/:userId', (req, res) => {
    try {
        const data = readData();
        const patient = data.patients.find(p => p.userId === req.params.userId);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get patient by patient ID (for emergency access)
app.get('/api/patients/:patientId', (req, res) => {
    try {
        const data = readData();
        const patient = data.patients.find(p => p.patientId === req.params.patientId);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update patient profile
app.put('/api/patients/:patientId', (req, res) => {
    try {
        const data = readData();
        const index = data.patients.findIndex(p => p.patientId === req.params.patientId);
        if (index === -1) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        data.patients[index] = {
            ...data.patients[index],
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        writeData(data);
        res.json(data.patients[index]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search patients (with optional blood group filter)
app.get('/api/patients', (req, res) => {
    try {
        const { bloodGroup, donorsOnly } = req.query;
        const data = readData();
        let patients = data.patients;

        if (donorsOnly === 'true') {
            patients = patients.filter(p => p.bloodDonation && p.hospitalAccessConsent);
        }

        if (bloodGroup) {
            patients = patients.filter(p => p.bloodGroup === bloodGroup);
        }

        res.json(patients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ HOSPITAL ENDPOINTS ============

// Get hospital by user ID
app.get('/api/hospitals/user/:userId', (req, res) => {
    try {
        const data = readData();
        const hospital = data.hospitals.find(h => h.userId === req.params.userId);
        if (!hospital) {
            return res.status(404).json({ error: 'Hospital not found' });
        }
        res.json(hospital);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ MEDICAL RECORDS ENDPOINTS ============

// Get records for a patient
app.get('/api/records/:patientId', (req, res) => {
    try {
        const data = readData();
        const records = data.records.filter(r => r.patientId === req.params.patientId);
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a record
app.post('/api/records', (req, res) => {
    try {
        const data = readData();
        const newRecord = {
            id: uuidv4(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        data.records.push(newRecord);
        writeData(data);
        res.json(newRecord);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a record
app.delete('/api/records/:id', (req, res) => {
    try {
        const data = readData();
        const index = data.records.findIndex(r => r.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Record not found' });
        }
        data.records.splice(index, 1);
        writeData(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ACCESS LOGS ENDPOINTS ============

// Get access logs for a patient
app.get('/api/access-logs/:patientId', (req, res) => {
    try {
        const data = readData();
        const logs = data.accessLogs.filter(l => l.patientId === req.params.patientId);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add access log
app.post('/api/access-logs', (req, res) => {
    try {
        const data = readData();
        const newLog = {
            id: uuidv4(),
            ...req.body,
            timestamp: new Date().toISOString()
        };
        data.accessLogs.push(newLog);
        writeData(data);
        res.json(newLog);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ BLOOD REQUEST & NOTIFICATION ENDPOINTS ============

// Request Blood (Calculates Urgency & Notifies)
app.post('/api/blood-requests', (req, res) => {
    try {
        const { hospitalId, hospitalName, bloodGroup, units, requestType } = req.body;
        const data = readData();

        // 1. Prepare Input for Python Engine
        const input = JSON.stringify({
            request_id: uuidv4(),
            request_type: requestType,
            blood_group: bloodGroup,
            units_required: units,
            hospital_id: hospitalId
        });

        // 2. Call Python Script
        const pythonCommand = `python "${path.join(__dirname, 'priority_engine', 'cli.py')}" "${input.replace(/"/g, '\\"')}"`;

        exec(pythonCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Python Error: ${error.message}`);
                return res.status(500).json({ error: 'Failed to calculate urgency score' });
            }
            if (stderr) {
                console.error(`Python Stderr: ${stderr}`);
            }

            try {
                const priorityResult = JSON.parse(stdout);

                if (priorityResult.error) {
                    return res.status(400).json({ error: priorityResult.error });
                }

                // 3. Find Matching Donors
                const donors = data.patients.filter(p =>
                    p.bloodGroup === bloodGroup &&
                    p.bloodDonation === true &&
                    p.bloodDonationStatus === 'available'
                );

                // 4. Create Request Record
                const newRequest = {
                    id: uuidv4(),
                    hospitalId,
                    hospitalName,
                    bloodGroup,
                    units,
                    requestType,
                    urgencyScore: priorityResult.score,
                    isCritical: priorityResult.is_critical,
                    escalationReason: priorityResult.escalation_reason,
                    donorsNotified: donors.length,
                    createdAt: new Date().toISOString()
                };

                // Initialize if missing
                if (!data.bloodRequests) {
                    data.bloodRequests = [];
                }
                data.bloodRequests.push(newRequest);
                writeData(data);

                // 5. Send Notifications (Real SMS)
                console.log(`\n🔔 [NOTIFICATION SYSTEM] Broadcasitng Alerts for Request ${newRequest.id}`);
                console.log(`   Context: ${requestType} | Urgency: ${priorityResult.score}/100 | Critical: ${priorityResult.is_critical}`);

                // We don't await this to keep API fast, but we log the attempts
                donors.forEach(async (donor) => {
                    const message = `🚨 URGENT: ${hospitalName} needs ${bloodGroup} blood for ${requestType}. Urgency: ${priorityResult.score}/100. Please contact immediately!`;

                    console.log(`   📲 Processing alert for ${donor.name} (${donor.contactNumber})...`);

                    if (twilioClient && donor.contactNumber) {
                        try {
                            const result = await twilioClient.messages.create({
                                body: message,
                                from: process.env.TWILIO_PHONE_NUMBER,
                                to: donor.contactNumber
                            });
                            console.log(`      ✅ SMS SENT via Twilio! SID: ${result.sid}`);
                        } catch (smsError) {
                            console.error(`      ❌ SMS FAILED: ${smsError.message}`);
                        }
                    } else {
                        console.log(`      ⚠️ Skipped Real SMS: Missing Twilio Config or Number`);
                    }
                });

                res.json({
                    success: true,
                    request: newRequest,
                    message: `Alert sent to ${donors.length} donors with Urgency Score: ${priorityResult.score}`
                });

            } catch (parseError) {
                console.error('JSON Parse Error:', parseError, stdout);
                res.status(500).json({ error: 'Invalid response from priority engine' });
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ START SERVER ============

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏥 HealthVault API Server running on:`);
    console.log(`   Local:   http://localhost:${PORT}`);

    // Get network IP
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`   Network: http://${net.address}:${PORT}`);
            }
        }
    }
    console.log('\n📁 Data stored in: server/data.json');
});
