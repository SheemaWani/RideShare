// config/database.js

const mysql = require('mysql2/promise'); // Using the promise-based version of mysql2
require('dotenv').config();             // Load environment variables

// Create a connection pool to the database
const pool = mysql.createPool({
    host: process.env.DB_HOST,         // Your database host (e.g., 'localhost')
    user: process.env.DB_USER,         // Your database username
    password: process.env.DB_PASSWORD,   // Your database password
    database: process.env.DB_NAME,       // The name of your database
    waitForConnections: true,
    connectionLimit: 10,               // Max number of connections in the pool
    queueLimit: 0
});

// A simple function to test the connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Successfully connected to the MySQL database.');
        connection.release(); // Release the connection back to the pool
    })
    .catch(error => {
        console.error('❌ Error connecting to the database:', error);
    });

// Export the pool so other files can use it to run queries
module.exports = pool;