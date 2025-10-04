Auth-Gated App Testing Playbook

Step 1: Create Test User & Session
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  id: userId,  // Pydantic uses 'id', MongoDB stores as '_id'
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,  // Must match user.id exactly
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

Step 2: Test Backend API
```bash
# Test auth endpoint
curl -X GET "https://your-app.com/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test protected endpoints
curl -X GET "https://your-app.com/api/habits" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

Step 3: Browser Testing
```javascript
// Set cookie and navigate
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "your-app.com",
    "path": "/",
    "httpOnly": true,
    "secure": true,
    "sameSite": "None"
}]);
await page.goto("https://your-app.com");
```

Critical Fix: ID Schema
MongoDB + Pydantic ID Mapping:

```python
# Pydantic Model (uses 'id')
class User(BaseModel):
    id: str = Field(alias="_id")
    email: str
    name: str
    
    class Config:
        populate_by_name = True
```

Success Indicators:
✅ /api/auth/me returns user data
✅ Dashboard loads without redirect
✅ CRUD operations work

Failure Indicators:
❌ "User not found" errors
❌ 401 Unauthorized responses  
❌ Redirect to login page