const express = require('express');
const redis = require('redis');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8002;

// Middleware
app.use(cors());
app.use(express.json());

const redisClient = redis.createClient({
    socket: {
        host: 'redis-service',
        port: 6379
    }
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

const sampleProducts = [
    {
        id: 1,
        name: "لپ‌تاپ گیمینگ",
        price: 15000000,
        category: "الکترونیکی",
        description: "لپ‌تاپ قدرتمند برای گیمینگ",
        image: "/images/laptop.jpg",
        stock: 15
    },
    {
        id: 2,
        name: "موبایل هوشمند",
        price: 8000000,
        category: "الکترونیکی",
        description: "گوشی هوشمند با دوربین پیشرفته",
        image: "/images/phone.jpg",
        stock: 30
    },
    {
        id: 3,
        name: "هدفون بی‌سیم",
        price: 2000000,
        category: "الکترونیکی",
        description: "هدفون با کیفیت صدای عالی",
        image: "/images/headphone.jpg",
        stock: 50
    },
    {
        id: 4,
        name: "ماوس گیمینگ",
        price: 800000,
        category: "الکترونیکی",
        description: "ماوس با دقت بالا برای گیمینگ",
        image: "/images/mouse.jpg",
        stock: 25
    }
];

// Routes
app.get('/products', async (req, res) => {
    try {
        const cacheKey = 'products:all';
        
        const cachedProducts = await redisClient.get(cacheKey);
        if (cachedProducts) {
            return res.json({
                source: 'cache',
                data: JSON.parse(cachedProducts)
            });
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await redisClient.setEx(cacheKey, 300, JSON.stringify(sampleProducts));
        
        res.json({
            source: 'database',
            data: sampleProducts
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const cacheKey = `products:${productId}`;
        
        // check cach
        const cachedProduct = await redisClient.get(cacheKey);
        if (cachedProduct) {
            return res.json({
                source: 'cache',
                data: JSON.parse(cachedProduct)
            });
        }
        
        const product = sampleProducts.find(p => p.id === productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // save cach 10 min
        await redisClient.setEx(cacheKey, 600, JSON.stringify(product));
        
        res.json({
            source: 'database',
            data: product
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'products-service' });
});

app.get('/', (req, res) => {
    res.json({ message: 'Products Service is running!' });
});

app.listen(PORT, () => {
    console.log(`Products Service running on port ${PORT}`);
});