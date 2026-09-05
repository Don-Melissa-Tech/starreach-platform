// 

// const path = require('path');
// const fs = require('fs');
// const multer = require('multer');

// const Artist = require('../models/Artist');
// const { protect, adminOnly } = require('../middleware/auth');
// const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

// // Manager contact info is only meaningful to a signed-in visitor (the
// // booking modal requires an account before showing it), so strip it out
// // of any response going to an anonymous caller rather than relying on the
// // frontend alone to hide it.
// function stripManagerIfAnonymous(artistDoc, req) {
//     const obj = artistDoc.toObject ? artistDoc.toObject() : artistDoc;
//     if (!req.user) {
//         delete obj.manager;
//     }
//     return obj;
// }

// // Parses the "manager" field from a create/update request body. It may
// // arrive as a JSON string (multipart form submissions) or already as an
// // object. Returns undefined if not provided, so callers can tell "not sent"
// // apart from "sent empty".
// function parseManagerInput(raw) {
//     if (raw === undefined || raw === null || raw === '') return undefined;

//     let manager;
//     try {
//         manager = typeof raw === 'string' ? JSON.parse(raw) : raw;
//     } catch (e) {
//         throw new Error('Invalid manager data');
//     }

//     return {
//         name: manager.name?.trim() || '',
//         email: manager.email?.trim() || '',
//         phone: manager.phone?.trim() || '',
//         whatsapp: manager.whatsapp?.trim() || ''
//     };
// }

// =====================================================
// IMAGE UPLOAD CONFIGURATION
// =====================================================

const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const Artist = require('../models/Artist');

// ↓↓↓ PASTE YOUR BLOCK HERE, REPLACING THE OLD IMPORT LINE ↓↓↓
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
// ↑↑↑ END OF PASTED BLOCK ↑↑↑

// =====================================================
// IMAGE UPLOAD CONFIGURATION
// =====================================================
const uploadDirectory = path.join(
    __dirname,
    '../../public/uploads/artists'
);


// Create directory automatically if it does not exist

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });
}


// Generate safe filename

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, uploadDirectory);

    },

    filename: function (req, file, cb) {

        const extension =
            path.extname(file.originalname).toLowerCase();

        const baseName =
            path
                .basename(
                    file.originalname,
                    extension
                )
                .replace(/[^a-z0-9]/gi, '-')
                .toLowerCase();

        const uniqueName =
            `${baseName}-${Date.now()}${extension}`;

        cb(null, uniqueName);

    }

});


// =====================================================
// ALLOWED IMAGE TYPES
// =====================================================

const fileFilter = (req, file, cb) => {

    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (allowedTypes.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(
            new Error(
                'Only JPG, PNG and WebP images are allowed.'
            )
        );

    }

};


// =====================================================
// MULTER
// =====================================================

const upload = multer({

    storage,

    fileFilter,

    limits: {
        fileSize: 15 * 1024 * 1024
    }

});


// =====================================================
// GET ALL ARTISTS
// =====================================================

router.get('/',optionalAuth, async (req, res) => {

    try {

        const q = {};

        if (req.query.category) {
            q.category = req.query.category;
        }

        if (req.query.featured === 'true') {
            q.featured = true;
        }

        const artists = await Artist
            .find(q)
            .sort({
                featured: -1,
                name: 1
            });

        res.json(artists);

    } catch (e) {

        res.status(500).json({
            message: e.message
        });

    }

});


// =====================================================
// GET ONE ARTIST
// =====================================================

router.get('/:id',optionalAuth, async (req, res) => {

    try {

        const artist =
            await Artist.findById(req.params.id);

        if (!artist) {

            return res.status(404).json({
                message: 'Artist not found'
            });

        }

        res.json(artist);

    } catch (e) {

        res.status(400).json({
            message: 'Invalid artist id'
        });

    }

});


// =====================================================
// ADD ARTIST
// =====================================================

router.post(
    '/',
    protect,
    adminOnly,
    upload.single('image'),
    async (req, res) => {

        try {

            const {
                name,
                category,
                role,
                bio,
                location,
                featured,
                prices,
                manager
            } = req.body;


            if (!name || !category) {

                // Delete uploaded image if validation fails

                if (req.file) {

                    fs.unlinkSync(req.file.path);

                }

                return res.status(400).json({
                    message:
                        'Artist name and category are required'
                });

            }


            // Parse prices

            let parsedPrices = [];

            if (prices) {

                try {

                    parsedPrices =
                        typeof prices === 'string'
                            ? JSON.parse(prices)
                            : prices;

                } catch (error) {

                    if (req.file) {
                        fs.unlinkSync(req.file.path);
                    }

                    return res.status(400).json({
                        message:
                            'Invalid prices data'
                    });

                }

            }

            // Parse manager contact info (optional)
            let parsedManager;
            try {
                parsedManager = parseManagerInput(manager);
            } catch (error) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: error.message });
            }


            // Image URL

            let image = '';

            if (req.file) {

                image =
                    `/uploads/artists/${req.file.filename}`;

            }


            const artist =
                await Artist.create({

                    name: name.trim(),

                    category: category.trim(),

                    role: role?.trim() || '',

                    bio: bio?.trim() || '',

                    location: location?.trim() || '',

                    image,

                    featured:
                        featured === 'true' ||
                        featured === true,

                    prices: parsedPrices,
                    manager: parsedManager

                });


            res.status(201).json(artist);

        } catch (e) {

            // Remove uploaded image if database operation fails

            if (req.file) {

                try {
                    fs.unlinkSync(req.file.path);
                } catch (_) {}

            }

            res.status(400).json({
                message: e.message
            });

        }

    }
);


