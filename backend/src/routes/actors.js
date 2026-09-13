const router = require('express').Router();
const multer = require('multer');
const streamifier = require('streamifier');

const Actor = require('../models/Actor');
const cloudinary = require('../config/cloudinary');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

function stripManagerIfAnonymous(actorDoc, req) {
    const obj = actorDoc.toObject ? actorDoc.toObject() : actorDoc;
    if (!req.user) {
        delete obj.manager;
    }
    return obj;
}

function parseManagerInput(raw) {
    if (raw === undefined || raw === null || raw === '') return undefined;
    let manager;
    try {
        manager = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
        throw new Error('Invalid manager data');
    }
    return {
        name: manager.name?.trim() || '',
        email: manager.email?.trim() || '',
        phone: manager.phone?.trim() || '',
        whatsapp: manager.whatsapp?.trim() || ''
    };
}

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG, PNG and WebP images are allowed.'));
    }
};

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 15 * 1024 * 1024 }
});

function uploadToCloudinary(buffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'starreach/actors' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
}

router.get('/', optionalAuth, async (req, res) => {
    try {
        const q = {};
        if (req.query.category) q.category = req.query.category;
        if (req.query.featured === 'true') q.featured = true;

        const actors = await Actor.find(q).sort({ featured: -1, name: 1 });
        res.json(actors);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const actor = await Actor.findById(req.params.id);
        if (!actor) return res.status(404).json({ message: 'Actor not found' });
        res.json(actor);
    } catch (e) {
        res.status(400).json({ message: 'Invalid actor id' });
    }
});

router.post('/', protect, adminOnly, upload.single('image'), async (req, res) => {
    try {
        const { name, category, role, bio, location, featured, prices, manager } = req.body;

        if (!name || !category) {
            return res.status(400).json({ message: 'Actor name and category are required' });
        }

        let parsedPrices = [];
        if (prices) {
            try {
                parsedPrices = typeof prices === 'string' ? JSON.parse(prices) : prices;
            } catch (error) {
                return res.status(400).json({ message: 'Invalid prices data' });
            }
        }

        let parsedManager;
        try {
            parsedManager = parseManagerInput(manager);
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }

        let image = '';
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer);
            image = result.secure_url;
        }

        const actor = await Actor.create({
            name: name.trim(),
            category: category.trim(),
            role: role?.trim() || '',
            bio: bio?.trim() || '',
            location: location?.trim() || '',
            image,
            featured: featured === 'true' || featured === true,
            prices: parsedPrices,
            manager: parsedManager
        });

        res.status(201).json(actor);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

router.put('/:id', protect, adminOnly, upload.single('image'), async (req, res) => {
    try {
        const actor = await Actor.findById(req.params.id);
        if (!actor) return res.status(404).json({ message: 'Actor not found' });

        const { name, category, role, bio, location, featured, prices, manager } = req.body;

        if (!name || !category) {
            return res.status(400).json({ message: 'Actor name and category are required' });
        }

        let parsedPrices = [];
        if (prices) {
            try {
                parsedPrices = typeof prices === 'string' ? JSON.parse(prices) : prices;
            } catch (error) {
                return res.status(400).json({ message: 'Invalid prices data' });
            }
        } else {
            parsedPrices = actor.prices || [];
        }

        let parsedManager = actor.manager;
        if (manager !== undefined) {
            try {
                parsedManager = parseManagerInput(manager);
            } catch (error) {
                return res.status(400).json({ message: error.message });
            }
        }

        actor.name = name.trim();
        actor.category = category.trim();
        actor.role = role?.trim() || '';
        actor.bio = bio?.trim() || '';
        actor.location = location?.trim() || '';
        actor.featured = featured === 'true' || featured === true;
        actor.prices = parsedPrices;
        actor.manager = parsedManager;

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer);
            actor.image = result.secure_url;
        }

        await actor.save();
        res.json(actor);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const actor = await Actor.findById(req.params.id);
        if (!actor) return res.status(404).json({ message: 'Actor not found' });

        await Actor.findByIdAndDelete(req.params.id);
        res.json({ message: 'Actor deleted successfully' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'Image is too large. Maximum size is 15MB.' });
        }
        return res.status(400).json({ message: err.message });
    }
    if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
});

module.exports = router;