🚗 RideShare – Carpooling Web Application

RideShare is a full-stack carpooling web application designed to make travel safe, affordable, and eco-friendly. Along with standard features such as publishing rides, booking seats, managing profiles, and connecting with verified travelers, RideShare introduces female-only ride options, allowing women to travel with trusted female drivers for enhanced safety and comfort.

To further strengthen security, the platform includes a Challan Verification System, where users can instantly check a vehicle’s challan or traffic violation history before booking. This ensures transparency and helps riders make informed decisions.

RideShare also features email verification during signup and real-time OTP authentication for critical actions, preventing unauthorized access and ensuring secure user interactions. Together, these intelligent safety layers create a trusted environment that encourages responsible commuting and empowers women to travel confidently.

📌 Features
✅ Frontend (HTML, CSS, JS)

User-friendly and responsive interface

Pages included:

index.html – Homepage

signup.html – User Registration

dashboard.html – View booked & published rides

publish-ride.html – Publish a new ride

search-results.html – Search for rides

profile.html – Manage user profile

Clean validation and easy navigation

🛠️ Backend (Node.js + Express.js)

REST APIs for:

User registration & login

Publishing rides

Searching rides

Booking rides

Updating user details

SQL Database Integration

JWT-based Authentication

Secure password hashing

Role-based access control

Image Upload Support (Profile Pictures)

🗄️ Database

SQL (MySQL / MariaDB)

Tables include:

users

vehicles

rides

bookings

Configured inside:

Backend/config/database.js

📁 Project Structure
RideShare/
│
├── Backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── bookingController.js
│   │   ├── rideController.js
│   │   ├── userController.js
│   │   └── vehicleController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── rideRoutes.js
│   │   ├── userRoutes.js
│   │   └── vehicleRoutes.js
│   ├── uploads
│   ├── .env (ignored)
│   └── server.js
│
├── Frontend/
│   ├── index.html
│   ├── signup.html
│   ├── dashboard.html
│   ├── publish-ride.html
│   ├── search-results.html
│   └── profile.html
│
├── .gitignore
└── README.md

🔧 Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/<your-username>/RideShare.git
cd RideShare

2️⃣ Backend Setup
cd Backend
npm install


Create a .env file:

PORT=5000
JWT_SECRET=your_secret_key
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=rideshare_db


Run backend:

node server.js

3️⃣ Frontend

Simply open any .html file in your browser.
(Or serve using Live Server in VS Code)

🔐 Security Measures

Password hashing using bcrypt

JWT access tokens

SQL injection protection

Protected API routes

Environment variable support

🚀 Future Improvements

Real-time chat between drivers & passengers

Mobile app version (Flutter/React Native)

Google Maps Integration

Wallet & Payment Gateway

Admin panel
