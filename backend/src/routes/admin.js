const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Actor = require('../models/Actor');
const Booking = require('../models/Booking');
const { protect, adminOnly } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');

router.get('/stats', protect, adminOnly, async (req, res) => {
    const [clients, actors, bookings, pending] = await Promise.all([
        User.countDocuments({ role: 'client' }),
        Actor.countDocuments(),
        Booking.countDocuments(),
        Booking.countDocuments({ status: 'pending' })
    ]);
    res.json({ clients, actors, bookings, pending });
});

router.get('/clients', protect, adminOnly, async (req, res) =>
    res.json(await User.find({ role: 'client' }).select('-password').sort({ createdAt: -1 }))
);

router.get('/clients/:id', protect, adminOnly, async (req, res) => {
    const client = await User.findById(req.params.id).select('-password');
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
});

router.delete('/clients/:id', protect, adminOnly, async (req, res) => {
    const client = await User.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client deleted successfully' });
});

router.post('/clients/:id/reset-password', protect, adminOnly, async (req, res) => {
    const client = await User.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const tempPassword = crypto.randomBytes(6).toString('hex');
    client.password = tempPassword;
    client.mustResetPassword = true;
    await client.save();

    await sendEmail({
        to: client.email,
        subject: 'Your password has been reset',
        text: `Your temporary password is: ${tempPassword}\nPlease log in and change it immediately.`
    });

    res.json({ message: 'Temporary password sent to client email' });
});

module.exports = router;