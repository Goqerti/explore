// ---- 1. MODULLARIN İMPORT EDİLMƏSİ (ES MODULES) ----
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises'; // Fayl sistemi üçün Promise-əsaslı modul

// ---- 2. ƏSAS SABİTLƏR VƏ TƏNZİMLƏMƏLƏR ----

// ES Modules-də `__dirname` olmadığı üçün onu bu yolla əldə edirik.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Portu ətraf mühit dəyişənindən götürürük, yoxdursa 3000 istifadə edirik.
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'public/uploads');


// ---- 3. MULTER TƏNZİMLƏMƏLƏRİ (FAYL YÜKLƏMƏ) ----

// Faylların hara və hansı adla saxlanacağını müəyyən edir.
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        // Yükləmə qovluğunu yoxlayırıq, yoxdursa yaradırıq.
        try {
            await fs.mkdir(UPLOADS_DIR, { recursive: true });
            cb(null, UPLOADS_DIR);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Fayl adının unikal olmasını təmin edirik.
        const region = req.body.region || 'unknown';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Fayl adındakı boşluqları və xüsusi simvolları əvəz edirik.
        const sanitizedOriginalName = file.originalname.replace(/\s+/g, '-');
        const filename = `${region}-${uniqueSuffix}-${sanitizedOriginalName}`;
        cb(null, filename);
    }
});

// Yalnız şəkil fayllarının yüklənməsinə icazə veririk.
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Faylı qəbul et
    } else {
        cb(new Error('Not an image! Please upload only images.'), false); // Xəta ilə imtina et
    }
};

const upload = multer({ storage, fileFilter });


// ---- 4. MIDDLEWARES (ARA PROQRAM TƏMİNATI) ----

// `public` qovluğundakı statik faylları (html, css, js, yüklənmiş şəkillər) birbaşa təqdim edirik.
app.use(express.static(path.join(__dirname, 'public')));


// ---- 5. ROUTES (YOLLAR) ----

// Fayl yükləmək üçün POST yolu
// `upload.single('image')` - 'image' adlı tək faylın gəlməsini gözləyir.
app.post('/upload', upload.single('image'), (req, res, next) => {
    if (!req.file) {
        // fileFilter xəta qaytarsa və ya başqa səbəbdən fayl yüklənməsə
        return res.status(400).json({ message: 'File upload failed. Please ensure you are uploading an image.' });
    }
    res.status(201).json({ message: 'File uploaded successfully!', file: req.file.filename });
});


// Müəyyən bir bölgənin şəkillərini almaq üçün GET yolu
app.get('/images/:region', async (req, res, next) => {
    const { region } = req.params;

    try {
        // `fs.promises.readdir` istifadə edərək qovluğun məzmununu asinxron oxuyuruq.
        const files = await fs.readdir(UPLOADS_DIR);
        
        const regionFiles = files
            .filter(file => file.startsWith(region + '-'))
            .map(file => `/uploads/${file}`); // Düzgün URL yolu yaradırıq.

        res.json(regionFiles);
    } catch (error) {
        // Əgər `uploads` qovluğu hələ yaranmayıbsa, bu xəta baş verəcək.
        if (error.code === 'ENOENT') {
            return res.json([]); // Boş bir siyahı qaytarırıq.
        }
        // Digər bütün xətaları mərkəzi xəta idarəetməsinə ötürürük.
        next(error);
    }
});


// ---- 6. MƏRKƏZLƏŞDİRİLMİŞ XƏTA İDARƏETMƏSİ ----
// Bütün `next(error)` çağırışları bura gəlib düşür.
app.use((err, req, res, next) => {
    console.error('An error occurred:', err.stack); // Xətanı server konsolunda göstəririk.
    
    // Müştəriyə standartlaşdırılmış xəta mesajı göndəririk.
    res.status(err.status || 500).json({
        message: err.message || 'An unexpected server error occurred.',
    });
});


// ---- 7. SERVERİN İŞƏ SALINMASI ----
app.listen(PORT, () => {
    console.log(`Server is running in modern mode at http://localhost:${PORT}`);
});