// =====================================================
// EDIT ARTIST
// =====================================================

router.put(
    '/:id',
    protect,
    adminOnly,
    upload.single('image'),
    async (req, res) => {

        try {

            const artist =
                await Artist.findById(req.params.id);

            if (!artist) {

                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }

                return res.status(404).json({
                    message: 'Artist not found'
                });

            }


            const {
                name,
                category,
                role,
                bio,
                location,
                featured,
                prices,
                manager
            } = req.body;


            if (!name || !category) {

                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }

                return res.status(400).json({
                    message:
                        'Artist name and category are required'
                });

            }


            let parsedPrices = [];

            if (prices) {

                try {

                    parsedPrices =
                        typeof prices === 'string'
                            ? JSON.parse(prices)
                            : prices;

                } catch (error) {

                    if (req.file) {
                        fs.unlinkSync(req.file.path);
                    }

                    return res.status(400).json({
                        message:
                            'Invalid prices data'
                    });

                }

            } else {

                parsedPrices =
                    artist.prices || [];

            }

            // Parse manager contact info. If the field wasn't sent at all, leave the
            // artist's existing manager info untouched; if sent, overwrite it.
            let parsedManager = artist.manager;
            if (manager !== undefined) {
                try {
                    parsedManager = parseManagerInput(manager);
                } catch (error) {
                    if (req.file) fs.unlinkSync(req.file.path);
                    return res.status(400).json({ message: error.message });
                }
            }


            // Update basic information

            artist.name = name.trim();

            artist.category =
                category.trim();

            artist.role =
                role?.trim() || '';

            artist.bio =
                bio?.trim() || '';

            artist.location =
                location?.trim() || '';

            artist.featured =
                featured === 'true' ||
                featured === true;

            artist.prices =
                parsedPrices;

            artist.manager =
                parsedManager;


            // If a new image was selected

            if (req.file) {

                const oldImage =
                    artist.image;

                artist.image =
                    `/uploads/artists/${req.file.filename}`;


                // Delete previous uploaded image

                if (
                    oldImage &&
                    oldImage.startsWith(
                        '/uploads/artists/'
                    )
                ) {

                    const oldFile =
                        path.join(
                            __dirname,
                            '../../public',
                            oldImage
                        );

                    if (fs.existsSync(oldFile)) {

                        try {
                            fs.unlinkSync(oldFile);
                        } catch (_) {}

                    }

                }

            }


            await artist.save();


            res.json(artist);

        } catch (e) {

            if (req.file) {

                try {
                    fs.unlinkSync(req.file.path);
                } catch (_) {}

            }

            res.status(400).json({
                message: e.message
            });

        }

    }
);


// =====================================================
// DELETE ARTIST
// =====================================================

router.delete(
    '/:id',
    protect,
    adminOnly,
    async (req, res) => {

        try {

            const artist =
                await Artist.findById(
                    req.params.id
                );

            if (!artist) {

                return res.status(404).json({
                    message:
                        'Artist not found'
                });

            }


            // Delete artist image

            if (
                artist.image &&
                artist.image.startsWith(
                    '/uploads/artists/'
                )
            ) {

                const imagePath =
                    path.join(
                        __dirname,
                        '../../public',
                        artist.image
                    );

                if (fs.existsSync(imagePath)) {

                    try {
                        fs.unlinkSync(imagePath);
                    } catch (_) {}

                }

            }


            await Artist.findByIdAndDelete(
                req.params.id
            );


            res.json({
                message:
                    'Artist deleted successfully'
            });

        } catch (e) {

            res.status(500).json({
                message: e.message
            });

        }

    }
);


// =====================================================
// MULTER ERROR HANDLER
// =====================================================

router.use((err, req, res, next) => {

    if (err instanceof multer.MulterError) {

        if (err.code === 'LIMIT_FILE_SIZE') {

            return res.status(400).json({
                message:
                    'Image is too large. Maximum size is 5MB.'
            });

        }

        return res.status(400).json({
            message: err.message
        });

    }


    if (err) {

        return res.status(400).json({
            message: err.message
        });

    }


    next();

});


module.exports = router;