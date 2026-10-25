import mongoose from 'mongoose';
import dns from 'dns';
import { ENV } from '../config/env.js';

if (ENV.MONGODB_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (e) {}
}
import { User } from '../models/User.js';
import { Ride } from '../models/Ride.js';
import { Booking } from '../models/Booking.js';
import { Review } from '../models/Review.js';
import { Notification } from '../models/Notification.js';
import { PUNE_LOCALITIES } from '../utils/locations.js';

const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB at:', ENV.MONGODB_URI);
    await mongoose.connect(ENV.MONGODB_URI);
    console.log('[Seed] Connected.');

    // Drop old collections to clear stale indexes
    try {
      await mongoose.connection.db.dropDatabase();
      console.log('[Seed] Database cleared and stale indexes dropped.');
    } catch (dropErr) {
      console.log('[Seed] Database drop error (continuing):', dropErr.message);
    }

    // 1. Seed Users (1 Admin, 3 Faculty, 10 Students = 14 users)
    const usersData = [
      {
        name: 'Campus Transport Admin',
        email: 'admin@mitaoe.ac.in',
        password: 'AdminPassword@123',
        role: 'admin',
        department: 'Administration / Staff',
        phone: '9822012345',
        vehicle: { hasVehicle: false, type: 'none', model: '', plate: '' }
      },
      {
        name: 'Dr. Vivek Kulkarni',
        email: 'prof.kulkarni@mitaoe.ac.in',
        password: 'FacultyPassword@123',
        role: 'faculty',
        department: 'School of Computer Engineering',
        phone: '9822112233',
        vehicle: { hasVehicle: true, type: 'car', model: 'Honda City (Grey)', plate: 'MH 14 FX 4521' }
      },
      {
        name: 'Dr. Sunita Sharma',
        email: 'dr.sharma@mitaoe.ac.in',
        password: 'FacultyPassword@123',
        role: 'faculty',
        department: 'Information Technology',
        phone: '9822223344',
        vehicle: { hasVehicle: true, type: 'car', model: 'Maruti Brezza (White)', plate: 'MH 12 AB 8901' }
      },
      {
        name: 'Prof. Rajesh Patil',
        email: 'prof.patil@mitaoe.ac.in',
        password: 'FacultyPassword@123',
        role: 'faculty',
        department: 'Electronics & Telecommunication',
        phone: '9822334455',
        vehicle: { hasVehicle: true, type: 'car', model: 'Toyota Glanza (Silver)', plate: 'MH 14 CZ 9988' }
      },
      {
        name: 'Aarav Deshmukh',
        email: '122100451001@mitaoe.ac.in',
        password: 'StudentPassword@123',
        role: 'student',
        prn: '122100451001',
        department: 'School of Computer Engineering',
        phone: '9890123456',
        vehicle: { hasVehicle: true, type: 'car', model: 'Hyundai i20 (Blue)', plate: 'MH 12 DE 3412' }
      },
      {
        name: 'Ananya Joshi',
        email: '122100451002@mitaoe.ac.in',
        password: 'StudentPassword@123',
        role: 'student',
        prn: '122100451002',
        department: 'Information Technology',
        phone: '9890234567',
        vehicle: { hasVehicle: true, type: 'car', model: 'Tata Nexon EV (Teal)', plate: 'MH 14 EV 7721' }
      },
      {
        name: 'Rohan Shinde',
        email: '122100451003@mitaoe.ac.in',
        password: 'StudentPassword@123',
        role: 'student',
        prn: '122100451003',
        department: 'Electronics & Telecommunication',
        phone: '9890345678',
        vehicle: { hasVehicle: true, type: 'car', model: 'Maruti Swift (Red)', plate: 'MH 14 GH 5634' }
      },
      {
        name: 'Snehal Patil',
        email: '122100451004@mitaoe.ac.in',
        password: 'StudentPassword@123',
        role: 'student',
        prn: '122100451004',
        department: 'Software Engineering',
        phone: '9890456789',
        vehicle: { hasVehicle: false, type: 'none', model: '', plate: '' }
      },
      {
        name: 'Aditya Gaikwad',
        email: '122100451005@mitaoe.ac.in',
        password: 'StudentPassword@123',
        role: 'student',
        prn: '122100451005',
        department: 'Mechanical Engineering',
        phone: '9890567890',
        vehicle: { hasVehicle: true, type: 'bike', model: 'Royal Enfield Classic 350', plate: 'MH 12 RE 1928' }
      },
      {
        name: 'Pooja More',
        email: '122100451006@mitaoe.ac.in',
        password: 'StudentPassword@123',
        role: 'student',
        prn: '122100451006',
        department: 'Data Science Engineering',
        phone: '9890678901',
        vehicle: { hasVehicle: false, type: 'none', model: '', plate: '' }
      },
      {
        name: 'Siddharth Kadam',
        email: '122100451007@mitaoe.ac.in',
        password: 'StudentPassword@123',
        role: 'student',
        prn: '122100451007',
        department: 'Civil Engineering',
        phone: '9890789012',
        vehicle: { hasVehicle: false, type: 'none', model: '', plate: '' }
      },
      {
        name: 'Tanvi Kulkarni',
        email: '122100451008@mitaoe.ac.in',
        password: 'StudentPassword@123',
        role: 'student',
        prn: '122100451008',
        department: 'Chemical Engineering',
        phone: '9890890123',
        vehicle: { hasVehicle: false, type: 'none', model: '', plate: '' }
      },
      {
        name: 'Varun Nair',
        email: '122100451009@mitaoe.ac.in',
        password: 'StudentPassword@123',
        role: 'student',
        prn: '122100451009',
        department: 'First Year Engineering',
        phone: '9890901234',
        vehicle: { hasVehicle: false, type: 'none', model: '', plate: '' }
      },
      {
        name: 'Isha Pawar',
        email: '122100451010@mitaoe.ac.in',
        password: 'StudentPassword@123',
        role: 'student',
        prn: '122100451010',
        department: 'AIML Engineering',
        phone: '9890012345',
        vehicle: { hasVehicle: false, type: 'none', model: '', plate: '' }
      }
    ];

    const createdUsers = [];
    for (const u of usersData) {
      const user = await User.create(u);
      createdUsers.push(user);
    }
    console.log(`[Seed] Seeded ${createdUsers.length} users.`);

    const findUser = (email) => createdUsers.find(u => u.email === email);
    const alandiCampus = PUNE_LOCALITIES.find(l => l.locality === 'Alandi');

    const getLoc = (locName) => {
      const match = PUNE_LOCALITIES.find(l => l.locality.toLowerCase() === locName.toLowerCase());
      return match || { name: `${locName} Center`, locality: locName, coordinates: [18.6756, 73.8906] };
    };

    // Helper for tomorrow & upcoming days so seeded rides remain upcoming and fresh
    const makeTime = (offsetIndex) => {
      const now = new Date();
      const target = new Date();
      // Distribute rides across tomorrow (day 1) and subsequent days (day 2, day 3)
      const dayOffset = (offsetIndex % 3) + 1; // 1, 2, or 3 days in the future
      const hour = 8 + (offsetIndex % 3); // 8 AM, 9 AM, 10 AM morning commutes
      const minute = (offsetIndex * 15) % 60; // :00, :15, :30, :45
      target.setDate(now.getDate() + dayOffset);
      target.setHours(hour, minute, 0, 0);
      return target;
    };

    // 2. Seed 22 Realistic Rides across Pune/PCMC
    const ridesData = [
      {
        driver: findUser('122100451001@mitaoe.ac.in')._id, // Aarav
        origin: getLoc('Wakad'),
        destination: alandiCampus,
        viaRoute: ['Bhumkar Chowk', 'Dange Chowk', 'Bhosari MIDC'],
        departureTime: makeTime(14), // Tomorrow morning
        seatsTotal: 3,
        seatsAvailable: 1,
        costPerSeat: 60,
        vehicle: { type: 'car', model: 'Hyundai i20', plate: 'MH 12 DE 3412' },
        status: 'open',
        notes: 'Leaving at 8:00 AM sharp. AC carpool. Pickups along Wakad flyover and Dange Chowk.'
      },
      {
        driver: findUser('122100451002@mitaoe.ac.in')._id, // Ananya
        origin: getLoc('Baner'),
        destination: alandiCampus,
        viaRoute: ['Aundh Parihar Chowk', 'Khadki', 'Vishrantwadi', 'Dighi'],
        departureTime: makeTime(15),
        seatsTotal: 4,
        seatsAvailable: 3,
        costPerSeat: 70,
        vehicle: { type: 'car', model: 'Tata Nexon EV', plate: 'MH 14 EV 7721' },
        status: 'open',
        notes: 'Electric vehicle quiet commute. Polite riders welcome. Departure 8:15 AM.'
      },
      {
        driver: findUser('prof.kulkarni@mitaoe.ac.in')._id, // Prof Kulkarni
        origin: getLoc('Kothrud'),
        destination: alandiCampus,
        viaRoute: ['Paud Road', 'Deccan', 'Shivajinagar', 'Vishrantwadi'],
        departureTime: makeTime(16),
        seatsTotal: 3,
        seatsAvailable: 2,
        costPerSeat: 80,
        vehicle: { type: 'car', model: 'Honda City', plate: 'MH 14 FX 4521' },
        status: 'open',
        notes: 'Staff & student carpool. Gentle driving, punctual. Reaching campus by 9:15 AM.'
      },
      {
        driver: findUser('122100451003@mitaoe.ac.in')._id, // Rohan
        origin: getLoc('Nigdi'),
        destination: alandiCampus,
        viaRoute: ['Akurdi Station', 'Chinchwad Station', 'Bhosari'],
        departureTime: makeTime(13),
        seatsTotal: 3,
        seatsAvailable: 2,
        costPerSeat: 45,
        vehicle: { type: 'car', model: 'Maruti Swift', plate: 'MH 14 GH 5634' },
        status: 'open',
        notes: 'Daily PCMC route. Flexible pickups near Akurdi or Chinchwad.'
      },
      {
        driver: findUser('dr.sharma@mitaoe.ac.in')._id, // Dr Sharma
        origin: getLoc('Viman Nagar'),
        destination: alandiCampus,
        viaRoute: ['Airport Road', 'Lohegaon', 'Charholi Budruk'],
        departureTime: makeTime(17),
        seatsTotal: 3,
        seatsAvailable: 3,
        costPerSeat: 50,
        vehicle: { type: 'car', model: 'Maruti Brezza', plate: 'MH 12 AB 8901' },
        status: 'open',
        notes: 'East Pune commute through Lohegaon road. Clean car.'
      },
      {
        driver: findUser('122100451005@mitaoe.ac.in')._id, // Aditya (Bike)
        origin: getLoc('Bhosari'),
        destination: alandiCampus,
        viaRoute: ['Dighi Magazine Corner'],
        departureTime: makeTime(14),
        seatsTotal: 1,
        seatsAvailable: 1,
        costPerSeat: 25,
        vehicle: { type: 'bike', model: 'Royal Enfield Classic 350', plate: 'MH 12 RE 1928' },
        status: 'open',
        notes: 'Pillion rider with helmet compulsory. Quick 20 min ride.'
      },
      {
        driver: findUser('prof.patil@mitaoe.ac.in')._id, // Prof Patil
        origin: getLoc('Hadapsar'),
        destination: alandiCampus,
        viaRoute: ['Magarpatta', 'Yerawada', 'Vishrantwadi', 'Dighi'],
        departureTime: makeTime(15),
        seatsTotal: 4,
        seatsAvailable: 4,
        costPerSeat: 75,
        vehicle: { type: 'car', model: 'Toyota Glanza', plate: 'MH 14 CZ 9988' },
        status: 'open',
        notes: 'South-East Pune commute. Daily morning 8:00 AM.'
      },
      {
        driver: findUser('122100451001@mitaoe.ac.in')._id, // Return evening commute
        origin: alandiCampus,
        destination: getLoc('Wakad'),
        viaRoute: ['Bhosari', 'Nashik Phata', 'Dange Chowk'],
        departureTime: makeTime(22),
        seatsTotal: 3,
        seatsAvailable: 3,
        costPerSeat: 60,
        vehicle: { type: 'car', model: 'Hyundai i20', plate: 'MH 12 DE 3412' },
        status: 'open',
        notes: 'Evening return after 4:45 PM campus hours.'
      },
      {
        driver: findUser('122100451002@mitaoe.ac.in')._id, // Return evening
        origin: alandiCampus,
        destination: getLoc('Baner'),
        viaRoute: ['Dighi', 'Vishrantwadi', 'Aundh'],
        departureTime: makeTime(23),
        seatsTotal: 4,
        seatsAvailable: 4,
        costPerSeat: 70,
        vehicle: { type: 'car', model: 'Tata Nexon EV', plate: 'MH 14 EV 7721' },
        status: 'open',
        notes: 'Evening return trip to Baner High Street.'
      },
      {
        driver: findUser('122100451003@mitaoe.ac.in')._id,
        origin: getLoc('Pimpri'),
        destination: alandiCampus,
        viaRoute: ['Deluxe Chowk', 'Bhosari Spine Road'],
        departureTime: makeTime(36),
        seatsTotal: 3,
        seatsAvailable: 3,
        costPerSeat: 40,
        vehicle: { type: 'car', model: 'Maruti Swift', plate: 'MH 14 GH 5634' },
        status: 'open',
        notes: 'Mid-week morning commute from Pimpri station.'
      },
      {
        driver: findUser('prof.kulkarni@mitaoe.ac.in')._id,
        origin: getLoc('Shivajinagar'),
        destination: alandiCampus,
        viaRoute: ['Agricultural College', 'RTO', 'Vishrantwadi'],
        departureTime: makeTime(38),
        seatsTotal: 3,
        seatsAvailable: 3,
        costPerSeat: 65,
        vehicle: { type: 'car', model: 'Honda City', plate: 'MH 14 FX 4521' },
        status: 'open',
        notes: 'Meeting near Shivajinagar ST stand at 8:30 AM.'
      },
      {
        driver: findUser('122100451001@mitaoe.ac.in')._id,
        origin: getLoc('Chakan'),
        destination: alandiCampus,
        viaRoute: ['Chakan Chowk', 'Alandi Phata'],
        departureTime: makeTime(40),
        seatsTotal: 3,
        seatsAvailable: 3,
        costPerSeat: 35,
        vehicle: { type: 'car', model: 'Hyundai i20', plate: 'MH 12 DE 3412' },
        status: 'open',
        notes: 'Chakan industrial corridor commute.'
      },
      {
        driver: findUser('122100451002@mitaoe.ac.in')._id,
        origin: getLoc('Moshi'),
        destination: alandiCampus,
        viaRoute: ['Moshi Toll Plaza', 'Spine Road'],
        departureTime: makeTime(42),
        seatsTotal: 4,
        seatsAvailable: 4,
        costPerSeat: 30,
        vehicle: { type: 'car', model: 'Tata Nexon EV', plate: 'MH 14 EV 7721' },
        status: 'open',
        notes: 'Short, economical 15 min ride.'
      },
      {
        driver: findUser('122100451005@mitaoe.ac.in')._id,
        origin: getLoc('Dighi'),
        destination: alandiCampus,
        viaRoute: ['Magazine Chowk'],
        departureTime: makeTime(44),
        seatsTotal: 1,
        seatsAvailable: 1,
        costPerSeat: 20,
        vehicle: { type: 'bike', model: 'Royal Enfield Classic 350', plate: 'MH 12 RE 1928' },
        status: 'open',
        notes: 'Quick bike hop to campus.'
      },
      {
        driver: findUser('dr.sharma@mitaoe.ac.in')._id,
        origin: getLoc('Kharadi'),
        destination: alandiCampus,
        viaRoute: ['EON Free Zone', 'Wagholi Phata', 'Lohegaon'],
        departureTime: makeTime(46),
        seatsTotal: 3,
        seatsAvailable: 3,
        costPerSeat: 70,
        vehicle: { type: 'car', model: 'Maruti Brezza', plate: 'MH 12 AB 8901' },
        status: 'open',
        notes: 'Kharadi IT park area pickup.'
      },
      {
        driver: findUser('122100451003@mitaoe.ac.in')._id,
        origin: getLoc('Ravet'),
        destination: alandiCampus,
        viaRoute: ['Mukai Chowk', 'Nigdi', 'Akurdi', 'Bhosari'],
        departureTime: makeTime(48),
        seatsTotal: 3,
        seatsAvailable: 3,
        costPerSeat: 65,
        vehicle: { type: 'car', model: 'Maruti Swift', plate: 'MH 14 GH 5634' },
        status: 'open',
        notes: 'Expressway corridor pickup from Ravet.'
      },
      {
        driver: findUser('prof.patil@mitaoe.ac.in')._id,
        origin: getLoc('Kalyani Nagar'),
        destination: alandiCampus,
        viaRoute: ['Bishop School', 'Yerawada', 'Vishrantwadi'],
        departureTime: makeTime(50),
        seatsTotal: 4,
        seatsAvailable: 4,
        costPerSeat: 60,
        vehicle: { type: 'car', model: 'Toyota Glanza', plate: 'MH 14 CZ 9988' },
        status: 'open',
        notes: 'Central Kalyani Nagar pickup at Joggers Park.'
      },
      {
        driver: findUser('122100451001@mitaoe.ac.in')._id,
        origin: getLoc('Aundh'),
        destination: alandiCampus,
        viaRoute: ['Parihar Chowk', 'Bremen Circle', 'Khadki', 'Dighi'],
        departureTime: makeTime(52),
        seatsTotal: 3,
        seatsAvailable: 3,
        costPerSeat: 65,
        vehicle: { type: 'car', model: 'Hyundai i20', plate: 'MH 12 DE 3412' },
        status: 'open',
        notes: 'Aundh central roundabout pickup.'
      },
      {
        driver: findUser('122100451002@mitaoe.ac.in')._id,
        origin: getLoc('Dhanori'),
        destination: alandiCampus,
        viaRoute: ['Tingre Nagar', 'Dighi Road'],
        departureTime: makeTime(54),
        seatsTotal: 4,
        seatsAvailable: 4,
        costPerSeat: 35,
        vehicle: { type: 'car', model: 'Tata Nexon EV', plate: 'MH 14 EV 7721' },
        status: 'open',
        notes: 'Dhanori Jakat Naka pickup.'
      },
      {
        driver: findUser('prof.kulkarni@mitaoe.ac.in')._id,
        origin: getLoc('Swargate'),
        destination: alandiCampus,
        viaRoute: ['Jedhe Chowk', 'Pune Station', 'Yerawada', 'Vishrantwadi'],
        departureTime: makeTime(56),
        seatsTotal: 3,
        seatsAvailable: 3,
        costPerSeat: 75,
        vehicle: { type: 'car', model: 'Honda City', plate: 'MH 14 FX 4521' },
        status: 'open',
        notes: 'Swargate bus depot / metro pickup at 7:45 AM.'
      },
      // 21. Completed ride with reviews (for testing ratings & completed history)
      {
        driver: findUser('122100451001@mitaoe.ac.in')._id,
        origin: getLoc('Wakad'),
        destination: alandiCampus,
        viaRoute: ['Bhumkar Chowk', 'Dange Chowk', 'Bhosari'],
        departureTime: new Date(Date.now() - 86400000 * 2), // 2 days ago
        seatsTotal: 3,
        seatsAvailable: 0,
        costPerSeat: 60,
        vehicle: { type: 'car', model: 'Hyundai i20', plate: 'MH 12 DE 3412' },
        status: 'completed',
        notes: 'Past completed trip for testing review submission and history.'
      },
      // 22. Completed ride 2
      {
        driver: findUser('prof.kulkarni@mitaoe.ac.in')._id,
        origin: getLoc('Kothrud'),
        destination: alandiCampus,
        viaRoute: ['Deccan', 'Shivajinagar', 'Vishrantwadi'],
        departureTime: new Date(Date.now() - 86400000), // Yesterday
        seatsTotal: 3,
        seatsAvailable: 1,
        costPerSeat: 80,
        vehicle: { type: 'car', model: 'Honda City', plate: 'MH 14 FX 4521' },
        status: 'completed',
        notes: 'Past completed faculty trip.'
      }
    ];

    const createdRides = [];
    for (const r of ridesData) {
      const ride = await Ride.create(r);
      createdRides.push(ride);
    }
    console.log(`[Seed] Seeded ${createdRides.length} rides across Pune/PCMC.`);

    // 3. Seed Sample Bookings
    const snehal = findUser('122100451004@mitaoe.ac.in');
    const pooja = findUser('122100451006@mitaoe.ac.in');
    const siddharth = findUser('122100451007@mitaoe.ac.in');

    const firstRide = createdRides[0]; // Aarav's Wakad ride
    const completedRide1 = createdRides[20]; // Completed ride
    const completedRide2 = createdRides[21]; // Completed ride 2

    const sampleBookings = [
      {
        ride: firstRide._id,
        passenger: snehal._id,
        seatsBooked: 2,
        totalFare: firstRide.costPerSeat * 2,
        pickupSpot: 'Bhumkar Chowk under flyover',
        status: 'approved',
        paymentStatus: 'pending'
      },
      {
        ride: completedRide1._id,
        passenger: snehal._id,
        seatsBooked: 1,
        totalFare: 60,
        pickupSpot: 'Dange Chowk',
        status: 'completed',
        paymentStatus: 'paid_upi',
        paymentNote: 'Paid via UPI at pickup'
      },
      {
        ride: completedRide1._id,
        passenger: pooja._id,
        seatsBooked: 2,
        totalFare: 120,
        pickupSpot: 'Bhosari MIDC Chowk',
        status: 'completed',
        paymentStatus: 'paid_cash',
        paymentNote: 'Handed ₹120 cash'
      },
      {
        ride: completedRide2._id,
        passenger: siddharth._id,
        seatsBooked: 2,
        totalFare: 160,
        pickupSpot: 'Shivajinagar ST Stand',
        status: 'completed',
        paymentStatus: 'paid_upi',
        paymentNote: 'UPI ref 49201048'
      }
    ];

    const createdBookings = await Booking.insertMany(sampleBookings);
    console.log(`[Seed] Seeded ${createdBookings.length} bookings.`);

    // 4. Seed Reviews (Only on completed rides)
    const sampleReviews = [
      {
        ride: completedRide1._id,
        reviewer: snehal._id,
        reviewedUser: completedRide1.driver,
        role: 'passenger',
        rating: 5,
        comment: 'Very punctual and smooth drive from Wakad to MITAOE! Highly recommended.'
      },
      {
        ride: completedRide1._id,
        reviewer: completedRide1.driver, // Aarav
        reviewedUser: snehal._id,
        role: 'driver',
        rating: 5,
        comment: 'Great co-passenger, was on time at Bhumkar Chowk.'
      },
      {
        ride: completedRide2._id,
        reviewer: siddharth._id,
        reviewedUser: completedRide2.driver, // Prof Kulkarni
        role: 'passenger',
        rating: 5,
        comment: 'Honored to commute with Prof. Kulkarni. Excellent discussion on system architecture.'
      }
    ];

    const createdReviews = await Review.insertMany(sampleReviews);
    console.log(`[Seed] Seeded ${createdReviews.length} verified reviews.`);

    // 5. Seed In-App Notifications
    const sampleNotifications = [
      {
        user: firstRide.driver,
        type: 'booking_requested',
        title: 'New Booking Request',
        message: 'Snehal Patil requested 2 seats on your Wakad to Alandi ride.',
        link: '/dashboard?tab=rides',
        read: false
      },
      {
        user: snehal._id,
        type: 'booking_approved',
        title: 'Booking Confirmed!',
        message: 'Your booking on Aarav Deshmukh\'s ride from Wakad is confirmed.',
        link: '/dashboard?tab=bookings',
        read: true
      },
      {
        user: snehal._id,
        type: 'ride_completed',
        title: 'Ride Completed',
        message: 'Your ride from Wakad has completed. Please leave a rating.',
        link: '/dashboard?tab=bookings',
        read: true
      }
    ];

    await Notification.insertMany(sampleNotifications);
    console.log(`[Seed] Seeded in-app notifications.`);

    console.log('\n====================================================');
    console.log('🎉 Seed completed successfully!');
    console.log('----------------------------------------------------');
    console.log('Admin Login:   admin@mitaoe.ac.in      / AdminPassword@123');
    console.log('Driver Login:  122100451001@mitaoe.ac.in / StudentPassword@123');
    console.log('Faculty Login: prof.kulkarni@mitaoe.ac.in / FacultyPassword@123');
    console.log('Rider Login:   122100451004@mitaoe.ac.in / StudentPassword@123');
    console.log('====================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
    process.exit(1);
  }
};

seedDatabase();
