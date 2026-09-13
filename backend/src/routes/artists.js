const router = require('express').Router();
const multer = require('multer');
const streamifier = require('streamifier');

const Artist = require('../models/Artist');
const cloudinary = require('../config/cloudinary');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

function stripManagerIfAnonymous(artistDoc, req) {
    const obj = artistDoc.toObject ? artistDoc.toObject() : artistDoc;
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

// =====================================================
// IMAGE UPLOAD CONFIGURATION (Cloudinary, in-memory)
// =====================================================

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
            { folder: 'starreach/artists' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
}

// =====================================================
// GET ALL ARTISTS
// =====================================================

router.get('/', optionalAuth, async (req, res) => {
    try {
        const q = {};
        if (req.query.category) q.category = req.query.category;
        if (req.query.featured === 'true') q.featured = true;

        const artists = await Artist.find(q).sort({ featured: -1, name: 1 });
        res.json(artists);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// =====================================================
// GET ONE ARTIST
// =====================================================

router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const artist = await Artist.findById(req.params.id);
        if (!artist) return res.status(404).json({ message: 'Artist not found' });
        res.json(artist);
    } catch (e) {
        res.status(400).json({ message: 'Invalid artist id' });
    }
});

// =====================================================
// ADD ARTIST
// =====================================================

router.post('/', protect, adminOnly, upload.single('image'), async (req, res) => {
    try {
        const { name, category, role, bio, location, featured, prices, manager } = req.body;

        if (!name || !category) {
            return res.status(400).json({ message: 'Artist name and category are required' });
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

        const artist = await Artist.create({
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

        res.status(201).json(artist);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

// =====================================================
// EDIT ARTIST
// =====================================================

router.put('/:id', protect, adminOnly, upload.single('image'), async (req, res) => {
    try {
        const artist = await Artist.findById(req.params.id);
        if (!artist) return res.status(404).json({ message: 'Artist not found' });

        const { name, category, role, bio, location, featured, prices, manager } = req.body;

        if (!name || !category) {
            return res.status(400).json({ message: 'Artist name and category are required' });
        }

        let parsedPrices = [];
        if (prices) {
            try {
                parsedPrices = typeof prices === 'string' ? JSON.parse(prices) : prices;
            } catch (error) {
                return res.status(400).json({ message: 'Invalid prices data' });
            }
        } else {
            parsedPrices = artist.prices || [];
        }

        let parsedManager = artist.manager;
        if (manager !== undefined) {
            try {
                parsedManager = parseManagerInput(manager);
            } catch (error) {
                return res.status(400).json({ message: error.message });
            }
        }

        artist.name = name.trim();
        artist.category = category.trim();
        artist.role = role?.trim() || '';
        artist.bio = bio?.trim() || '';
        artist.location = location?.trim() || '';
        artist.featured = featured === 'true' || featured === true;
        artist.prices = parsedPrices;
        artist.manager = parsedManager;

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer);
            artist.image = result.secure_url;
        }

        await artist.save();
        res.json(artist);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

// =====================================================
// DELETE ARTIST
// =====================================================

router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const artist = await Artist.findById(req.params.id);
        if (!artist) return res.status(404).json({ message: 'Artist not found' });

        await Artist.findByIdAndDelete(req.params.id);
        res.json({ message: 'Artist deleted successfully' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// =====================================================
// MULTER ERROR HANDLER
// =====================================================

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