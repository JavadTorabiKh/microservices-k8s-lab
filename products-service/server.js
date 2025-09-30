const express = require('express');
const redis = require('redis');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8002;

// Middleware setup
app.use(cors());
app.use(express.json());

// Redis connection for caching
const redisClient = redis.createClient({
    socket: {
        host: 'redis-service',
        port: 6379
    }
});

// Redis error handling
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

// Sample products data
const sampleProducts = [
    {
        id: 1,
        name: "Gaming Laptop",
        price: 15000000,
        category: "Electronics",
        description: "Powerful laptop for gaming and graphic work",
        image: "/images/laptop.jpg",
        stock: 15,
        features: ["Core i7 Processor", "RTX 4060 GPU", "16GB RAM"]
    },
    {
        id: 2,
        name: "Smartphone",
        price: 8000000,
        category: "Electronics",
        description: "Smartphone with advanced camera and powerful battery",
        image: "/images/phone.jpg",
        stock: 30,
        features: ["108MP Camera", "5000mAh Battery", "5G Support"]
    },
    {
        id: 3,
        name: "Wireless Headphones",
        price: 2000000,
        category: "Electronics",
        description: "Headphones with excellent sound quality and active noise cancellation",
        image: "/images/headphone.jpg",
        stock: 50,
        features: ["Active Noise Cancellation", "30-hour Battery", "Bluetooth 5.2"]
    },
    {
        id: 4,
        name: "Gaming Mouse",
        price: 800000,
        category: "Electronics",
        description: "High-precision mouse with RGB for gaming",
        image: "/images/mouse.jpg",
        stock: 25,
        features: ["16000 DPI", "RGB Lighting", "6 Programmable Buttons"]
    }
];

// API Routes

/**
 * GET /products
 * Get all products with Redis caching
 */
app.get('/products', async (req, res) => {
    try {
        const cacheKey = 'products:all';
        
        // Check Redis cache first
        const cachedProducts = await redisClient.get(cacheKey);
        if (cachedProducts) {
            console.log('📦 Serving products from cache');
            return res.json({
                source: 'cache',
                data: JSON.parse(cachedProducts)
            });
        }
        
        // Simulate database delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Store in Redis cache for 5 minutes
        await redisClient.setEx(cacheKey, 300, JSON.stringify(sampleProducts));
        
        console.log('💾 Serving products from database');
        res.json({
            source: 'database',
            data: sampleProducts
        });
    } catch (error) {
        console.error('Error in /products:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
});

/**
 * GET /products/:id
 * Get specific product by ID
 */
app.get('/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const cacheKey = `products:${productId}`;
        
        // Check cache for individual product
        const cachedProduct = await redisClient.get(cacheKey);
        if (cachedProduct) {
            console.log(`📦 Serving product ${productId} from cache`);
            return res.json({
                source: 'cache',
                data: JSON.parse(cachedProduct)
            });
        }
        
        // Find product in data
        const product = sampleProducts.find(p => p.id === productId);
        if (!product) {
            return res.status(404).json({ 
                error: 'Product not found' 
            });
        }
        
        // Cache individual product for 10 minutes
        await redisClient.setEx(cacheKey, 600, JSON.stringify(product));
        
        console.log(`💾 Serving product ${productId} from database`);
        res.json({
            source: 'database',
            data: product
        });
    } catch (error) {
        console.error('Error in /products/:id:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
});

/**
 * GET /health
 * Service health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'products-service',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /
 * Service root endpoint
 */
app.get('/', (req, res) => {
    res.json({ 
        message: 'Products Service is running',
        version: '1.0.0',
        endpoints: ['GET /products', 'GET /products/:id', 'GET /health']
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🎯 Products Service running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
});