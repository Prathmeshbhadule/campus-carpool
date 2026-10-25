# MITAOE Campus Carpool — REST API Specification (`/api/v1`)

**Base URL:** `http://localhost:5000/api/v1`  
**Interactive OpenAPI Swagger UI:** `http://localhost:5000/api/docs`

---

## 1. Standard Response Schemas

### Success Response Envelope
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "message": "Validation failed. Please correct input errors.",
  "statusCode": 422,
  "errors": [
    {
      "field": "email",
      "message": "Must be a valid MIT Academy of Engineering email (@mitaoe.ac.in)"
    }
  ]
}
```

### HTTP Status Code Usage Matrix
| Status Code | Reason | Example |
| :--- | :--- | :--- |
| `200 OK` | Request succeeded | Searching rides, user login, profile update |
| `201 Created` | Resource created | Publishing a ride, booking request submitted, registration |
| `204 No Content` | Successful deletion | Deleting a ride |
| `400 Bad Request` | Client logical violation | Driver trying to book their own ride |
| `401 Unauthorized` | Missing / invalid JWT | Unauthenticated access to protected routes |
| `403 Forbidden` | Insufficient permissions | Student attempting to access admin endpoints |
| `404 Not Found` | Resource identifier absent | Requesting a ride ID that does not exist in MongoDB |
| `409 Conflict` | Duplicate record / Concurrency | Duplicate email or overbooking seat race condition |
| `422 Unprocessable` | Schema validation failure | Non-@mitaoe.ac.in email, PRN not 12 digits |

---

## 2. Authentication Endpoints (`/auth`)

### 2.1 Register Account
- **Method:** `POST /api/v1/auth/register`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "name": "Aarav Deshmukh",
    "email": "122100451001@mitaoe.ac.in",
    "password": "StudentPassword@123",
    "role": "student",
    "prn": "122100451001",
    "department": "School of Computer Engineering",
    "phone": "9890123456",
    "vehicle": {
      "hasVehicle": true,
      "type": "car",
      "model": "Hyundai i20",
      "plate": "MH 12 DE 3412"
    }
  }
  ```
- **Responses:**
  - `201 Created`: Returns JWT token and sanitized user profile.
  - `409 Conflict`: Email already exists.
  - `422 Unprocessable Entity`: Validation failure.

### 2.2 Login
- **Method:** `POST /api/v1/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "122100451001@mitaoe.ac.in",
    "password": "StudentPassword@123"
  }
  ```
- **Responses:**
  - `200 OK`: Returns JWT token and user profile object.
  - `401 Unauthorized`: Invalid credentials.

### 2.3 Get Current Profile
- **Method:** `GET /api/v1/auth/me`
- **Access:** Protected (`Bearer <token>`)
- **Response:** `200 OK`

---

## 3. Rides Endpoints (`/rides`)

### 3.1 Search & Filter Rides
- **Method:** `GET /api/v1/rides`
- **Access:** Public
- **Query Parameters:**
  - `origin`: Case-insensitive locality search (e.g. `Wakad`)
  - `destination`: Case-insensitive locality search (e.g. `Alandi`)
  - `date`: Filter by departure date (`YYYY-MM-DD`)
  - `vehicleType`: `car` or `bike`
  - `minSeats`: Minimum seats remaining
  - `maxPrice`: Maximum cost per seat in INR
  - `sortBy`: `departureTime` (default) or `costPerSeat`
  - `page`: Page index (default: `1`)
  - `limit`: Items per page (default: `10`, max: `50`)
- **Response:** `200 OK` with paginated array of rides and driver profile details.

### 3.2 Publish New Ride
- **Method:** `POST /api/v1/rides`
- **Access:** Protected (Driver)
- **Request Body:**
  ```json
  {
    "origin": { "name": "Bhumkar Chowk", "locality": "Wakad" },
    "destination": { "name": "MITAOE Main Gate", "locality": "Alandi" },
    "viaRoute": ["Dange Chowk", "Bhosari MIDC"],
    "departureTime": "2026-10-22T08:30:00.000Z",
    "seatsTotal": 3,
    "costPerSeat": 60,
    "vehicle": { "type": "car", "model": "Hyundai i20", "plate": "MH 12 DE 3412" },
    "notes": "AC carpool. Punctual departure."
  }
  ```
- **Responses:**
  - `201 Created`: Ride created.
  - `422 Unprocessable Entity`: Validation failure.

### 3.3 Get Ride Details by ID
- **Method:** `GET /api/v1/rides/:id`
- **Response:** `200 OK` with ride details and active bookings.

### 3.4 Update Ride Lifecycle Status
- **Method:** `PATCH /api/v1/rides/:id/status`
- **Access:** Protected (Driver / Admin)
- **Request Body:** `{ "status": "ongoing" | "completed" | "cancelled" }`
- **Response:** `200 OK`

---

## 4. Bookings Endpoints (`/bookings` & `/rides/:id/bookings`)

### 4.1 Atomically Request Seat Booking
- **Method:** `POST /api/v1/rides/:id/bookings`
- **Access:** Protected (Passenger)
- **Request Body:**
  ```json
  {
    "seatsBooked": 1,
    "pickupSpot": "Under Wakad flyover"
  }
  ```
- **Responses:**
  - `201 Created`: Atomic seat decrement succeeded, booking created.
  - `400 Bad Request`: Driver attempting to book own ride.
  - `409 Conflict`: Insufficient remaining seats (prevents overbooking race condition) or existing active request.

### 4.2 Get Passenger's Bookings
- **Method:** `GET /api/v1/bookings/my-bookings`
- **Access:** Protected

### 4.3 Update Booking Status
- **Method:** `PATCH /api/v1/bookings/:id/status`
- **Access:** Protected (Driver approves/rejects; Passenger cancels)
- **Request Body:** `{ "status": "approved" | "rejected" | "cancelled" }`

### 4.4 Driver Records Payment
- **Method:** `PATCH /api/v1/bookings/:id/payment`
- **Access:** Protected (Driver)
- **Request Body:**
  ```json
  {
    "paymentStatus": "paid_cash" | "paid_upi",
    "paymentNote": "Settled at pickup"
  }
  ```

---

## 5. Reviews Endpoints (`/reviews`)

### 5.1 Submit Post-Ride Review
- **Method:** `POST /api/v1/reviews`
- **Access:** Protected (Confirmed participant)
- **Rule:** Only allowed on rides with status `completed`. Compound unique constraint: 1 review per participant per ride.
- **Request Body:**
  ```json
  {
    "rideId": "60c72b2f9b1d8b2bad72101",
    "reviewedUserId": "60c72b2f9b1d8b2bad72102",
    "role": "passenger",
    "rating": 5,
    "comment": "Punctual and very smooth driving!"
  }
  ```
- **Responses:**
  - `201 Created`: Review saved and recipient's average rating recalculated.
  - `400 Bad Request`: Ride not completed.
  - `409 Conflict`: Duplicate review.

---

## 6. Platform Statistics & Aggregations (`/stats`)

### 6.1 Public Platform Metrics
- **Method:** `GET /api/v1/stats/platform`
- **Access:** Public
- **Returns:** Active users, completed rides, total fare volume, CO₂ saved (kg), and top 5 commute routes.

### 6.2 Admin Aggregation Pipelines
- **Method:** `GET /api/v1/stats/admin`
- **Access:** Protected (`admin` role only)
- **Returns:** Department breakdown pipeline, vehicle mode pipeline, booking status distribution.
