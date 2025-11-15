// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    // Get the token from the request header
    const authHeader = req.header('Authorization');

    // Check if token exists
    if (!authHeader) {
        return res.status(401).json({ message: 'No token, authorization denied.' });
    }

    try {
        // The header format is "Bearer <token>". We split it and get the token part.
        const token = authHeader.split(' ')[1];

        // Verify the token using our secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add the user's payload (which includes their ID) to the request object
        req.user = decoded.user;
        
        // Call the next middleware or controller in the chain
        next();

    } catch (error) {
        res.status(401).json({ message: 'Token is not valid.' });
    }
};

module.exports = authMiddleware;