# API Testing Guide - Week 2 Authentication

Quick guide to test the authentication system manually.

## Prerequisites

1. Start the development environment:
```bash
docker-compose up -d
```

2. Verify API is running:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-01-05T..."}
```

---

## Testing Authentication Flow

### 1. Register New User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "displayName": "Test User",
    "language": "en"
  }'
```

**Expected Response** (201):
```json
{
  "message": "Registration successful. Please check your email for OTP.",
  "email": "test@example.com"
}
```

**Check Docker logs for OTP** (in development, OTP is logged):
```bash
docker-compose logs api | grep "OTP"
```

Look for: `Your OTP code is: 123456`

---

### 2. Verify OTP

Replace `123456` with the actual OTP from logs:

```bash
curl -X POST http://localhost:3001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "deviceId": "test-device-web",
    "platform": "web"
  }'
```

**Expected Response** (200):
```json
{
  "message": "OTP verified successfully",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "role": "learner",
    "profile": {
      "displayName": "Test User",
      "language": "en",
      "timezone": "Asia/Bangkok",
      "dailyTimeBudgetMinutes": 30,
      "dailyReminderEnabled": true,
      "leaderboardOptIn": false
    }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "15m"
}
```

**Save the tokens!** You'll need them for subsequent requests.

---

### 3. Login (Subsequent Sessions)

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "deviceId": "test-device-mobile",
    "platform": "ios"
  }'
```

**Expected Response** (200): Same as verify-otp response

---

### 4. Get User Profile

Replace `<ACCESS_TOKEN>` with the actual access token:

```bash
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Expected Response** (200):
```json
{
  "id": "...",
  "email": "test@example.com",
  "role": "learner",
  "profile": {
    "displayName": "Test User",
    "language": "en",
    ...
  },
  "createdAt": "2026-01-05T...",
  "updatedAt": "2026-01-05T..."
}
```

---

### 5. Update Profile (Test Language Change)

```bash
curl -X PATCH http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "th",
    "learningGoals": "เรียนคณิตศาสตร์",
    "dailyTimeBudgetMinutes": 60,
    "leaderboardOptIn": true
  }'
```

**Expected Response** (200):
```json
{
  "message": "Profile updated successfully",
  "profile": {
    "displayName": "Test User",
    "language": "th",
    "learningGoals": "เรียนคณิตศาสตร์",
    "dailyTimeBudgetMinutes": 60,
    ...
  }
}
```

**Verify language changed**: Get profile again and check `profile.language === "th"`

---

### 6. List Active Sessions

```bash
curl -X GET http://localhost:3001/api/users/sessions \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Expected Response** (200):
```json
{
  "sessions": [
    {
      "deviceId": "test-device-web",
      "platform": "web",
      "lastActive": "2026-01-05T...",
      "current": true
    },
    {
      "deviceId": "test-device-mobile",
      "platform": "ios",
      "lastActive": "2026-01-05T...",
      "current": false
    }
  ]
}
```

**Verify multi-device**: Should see 2 sessions (from verify-otp and login)

---

### 7. Refresh Access Token

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN>"
  }'
```

**Expected Response** (200):
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOi... (NEW)",
  "refreshToken": "eyJhbGciOi... (NEW - rotated)",
  "expiresIn": "15m"
}
```

**Note**: Both tokens are new (refresh token rotation for security)

---

### 8. Logout Specific Device

```bash
curl -X DELETE http://localhost:3001/api/users/sessions/test-device-mobile \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Expected Response** (200):
```json
{
  "message": "Device logged out successfully"
}
```

**Verify**: List sessions again - mobile session should be gone

---

### 9. Logout All Devices

```bash
curl -X POST http://localhost:3001/api/auth/logout-all \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Expected Response** (200):
```json
{
  "message": "Logged out from 1 device(s) successfully"
}
```

**Verify**: Trying to access profile with old token should fail with 401

---

## Error Testing

### Invalid Password (Weak)

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "weak@example.com",
    "password": "123",
    "displayName": "Weak User",
    "language": "en"
  }'
```

**Expected Response** (400):
```json
{
  "error": "Password must be at least 8 characters long, Password must contain at least one uppercase letter, ..."
}
```

---

### Duplicate Email

Register same email twice:

**Expected Response** (409):
```json
{
  "error": "Email already registered"
}
```

---

### Invalid OTP

```bash
curl -X POST http://localhost:3001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "999999",
    "deviceId": "test",
    "platform": "web"
  }'
```

**Expected Response** (400):
```json
{
  "error": "Invalid or expired OTP"
}
```

---

### Invalid Credentials (Login)

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "WrongPassword",
    "deviceId": "test",
    "platform": "web"
  }'
```

**Expected Response** (401):
```json
{
  "error": "Invalid email or password"
}
```

---

### Expired Access Token

Wait 15 minutes or use an old token:

```bash
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer <EXPIRED_TOKEN>"
```

**Expected Response** (401):
```json
{
  "error": "Token expired"
}
```

**Solution**: Use refresh token to get new access token

---

### No Authentication

```bash
curl -X GET http://localhost:3001/api/users/profile
```

**Expected Response** (401):
```json
{
  "error": "No token provided"
}
```

---

## Testing Bilingual Features

### 1. Register with Thai Language

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "thai@example.com",
    "password": "Thai123456",
    "displayName": "ผู้ใช้ไทย",
    "language": "th"
  }'
```

**Check logs**: OTP email should be in Thai

---

### 2. Switch Language

```bash
curl -X PATCH http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}'
```

**Verify**: Future tutor responses and notifications will be in English

---

## Postman Collection (Optional)

Create a Postman collection with:

**Variables**:
- `baseUrl`: `http://localhost:3001`
- `accessToken`: (set from responses)
- `refreshToken`: (set from responses)

**Pre-request Scripts**:
```javascript
// Auto-set tokens from previous requests
const accessToken = pm.collectionVariables.get("accessToken");
if (accessToken) {
  pm.request.headers.add({
    key: "Authorization",
    value: `Bearer ${accessToken}`
  });
}
```

**Tests** (example for login):
```javascript
pm.test("Login successful", function () {
  pm.response.to.have.status(200);
  const json = pm.response.json();
  pm.collectionVariables.set("accessToken", json.accessToken);
  pm.collectionVariables.set("refreshToken", json.refreshToken);
});
```

---

## Troubleshooting

### "Connection refused"
- Check if Docker is running: `docker ps`
- Check API logs: `docker-compose logs api`
- Verify port 3001 is not in use

### "User not found" after registration
- Check MongoDB connection
- Verify user was created: `docker exec -it adaptive-lms-mongodb mongosh`
  ```javascript
  use adaptive-lms
  db.users.find()
  ```

### "Invalid token"
- Verify JWT_SECRET matches in .env
- Check token expiration
- Ensure correct token type (access vs refresh)

### OTP not in logs
- Check email service logs
- Verify OTP creation in database:
  ```javascript
  db.otps.find()
  ```

---

## Next Steps

Once authentication is working:
1. ✅ Test all endpoints
2. ✅ Verify acceptance criteria
3. 🚀 Move to Week 3: xAPI LRS implementation

---

*Quick Reference: [Week 2 Completion Summary](./WEEK_2_COMPLETION_SUMMARY.md)*
